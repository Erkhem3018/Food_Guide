import { useEffect, useMemo, useState } from "react";
import { API_URL } from "./api";

// A product + price found on nomin.mn for one ingredient (see server/nomin.ts).
export type LivePrice = { key: string; name: string; price: number; regularPrice: number; url: string; fetchedAt: number };

export type LivePriceState = {
  prices: Record<string, LivePrice | null>;
  status: "idle" | "loading" | "ready" | "error" | "offline";
  updatedAt: number | null;
};

const STORAGE_KEY = "mise_nomin_prices_v1";
const FRESH_FOR_MS = 6 * 60 * 60 * 1000;

type Stored = Record<string, { value: LivePrice | null; savedAt: number }>;
type ApiResult = { prices: Record<string, LivePrice | null>; failed: string[] };

// Identical price checks share one request (screens can mount twice or re-render
// while a request is still in flight).
const inFlight = new Map<string, Promise<ApiResult>>();

function requestPrices(keys: string[]): Promise<ApiResult> {
  const id = keys.join(",");
  const pending = inFlight.get(id);
  if (pending) return pending;
  const p = fetch(`${API_URL}/nomin-prices?keys=${encodeURIComponent(id)}`)
    .then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      const result = (await r.json()) as ApiResult;
      const next = readStore();
      const savedAt = Date.now();
      for (const k of keys) if (!result.failed.includes(k)) next[k] = { value: result.prices[k] ?? null, savedAt };
      writeStore(next);
      return result;
    })
    .finally(() => inFlight.delete(id));
  inFlight.set(id, p);
  return p;
}

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

function writeStore(store: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked — prices still work for this session
  }
}

// Fetches today's Nomin prices for the given catalog keys. Results are kept in this
// browser for a few hours so reopening the plan is instant and doesn't hit Nomin.
export function useNominPrices(keys: string[]): LivePriceState {
  const keyList = useMemo(() => [...new Set(keys)].sort(), [keys.join(",")]);
  const [state, setState] = useState<LivePriceState>(() => fromStore(keyList));

  useEffect(() => {
    let cancelled = false;
    const stored = readStore();
    const now = Date.now();
    const stale = keyList.filter((k) => !stored[k] || now - stored[k].savedAt > FRESH_FOR_MS);
    setState(fromStore(keyList));
    if (stale.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState((s) => ({ ...s, status: "offline" }));
      return;
    }
    setState((s) => ({ ...s, status: "loading" }));
    requestPrices(stale)
      .then(({ failed }) => {
        if (cancelled) return;
        setState({ ...fromStore(keyList), status: failed.length === stale.length ? "error" : "ready" });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      });
    return () => { cancelled = true; };
  }, [keyList]);

  return state;
}

function fromStore(keys: string[]): LivePriceState {
  const stored = readStore();
  const prices: Record<string, LivePrice | null> = {};
  let updatedAt: number | null = null;
  for (const k of keys) {
    if (!stored[k]) continue;
    prices[k] = stored[k].value;
    updatedAt = Math.max(updatedAt ?? 0, stored[k].value?.fetchedAt ?? stored[k].savedAt);
  }
  const complete = keys.length > 0 && keys.every((k) => k in prices);
  return { prices, status: complete ? "ready" : "idle", updatedAt };
}
