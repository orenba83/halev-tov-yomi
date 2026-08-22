import { createServerFn } from "@tanstack/react-start";
import type { Food } from "./types";

type RecordMap = Record<string, unknown>;

const normalize = (value: string) => value.toLocaleLowerCase("he-IL").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
const numberOrZero = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };

const mapOff = (p: RecordMap): Food | null => {
  const n = (p.nutriments ?? {}) as RecordMap;
  const cal = numberOrZero(n["energy-kcal_100g"] ?? (n["energy_100g"] ? numberOrZero(n["energy_100g"]) / 4.184 : 0));
  const name = String(p["product_name_he"] ?? p["product_name"] ?? "").trim();
  if (!name || cal <= 0) return null;
  const brand = String(p["brands"] ?? "").split(",")[0]?.trim();
  const display = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} · ${brand}` : name;
  const serving = numberOrZero(p["serving_quantity"]);
  return { id: `off:${String(p["code"] ?? display)}`, name: display, calories: Math.round(cal), protein: +numberOrZero(n["proteins_100g"]).toFixed(1), carbs: +numberOrZero(n["carbohydrates_100g"]).toFixed(1), fat: +numberOrZero(n["fat_100g"]).toFixed(1), ...(serving > 0 ? { serving } : {}) };
};

const mapUsda = (p: RecordMap): Food | null => {
  const name = String(p["description"] ?? "").trim();
  const nutrients = Array.isArray(p["foodNutrients"]) ? p["foodNutrients"] as RecordMap[] : [];
  const nutrient = (ids: number[]) => numberOrZero(nutrients.find(n => ids.includes(numberOrZero(n["nutrientId"])))?.["value"]);
  const cal = nutrient([1008, 2047]);
  if (!name || cal <= 0) return null;
  const brand = String(p["brandOwner"] ?? p["brandName"] ?? "").trim();
  const display = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} · ${brand}` : name;
  return { id: `usda:${String(p["fdcId"] ?? display)}`, name: display, calories: Math.round(cal), protein: +nutrient([1003]).toFixed(1), carbs: +nutrient([1005]).toFixed(1), fat: +nutrient([1004]).toFixed(1) };
};

/** Expands common Israeli misspellings/short forms so searches such as "קוטז" find the full cottage-cheese family. */
const expandQueries = (q: string): string[] => {
  const n = normalize(q);
  const groups: Array<[RegExp, string[]]> = [
    [/^(קוטז|קוטג|קוטג גבינה|cottage|cottage cheese)$/, ["קוטג", "קוטג'", "גבינת קוטג", "cottage cheese"]],
    [/^(גבינה לבנה|גבינה)$/, ["גבינה לבנה", "white cheese", "fresh cheese"]],
    [/^(יוגורט|יוגורט טבעי)$/, ["יוגורט", "yogurt", "natural yogurt", "Greek yogurt"]],
    [/^(חלב)$/, ["חלב", "milk"]],
    [/^(לחם)$/, ["לחם", "bread"]],
    [/^(טונה)$/, ["טונה", "tuna"]],
    [/^(ביצה|ביצים)$/, ["ביצה", "ביצים", "egg", "eggs"]],
  ];
  for (const [rx, values] of groups) if (rx.test(n)) return values;
  return [q];
};

/** חיפוש ברקוד: רק מוצר אמיתי ממאגר, לעולם לא הערכת קלוריות. */
export const lookupProductByBarcode = createServerFn({ method: "GET" })
  .inputValidator((data: { barcode: string }) => ({ barcode: String(data.barcode ?? "").replace(/\D/g, "").slice(0, 18) }))
  .handler(async ({ data }): Promise<Food[]> => {
    const barcode = data.barcode;
    if (barcode.length < 8) return [];
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_he,brands,serving_quantity,nutriments`, { headers: { "User-Agent": "HalevTovYomi/1.0" }, signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const json = await res.json() as { status?: number; product?: RecordMap };
        if (json.status === 1 && json.product) { const food = mapOff({ ...json.product, code: barcode }); if (food) return [food]; }
      }
    } catch { /* continue */ }
    const key = process.env.USDA_API_KEY || "DEMO_KEY";
    try {
      const url = "https://api.nal.usda.gov/fdc/v1/foods/search?" + new URLSearchParams({ api_key: key, query: barcode, pageSize: "10", dataType: "Branded" });
      const res = await fetch(url, { headers: { "User-Agent": "HalevTovYomi/1.0" }, signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const json = await res.json() as { foods?: RecordMap[] };
        return (json.foods ?? []).filter(p => String(p["gtinUpc"] ?? "").replace(/\D/g, "") === barcode).map(mapUsda).filter(Boolean) as Food[];
      }
    } catch { /* no source */ }
    return [];
  });

/** חיפוש רחב ומאוחד: Open Food Facts + USDA, כולל הרחבת מונחים בעברית ואיותים נפוצים. */
export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 80) }))
  .handler(async ({ data }): Promise<Food[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];
    const queries = [...new Set(expandQueries(q))].slice(0, 6);
    const usdaKey = process.env.USDA_API_KEY || "DEMO_KEY";
    const requests = queries.flatMap(search => {
      const offUrl = "https://world.openfoodfacts.org/cgi/search.pl?" + new URLSearchParams({ search_terms: search, search_simple: "1", action: "process", json: "1", page_size: "80", fields: "code,product_name,product_name_he,brands,serving_quantity,nutriments" });
      const usdaUrl = "https://api.nal.usda.gov/fdc/v1/foods/search?" + new URLSearchParams({ api_key: usdaKey, query: search, pageSize: "50", dataType: "Foundation,SR Legacy,Branded" });
      return [fetch(offUrl, { headers: { "User-Agent": "HalevTovYomi/1.0" }, signal: AbortSignal.timeout(10000) }), fetch(usdaUrl, { headers: { "User-Agent": "HalevTovYomi/1.0" }, signal: AbortSignal.timeout(10000) })];
    });
    const results = await Promise.allSettled(requests);
    const out: Food[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.ok) continue;
      try {
        const json = await result.value.json() as RecordMap;
        const products = Array.isArray(json.products) ? json.products : Array.isArray(json.foods) ? json.foods : [];
        for (const p of products as RecordMap[]) {
          const food = json.products ? mapOff(p) : mapUsda(p);
          if (!food) continue;
          const key = normalize(food.name);
          if (!key || seen.has(key)) continue;
          seen.add(key); out.push(food);
        }
      } catch { /* ignore one failed source */ }
    }
    // Prefer likely exact matches, then Israeli/Hebrew names, then everything else.
    const nq = normalize(q);
    out.sort((a, b) => {
      const an = normalize(a.name), bn = normalize(b.name);
      const score = (n: string) => (n === nq ? 0 : n.startsWith(nq) ? 1 : n.includes(nq) ? 2 : 3);
      return score(an) - score(bn);
    });
    return out.slice(0, 100);
  });
