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

const expandQueries = (q: string): string[] => {
  const n = normalize(q);
  const groups: Array<[RegExp, string[]]> = [
    [/^(פסטה|pasta|ספגטי|spaghetti|פנה|penne|מקרוני|macaroni)$/, ["פסטה", "פסטה מבושלת", "ספגטי", "פנה", "מקרוני", "פסטה בולונז", "pasta cooked", "spaghetti"]],
    [/^(אורז|rice)$/, ["אורז לבן מבושל", "אורז מלא", "אורז בסמטי", "white rice cooked", "brown rice"]],
    [/^(לחם|bread)$/, ["לחם אחיד", "לחם מלא", "פיתה", "פיתה מלאה", "whole wheat bread"]],
    [/^(עוף|חזה עוף|chicken)$/, ["חזה עוף", "חזה עוף בגריל", "שניצל עוף", "chicken breast", "grilled chicken"]],
    [/^(בשר|בקר|hamburger|המבורגר)$/, ["בשר בקר טחון", "המבורגר", "סטייק", "ground beef"]],
    [/^(ביצה|ביצים|egg|eggs)$/, ["ביצה קשה", "ביצת עין", "חביתה", "egg boiled", "omelette"]],
    [/^(חלב|milk)$/, ["חלב 3%", "חלב 1%", "חלב 0%", "whole milk", "skim milk"]],
    [/^(קוטז|קוטג|cottage|cottage cheese)$/, ["קוטג'", "קוטג' 5%", "קוטג' 1%", "cottage cheese"]],
    [/^(סינטה|sinta|sirloin)$/, ["סינטה בקר", "סטייק סינטה", "סינטה צלויה", "beef sirloin", "sirloin steak"]],
    [/^(פרו\s*0|פרו 0%|pro 0|pro zero|יוגורט פרו)$/, ["יוגורט פרו", "פרו 0%", "יוגורט פרו 0%", "strauss pro", "danone pro", "pro yogurt"]],
    [/^(פסטרמה|pastrami)$/, ["פסטרמה הודו", "פסטרמה", "פסטרמה בקר", "turkey pastrami", "pastrami"]],
    [/^(גבינה לבנה|גבינה)$/, ["גבינה לבנה", "גבינה לבנה 5%", "גבינה צהובה", "white cheese"]],
    [/^(יוגורט|yogurt)$/, ["יוגורט טבעי", "יוגורט יווני", "יוגורט 0%", "Greek yogurt"]],
    [/^(טונה|tuna)$/, ["טונה במים", "טונה בשמן", "tuna in water"]],
    [/^(דג|סלמון|salmon)$/, ["סלמון", "סלמון אפוי", "salmon", "baked salmon"]],
    [/^(סלט|salad)$/, ["סלט ירקות", "סלט טונה", "garden salad"]],
    [/^(חטיף חלבון|protein bar)$/, ["חטיף חלבון", "protein bar", "חטיף חלבון allin"]],
    [/^(אבקת חלבון|whey|protein powder)$/, ["אבקת חלבון", "whey protein", "protein powder"]],
    [/^(שוקולד|chocolate)$/, ["שוקולד מריר", "שוקולד חלב", "dark chocolate"]],
    [/^(בננה|banana)$/, ["בננה", "banana"]],
    [/^(תפוח|apple)$/, ["תפוח עץ", "apple"]],
    [/^(קפה|coffee)$/, ["קפה שחור", "קפה עם חלב", "black coffee"]],
    [/^(פיצה|pizza)$/, ["פיצה", "פיצה מרגריטה", "pizza slice"]],
    [/^(המבורגר|hamburger|burger)$/, ["המבורגר", "hamburger", "beef burger"]],
    [/^(חומוס|hummus)$/, ["חומוס מוכן", "חומוס עם טחינה", "hummus"]],
    [/^(פלאפל|falafel)$/, ["פלאפל", "פיתה פלאפל", "falafel"]],
  ];

  for (const [rx, values] of groups) {
    if (rx.test(n)) return values;
  }

  return [q];
};

function diversityBucket(name: string): string {
  const n = normalize(name);
  if (/רוטב|sauce|בולונז|קרבונרה|שמנת|עגבני/.test(n)) return "sauce";
  if (/מבושל|cooked|אפוי|baked|צלוי|גריל|grilled/.test(n)) return "cooked";
  if (/יבש|dry|raw|נא/.test(n)) return "dry";
  if (/ספגטי|spaghetti/.test(n)) return "spaghetti";
  if (/פנה|penne/.test(n)) return "penne";
  if (/מקרוני|macaroni|fusilli|פוזילי|לזניה|lasagna|ניוקי|gnocchi/.test(n)) return "shape";
  if (/שלם|מלא|whole|brown|מחיטה מלאה/.test(n)) return "whole";
  return "other";
}

export const lookupProductByBarcode = createServerFn({ method: "GET" })
  .inputValidator((data: { barcode: string }) => ({
    barcode: String(data.barcode ?? "").replace(/\D/g, "").slice(0, 18),
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

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 80) }))
  .handler(async ({ data }): Promise<Food[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];

    const queries = [...new Set(expandQueries(q))].slice(0, 10);
    const usdaKey = process.env.USDA_API_KEY || "DEMO_KEY";

    const requests = queries.flatMap((search) => {
      const offParams: Record<string, string> = {
        search_terms: search,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "40",
        fields: "code,product_name,product_name_he,brands,serving_quantity,nutriments",
      };
      if (/[\u0590-\u05FF]/.test(search)) {
        offParams["tagtype_0"] = "countries";
        offParams["tag_contains_0"] = "contains";
        offParams["tag_0"] = "israel";
      }
      const offUrl =
        "https://world.openfoodfacts.org/cgi/search.pl?" + new URLSearchParams(offParams);
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
        /* ignore */
      }
    }

    const nq = normalize(q);
    out.sort((a, b) => {
      const an = normalize(a.name);
      const bn = normalize(b.name);
      const matchScore = (name: string) =>
        name === nq ? 0 : name.startsWith(nq) ? 1 : name.includes(nq) ? 2 : 3;
      const ma = matchScore(an);
      const mb = matchScore(bn);
      if (ma !== mb) return ma - mb;
      const heBoost = (name: string) => (/[\u0590-\u05FF]/.test(name) ? 0 : 1);
      const ha = heBoost(a.name);
      const hb = heBoost(b.name);
      if (ha !== hb) return ha - hb;
      return 0;
    });

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

    return diversified.slice(0, 100);
  });
