import { createServerFn } from "@tanstack/react-start";
import type { Food } from "./types";

/** חיפוש מוצרים במאגר הגלובלי Open Food Facts (כולל מוצרים ישראליים) */
export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 60) }))
  .handler(async ({ data }): Promise<Food[]> => {
    const q = data.q.trim();
    if (q.length < 2) return [];
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?" +
      new URLSearchParams({
        search_terms: q,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "40",
        fields: "code,product_name,product_name_he,brands,quantity,serving_quantity,nutriments",
      }).toString();

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "FitTrack/1.0 (nutrition app)" },
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { products?: Record<string, unknown>[] };
      const out: Food[] = [];
      for (const p of json.products ?? []) {
        const n = (p["nutriments"] ?? {}) as Record<string, number | undefined>;
        const cal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? Number(n["energy_100g"]) / 4.184 : undefined);
        const nameHe = (p["product_name_he"] as string) || "";
        const name = (nameHe || (p["product_name"] as string) || "").trim();
        if (!name || !cal || !Number.isFinite(cal) || cal <= 0) continue;
        const brand = String((p["brands"] as string) || "").split(",")[0]?.trim();
        const serving = Number(p["serving_quantity"]);
        out.push({
          id: `off:${String(p["code"] ?? name)}`,
          name: brand && !name.includes(brand) ? `${name} · ${brand}` : name,
          calories: Math.round(cal),
          protein: +Number(n["proteins_100g"] ?? 0).toFixed(1),
          carbs: +Number(n["carbohydrates_100g"] ?? 0).toFixed(1),
          fat: +Number(n["fat_100g"] ?? 0).toFixed(1),
          ...(Number.isFinite(serving) && serving > 0 ? { serving } : {}),
        });
        if (out.length >= 25) break;
      }
      return out;
    } catch {
      return [];
    }
  });
