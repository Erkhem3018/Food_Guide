import { RECIPES } from "../data/recipes";
import { PART_1 } from "./mn-recipes-1";
import { PART_2 } from "./mn-recipes-2";
import { PART_3 } from "./mn-recipes-3";
import { PART_4 } from "./mn-recipes-4";

// Mongolian text for one recipe: description + [title, instructions, tip] per step,
// in the same order as the recipe's English steps.
export type RecipeText = { d: string; s: [string, string, string][] };

const ALL: Record<number, RecipeText> = { ...PART_1, ...PART_2, ...PART_3, ...PART_4 };

// Turn the per-recipe translations into English → Mongolian entries for `tr()`. A
// recipe whose step count doesn't line up is skipped (and flagged in development)
// rather than risk showing the wrong instruction for a step.
export function buildRecipeDictionary(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of RECIPES) {
    const t = ALL[r.id];
    if (!t) continue;
    out[r.description] = t.d;
    if (t.s.length !== r.steps.length) {
      if (import.meta.env?.DEV) console.warn(`[i18n] recipe ${r.id} has ${r.steps.length} steps but ${t.s.length} translations`);
      continue;
    }
    r.steps.forEach((step, i) => {
      const [title, desc, tip] = t.s[i];
      // Keep the first translation of a repeated short title ("Serve") — they agree.
      if (!(step.title in out)) out[step.title] = title;
      out[step.desc] = desc;
      out[step.tip] = tip;
    });
  }
  return out;
}
