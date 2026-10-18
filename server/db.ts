import pg from "pg";

// Railway injects DATABASE_URL from the Postgres service. Neither its private URL nor
// its public proxy URL (DATABASE_PUBLIC_URL, for running locally) uses TLS; add
// `?sslmode=require` to the URL for a database that needs it.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const pool = new pg.Pool({
  connectionString: url,
  ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : false,
  max: 10,
});

// Idempotent schema setup, run on every boot.
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text NOT NULL UNIQUE,
      name          text NOT NULL,
      password_hash text,
      google_sub    text UNIQUE,
      data          jsonb,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS ratings (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id  integer NOT NULL,
      stars      smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, recipe_id)
    );
    CREATE TABLE IF NOT EXISTS rate_events (
      key text NOT NULL,
      at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS rate_events_key_at_idx ON rate_events(key, at);
  `);
}

// Shared rate limiter: counts events per key in Postgres, so the limit holds across
// every instance of the service (unlike an in-memory map). Returns true when the
// caller is over the limit; the attempt is only recorded when it's allowed.
export async function rateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: string }>(
    "SELECT count(*) AS n FROM rate_events WHERE key = $1 AND at > now() - make_interval(secs => $2)",
    [key, windowMs / 1000]
  );
  if (Number(rows[0].n) >= max) return true;
  await pool.query("INSERT INTO rate_events (key) VALUES ($1)", [key]);
  return false;
}

export async function cleanup() {
  await pool.query("DELETE FROM rate_events WHERE at < now() - interval '2 days'");
  await pool.query("DELETE FROM sessions WHERE expires_at < now()");
}
