// Converts the amounts inside a recipe quantity ("1/2 lb", "2 cups, shredded",
// "1 ball (16 oz)") to the person's preferred system. Spoon measures (tbsp/tsp) are
// the same everywhere and are left alone, as is anything without a unit.
export type Units = "metric" | "imperial";

const NUM = String.raw`(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔])`;
const UNIT = String.raw`(lbs?|pounds?|oz|ounces?|cups?|kg|g|grams?|ml|l)`;
const AMOUNT = new RegExp(String.raw`${NUM}(?:\s*[-–]\s*${NUM})?\s*${UNIT}(?![a-zA-Z])`, "gi");

const VULGAR: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

function parseNum(s: string): number {
  const t = s.trim();
  if (t in VULGAR) return VULGAR[t];
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(t);
}

// 0.75 → "3/4", 1.5 → "1 1/2" — the way recipes write cups and pounds.
function fraction(n: number): string {
  const q = Math.round(n * 4) / 4;
  const whole = Math.floor(q);
  const part = { 0: "", 0.25: "1/4", 0.5: "1/2", 0.75: "3/4" }[q - whole as 0 | 0.25 | 0.5 | 0.75];
  if (whole === 0) return part || "1/4";
  return part ? `${whole} ${part}` : String(whole);
}

const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

function toMetric(n: number, unit: string): string | null {
  if (/^(lbs?|pounds?)$/.test(unit)) {
    const g = n * 453.6;
    return g >= 1000 ? `${Number((g / 1000).toFixed(1))} kg` : `${round(g, 10)} g`;
  }
  if (/^(oz|ounces?)$/.test(unit)) return `${round(n * 28.35, 5)} g`;
  if (/^cups?$/.test(unit)) {
    const ml = n * 240;
    return `${round(ml, ml >= 100 ? 10 : 5)} ml`;
  }
  return null;
}

function toImperial(n: number, unit: string): string | null {
  let grams: number | null = null;
  let ml: number | null = null;
  if (/^(g|grams?)$/.test(unit)) grams = n;
  else if (unit === "kg") grams = n * 1000;
  else if (unit === "ml") ml = n;
  else if (unit === "l") ml = n * 1000;
  if (grams !== null) {
    const oz = grams / 28.35;
    return oz >= 16 ? `${fraction(grams / 453.6)} lb` : `${Math.max(0.5, Math.round(oz * 2) / 2)} oz`;
  }
  if (ml !== null) {
    if (ml >= 60) {
      const cups = ml / 240;
      return `${fraction(cups)} ${cups > 1.125 ? "cups" : "cup"}`;
    }
    return ml >= 7.5 ? `${Math.max(0.5, Math.round((ml / 15) * 2) / 2)} tbsp` : `${Math.max(0.25, Math.round((ml / 5) * 4) / 4)} tsp`;
  }
  return null;
}

export function convertQty(qty: string, units: Units): string {
  return qty.replace(AMOUNT, (match, a: string, b: string | undefined, unitRaw: string) => {
    const unit = unitRaw.toLowerCase();
    const convert = units === "metric" ? toMetric : toImperial;
    const first = convert(parseNum(a), unit);
    if (!first) return match;
    if (!b) return first;
    // A range ("1–2 cups") keeps both ends: "240–480 ml".
    const second = convert(parseNum(b), unit);
    if (!second) return match;
    const [n1] = first.split(" ");
    return `${n1}–${second}`;
  });
}
