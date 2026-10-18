// Server-only: looks up live grocery prices on nomin.mn for GET /nomin-prices.
// Never imported by the browser bundle.
//
// Nomin's site search loads results from a public Remix data route,
// /discover-products.data, which returns a "turbo-stream" payload (a flat,
// reference-encoded JSON array). We decode that, keep food products only, and let
// the catalog rules pick the right everyday product for each ingredient.
import {
  NOMIN_CATALOG_BY_KEY,
  NOMIN_FRESH_FOOD,
  NOMIN_PROCESSED_FOOD,
  pickNominProduct,
  type NominProduct,
} from "../src/data/nominCatalog.ts";

export type LivePrice = {
  key: string;
  name: string;
  price: number;
  regularPrice: number;
  url: string;
  fetchedAt: number;
};

// Identifies the app honestly so Nomin can see (and contact) who is reading prices.
// Set NOMIN_CONTACT to an address Nomin can reach, e.g. "ops@yourdomain.mn".
const USER_AGENT = `MiseRecipeApp/1.0 (grocery price lookup${process.env.NOMIN_CONTACT ? `; contact: ${process.env.NOMIN_CONTACT}` : ""})`;
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // shelf prices rarely change within a few hours
const MISS_TTL_MS = 30 * 60 * 1000; // "not sold online" is re-checked more often
const ERROR_TTL_MS = 5 * 60 * 1000;

// Per-instance cache. Fluid Compute reuses instances, so this saves most repeat
// lookups; the CDN cache on the API response covers the rest.
const cache = new Map<string, { value: LivePrice | null; expires: number }>();

// ── turbo-stream decoding ────────────────────────────────────────────────────
const SPECIAL: Record<string, unknown> = { "-1": undefined, "-2": undefined, "-3": NaN, "-4": Infinity, "-5": -Infinity, "-6": -0, "-7": null };

export function decodeTurboStream(text: string): unknown {
  const arr = JSON.parse(text.split("\n")[0]) as unknown[];
  const memo = new Map<number, unknown>();
  const val = (i: unknown): unknown => {
    if (typeof i !== "number") return i;
    if (i < 0) return SPECIAL[String(i)];
    if (memo.has(i)) return memo.get(i);
    const v = arr[i];
    if (Array.isArray(v)) {
      if (v.length === 2 && v[0] === "D") {
        const d = new Date(v[1] as string);
        memo.set(i, d);
        return d;
      }
      const out: unknown[] = [];
      memo.set(i, out);
      for (const x of v) out.push(val(x));
      return out;
    }
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      memo.set(i, out);
      for (const [k, x] of Object.entries(v)) out[String(arr[Number(k.slice(1))])] = val(x);
      return out;
    }
    memo.set(i, v);
    return v;
  };
  return val(0);
}

type RawItem = {
  productName?: string;
  computedPrice?: number;
  regularPrice?: number;
  sku?: string;
  stockLevel?: string;
  unit?: string;
  collectionSlugs?: string[];
};

async function searchNomin(query: string): Promise<NominProduct[]> {
  const url = `https://nomin.mn/discover-products.data?q=${encodeURIComponent(query)}&page=1&limit=30&skip=0&mode=instant&_routes=routes%2Fdiscover-products`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "*/*" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`nomin.mn responded ${res.status}`);
  // This route isn't a public API, so a Nomin redeploy can change its shape. Treat
  // anything unexpected as a failure (logged, prices fall back to estimates) rather
  // than as "no products", which would be cached as "not sold online".
  let items: RawItem[] | undefined;
  try {
    const data = decodeTurboStream(await res.text()) as Record<string, { data?: { result?: { items?: RawItem[] } } }>;
    items = data["routes/discover-products"]?.data?.result?.items;
  } catch {
    items = undefined;
  }
  if (!Array.isArray(items)) {
    console.error(`[nomin] unexpected response shape for "${query}" — the discover-products route may have changed`);
    throw new Error("nomin.mn response format changed");
  }
  return items
    .filter((it) => it.productName && typeof it.computedPrice === "number" && it.sku)
    .map((it) => {
      const sections = it.collectionSlugs ?? [];
      return {
        name: it.productName!,
        price: it.computedPrice!,
        regularPrice: it.regularPrice ?? it.computedPrice!,
        url: `https://nomin.mn/p/${it.sku}`,
        inStock: it.stockLevel !== "OUT_OF_STOCK",
        section: sections.includes(NOMIN_FRESH_FOOD) ? "fresh" : sections.includes(NOMIN_PROCESSED_FOOD) ? "processed" : null,
        perKg: it.unit === "kg",
      };
    });
}

async function priceForKey(key: string): Promise<LivePrice | null> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const item = NOMIN_CATALOG_BY_KEY.get(key);
  if (!item) return null;
  try {
    const product = pickNominProduct(item, await searchNomin(item.q));
    const value = product
      ? { key, name: product.name, price: product.price, regularPrice: product.regularPrice, url: product.url, fetchedAt: Date.now() }
      : null;
    cache.set(key, { value, expires: Date.now() + (value ? CACHE_TTL_MS : MISS_TTL_MS) });
    return value;
  } catch (err) {
    // Keep serving the last good price if we have one; otherwise remember the
    // failure briefly so a broken upstream isn't hammered.
    if (hit) {
      cache.set(key, { value: hit.value, expires: Date.now() + ERROR_TTL_MS });
      return hit.value;
    }
    cache.set(key, { value: null, expires: Date.now() + ERROR_TTL_MS });
    throw err;
  }
}

// Looks up several catalog keys, a few at a time so we stay a polite client.
export async function lookupNominPrices(keys: string[], concurrency = 3): Promise<{ prices: Record<string, LivePrice | null>; failed: string[] }> {
  const prices: Record<string, LivePrice | null> = {};
  const failed: string[] = [];
  const queue = [...new Set(keys)].filter((k) => NOMIN_CATALOG_BY_KEY.has(k));
  const worker = async () => {
    for (let k = queue.shift(); k !== undefined; k = queue.shift()) {
      try {
        prices[k] = await priceForKey(k);
      } catch {
        failed.push(k);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, worker));
  return { prices, failed };
}
