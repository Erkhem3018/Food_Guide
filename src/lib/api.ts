// Client for the Mise API (server/ — deployed on Railway). Set VITE_API_URL to point
// the app at another backend, e.g. http://localhost:8080 while running `npm run dev`
// in server/.
export const API_URL = (import.meta.env.VITE_API_URL || "https://mise-api-production-e514.up.railway.app").replace(/\/$/, "");

export type ApiUser = { id: string; email: string; name: string; provider: "password" | "google" };
export type AuthResult = { token: string; user: ApiUser; data: unknown; myRatings: Record<number, number> };

// `code` is the server's machine-readable error ("bad_credentials", "rate_limited",
// …), or "network" when the request never reached it.
export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null; keepalive?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: {
        ...(opts.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      // Lets a save started as the tab closes finish in the background.
      keepalive: opts.keepalive,
    });
  } catch {
    throw new ApiError("network", 0);
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(typeof payload.error === "string" ? payload.error : "server", res.status);
  return payload as T;
}
