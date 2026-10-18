// Mise API — accounts, synced account data, community ratings, email and live
// grocery prices. Runs on Railway with a Postgres database (see railway.json).
//
// Auth is a bearer token (not a cookie): the app and API live on different sites,
// and browsers increasingly block third-party cookies.
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { cleanup, migrate, pool, rateLimited } from "./db.ts";
import {
  burnPasswordCheck,
  createSession,
  deleteSession,
  hashPassword,
  userForToken,
  verifyGoogleCredential,
  verifyPassword,
  type UserRow,
} from "./auth.ts";
import { isValidPlan, renderWeeklyPlanEmail, renderWelcomeEmail, sendEmail, type Lang } from "./email.ts";
import { lookupNominPrices } from "./nomin.ts";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_DATA_BYTES = 256 * 1024;

type Env = { Variables: { user: UserRow; token: string } };
const app = new Hono<Env>();

app.use("*", cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "PUT", "OPTIONS"], maxAge: 86400 }));
app.use("*", bodyLimit({ maxSize: MAX_DATA_BYTES + 4096, onError: (c) => c.json({ error: "too_large" }, 413) }));
app.onError((err, c) => {
  console.error(`[${c.req.method} ${c.req.path}]`, err);
  return c.json({ error: "server" }, 500);
});

// Railway's edge sets X-Real-IP; X-Forwarded-For can be prefixed by the client.
const clientIp = (c: Context) => c.req.header("x-real-ip") || c.req.header("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
const lang = (v: unknown): Lang => (v === "mn" ? "mn" : "en");
const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const body = async (c: Context): Promise<Record<string, unknown>> => {
  try {
    const b = await c.req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
};

function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name, provider: u.password_hash ? "password" : "google" };
}

async function myRatings(userId: string): Promise<Record<number, number>> {
  const { rows } = await pool.query<{ recipe_id: number; stars: number }>("SELECT recipe_id, stars FROM ratings WHERE user_id = $1", [userId]);
  return Object.fromEntries(rows.map((r) => [r.recipe_id, r.stars]));
}

async function sessionResponse(c: Context, u: UserRow) {
  const token = await createSession(u.id);
  return c.json({ token, user: publicUser(u), data: u.data ?? null, myRatings: await myRatings(u.id) });
}

const requireUser = async (c: Context<Env>, next: () => Promise<void>) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await userForToken(token) : null;
  if (!user || !token) return c.json({ error: "unauthorized" }, 401);
  c.set("user", user);
  c.set("token", token);
  await next();
};

app.get("/health", (c) => c.json({ ok: true }));

// ── Accounts ──────────────────────────────────────────────────────────────────
app.post("/auth/signup", async (c) => {
  const b = await body(c);
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (name.length < 2 || name.length > 60 || !isEmail(email) || password.length < 8 || password.length > 200) {
    return c.json({ error: "invalid_input" }, 400);
  }
  if (await rateLimited(`signup:${clientIp(c)}`, 5, HOUR)) return c.json({ error: "rate_limited" }, 429);

  const data = b.data && typeof b.data === "object" && JSON.stringify(b.data).length <= MAX_DATA_BYTES ? b.data : null;
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, name, password_hash, data) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, name, password_hash, google_sub, data`,
    [email, name, await hashPassword(password), data]
  );
  if (!rows[0]) return c.json({ error: "email_taken" }, 409);

  // Best-effort; signup has already succeeded.
  if (process.env.RESEND_API_KEY) {
    sendEmail(email, renderWelcomeEmail(name, lang(b.lang))).catch((err) => console.error("Welcome email failed", err));
  }
  return sessionResponse(c, rows[0]);
});

app.post("/auth/login", async (c) => {
  const b = await body(c);
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!isEmail(email) || !password) return c.json({ error: "invalid_input" }, 400);
  if ((await rateLimited(`login-ip:${clientIp(c)}`, 30, 10 * MINUTE)) || (await rateLimited(`login:${email}`, 10, 10 * MINUTE))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const { rows } = await pool.query<UserRow>("SELECT id, email, name, password_hash, google_sub, data FROM users WHERE email = $1", [email]);
  const u = rows[0];
  if (!u) {
    await burnPasswordCheck(password);
    return c.json({ error: "bad_credentials" }, 401);
  }
  if (!u.password_hash) return c.json({ error: "use_google" }, 401);
  if (!(await verifyPassword(password, u.password_hash))) return c.json({ error: "bad_credentials" }, 401);
  return sessionResponse(c, u);
});

app.post("/auth/google", async (c) => {
  if (!process.env.GOOGLE_CLIENT_ID) return c.json({ error: "google_not_configured" }, 503);
  const b = await body(c);
  if (typeof b.credential !== "string" || b.credential.length > 4096) return c.json({ error: "invalid_input" }, 400);
  if (await rateLimited(`google:${clientIp(c)}`, 30, 10 * MINUTE)) return c.json({ error: "rate_limited" }, 429);
  const g = await verifyGoogleCredential(b.credential);
  if (!g) return c.json({ error: "google_invalid" }, 401);

  const email = g.email.toLowerCase();
  // Google has verified this email, so it can sign in to (and link) an existing
  // password account with the same address.
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, name, google_sub) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub)
     RETURNING id, email, name, password_hash, google_sub, data`,
    [email, g.name.slice(0, 60), g.sub]
  );
  return sessionResponse(c, rows[0]);
});

app.post("/auth/logout", requireUser, async (c) => {
  await deleteSession(c.get("token"));
  return c.json({ ok: true });
});

app.get("/me", requireUser, async (c) => {
  const u = c.get("user");
  return c.json({ user: publicUser(u), data: u.data ?? null, myRatings: await myRatings(u.id) });
});

// The app's whole per-user state (kitchen, saved recipes, meal plan, settings) is
// one JSON document. Last write wins across devices.
app.put("/me/data", requireUser, async (c) => {
  const u = c.get("user");
  if (await rateLimited(`data:${u.id}`, 600, 10 * MINUTE)) return c.json({ error: "rate_limited" }, 429);
  const b = await body(c);
  if (!b.data || typeof b.data !== "object" || Array.isArray(b.data)) return c.json({ error: "invalid_input" }, 400);
  if (JSON.stringify(b.data).length > MAX_DATA_BYTES) return c.json({ error: "too_large" }, 413);
  // The display name is edited in the app's profile; keep the account's copy (used in
  // emails) in step.
  const name = typeof b.name === "string" && b.name.trim().length >= 2 ? b.name.trim().slice(0, 60) : null;
  await pool.query("UPDATE users SET data = $2, name = COALESCE($3, name), updated_at = now() WHERE id = $1", [u.id, b.data, name]);
  return c.json({ ok: true });
});

// ── Ratings ───────────────────────────────────────────────────────────────────
app.get("/ratings", async (c) => {
  const { rows } = await pool.query<{ recipe_id: number; avg: string; count: string }>(
    "SELECT recipe_id, avg(stars)::numeric(3,2) AS avg, count(*) AS count FROM ratings GROUP BY recipe_id"
  );
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ ratings: Object.fromEntries(rows.map((r) => [r.recipe_id, { avg: Number(r.avg), count: Number(r.count) }])) });
});

app.post("/ratings", requireUser, async (c) => {
  const u = c.get("user");
  const b = await body(c);
  const recipeId = Number(b.recipeId);
  const stars = Number(b.stars);
  if (!Number.isInteger(recipeId) || recipeId < 1 || recipeId > 100000 || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return c.json({ error: "invalid_input" }, 400);
  }
  if (await rateLimited(`rate:${u.id}`, 60, HOUR)) return c.json({ error: "rate_limited" }, 429);
  await pool.query(
    `INSERT INTO ratings (user_id, recipe_id, stars) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, recipe_id) DO UPDATE SET stars = EXCLUDED.stars, updated_at = now()`,
    [u.id, recipeId, stars]
  );
  const { rows } = await pool.query<{ avg: string; count: string }>(
    "SELECT avg(stars)::numeric(3,2) AS avg, count(*) AS count FROM ratings WHERE recipe_id = $1",
    [recipeId]
  );
  return c.json({ recipeId, avg: Number(rows[0].avg), count: Number(rows[0].count) });
});

// ── Email ─────────────────────────────────────────────────────────────────────
// Only ever mails the signed-in account's own address, with rows rendered on the
// server from recipe ids — so it can't be used to send arbitrary mail.
app.post("/email/weekly-plan", requireUser, async (c) => {
  if (!process.env.RESEND_API_KEY) return c.json({ error: "email_not_configured" }, 503);
  const u = c.get("user");
  const b = await body(c);
  const store = typeof b.store === "string" ? b.store.trim() : "";
  const budget = Number(b.budget);
  if (!/^[\p{L}\p{N}' -]{1,40}$/u.test(store) || !Number.isFinite(budget) || budget < 0 || budget > 100_000_000 || !isValidPlan(b.meals)) {
    return c.json({ error: "invalid_input" }, 400);
  }
  if (await rateLimited(`email:${u.id}`, 5, DAY)) return c.json({ error: "rate_limited" }, 429);
  const ok = await sendEmail(u.email, renderWeeklyPlanEmail(u.name, store, budget, b.meals, lang(b.lang)));
  return ok ? c.json({ ok: true, to: u.email }) : c.json({ error: "send_failed" }, 502);
});

// ── Live grocery prices ───────────────────────────────────────────────────────
// Only catalog keys are accepted, so this can't be used as a general proxy.
app.get("/nomin-prices", async (c) => {
  const keys = (c.req.query("keys") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => /^[a-z-]{2,30}$/.test(k))
    .slice(0, 60);
  if (keys.length === 0) return c.json({ error: "invalid_input" }, 400);
  if (await rateLimited(`nomin:${clientIp(c)}`, 40, 10 * MINUTE)) return c.json({ error: "rate_limited" }, 429);
  try {
    const { prices, failed } = await lookupNominPrices(keys);
    c.header("Cache-Control", failed.length ? "no-store" : "public, max-age=3600");
    return c.json({ source: "nomin.mn", fetchedAt: Date.now(), prices, failed });
  } catch (err) {
    console.error("Nomin price lookup failed", err);
    return c.json({ error: "upstream" }, 502);
  }
});

await migrate();
setInterval(() => cleanup().catch((err) => console.error("cleanup failed", err)), HOUR).unref();
const port = Number(process.env.PORT) || 8080;
serve({ fetch: app.fetch, port }, () => console.log(`Mise API listening on :${port}`));
