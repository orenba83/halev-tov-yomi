import { createServerFn } from "@tanstack/react-start";
import type { Food } from "./types";

type OffProduct = Record<string, unknown>;
type UsdaFood = Record<string, unknown>;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("he-IL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[·•|]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const numberOrZero = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * חיפוש מאוחד במאגרי מזון חינמיים:
 * 1. Open Food Facts - מוצרים ארוזים, ברקודים ומוצרים ישראליים.
 * 2. USDA FoodData Central - מזונות בסיסיים ומזונות ממותגים.
 *
 * שני המקורות נגישים ללא עלות. USDA משתמש ב-DEMO_KEY כברירת מחדל;
 * ניתן להגדיר USDA_API_KEY בשרת לקבלת מכסת API גבוהה יותר בחשבון USDA חינמי.
 */
export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 80) }))
  .handler(async ({ data }): Promise<Food[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];

    const offUrl =
      "https://world.openfoodfacts.org/cgi/search.pl?" +
      new URLSearchParams({
        search_terms: q,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "40",
        fields: "code,product_name,product_name_he,brands,quantity,serving_quantity,nutriments",
      }).toString();

    const usdaKey = process.env.USDA_API_KEY || "DEMO_KEY";
    const usdaUrl =
      "https://api.nal.usda.gov/fdc/v1/foods/search?" +
      new URLSearchParams({
        api_key: usdaKey,
        query: q,
        pageSize: "30",
        dataType: "Foundation,SR Legacy,Branded",
      }).toString();

    const [offResult, usdaResult] = await Promise.allSettled([
      fetch(offUrl, {
        headers: { "User-Agent": "HalevTovYomi/1.0 (nutrition app)" },
        signal: AbortSignal.timeout(9000),
      }),
      fetch(usdaUrl, {
        headers: { "User-Agent": "HalevTovYomi/1.0 (nutrition app)" },
        signal: AbortSignal.timeout(9000),
      }),
    ]);

    const out: Food[] = [];
    const seen = new Set<string>();

    // Open Food Facts
    if (offResult.status === "fulfilled" && offResult.value.ok) {
      try {
        const json = (await offResult.value.json()) as { products?: OffProduct[] };
        for (const p of json.products ?? []) {
          const n = (p.nutriments ?? {}) as Record<string, unknown>;
          const cal = numberOrZero(n["energy-kcal_100g"] ?? (n["energy_100g"] ? numberOrZero(n["energy_100g"]) / 4.184 : 0));
          const nameHe = String(p["product_name_he"] ?? "").trim();
          const productName = String(p["product_name"] ?? "").trim();
          const name = nameHe || productName;
          if (!name || cal <= 0) continue;

          const brand = String(p["brands"] ?? "").split(",")[0]?.trim();
          const displayName = brand && !name.includes(brand) ? `${name} · ${brand}` : name;
          const key = normalize(displayName);
          if (!key || seen.has(key)) continue;

          const serving = numberOrZero(p["serving_quantity"]);
          out.push({
            id: `off:${String(p["code"] ?? name)}`,
            name: displayName,
            calories: Math.round(cal),
            protein: +numberOrZero(n["proteins_100g"]).toFixed(1),
            carbs: +numberOrZero(n["carbohydrates_100g"]).toFixed(1),
            fat: +numberOrZero(n["fat_100g"]).toFixed(1),
            ...(serving > 0 ? { serving } : {}),
          });
          seen.add(key);
        }
      } catch {
        // מקור חיצוני לא זמין - ממשיכים למקור הבא.
      }
    }

    // USDA FoodData Central
    if (usdaResult.status === "fulfilled" && usdaResult.value.ok) {
      try {
        const json = (await usdaResult.value.json()) as { foods?: UsdaFood[] };
        for (const p of json.foods ?? []) {
          const name = String(p["description"] ?? "").trim();
          if (!name) continue;

          const nutrients = Array.isArray(p["foodNutrients"]) ? (p["foodNutrients"] as UsdaFood[]) : [];
          const nutrient = (ids: number[]) => {
            const found = nutrients.find((n) => ids.includes(numberOrZero(n["nutrientId"])));
            return numberOrZero(found?.["value"]);
          };

          const cal = nutrient([1008, 2047]);
          if (cal <= 0) continue;

          const brand = String(p["brandOwner"] ?? p["brandName"] ?? "").trim();
          const displayName = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} · ${brand}` : name;
          const key = normalize(displayName);
          if (!key || seen.has(key)) continue;

          out.push({
            id: `usda:${String(p["fdcId"] ?? name)}`,
            name: displayName,
            calories: Math.round(cal),
            protein: +nutrient([1003]).toFixed(1),
            carbs: +nutrient([1005]).toFixed(1),
            fat: +nutrient([1004]).toFixed(1),
          });
          seen.add(key);
        }
      } catch {
        // מקור חיצוני לא זמין - מחזירים לפחות את תוצאות Open Food Facts.
      }
    }

    // Open Food Facts מקבל עדיפות על USDA עבור מוצרים ארוזים/ישראליים.
    return out.slice(0, 40);
  });
