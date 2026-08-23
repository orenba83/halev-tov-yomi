import { createServerFn } from "@tanstack/react-start";
import type { Food } from "./types";

type RecordMap = Record<string, unknown>;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("he-IL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const numberOrZero = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const mapOff = (p: RecordMap): Food | null => {
  const n = (p.nutriments ?? {}) as RecordMap;
  const cal = numberOrZero(
    n["energy-kcal_100g"] ?? (n["energy_100g"] ? numberOrZero(n["energy_100g"]) / 4.184 : 0),
  );
  const name = String(p["product_name_he"] ?? p["product_name"] ?? "").trim();
  if (!name || cal <= 0) return null;
  const brand = String(p["brands"] ?? "").split(",")[0]?.trim();
  const display =
    brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} · ${brand}` : name;
  const serving = numberOrZero(p["serving_quantity"]);
  return {
    id: `off:${String(p["code"] ?? display)}`,
    name: display,
    calories: Math.round(cal),
    protein: +numberOrZero(n["proteins_100g"]).toFixed(1),
    carbs: +numberOrZero(n["carbohydrates_100g"]).toFixed(1),
    fat: +numberOrZero(n["fat_100g"]).toFixed(1),
    ...(serving > 0 ? { serving } : {}),
  };
};

const mapUsda = (p: RecordMap): Food | null => {
  const name = String(p["description"] ?? "").trim();
  const nutrients = Array.isArray(p["foodNutrients"]) ? (p["foodNutrients"] as RecordMap[]) : [];
  const nutrient = (ids: number[]) =>
    numberOrZero(nutrients.find((n) => ids.includes(numberOrZero(n["nutrientId"])))?.["value"]);
  const cal = nutrient([1008, 2047]);
  if (!name || cal <= 0) return null;
  const brand = String(p["brandOwner"] ?? p["brandName"] ?? "").trim();
  const display =
    brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} · ${brand}` : name;
  return {
    id: `usda:${String(p["fdcId"] ?? display)}`,
    name: display,
    calories: Math.round(cal),
    protein: +nutrient([1003]).toFixed(1),
    carbs: +nutrient([1005]).toFixed(1),
    fat: +nutrient([1004]).toFixed(1),
  };
};

/**
 * מרחיב חיפוש קצר/כללי לווריאציות מגוונות בעברית ובאנגלית.
 * דוגמה: "פסטה" → פסטה יבשה, ספגטי, פנה, פסטה עם רוטב, וכו'.
 */
const expandQueries = (q: string): string[] => {
  const n = normalize(q);
  const groups: Array<[RegExp, string[]]> = [
    // —— פסטה ——
    [
      /^(פסטה|pasta|ספגטי|spaghetti|פנה|penne|מקרוני|macaroni)$/,
      [
        "פסטה",
        "פסטה מבושלת",
        "פסטה יבשה",
        "ספגטי",
        "פנה",
        "מקרוני",
        "פסטה עם רוטב עגבניות",
        "פסטה בולונז",
        "פסטה קרבונרה",
        "פסטה ברוטב שמנת",
        "פסטה עם טונה",
        "לזניה",
        "ניוקי",
        "קוסקוס",
        "pasta cooked",
        "spaghetti",
        "penne pasta",
        "pasta with sauce",
      ],
    ],
    // —— אורז ——
    [
      /^(אורז|rice)$/,
      [
        "אורז לבן מבושל",
        "אורז מלא",
        "אורז בסמטי",
        "אורז יסמין",
        "אורז עם ירקות",
        "מג'דרה",
        "white rice cooked",
        "brown rice",
        "basmati rice",
      ],
    ],
    // —— לחם ——
    [
      /^(לחם|bread|פרוסה)$/,
      [
        "לחם אחיד",
        "לחם מלא",
        "לחם קל",
        "לחם שיפון",
        "פיתה",
        "פיתה מלאה",
        "לחמנייה",
        "בגט",
        "טוסט",
        "whole wheat bread",
        "white bread",
      ],
    ],
    // —— עוף ——
    [
      /^(עוף|חזה עוף|שוק עוף|chicken)$/,
      [
        "חזה עוף",
        "חזה עוף בגריל",
        "שוק עוף",
        "כנף עוף",
        "עוף צלוי",
        "שניצל עוף",
        "chicken breast",
        "grilled chicken",
      ],
    ],
    // —— בשר ——
    [
      /^(בשר|בקר|hamburger|המבורגר)$/,
      [
        "בשר בקר טחון",
        "המבורגר",
        "סטייק",
        "שניצל בקר",
        "קציצות בקר",
        "ground beef",
        "beef steak",
      ],
    ],
    // —— ביצים ——
    [
      /^(ביצה|ביצים|egg|eggs)$/,
      [
        "ביצה קשה",
        "ביצת עין",
        "חביתה",
        "חלבון ביצה",
        "ביצה מקושקשת",
        "egg boiled",
        "fried egg",
        "omelette",
      ],
    ],
    // —— חלב / גבינות ——
    [
      /^(חלב|milk)$/,
      ["חלב 3%", "חלב 1%", "חלב 0%", "חלב סויה", "חלב שקדים", "whole milk", "skim milk"],
    ],
    [
      /^(קוטז|קוטג|קוטג גבינה|cottage|cottage cheese)$/,
      ["קוטג", "קוטג' 5%", "קוטג' 3%", "קוטג' 1%", "גבינת קוטג", "cottage cheese"],
    ],
    [
      /^(גבינה לבנה|גבינה)$/,
      ["גבינה לבנה", "גבינה לבנה 5%", "גבינה צהובה", "גבינה בולגרית", "white cheese", "fresh cheese"],
    ],
    [
      /^(יוגורט|יוגורט טבעי|yogurt)$/,
      [
        "יוגורט טבעי",
        "יוגורט יווני",
        "יוגורט 0%",
        "יוגורט עם פירות",
        "יוגורט פרו",
        "yogurt",
        "Greek yogurt",
      ],
    ],
    // —— טונה / דגים ——
    [
      /^(טונה|tuna)$/,
      ["טונה במים", "טונה בשמן", "סלט טונה", "טונה מעושנת", "tuna in water", "canned tuna"],
    ],
    [
      /^(דג|סלמון|salmon|דגים)$/,
      ["סלמון", "סלמון אפוי", "פילה דג", "דג אמנון", "salmon", "baked salmon"],
    ],
    // —— סלטים / ירקות ——
    [
      /^(סלט|salad)$/,
      ["סלט ירקות", "סלט קולסלאו", "סלט טונה", "סלט ביצים", "סלט יווני", "garden salad"],
    ],
    // —— חטיפים / מתוקים ——
    [
      /^(שוקולד|chocolate)$/,
      ["שוקולד מריר", "שוקולד חלב", "חטיף שוקולד", "dark chocolate", "milk chocolate"],
    ],
    [
      /^(בננה|banana)$/,
      ["בננה", "banana"],
    ],
    [
      /^(תפוח|apple)$/,
      ["תפוח עץ", "apple"],
    ],
    // —— קפה / שתייה ——
    [
      /^(קפה|coffee)$/,
      ["קפה שחור", "קפוצ'ינו", "קפה עם חלב", "נס קפה", "black coffee", "cappuccino"],
    ],
    // —— פיצה / מזון מהיר ——
    [
      /^(פיצה|pizza)$/,
      ["פיצה", "פיצה מרגריטה", "פיצה פפרוני", "פרוסת פיצה", "pizza slice", "margherita pizza"],
    ],
    [
      /^(המבורגר|hamburger|burger)$/,
      ["המבורגר", "המבורגר עם לחמנייה", "hamburger", "beef burger"],
    ],
    // —— חומוס / מזרחי ——
    [
      /^(חומוס|hummus)$/,
      ["חומוס מוכן", "חומוס עם טחינה", "פיתה עם חומוס", "hummus"],
    ],
    [
      /^(פלאפל|falafel)$/,
      ["פלאפל", "פיתה פלאפל", "falafel"],
    ],
  ];

  for (const [rx, values] of groups) {
    if (rx.test(n)) return values;
  }

  // אם אין קבוצה מוכנה — נחפש גם בעברית וגם באנגלית גולמית
  const extras: string[] = [q];
  if (/[\u0590-\u05FF]/.test(q)) {
    // מונח בעברית בלי תרגום ידוע — עדיין מחפשים אותו כמו שהוא
  } else {
    extras.push(q);
  }
  return extras;
};

/** מילות מפתח שמסייעות לגוון תוצאות (רוטב / מבושל / סוג וכו'). */
function diversityBucket(name: string): string {
  const n = normalize(name);
  if (/רוטב|sauce|בולונז|קרבונרה|שמנת|עגבני/.test(n)) return "sauce";
  if (/מבושל|cooked|אפוי|baked|צלוי|גריל|grilled/.test(n)) return "cooked";
  if (/יבש|dry|raw|נא/.test(n)) return "dry";
  if (/ספגטי|spaghetti/.test(n)) return "spaghetti";
  if (/פנה|penne/.test(n)) return "penne";
  if (/מקרוני|macaroni|fusilli|פוזילי|לזניה|lasagna|ניוקי|gnocchi/.test(n))
    return "shape";
  if (/שלם|מלא|whole|brown|מחיטה מלאה/.test(n)) return "whole";
  return "other";
}

/** חיפוש ברקוד: רק מוצר אמיתי ממאגר, לעולם לא הערכת קלוריות. */
export const lookupProductByBarcode = createServerFn({ method: "GET" })
  .inputValidator((data: { barcode: string }) => ({
    barcode: String(data.barcode ?? "")
      .replace(/\D/g, "")
      .slice(0, 18),
  }))
  .handler(async ({ data }): Promise<Food[]> => {
    const barcode = data.barcode;
    if (barcode.length < 8) return [];
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_he,brands,serving_quantity,nutriments`,
        { headers: { "User-Agent": "HalevTovYomi/1.0" }, signal: AbortSignal.timeout(9000) },
      );
      if (res.ok) {
        const json = (await res.json()) as { status?: number; product?: RecordMap };
        if (json.status === 1 && json.product) {
          const food = mapOff({ ...json.product, code: barcode });
          if (food) return [food];
        }
      }
    } catch {
      /* continue */
    }
    const key = process.env.USDA_API_KEY || "DEMO_KEY";
    try {
      const url =
        "https://api.nal.usda.gov/fdc/v1/foods/search?" +
        new URLSearchParams({
          api_key: key,
          query: barcode,
          pageSize: "10",
          dataType: "Branded",
        });
      const res = await fetch(url, {
        headers: { "User-Agent": "HalevTovYomi/1.0" },
        signal: AbortSignal.timeout(9000),
      });
      if (res.ok) {
        const json = (await res.json()) as { foods?: RecordMap[] };
        return (json.foods ?? [])
          .filter((p) => String(p["gtinUpc"] ?? "").replace(/\D/g, "") === barcode)
          .map(mapUsda)
          .filter(Boolean) as Food[];
      }
    } catch {
      /* no source */
    }
    return [];
  });

/** חיפוש רחב ומאוחד: Open Food Facts + USDA, כולל הרחבת מונחים מגוונת. */
export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 80) }))
  .handler(async ({ data }): Promise<Food[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];

    // עד 10 וריאציות חיפוש לגיוון (סוגים / רטבים / מבושל)
    const queries = [...new Set(expandQueries(q))].slice(0, 10);
    const usdaKey = process.env.USDA_API_KEY || "DEMO_KEY";

    const requests = queries.flatMap((search) => {
      const offUrl =
        "https://world.openfoodfacts.org/cgi/search.pl?" +
        new URLSearchParams({
          search_terms: search,
          search_simple: "1",
          action: "process",
          json: "1",
          page_size: "40",
          fields: "code,product_name,product_name_he,brands,serving_quantity,nutriments",
        });
      const usdaUrl =
        "https://api.nal.usda.gov/fdc/v1/foods/search?" +
        new URLSearchParams({
          api_key: usdaKey,
          query: search,
          pageSize: "25",
          dataType: "Foundation,SR Legacy,Branded",
        });
      return [
        fetch(offUrl, {
          headers: { "User-Agent": "HalevTovYomi/1.0" },
          signal: AbortSignal.timeout(10000),
        }),
        fetch(usdaUrl, {
          headers: { "User-Agent": "HalevTovYomi/1.0" },
          signal: AbortSignal.timeout(10000),
        }),
      ];
    });

    const results = await Promise.allSettled(requests);
    const out: Food[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.ok) continue;
      try {
        const json = (await result.value.json()) as RecordMap;
        const products = Array.isArray(json.products)
          ? json.products
          : Array.isArray(json.foods)
            ? json.foods
            : [];
        for (const p of products as RecordMap[]) {
          const food = json.products ? mapOff(p) : mapUsda(p);
          if (!food) continue;
          const key = normalize(food.name);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(food);
        }
      } catch {
        /* ignore one failed source */
      }
    }

    const nq = normalize(q);
    // דירוג: התאמה למונח + גיוון בין "דליים" (רוטב / מבושל / צורה)
    const bucketCount = new Map<string, number>();
    out.sort((a, b) => {
      const an = normalize(a.name);
      const bn = normalize(b.name);
      const matchScore = (name: string) =>
        name === nq ? 0 : name.startsWith(nq) ? 1 : name.includes(nq) ? 2 : 3;
      const ma = matchScore(an);
      const mb = matchScore(bn);
      if (ma !== mb) return ma - mb;

      // העדפה קלה לשמות בעברית בחיפוש עברי
      const heBoost = (name: string) => (/[\u0590-\u05FF]/.test(name) ? 0 : 1);
      const ha = heBoost(a.name);
      const hb = heBoost(b.name);
      if (ha !== hb) return ha - hb;

      return 0;
    });

    // Interleave by diversity bucket so results aren't all the same type
    const diversified: Food[] = [];
    const byBucket = new Map<string, Food[]>();
    for (const food of out) {
      const b = diversityBucket(food.name);
      const list = byBucket.get(b) ?? [];
      list.push(food);
      byBucket.set(b, list);
    }
    const buckets = [...byBucket.values()];
    let added = true;
    while (diversified.length < 100 && added) {
      added = false;
      for (const list of buckets) {
        if (list.length === 0) continue;
        diversified.push(list.shift()!);
        added = true;
        if (diversified.length >= 100) break;
      }
    }

    // אם החיפוש הראשוני דל — ודא שיש לפחות את הווריאציות המורחבות כשמות
    // (המקורות כבר נשלחו עם queries מורחבים)
    void bucketCount;

    return diversified.slice(0, 100);
  });
