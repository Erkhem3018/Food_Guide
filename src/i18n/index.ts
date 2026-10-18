import { createContext, useContext, useMemo } from "react";
import { MN as MN_UI } from "./mn";
import { buildRecipeDictionary } from "./mn-recipes";

// UI strings win over recipe text if the same English phrase appears in both.
const MN: Record<string, string> = { ...buildRecipeDictionary(), ...MN_UI };

// The app is written in English; every user-facing string goes through `tr(english)`.
// English text is the lookup key, so a missing translation falls back to readable
// English instead of a raw key. `{name}` placeholders are filled from `vars`.
export type Language = "en" | "mn";

export type Tr = ((text: string, vars?: Record<string, string | number>) => string) & {
  lang: Language;
  // Recipe quantities like "3 cloves, minced" or "1/2 cup".
  qty: (quantity: string) => string;
  // Dates in the reader's language.
  date: (d: Date, opts: Intl.DateTimeFormatOptions) => string;
};

export const LanguageContext = createContext<Language>("en");

const warned = new Set<string>();

export function makeTr(lang: Language): Tr {
  const fill = (text: string, vars?: Record<string, string | number>) =>
    vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

  const tr = ((text: string, vars?: Record<string, string | number>) => {
    if (lang === "en") return fill(text, vars);
    const hit = MN[text];
    if (hit === undefined && import.meta.env.DEV && !warned.has(text)) {
      warned.add(text);
      console.warn(`[i18n] missing mn: ${JSON.stringify(text)}`);
    }
    return fill(hit ?? text, vars);
  }) as Tr;
  tr.lang = lang;
  tr.qty = (quantity: string) => (lang === "en" ? quantity : translateQuantity(quantity));
  tr.date = (d, opts) => {
    if (lang === "mn") {
      // Intl's Mongolian month names vary by browser, so spell them out ourselves.
      if (opts.month) return `${MN_MONTHS[d.getMonth()]}${opts.day ? ` ${d.getDate()}` : ""}`;
    }
    return d.toLocaleDateString("en-US", opts);
  };
  return tr;
}

export function useTr(): Tr {
  const lang = useContext(LanguageContext);
  return useMemo(() => makeTr(lang), [lang]);
}

const MN_MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];

// Quantities are short and formulaic ("2 tbsp", "1 large, diced", "to taste"), so a
// phrase table plus word-by-word replacement reads naturally in Mongolian.
const QTY_PHRASES: [RegExp, string][] = [
  [/\bto taste\b/gi, "амтанд тааруулан"],
  [/\bfor serving\b/gi, "хооллохдоо"],
  [/\bfor frying\b/gi, "шарахад"],
  [/\bfor dusting\b/gi, "цацахад"],
  [/\bfor topping\b/gi, "дээр нь цацахад"],
  [/\bplus more\b/gi, "нэмэлтээр"],
  [/\bcut into wedges\b/gi, "дөрвөлжилж хэрчсэн"],
  [/\bcut into chips\b/gi, "урт зүсэм болгосон"],
  [/\bcut into strips\b/gi, "урт нарийн зүссэн"],
  [/\bthinly sliced\b/gi, "нимгэн зүссэн"],
  [/\bfinely chopped\b/gi, "нарийн хэрчсэн"],
  [/\bday-old\b/gi, "өмнөх өдрийн"],
  [/\bsoft-boiled\b/gi, "зөөлөн чанасан"],
  [/\bhard-boiled\b/gi, "хатуу чанасан"],
];
const QTY_WORDS: Record<string, string> = {
  cup: "аяга", cups: "аяга", tbsp: "хоолны халбага", tsp: "цайны халбага", lb: "фунт", oz: "унц",
  clove: "хумс", cloves: "хумс", pcs: "ш", pieces: "ширхэг", piece: "ширхэг", slice: "зүсэм", slices: "зүсэм",
  leaves: "навч", leaf: "навч", stalk: "иш", stalks: "иш", sprigs: "мөчир", sprig: "мөчир", pods: "ширхэг",
  can: "лааз", cans: "лааз", sheet: "хуудас", sheets: "хуудас", sheets_: "хуудас", portions: "порц", ball: "бөмбөлөг",
  pack: "боодол", bulb: "толгой", handful: "атга", discs: "ширхэг", bunch: "баглаа",
  large: "том", medium: "дунд", small: "жижиг", fresh: "шинэ",
  minced: "жижиглэсэн", sliced: "зүссэн", diced: "шоо хэлбэрээр хэрчсэн", chopped: "хэрчсэн", grated: "үрсэн",
  crushed: "буталсан", cubed: "шоо хэрчсэн", peeled: "хальсалсан", julienned: "нарийн урт зүссэн", torn: "урж хуваасан",
  melted: "хайлуулсан", softened: "зөөлрүүлсэн", cooked: "болгосон", boiled: "чанасан", blanched: "хуйхалсан",
  separated: "шар, цагааныг нь салгасан", split: "хагалсан", halved: "хагасалсан", quartered: "дөрөв хуваасан",
  smashed: "няцалсан", cracked: "бутлуулсан", ground: "нунтагласан", drained: "шүүсэн", thawed: "гэсгээсэн",
  soaked: "дэвтээсэн", blended: "блендердсэн", charred: "түлж шарсан", juiced: "шүүсийг нь шахсан",
  cooled: "хөргөсөн", warm: "бүлээн", cold: "хүйтэн", crumbled: "бутаргасан", shredded: "хэрчсэн",
  thinly: "нимгэн", finely: "нарийн", roughly: "бүдүүн", and: "ба", or: "эсвэл", plus: "нэмэх нь", more: "илүү",
  for: "", of: "", a: "", each: "тус бүр", whole: "бүтэн", fillets: "филе", optional: "заавал биш",
};

function translateQuantity(quantity: string): string {
  let s = quantity;
  for (const [re, mn] of QTY_PHRASES) s = s.replace(re, mn);
  s = s.replace(/[A-Za-z]+(?:-[A-Za-z]+)?/g, (w) => {
    const mn = QTY_WORDS[w.toLowerCase()];
    return mn === undefined ? w : mn;
  });
  return s.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").replace(/,\s*$/, "").trim();
}
