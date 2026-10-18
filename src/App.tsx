import { useState, useEffect, useRef, type ReactNode } from "react";
import { RECIPES, type Recipe } from "./data/recipes";
import { LanguageContext, makeTr, useTr, type Language, type Tr } from "./i18n";
import { nominKeyForIngredient } from "./data/nominCatalog";
import { useNominPrices, type LivePrice, type LivePriceState } from "./lib/livePrices";
import { api, ApiError, type ApiUser, type AuthResult } from "./lib/api";
import { rankingRating, ratingCount, ratingOf, useCommunityRatings, type RecipeRating } from "./lib/ratings";
import { convertQty, type Units } from "./lib/units";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "onboarding"
  | "auth"
  | "home"
  | "what-can-i-cook"
  | "matching"
  | "results"
  | "discover"
  | "cuisine"
  | "saved"
  | "profile"
  | "recipe-detail"
  | "cooking-mode"
  | "completion"
  | "my-kitchen"
  | "notifications"
  | "meal-plan-setup"
  | "meal-plan-building"
  | "meal-plan-result";

// `expiry` is an ISO date (YYYY-MM-DD) or "" when unknown; freshness is derived from
// it at render time so it never goes stale.
type KitchenIngredient = { name: string; qty: string; category: string; expiry: string };

type MealPlanConfig = {
  store: string;
  household: number;
  days: string[];
  mealSlots: string[];
  budget: number;
  diet: string;
  appliances: string[];
};

// Everything scoped to one person — swapped in wholesale on login/signup, synced to
// the Mise API for signed-in accounts and kept in this browser for guests.
type AccountData = {
  savedIds: number[];
  cookedIds: number[];
  kitchenIngredients: KitchenIngredient[];
  kitchenEquipment: string[];
  readNotificationIds: string[];
  recentSearches: string[];
  mealPlanConfig: MealPlanConfig;
  weeklyPlan: PlannedMeal[];
  collections: Collection[];
  language: Language;
  units: Units;
  personalizedRecommendations: boolean;
  profileName: string;
};

type Session = { kind: "user"; token: string; user: ApiUser } | { kind: "guest" };

// ─── Data ─────────────────────────────────────────────────────────────────────
// Recipe data lives in src/data/recipes.ts

// Cuisine cards use the photo of their first recipe, so every card is backed by real
// recipes and there are no separate image URLs to rot.
const CUISINES = [
  { name: "Mongolian", emoji: "🇲🇳", blurb: "Hand-folded dumplings, hearty noodles and the food of the steppe." },
  { name: "Korean", emoji: "🇰🇷", blurb: "Bold, spicy and fermented — bubbling stews and colorful rice bowls." },
  { name: "Japanese", emoji: "🇯🇵", blurb: "Clean flavors, careful technique and deeply savory broths." },
  { name: "Chinese", emoji: "🇨🇳", blurb: "Fiery Sichuan heat, wok-tossed stir-fries and hand-made dumplings." },
  { name: "Italian", emoji: "🇮🇹", blurb: "Simple ingredients treated with respect — pasta, pizza and dolci." },
  { name: "Mexican", emoji: "🇲🇽", blurb: "Chilies, lime and corn tortillas — street food at its best." },
  { name: "Indian", emoji: "🇮🇳", blurb: "Layered spices, rich curries and crispy snacks." },
  { name: "American", emoji: "🇺🇸", blurb: "Comfort food classics, from burgers to fluffy pancakes." },
  { name: "Thai", emoji: "🇹🇭", blurb: "Sweet, sour, salty and spicy in perfect balance." },
  { name: "French", emoji: "🇫🇷", blurb: "Slow braises, silky custards and rustic country cooking." },
  { name: "Greek", emoji: "🇬🇷", blurb: "Olive oil, herbs and generous baked dishes." },
  { name: "Turkish", emoji: "🇹🇷", blurb: "Charcoal-grilled kebabs and bright, yogurt-based marinades." },
];

function cuisineRecipes(cuisine: string): Recipe[] {
  return RECIPES.filter((r) => r.cuisine === cuisine);
}

function cuisineImage(cuisine: string): string {
  return cuisineRecipes(cuisine)[0]?.image ?? RECIPES[0].image;
}

const INGREDIENTS_LIST = ["Chicken breast", "Eggs", "Pasta", "Rice", "Garlic", "Onion", "Tomatoes", "Carrots", "Potatoes", "Spinach", "Milk", "Butter", "Olive oil", "Flour", "Cheese", "Chicken thighs", "Ground beef", "Ground pork", "Ground lamb", "Beef sirloin", "Beef chuck", "Pork shoulder", "Pork belly", "Shrimp", "White fish fillets", "Cod fillets", "Basmati rice", "Jasmine rice", "Sushi rice", "Long-grain rice", "Rice noodles", "Egg noodles", "Spaghetti", "All-purpose flour", "Pizza dough", "Phyllo dough", "Dumpling wrappers", "Coconut milk", "Heavy cream", "Sour cream", "Mascarpone cheese", "Cheddar cheese", "Feta cheese", "Parmesan", "Vegetable oil", "Soy sauce", "Fish sauce", "Tamarind paste", "Rice vinegar", "Sherry vinegar", "Lime juice", "Lemon juice", "Ginger", "Red onion", "Scallions", "Crushed tomatoes", "Bell pepper", "Avocado", "Cucumber", "Cilantro", "Thai basil", "Chickpeas", "Tahini", "Peanut butter", "Roasted peanuts", "Walnuts", "Cumin", "Paprika", "Smoked paprika", "Garam masala", "Gochujang", "Berbere spice", "Sugar", "Honey"];
const EQUIPMENT_LIST = [
  { name: "Frying Pan", icon: "🍳" },
  { name: "Pot", icon: "🫕" },
  { name: "Oven", icon: "⬛" },
  { name: "Microwave", icon: "📦" },
  { name: "Air Fryer", icon: "💨" },
  { name: "Rice Cooker", icon: "🍚" },
  { name: "Pressure Cooker", icon: "⚡" },
  { name: "Blender", icon: "🌀" },
  { name: "Grill", icon: "🔥" },
  { name: "Steamer", icon: "💧" },
];

type Collection = { name: string; color: string; icon: string; recipeIds: number[] };

const COLLECTION_COLOR_PALETTE = ["#F25C2B", "#2563EB", "#16A34A", "#9333EA", "#DB2777", "#0891B2"];

// ─── Dates & freshness ────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoDaysFromNow(days: number): string {
  return toIsoDate(new Date(Date.now() + days * DAY_MS));
}

// Whole days from today until the expiry date (negative = already expired), or null
// when the date is unknown.
function daysUntil(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

type Freshness = "expired" | "expiring" | "ok" | "unknown";
const EXPIRING_WITHIN_DAYS = 3;

function freshnessOf(ing: KitchenIngredient): Freshness {
  const days = daysUntil(ing.expiry);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= EXPIRING_WITHIN_DAYS) return "expiring";
  return "ok";
}

function expiryLabel(ing: KitchenIngredient, tr: Tr): string {
  const days = daysUntil(ing.expiry);
  if (days === null) return tr("No date");
  if (days < 0) return tr("Expired {n}d ago", { n: -days });
  if (days === 0) return tr("Expires today");
  if (days === 1) return tr("Expires tomorrow");
  if (days <= 14) return tr("Expires in {n}d", { n: days });
  const [y, m, d] = ing.expiry.split("-").map(Number);
  return tr("Exp {date}", { date: tr.date(new Date(y, m - 1, d), { month: "short", day: "numeric" }) });
}

const GROCERY_STORES = [
  { name: "Nomin", icon: "🏬" },
  { name: "MINII", icon: "🛒" },
  { name: "Orgil", icon: "🏪" },
  { name: "Emart", icon: "🛍️" },
  { name: "Max Foods", icon: "📦" },
  { name: "Khanburgedei", icon: "🥩" },
  { name: "ZAZA", icon: "🥬" },
  { name: "Good Price Market", icon: "💰" },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DIET_PREFERENCES = ["None", "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Low-carb"];

const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];


// ─── Helpers ──────────────────────────────────────────────────────────────────
type RecipeT = typeof RECIPES[0];
type PlannedMeal = { day: string; slot: string; recipe: RecipeT };

// "1 hr 30 min" → "1 цаг 30 мин" in Mongolian.
function trTime(time: string, tr: Tr): string {
  if (tr.lang === "en") return time;
  return time.replace(/(\d+)\s*hrs?\b/g, "$1 цаг").replace(/(\d+)\s*min\b/g, "$1 мин");
}

// Handles "25 min", "1 hr", "1 hr 30 min" and "2 hrs".
function parseMinutes(time: string): number {
  const hours = time.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mins = time.match(/(\d+)\s*m/i);
  const total = (hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0);
  if (total > 0) return Math.round(total);
  const bare = time.match(/\d+/);
  return bare ? parseInt(bare[0], 10) : 0;
}

// ─── Ingredient matching ──────────────────────────────────────────────────────
// Matching works on whole words, not substrings, so "Egg" no longer matches
// "Eggplant". Two names match when they share the same head noun (the last word —
// "rice" in "Jasmine rice") and one name's words are all contained in the other's
// ("Pasta" ↔ "Penne pasta", "Olive oil" ↔ "Oil"). A few modifiers turn an ingredient
// into a different product, so they must appear on both sides: "Butter" is not
// "Peanut butter", and "Milk" is not "Coconut milk".
const IDENTITY_MODIFIERS = new Set([
  "peanut", "coconut", "almond", "oat", "soy", "sour", "ice", "cocoa", "sesame", "fish", "oyster", "spring", "sweet", "glutinous",
]);
const IGNORED_WORDS = new Set(["or", "and", "of", "fresh", "ripe", "large", "small", "medium", "whole", "cooked", "raw", "dried"]);

function singularize(word: string): string {
  if (word.length > 4 && word.endsWith("oes")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

function ingredientWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-zà-ÿ]+/)
    .filter((w) => w.length > 0 && !IGNORED_WORDS.has(w))
    .map(singularize);
}

function ingredientNamesMatch(a: string, b: string): boolean {
  const wa = ingredientWords(a);
  const wb = ingredientWords(b);
  if (wa.length === 0 || wb.length === 0) return false;
  if (wa[wa.length - 1] !== wb[wb.length - 1]) return false;
  const setA = new Set(wa);
  const setB = new Set(wb);
  const aInB = wa.every((w) => setB.has(w));
  const bInA = wb.every((w) => setA.has(w));
  if (!aInB && !bInA) return false;
  for (const w of [...wa, ...wb]) {
    if (IDENTITY_MODIFIERS.has(w) && !(setA.has(w) && setB.has(w))) return false;
  }
  return true;
}

function hasIngredient(recipeIngredientName: string, owned: string[]): boolean {
  // "Ground mutton or lamb" is satisfied by either alternative.
  const alternatives = recipeIngredientName.split(/\s+or\s+/i);
  const head = ingredientWords(recipeIngredientName).slice(-1)[0] ?? "";
  return owned.some((o) =>
    ingredientNamesMatch(recipeIngredientName, o) ||
    alternatives.some((alt) => {
      const altWords = ingredientWords(alt);
      // Give each alternative the shared head noun if it lacks one ("Pork belly or pâté").
      const withHead = altWords.length === 1 && head && altWords[0] !== head ? `${alt} ${head}` : alt;
      return ingredientNamesMatch(alt, o) || ingredientNamesMatch(withHead, o);
    })
  );
}

// ─── Substitutions ────────────────────────────────────────────────────────────
// Common swaps keyed by a word that appears in the recipe ingredient. Each swap says
// how to convert the quantity so the cook isn't left guessing.
type Substitute = { name: string; ratio: string };
const SUBSTITUTIONS: { match: string; subs: Substitute[] }[] = [
  { match: "parmesan", subs: [{ name: "Pecorino Romano", ratio: "Same amount" }, { name: "Cheddar cheese", ratio: "Same amount, finely grated" }] },
  { match: "pecorino", subs: [{ name: "Parmesan", ratio: "Same amount, plus a pinch of salt" }] },
  { match: "mozzarella", subs: [{ name: "Cheddar cheese", ratio: "Same amount" }, { name: "Feta cheese", ratio: "Use half the amount" }] },
  { match: "mascarpone", subs: [{ name: "Cream cheese", ratio: "Same amount, beaten with a splash of cream" }] },
  { match: "feta", subs: [{ name: "Farmer's cheese", ratio: "Same amount, plus a pinch of salt" }] },
  { match: "farmer", subs: [{ name: "Cottage cheese", ratio: "Same amount, drained well" }, { name: "Feta cheese", ratio: "Use half the amount" }] },
  { match: "heavy cream", subs: [{ name: "Milk + butter", ratio: "¾ cup milk + ¼ cup melted butter per cup" }, { name: "Coconut milk", ratio: "Same amount (adds coconut flavor)" }] },
  { match: "sour cream", subs: [{ name: "Plain yogurt", ratio: "Same amount" }] },
  { match: "buttermilk", subs: [{ name: "Milk + lemon juice", ratio: "1 cup milk + 1 tbsp lemon juice, rest 5 min" }] },
  { match: "yogurt", subs: [{ name: "Sour cream", ratio: "Same amount" }] },
  { match: "butter", subs: [{ name: "Vegetable oil", ratio: "¾ of the amount" }, { name: "Olive oil", ratio: "¾ of the amount" }] },
  { match: "olive oil", subs: [{ name: "Vegetable oil", ratio: "Same amount" }] },
  { match: "vegetable oil", subs: [{ name: "Olive oil", ratio: "Same amount (light olive oil for frying)" }] },
  { match: "sesame oil", subs: [{ name: "Vegetable oil + toasted sesame seeds", ratio: "Same amount of oil + 1 tsp seeds" }] },
  { match: "lime", subs: [{ name: "Lemon juice", ratio: "Same amount" }] },
  { match: "lemon", subs: [{ name: "Lime juice", ratio: "Same amount" }, { name: "White vinegar", ratio: "Use half the amount" }] },
  { match: "vinegar", subs: [{ name: "Lemon juice", ratio: "Same amount" }, { name: "Rice vinegar", ratio: "Same amount" }] },
  { match: "mirin", subs: [{ name: "Rice vinegar + sugar", ratio: "1 tbsp vinegar + ½ tsp sugar per tbsp" }] },
  { match: "fish sauce", subs: [{ name: "Soy sauce", ratio: "Same amount, plus a squeeze of lime" }] },
  { match: "soy sauce", subs: [{ name: "Fish sauce", ratio: "Use half the amount" }] },
  { match: "kecap manis", subs: [{ name: "Soy sauce + honey", ratio: "2 parts soy sauce to 1 part honey" }] },
  { match: "gochujang", subs: [{ name: "Chili paste + miso", ratio: "Equal parts, plus a little sugar" }] },
  { match: "doubanjiang", subs: [{ name: "Gochujang", ratio: "Same amount (sweeter)" }, { name: "Miso + chili flakes", ratio: "1 tbsp miso + ½ tsp chili per tbsp" }] },
  { match: "tamarind", subs: [{ name: "Lime juice + brown sugar", ratio: "1 tbsp lime + 1 tsp sugar per tbsp" }] },
  { match: "shallot", subs: [{ name: "Onion", ratio: "Same amount, finely sliced" }] },
  { match: "scallion", subs: [{ name: "Onion", ratio: "Use half the amount, finely sliced" }] },
  { match: "green onion", subs: [{ name: "Onion", ratio: "Use half the amount, finely sliced" }] },
  { match: "garlic", subs: [{ name: "Garlic powder", ratio: "⅛ tsp per clove" }] },
  { match: "ginger", subs: [{ name: "Ground ginger", ratio: "¼ tsp per tbsp of fresh" }] },
  { match: "cilantro", subs: [{ name: "Parsley", ratio: "Same amount" }] },
  { match: "basil", subs: [{ name: "Dried basil", ratio: "1 tsp dried per tbsp fresh" }, { name: "Spinach", ratio: "Same amount (for color, milder flavor)" }] },
  { match: "thyme", subs: [{ name: "Dried thyme", ratio: "1 tsp dried per tbsp fresh" }] },
  { match: "jalapeño", subs: [{ name: "Chili flakes", ratio: "½ tsp per pepper" }] },
  { match: "chili", subs: [{ name: "Chili flakes", ratio: "½ tsp per chili" }, { name: "Paprika", ratio: "1 tsp (much milder)" }] },
  { match: "scotch bonnet", subs: [{ name: "Habanero", ratio: "Same amount" }, { name: "Chili flakes", ratio: "1 tsp per pepper" }] },
  { match: "smoked paprika", subs: [{ name: "Paprika", ratio: "Same amount" }] },
  { match: "garam masala", subs: [{ name: "Curry powder", ratio: "Same amount" }] },
  { match: "ras el hanout", subs: [{ name: "Cumin + cinnamon + paprika", ratio: "Equal parts to the same total" }] },
  { match: "honey", subs: [{ name: "Sugar", ratio: "1¼ × the amount + a splash of water" }] },
  { match: "brown sugar", subs: [{ name: "Sugar", ratio: "Same amount (+1 tsp honey per cup)" }] },
  { match: "chicken breast", subs: [{ name: "Chicken thighs", ratio: "Same amount, cook 2–3 min longer" }] },
  { match: "chicken thigh", subs: [{ name: "Chicken breast", ratio: "Same amount, cook 2–3 min less" }] },
  { match: "ground lamb", subs: [{ name: "Ground beef", ratio: "Same amount" }] },
  { match: "mutton", subs: [{ name: "Ground beef", ratio: "Same amount, ideally 20% fat" }] },
  { match: "ground beef", subs: [{ name: "Ground pork", ratio: "Same amount" }, { name: "Ground lamb", ratio: "Same amount" }] },
  { match: "ground pork", subs: [{ name: "Ground beef", ratio: "Same amount" }, { name: "Ground chicken", ratio: "Same amount, add a little oil" }] },
  { match: "pork belly", subs: [{ name: "Bacon", ratio: "Same amount, sliced thick" }] },
  { match: "guanciale", subs: [{ name: "Bacon", ratio: "Same amount" }] },
  { match: "shrimp", subs: [{ name: "Chicken breast", ratio: "Same amount, sliced thin" }] },
  { match: "penne", subs: [{ name: "Spaghetti", ratio: "Same amount" }, { name: "Pasta", ratio: "Any short shape, same amount" }] },
  { match: "spaghetti", subs: [{ name: "Pasta", ratio: "Any long shape, same amount" }] },
  { match: "egg noodle", subs: [{ name: "Pasta", ratio: "Same amount" }] },
  { match: "rice noodle", subs: [{ name: "Spaghetti", ratio: "Same amount (cook as pasta)" }] },
  { match: "ramen noodle", subs: [{ name: "Spaghetti + baking soda", ratio: "Boil with 1 tbsp baking soda per liter" }] },
  { match: "rice", subs: [{ name: "Long-grain rice", ratio: "Same amount" }] },
  { match: "tortilla", subs: [{ name: "Flatbread", ratio: "Same number" }] },
  { match: "stock", subs: [{ name: "Water + soy sauce", ratio: "1 cup water + 1 tsp soy sauce per cup" }] },
  { match: "wine", subs: [{ name: "Stock + vinegar", ratio: "1 cup stock + 1 tbsp vinegar per cup" }] },
  { match: "beer", subs: [{ name: "Sparkling water", ratio: "Same amount" }] },
  { match: "egg", subs: [{ name: "Flax egg", ratio: "1 tbsp ground flax + 3 tbsp water per egg (baking only)" }] },
  { match: "spinach", subs: [{ name: "Cabbage", ratio: "Same amount, cooked a little longer" }] },
];

// More specific entries that would otherwise fall through to a wrong generic swap.
SUBSTITUTIONS.push(
  { match: "peanut butter", subs: [{ name: "Tahini", ratio: "Same amount" }] },
  { match: "preserved lemon", subs: [{ name: "Lemon zest + salt", ratio: "Zest of 1 lemon + ½ tsp salt" }] },
  { match: "boiled egg", subs: [] },
  { match: "rice flour", subs: [] },
);

const SUBSTITUTIONS_BY_SPECIFICITY = [...SUBSTITUTIONS].sort((a, b) => b.match.length - a.match.length);

function substitutesFor(ingredientName: string): Substitute[] {
  const n = ingredientName.toLowerCase();
  // Longest match first so "heavy cream" beats "cream", and whole words only so
  // "egg" doesn't match "eggplant".
  const hit = SUBSTITUTIONS_BY_SPECIFICITY.find((s) =>
    new RegExp(`(?<![a-z])${s.match}(s|es)?(?![a-z])`).test(n)
  );
  return hit?.subs ?? [];
}

function computeMatch(recipe: RecipeT, owned: string[]): number {
  if (recipe.ingredients.length === 0) return 0;
  const haveCount = recipe.ingredients.filter((i) => hasIngredient(i.name, owned)).length;
  return Math.round((haveCount / recipe.ingredients.length) * 100);
}

function hasAllEquipment(recipe: RecipeT, ownedEquipment: string[]): boolean {
  return recipe.equipment.every((e) => ownedEquipment.includes(e));
}

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

function sortRecipes(list: RecipeT[], sort: string, owned: string[]): RecipeT[] {
  const arr = [...list];
  if (sort === "Fastest") arr.sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));
  else if (sort === "Easiest") arr.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1));
  else if (sort === "Popular") arr.sort((a, b) => ratingCount(b.id) - ratingCount(a.id) || rankingRating(b.id) - rankingRating(a.id));
  else arr.sort((a, b) => computeMatch(b, owned) - computeMatch(a, owned));
  return arr;
}

function matchesTimeFilter(recipe: RecipeT, time: string): boolean {
  if (time === "Any") return true;
  const mins = parseMinutes(recipe.time);
  if (time === "Under 15 min") return mins <= 15;
  if (time === "Under 30 min") return mins <= 30;
  if (time === "Under 1 hour") return mins <= 60;
  return true;
}

// ─── Recommendation engine ───────────────────────────────────────────────────
// A lightweight, fully client-side "smart picks" engine: it blends how much of a
// recipe the user can already make, whether they own the equipment, and which
// cuisines they gravitate toward (from what they save and cook) into one score.
function computeCuisineAffinity(savedRecipes: RecipeT[], cookedRecipes: RecipeT[]): Record<string, number> {
  const affinity: Record<string, number> = {};
  savedRecipes.forEach((r) => { affinity[r.cuisine] = (affinity[r.cuisine] ?? 0) + 1; });
  cookedRecipes.forEach((r) => { affinity[r.cuisine] = (affinity[r.cuisine] ?? 0) + 2; });
  return affinity;
}

function computeRecommendationScore(
  recipe: RecipeT,
  ownedIngredients: string[],
  ownedEquipment: string[],
  cuisineAffinity: Record<string, number>
): number {
  const matchPct = computeMatch(recipe, ownedIngredients);
  const equipmentBonus = hasAllEquipment(recipe, ownedEquipment) ? 10 : 0;
  const cuisineBonus = Math.min(cuisineAffinity[recipe.cuisine] ?? 0, 3) * 8;
  const ratingScore = (rankingRating(recipe.id) / 5) * 100;
  return matchPct * 0.5 + ratingScore * 0.2 + equipmentBonus + cuisineBonus;
}

function getTopRecommendations(
  recipes: RecipeT[],
  n: number,
  ownedIngredients: string[],
  ownedEquipment: string[],
  cuisineAffinity: Record<string, number>
): RecipeT[] {
  return [...recipes]
    .sort(
      (a, b) =>
        computeRecommendationScore(b, ownedIngredients, ownedEquipment, cuisineAffinity) -
        computeRecommendationScore(a, ownedIngredients, ownedEquipment, cuisineAffinity)
    )
    .slice(0, n);
}

function topCuisineFrom(cuisineAffinity: Record<string, number>): string | null {
  const entries = Object.entries(cuisineAffinity).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 && entries[0][1] > 0 ? entries[0][0] : null;
}

// ─── Weekly meal-plan engine ──────────────────────────────────────────────────
// Dietary tags aren't hand-labeled on every recipe, so these classifiers infer
// them from the ingredient list. They're a helpful estimate, not a guarantee —
// the UI says so wherever a diet filter is offered.
const MEAT_SEAFOOD_KEYWORDS = [
  "chicken", "beef", "pork", "lamb", "bacon", "sausage", "pepperoni", "turkey", "duck", "ham",
  "chorizo", "prosciutto", "anchov", "fish", "shrimp", "salmon", "cod", "squid", "mussel", "crab",
  "guanciale", "pancetta", "bratwurst",
];
const DAIRY_KEYWORDS = ["milk", "cheese", "butter", "cream", "yogurt", "mascarpone", "parmesan", "feta", "mozzarella", "ghee", "buttermilk"];
const EGG_KEYWORDS = ["egg"];
const GLUTEN_KEYWORDS = [
  "flour", "pasta", "spaghetti", "noodle", "bread", "baguette", "dough", "wrapper", "tortilla",
  "pancake", "phyllo", "pierogi", "dumpling", "bun", "pita", "soy sauce",
];

function recipeSearchText(recipe: RecipeT): string {
  return [recipe.name, ...recipe.ingredients.map((i) => i.name)].join(" ").toLowerCase();
}
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}
function isVegetarian(recipe: RecipeT): boolean {
  return !containsAny(recipeSearchText(recipe), MEAT_SEAFOOD_KEYWORDS);
}
function isVegan(recipe: RecipeT): boolean {
  const text = recipeSearchText(recipe);
  return isVegetarian(recipe) && !containsAny(text, DAIRY_KEYWORDS) && !containsAny(text, EGG_KEYWORDS) && !text.includes("honey");
}
function isGlutenFree(recipe: RecipeT): boolean {
  return !containsAny(recipeSearchText(recipe), GLUTEN_KEYWORDS);
}
function isDairyFree(recipe: RecipeT): boolean {
  return !containsAny(recipeSearchText(recipe), DAIRY_KEYWORDS);
}
function isHalalFriendly(recipe: RecipeT): boolean {
  const text = recipeSearchText(recipe);
  return !text.includes("pork") && !text.includes("bacon") && !text.includes("ham") && !text.includes("wine") && !text.includes("beer");
}
function matchesDiet(recipe: RecipeT, diet: string): boolean {
  switch (diet) {
    case "Vegetarian": return isVegetarian(recipe);
    case "Vegan": return isVegan(recipe);
    case "Gluten-free": return isGlutenFree(recipe);
    case "Dairy-free": return isDairyFree(recipe);
    case "Halal": return isHalalFriendly(recipe);
    case "Low-carb": return recipe.carbs <= 25;
    default: return true;
  }
}

// Rough estimates in Mongolian Tögrög (₮), scaled for Ulaanbaatar grocery prices.
const INGREDIENT_PRICE_HINTS: [string, number][] = [
  ["chicken", 20000], ["beef", 28000], ["pork", 20000], ["lamb", 22000], ["shrimp", 32000], ["salmon", 30000], ["cod", 25000],
  ["fish", 28000], ["sausage", 18000], ["bacon", 18000], ["egg", 14000], ["milk", 8000], ["cheese", 18000], ["butter", 14000],
  ["cream", 14000], ["yogurt", 10000], ["rice", 10000], ["pasta", 9000], ["noodle", 8000], ["bread", 6000], ["flour", 6000],
  ["tortilla", 10000], ["dough", 12000], ["tomato", 8000], ["onion", 4000], ["garlic", 3000], ["pepper", 6000],
  ["potato", 6000], ["carrot", 4000], ["avocado", 14000], ["lime", 3000], ["lemon", 4000], ["cilantro", 3000],
  ["basil", 6000], ["oil", 15000], ["sauce", 9000], ["vinegar", 8000], ["spice", 6000], ["masala", 9000], ["sugar", 6000],
  ["honey", 15000], ["nut", 14000], ["bean", 8000], ["tofu", 8000],
];
function estimateIngredientPrice(ingredientName: string): number {
  const n = ingredientName.toLowerCase();
  for (const [key, price] of INGREDIENT_PRICE_HINTS) if (n.includes(key)) return price;
  return 7000;
}

type GroceryItem = {
  displayName: string;
  occurrences: { recipeName: string; qty: string }[];
  estCost: number;
  // Sum of household-scaled recipe uses, used to decide how many packs to buy.
  scaleTotal: number;
  // Catalog key for a live Nomin price, or null when Nomin doesn't sell it online.
  nominKey: string | null;
};

// A grocery item priced for the shopping list: the live Nomin product when we have
// one, otherwise our estimate.
type PricedGroceryItem = GroceryItem & { live: LivePrice | null; packs: number; cost: number };

// Pantry staples last the week — one pack covers every recipe that uses them.
const STAPLE_KEYS = new Set([
  "salt", "sugar", "oil", "olive-oil", "sesame-oil", "black-pepper", "soy-sauce", "vinegar", "ketchup", "mayonnaise", "mustard",
  "paprika", "cinnamon", "curry", "gochujang", "baking-powder", "cocoa", "cornstarch", "honey", "flour", "rice", "stock", "coffee",
]);

function priceGroceryList(items: GroceryItem[], prices: Record<string, LivePrice | null>): PricedGroceryItem[] {
  return items.map((item) => {
    const live = item.nominKey ? prices[item.nominKey] ?? null : null;
    if (!live) return { ...item, live: null, packs: 0, cost: item.estCost };
    // Roughly one pack per two household-sized uses of fresh items; staples once a week.
    const packs = STAPLE_KEYS.has(item.nominKey!) ? 1 : Math.max(1, Math.round(item.scaleTotal / 2));
    return { ...item, live, packs, cost: live.price * packs };
  });
}

// Scales each recipe's ingredient cost to the household size (recipes are written for
// their own `servings`, so a 1-person household needing less of a 4-serving recipe still
// costs roughly proportionally less, and a larger household costs proportionally more).
function householdScale(recipe: RecipeT, household: number): number {
  return Math.max(0.5, household / (recipe.servings || 2));
}

function buildGroceryList(meals: PlannedMeal[], household: number): GroceryItem[] {
  const map = new Map<string, GroceryItem>();
  meals.forEach(({ recipe: r }) => {
    const scale = householdScale(r, household);
    r.ingredients.forEach((ing) => {
      const key = ing.name.toLowerCase();
      const cost = estimateIngredientPrice(ing.name) * scale;
      const existing = map.get(key);
      if (existing) {
        existing.occurrences.push({ recipeName: r.name, qty: ing.qty });
        existing.estCost += cost;
        existing.scaleTotal += scale;
      } else {
        map.set(key, {
          displayName: ing.name,
          occurrences: [{ recipeName: r.name, qty: ing.qty }],
          estCost: cost,
          scaleTotal: scale,
          nominKey: nominKeyForIngredient(ing.name),
        });
      }
    });
  });
  return Array.from(map.values())
    .map((item) => ({ ...item, estCost: Math.round(item.estCost / 500) * 500 }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// Scores how well a recipe fits a specific meal slot for this person: diet is a hard
// requirement, matching meal-time and owning the right equipment are strongly weighted,
// and recipes already used more often this week are pushed down so the week stays varied.
// Rewards recipes whose calorie weight fits when they're typically eaten: light in the
// morning, heavier as the day goes on — the same logic a nutritionist would use.
function slotCalorieFit(recipe: RecipeT, slot: string): number {
  const cal = recipe.calories;
  if (slot === "Breakfast") return cal <= 350 ? 18 : cal <= 450 ? 6 : cal >= 550 ? -22 : -8;
  if (slot === "Snack") return cal <= 250 ? 18 : cal <= 350 ? 6 : -18;
  if (slot === "Lunch") return cal >= 300 && cal <= 550 ? 10 : cal > 650 ? -8 : 0;
  if (slot === "Dinner") return cal >= 400 ? 10 : cal < 300 ? -6 : 0;
  return 0;
}

function scoreForSlot(recipe: RecipeT, slot: string, ownedEquipment: string[], diet: string, usageCount: number): number {
  if (!matchesDiet(recipe, diet)) return -1000;
  let score = rankingRating(recipe.id) * 8;
  if (recipe.tags.includes(slot)) score += 30;
  else if (slot === "Snack" && recipe.tags.includes("Quick Meals")) score += 12;
  else if (slot === "Breakfast" && recipe.tags.includes("Quick Meals")) score += 6;
  score += slotCalorieFit(recipe, slot);
  score += hasAllEquipment(recipe, ownedEquipment) ? 20 : -40;
  score -= usageCount * 15;
  return score;
}

function bestRecipeForSlot(pool: RecipeT[], slot: string, ownedEquipment: string[], diet: string, usage: Map<number, number>): RecipeT {
  let best = pool[0];
  let bestScore = -Infinity;
  for (const r of pool) {
    const s = scoreForSlot(r, slot, ownedEquipment, diet, usage.get(r.id) ?? 0);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

function buildWeeklyMealPlan(config: MealPlanConfig, ownedEquipment: string[]): PlannedMeal[] {
  const usage = new Map<number, number>();
  const plan: PlannedMeal[] = [];
  for (const day of config.days) {
    const usedToday = new Set<number>();
    for (const slot of config.mealSlots) {
      let pool = RECIPES.filter((r) => matchesDiet(r, config.diet) && !usedToday.has(r.id));
      if (pool.length === 0) pool = RECIPES.filter((r) => !usedToday.has(r.id));
      if (pool.length === 0) pool = RECIPES;
      const recipe = bestRecipeForSlot(pool, slot, ownedEquipment, config.diet, usage);
      plan.push({ day, slot, recipe });
      usedToday.add(recipe.id);
      usage.set(recipe.id, (usage.get(recipe.id) ?? 0) + 1);
    }
  }
  return plan;
}

function pickReplacementForSlot(slot: string, ownedEquipment: string[], diet: string, excludeIds: number[]): RecipeT {
  let pool = RECIPES.filter((r) => matchesDiet(r, diet) && !excludeIds.includes(r.id));
  if (pool.length === 0) pool = RECIPES.filter((r) => !excludeIds.includes(r.id));
  if (pool.length === 0) pool = RECIPES;
  return bestRecipeForSlot(pool, slot, ownedEquipment, diet, new Map());
}

// ─── Accounts & persistence ───────────────────────────────────────────────────
// Signed-in accounts live on the Mise API (server/, on Railway). This browser keeps a
// copy of the account's data so the app opens instantly and keeps working offline,
// and pushes changes back in the background. Guests stay entirely in this browser.
const SESSION_KEY = "mise_session_v2";
const USER_CACHE_KEY = "mise_user_cache_v2";
const GUEST_DATA_KEY = "mise_guest_v1";
// Accounts saved by the older browser-only build — read once to carry data over.
const LEGACY_ACCOUNTS_KEY = "mise_accounts_v1";

function defaultAccountData(overrides: Partial<AccountData> = {}): AccountData {
  return {
    savedIds: [],
    cookedIds: [],
    kitchenIngredients: [],
    kitchenEquipment: [],
    readNotificationIds: [],
    recentSearches: [],
    mealPlanConfig: {
      store: "",
      household: 2,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      mealSlots: ["Lunch", "Dinner"],
      budget: 350000,
      diet: "None",
      appliances: [],
    },
    weeklyPlan: [],
    collections: [],
    language: "en",
    units: "metric",
    personalizedRecommendations: true,
    profileName: "New Cook",
    ...overrides,
  };
}

// What gets stored and synced: the same data, with weekly-plan recipes reduced to
// their ids (the full recipe is re-attached on load) and keys in a fixed order so two
// snapshots can be compared as strings.
type StoredData = Omit<AccountData, "weeklyPlan"> & { weeklyPlan: { day: string; slot: string; recipeId: number }[] };

function toStored(d: AccountData): StoredData {
  return {
    savedIds: d.savedIds,
    cookedIds: d.cookedIds,
    kitchenIngredients: d.kitchenIngredients,
    kitchenEquipment: d.kitchenEquipment,
    readNotificationIds: d.readNotificationIds,
    recentSearches: d.recentSearches,
    mealPlanConfig: d.mealPlanConfig,
    weeklyPlan: d.weeklyPlan.map((p) => ({ day: p.day, slot: p.slot, recipeId: p.recipe.id })),
    collections: d.collections,
    language: d.language,
    units: d.units,
    personalizedRecommendations: d.personalizedRecommendations,
    profileName: d.profileName,
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — the app still works for this tab
  }
}

type UserCache = { userId: string; data: StoredData; dirty: boolean };

function loadSession(): Session | null {
  const s = readJson<Session>(SESSION_KEY);
  if (s?.kind === "guest") return s;
  if (s?.kind === "user" && typeof s.token === "string" && s.user?.id) return s;
  return null;
}

function loadUserData(userId: string): { data: AccountData; dirty: boolean } | null {
  const cache = readJson<UserCache>(USER_CACHE_KEY);
  if (!cache || cache.userId !== userId) return null;
  return { data: migrateAccountData(cache.data as unknown as Record<string, unknown>), dirty: cache.dirty };
}

function loadGuestData(): AccountData | null {
  const stored = readJson<Record<string, unknown>>(GUEST_DATA_KEY);
  if (stored) return migrateAccountData(stored);
  // A guest from the browser-only build.
  const legacy = readJson<Record<string, { data?: Record<string, unknown> }>>(LEGACY_ACCOUNTS_KEY)?.guest?.data;
  return legacy ? migrateAccountData(legacy) : null;
}

// Data an older build saved in this browser for an account with this email, so it
// moves to the server the first time that person signs in or signs up.
function legacyAccountData(email: string): AccountData | null {
  const legacy = readJson<Record<string, { data?: Record<string, unknown> }>>(LEGACY_ACCOUNTS_KEY)?.[email.trim().toLowerCase()]?.data;
  return legacy ? migrateAccountData(legacy) : null;
}

// Messages for the API's error codes (see server/index.ts).
const API_ERROR_MESSAGES: Record<string, string> = {
  bad_credentials: "Incorrect email or password.",
  use_google: "This account uses Google sign-in — use the Google button below.",
  email_taken: "An account with that email already exists.",
  rate_limited: "Too many attempts — please wait a few minutes and try again.",
  invalid_input: "Please check your details and try again.",
  google_invalid: "Google sign-in failed.",
  google_not_configured: "Google sign-in isn't set up yet.",
  network: "Can't reach Mise right now. Check your connection and try again.",
};

function apiErrorMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.code : "server";
  return API_ERROR_MESSAGES[code] ?? "Something went wrong on our side. Please try again.";
}

// ─── Migrating saved data ─────────────────────────────────────────────────────
// Older versions of the app stored a duplicate Bibimbap (id 4), full recipe objects
// inside weekly plans and free-text expiry dates. This brings whatever is in storage
// (or on the server) up to the current shape so nothing breaks after an update.
const LEGACY_RECIPE_IDS: Record<number, number> = { 4: 28 };
const RECIPES_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

function migrateRecipeId(id: number): number | null {
  const mapped = LEGACY_RECIPE_IDS[id] ?? id;
  return RECIPES_BY_ID.has(mapped) ? mapped : null;
}

function migrateIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  const out: number[] = [];
  for (const id of ids) {
    const m = typeof id === "number" ? migrateRecipeId(id) : null;
    if (m !== null && !out.includes(m)) out.push(m);
  }
  return out;
}

function migrateExpiry(expiry: unknown): string {
  if (typeof expiry !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return expiry;
  // Legacy "Sep 13" style: assume the next occurrence of that date.
  const parsed = new Date(`${expiry} ${new Date().getFullYear()}`);
  if (isNaN(parsed.getTime())) return "";
  if (parsed.getTime() < Date.now() - 180 * DAY_MS) parsed.setFullYear(parsed.getFullYear() + 1);
  return toIsoDate(parsed);
}

// Accepts anything a past build stored or synced (server data included) and returns
// the current AccountData shape, dropping fields that no longer exist.
function migrateAccountData(raw: Record<string, unknown>): AccountData {
  const base = defaultAccountData();
  const r = raw as Omit<Partial<AccountData>, "weeklyPlan"> & { weeklyPlan?: { day: string; slot: string; recipeId?: number; recipe?: { id: number } }[] };
  const kitchen = Array.isArray(r.kitchenIngredients) ? r.kitchenIngredients : base.kitchenIngredients;
  const { store, household, days, mealSlots, budget, diet, appliances } = { ...base.mealPlanConfig, ...(r.mealPlanConfig ?? {}) };
  return {
    savedIds: migrateIds(r.savedIds),
    cookedIds: migrateIds(r.cookedIds),
    kitchenIngredients: kitchen.map((i) => ({ name: i.name, qty: i.qty, category: i.category, expiry: migrateExpiry(i.expiry) })),
    kitchenEquipment: Array.isArray(r.kitchenEquipment) ? r.kitchenEquipment : base.kitchenEquipment,
    readNotificationIds: Array.isArray(r.readNotificationIds) ? r.readNotificationIds : [],
    recentSearches: Array.isArray(r.recentSearches) ? r.recentSearches : [],
    mealPlanConfig: { store, household, days, mealSlots, budget, diet, appliances },
    collections: (Array.isArray(r.collections) ? r.collections : base.collections).map((c) => ({ ...c, recipeIds: migrateIds(c.recipeIds) })),
    // Plans store recipe ids (older builds stored whole recipes) — re-attach the
    // current recipe so plans saved before an update still get today's steps and data.
    weeklyPlan: (Array.isArray(r.weeklyPlan) ? r.weeklyPlan : []).flatMap((p) => {
      const id = migrateRecipeId(p?.recipeId ?? p?.recipe?.id ?? -1);
      const recipe = id !== null ? RECIPES_BY_ID.get(id) : undefined;
      return recipe ? [{ day: p.day, slot: p.slot, recipe }] : [];
    }),
    language: r.language === "mn" ? "mn" : r.language === "en" ? "en" : base.language,
    units: r.units === "imperial" ? "imperial" : "metric",
    personalizedRecommendations: typeof r.personalizedRecommendations === "boolean" ? r.personalizedRecommendations : true,
    profileName: typeof r.profileName === "string" && r.profileName ? r.profileName : base.profileName,
  };
}

const GUEST_LANGUAGE_KEY = "mise_language_v1";

// Language chosen before signing in; defaults to Mongolian on Mongolian-language devices.
function loadGuestLanguage(): Language {
  try {
    const saved = localStorage.getItem(GUEST_LANGUAGE_KEY);
    if (saved === "en" || saved === "mn") return saved;
  } catch {
    // storage unavailable — fall back to the device language
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("mn") ? "mn" : "en";
}

function saveGuestLanguage(lang: Language) {
  try {
    localStorage.setItem(GUEST_LANGUAGE_KEY, lang);
  } catch {
    // best effort only
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
// Built from the person's real kitchen and history every render, so they're never
// stale. Read state is stored by id.
type NotificationAction = { kind: "recipe"; recipeId: number } | { kind: "kitchen" } | { kind: "cuisine"; cuisine: string };
type AppNotification = { id: string; icon: string; title: string; body: string; when: string; action: NotificationAction };

function buildNotifications(
  kitchen: KitchenIngredient[],
  savedIds: number[],
  cookedIds: number[],
  topRecommendation: Recipe | undefined,
  triedCuisines: string[],
  tr: Tr
): AppNotification[] {
  const out: AppNotification[] = [];
  const ownedNames = kitchen.map((i) => i.name);

  for (const ing of kitchen) {
    const fresh = freshnessOf(ing);
    if (fresh !== "expiring" && fresh !== "expired") continue;
    const uses = RECIPES.filter((r) => r.ingredients.some((ri) => hasIngredient(ri.name, [ing.name])));
    out.push({
      id: `expiry:${ing.name}:${ing.expiry}`,
      icon: fresh === "expired" ? "🗑️" : "⏰",
      title: fresh === "expired" ? tr("{name} has expired", { name: tr(ing.name) }) : tr("{name} is expiring soon", { name: tr(ing.name) }),
      body:
        fresh === "expired"
          ? tr("Check it before cooking, and remove it from your kitchen if it's gone off.")
          : uses.length === 1
            ? tr("Use it up — 1 recipe calls for it: {recipe}.", { recipe: tr(uses[0].name) })
            : uses.length > 1
              ? tr("Use it up — {n} recipes call for it, like {recipe}.", { n: uses.length, recipe: tr(uses[0].name) })
              : tr("Plan to use it soon so it doesn't go to waste."),
      when: expiryLabel(ing, tr),
      action: fresh === "expired" || uses.length === 0 ? { kind: "kitchen" } : { kind: "recipe", recipeId: uses[0].id },
    });
  }

  if (topRecommendation) {
    const have = topRecommendation.ingredients.filter((i) => hasIngredient(i.name, ownedNames)).length;
    out.push({
      id: `rec:${topRecommendation.id}`,
      icon: "✨",
      title: tr("Recommended: {name}", { name: tr(topRecommendation.name) }),
      body: tr("You already have {have} of {total} ingredients. Ready in {time}.", { have, total: topRecommendation.ingredients.length, time: trTime(topRecommendation.time, tr) }),
      when: tr("Today"),
      action: { kind: "recipe", recipeId: topRecommendation.id },
    });
  }

  const uncookedSaved = savedIds.map((id) => RECIPES_BY_ID.get(id)).find((r) => r && !cookedIds.includes(r.id));
  if (uncookedSaved) {
    out.push({
      id: `saved:${uncookedSaved.id}`,
      icon: "📌",
      title: tr("Saved recipe reminder"),
      body: tr("You saved {name} but haven't cooked it yet. Ready to give it a go?", { name: tr(uncookedSaved.name) }),
      when: tr("This week"),
      action: { kind: "recipe", recipeId: uncookedSaved.id },
    });
  }

  const newCuisine = CUISINES.find((c) => !triedCuisines.includes(c.name) && cuisineRecipes(c.name).length > 0);
  if (newCuisine) {
    const easy = cuisineRecipes(newCuisine.name).filter((r) => r.difficulty === "Easy").length;
    const count = cuisineRecipes(newCuisine.name).length;
    out.push({
      id: `cuisine:${newCuisine.name}`,
      icon: "🌍",
      title: tr("Explore {cuisine} cuisine", { cuisine: tr(newCuisine.name) }),
      body:
        easy > 0
          ? tr("{n} {cuisine} recipes to try, {easy} of them beginner-friendly.", { n: count, cuisine: tr(newCuisine.name), easy })
          : tr("{n} {cuisine} recipes to try.", { n: count, cuisine: tr(newCuisine.name) }),
      when: tr("New"),
      action: { kind: "cuisine", cuisine: newCuisine.name },
    });
  }

  return out;
}


// ─── Icon Components ──────────────────────────────────────────────────────────
const HomeIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round" />
    <path d="M9 21V12h6v9" strokeLinejoin="round" />
  </svg>
);
const CompassIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill={filled ? "white" : "none"} stroke="currentColor" strokeLinejoin="round" />
  </svg>
);
const CookIcon = () => (
  <svg width="26" height="26" fill="white" viewBox="0 0 24 24">
    <path d="M12 2C9.24 2 7 4.24 7 7c0 1.65.8 3.1 2.03 4H5a1 1 0 00-1 1v1a1 1 0 001 1h14a1 1 0 001-1v-1a1 1 0 00-1-1h-4.03C16.2 10.1 17 8.65 17 7c0-2.76-2.24-5-5-5zm-5 14l1 6h8l1-6H7z" />
  </svg>
);
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" strokeLinejoin="round" />
  </svg>
);
const UserIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="24" height="24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
  </svg>
);
const BellIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinejoin="round" />
    <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" />
  </svg>
);
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="14" height="14" fill={filled ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" strokeLinejoin="round" />
  </svg>
);
const ChevronRight = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
  </svg>
);

const FilterIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
  </svg>
);

// ─── Shared Components ────────────────────────────────────────────────────────

// Every food photo goes through this: a shimmering skeleton while it loads, and a
// friendly placeholder (instead of a broken-image icon) if it fails or we're offline.
function FoodImage({ src, alt, className = "", imgClassName = "" }: { src: string; alt: string; className?: string; imgClassName?: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  useEffect(() => { setState("loading"); }, [src]);
  return (
    <div className={`relative w-full h-full bg-muted overflow-hidden ${className}`}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-border" aria-hidden />}
      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground" role="img" aria-label={alt}>
          <span className="text-3xl">🍽️</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={`w-full h-full object-cover transition-opacity duration-300 ${state === "loaded" ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        />
      )}
    </div>
  );
}

function cookLevel(cooked: number, tr: Tr): string {
  const level = 1 + Math.floor(cooked / 3);
  const title = cooked === 0 ? tr("New Cook") : cooked < 5 ? tr("Home Cook") : cooked < 15 ? tr("Confident Cook") : tr("Kitchen Pro");
  return tr("{title} · Level {level}", { title, level });
}

// Small EN / МН switch for screens shown before anyone is signed in.
function LanguageToggle({ language, onChange, dark }: { language: Language; onChange: (l: Language) => void; dark?: boolean }) {
  return (
    <div className={`flex rounded-full p-0.5 text-xs font-bold ${dark ? "bg-white/15" : "bg-muted"}`} role="group" aria-label="Language / Хэл">
      {(["en", "mn"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          aria-pressed={language === l}
          className={`px-3 py-1.5 rounded-full transition-colors ${language === l ? "bg-primary text-white" : dark ? "text-white/80" : "text-muted-foreground"}`}
        >
          {l === "en" ? "EN" : "МН"}
        </button>
      ))}
    </div>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  const tr = useTr();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className={`w-full h-full flex items-center justify-center bg-primary/15 text-primary font-extrabold ${large ? "text-2xl" : "text-sm"}`} aria-label={tr("{name}'s profile", { name })}>
      {initials}
    </div>
  );
}

function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-bold text-base text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-4">{body}</p>
      {action && (
        <button onClick={action.onClick} className="bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
          {action.label}
        </button>
      )}
    </div>
  );
}

function BottomSheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-20" onClick={onClose}>
      <div role="dialog" aria-label={title} className="w-full bg-card rounded-t-3xl p-5 pb-8 max-h-[85%] overflow-y-auto animate-float-up" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-base text-foreground mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all active:scale-95 ${active ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
    >
      {label}
    </button>
  );
}

function RecipeCard({
  recipe,
  onPress,
  saved,
  onToggleSave,
  ownedIngredients,
}: {
  recipe: typeof RECIPES[0];
  onPress: () => void;
  saved: boolean;
  onToggleSave: () => void;
  ownedIngredients: string[];
}) {
  const tr = useTr();
  const match = computeMatch(recipe, ownedIngredients);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPress(); }}
      className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border text-left flex-shrink-0 w-[200px] transition-transform active:scale-95 cursor-pointer"
    >
      <div className="relative h-[130px] bg-muted overflow-hidden">
        <FoodImage src={recipe.image} alt={tr(recipe.name)} />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          aria-label={saved ? tr("Remove {name} from saved", { name: tr(recipe.name) }) : tr("Save {name}", { name: tr(recipe.name) })}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <svg width="16" height="16" fill={saved ? "white" : "none"} stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="absolute bottom-2 left-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {tr("{pct}% match", { pct: match })}
        </div>
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-foreground leading-tight mb-1 line-clamp-2">{tr(recipe.name)}</p>
        <p className="text-xs text-muted-foreground mb-2">{tr(recipe.cuisine)}</p>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex items-center gap-0.5 text-xs"><ClockIcon />{trTime(recipe.time, tr)}</span>
          <RatingBadge recipeId={recipe.id} />
        </div>
      </div>
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const tr = useTr();
  const colors: Record<string, string> = { Easy: "bg-emerald-100 text-emerald-700", Medium: "bg-amber-100 text-amber-700", Hard: "bg-red-100 text-red-700" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[level] ?? colors.Easy}`}>{tr(level)}</span>;
}

// Community rating from people who cooked it in Mise; nothing is shown until
// someone has rated it.
function RatingBadge({ recipeId, className = "" }: { recipeId: number; className?: string }) {
  const r = ratingOf(recipeId);
  if (!r) return null;
  return <span className={`flex items-center gap-0.5 text-xs ${className}`}><StarIcon filled />{r.avg.toFixed(1)}</span>;
}

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? "#22C55E" : pct >= 65 ? "#F59E0B" : "#F25C2B";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function OnboardingScreen({ onDone, language, onSetLanguage }: { onDone: () => void; language: Language; onSetLanguage: (l: Language) => void }) {
  const tr = useTr();
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1775816802938-fc4b0b095b40?w=800&h=600&fit=crop&auto=format",
      headline: "Cook something amazing.",
      sub: "Discover recipes based on what you already have.",
      accent: "#F25C2B",
    },
    {
      image: "https://images.unsplash.com/photo-1730734939738-4c7bb6d0fa75?w=800&h=600&fit=crop&auto=format",
      headline: "Tell us what you have.",
      sub: "Add your ingredients and kitchen equipment — we'll handle the rest.",
      accent: "#F25C2B",
    },
    {
      image: "https://images.unsplash.com/photo-1762224180896-5761d5bbe90f?w=800&h=600&fit=crop&auto=format",
      headline: "Follow every step.",
      sub: "Our guided cooking mode walks you through one step at a time.",
      accent: "#F25C2B",
    },
    {
      image: "https://images.unsplash.com/photo-1741295017668-c8132acd6fc0?w=800&h=600&fit=crop&auto=format",
      headline: "Explore the world through food.",
      sub: "Korean, Japanese, Italian, Mexican — discover cuisines from every corner of the globe.",
      accent: "#F25C2B",
    },
  ];
  const s = slides[slide];
  const isLast = slide === slides.length - 1;

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-foreground">
      <img key={slide} src={s.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-500" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      <div className="absolute top-11 left-6 right-6 flex items-center justify-between z-10">
        <LanguageToggle language={language} onChange={onSetLanguage} dark />
        <button onClick={onDone} className="text-white/70 text-sm font-semibold">{tr("Skip")}</button>
      </div>

      <div className="flex-1" />
      <div className="relative z-10 px-8 pb-10">
        <div className="flex gap-1.5 mb-8">
          {slides.map((_, i) => (
            <div key={i} className="h-1 rounded-full transition-all duration-300" style={{ width: i === slide ? 28 : 8, backgroundColor: i === slide ? "#F25C2B" : "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
        <h1 className="font-display text-4xl text-white leading-tight mb-3">{tr(s.headline)}</h1>
        <p className="text-white/70 text-base leading-relaxed mb-10">{tr(s.sub)}</p>
        {isLast ? (
          <button onClick={onDone} className="w-full bg-primary text-white font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform">
            {tr("Get Started →")}
          </button>
        ) : (
          <button onClick={() => setSlide(slide + 1)} className="w-full bg-white text-foreground font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform">
            {tr("Continue")}
          </button>
        )}
      </div>
    </div>
  );
}

function AuthScreen({
  onLogin,
  onSignup,
  onGuest,
  onGoogleCredential,
  googleClientId,
  googleError,
  language,
  onSetLanguage,
  initialMode,
}: {
  initialMode: "login" | "signup";
  onLogin: (email: string, password: string) => Promise<string | null>;
  onSignup: (name: string, email: string, password: string) => Promise<string | null>;
  onGuest: () => void;
  onGoogleCredential: (credential: string) => void;
  googleClientId: string | null;
  googleError: string | null;
  language: Language;
  onSetLanguage: (l: Language) => void;
}) {
  const tr = useTr();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    let attempts = 0;
    const tryRender = () => {
      if (cancelled) return;
      const g = (window as any).google;
      if (g?.accounts?.id && googleButtonRef.current) {
        g.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: { credential: string }) => onGoogleCredential(response.credential),
        });
        googleButtonRef.current.innerHTML = "";
        g.accounts.id.renderButton(googleButtonRef.current, { theme: "outline", size: "large", width: 300, text: "continue_with", locale: language });
        return;
      }
      attempts += 1;
      if (attempts < 25) setTimeout(tryRender, 200);
    };
    tryRender();
    return () => { cancelled = true; };
  }, [googleClientId, language]);

  const submit = async () => {
    if (busy) return;
    if (mode === "signup" && name.trim().length < 2) { setError("Enter your name."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address."); return; }
    if (mode === "signup" && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password.length === 0) { setError("Enter your password."); return; }
    if (mode === "signup" && password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const failure = mode === "login" ? await onLogin(email, password) : await onSignup(name, email, password);
      setError(failure ?? "");
    } catch {
      setError("Something went wrong on our side. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      <div className="relative h-[220px] bg-foreground overflow-hidden flex-shrink-0">
        <div className="absolute top-11 right-6 z-10">
          <LanguageToggle language={language} onChange={onSetLanguage} dark />
        </div>
        <img src="https://images.unsplash.com/photo-1767514579388-278d63566fd7?w=800&h=400&fit=crop&auto=format" alt="" className="w-full h-full object-cover opacity-50" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-6 left-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <CookIcon />
            </div>
            <span className="font-display text-2xl text-white">{tr("Mise")}</span>
          </div>
          <p className="text-white/60 text-sm">{tr("Your smart kitchen companion")}</p>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-10">
        <div className="flex bg-muted rounded-2xl p-1 mb-8">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
              {m === "login" ? tr("Log in") : tr("Sign up")}
            </button>
          ))}
        </div>

        <form className="space-y-3 mb-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <button type="submit" hidden aria-hidden />
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("Full name")}
              className="w-full bg-muted border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr("Email address")}
            type="email"
            autoComplete="email"
            className="w-full bg-muted border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tr("Password")}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full bg-muted border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          />
          {mode === "signup" && (
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={tr("Confirm password")}
              type="password"
              autoComplete="new-password"
              className="w-full bg-muted border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
            />
          )}
        </form>
        {error && <p role="alert" className="text-red-600 text-xs font-semibold mb-4">{tr(error)}</p>}

        <button onClick={submit} disabled={busy} className="w-full bg-primary text-white font-bold py-4 rounded-2xl mb-4 mt-4 active:scale-95 transition-transform text-base disabled:opacity-60">
          {busy ? tr("One moment…") : mode === "login" ? tr("Log in") : tr("Create account")}
        </button>

        {googleClientId && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-xs">{tr("or continue with")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex justify-center mb-2">
              <div ref={googleButtonRef} />
            </div>
          </>
        )}
        {googleError && <p className="text-red-600 text-xs font-semibold text-center mb-2">{tr(googleError)}</p>}

        <button onClick={onGuest} className="w-full text-muted-foreground text-sm py-2 active:opacity-60 transition-opacity">
          {tr("Continue as guest")}
        </button>
      </div>
    </div>
  );
}

function HomeScreen({
  onNavigate,
  onRecipe,
  ownedIngredients,
  savedIds,
  onToggleSave,
  hasUnread,
  recommendations,
  topCuisine,
  weeklyPlan,
  language,
  profileName,
  onCuisine,
  onOpenKitchen,
  onQuickRecipes,
}: {
  onNavigate: (s: Screen) => void;
  onRecipe: (r: typeof RECIPES[0]) => void;
  ownedIngredients: string[];
  savedIds: number[];
  onToggleSave: (id: number) => void;
  hasUnread: boolean;
  recommendations: typeof RECIPES;
  topCuisine: string | null;
  weeklyPlan: PlannedMeal[];
  language: Language;
  profileName: string;
  onCuisine: (cuisine: string) => void;
  onOpenKitchen: (tab: "Ingredients" | "Equipment") => void;
  onQuickRecipes: () => void;
}) {
  const tr = useTr();
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "short" });
  const todaysMeals = weeklyPlan.filter((p) => p.day === todayLabel);
  const plannedDays = Array.from(new Set(weeklyPlan.map((p) => p.day)));
  const todayIndex = DAYS_OF_WEEK.indexOf(todayLabel);
  const daysAhead = (d: string) => (DAYS_OF_WEEK.indexOf(d) - todayIndex + 7) % 7;
  const upcomingDay = [...plannedDays].sort((a, b) => daysAhead(a) - daysAhead(b))[0] ?? null;
  const displayMeals = todaysMeals.length > 0 ? todaysMeals : weeklyPlan.filter((p) => p.day === upcomingDay);
  const slotOrder = (s: string) => MEAL_SLOTS.indexOf(s);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tr("Good morning,") : hour < 18 ? tr("Good afternoon,") : tr("Good evening,");

  return (
    <div className="h-full overflow-y-auto bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{greeting}</p>
          <h1 className="font-display text-2xl text-foreground">{profileName.split(" ")[0]} 👋</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate("notifications")} aria-label={tr("Notifications")} className="relative w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
            <BellIcon />
            {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />}
          </button>
          <button onClick={() => onNavigate("profile")} aria-label={tr("Open profile")} className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary overflow-hidden">
            <Avatar name={profileName} />
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="mx-5 mb-6 rounded-3xl overflow-hidden relative h-[180px] bg-foreground">
        <img src="https://images.unsplash.com/photo-1730734939738-4c7bb6d0fa75?w=800&h=400&fit=crop&auto=format" alt={tr("Cooking")} className="absolute inset-0 w-full h-full object-cover opacity-60" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="absolute inset-0 p-5 flex flex-col justify-end">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{tr("Today's question")}</p>
          <h2 className="font-display text-2xl text-white mb-3 leading-tight">{tr("What can you cook today?")}</h2>
          <button onClick={() => onNavigate("what-can-i-cook")} className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl self-start active:scale-95 transition-transform">
            {tr("Find meals from my kitchen →")}
          </button>
        </div>
      </div>

      {/* This week's plan */}
      <div className="mx-5 mb-6">
        {weeklyPlan.length === 0 ? (
          <button
            onClick={() => onNavigate("meal-plan-setup")}
            className="w-full bg-card border-2 border-dashed border-border rounded-2xl p-4 flex items-center gap-3 text-left active:scale-95 transition-transform"
          >
            <span className="text-2xl">🗓️</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">{tr("Plan your week")}</p>
              <p className="text-xs text-muted-foreground">{tr("Set your budget, diet, and cooking days — we'll build the rest")}</p>
            </div>
            <ChevronRight />
          </button>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <span className="text-primary"><SparkleIcon /></span>
                {todaysMeals.length > 0 ? tr("Today's plan") : tr("Coming up · {day}", { day: tr(upcomingDay ?? "") })}
              </p>
              <button onClick={() => onNavigate("meal-plan-result")} className="text-primary text-xs font-semibold">{tr("View full week")}</button>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {[...displayMeals]
                .sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot))
                .map(({ slot, recipe }) => (
                  <button
                    key={slot}
                    onClick={() => onRecipe(recipe)}
                    className="w-full flex items-center gap-3 bg-muted rounded-xl p-2 text-left active:scale-95 transition-transform"
                  >
                    <div className="w-11 h-11 rounded-lg bg-border overflow-hidden flex-shrink-0">
                      <FoodImage src={recipe.image} alt={tr(recipe.name)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tr(slot)}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{tr(recipe.name)}</p>
                    </div>
                    <ChevronRight />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "What Can I Cook?", icon: "🤔", color: "#FEF3C7", onClick: () => onNavigate("what-can-i-cook") },
            { label: "Quick Recipes", icon: "⚡", color: "#DBEAFE", onClick: onQuickRecipes },
            { label: "My Ingredients", icon: "🥕", color: "#D1FAE5", onClick: () => onOpenKitchen("Ingredients") },
            { label: "My Equipment", icon: "🍳", color: "#FCE7F3", onClick: () => onOpenKitchen("Equipment") },
          ].map((a) => (
            <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: a.color }}>{a.icon}</div>
              <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{tr(a.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recommended */}
      <div className="mb-6">
        <div className="px-5 flex items-center justify-between mb-1">
          <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
            <span className="text-primary"><SparkleIcon /></span>
            {tr("Recommended for you")}
          </h3>
          <button onClick={() => onNavigate("discover")} className="text-primary text-sm font-semibold">{tr("See all")}</button>
        </div>
        <p className="px-5 text-xs text-muted-foreground mb-3">
          {topCuisine ? tr("Picked for what's in your kitchen and your taste for {cuisine} food", { cuisine: tr(topCuisine) }) : tr("Picked for what's in your kitchen")}
        </p>
        <div className="px-5 flex gap-3 overflow-x-auto">
          {recommendations.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onPress={() => onRecipe(r)}
              saved={savedIds.includes(r.id)}
              onToggleSave={() => onToggleSave(r.id)}
              ownedIngredients={ownedIngredients}
            />
          ))}
        </div>
      </div>

      {/* Explore Cuisines */}
      <div className="mb-4">
        <div className="px-5 flex items-center justify-between mb-3">
          <h3 className="font-bold text-base text-foreground">{tr("Explore cuisines")}</h3>
          <button onClick={() => onNavigate("discover")} className="text-primary text-sm font-semibold">{tr("See all")}</button>
        </div>
        <div className="px-5 flex gap-3 overflow-x-auto">
          {CUISINES.map((c) => (
            <button key={c.name} onClick={() => onCuisine(c.name)} className="flex-shrink-0 active:scale-95 transition-transform">
              <div className="w-20 h-20 rounded-2xl overflow-hidden relative bg-muted mb-1.5">
                <FoodImage src={cuisineImage(c.name)} alt={tr("{cuisine} cuisine", { cuisine: tr(c.name) })} />
                <div className="absolute inset-0 bg-black/30" />
                <span className="absolute inset-0 flex items-center justify-center text-2xl">{c.emoji}</span>
              </div>
              <p className="text-xs font-semibold text-foreground text-center">{tr(c.name)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatCanICookScreen({
  onNavigate,
  onResults,
  initialIngredients,
  initialEquipment,
  initialDiet,
  initialTime = "Any",
  initialDifficulty = "Any",
  initialStep = 1,
  onBack,
}: {
  onNavigate: (s: Screen) => void;
  onResults: (ingredients: string[], equipment: string[], time: string, difficulty: string, diet: string) => void;
  initialIngredients: string[];
  initialEquipment: string[];
  initialDiet: string;
  initialTime?: string;
  initialDifficulty?: string;
  initialStep?: number;
  onBack: () => void;
}) {
  const tr = useTr();
  const [step, setStep] = useState(initialStep);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(initialIngredients);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(initialEquipment);
  const [time, setTime] = useState(initialTime);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [diet, setDiet] = useState(initialDiet);
  const [query, setQuery] = useState("");

  const toggleIngredient = (i: string) =>
    setSelectedIngredients((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i]);
  const toggleEquipment = (e: string) =>
    setSelectedEquipment((p) => p.includes(e) ? p.filter((x) => x !== e) : [...p, e]);

  // Search matches the English name or the translated one, so "сармис" finds Garlic.
  const filtered = query
    ? INGREDIENTS_LIST.filter((i) => i.toLowerCase().includes(query.toLowerCase()) || tr(i).toLowerCase().includes(query.toLowerCase()))
    : INGREDIENTS_LIST;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => (step > 1 ? setStep(step - 1) : onBack())} aria-label={step > 1 ? tr("Previous step") : tr("Back")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{tr("Step {step} of {total}", { step, total: 3 })}</p>
          <h2 className="font-bold text-base text-foreground">
            {step === 1 ? tr("What ingredients do you have?") : step === 2 ? tr("What equipment do you have?") : tr("Any preferences?")}
          </h2>
        </div>
      </div>

      {/* Step Progress */}
      <div className="px-5 py-3 flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full transition-all" style={{ backgroundColor: s <= step ? "#F25C2B" : "#E8E0D8" }} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {step === 1 && (
          <>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr("Search ingredients…")}
                className="w-full bg-muted border border-border rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            {selectedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedIngredients.map((i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-semibold px-3 py-1.5 rounded-full">
                    {tr(i)}
                    <button onClick={() => toggleIngredient(i)} aria-label={tr("Remove {name}", { name: tr(i) })} className="opacity-60"><XIcon /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{tr("Suggestions")}</p>
            <div className="flex flex-wrap gap-2">
              {filtered.map((i) => (
                <button
                  key={i}
                  onClick={() => toggleIngredient(i)}
                  className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all active:scale-95 ${selectedIngredients.includes(i) ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {tr(i)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {EQUIPMENT_LIST.map((e) => {
              const selected = selectedEquipment.includes(e.name);
              return (
                <button
                  key={e.name}
                  onClick={() => toggleEquipment(e.name)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <span className="text-2xl">{e.icon}</span>
                  <span className={`text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{tr(e.name)}</span>
                  {selected && <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center"><CheckIcon /></div>}
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Cooking time")}</p>
              <div className="flex flex-wrap gap-2">
                {["Any", "Under 15 min", "Under 30 min", "Under 1 hour"].map((t) => (
                  <button key={t} onClick={() => setTime(t)} className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all ${time === t ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}>{tr(t)}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Difficulty")}</p>
              <div className="flex gap-2">
                {["Any", "Easy", "Medium", "Hard"].map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all ${difficulty === d ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}>{tr(d)}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Dietary preferences")}</p>
              <div className="flex flex-wrap gap-2">
                {DIET_PREFERENCES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiet(d)}
                    className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all active:scale-95 ${diet === d ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
                  >
                    {tr(d)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 py-4 border-t border-border">
        {step < 3 ? (
          <>
            {step === 1 && selectedIngredients.length === 0 && (
              <p role="status" className="text-xs font-semibold text-muted-foreground text-center mb-2">{tr("Pick at least one ingredient you have.")}</p>
            )}
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && selectedIngredients.length === 0}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-40"
            >
              {tr("Continue →")}
            </button>
          </>
        ) : (
          <button onClick={() => onResults(selectedIngredients, selectedEquipment, time, difficulty, diet)} className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform">
            {tr("Find What I Can Cook 🔍")}
          </button>
        )}
      </div>
    </div>
  );
}

function MatchingScreen({ onDone }: { onDone: () => void }) {
  const tr = useTr();
  const [phase, setPhase] = useState(0);
  const phases = ["Scanning your ingredients…", "Checking available equipment…", "Finding matching recipes…", "Almost there…"];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    phases.forEach((_, i) => {
      if (i > 0) timers.push(setTimeout(() => setPhase(i), i * 900));
    });
    timers.push(setTimeout(onDone, phases.length * 900 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = (phase / (phases.length - 1)) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background px-8">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse-slow">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-2xl">🍳</div>
        </div>
      </div>
      <h2 className="font-display text-2xl text-foreground mb-2 text-center">{tr("Checking your kitchen…")}</h2>
      <p className="text-muted-foreground text-sm mb-10 text-center">{tr(phases[phase])}</p>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center gap-6 mt-4">
        {[{ icon: "🥕", label: "Ingredients" }, { icon: "→", label: "" }, { icon: "🍳", label: "Equipment" }, { icon: "→", label: "" }, { icon: "📖", label: "Recipes" }].map((item, i) => (
          <span key={i} className={`text-sm font-semibold transition-colors ${i / 2 <= phase ? "text-primary" : "text-muted-foreground"}`}>
            {item.icon === "→" ? <span className="text-border">→</span> : <span>{item.icon} {tr(item.label)}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResultsScreen({
  onNavigate,
  onRecipe,
  recipes,
  queryIngredients,
  onEditSearch,
}: {
  onNavigate: (s: Screen) => void;
  onRecipe: (r: typeof RECIPES[0]) => void;
  recipes: typeof RECIPES;
  queryIngredients: string[];
  onEditSearch: () => void;
}) {
  const tr = useTr();
  const [sort, setSort] = useState("Best Match");
  const sorts = ["Best Match", "Fastest", "Easiest", "Popular"];
  const sorted = sortRecipes(recipes, sort, queryIngredients);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 pt-14 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onEditSearch} aria-label={tr("Change ingredients and filters")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft />
          </button>
          <div className="flex-1">
            <h2 className="font-display text-xl text-foreground">{tr("You can make these")}</h2>
            <p className="text-xs text-muted-foreground">{sorted.length === 1 ? tr("1 recipe matches your kitchen") : tr("{n} recipes match your kitchen", { n: sorted.length })}</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {sorts.map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${sort === s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{tr(s)}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-bold text-base text-foreground mb-1">{tr("No matching recipes yet")}</p>
            <p className="text-sm text-muted-foreground mb-4">{tr("Try adding another ingredient or removing an equipment filter.")}</p>
            <button onClick={onEditSearch} className="bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform">{tr("Change my ingredients")}</button>
          </div>
        )}
        {sorted.map((recipe) => {
          const match = computeMatch(recipe, queryIngredients);
          return (
            <button key={recipe.id} onClick={() => onRecipe(recipe)} className="w-full bg-card rounded-2xl overflow-hidden border border-border shadow-sm text-left active:scale-95 transition-transform">
              <div className="flex">
                <div className="w-[110px] h-[110px] bg-muted flex-shrink-0 overflow-hidden">
                  <FoodImage src={recipe.image} alt={tr(recipe.name)} />
                </div>
                <div className="flex-1 p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-bold text-sm text-foreground leading-tight flex-1 pr-2">{tr(recipe.name)}</p>
                    <div className={`flex-shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full ${match >= 85 ? "bg-emerald-100 text-emerald-700" : match >= 50 ? "bg-amber-100 text-amber-800" : "bg-orange-100 text-orange-700"}`}>
                      <span className="font-bold text-xs">{tr("{pct}% match", { pct: match })}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tr(recipe.cuisine)}</p>
                  <MatchBar pct={match} />
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><ClockIcon />{trTime(recipe.time, tr)}</span>
                    <DifficultyBadge level={recipe.difficulty} />
                  </div>
                </div>
              </div>
              {/* Ingredient breakdown */}
              <div className="px-3 pb-3">
                <div className="flex gap-1.5 flex-wrap">
                  {recipe.ingredients.slice(0, 5).map((ing) => {
                    const have = hasIngredient(ing.name, queryIngredients);
                    return (
                      <span key={ing.name} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${have ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {have ? "✓" : "+"} {tr(ing.name)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Shown right after sign-up and required before the rest of the app unlocks
// (`required`). Later, from Profile → Edit, it can be left without saving.
function MealPlanSetupScreen({
  onSkip,
  onBuild,
  initialConfig,
  required,
  onLogout,
}: {
  onSkip: () => void;
  onBuild: (config: MealPlanConfig) => void;
  initialConfig: MealPlanConfig;
  required: boolean;
  onLogout: () => void;
}) {
  const tr = useTr();
  const [step, setStep] = useState(1);
  const [store, setStore] = useState(initialConfig.store);
  const [household, setHousehold] = useState(initialConfig.household);
  const [days, setDays] = useState<string[]>(initialConfig.days);
  const [mealSlots, setMealSlots] = useState<string[]>(initialConfig.mealSlots);
  const [budget, setBudget] = useState(initialConfig.budget);
  const [diet, setDiet] = useState(initialConfig.diet);
  const [appliances, setAppliances] = useState<string[]>(initialConfig.appliances);

  const toggleDay = (d: string) => setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  const toggleMealSlot = (s: string) =>
    setMealSlots((p) =>
      (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]).sort((a, b) => MEAL_SLOTS.indexOf(a) - MEAL_SLOTS.indexOf(b))
    );
  const toggleAppliance = (a: string) => setAppliances((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const canContinueStep1 = store !== "";
  const canContinueStep2 = days.length > 0;
  const canContinueStep3 = mealSlots.length > 0;
  const canContinueStep4 = budget > 0;
  const canBuild = budget > 0 && appliances.length > 0;
  const canContinue = [canContinueStep1, canContinueStep2, canContinueStep3, canContinueStep4, canBuild][step - 1];
  // Tell people exactly what's still missing instead of just greying out the button.
  const missingHint = [
    "Pick the store you usually shop at to continue.",
    "Pick at least one day to cook.",
    "Pick at least one meal a day.",
    "Set a weekly budget above ₮0.",
    "Pick at least one kitchen appliance you own.",
  ][step - 1];

  const titles = ["Where do you shop?", "Plan your week", "How many meals a day?", "What's your budget?", "Preferences & appliances"];
  const totalSteps = titles.length;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border">
        {step === 1 && required ? (
          <div className="w-9 h-9" aria-hidden />
        ) : (
          <button
            onClick={() => (step === 1 ? onSkip() : setStep(step - 1))}
            aria-label={step === 1 ? tr("Close") : tr("Previous step")}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
          >
            <ChevronLeft />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{tr("Step {step} of {total}", { step, total: totalSteps })}</p>
          <h2 className="font-bold text-base text-foreground">{tr(titles[step - 1])}</h2>
        </div>
        {required ? (
          <button onClick={onLogout} className="text-muted-foreground text-sm font-semibold">{tr("Log out")}</button>
        ) : (
          <button onClick={onSkip} className="text-primary text-sm font-semibold">{tr("Cancel")}</button>
        )}
      </div>

      <div className="px-5 py-3 flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full transition-all" style={{ backgroundColor: s <= step ? "#F25C2B" : "#E8E0D8" }} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {step === 1 && required && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
            <p className="text-sm font-bold text-foreground mb-0.5">{tr("Let's finish setting up your account")}</p>
            <p className="text-xs text-muted-foreground">{tr("We use this to plan meals that fit your store, budget and kitchen. It takes about a minute, and you can change it any time in Profile.")}</p>
          </div>
        )}
        {step === 1 && (
          <>
            <p className="text-sm font-bold text-foreground mb-2">{tr("Grocery store")}</p>
            <div className="grid grid-cols-2 gap-3">
              {GROCERY_STORES.map((s) => {
                const selected = store === s.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setStore(s.name)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className={`text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-bold text-foreground mb-2">{tr("How many people are you cooking for?")}</p>
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setHousehold(Math.max(1, household - 1))}
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg active:scale-95 transition-transform"
              >
                −
              </button>
              <span className="font-display text-3xl text-foreground w-12 text-center">{household}</span>
              <button
                onClick={() => setHousehold(Math.min(8, household + 1))}
                className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg active:scale-95 transition-transform"
              >
                +
              </button>
              <span className="text-sm text-muted-foreground">{household === 1 ? tr("person") : tr("people")}</span>
            </div>

            <p className="text-sm font-bold text-foreground mb-2">{tr("Which days do you want to cook?")}</p>
            <p className="text-xs text-muted-foreground mb-3">{tr("Pick as many as you like — we'll plan a recipe for each meal on those days.")}</p>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`text-sm font-semibold px-4 py-2.5 rounded-full border transition-all active:scale-95 ${days.includes(d) ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {tr(d)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm font-bold text-foreground mb-2">{tr("Which meals do you cook each day?")}</p>
            <p className="text-xs text-muted-foreground mb-3">{tr("Pick every time of day you'll be cooking — we'll plan a recipe suited to each one, for every day you chose.")}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {MEAL_SLOTS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleMealSlot(s)}
                  className={`text-sm font-semibold px-4 py-2.5 rounded-full border transition-all active:scale-95 ${mealSlots.includes(s) ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {tr(s)}
                </button>
              ))}
            </div>
            <div className="bg-muted rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🍽️</span>
              <p className="text-sm text-foreground">
                {tr("{meals} meals a day × {days} days = {total} recipes this week", { meals: mealSlots.length, days: days.length, total: mealSlots.length * days.length })}
              </p>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-sm font-bold text-foreground mb-2">{tr("Weekly grocery budget")}</p>
            <p className="text-xs text-muted-foreground mb-5">{tr("We'll pick recipes and build a grocery list that aims to fit this.")}</p>
            <div className="flex items-center justify-center gap-1 mb-6">
              <span className="font-display text-3xl text-foreground">₮</span>
              <input
                value={budget.toLocaleString()}
                onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0))}
                inputMode="numeric"
                className="font-display text-4xl text-foreground w-48 text-center bg-transparent outline-none border-b-2 border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {[150000, 250000, 350000, 500000, 700000].map((b) => (
                <button
                  key={b}
                  onClick={() => setBudget(b)}
                  className={`text-sm font-semibold px-4 py-2 rounded-full border transition-all active:scale-95 ${budget === b ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
                >
                  ₮{b.toLocaleString()}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="text-sm font-bold text-foreground mb-2">{tr("Food preferences")}</p>
            <p className="text-xs text-muted-foreground mb-3">{tr("Estimated from ingredients — always double-check for allergies or strict dietary needs.")}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {DIET_PREFERENCES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDiet(d)}
                  className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all active:scale-95 ${diet === d ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {tr(d)}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-foreground mb-2">{tr("Kitchen appliances")}</p>
            <div className="grid grid-cols-2 gap-3">
              {EQUIPMENT_LIST.map((e) => {
                const selected = appliances.includes(e.name);
                return (
                  <button
                    key={e.name}
                    onClick={() => toggleAppliance(e.name)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <span className="text-2xl">{e.icon}</span>
                    <span className={`text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{tr(e.name)}</span>
                    {selected && <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center"><CheckIcon /></div>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="px-5 py-4 border-t border-border">
        {!canContinue && <p role="status" className="text-xs font-semibold text-muted-foreground text-center mb-2">{tr(missingHint)}</p>}
        {step < totalSteps ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canContinue}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-40"
          >
            {tr("Continue →")}
          </button>
        ) : (
          <button
            onClick={() => onBuild({ store, household, days, mealSlots, budget, diet, appliances })}
            disabled={!canBuild}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-40"
          >
            {tr("Build My Meal Plan 🗓️")}
          </button>
        )}
      </div>
    </div>
  );
}

function MealPlanBuildingScreen({ onDone }: { onDone: () => void }) {
  const tr = useTr();
  const [phase, setPhase] = useState(0);
  const phases = ["Checking your budget…", "Matching recipes to your week…", "Building your grocery list…", "Almost there…"];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    phases.forEach((_, i) => {
      if (i > 0) timers.push(setTimeout(() => setPhase(i), i * 900));
    });
    timers.push(setTimeout(onDone, phases.length * 900 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = (phase / (phases.length - 1)) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background px-8">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse-slow">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-2xl">🗓️</div>
        </div>
      </div>
      <h2 className="font-display text-2xl text-foreground mb-2 text-center">{tr("Planning your week…")}</h2>
      <p className="text-muted-foreground text-sm mb-10 text-center">{tr(phases[phase])}</p>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function relativeTime(ts: number, tr: Tr): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return tr("just now");
  if (mins < 60) return tr("{n} min ago", { n: mins });
  return tr("{n} h ago", { n: Math.round(mins / 60) });
}

// Explains where grocery prices come from: live Nomin prices for what Nomin sells
// online (used as the guide for every store), estimates for the rest.
function PriceSourceNote({ store, state, liveCount, total }: { store: string; state: LivePriceState; liveCount: number; total: number }) {
  const tr = useTr();
  let line: string;
  if (state.status === "loading" && liveCount === 0) line = tr("Checking today's prices at Nomin…");
  else if (state.status === "offline" && liveCount === 0) line = tr("You're offline — showing estimated prices.");
  else if (state.status === "error" && liveCount === 0) line = tr("Couldn't reach Nomin right now — showing estimated prices.");
  else if (liveCount === 0) line = tr("Showing estimated prices.");
  else
    line = tr("{live} of {total} items priced live from Nomin · updated {when}. The rest are estimates.", {
      live: liveCount,
      total,
      when: state.updatedAt ? relativeTime(state.updatedAt, tr) : tr("just now"),
    });
  return (
    <div className="mb-3">
      <p className="text-xs text-muted-foreground">{line}</p>
      {store !== "Nomin" && liveCount > 0 && (
        <p className="text-xs text-muted-foreground">{tr("{store} doesn't publish prices online, so we use Nomin's — they're usually close.", { store })}</p>
      )}
    </div>
  );
}

function MealPlanResultScreen({
  config,
  plan,
  onSwapMeal,
  onRecipe,
  onDone,
  onBack,
  onEmailPlan,
  emailStatus,
  units,
}: {
  units: Units;
  config: MealPlanConfig;
  plan: PlannedMeal[];
  onSwapMeal: (day: string, slot: string) => void;
  onRecipe: (r: typeof RECIPES[0]) => void;
  onDone: () => void;
  onBack: () => void;
  onEmailPlan: () => void;
  emailStatus: "idle" | "sending" | "sent" | "error";
}) {
  const tr = useTr();
  const baseList = buildGroceryList(plan, config.household);
  const nominKeys = baseList.map((i) => i.nominKey).filter((k): k is string => k !== null);
  const livePrices = useNominPrices(nominKeys);
  const groceryList = priceGroceryList(baseList, livePrices.prices);
  const liveCount = groceryList.filter((i) => i.live).length;
  const totalCost = groceryList.reduce((sum, item) => sum + item.cost, 0);
  const overBudget = totalCost > config.budget;
  const pricesLoading = livePrices.status === "loading" && liveCount === 0;

  const slotOrder = (s: string) => MEAL_SLOTS.indexOf(s);
  const days = Array.from(new Set(plan.map((p) => p.day)));

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto pb-10">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} aria-label={tr("Back")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-xl text-foreground">{tr("Your week is planned!")}</h2>
          <p className="text-xs text-muted-foreground">{config.store} · {config.household === 1 ? tr("1 person") : tr("{n} people", { n: config.household })}</p>
        </div>
      </div>

      <div className="px-5 pt-5">
        <h3 className="font-bold text-base text-foreground mb-3">{tr("This week's meals")}</h3>
        <div className="space-y-4 mb-6">
          {days.map((day) => (
            <div key={day}>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{tr(day)}</p>
              <div className="space-y-2">
                {plan
                  .filter((p) => p.day === day)
                  .sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot))
                  .map(({ slot, recipe }) => (
                    <div key={`${day}-${slot}`} className="bg-card rounded-2xl border border-border overflow-hidden flex">
                      <button onClick={() => onRecipe(recipe)} className="flex flex-1 text-left active:scale-95 transition-transform">
                        <div className="w-[70px] h-[70px] bg-muted flex-shrink-0 overflow-hidden">
                          <FoodImage src={recipe.image} alt={tr(recipe.name)} />
                        </div>
                        <div className="flex-1 p-2.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{tr(slot)}</p>
                          <p className="font-bold text-sm text-foreground leading-tight mb-1">{tr(recipe.name)}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><ClockIcon />{trTime(recipe.time, tr)}</span>
                            <DifficultyBadge level={recipe.difficulty} />
                          </div>
                        </div>
                      </button>
                      <button onClick={() => onSwapMeal(day, slot)} aria-label={tr("Swap {slot} on {day}", { slot: tr(slot), day: tr(day) })} className="px-3 flex flex-col items-center justify-center gap-1 text-muted-foreground active:opacity-60 transition-opacity border-l border-border">
                        <span className="text-lg">🔄</span>
                        <span className="text-[10px] font-semibold">{tr("Swap")}</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`flex items-center gap-3 rounded-2xl p-4 mb-4 border ${overBudget ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${overBudget ? "bg-amber-100" : "bg-emerald-100"}`}>
            {overBudget ? "⚠️" : "✅"}
          </div>
          <div>
            <p className={`font-bold text-sm ${overBudget ? "text-amber-800" : "text-emerald-800"}`}>
              {pricesLoading ? tr("Checking today's prices…") : tr("Estimated total: ₮{total}", { total: totalCost.toLocaleString() })}{" "}
              <span className="font-normal">{tr("of ₮{budget} budget", { budget: config.budget.toLocaleString() })}</span>
            </p>
            <p className={`text-xs ${overBudget ? "text-amber-600" : "text-emerald-600"}`}>
              {!overBudget
                ? tr("You're within budget for the week.")
                : totalCost <= config.budget * 1.15
                  ? tr("A bit over budget — try swapping a pricier day.")
                  : tr("Over budget by ₮{amount}. Try swapping pricier meals, or raise your budget in Profile.", { amount: (totalCost - config.budget).toLocaleString() })}
            </p>
          </div>
        </div>

        <h3 className="font-bold text-base text-foreground mb-1">{tr("Grocery list for {store}", { store: config.store })}</h3>
        <PriceSourceNote store={config.store} state={livePrices} liveCount={liveCount} total={groceryList.length} />
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
          {groceryList.map((item, i) => (
            <div key={item.displayName} className={`flex items-start gap-3 px-4 py-3 ${i < groceryList.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{tr(item.displayName)}</p>
                <p className="text-xs text-muted-foreground">{item.occurrences.map((o) => tr.qty(convertQty(o.qty, units))).join(" + ")}</p>
                {item.live && (
                  <a
                    href={item.live.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold max-w-full"
                  >
                    <span className="truncate">
                      {item.packs > 1 ? `${item.packs} × ` : ""}{item.live.name} · ₮{item.live.price.toLocaleString()}
                    </span>
                    <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {item.nominKey && !item.live && livePrices.status === "loading" ? (
                  <span className="inline-block w-14 h-4 rounded bg-muted animate-pulse" aria-label={tr("Checking today's prices…")} />
                ) : (
                  <span className={`text-sm font-semibold ${item.live ? "text-foreground" : "text-muted-foreground"}`}>₮{item.cost.toLocaleString()}</span>
                )}
                <p className={`text-[10px] font-bold uppercase tracking-wide ${item.live ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {item.live ? (item.live.price < item.live.regularPrice ? tr("Live · on sale") : tr("Live")) : tr("Estimate")}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onEmailPlan} disabled={emailStatus === "sending"} className="w-full bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm mb-3 disabled:opacity-50">
          {emailStatus === "sending" ? tr("Sending…") : tr("📧 Email me this plan")}
        </button>

        <button onClick={onDone} className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform text-base">
          {tr("Looks good — go to Home →")}
        </button>
      </div>
    </div>
  );
}

type DiscoverFilters = {
  cuisines: string[];
  mealTypes: string[];
  time: string;
  difficulty: string;
  maxCalories: number | null;
  diet: string;
  usesMyIngredients: boolean;
  maxMissing: number | null;
  onlyMyEquipment: boolean;
  minRating: number;
};

const EMPTY_FILTERS: DiscoverFilters = {
  cuisines: [],
  mealTypes: [],
  time: "Any",
  difficulty: "Any",
  maxCalories: null,
  diet: "None",
  usesMyIngredients: false,
  maxMissing: null,
  onlyMyEquipment: false,
  minRating: 0,
};

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack"];
const TRENDING_SEARCHES: Record<Language, string[]> = {
  en: ["chicken", "rice", "pasta", "Korean", "under 20 minutes", "buuz", "dumplings"],
  mn: ["тахиа", "будаа", "гоймон", "Солонгос", "20 минутаас бага", "бууз", "банш"],
};
// Mongolian names for every recipe, cuisine and ingredient, so searching in either
// language finds the same recipes.
const MN_TR = makeTr("mn");

function activeFilterCount(f: DiscoverFilters): number {
  return (
    (f.cuisines.length > 0 ? 1 : 0) +
    (f.mealTypes.length > 0 ? 1 : 0) +
    (f.time !== "Any" ? 1 : 0) +
    (f.difficulty !== "Any" ? 1 : 0) +
    (f.maxCalories !== null ? 1 : 0) +
    (f.diet !== "None" ? 1 : 0) +
    (f.usesMyIngredients ? 1 : 0) +
    (f.maxMissing !== null ? 1 : 0) +
    (f.onlyMyEquipment ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0)
  );
}

// Roughly ₮ per serving, from the same price hints the grocery list uses.
function costPerServing(recipe: RecipeT): number {
  const total = recipe.ingredients.reduce((sum, i) => sum + estimateIngredientPrice(i.name), 0);
  return total / Math.max(1, recipe.servings);
}

function inCategory(recipe: RecipeT, category: string): boolean {
  if (category === "All") return true;
  if (category === "Quick Meals") return recipe.tags.includes("Quick Meals") || parseMinutes(recipe.time) <= 25;
  if (category === "Budget") return costPerServing(recipe) <= 15000;
  if (category === "Healthy") return recipe.tags.includes("Healthy") || (recipe.calories <= 450 && recipe.fat <= 18);
  return recipe.tags.includes(category);
}

// Pulls a "under 20 minutes" / "20 минутаас бага" phrase out of the query so it
// becomes a time limit.
function parseSearchQuery(raw: string): { text: string; maxMinutes: number | null } {
  const m =
    raw.match(/(?:under|less than|<)\s*(\d+)\s*(?:min|minutes|m)\b/i) ??
    raw.match(/(\d+)\s*мин(?:ут(?:аас)?)?(?:\s*(?:бага|доош|дотор))?/i);
  if (!m) return { text: raw.trim().toLowerCase(), maxMinutes: null };
  return { text: raw.replace(m[0], "").trim().toLowerCase(), maxMinutes: parseInt(m[1], 10) };
}

function recipeMatchesText(recipe: RecipeT, text: string): boolean {
  if (text === "") return true;
  return text.split(/\s+/).every(
    (word) =>
      [recipe.name, recipe.cuisine, ...recipe.tags, ...recipe.ingredients.map((i) => i.name)].some(
        (en) => en.toLowerCase().includes(word) || MN_TR(en).toLowerCase().includes(word)
      )
  );
}

function DiscoverScreen({
  onRecipe,
  ownedIngredients,
  ownedEquipment,
  defaultDiet,
  recentSearches,
  onCommitSearch,
  onClearRecent,
  onCuisine,
  initialCategory,
}: {
  onRecipe: (r: RecipeT) => void;
  ownedIngredients: string[];
  ownedEquipment: string[];
  defaultDiet: string;
  recentSearches: string[];
  onCommitSearch: (q: string) => void;
  onClearRecent: () => void;
  onCuisine: (cuisine: string) => void;
  initialCategory: string;
}) {
  const tr = useTr();
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>({ ...EMPTY_FILTERS, diet: defaultDiet });
  const [draft, setDraft] = useState<DiscoverFilters>(filters);
  const [showFilters, setShowFilters] = useState(false);
  const categories = ["All", "Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Quick Meals", "Healthy", "Budget"];

  const { text, maxMinutes } = parseSearchQuery(query);

  const applyFilters = (f: DiscoverFilters, list: RecipeT[]) =>
    list.filter((r) => {
      const missing = r.ingredients.filter((i) => !hasIngredient(i.name, ownedIngredients)).length;
      return (
        (f.cuisines.length === 0 || f.cuisines.includes(r.cuisine)) &&
        (f.mealTypes.length === 0 || f.mealTypes.some((m) => r.tags.includes(m))) &&
        matchesTimeFilter(r, f.time) &&
        (f.difficulty === "Any" || r.difficulty === f.difficulty) &&
        (f.maxCalories === null || r.calories <= f.maxCalories) &&
        matchesDiet(r, f.diet) &&
        (!f.usesMyIngredients || computeMatch(r, ownedIngredients) > 0) &&
        (f.maxMissing === null || missing <= f.maxMissing) &&
        (!f.onlyMyEquipment || hasAllEquipment(r, ownedEquipment)) &&
        (f.minRating === 0 || (ratingOf(r.id)?.avg ?? 0) >= f.minRating)
      );
    });

  const filtered = applyFilters(
    filters,
    RECIPES.filter((r) => inCategory(r, activeCategory) && recipeMatchesText(r, text) && (maxMinutes === null || parseMinutes(r.time) <= maxMinutes))
  );
  const isBrowsing = query.trim() === "" && activeCategory === "All" && activeFilterCount(filters) === 0;
  const results = isBrowsing
    ? [...filtered].sort((a, b) => ratingCount(b.id) - ratingCount(a.id))
    : [...filtered].sort((a, b) => computeMatch(b, ownedIngredients) - computeMatch(a, ownedIngredients) || rankingRating(b.id) - rankingRating(a.id));
  const draftCount = applyFilters(draft, RECIPES.filter((r) => inCategory(r, activeCategory) && recipeMatchesText(r, text))).length;

  const runSearch = (q: string) => {
    setQuery(q);
    setSearchFocused(false);
    if (q.trim()) onCommitSearch(q.trim());
  };

  const ingredientSuggestions = query.trim()
    ? INGREDIENTS_LIST.filter((i) => text.length > 0 && (i.toLowerCase().includes(text) || tr(i).toLowerCase().includes(text))).slice(0, 6)
    : ownedIngredients.slice(0, 6);
  const cuisineSuggestions = query.trim()
    ? CUISINES.filter((c) => text.length > 0 && (c.name.toLowerCase().includes(text) || tr(c.name).toLowerCase().includes(text)))
    : CUISINES.slice(0, 6);

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const filterCount = activeFilterCount(filters);

  return (
    <div className="h-full flex flex-col bg-background relative">
      <div className="px-5 pt-14 pb-4 border-b border-border">
        <h1 className="font-display text-2xl text-foreground mb-4">{tr("Discover")}</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(query); }}
              placeholder={tr("Search recipes, ingredients or cuisines")}
              aria-label={tr("Search recipes")}
              className="w-full bg-muted border border-border rounded-2xl pl-11 pr-10 py-3 text-sm outline-none focus:border-primary transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={tr("Clear search")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <XIcon />
              </button>
            )}
          </div>
          <button
            onClick={() => { setDraft(filters); setShowFilters(true); }}
            aria-label={filterCount ? tr("Filters ({n} active)", { n: filterCount }) : tr("Filters")}
            className={`relative w-12 rounded-2xl border flex items-center justify-center transition-colors ${filterCount ? "bg-primary text-white border-primary" : "bg-muted border-border text-foreground"}`}
          >
            <FilterIcon />
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold flex items-center justify-center">{filterCount}</span>
            )}
          </button>
        </div>
      </div>

      {searchFocused && query.trim() === "" ? (
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tr("Recent searches")}</p>
            {recentSearches.length > 0 && <button onClick={onClearRecent} className="text-primary text-xs font-semibold">{tr("Clear")}</button>}
          </div>
          {recentSearches.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-5">{tr("Your searches will show up here.")}</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-5">
              {recentSearches.map((q) => (
                <button key={q} onClick={() => runSearch(q)} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-muted text-foreground">🕘 {q}</button>
              ))}
            </div>
          )}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tr("Trending")}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {TRENDING_SEARCHES[tr.lang].map((q) => (
              <button key={q} onClick={() => runSearch(q)} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">🔥 {q}</button>
            ))}
          </div>
          {ingredientSuggestions.length > 0 && (
            <>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tr("From your kitchen")}</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {ingredientSuggestions.map((i) => (
                  <button key={i} onClick={() => runSearch(tr(i))} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-card border border-border text-foreground">🥕 {tr(i)}</button>
                ))}
              </div>
            </>
          )}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tr("Cuisines")}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {cuisineSuggestions.map((c) => (
              <button key={c.name} onClick={() => { setSearchFocused(false); onCuisine(c.name); }} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-card border border-border text-foreground">{c.emoji} {tr(c.name)}</button>
            ))}
          </div>
          <button onClick={() => setSearchFocused(false)} className="w-full text-muted-foreground text-sm py-2">{tr("Close")}</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-border">
            {categories.map((c) => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${activeCategory === c ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{tr(c)}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
            {isBrowsing && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{tr("Cuisines")}</p>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {CUISINES.map((c) => (
                    <button key={c.name} onClick={() => onCuisine(c.name)} className="active:scale-95 transition-transform">
                      <div className="aspect-square rounded-2xl overflow-hidden relative bg-muted mb-1">
                        <FoodImage src={cuisineImage(c.name)} alt={tr("{cuisine} cuisine", { cuisine: tr(c.name) })} />
                        <div className="absolute inset-0 bg-black/25" />
                        <span className="absolute inset-0 flex items-center justify-center text-xl">{c.emoji}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-foreground text-center">{tr(c.name)}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {query.trim() !== "" && cuisineSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {cuisineSuggestions.map((c) => (
                  <button key={c.name} onClick={() => onCuisine(c.name)} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                    {c.emoji} {tr("Explore {cuisine} cuisine →", { cuisine: tr(c.name) })}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {isBrowsing ? tr("All recipes") : results.length === 1 ? tr("1 result") : tr("{n} results", { n: results.length })}
              {maxMinutes !== null && tr(" · under {n} min", { n: maxMinutes })}
            </p>
            {results.length === 0 ? (
              <EmptyState
                icon="🔍"
                title={tr("No recipes found")}
                body={filterCount > 0 ? tr("Try removing a filter or two — you might be closer than you think.") : tr("Try a different search term or category.")}
                action={filterCount > 0 ? { label: tr("Reset filters"), onClick: () => setFilters({ ...EMPTY_FILTERS }) } : query ? { label: tr("Clear search"), onClick: () => setQuery("") } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {results.map((r) => {
                  const match = computeMatch(r, ownedIngredients);
                  return (
                    <button key={r.id} onClick={() => { if (query.trim()) onCommitSearch(query.trim()); onRecipe(r); }} className="w-full bg-card rounded-2xl overflow-hidden border border-border flex active:scale-95 transition-transform text-left">
                      <div className="w-[90px] h-[90px] bg-muted flex-shrink-0 overflow-hidden">
                        <FoodImage src={r.image} alt={tr(r.name)} />
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                        <p className="font-bold text-sm text-foreground mb-0.5 truncate">{tr(r.name)}</p>
                        <p className="text-xs text-muted-foreground mb-1.5">{tr(r.cuisine)}{match > 0 ? tr(" · you have {pct}%", { pct: match }) : ""}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5"><ClockIcon />{trTime(r.time, tr)}</span>
                          <DifficultyBadge level={r.difficulty} />
                          <RatingBadge recipeId={r.id} className="ml-auto" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showFilters && (
        <BottomSheet title={tr("Filters")} onClose={() => setShowFilters(false)}>
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Cuisine")}</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(RECIPES.map((r) => r.cuisine))).sort().map((c) => (
                  <Chip key={c} label={tr(c)} active={draft.cuisines.includes(c)} onClick={() => setDraft({ ...draft, cuisines: toggleIn(draft.cuisines, c) })} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Meal type")}</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((m) => <Chip key={m} label={tr(m)} active={draft.mealTypes.includes(m)} onClick={() => setDraft({ ...draft, mealTypes: toggleIn(draft.mealTypes, m) })} />)}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Cooking time")}</p>
              <div className="flex flex-wrap gap-2">
                {["Any", "Under 15 min", "Under 30 min", "Under 1 hour"].map((v) => <Chip key={v} label={tr(v)} active={draft.time === v} onClick={() => setDraft({ ...draft, time: v })} />)}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Difficulty")}</p>
              <div className="flex flex-wrap gap-2">
                {["Any", "Easy", "Medium", "Hard"].map((v) => <Chip key={v} label={tr(v)} active={draft.difficulty === v} onClick={() => setDraft({ ...draft, difficulty: v })} />)}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Calories per serving")}</p>
              <div className="flex flex-wrap gap-2">
                {[null, 300, 500, 700].map((v) => (
                  <Chip key={String(v)} label={v === null ? tr("Any") : tr("Under {n} kcal", { n: v })} active={draft.maxCalories === v} onClick={() => setDraft({ ...draft, maxCalories: v })} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Ingredients")}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <Chip label={tr("Uses what I have")} active={draft.usesMyIngredients} onClick={() => setDraft({ ...draft, usesMyIngredients: !draft.usesMyIngredients })} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{tr("Missing ingredients")}</p>
              <div className="flex flex-wrap gap-2">
                {[null, 0, 1, 3].map((v) => (
                  <Chip key={String(v)} label={v === null ? tr("Any") : v === 0 ? tr("None missing") : tr("{n} or fewer", { n: v })} active={draft.maxMissing === v} onClick={() => setDraft({ ...draft, maxMissing: v })} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Equipment")}</p>
              <Chip label={tr("Only what I own")} active={draft.onlyMyEquipment} onClick={() => setDraft({ ...draft, onlyMyEquipment: !draft.onlyMyEquipment })} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">{tr("Dietary preferences")}</p>
              <p className="text-xs text-muted-foreground mb-2">{tr("Estimated from ingredients — always double-check for allergies.")}</p>
              <div className="flex flex-wrap gap-2">
                {DIET_PREFERENCES.map((d) => <Chip key={d} label={tr(d)} active={draft.diet === d} onClick={() => setDraft({ ...draft, diet: d })} />)}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-2">{tr("Rating")}</p>
              <div className="flex flex-wrap gap-2">
                {[0, 4, 4.5].map((v) => <Chip key={v} label={v === 0 ? tr("Any") : tr("{n}★ & up", { n: v })} active={draft.minRating === v} onClick={() => setDraft({ ...draft, minRating: v })} />)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => setDraft({ ...EMPTY_FILTERS })} className="bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">{tr("Reset")}</button>
            <button
              onClick={() => { setFilters(draft); setShowFilters(false); }}
              className="bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm"
            >
              {draftCount === 1 ? tr("Show 1 result") : tr("Show {n} results", { n: draftCount })}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function CuisineScreen({
  cuisine,
  onBack,
  onRecipe,
  ownedIngredients,
  savedIds,
  onToggleSave,
}: {
  cuisine: string;
  onBack: () => void;
  onRecipe: (r: RecipeT) => void;
  ownedIngredients: string[];
  savedIds: number[];
  onToggleSave: (id: number) => void;
}) {
  const tr = useTr();
  const info = CUISINES.find((c) => c.name === cuisine);
  const recipes = cuisineRecipes(cuisine);
  const popular = [...recipes].sort((a, b) => ratingCount(b.id) - ratingCount(a.id) || rankingRating(b.id) - rankingRating(a.id));
  const quick = recipes.filter((r) => parseMinutes(r.time) <= 30);
  const beginner = recipes.filter((r) => r.difficulty === "Easy");

  const ingredientCounts = new Map<string, number>();
  recipes.forEach((r) => r.ingredients.forEach((i) => ingredientCounts.set(i.name, (ingredientCounts.get(i.name) ?? 0) + 1)));
  const popularIngredients = [...ingredientCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name);

  const renderRow = (title: string, list: RecipeT[]) =>
    list.length === 0 ? null : (
      <div className="mb-6">
        <h3 className="px-5 font-bold text-base text-foreground mb-3">{title}</h3>
        <div className="px-5 flex gap-3 overflow-x-auto">
          {list.map((r) => (
            <RecipeCard key={r.id} recipe={r} onPress={() => onRecipe(r)} saved={savedIds.includes(r.id)} onToggleSave={() => onToggleSave(r.id)} ownedIngredients={ownedIngredients} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="h-full overflow-y-auto bg-background pb-10">
      <div className="relative h-[260px] bg-foreground flex-shrink-0">
        <FoodImage src={cuisineImage(cuisine)} alt={tr("{cuisine} cuisine", { cuisine: tr(cuisine) })} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <button onClick={onBack} aria-label={tr("Back")} className="absolute top-12 left-5 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white">
          <ChevronLeft />
        </button>
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">{info?.emoji} {recipes.length === 1 ? tr("1 recipe") : tr("{n} recipes", { n: recipes.length })}</p>
          <h1 className="font-display text-3xl text-white leading-tight mb-1">{tr("{cuisine} Cuisine", { cuisine: tr(cuisine) })}</h1>
          {info?.blurb && <p className="text-white/80 text-sm leading-snug">{tr(info.blurb)}</p>}
        </div>
      </div>

      {recipes.length === 0 ? (
        <EmptyState icon="🌍" title={tr("No recipes yet")} body={tr("We're still adding {cuisine} recipes. Check back soon!", { cuisine: tr(cuisine) })} action={{ label: tr("Go back"), onClick: onBack }} />
      ) : (
        <div className="pt-5">
          {renderRow(tr("All {cuisine} recipes", { cuisine: tr(cuisine) }), popular)}
          {renderRow(tr("Quick {cuisine} meals", { cuisine: tr(cuisine) }), quick)}
          {renderRow(tr("Beginner friendly"), beginner)}
          <div className="px-5 mb-6">
            <h3 className="font-bold text-base text-foreground mb-1">{tr("Popular ingredients")}</h3>
            <p className="text-xs text-muted-foreground mb-3">{tr("✓ means it's already in your kitchen")}</p>
            <div className="flex flex-wrap gap-2">
              {popularIngredients.map((name) => {
                const have = hasIngredient(name, ownedIngredients);
                return (
                  <span key={name} className={`text-sm font-semibold px-3 py-1.5 rounded-full ${have ? "bg-emerald-100 text-emerald-700" : "bg-muted text-foreground"}`}>
                    {have ? "✓ " : ""}{tr(name)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function SavedScreen({
  onRecipe,
  savedIds,
  cookedIds,
  collections,
  onCreateCollection,
  onToggleSave,
  onToggleCollection,
}: {
  onRecipe: (r: typeof RECIPES[0]) => void;
  savedIds: number[];
  cookedIds: number[];
  collections: Collection[];
  onCreateCollection: (name: string) => void;
  onToggleSave: (id: number) => void;
  onToggleCollection: (collectionName: string, recipeId: number) => void;
}) {
  const tr = useTr();
  const [tab, setTab] = useState("All");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const tabs = ["All", "Favorites", "Recently Saved", "Cooked"];
  const trimmedName = newCollectionName.trim();
  const duplicateName = collections.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase());

  const activeCollectionIds = activeCollection ? collections.find((c) => c.name === activeCollection)?.recipeIds ?? [] : [];
  const savedRecipes = RECIPES.filter((r) => savedIds.includes(r.id));
  let visible: typeof RECIPES;
  if (activeCollection) {
    visible = RECIPES.filter((r) => activeCollectionIds.includes(r.id));
  } else if (tab === "Favorites") {
    visible = [...savedRecipes].sort((a, b) => rankingRating(b.id) - rankingRating(a.id));
  } else if (tab === "Recently Saved") {
    visible = [...savedIds].reverse().map((id) => RECIPES.find((r) => r.id === id)).filter((r): r is typeof RECIPES[0] => !!r);
  } else if (tab === "Cooked") {
    visible = RECIPES.filter((r) => cookedIds.includes(r.id));
  } else {
    visible = savedRecipes;
  }

  return (
    <div className="h-full flex flex-col bg-background relative">
      <div className="px-5 pt-14 pb-4 border-b border-border">
        <h1 className="font-display text-2xl text-foreground mb-4">{tr("Saved")}</h1>
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => { setTab(t); setActiveCollection(null); }} className={`text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${tab === t && !activeCollection ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{tr(t)}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        {/* Collections */}
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{tr("Collections")}</p>
        <div className="flex gap-3 overflow-x-auto mb-6">
          {collections.map((col) => (
            <button
              key={col.name}
              onClick={() => setActiveCollection(activeCollection === col.name ? null : col.name)}
              className={`flex-shrink-0 border rounded-2xl p-4 w-[140px] text-left active:scale-95 transition-transform ${activeCollection === col.name ? "border-primary bg-primary/5" : "bg-card border-border"}`}
            >
              <div className="w-10 h-10 rounded-xl mb-2 flex items-center justify-center text-xl" style={{ backgroundColor: col.color + "20" }}>
                <span>{col.icon}</span>
              </div>
              <p className="font-bold text-sm text-foreground">{tr(col.name)}</p>
              <p className="text-xs text-muted-foreground">{col.recipeIds.length === 1 ? tr("1 recipe") : tr("{n} recipes", { n: col.recipeIds.length })}</p>
            </button>
          ))}
          <button
            onClick={() => setShowNewCollection(true)}
            className="flex-shrink-0 bg-muted border-2 border-dashed border-border rounded-2xl p-4 w-[140px] flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <PlusIcon />
            <span className="text-xs font-semibold text-muted-foreground">{tr("New collection")}</span>
          </button>
        </div>

        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          {activeCollection ? tr(activeCollection) : tab === "All" ? tr("All saved") : tr(tab)}
        </p>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <p className="text-4xl mb-3">📖</p>
            <p className="font-bold text-base text-foreground mb-1">{tr("Nothing here yet")}</p>
            <p className="text-sm text-muted-foreground">
              {activeCollection
                ? tr("Open any recipe and tap \"Add to collection\" to put it here.")
                : tab === "Cooked"
                  ? tr("Finish cooking a recipe to see it here.")
                  : tr("Save recipes you love by tapping the bookmark icon on any recipe.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((r) => {
              const removable = activeCollection !== null || tab !== "Cooked";
              const removeLabel = activeCollection
                ? tr("Remove {name} from {collection}", { name: tr(r.name), collection: tr(activeCollection) })
                : tr("Remove {name} from saved", { name: tr(r.name) });
              return (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onRecipe(r)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRecipe(r); }}
                  className="relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm text-left active:scale-95 transition-transform cursor-pointer"
                >
                  <div className="h-[110px] bg-muted overflow-hidden">
                    <FoodImage src={r.image} alt={tr(r.name)} />
                  </div>
                  {removable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeCollection) onToggleCollection(activeCollection, r.id);
                        else onToggleSave(r.id);
                      }}
                      aria-label={removeLabel}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center"
                    >
                      <XIcon />
                    </button>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-xs text-foreground leading-tight mb-1 line-clamp-2">{tr(r.name)}</p>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ClockIcon /><span className="text-xs">{trTime(r.time, tr)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewCollection && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-20" onClick={() => setShowNewCollection(false)}>
          <div className="w-full bg-card rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-base text-foreground mb-4">{tr("New collection")}</h3>
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder={tr("Collection name")}
              className="w-full bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors mb-2"
            />
            <p className={`text-xs font-semibold mb-3 ${duplicateName ? "text-red-600" : "text-transparent"}`} role="alert">
              {tr("You already have a collection with that name.")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowNewCollection(false)} className="bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">{tr("Cancel")}</button>
              <button
                onClick={() => {
                  if (trimmedName && !duplicateName) {
                    onCreateCollection(trimmedName);
                    setNewCollectionName("");
                    setShowNewCollection(false);
                  }
                }}
                disabled={!trimmedName || duplicateName}
                className="bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm disabled:opacity-40"
              >
                {tr("Create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileScreen({
  onNavigate,
  stats,
  cuisines,
  mealPlan,
  diet,
  onSetDiet,
  language,
  onSetLanguage,
  units,
  onSetUnits,
  personalizedRecommendations,
  onSetPersonalizedRecommendations,
  profileName,
  accountEmail,
  isGuest,
  onSetProfileName,
  onCreateAccount,
  onLogout,
}: {
  onNavigate: (s: Screen) => void;
  stats: { cooked: number; saved: number; cuisines: number };
  cuisines: string[];
  mealPlan: MealPlanConfig;
  diet: string;
  onSetDiet: (d: string) => void;
  language: Language;
  onSetLanguage: (l: Language) => void;
  units: Units;
  onSetUnits: (u: Units) => void;
  personalizedRecommendations: boolean;
  onSetPersonalizedRecommendations: (v: boolean) => void;
  profileName: string;
  accountEmail: string;
  isGuest: boolean;
  onSetProfileName: (name: string) => void;
  onCreateAccount: () => void;
  onLogout: () => void;
}) {
  const tr = useTr();
  const [activeSheet, setActiveSheet] = useState<"diet" | "language" | "units" | "privacy" | "account" | null>(null);
  const [nameDraft, setNameDraft] = useState(profileName);

  const settings = [
    { label: "My Kitchen", icon: "🍳", action: () => onNavigate("my-kitchen") },
    { label: "Notifications", icon: "🔔", action: () => onNavigate("notifications") },
    { label: "Dietary preferences", icon: "🌿", action: () => setActiveSheet("diet") },
    { label: "Language", icon: "🌐", action: () => setActiveSheet("language") },
    { label: "Units (metric/imperial)", icon: "📏", action: () => setActiveSheet("units") },
    { label: "Privacy", icon: "🔒", action: () => setActiveSheet("privacy") },
    { label: "Account", icon: "👤", action: () => { setNameDraft(profileName); setActiveSheet("account"); } },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto pb-24 relative">
      {/* Profile hero */}
      <div className="px-5 pt-14 pb-6 text-center border-b border-border">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-white shadow-lg mx-auto mb-3 overflow-hidden">
          <Avatar name={profileName} large />
        </div>
        <h2 className="font-display text-xl text-foreground mb-0.5">{profileName}</h2>
        <p className="text-sm text-muted-foreground mb-3">{isGuest ? tr("Guest — saved on this device only") : accountEmail}</p>
        <div className="flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mx-auto w-fit">
          <span>🍳</span>
          <span className="text-sm font-semibold text-amber-700">{cookLevel(stats.cooked, tr)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-border px-5 py-4 border-b border-border">
        {[
          { label: tr("Recipes cooked"), val: stats.cooked.toString() },
          { label: tr("Saved recipes"), val: stats.saved.toString() },
          { label: tr("Cuisines tried"), val: stats.cuisines.toString() },
        ].map((s) => (
          <div key={s.label} className="text-center px-2">
            <p className="font-display text-2xl text-foreground">{s.val}</p>
            <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Meal plan setup summary — what was collected during registration */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-foreground">{tr("Your meal plan setup")}</p>
          <button onClick={() => onNavigate("meal-plan-setup")} className="text-primary text-xs font-semibold">{tr("Edit")}</button>
        </div>
        {mealPlan.store === "" ? (
          <p className="text-sm text-muted-foreground">{tr("You haven't set up a weekly meal plan yet.")}</p>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">🏬</span>
              <span className="text-foreground">{mealPlan.store}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">👥</span>
              <span className="text-foreground">{mealPlan.household === 1 ? tr("1 person") : tr("{n} people", { n: mealPlan.household })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">📅</span>
              <span className="text-foreground">{tr("Cooking {days}", { days: mealPlan.days.map((d) => tr(d)).join(", ") })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">🍽️</span>
              <span className="text-foreground">{mealPlan.mealSlots.map((m) => tr(m)).join(", ") || tr("No meals selected")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">₮</span>
              <span className="text-foreground">{tr("₮{budget} weekly budget", { budget: mealPlan.budget.toLocaleString() })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-center">🌿</span>
              <span className="text-foreground">{mealPlan.diet === "None" ? tr("No dietary restrictions") : tr(mealPlan.diet)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Favorite cuisines */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-bold text-foreground mb-3">{tr("Favourite cuisines")}</p>
        {cuisines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr("Save or cook recipes to build your cuisine profile.")}</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {cuisines.map((c) => (
              <span key={c} className="text-sm font-semibold px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full">{tr(c)}</span>
            ))}
          </div>
        )}
      </div>

      {/* Settings list */}
      <div className="px-5 py-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{tr("Settings")}</p>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {settings.map((s, i) => (
            <button
              key={s.label}
              onClick={s.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted transition-colors ${i < settings.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="text-lg">{s.icon}</span>
              <span className="flex-1 text-sm font-semibold text-foreground">{tr(s.label)}</span>
              <ChevronRight />
            </button>
          ))}
        </div>
      </div>

      {/* Settings bottom sheets */}
      {activeSheet && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-20" onClick={() => setActiveSheet(null)}>
          <div className="w-full bg-card rounded-t-3xl p-5 pb-8 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

            {activeSheet === "diet" && (
              <>
                <h3 className="font-bold text-base text-foreground mb-1">{tr("Dietary preferences")}</h3>
                <p className="text-xs text-muted-foreground mb-4">{tr("This drives recipe matching everywhere in the app, including your weekly plan.")}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DIET_PREFERENCES.map((d) => (
                    <button
                      key={d}
                      onClick={() => onSetDiet(d)}
                      className={`text-sm font-semibold px-3 py-2 rounded-full border transition-all active:scale-95 ${diet === d ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border"}`}
                    >
                      {tr(d)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSheet === "language" && (
              <>
                <h3 className="font-bold text-base text-foreground mb-1">{tr("Language")}</h3>
                <p className="text-xs text-muted-foreground mb-4">{tr("Choose the language for the whole app, including recipes and cooking steps.")}</p>
                <div className="flex gap-2">
                  {(["en", "mn"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => onSetLanguage(l)}
                      className={`flex-1 text-sm font-semibold px-3 py-3 rounded-2xl border transition-all active:scale-95 ${language === l ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border"}`}
                    >
                      {l === "en" ? tr("English") : "Монгол"}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSheet === "units" && (
              <>
                <h3 className="font-bold text-base text-foreground mb-1">{tr("Units")}</h3>
                <p className="text-xs text-muted-foreground mb-4">{tr("Changes how ingredient amounts are shown in recipes, cooking mode and your grocery list.")}</p>
                <div className="flex gap-2">
                  {(["metric", "imperial"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => onSetUnits(u)}
                      className={`flex-1 text-sm font-semibold px-3 py-3 rounded-2xl border transition-all active:scale-95 ${units === u ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border"}`}
                    >
                      {u === "metric" ? tr("Metric (g, ml)") : tr("Imperial (lb, oz, cups)")}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSheet === "privacy" && (
              <>
                <h3 className="font-bold text-base text-foreground mb-1">{tr("Privacy")}</h3>
                <p className="text-xs text-muted-foreground mb-4">{tr("Control whether your kitchen contents and cooking history are used to personalize recommendations.")}</p>
                <button
                  onClick={() => onSetPersonalizedRecommendations(!personalizedRecommendations)}
                  className="w-full flex items-center gap-3 bg-muted rounded-2xl p-4 active:scale-95 transition-transform"
                >
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-foreground">{tr("Personalized recommendations")}</p>
                    <p className="text-xs text-muted-foreground">{tr("Uses your kitchen and history to pick \"Recommended for you\"")}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${personalizedRecommendations ? "bg-primary justify-end" : "bg-border justify-start"}`}>
                    <div className="w-5 h-5 rounded-full bg-white shadow" />
                  </div>
                </button>
              </>
            )}

            {activeSheet === "account" && (
              <>
                <h3 className="font-bold text-base text-foreground mb-4">{tr("Account")}</h3>
                <div className="space-y-3 mb-4">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder={tr("Full name")}
                    className="w-full bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                  />
                  {isGuest ? (
                    <p className="text-xs text-muted-foreground">{tr("You're using Mise as a guest, so everything is saved on this device only. Create an account to keep it safe and use it on any device.")}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{tr("Signed in as {email}. Meal plans are emailed to this address.", { email: accountEmail })}</p>
                  )}
                </div>
                {isGuest && (
                  <button onClick={onCreateAccount} className="w-full bg-foreground text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm mb-3">
                    {tr("Create an account")}
                  </button>
                )}
                <button
                  onClick={() => { onSetProfileName(nameDraft.trim() || profileName); setActiveSheet(null); }}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm mb-3"
                >
                  {tr("Save changes")}
                </button>
                <button
                  onClick={onLogout}
                  className="w-full bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm"
                >
                  {tr("Log out")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeDetailScreen({
  recipe,
  onBack,
  onCook,
  ownedIngredients,
  saved,
  onToggleSave,
  units,
  collections,
  onToggleCollection,
  substitutions,
  onSetSubstitution,
  onAddToKitchen,
  ownedEquipment,
}: {
  recipe: typeof RECIPES[0];
  onBack: () => void;
  onCook: () => void;
  ownedIngredients: string[];
  saved: boolean;
  onToggleSave: () => void;
  units: Units;
  collections: Collection[];
  onToggleCollection: (collectionName: string, recipeId: number) => void;
  substitutions: Record<string, string>;
  onSetSubstitution: (ingredientName: string, substitute: string | null) => void;
  onAddToKitchen: (ingredientName: string) => void;
  ownedEquipment: string[];
}) {
  const tr = useTr();
  const [showCollections, setShowCollections] = useState(false);
  const [showSubstitutes, setShowSubstitutes] = useState(false);
  // An ingredient you swapped for something you have counts as covered.
  const isCovered = (name: string) => hasIngredient(name, ownedIngredients) || Boolean(substitutions[name]);
  const haveCount = recipe.ingredients.filter((i) => isCovered(i.name)).length;
  const totalCount = recipe.ingredients.length;
  const match = computeMatch(recipe, ownedIngredients);
  const missing = recipe.ingredients.filter((i) => !hasIngredient(i.name, ownedIngredients));
  const uncovered = missing.filter((i) => !substitutions[i.name]);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto relative">
      {/* Hero image */}
      <div className="relative h-[280px] bg-muted flex-shrink-0">
        <FoodImage src={recipe.image} alt={tr(recipe.name)} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={onBack} aria-label={tr("Back")} className="absolute top-12 left-5 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button onClick={onToggleSave} aria-label={saved ? tr("Remove {name} from saved", { name: tr(recipe.name) }) : tr("Save {name}", { name: tr(recipe.name) })} className="absolute top-12 right-5 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <svg width="20" height="20" fill={saved ? "white" : "none"} stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{tr("{pct}% match", { pct: match })}</span>
            <span className="bg-white/20 backdrop-blur text-white text-xs font-semibold px-2 py-0.5 rounded-full">{tr(recipe.cuisine)}</span>
          </div>
          <h1 className="font-display text-2xl text-white leading-tight">{tr(recipe.name)}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-5 pb-6">
        <button
          onClick={() => setShowCollections(true)}
          className="flex items-center gap-1.5 text-primary text-sm font-semibold mb-4 active:opacity-60 transition-opacity"
        >
          <PlusIcon />
          {tr("Add to collection")}
        </button>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: "⏱", label: "Prep", val: trTime(recipe.prepTime, tr) },
            { icon: "🔥", label: "Cook time", val: trTime(recipe.cookTime, tr) },
            { icon: "👥", label: "Serves", val: recipe.servings.toString() },
            { icon: "📊", label: "Level", val: tr(recipe.difficulty) },
          ].map((s) => (
            <div key={s.label} className="bg-muted rounded-2xl p-3 text-center">
              <p className="text-base mb-1">{s.icon}</p>
              <p className="font-bold text-xs text-foreground">{s.val}</p>
              <p className="text-[10px] text-muted-foreground">{tr(s.label)}</p>
            </div>
          ))}
        </div>

        {/* Rating — from people who cooked it in Mise */}
        {(() => {
          const r = ratingOf(recipe.id);
          return r ? (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} filled={i <= Math.round(r.avg)} />)}
              </div>
              <span className="font-bold text-sm">{r.avg.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">{r.count === 1 ? tr("(1 rating)") : tr("({n} ratings)", { n: r.count })}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">{tr("No ratings yet — cook it and be the first to rate it.")}</p>
          );
        })()}

        {/* Description */}
        <p className="text-sm text-secondary-foreground leading-relaxed mb-5">{tr(recipe.description)}</p>

        {/* Ingredient availability banner */}
        {(() => {
          const allSet = uncovered.length === 0;
          return (
            <div className={`rounded-2xl p-4 mb-5 border ${allSet ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${allSet ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {allSet ? "✅" : "🛒"}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${allSet ? "text-emerald-800" : "text-amber-800"}`}>{tr("You have {have}/{total} ingredients", { have: haveCount, total: totalCount })}</p>
                  <p className={`text-xs ${allSet ? "text-emerald-600" : "text-amber-700"}`}>
                    {allSet
                      ? missing.length > 0 ? tr("All set, with your substitutes.") : tr("You're all set to cook this!")
                      : uncovered.length === 1 ? tr("You're missing 1 ingredient") : tr("You're missing {n} ingredients", { n: uncovered.length })}
                  </p>
                </div>
              </div>
              {missing.length > 0 && (
                <button
                  onClick={() => setShowSubstitutes(true)}
                  className="mt-3 w-full bg-white border border-amber-200 text-amber-800 text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                >
                  {uncovered.length > 0 ? tr("See substitutes →") : tr("Review substitutes →")}
                </button>
              )}
            </div>
          );
        })()}

        {/* Ingredients */}
        <h3 className="font-bold text-base text-foreground mb-3">{tr("Ingredients")}</h3>
        <div className="space-y-2 mb-5">
          {recipe.ingredients.map((ing) => {
            const have = hasIngredient(ing.name, ownedIngredients);
            const sub = substitutions[ing.name];
            const state = have ? "have" : sub ? "sub" : "missing";
            return (
              <div key={ing.name} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${state === "have" ? "bg-emerald-100" : state === "sub" ? "bg-blue-100" : "bg-red-100"}`}
                  aria-label={state === "have" ? tr("In your kitchen") : state === "sub" ? tr("Using a substitute") : tr("Missing")}
                >
                  {state === "have" ? (
                    <svg width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : state === "sub" ? (
                    <span className="text-[11px] font-bold text-blue-700">⇄</span>
                  ) : (
                    <svg width="12" height="12" fill="none" stroke="#EF4444" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${state === "sub" ? "text-muted-foreground line-through" : "text-foreground"}`}>{tr(ing.name)}</p>
                  {state === "sub" && <p className="text-xs font-semibold text-blue-700">{tr("Using {name}", { name: tr(sub) })}</p>}
                  {state === "missing" && <p className="text-xs text-red-600">{tr("Missing")}</p>}
                </div>
                <span className="text-sm text-muted-foreground text-right">{tr.qty(convertQty(ing.qty, units))}</span>
              </div>
            );
          })}
        </div>

        {/* Equipment */}
        <h3 className="font-bold text-base text-foreground mb-3">{tr("Equipment needed")}</h3>
        {recipe.equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-5">{tr("No special equipment — just a bowl and a knife.")}</p>
        ) : (
          <div className="flex gap-2 flex-wrap mb-5">
            {recipe.equipment.map((e) => {
              const eq = EQUIPMENT_LIST.find((q) => q.name === e);
              const owned = ownedEquipment.includes(e);
              return (
                <span key={e} className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${owned ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                  <span>{eq?.icon}</span>{tr(e)}<span className="text-xs">{owned ? "✓" : tr("· not owned")}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Nutrition */}
        <h3 className="font-bold text-base text-foreground mb-3">{tr("Nutrition per serving")}</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Calories", val: recipe.calories.toString(), unit: "kcal" },
            { label: "Protein", val: `${recipe.protein}g`, unit: "" },
            { label: "Carbs", val: `${recipe.carbs}g`, unit: "" },
            { label: "Fat", val: `${recipe.fat}g`, unit: "" },
          ].map((n) => (
            <div key={n.label} className="bg-muted rounded-2xl p-3 text-center">
              <p className="font-display text-lg text-foreground">{n.val}</p>
              <p className="text-[10px] text-muted-foreground">{tr(n.label)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Start cooking CTA */}
      <div className="sticky bottom-0 mt-auto w-full px-5 py-4 bg-background/90 backdrop-blur-sm border-t border-border">
        <button onClick={onCook} className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform text-base flex items-center justify-center gap-2">
          <span>{tr("Start Cooking")}</span>
          <span>→</span>
        </button>
      </div>

      {showSubstitutes && (
        <BottomSheet
          title={uncovered.length === 0 ? tr("Your substitutes") : uncovered.length === 1 ? tr("You're missing 1 ingredient") : tr("You're missing {n} ingredients", { n: uncovered.length })}
          onClose={() => setShowSubstitutes(false)}
        >
          <div className="space-y-4">
            {missing.map((ing) => {
              const options = substitutesFor(ing.name);
              const chosen = substitutions[ing.name];
              return (
                <div key={ing.name} className="bg-muted rounded-2xl p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-bold text-sm text-foreground">{tr(ing.name)}</p>
                    <p className="text-xs text-muted-foreground">{tr.qty(convertQty(ing.qty, units))}</p>
                  </div>
                  {options.length === 0 ? (
                    <p className="text-xs text-muted-foreground mb-2">{tr("No good everyday swap for this one — it's worth picking up.")}</p>
                  ) : (
                    <div className="space-y-2 mb-2">
                      {options.map((o) => {
                        const active = chosen === o.name;
                        const youHaveIt = hasIngredient(o.name, ownedIngredients);
                        return (
                          <button
                            key={o.name}
                            onClick={() => onSetSubstitution(ing.name, active ? null : o.name)}
                            aria-pressed={active}
                            className={`w-full text-left rounded-xl p-3 border-2 transition-all active:scale-95 ${active ? "border-primary bg-primary/5" : "border-transparent bg-card"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">→</span>
                              <span className="flex-1 text-sm font-bold text-foreground">{tr(o.name)}</span>
                              {youHaveIt && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{tr("In your kitchen")}</span>}
                              {active && <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center"><CheckIcon /></span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 pl-5">{tr(o.ratio)}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => onAddToKitchen(ing.name)} className="text-primary text-xs font-semibold">
                    {tr("I actually have this — add to My Kitchen")}
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={() => setShowSubstitutes(false)} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm mt-5">
            {Object.keys(substitutions).length > 0 ? tr("Use Substitutes") : tr("Done")}
          </button>
        </BottomSheet>
      )}

      {showCollections && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-20" onClick={() => setShowCollections(false)}>
          <div className="w-full bg-card rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-base text-foreground mb-4">{tr("Add to collection")}</h3>
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">{tr("No collections yet — create one from the Saved tab.")}</p>
            ) : (
              <div className="space-y-2 mb-2">
                {collections.map((c) => {
                  const inCollection = c.recipeIds.includes(recipe.id);
                  return (
                    <button
                      key={c.name}
                      onClick={() => onToggleCollection(c.name, recipe.id)}
                      className="w-full flex items-center gap-3 bg-muted rounded-2xl p-3.5 active:scale-95 transition-transform"
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span className="flex-1 text-left text-sm font-semibold text-foreground">{tr(c.name)}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${inCollection ? "bg-primary" : "bg-border"}`}>
                        {inCollection && <CheckIcon />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const GENERIC_STEPS: RecipeT["steps"] = [
  { step: 1, title: "Prepare ingredients", desc: "Gather and measure all ingredients. Slice, dice, and prepare everything before cooking.", tip: "Having everything ready before you start makes cooking much smoother.", timer: null },
  { step: 2, title: "Heat your equipment", desc: "Preheat your pan or pot on medium heat. Add oil if needed.", tip: "A properly heated pan prevents sticking.", timer: 2 },
  { step: 3, title: "Cook the main ingredient", desc: "Add the main protein or vegetable and cook until properly done.", tip: "Don't rush — proper cooking time ensures food safety.", timer: 8 },
  { step: 4, title: "Add seasonings", desc: "Season with salt, pepper, and any spices. Taste and adjust as needed.", tip: "Season in layers, not just at the end.", timer: null },
  { step: 5, title: "Plate and serve", desc: "Transfer to a plate, garnish if desired, and serve immediately.", tip: "Warm plates keep food hot longer.", timer: null },
];

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

// Three short beeps — loud enough to hear across a kitchen, no audio files needed.
function playTimerAlarm() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.4, 0.8].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.25;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.25);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // audio unavailable — the visual alert still shows
  }
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {
    // vibration unsupported
  }
}

function speak(text: string, lang: Language = "en") {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "mn" ? "mn-MN" : "en-US";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    // speech unavailable
  }
}

type StepTimer = { remaining: number; running: boolean; done: boolean };

function CookingModeScreen({
  recipe,
  onBack,
  onComplete,
  substitutions,
  units,
}: {
  recipe: RecipeT;
  onBack: () => void;
  onComplete: (stepsCompleted: number) => void;
  substitutions: Record<string, string>;
  units: Units;
}) {
  const tr = useTr();
  const steps = recipe.steps.length > 0 ? recipe.steps : GENERIC_STEPS;
  const [current, setCurrent] = useState(0);
  const [timers, setTimers] = useState<Record<number, StepTimer>>({});
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [voiceOn, setVoiceOn] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  // Only offer voice guidance when the device has a voice for the app's language —
  // an English voice reading Mongolian text is worse than no voice at all.
  const [speechSupported, setSpeechSupported] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const check = () => setSpeechSupported(window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(tr.lang)));
    check();
    window.speechSynthesis.addEventListener?.("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", check);
  }, [tr.lang]);

  const step = steps[current];
  const progress = ((current + 1) / steps.length) * 100;
  const anyRunning = Object.values(timers).some((t) => t.running);

  // One interval drives every running timer, so timers keep counting while you move
  // between steps.
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => {
      setTimers((prev) => {
        const next: Record<number, StepTimer> = { ...prev };
        for (const [k, t] of Object.entries(prev)) {
          if (!t.running) continue;
          const remaining = t.remaining - 1;
          if (remaining <= 0) {
            next[Number(k)] = { remaining: 0, running: false, done: true };
          } else {
            next[Number(k)] = { ...t, remaining };
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Sound the alarm once for each timer that has just finished.
  const alarmedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const [k, t] of Object.entries(timers)) {
      const i = Number(k);
      if (t.done && !alarmedRef.current.has(i)) {
        alarmedRef.current.add(i);
        playTimerAlarm();
        if (voiceOn) speak(tr("Timer for step {n} is done.", { n: i + 1 }), tr.lang);
      } else if (!t.done) {
        alarmedRef.current.delete(i);
      }
    }
  }, [timers]);

  useEffect(() => {
    if (voiceOn) speak(tr("Step {n}. {title}. {desc}", { n: current + 1, title: tr(step.title), desc: tr(step.desc) }), tr.lang);
  }, [current, voiceOn]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);

  const timerFor = (i: number): StepTimer | null => {
    const minutes = steps[i].timer;
    if (!minutes) return null;
    return timers[i] ?? { remaining: Math.round(minutes * 60), running: false, done: false };
  };
  const setTimer = (i: number, t: StepTimer) => setTimers((prev) => ({ ...prev, [i]: t }));
  const toggleTimer = (i: number) => {
    const t = timerFor(i);
    if (!t) return;
    if (t.done) setTimer(i, { remaining: Math.round((steps[i].timer ?? 0) * 60), running: true, done: false });
    else setTimer(i, { ...t, running: !t.running });
  };
  const resetTimer = (i: number) => setTimer(i, { remaining: Math.round((steps[i].timer ?? 0) * 60), running: false, done: false });
  const pauseAll = () => setTimers((prev) => Object.fromEntries(Object.entries(prev).map(([k, t]) => [k, { ...t, running: false }])));

  const goTo = (i: number) => setCurrent(Math.max(0, Math.min(steps.length - 1, i)));
  const markDoneAndNext = () => {
    const nextCompleted = new Set(completed).add(current);
    setCompleted(nextCompleted);
    if (current < steps.length - 1) goTo(current + 1);
    else onComplete(nextCompleted.size);
  };

  const stepTimer = timerFor(current);
  const otherActiveTimers = Object.entries(timers)
    .map(([k, t]) => ({ index: Number(k), t }))
    .filter(({ index, t }) => index !== current && (t.running || t.done));

  return (
    <div className="h-full flex flex-col bg-foreground text-white relative">
      {/* Top bar */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => { if (!anyRunning || window.confirm(tr("You have a timer running. Leave cooking mode and stop it?"))) onBack(); }}
          aria-label={tr("Leave cooking mode")}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
        >
          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs uppercase tracking-wider truncate">{tr(recipe.name)}</p>
          <p className="font-bold text-sm">{tr("Step {step} of {total}", { step: current + 1, total: steps.length })}</p>
        </div>
        <button onClick={() => setShowIngredients(true)} aria-label={tr("Show ingredients")} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-lg">🧾</button>
        {speechSupported && (
          <button
            onClick={() => { const on = !voiceOn; setVoiceOn(on); if (!on) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } } }}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? tr("Turn off voice guidance") : tr("Turn on voice guidance")}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg ${voiceOn ? "bg-primary" : "bg-white/10"}`}
          >
            {voiceOn ? "🔊" : "🔈"}
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="px-5 mb-4">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={completed.has(i) ? tr("Go to step {n} (done)", { n: i + 1 }) : tr("Go to step {n}", { n: i + 1 })}
              className="p-1.5 -m-1.5"
            >
              <span className={`block w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-primary scale-125" : completed.has(i) ? "bg-emerald-400" : "bg-white/25"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="bg-white/10 rounded-3xl overflow-hidden mb-5 h-[160px]">
          <FoodImage src={recipe.image} alt="" className="opacity-70" />
        </div>
        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">
          {tr("Step {n}", { n: current + 1 })}{completed.has(current) ? tr(" · ✓ Done") : ""}
        </p>
        <h2 className="font-display text-3xl text-white mb-3 leading-tight">{tr(step.title)}</h2>
        <p className="text-white/85 text-lg leading-relaxed mb-4">{tr(step.desc)}</p>

        {current === 0 && recipe.equipment.length > 0 && (
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">{tr("You'll need")}</p>
            <div className="flex flex-wrap gap-2">
              {recipe.equipment.map((e) => (
                <span key={e} className="bg-white/10 text-sm font-semibold px-3 py-1.5 rounded-full">{EQUIPMENT_LIST.find((q) => q.name === e)?.icon} {tr(e)}</span>
              ))}
            </div>
          </div>
        )}

        {/* Timer */}
        {stepTimer && (
          <div className={`rounded-2xl p-4 mb-4 border ${stepTimer.done ? "bg-emerald-500/20 border-emerald-400/40" : "bg-primary/20 border-primary/30"}`} role="timer" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">{stepTimer.done ? tr("Time's up!") : tr("Timer · {n} min", { n: step.timer ?? 0 })}</p>
                <p className="font-display text-4xl text-white tabular-nums">{stepTimer.done ? tr("✓ Done") : fmtTime(stepTimer.remaining)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resetTimer(current)}
                  aria-label={tr("Reset timer")}
                  className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg active:scale-95 transition-transform"
                >
                  ↺
                </button>
                <button
                  onClick={() => toggleTimer(current)}
                  aria-label={stepTimer.running ? tr("Pause timer") : tr("Start timer")}
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl active:scale-95 transition-transform"
                >
                  {stepTimer.running ? "⏸" : "▶"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="bg-white/10 rounded-2xl p-4 mb-4 flex gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">{tr("Pro tip")}</p>
            <p className="text-white/80 text-sm leading-relaxed">{tr(step.tip)}</p>
          </div>
        </div>

        {voiceOn && (
          <button onClick={() => speak(`${tr(step.title)}. ${tr(step.desc)}`, tr.lang)} className="w-full bg-white/10 rounded-2xl py-3 text-sm font-semibold mb-4">
            {tr("🔁 Repeat this step")}
          </button>
        )}
      </div>

      {/* Timers still running on other steps */}
      {otherActiveTimers.length > 0 && (
        <div className="px-5 pb-2 flex gap-2 overflow-x-auto">
          {otherActiveTimers.map(({ index, t }) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`flex-shrink-0 text-sm font-bold px-3 py-2 rounded-full ${t.done ? "bg-emerald-500 animate-pulse" : "bg-primary/30"}`}
            >
              ⏱ {tr("Step {n}", { n: index + 1 })} · {t.done ? tr("Done!") : fmtTime(t.remaining)}
            </button>
          ))}
          {anyRunning && (
            <button onClick={pauseAll} className="flex-shrink-0 text-sm font-bold px-3 py-2 rounded-full bg-white/10">{tr("⏸ Pause all")}</button>
          )}
        </div>
      )}

      {/* Navigation controls — big targets for messy hands */}
      <div className="px-5 py-5 flex items-center gap-3">
        <button onClick={() => goTo(current - 1)} disabled={current === 0} aria-label={tr("Previous step")} className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform">
          <ChevronLeft />
        </button>
        <button onClick={markDoneAndNext} className="flex-1 h-16 bg-primary rounded-2xl flex items-center justify-center gap-2 font-bold text-base active:scale-95 transition-transform">
          {current === steps.length - 1 ? <span>{tr("Finish Cooking ✓")}</span> : <><span>{tr("✓ Done · Next step")}</span><ChevronRight /></>}
        </button>
        {current < steps.length - 1 && (
          <button onClick={() => goTo(current + 1)} aria-label={tr("Skip step")} className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-xs font-bold active:scale-95 transition-transform">
            {tr("Skip")}
          </button>
        )}
      </div>

      {showIngredients && (
        <div className="absolute inset-0 bg-black/60 flex items-end z-20" onClick={() => setShowIngredients(false)}>
          <div role="dialog" aria-label={tr("Ingredients")} className="w-full bg-card text-foreground rounded-t-3xl p-5 pb-8 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-base mb-3">{tr("Ingredients")}</h3>
            {recipe.ingredients.map((ing) => (
              <div key={ing.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-base font-semibold">{tr(substitutions[ing.name] ?? ing.name)}</p>
                  {substitutions[ing.name] && <p className="text-xs text-muted-foreground">{tr("instead of {name}", { name: tr(ing.name) })}</p>}
                </div>
                <p className="text-base text-muted-foreground">{tr.qty(convertQty(ing.qty, units))}</p>
              </div>
            ))}
            <button onClick={() => setShowIngredients(false)} className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-4 text-base">{tr("Back to cooking")}</button>
          </div>
        </div>
      )}
    </div>
  );
}


function CompletionScreen({
  recipe,
  onBack,
  onHome,
  onShare,
  savedIds,
  onToggleSave,
  ownedIngredients,
  onRecipe,
  stepsCompleted,
  myRating,
  onRate,
}: {
  myRating: number;
  // Resolves to false when the rating couldn't be saved (the screen then resets).
  onRate: (stars: number) => Promise<boolean>;
  recipe: typeof RECIPES[0];
  onBack: () => void;
  onHome: () => void;
  onShare: () => void;
  savedIds: number[];
  onToggleSave: (id: number) => void;
  ownedIngredients: string[];
  onRecipe: (r: RecipeT) => void;
  stepsCompleted: number;
}) {
  const tr = useTr();
  const [rating, setRating] = useState(myRating);
  const [ratingState, setRatingState] = useState<"idle" | "saving" | "saved">(myRating > 0 ? "saved" : "idle");
  const rate = async (stars: number) => {
    const previous = rating;
    setRating(stars);
    setRatingState("saving");
    const ok = await onRate(stars);
    if (ok) setRatingState("saved");
    else {
      setRating(previous);
      setRatingState(previous > 0 ? "saved" : "idle");
    }
  };
  const saved = savedIds.includes(recipe.id);
  // Same cuisine first, then whatever you can make most of from your kitchen.
  const alsoLike = RECIPES.filter((r) => r.id !== recipe.id)
    .sort(
      (a, b) =>
        Number(b.cuisine === recipe.cuisine) - Number(a.cuisine === recipe.cuisine) ||
        computeMatch(b, ownedIngredients) - computeMatch(a, ownedIngredients) ||
        rankingRating(b.id) - rankingRating(a.id)
    )
    .slice(0, 6);
  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto pb-10">
      <div className="relative h-[260px] bg-muted flex-shrink-0">
        <FoodImage src={recipe.image} alt={tr(recipe.name)} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />
      </div>
      <div className="px-6 -mt-8 relative">
        <div className="bg-card rounded-3xl border border-border shadow-lg p-6 mb-5">
          <p className="text-3xl mb-3 text-center">🎉</p>
          <h2 className="font-display text-2xl text-foreground text-center mb-1">{tr("Dinner is ready!")}</h2>
          <p className="text-muted-foreground text-sm text-center mb-5">{tr("You cooked {name}", { name: tr(recipe.name) })}</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Time taken", val: trTime(recipe.time, tr), icon: "⏱" },
              { label: "Steps done", val: `${stepsCompleted}/${recipe.steps.length || 5}`, icon: "✅" },
              { label: "Difficulty", val: tr(recipe.difficulty), icon: "📊" },
            ].map((s) => (
              <div key={s.label} className="bg-muted rounded-2xl p-3 text-center">
                <p className="text-base mb-1">{s.icon}</p>
                <p className="font-bold text-xs text-foreground">{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{tr(s.label)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm font-bold text-foreground mb-2 text-center">{tr("Rate this recipe")}</p>
          <div className="flex justify-center gap-2 mb-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => rate(i)} disabled={ratingState === "saving"} aria-label={i === 1 ? tr("Rate 1 star") : tr("Rate {n} stars", { n: i })} className="active:scale-95 transition-transform p-1">
                <svg width="32" height="32" fill={i <= rating ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground h-4">{ratingState === "saving" ? tr("Saving…") : ratingState === "saved" ? tr("Thanks for rating!") : ""}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <button onClick={() => onToggleSave(recipe.id)} className="bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">{saved ? tr("✓ Saved") : tr("Save")}</button>
          <button onClick={onShare} className="bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">{tr("Share")}</button>
          <button onClick={onBack} className="bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">{tr("Cook again")}</button>
        </div>
        <button onClick={onHome} className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform text-base mb-6">
          {tr("Back to Home")}
        </button>

        <p className="text-sm font-bold text-foreground mb-3">{tr("You might also like…")}</p>
        <div className="flex gap-3 overflow-x-auto">
          {alsoLike.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onPress={() => onRecipe(r)}
              saved={savedIds.includes(r.id)}
              onToggleSave={() => onToggleSave(r.id)}
              ownedIngredients={ownedIngredients}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const KITCHEN_CATEGORIES = ["Meat", "Vegetables", "Fruits", "Dairy", "Grains", "Pasta", "Eggs", "Spices", "Sauces", "Canned food", "Other"];
const CATEGORY_ICONS: Record<string, string> = {
  Meat: "🥩", Vegetables: "🥦", Fruits: "🍎", Dairy: "🥛", Grains: "🌾", Pasta: "🍝", Eggs: "🥚", Spices: "🧂", Sauces: "🫙", "Canned food": "🥫", Other: "🛒",
};
const UNITS = ["", "g", "kg", "ml", "L", "pcs", "cups", "tbsp", "cans"];
const FRESHNESS_ORDER: Record<Freshness, number> = { expired: 0, expiring: 1, ok: 2, unknown: 3 };

// Maps a Mongolian (or differently-cased English) ingredient name back to the English
// name recipes use, so what people type in their own language still matches.
function canonicalIngredientName(name: string): string {
  const lower = name.toLowerCase();
  if (!lower) return name;
  const known = [...INGREDIENTS_LIST, ...RECIPES.flatMap((r) => r.ingredients.map((i) => i.name))];
  return known.find((en) => en.toLowerCase() === lower || MN_TR(en).toLowerCase() === lower) ?? name;
}

function MyKitchenScreen({
  onBack,
  ingredients,
  equipment,
  onAddIngredient,
  onRemoveIngredient,
  onToggleEquipment,
  initialTab,
  onFindRecipes,
}: {
  onBack: () => void;
  ingredients: KitchenIngredient[];
  equipment: string[];
  onAddIngredient: (ing: KitchenIngredient) => void;
  onRemoveIngredient: (name: string) => void;
  onToggleEquipment: (name: string) => void;
  initialTab: "Ingredients" | "Equipment";
  onFindRecipes: () => void;
}) {
  const tr = useTr();
  const [tab, setTab] = useState<"Ingredients" | "Equipment">(initialTab);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [newExpiry, setNewExpiry] = useState("");

  const canonicalName = canonicalIngredientName(newName.trim());
  const existing = ingredients.find((i) => i.name.toLowerCase() === canonicalName.toLowerCase());
  const typed = newName.trim().toLowerCase();
  const nameSuggestions = typed.length > 0
    ? INGREDIENTS_LIST.filter((i) => (i.toLowerCase().includes(typed) || tr(i).toLowerCase().includes(typed)) && i.toLowerCase() !== canonicalName.toLowerCase()).slice(0, 5)
    : [];

  const openAdd = (prefill?: KitchenIngredient) => {
    setNewName(prefill?.name ?? "");
    const m = prefill?.qty.match(/^([\d.,/]+)\s*(.*)$/);
    setNewQty(m ? m[1] : prefill?.qty ?? "");
    setNewUnit(m && UNITS.includes(m[2]) ? m[2] : "");
    setNewCategory(prefill?.category ?? "Other");
    setNewExpiry(prefill?.expiry ?? "");
    setShowAdd(true);
  };

  const submitAdd = () => {
    if (!newName.trim()) return;
    const qty = newQty.trim() ? `${newQty.trim()}${newUnit ? (["g", "kg", "ml", "L"].includes(newUnit) ? "" : " ") + newUnit : ""}` : "1";
    onAddIngredient({ name: existing?.name ?? canonicalName, qty, category: newCategory, expiry: newExpiry });
    setShowAdd(false);
  };

  const sorted = [...ingredients].sort((a, b) => FRESHNESS_ORDER[freshnessOf(a)] - FRESHNESS_ORDER[freshnessOf(b)] || a.name.localeCompare(b.name));
  const needsAttention = ingredients.filter((i) => ["expired", "expiring"].includes(freshnessOf(i))).length;

  return (
    <div className="h-full flex flex-col bg-background relative">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} aria-label={tr("Back")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft />
        </button>
        <h2 className="font-display text-xl text-foreground flex-1">{tr("My Kitchen")}</h2>
        <button onClick={() => openAdd()} aria-label={tr("Add ingredient")} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white">
          <PlusIcon />
        </button>
      </div>
      <div className="flex bg-muted rounded-2xl mx-5 my-3 p-1">
        {(["Ingredients", "Equipment"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
            {tr(t)} <span className="text-xs font-semibold text-muted-foreground">({t === "Ingredients" ? ingredients.length : equipment.length})</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {tab === "Ingredients" ? (
          ingredients.length === 0 ? (
            <EmptyState icon="🥕" title={tr("No ingredients yet")} body={tr("Add what's in your fridge and pantry, and we'll show you what you can cook with it.")} action={{ label: tr("Add an ingredient"), onClick: () => openAdd() }} />
          ) : (
            <>
              {needsAttention > 0 && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  ⚠️ {needsAttention === 1 ? tr("1 item needs attention — use soon or check before cooking.") : tr("{n} items need attention — use soon or check before cooking.", { n: needsAttention })}
                </p>
              )}
              <div className="space-y-2">
                {sorted.map((ing) => {
                  const fresh = freshnessOf(ing);
                  return (
                    <div key={ing.name} className={`bg-card rounded-2xl border p-3 flex items-center gap-3 ${fresh === "expired" ? "border-red-200" : fresh === "expiring" ? "border-amber-200" : "border-border"}`}>
                      <button onClick={() => openAdd(ing)} className="flex flex-1 items-center gap-3 text-left min-w-0" aria-label={tr("Edit {name}", { name: tr(ing.name) })}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${fresh === "expired" ? "bg-red-100" : fresh === "expiring" ? "bg-amber-100" : "bg-muted"}`}>
                          {CATEGORY_ICONS[ing.category] ?? "🛒"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{tr(ing.name)}</p>
                          <p className="text-xs text-muted-foreground">{tr.qty(ing.qty)} · {tr(ing.category)}</p>
                        </div>
                        <p className={`text-xs font-semibold text-right flex-shrink-0 ${fresh === "expired" ? "text-red-600" : fresh === "expiring" ? "text-amber-600" : "text-muted-foreground"}`}>
                          {fresh === "expired" ? "⛔ " : fresh === "expiring" ? "⚠️ " : ""}{expiryLabel(ing, tr)}
                        </p>
                      </button>
                      <button onClick={() => onRemoveIngredient(ing.name)} aria-label={tr("Remove {name}", { name: tr(ing.name) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground active:opacity-60 transition-opacity">
                        <XIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button onClick={onFindRecipes} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm mt-5">
                {tr("What can I cook with this? →")}
              </button>
            </>
          )
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{tr("Tap to mark what you own. Recipes that need equipment you don't have are filtered out of your matches.")}</p>
            <div className="grid grid-cols-2 gap-3">
              {EQUIPMENT_LIST.map((e) => {
                const owned = equipment.includes(e.name);
                return (
                  <button
                    key={e.name}
                    onClick={() => onToggleEquipment(e.name)}
                    aria-pressed={owned}
                    className={`rounded-2xl border-2 p-4 flex items-center gap-3 text-left transition-all active:scale-95 ${owned ? "border-primary bg-primary/5" : "border-border bg-card opacity-60"}`}
                  >
                    <span className="text-2xl">{e.icon}</span>
                    <div>
                      <p className={`font-bold text-sm ${owned ? "text-primary" : "text-foreground"}`}>{tr(e.name)}</p>
                      <p className="text-xs text-muted-foreground">{owned ? tr("Owned") : tr("Not owned")}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <BottomSheet title={existing ? tr("Update {name}", { name: tr(existing.name) }) : tr("Add ingredient")} onClose={() => setShowAdd(false)}>
          <div className="space-y-3 mb-4">
            <div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={tr("Ingredient name")}
                aria-label={tr("Ingredient name")}
                className="w-full bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              />
              {nameSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {nameSuggestions.map((n) => (
                    <button key={n} onClick={() => setNewName(n)} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{tr(n)}</button>
                  ))}
                </div>
              )}
              {existing && <p className="text-xs text-muted-foreground mt-2">{tr("Already in your kitchen — saving will update it.")}</p>}
            </div>
            <div className="flex gap-2">
              <input
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder={tr("Quantity")}
                aria-label={tr("Quantity")}
                inputMode="decimal"
                className="flex-1 min-w-0 bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              />
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                aria-label={tr("Unit")}
                className="w-28 bg-muted border border-border rounded-2xl px-3 py-3 text-sm outline-none focus:border-primary transition-colors"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u === "" ? tr("Unit") : tr(u)}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tr("Category")}</p>
              <div className="flex flex-wrap gap-2">
                {KITCHEN_CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setNewCategory(c)} aria-pressed={newCategory === c} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${newCategory === c ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border"}`}>
                    {CATEGORY_ICONS[c]} {tr(c)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tr("Expiration date")}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {[["3 days", 3], ["1 week", 7], ["2 weeks", 14], ["1 month", 30]].map(([label, days]) => {
                  const iso = isoDaysFromNow(days as number);
                  return (
                    <button key={label} onClick={() => setNewExpiry(iso)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${newExpiry === iso ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border"}`}>
                      +{tr(label as string)}
                    </button>
                  );
                })}
                <button onClick={() => setNewExpiry("")} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${newExpiry === "" ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border"}`}>{tr("No date")}</button>
              </div>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                aria-label={tr("Expiration date")}
                className="w-full bg-muted border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowAdd(false)} className="bg-secondary text-secondary-foreground font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">{tr("Cancel")}</button>
            <button onClick={submitAdd} disabled={!newName.trim()} className="bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm disabled:opacity-40">
              {existing ? tr("Update") : tr("Add Ingredient")}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function NotificationsScreen({
  onBack,
  notifications,
  readIds,
  onOpen,
  onMarkAllRead,
}: {
  onBack: () => void;
  notifications: AppNotification[];
  readIds: string[];
  onOpen: (n: AppNotification) => void;
  onMarkAllRead: () => void;
}) {
  const tr = useTr();
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} aria-label={tr("Back")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft />
        </button>
        <h2 className="font-display text-xl text-foreground flex-1">{tr("Notifications")}</h2>
        {unreadCount > 0 && <button onClick={onMarkAllRead} className="text-primary text-sm font-semibold">{tr("Mark all read")}</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {notifications.length === 0 ? (
          <EmptyState icon="🔔" title={tr("You're all caught up")} body={tr("We'll let you know when something in your kitchen is about to expire or we find a recipe you'll love.")} />
        ) : (
          notifications.map((n) => {
            const unread = !readIds.includes(n.id);
            return (
              <button key={n.id} onClick={() => onOpen(n)} className={`w-full text-left bg-card rounded-2xl border p-4 flex gap-3 active:scale-95 transition-transform ${unread ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${unread ? "bg-primary/10" : "bg-muted"}`}>
                  {n.icon}
                </div>
                <div className="flex-1">
                  <p className={`text-sm leading-tight mb-0.5 ${unread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1">{n.body}</p>
                  <p className="text-xs text-muted-foreground">{n.when}</p>
                </div>
                {unread && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" aria-label={tr("Unread")} />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


// ─── Bottom Navigation ────────────────────────────────────────────────────────
function BottomNav({ active, onChange }: { active: string; onChange: (s: Screen) => void }) {
  const tr = useTr();
  const items = [
    { id: "home", label: tr("Home"), icon: HomeIcon },
    { id: "discover", label: tr("Discover"), icon: CompassIcon },
    { id: "what-can-i-cook", label: tr("Cook"), icon: null },
    { id: "saved", label: tr("Saved"), icon: BookmarkIcon },
    { id: "profile", label: tr("Profile"), icon: UserIcon },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 pb-6 pt-3">
      <div className="flex items-end justify-between max-w-sm mx-auto">
        {items.map((item) => {
          const isActive = active === item.id;
          const isCook = item.id === "what-can-i-cook";
          if (isCook) {
            return (
              <button key={item.id} onClick={() => onChange("what-can-i-cook")} className="flex flex-col items-center -mt-6 active:scale-95 transition-transform">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <CookIcon />
                </div>
                <span className="text-[10px] font-bold text-primary mt-1">{item.label}</span>
              </button>
            );
          }
          const Icon = item.icon!;
          return (
            <button key={item.id} onClick={() => onChange(item.id as Screen)} className="flex flex-col items-center gap-0.5 py-1 px-3 active:scale-95 transition-transform">
              <span className={isActive ? "text-primary" : "text-muted-foreground"}><Icon filled={isActive} /></span>
              <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // One-time bootstrap: read the session and this device's copy of its data before
  // any state initializes, so a returning person lands straight on their own data
  // instead of flashing onboarding first. The server copy is fetched right after.
  const [bootstrap] = useState(() => {
    const session = loadSession();
    if (session?.kind === "user") {
      const cached = loadUserData(session.user.id);
      return { session, data: cached?.data ?? null };
    }
    if (session?.kind === "guest") return { session, data: loadGuestData() };
    return { session: null, data: null };
  });
  const initialData = bootstrap.data ?? defaultAccountData();

  const [screen, setScreen] = useState<Screen>(
    bootstrap.session ? (initialData.mealPlanConfig.store === "" ? "meal-plan-setup" : "home") : "onboarding"
  );
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeT>(RECIPES[0]);

  const [session, setSessionState] = useState<Session | null>(bootstrap.session);
  // Read by sync code that runs outside render (timers, event listeners).
  const sessionRef = useRef<Session | null>(bootstrap.session);
  const setSession = (s: Session | null) => {
    sessionRef.current = s;
    setSessionState(s);
    writeJson(SESSION_KEY, s);
  };
  // Someone signed in with nothing cached on this device waits for the server copy,
  // instead of briefly seeing — and possibly saving over it with — empty defaults.
  const [hydrated, setHydrated] = useState(bootstrap.session?.kind !== "user" || bootstrap.data !== null);
  const [loadError, setLoadError] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [myRatings, setMyRatings] = useState<Record<number, number>>({});
  const { update: updateCommunityRating } = useCommunityRatings();

  const [savedIds, setSavedIds] = useState<number[]>(initialData.savedIds);
  const [cookedIds, setCookedIds] = useState<number[]>(initialData.cookedIds);
  const [kitchenIngredients, setKitchenIngredients] = useState<KitchenIngredient[]>(initialData.kitchenIngredients);
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>(initialData.kitchenEquipment);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(initialData.readNotificationIds);
  const [recentSearches, setRecentSearches] = useState<string[]>(initialData.recentSearches);
  const [cookQuery, setCookQuery] = useState<{ ingredients: string[]; equipment: string[]; time: string; difficulty: string; diet: string }>({
    ingredients: initialData.kitchenIngredients.map((i) => i.name),
    equipment: initialData.kitchenEquipment,
    time: "Any",
    difficulty: "Any",
    diet: initialData.mealPlanConfig.diet,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? null;
  const [detailBackTo, setDetailBackTo] = useState<Screen>("home");
  // Some screens (my-kitchen, notifications, meal-plan-setup, cuisine) are reachable
  // from more than one place — remember which one so their back button returns you
  // there instead of always landing on a fixed screen.
  const [screenBackTo, setScreenBackTo] = useState<Screen>("home");
  const [cuisineBackTo, setCuisineBackTo] = useState<Screen>("home");
  const [selectedCuisine, setSelectedCuisine] = useState<string>(CUISINES[0].name);
  const [kitchenTab, setKitchenTab] = useState<"Ingredients" | "Equipment">("Ingredients");
  const [discoverCategory, setDiscoverCategory] = useState("All");
  // Substitutes chosen on the recipe page, carried into cooking mode for that recipe.
  const [substitutions, setSubstitutions] = useState<{ recipeId: number; map: Record<string, string> }>({ recipeId: 0, map: {} });
  const [stepsCompleted, setStepsCompleted] = useState(0);
  // True when returning from results to tweak the search, so answers are kept.
  const [resumeCookQuery, setResumeCookQuery] = useState(false);
  const [mealPlanConfig, setMealPlanConfig] = useState<MealPlanConfig>(initialData.mealPlanConfig);
  const [weeklyPlan, setWeeklyPlan] = useState<PlannedMeal[]>(initialData.weeklyPlan);
  // Before anyone signs in, the language comes from this browser (or the device
  // language); once signed in, it's part of the account.
  const [language, setLanguage] = useState<Language>(bootstrap.data ? initialData.language : loadGuestLanguage());
  const tr = makeTr(language);
  useEffect(() => {
    document.documentElement.lang = language;
    if (!session) saveGuestLanguage(language);
  }, [language, session]);
  const [units, setUnits] = useState<"metric" | "imperial">(initialData.units);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState(initialData.personalizedRecommendations);
  const [profileName, setProfileName] = useState(initialData.profileName);
  const [collections, setCollections] = useState<Collection[]>(initialData.collections);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // ── Persistence & sync ──────────────────────────────────────────────────────
  // Every change is written to this browser right away. For signed-in accounts it's
  // also pushed to the server a second later, flushed when the tab is hidden, and
  // retried when the connection comes back. Last write wins across devices.
  const lastSavedRef = useRef(JSON.stringify(toStored(initialData)));
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function pushToServer(keepalive = false): Promise<boolean> {
    const s = sessionRef.current;
    if (s?.kind !== "user") return true;
    const cache = readJson<UserCache>(USER_CACHE_KEY);
    if (!cache || cache.userId !== s.user.id || !cache.dirty) return true;
    try {
      await api("/me/data", { method: "PUT", token: s.token, body: { data: cache.data, name: cache.data.profileName }, keepalive });
      // Only mark it clean if nothing changed while the request was in flight.
      const latest = readJson<UserCache>(USER_CACHE_KEY);
      if (latest && latest.userId === cache.userId && JSON.stringify(latest.data) === JSON.stringify(cache.data)) {
        writeJson(USER_CACHE_KEY, { ...latest, dirty: false });
      }
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession();
      return false;
    }
  }

  useEffect(() => {
    if (!session || !hydrated) return;
    const stored = toStored({
      savedIds, cookedIds, kitchenIngredients, kitchenEquipment, readNotificationIds, recentSearches,
      mealPlanConfig, weeklyPlan, collections, language, units, personalizedRecommendations, profileName,
    });
    const json = JSON.stringify(stored);
    if (json === lastSavedRef.current) return;
    lastSavedRef.current = json;
    if (session.kind === "guest") {
      writeJson(GUEST_DATA_KEY, stored);
      return;
    }
    writeJson(USER_CACHE_KEY, { userId: session.user.id, data: stored, dirty: true } satisfies UserCache);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void pushToServer(), 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session, hydrated, savedIds, cookedIds, kitchenIngredients, kitchenEquipment, readNotificationIds, recentSearches,
    mealPlanConfig, weeklyPlan, collections, language, units, personalizedRecommendations, profileName,
  ]);

  useEffect(() => {
    const retry = () => void pushToServer();
    const onHide = () => {
      if (document.visibilityState === "hidden") void pushToServer(true);
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A returning signed-in person: fetch the server copy. Changes made on this device
  // that never reached the server (e.g. offline) win; otherwise the server's copy does.
  async function refreshFromServer() {
    const s = sessionRef.current;
    if (s?.kind !== "user") return;
    setLoadError(false);
    try {
      const me = await api<{ user: ApiUser; data: unknown; myRatings: Record<number, number> }>("/me", { token: s.token });
      if (sessionRef.current !== s) return;
      setSession({ ...s, user: me.user });
      setMyRatings(me.myRatings);
      const cache = readJson<UserCache>(USER_CACHE_KEY);
      const local = cache?.userId === s.user.id ? cache : null;
      if (local?.dirty) {
        void pushToServer();
      } else if (me.data) {
        const fresh = migrateAccountData(me.data as Record<string, unknown>);
        writeJson(USER_CACHE_KEY, { userId: s.user.id, data: toStored(fresh), dirty: false } satisfies UserCache);
        applyData(fresh, !hydrated);
      } else if (local) {
        writeJson(USER_CACHE_KEY, { ...local, dirty: true });
        void pushToServer();
      }
      setHydrated(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession();
      else if (!hydrated) setLoadError(true);
    }
  }

  useEffect(() => {
    void refreshFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swaps in a whole account's data (login, signup, guest, or a fresher server copy).
  function applyData(d: AccountData, goToStart: boolean) {
    lastSavedRef.current = JSON.stringify(toStored(d));
    setSavedIds(d.savedIds);
    setCookedIds(d.cookedIds);
    setKitchenIngredients(d.kitchenIngredients);
    setKitchenEquipment(d.kitchenEquipment);
    setReadNotificationIds(d.readNotificationIds);
    setRecentSearches(d.recentSearches);
    setMealPlanConfig(d.mealPlanConfig);
    setWeeklyPlan(d.weeklyPlan);
    setCollections(d.collections);
    setLanguage(d.language);
    setUnits(d.units);
    setPersonalizedRecommendations(d.personalizedRecommendations);
    setProfileName(d.profileName);
    setCookQuery({ ingredients: d.kitchenIngredients.map((i) => i.name), equipment: d.kitchenEquipment, time: "Any", difficulty: "Any", diet: d.mealPlanConfig.diet });
    if (goToStart) setScreen(d.mealPlanConfig.store === "" ? "meal-plan-setup" : "home");
  }

  // `fallback` is used when the account has no data on the server yet (first sign-in).
  function signIn(res: AuthResult, fallback: AccountData) {
    const fromServer = res.data ? migrateAccountData(res.data as Record<string, unknown>) : null;
    // Unsynced changes from this device (say, the session expired while offline) win.
    const cached = loadUserData(res.user.id);
    const data = cached?.dirty ? cached.data : fromServer ?? fallback;
    const needsPush = Boolean(cached?.dirty) || !fromServer;
    setSession({ kind: "user", token: res.token, user: res.user });
    setMyRatings(res.myRatings);
    writeJson(USER_CACHE_KEY, { userId: res.user.id, data: toStored(data), dirty: needsPush } satisfies UserCache);
    applyData(data, true);
    setHydrated(true);
    setLoadError(false);
    if (needsPush) void pushToServer();
  }

  function expireSession() {
    setSession(null);
    setMyRatings({});
    setHydrated(true);
    setLoadError(false);
    setAuthMode("login");
    setScreen("auth");
    setToast(tr("Your session has expired — please log in again."));
  }

  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await api<AuthResult>("/auth/login", { body: { email, password } });
      signIn(res, legacyAccountData(email) ?? defaultAccountData({ profileName: res.user.name, language }));
      return null;
    } catch (err) {
      return apiErrorMessage(err);
    }
  };

  const handleSignup = async (name: string, email: string, password: string): Promise<string | null> => {
    // Bring along what this person already set up in this browser: data from the old
    // browser-only build, or what they did as a guest.
    const legacy = legacyAccountData(email);
    const carried = legacy ?? loadGuestData();
    const data = carried ? { ...carried, profileName: name.trim() } : defaultAccountData({ profileName: name.trim(), language });
    try {
      const res = await api<AuthResult>("/auth/signup", { body: { name, email, password, lang: language, data: toStored(data) } });
      if (!legacy && carried) writeJson(GUEST_DATA_KEY, null);
      signIn(res, data);
      return null;
    } catch (err) {
      return apiErrorMessage(err);
    }
  };

  const handleGuest = () => {
    const data = loadGuestData() ?? defaultAccountData({ profileName: language === "mn" ? "Зочин" : "Guest", language });
    setSession({ kind: "guest" });
    writeJson(GUEST_DATA_KEY, toStored(data));
    applyData(data, true);
    setHydrated(true);
  };

  const handleGoogleCredential = (credential: string) => {
    setGoogleError(null);
    api<AuthResult>("/auth/google", { body: { credential } })
      .then((res) => signIn(res, legacyAccountData(res.user.email) ?? defaultAccountData({ profileName: res.user.name, language })))
      .catch((err) => setGoogleError(apiErrorMessage(err)));
  };

  const handleLogout = async () => {
    const s = sessionRef.current;
    if (s?.kind === "user") {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      const synced = await pushToServer();
      if (!synced && !window.confirm(tr("Some changes haven't reached your account yet (you seem to be offline). Log out anyway and lose them?"))) return;
      api("/auth/logout", { method: "POST", token: s.token }).catch(() => {
        // the session expires on its own if this doesn't get through
      });
      writeJson(USER_CACHE_KEY, null);
    }
    setSession(null);
    setMyRatings({});
    setAuthMode("login");
    setScreen("auth");
  };

  // From a guest's profile: sign up, keeping what they've set up so far.
  const handleCreateAccount = () => {
    setSession(null);
    setAuthMode("signup");
    setScreen("auth");
  };

  const handleRate = async (recipeId: number, stars: number): Promise<boolean> => {
    const s = sessionRef.current;
    if (s?.kind !== "user") {
      setToast(tr("Create an account to rate recipes."));
      return false;
    }
    try {
      const r = await api<{ recipeId: number } & RecipeRating>("/ratings", { token: s.token, body: { recipeId, stars } });
      updateCommunityRating(recipeId, { avg: r.avg, count: r.count });
      setMyRatings((prev) => ({ ...prev, [recipeId]: stars }));
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession();
      else setToast(tr(apiErrorMessage(err)));
      return false;
    }
  };

  const createCollection = (name: string) => {
    if (collections.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setToast(tr("You already have a collection with that name."));
      return;
    }
    const color = COLLECTION_COLOR_PALETTE[collections.length % COLLECTION_COLOR_PALETTE.length];
    setCollections((prev) => [...prev, { name, color, icon: "📁", recipeIds: [] }]);
  };

  const toggleRecipeInCollection = (collectionName: string, recipeId: number) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.name === collectionName
          ? { ...c, recipeIds: c.recipeIds.includes(recipeId) ? c.recipeIds.filter((id) => id !== recipeId) : [...c.recipeIds, recipeId] }
          : c
      )
    );
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const ownedIngredientNames = kitchenIngredients.map((i) => i.name);

  const setupComplete = mealPlanConfig.store !== "";
  const SETUP_FLOW: Screen[] = ["onboarding", "auth", "meal-plan-setup", "meal-plan-building", "meal-plan-result"];
  const activeScreen: Screen = session && !setupComplete && !SETUP_FLOW.includes(screen) ? "meal-plan-setup" : screen;
  useEffect(() => {
    if (activeScreen !== screen) setScreen(activeScreen);
  }, [activeScreen, screen]);

  const mainScreens: Screen[] = ["home", "discover", "saved", "profile"];
  const showNav = mainScreens.includes(activeScreen);

  const navigate = (s: Screen) => {
    if (s === "my-kitchen" || s === "notifications" || s === "meal-plan-setup") setScreenBackTo(screen);
    if (s === "what-can-i-cook") setResumeCookQuery(false);
    if (s === "my-kitchen") setKitchenTab("Ingredients");
    if (s === "discover") setDiscoverCategory("All");
    setScreen(s);
  };
  const openKitchen = (tab: "Ingredients" | "Equipment") => {
    setScreenBackTo(screen);
    setKitchenTab(tab);
    setScreen("my-kitchen");
  };
  const openCuisine = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    setCuisineBackTo(screen === "cuisine" ? cuisineBackTo : screen);
    setScreen("cuisine");
  };
  const openRecipe = (r: RecipeT, from: Screen = "home") => {
    if (r.id !== substitutions.recipeId) setSubstitutions({ recipeId: r.id, map: {} });
    setSelectedRecipe(r);
    setDetailBackTo(from);
    setScreen("recipe-detail");
  };

  const toggleSaved = (id: number) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Adding an ingredient that's already in the kitchen updates it instead of creating
  // a second entry with the same name.
  const upsertIngredient = (ing: KitchenIngredient) => {
    const exists = kitchenIngredients.some((i) => i.name.toLowerCase() === ing.name.toLowerCase());
    setKitchenIngredients((prev) => (exists ? prev.map((i) => (i.name.toLowerCase() === ing.name.toLowerCase() ? ing : i)) : [...prev, ing]));
    setToast(exists ? tr("Updated {name}", { name: tr(ing.name) }) : tr("Added {name} to your kitchen", { name: tr(ing.name) }));
  };

  const commitSearch = (q: string) => {
    setRecentSearches((prev) => [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8));
  };

  const handleCookResults = (ingredients: string[], equipment: string[], time: string, difficulty: string, diet: string) => {
    setCookQuery({ ingredients, equipment, time, difficulty, diet });
    setScreen("matching");
  };

  const handleCookingComplete = (completedCount: number) => {
    setStepsCompleted(completedCount);
    setCookedIds((prev) => (prev.includes(selectedRecipe.id) ? prev : [...prev, selectedRecipe.id]));
    setScreen("completion");
  };

  const handleShare = async () => {
    const text = tr("Check out this recipe on Mise: {name} ({cuisine}, {time})", { name: tr(selectedRecipe.name), cuisine: tr(selectedRecipe.cuisine), time: trTime(selectedRecipe.time, tr) });
    try {
      if (navigator.share) {
        await navigator.share({ title: tr(selectedRecipe.name), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast(tr("Recipe copied — paste it to share!"));
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") setToast(tr("Couldn't share right now — try again."));
    }
  };

  const handleEmailPlan = () => {
    const s = sessionRef.current;
    if (s?.kind !== "user") {
      setToast(tr("Create an account to email yourself your plan."));
      return;
    }
    if (!online) {
      setToast(tr("You're offline — we'll need a connection to send email."));
      return;
    }
    setEmailStatus("sending");
    // The server writes the email itself from these recipe ids and sends it only to
    // this account's own address.
    api<{ to: string }>("/email/weekly-plan", {
      token: s.token,
      body: {
        lang: language,
        store: mealPlanConfig.store,
        budget: mealPlanConfig.budget,
        meals: weeklyPlan.map((m) => ({ day: m.day, slot: m.slot, recipeId: m.recipe.id })),
      },
    })
      .then(({ to }) => {
        setEmailStatus("sent");
        setToast(tr("Plan emailed to {email}!", { email: to }));
      })
      .catch((err) => {
        setEmailStatus("error");
        if (err instanceof ApiError && err.status === 401) return expireSession();
        const code = err instanceof ApiError ? err.code : "";
        setToast(
          code === "rate_limited"
            ? tr("You've sent a few emails already — try again in a few minutes.")
            : code === "email_not_configured"
              ? tr("Email isn't set up on the server yet.")
              : tr("Couldn't send the email — try again in a moment.")
        );
      });
  };

  const handleBuildMealPlan = (config: MealPlanConfig) => {
    setMealPlanConfig(config);
    // What the customer told us during setup now actually drives the rest of the app:
    // their appliances become the kitchen's equipment list everywhere else.
    setKitchenEquipment(config.appliances);
    setWeeklyPlan(buildWeeklyMealPlan(config, config.appliances));
    setScreen("meal-plan-building");
  };

  const handleSwapMeal = (day: string, slot: string) => {
    setWeeklyPlan((prev) => {
      const usedIds = prev.map((p) => p.recipe.id);
      const replacement = pickReplacementForSlot(slot, mealPlanConfig.appliances, mealPlanConfig.diet, usedIds);
      return prev.map((p) => (p.day === day && p.slot === slot ? { day, slot, recipe: replacement } : p));
    });
  };

  // "You can make these" only lists recipes that use at least one thing you have —
  // a 0% match isn't something you can make.
  const filteredCookResults = RECIPES.filter(
    (r) =>
      computeMatch(r, cookQuery.ingredients) > 0 &&
      matchesTimeFilter(r, cookQuery.time) &&
      (cookQuery.difficulty === "Any" || r.difficulty === cookQuery.difficulty) &&
      hasAllEquipment(r, cookQuery.equipment) &&
      matchesDiet(r, cookQuery.diet)
  );

  const savedRecipes = RECIPES.filter((r) => savedIds.includes(r.id));
  const cookedRecipes = RECIPES.filter((r) => cookedIds.includes(r.id));
  const cuisinesTried = Array.from(new Set([...savedRecipes, ...cookedRecipes].map((r) => r.cuisine)));

  const cuisineAffinity = computeCuisineAffinity(savedRecipes, cookedRecipes);
  // Privacy setting: when off, recommendations ignore the kitchen/history entirely and
  // just surface top-rated recipes, instead of personalizing off past activity.
  const recommendations = personalizedRecommendations
    ? getTopRecommendations(RECIPES, 10, ownedIngredientNames, kitchenEquipment, cuisineAffinity)
    : [...RECIPES].sort((a, b) => rankingRating(b.id) - rankingRating(a.id)).slice(0, 10);
  const topCuisine = personalizedRecommendations ? topCuisineFrom(cuisineAffinity) : null;

  const notifications = buildNotifications(
    kitchenIngredients,
    savedIds,
    cookedIds,
    recommendations.find((r) => !cookedIds.includes(r.id)),
    cuisinesTried,
    tr
  );
  const hasUnread = notifications.some((n) => !readNotificationIds.includes(n.id));

  const openNotification = (n: AppNotification) => {
    setReadNotificationIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]));
    if (n.action.kind === "recipe") {
      const r = RECIPES_BY_ID.get(n.action.recipeId);
      if (r) openRecipe(r, "notifications");
    } else if (n.action.kind === "kitchen") {
      setScreenBackTo("notifications");
      setKitchenTab("Ingredients");
      setScreen("my-kitchen");
    } else {
      openCuisine(n.action.cuisine);
    }
  };

  return (
    <LanguageContext.Provider value={language}>
    <div className="h-full flex items-center justify-center bg-[#E8E4DF]">
      <div className="relative w-full max-w-sm h-full max-h-[900px] overflow-hidden rounded-[40px] shadow-2xl bg-background" style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15)" }}>
        {!online && (
          <div role="status" className="absolute top-0 left-0 right-0 z-40 bg-foreground text-white text-xs font-semibold text-center px-4 pt-3 pb-2">
            {tr("📡 You're offline. Your kitchen, saved recipes and cooking mode still work — photos and email will be back when you reconnect.")}
          </div>
        )}
        {!hydrated && (
          <div className="h-full flex flex-col items-center justify-center bg-background px-8 text-center">
            {loadError ? (
              <>
                <p className="text-4xl mb-3">📡</p>
                <p className="font-bold text-base text-foreground mb-1">{tr("We couldn't load your account")}</p>
                <p className="text-sm text-muted-foreground mb-5">{tr("Check your connection and try again.")}</p>
                <button onClick={() => void refreshFromServer()} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm mb-3">
                  {tr("Try again")}
                </button>
                <button onClick={() => void handleLogout()} className="w-full text-muted-foreground text-sm py-2">{tr("Log out")}</button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" aria-hidden />
                <p className="text-sm text-muted-foreground">{tr("Loading your kitchen…")}</p>
              </>
            )}
          </div>
        )}
        {hydrated && activeScreen === "onboarding" && <OnboardingScreen onDone={() => setScreen("auth")} language={language} onSetLanguage={setLanguage} />}
        {hydrated && activeScreen === "auth" && (
          <AuthScreen
            key={authMode}
            initialMode={authMode}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onGuest={handleGuest}
            onGoogleCredential={handleGoogleCredential}
            googleClientId={googleClientId}
            googleError={googleError}
            language={language}
            onSetLanguage={setLanguage}
          />
        )}
        {hydrated && activeScreen === "meal-plan-setup" && (
          <MealPlanSetupScreen
            onSkip={() => setScreen(screenBackTo)}
            onBuild={handleBuildMealPlan}
            initialConfig={mealPlanConfig}
            required={!setupComplete}
            onLogout={handleLogout}
          />
        )}
        {hydrated && activeScreen === "meal-plan-building" && <MealPlanBuildingScreen onDone={() => setScreen("meal-plan-result")} />}
        {hydrated && activeScreen === "meal-plan-result" && (
          <MealPlanResultScreen
            config={mealPlanConfig}
            plan={weeklyPlan}
            onSwapMeal={handleSwapMeal}
            onRecipe={(r) => openRecipe(r, "meal-plan-result")}
            onDone={() => setScreen("home")}
            onBack={() => setScreen("home")}
            onEmailPlan={handleEmailPlan}
            emailStatus={emailStatus}
            units={units}
          />
        )}
        {hydrated && activeScreen === "home" && (
          <HomeScreen
            onNavigate={navigate}
            onRecipe={(r) => openRecipe(r, "home")}
            ownedIngredients={ownedIngredientNames}
            savedIds={savedIds}
            onToggleSave={toggleSaved}
            hasUnread={hasUnread}
            recommendations={recommendations}
            topCuisine={topCuisine}
            weeklyPlan={weeklyPlan}
            language={language}
            profileName={profileName}
            onCuisine={openCuisine}
            onOpenKitchen={openKitchen}
            onQuickRecipes={() => { setDiscoverCategory("Quick Meals"); setScreen("discover"); }}
          />
        )}
        {hydrated && activeScreen === "what-can-i-cook" && (
          <WhatCanICookScreen
            onNavigate={navigate}
            onResults={handleCookResults}
            initialIngredients={resumeCookQuery ? cookQuery.ingredients : ownedIngredientNames}
            initialEquipment={resumeCookQuery ? cookQuery.equipment : kitchenEquipment}
            initialDiet={resumeCookQuery ? cookQuery.diet : mealPlanConfig.diet}
            initialTime={resumeCookQuery ? cookQuery.time : "Any"}
            initialDifficulty={resumeCookQuery ? cookQuery.difficulty : "Any"}
            initialStep={resumeCookQuery ? 3 : 1}
            onBack={() => setScreen("home")}
          />
        )}
        {hydrated && activeScreen === "matching" && <MatchingScreen onDone={() => setScreen("results")} />}
        {hydrated && activeScreen === "results" && (
          <ResultsScreen
            onNavigate={navigate}
            onRecipe={(r) => openRecipe(r, "results")}
            recipes={filteredCookResults}
            queryIngredients={cookQuery.ingredients}
            onEditSearch={() => { setResumeCookQuery(true); setScreen("what-can-i-cook"); }}
          />
        )}
        {hydrated && activeScreen === "discover" && (
          <DiscoverScreen
            onRecipe={(r) => openRecipe(r, "discover")}
            ownedIngredients={ownedIngredientNames}
            ownedEquipment={kitchenEquipment}
            defaultDiet={mealPlanConfig.diet}
            recentSearches={recentSearches}
            onCommitSearch={commitSearch}
            onClearRecent={() => setRecentSearches([])}
            onCuisine={openCuisine}
            initialCategory={discoverCategory}
          />
        )}
        {hydrated && activeScreen === "cuisine" && (
          <CuisineScreen
            cuisine={selectedCuisine}
            onBack={() => setScreen(cuisineBackTo)}
            onRecipe={(r) => openRecipe(r, "cuisine")}
            ownedIngredients={ownedIngredientNames}
            savedIds={savedIds}
            onToggleSave={toggleSaved}
          />
        )}
        {hydrated && activeScreen === "saved" && (
          <SavedScreen
            onRecipe={(r) => openRecipe(r, "saved")}
            savedIds={savedIds}
            cookedIds={cookedIds}
            collections={collections}
            onCreateCollection={createCollection}
            onToggleSave={toggleSaved}
            onToggleCollection={toggleRecipeInCollection}
          />
        )}
        {hydrated && activeScreen === "profile" && (
          <ProfileScreen
            onNavigate={navigate}
            stats={{ cooked: cookedRecipes.length, saved: savedRecipes.length, cuisines: cuisinesTried.length }}
            cuisines={cuisinesTried}
            mealPlan={mealPlanConfig}
            diet={mealPlanConfig.diet}
            onSetDiet={(d) => setMealPlanConfig((prev) => ({ ...prev, diet: d }))}
            language={language}
            onSetLanguage={setLanguage}
            units={units}
            onSetUnits={setUnits}
            personalizedRecommendations={personalizedRecommendations}
            onSetPersonalizedRecommendations={setPersonalizedRecommendations}
            profileName={profileName}
            accountEmail={session?.kind === "user" ? session.user.email : ""}
            isGuest={session?.kind === "guest"}
            onSetProfileName={setProfileName}
            onCreateAccount={handleCreateAccount}
            onLogout={handleLogout}
          />
        )}
        {hydrated && activeScreen === "recipe-detail" && (
          <RecipeDetailScreen
            recipe={selectedRecipe}
            onBack={() => setScreen(detailBackTo)}
            onCook={() => setScreen("cooking-mode")}
            ownedIngredients={ownedIngredientNames}
            ownedEquipment={kitchenEquipment}
            saved={savedIds.includes(selectedRecipe.id)}
            onToggleSave={() => toggleSaved(selectedRecipe.id)}
            units={units}
            collections={collections}
            onToggleCollection={toggleRecipeInCollection}
            substitutions={substitutions.recipeId === selectedRecipe.id ? substitutions.map : {}}
            onSetSubstitution={(ingredientName, substitute) =>
              setSubstitutions((prev) => {
                const map = prev.recipeId === selectedRecipe.id ? { ...prev.map } : {};
                if (substitute) map[ingredientName] = substitute;
                else delete map[ingredientName];
                return { recipeId: selectedRecipe.id, map };
              })
            }
            onAddToKitchen={(ingredientName) => {
              upsertIngredient({ name: ingredientName, qty: "1", category: "Other", expiry: "" });
              setSubstitutions((prev) => {
                const map = { ...prev.map };
                delete map[ingredientName];
                return { ...prev, map };
              });
            }}
          />
        )}
        {hydrated && activeScreen === "cooking-mode" && (
          <CookingModeScreen
            recipe={selectedRecipe}
            onBack={() => setScreen("recipe-detail")}
            onComplete={handleCookingComplete}
            substitutions={substitutions.recipeId === selectedRecipe.id ? substitutions.map : {}}
            units={units}
          />
        )}
        {hydrated && activeScreen === "completion" && (
          <CompletionScreen
            recipe={selectedRecipe}
            onBack={() => setScreen("cooking-mode")}
            onHome={() => setScreen("home")}
            onShare={handleShare}
            savedIds={savedIds}
            onToggleSave={toggleSaved}
            ownedIngredients={ownedIngredientNames}
            onRecipe={(r) => openRecipe(r, "home")}
            stepsCompleted={stepsCompleted}
            myRating={myRatings[selectedRecipe.id] ?? 0}
            onRate={(stars) => handleRate(selectedRecipe.id, stars)}
          />
        )}
        {hydrated && activeScreen === "my-kitchen" && (
          <MyKitchenScreen
            onBack={() => setScreen(screenBackTo)}
            ingredients={kitchenIngredients}
            equipment={kitchenEquipment}
            onAddIngredient={upsertIngredient}
            onRemoveIngredient={(name) => setKitchenIngredients((prev) => prev.filter((i) => i.name !== name))}
            onToggleEquipment={(name) => setKitchenEquipment((prev) => (prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]))}
            initialTab={kitchenTab}
            onFindRecipes={() => navigate("what-can-i-cook")}
          />
        )}
        {hydrated && activeScreen === "notifications" && (
          <NotificationsScreen
            onBack={() => setScreen(screenBackTo)}
            notifications={notifications}
            readIds={readNotificationIds}
            onOpen={openNotification}
            onMarkAllRead={() => setReadNotificationIds((prev) => Array.from(new Set([...prev, ...notifications.map((n) => n.id)])))}
          />
        )}

        {hydrated && showNav && <BottomNav active={screen} onChange={navigate} />}

        {toast && (
          <div role="status" className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg z-30 animate-float-up max-w-[90%] text-center">
            {toast}
          </div>
        )}
      </div>
    </div>
    </LanguageContext.Provider>
  );
}
