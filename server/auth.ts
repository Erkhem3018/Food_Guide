import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.ts";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_DAYS = 30;

// Stored as "scrypt$<salt hex>$<hash hex>" so the parameters can change later.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32, SCRYPT);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, SCRYPT);
  return timingSafeEqual(actual, expected);
}

// A wrong email still pays for one scrypt, so response time doesn't reveal which
// emails have accounts.
const DUMMY_HASH = hashPassword("not-a-real-password");
export async function burnPasswordCheck(password: string) {
  await verifyPassword(password, await DUMMY_HASH);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Only the token's hash is stored, so a database leak doesn't leak live sessions.
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))", [
    sha256(token),
    userId,
    SESSION_DAYS,
  ]);
  return token;
}

export type UserRow = { id: string; email: string; name: string; password_hash: string | null; google_sub: string | null; data: unknown };

export async function userForToken(token: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id, u.email, u.name, u.password_hash, u.google_sub, u.data
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  return rows[0] ?? null;
}

export async function deleteSession(token: string) {
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
}

// Asks Google to validate an ID token's signature and expiry, then checks it was
// issued for our own OAuth client and the email is verified.
export async function verifyGoogleCredential(credential: string): Promise<{ sub: string; email: string; name: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const p = (await res.json()) as Record<string, unknown>;
  if (p.aud !== clientId) return null;
  if (p.email_verified !== "true" && p.email_verified !== true) return null;
  if (typeof p.sub !== "string" || typeof p.email !== "string") return null;
  return { sub: p.sub, email: p.email, name: typeof p.name === "string" && p.name ? p.name : p.email };
}
