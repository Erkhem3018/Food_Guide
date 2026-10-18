// Maps recipe ingredients to products on nomin.mn so grocery lists can show live
// prices. Shared by the browser (to decide what to ask for) and the /api/nomin-prices
// function (to search Nomin and pick the right product).
//
// Each catalog item says how to find a sensible everyday product on Nomin:
//   q      – what to type into Nomin's search
//   must   – words the product name must contain (lowercase, any one group of
//            alternatives separated by "|" must match)
//   not    – words that rule a product out (sauces, snacks, pet food, …)
//   maxQty – largest pack worth considering, in grams/ml (or pieces for eggs), so
//            a 25 kg sack of flour doesn't win on price per kilo
export type NominItem = {
  key: string;
  q: string;
  must: string[];
  not?: string[];
  maxQty?: number;
  // true = only Nomin's fresh-food section (raw produce, eggs, dairy, fresh meat)
  fresh?: boolean;
};

// Nomin's top-level food sections (collection ids on every product).
export const NOMIN_FRESH_FOOD = "38071";
export const NOMIN_PROCESSED_FOOD = "38029";

// Never a cooking ingredient, whatever the search matched.
const COMMON_NOT = [
  "соус", "чипс", "жигнэмэг", "шоколад", "мөхөөлдөс", "ундаа", "зөөлөн чихэр", "чихэрийн", "цай", "бэлэн гоймон", "бэлэн хоол",
  "хүүхдийн", "компот", "өрмөнцөр", "смүүти", "спред", "кекс", "боов", "зууш", "үр ", "үрийн",
];
// Fresh produce must be the raw thing, not dried, pickled, canned or powdered.
const PROCESSED_NOT = ["нухаш", "майонез", "дарсан", "хатаасан", "даршилсан", "даршлагдсан", "лааз", "нөөшилсөн", "нунтаг", "амтлагч", "шүүс", "чанамал", "паст", "зуурмаг"];

export const NOMIN_CATALOG: NominItem[] = [
  // ── Meat & eggs (raw beef, lamb, mince, fresh fish and shrimp aren't sold on nomin.mn)
  { key: "chicken-breast", q: "тахианы цээж мах", must: ["тахиа", "цээж"], not: ["утсан", "далайн", ...PROCESSED_NOT], maxQty: 2000, fresh: true },
  { key: "chicken-thigh", q: "тахианы гуя", must: ["тахиа", "гуя|мөч|хөл"], not: ["утсан", ...PROCESSED_NOT], maxQty: 2000, fresh: true },
  { key: "pork", q: "гахайн мах", must: ["гахай"], not: ["утсан", "амталсан", "жигнэсэн", "шарж", "лааз", "хиам", "зайдас"], maxQty: 2000 },
  { key: "bacon", q: "бекон", must: ["бекон|бэкон"], maxQty: 1000 },
  { key: "sausage", q: "братвурст", must: ["братвурст|сосиск|колбас"], maxQty: 1500 },
  { key: "eggs", q: "өндөг", must: ["өндөг"], not: ["гоймон"], maxQty: 30, fresh: true },

  // ── Dairy
  { key: "milk", q: "үнээний сүү", must: ["сүү"], not: ["коктейль", "өтгөрүүлсэн", "кокос", "буурцаг", "тараг", "хуурай", "крем"], maxQty: 2000, fresh: true },
  { key: "butter", q: "цөцгийн тос", must: ["цөцгийн тос|масло"], not: ["маргарин", "ургамлын"], maxQty: 1000, fresh: true },
  { key: "cream", q: "сүүн крем", must: ["крем|сливк|цөцгий"], not: ["тос", "бяслаг", "ургамлын", "хөөсрүүлдэг", "булочка", "цөцгийтэй"], maxQty: 1000, fresh: true },
  { key: "yogurt", q: "тараг", must: ["тараг|йогурт"], not: ["жимс", "сахартай", "амттай"], maxQty: 1500, fresh: true },
  { key: "cheese", q: "бяслаг", must: ["бяслаг"], not: ["снэк", "гоймон"], maxQty: 1000, fresh: true },
  { key: "parmesan", q: "пармезан", must: ["пармезан|parmesan"], maxQty: 500 },
  { key: "mozzarella", q: "моцарелла", must: ["моцарел|mozzarel"], maxQty: 1000 },
  { key: "feta", q: "фета", must: ["фета|feta"], maxQty: 1000 },
  { key: "mascarpone", q: "маскарпоне", must: ["маскарпоне|mascarpone"], maxQty: 1000 },

  // ── Grains, pasta, bread
  { key: "flour", q: "гурил", must: ["гурил"], not: ["овьёос", "эрдэнэ", "будааны", "наалдамхай", "хэрчсэн"], maxQty: 5000 },
  { key: "rice", q: "цагаан будаа", must: ["будаа"], not: ["гоймон", "гурил", "цуу", "шарсан", "шаршигнуур", "киноа", "шар будаа", "сагаг", "хагд"], maxQty: 5000 },
  { key: "pasta", q: "гоймон", must: ["гоймон|макарон|паста|спагетти"], not: ["будааны", "рамен", "шөл", "хэрчсэн"], maxQty: 2000 },
  { key: "spaghetti", q: "спагетти", must: ["спагетти|spaghetti"], maxQty: 2000 },
  { key: "ramen", q: "удон гоймон", must: ["удон|рамен|ramen|гоймон"], not: ["амтат"], maxQty: 2000 },
  { key: "bread", q: "талх", must: ["талх"], not: ["үйрмэг", "соёолж"], maxQty: 1500, fresh: true },

  // ── Vegetables & fruit (fresh section only)
  { key: "onion", q: "шар сонгино", must: ["сонгино"], not: ["ногоон", ...PROCESSED_NOT], maxQty: 5000, fresh: true },
  { key: "green-onion", q: "ногоон сонгино", must: ["ногоон|нарийн", "сонгино"], not: PROCESSED_NOT, maxQty: 1000, fresh: true },
  { key: "garlic", q: "сармис", must: ["сармис"], not: PROCESSED_NOT, maxQty: 1000, fresh: true },
  { key: "potato", q: "төмс", must: ["төмс"], not: ["фри", "пюре", ...PROCESSED_NOT], maxQty: 5000, fresh: true },
  { key: "carrot", q: "лууван", must: ["лууван"], not: ["салат", "солонгос", "холимог", ...PROCESSED_NOT], maxQty: 3000, fresh: true },
  { key: "cabbage", q: "байцаа", must: ["байцаа"], not: ["далайн", "кимчи", "салат", ...PROCESSED_NOT], maxQty: 5000, fresh: true },
  { key: "tomato", q: "улаан лооль", must: ["улаан лооль|помидор"], not: PROCESSED_NOT, maxQty: 3000, fresh: true },
  { key: "tomato-paste", q: "улаан лоолийн паста", must: ["улаан лоол|томат"], not: ["кетчуп", "шүүс", "лечо"], maxQty: 1500 },
  { key: "cucumber", q: "өргөст хэмх", must: ["өргөст хэмх"], not: PROCESSED_NOT, maxQty: 3000, fresh: true },
  { key: "bell-pepper", q: "амтат чинжүү", must: ["чинжүү|перец"], not: ["хар перец", "лечо", ...PROCESSED_NOT], maxQty: 2000, fresh: true },
  { key: "chili", q: "халуун чинжүү", must: ["чинжүү"], not: ["амтат", ...PROCESSED_NOT], maxQty: 1000, fresh: true },
  { key: "spinach", q: "бууцай", must: ["бууцай"], not: PROCESSED_NOT, maxQty: 1000, fresh: true },
  { key: "mushroom", q: "мөөг", must: ["мөөг"], not: ["бяслаг", "мөөгтэй", "шампиньон", ...PROCESSED_NOT], maxQty: 1500 },
  { key: "avocado", q: "авокадо", must: ["авокадо"], not: ["тос", ...PROCESSED_NOT], maxQty: 2000, fresh: true },
  { key: "lemon", q: "нимбэг", must: ["нимбэг"], not: PROCESSED_NOT, maxQty: 2000, fresh: true },
  { key: "ginger", q: "цагаан гаа", must: ["цагаан гаа|имбир"], not: PROCESSED_NOT, maxQty: 1000, fresh: true },
  { key: "apple", q: "алим кг", must: ["алим"], not: PROCESSED_NOT, maxQty: 3000, fresh: true },
  { key: "bean-sprouts", q: "шошны соёо", must: ["соёо"], not: ["талх", "боов", "сүү"], maxQty: 1000, fresh: true },
  { key: "kimchi", q: "кимчи", must: ["кимчи|kimchi"], maxQty: 2000 },
  { key: "pineapple", q: "хан боргоцой", must: ["хан боргоцой|ананас"], not: ["коктейль", "холимог"], maxQty: 1000 },
  { key: "corn", q: "амтат эрдэнэ шиш", must: ["эрдэнэ шиш|эрдэнэшиш|кукуруз"], not: ["гурил", "цардуул"], maxQty: 1000 },
  { key: "peas", q: "ногоон вандуй", must: ["вандуй|горох"], not: ["лууван", "холимог", "нут"], maxQty: 1000 },
  { key: "beans", q: "улаан шош", must: ["шош|фасоль|bohnen"], not: ["соёо", "холимог", "томаттай", "хумус"], maxQty: 1000 },
  { key: "chickpeas", q: "хумус шош", must: ["хумус шош|kicher|нут вандуй"], maxQty: 1000 },
  { key: "olives", q: "ногоон олив", must: ["олив|чидун"], not: ["тос", "шахдас"], maxQty: 1000 },

  // ── Pantry
  { key: "oil", q: "ургамлын тос", must: ["тос"], not: ["олив", "цөцгийн", "самрын", "гүнжид", "авокадо", "тостой"], maxQty: 2000 },
  { key: "olive-oil", q: "оливын тос", must: ["олив"], not: ["наранцэц", "наран цэцэг", "шахдас"], maxQty: 1000 },
  { key: "sesame-oil", q: "гүнжидийн тос", must: ["гүнжид|кунжут|sesame"], maxQty: 1000 },
  { key: "sugar", q: "элсэн чихэр", must: ["элсэн чихэр|сахар"], not: ["нунтаг", "ёотон"], maxQty: 3000 },
  { key: "honey", q: "зөгийн бал", must: ["зөгийн бал|мёд"], maxQty: 1000 },
  { key: "salt", q: "давс", must: ["давс"], not: ["самар", "загас", "давсалсан"], maxQty: 2000 },
  { key: "black-pepper", q: "хар перец", must: ["хар перец|перец хар"], maxQty: 500 },
  { key: "soy-sauce", q: "шар буурцгийн сүмс", must: ["сүмс|соевый|soy"], maxQty: 1500 },
  { key: "vinegar", q: "цуу", must: ["цуу|уксус"], maxQty: 1500 },
  { key: "ketchup", q: "кетчуп", must: ["кетчуп"], maxQty: 1500 },
  { key: "mayonnaise", q: "майонез", must: ["майонез"], not: ["авокадо", "оливтой"], maxQty: 1500 },
  { key: "mustard", q: "гич", must: ["гич|горчиц|mustard"], maxQty: 1000 },
  { key: "peanut-butter", q: "газрын самрын нухаш", must: ["нухаш|тос|butter", "самр|самар|peanut"], not: ["баар", "шоколад", "кашью", "алмонд"], maxQty: 1500 },
  { key: "peanuts", q: "газрын самар", must: ["самар|арахис"], not: ["нухаш", "крем", "хуш", "давсалсан"], maxQty: 1000 },
  { key: "walnuts", q: "хушга", must: ["хушга|грецк|walnut"], not: ["тараг", "сүү"], maxQty: 1000 },
  { key: "paprika", q: "паприка", must: ["паприка|paprika"], not: ["зайдас", "гриль"], maxQty: 500 },
  { key: "cinnamon", q: "шанц", must: ["шанц|корица|cinnamon|синамон"], maxQty: 500 },
  { key: "curry", q: "карри нунтаг", must: ["карри|curry"], not: ["зайдас"], maxQty: 500 },
  { key: "gochujang", q: "гочужан", must: ["гочужан|кочхужан|gochujang"], maxQty: 1500 },
  { key: "baking-powder", q: "хөөлгөх нунтаг", must: ["хөөлгө|разрыхлит|baking|бакпульвер"], maxQty: 500 },
  { key: "cocoa", q: "какао нунтаг", must: ["какао"], not: ["жигнэмэг", "халуун шоколад"], maxQty: 1000 },
  { key: "tofu", q: "дүпү", must: ["тофу|tofu|дүпү"], maxQty: 2000 },
  { key: "coffee", q: "нунтаг кофе", must: ["кофе"], not: ["3 in 1", "3-ийг", "3-ыг", "түргэн уусдаг", "латте", "найруулдаг"], maxQty: 1000 },
  { key: "cornstarch", q: "цардуул", must: ["цардуул|крахмал"], maxQty: 1000 },
  { key: "stock", q: "шөлний кубик", must: ["шөл|бульон|кубик"], not: ["гоймон", "аяга"], maxQty: 1000 },
];

for (const item of NOMIN_CATALOG) item.not = [...(item.not ?? []), ...COMMON_NOT];

export const NOMIN_CATALOG_BY_KEY = new Map(NOMIN_CATALOG.map((i) => [i.key, i]));

// English ingredient words → catalog key. Longest phrase wins, so "peanut butter"
// beats "butter" and "rice vinegar" beats "rice". Whole words only.
const INGREDIENT_RULES: [string, string][] = [
  ["chicken breast", "chicken-breast"], ["chicken thigh", "chicken-thigh"], ["chicken drumstick", "chicken-thigh"],
  ["chicken thighs and legs", "chicken-thigh"], ["chicken bones", "chicken-thigh"], ["chicken", "chicken-thigh"],
  ["ground beef", "ground-beef"], ["ground pork", "ground-beef"], ["ground lamb", "ground-beef"], ["ground mutton", "ground-beef"],
  ["beef", "beef"], ["pork", "pork"], ["pork belly", "pork"], ["pork shoulder", "pork"], ["pork rib", "pork"],
  ["lamb", "lamb"], ["mutton", "lamb"], ["bacon", "bacon"], ["guanciale", "bacon"], ["pancetta", "bacon"],
  ["sausage", "sausage"], ["bratwurst", "sausage"], ["shrimp", "shrimp"],
  ["fish", "fish"], ["cod", "fish"], ["white fish", "fish"], ["egg", "eggs"], ["eggs", "eggs"], ["egg yolks", "eggs"], ["hard-boiled eggs", "eggs"], ["soft-boiled eggs", "eggs"],
  ["milk", "milk"], ["buttermilk", "milk"], ["butter", "butter"], ["heavy cream", "cream"], ["sour cream", "cream"], ["cream", "cream"],
  ["yogurt", "yogurt"], ["cheese", "cheese"], ["cheddar", "cheese"], ["farmer's cheese", "cheese"], ["parmesan", "parmesan"], ["pecorino", "parmesan"],
  ["mozzarella", "mozzarella"], ["feta", "feta"], ["mascarpone", "mascarpone"],
  ["flour", "flour"], ["all-purpose flour", "flour"], ["rice", "rice"], ["pasta", "pasta"], ["penne", "pasta"], ["egg noodles", "pasta"],
  ["spaghetti", "spaghetti"], ["rice noodles", "rice-noodles"], ["ramen noodles", "ramen"], ["noodles", "pasta"],
  ["bread", "bread"], ["baguette", "bread"], ["buns", "bread"], ["burger buns", "bread"], ["tortilla", "tortilla"], ["tortillas", "tortilla"],
  ["onion", "onion"], ["onions", "onion"], ["shallots", "onion"], ["scallions", "green-onion"], ["green onions", "green-onion"],
  ["garlic", "garlic"], ["potato", "potato"], ["potatoes", "potato"], ["carrot", "carrot"], ["carrots", "carrot"],
  ["cabbage", "cabbage"], ["napa cabbage", "cabbage"], ["sauerkraut", "cabbage"],
  ["tomato", "tomato"], ["tomatoes", "tomato"], ["crushed tomatoes", "tomato-paste"], ["tomato puree", "tomato-paste"],
  ["cucumber", "cucumber"], ["bell pepper", "bell-pepper"], ["bell peppers", "bell-pepper"],
  ["chili", "chili"], ["chilies", "chili"], ["jalapeño", "chili"], ["scotch bonnet", "chili"],
  ["spinach", "spinach"], ["eggplant", "eggplant"], ["zucchini", "zucchini"], ["mushrooms", "mushroom"],
  ["avocado", "avocado"], ["avocados", "avocado"], ["lemon", "lemon"], ["lemon juice", "lemon"], ["lime", "lime"], ["lime juice", "lime"],
  ["ginger", "ginger"], ["apple", "apple"], ["pineapple", "pineapple"], ["corn", "corn"], ["corn kernels", "corn"],
  ["peas", "peas"], ["green peas", "peas"], ["black beans", "beans"], ["beans", "beans"], ["chickpeas", "chickpeas"],
  ["bean sprouts", "bean-sprouts"], ["kimchi", "kimchi"], ["cilantro", "herbs"], ["basil", "herbs"], ["thai basil", "herbs"], ["thyme", "herbs"],
  ["olives", "olives"], ["green olives", "olives"],
  ["oil", "oil"], ["vegetable oil", "oil"], ["olive oil", "olive-oil"], ["sesame oil", "sesame-oil"],
  ["sugar", "sugar"], ["brown sugar", "sugar"], ["honey", "honey"], ["salt", "salt"], ["black pepper", "black-pepper"], ["peppercorns", "black-pepper"],
  ["soy sauce", "soy-sauce"], ["vinegar", "vinegar"], ["rice vinegar", "vinegar"], ["white vinegar", "vinegar"], ["fish sauce", "fish-sauce"],
  ["ketchup", "ketchup"], ["mayonnaise", "mayonnaise"], ["mustard", "mustard"], ["coconut milk", "coconut-milk"],
  ["peanut butter", "peanut-butter"], ["peanuts", "peanuts"], ["roasted peanuts", "peanuts"], ["walnuts", "walnuts"],
  ["cumin", "cumin"], ["paprika", "paprika"], ["smoked paprika", "paprika"], ["cinnamon", "cinnamon"], ["curry", "curry"], ["garam masala", "curry"],
  ["gochujang", "gochujang"], ["miso", "miso"], ["baking powder", "baking-powder"], ["cocoa", "cocoa"],
  ["tofu", "tofu"], ["espresso", "coffee"], ["cornstarch", "cornstarch"], ["stock", "stock"],
];
const RULES_BY_LENGTH = [...INGREDIENT_RULES].sort((a, b) => b[0].length - a[0].length);

// Words that change what an ingredient is, so a shorter rule must not match:
// "peanut butter" isn't butter, "coconut milk" isn't milk, "rice flour" isn't flour.
const BLOCKERS: Record<string, string[]> = {
  butter: ["peanut"], milk: ["coconut"], flour: ["rice", "glutinous", "corn"], oil: ["sesame", "olive"],
  rice: ["vinegar", "noodles", "flour", "paper"], cream: ["ice"], cheese: ["cream cheese"], egg: ["eggplant"],
  chicken: ["stock"], beef: ["stock", "bones"], fish: ["sauce", "stock"], tomato: ["paste"], pepper: ["bell"],
};

export function nominKeyForIngredient(name: string): string | null {
  const n = name.toLowerCase();
  for (const [phrase, key] of RULES_BY_LENGTH) {
    const re = new RegExp(`(?<![a-zà-ÿ])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-zà-ÿ])`);
    if (!re.test(n)) continue;
    if ((BLOCKERS[phrase] ?? []).some((b) => n.includes(b))) continue;
    // Some ingredients are recognised but not sold on nomin.mn (fresh beef, fish,
    // limes…). Returning null keeps them on the estimated price instead of matching
    // a shorter, wrong rule.
    return NOMIN_CATALOG_BY_KEY.has(key) ? key : null;
  }
  return null;
}

// "Сармис 250гр", "Сүү 1 л", "Өндөг, 15 ширхэг", "Авокадо (кг)" → grams / ml / pieces.
export function packQuantity(productName: string): { amount: number; unit: "g" | "ml" | "pcs" } | null {
  const s = productName.toLowerCase().replace(/(\d),(\d)/g, "$1.$2");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(кг|kg|гр|г|g|мл|ml|л|l|литр|ширхэг|ш)(?![a-zа-яөүё])/);
  if (!m) return /(^|[^a-zа-яөүё])кг(?![a-zа-яөүё])/.test(s) ? { amount: 1000, unit: "g" } : null;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "кг": case "kg": return { amount: n * 1000, unit: "g" };
    case "гр": case "г": case "g": return { amount: n, unit: "g" };
    case "л": case "l": case "литр": return { amount: n * 1000, unit: "ml" };
    case "мл": case "ml": return { amount: n, unit: "ml" };
    default: return { amount: n, unit: "pcs" };
  }
}

export type NominProduct = {
  name: string;
  price: number;
  regularPrice: number;
  url: string;
  inStock: boolean;
  section: "fresh" | "processed" | null;
  perKg: boolean;
};

// Words match from the start of a word: "цай" (tea) must not hit "шанцай"
// (cinnamon), while "тахиа" still matches "тахианы". A trailing space means the
// exact word only ("үр " is seeds, not "үрлэн").
function hasWord(name: string, word: string): boolean {
  const exact = word.endsWith(" ");
  const w = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zа-яөүё])${w}${exact ? "(?![a-zа-яөүё])" : ""}`).test(name);
}

// Picks the best everyday product for a catalog item from Nomin search results:
// food sections only, in stock, name matches and isn't ruled out, not an oversized
// pack. Among the first few that pass (Nomin's own relevance order) take the best
// value per gram/ml/piece, or simply the first one when sizes aren't listed.
export function pickNominProduct(item: NominItem, products: NominProduct[]): NominProduct | null {
  const sizeOf = (p: NominProduct) => (p.perKg ? { amount: 1000, unit: "g" as const } : packQuantity(p.name));
  const ok = products.filter((p) => {
    const name = p.name.toLowerCase();
    if (!p.inStock || !(p.price > 0) || !p.section) return false;
    if (item.fresh && p.section !== "fresh") return false;
    if (!item.must.every((group) => group.split("|").some((w) => hasWord(name, w)))) return false;
    if ((item.not ?? []).some((w) => hasWord(name, w))) return false;
    const pack = sizeOf(p);
    if (pack && item.maxQty && pack.amount > item.maxQty) return false;
    return true;
  });
  const top = ok.slice(0, 6);
  if (top.length === 0) return null;
  const sized = top
    .map((p) => ({ p, pack: sizeOf(p) }))
    .filter((x) => x.pack && (x.pack.unit === "pcs" || x.pack.amount >= 100));
  if (sized.length >= Math.ceil(top.length / 2)) {
    sized.sort((a, b) => a.p.price / a.pack!.amount - b.p.price / b.pack!.amount);
    return sized[0].p;
  }
  return top[0];
}
