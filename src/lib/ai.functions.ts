import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SYSTEM = `את/ה יועץ תזונה וכושר מקצועי בשם "פיטראק". ענה תמיד בעברית, בקצרה ולעניין (עד 6 שורות),
בטון ידידותי ומעשי. תן מספרים קונקרטיים (קלוריות, גרם חלבון/פחמימה/שומן) כשרלוונטי.
אל תיתן ייעוץ רפואי — במקרה של בעיה רפואית המלץ לפנות לאיש מקצוע.`;

// חשוב: ברקוד הוא מסלול זיהוי נפרד. אם נמצא ברקוד, אסור ל-AI להמציא קלוריות.
const VISION_SYSTEM = `את/ה מזהה מזון מתמונות עבור אפליקציית תזונה בעברית.
קודם כל בדוק האם בתמונה יש ברקוד מוצר (EAN/UPC/GTIN), גם אם הוא קטן או על האריזה.
אם יש ברקוד שניתן לקרוא, החזר אותו בשדה barcode בדיוק כפי שמופיע בתמונה, ורק אז נמשיך לחיפוש מוצר באינטרנט.
אם אין ברקוד, נתח את המנה כרגיל.
החזר JSON בלבד, ללא טקסט נוסף, במבנה:
{"barcode":"מספר הברקוד או מחרוזת ריקה אם אין","name":"שם המנה בעברית","grams":<גרם משוער למנה שבתמונה>,"calories":<קלוריות למנה>,"protein":<גרם>,"carbs":<גרם>,"fat":<גרם>,"confidence":<0-1>,"note":"משפט קצר בעברית מה זיהית ומה ההנחות"}`;

async function callGateway(body: Record<string, unknown>) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("שירות ה-AI אינו מוגדר");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (res.status === 429) throw new Error("יותר מדי בקשות — נסה שוב בעוד רגע");
  if (res.status === 402) throw new Error("נגמרו הקרדיטים של שירות ה-AI");
  if (!res.ok) throw new Error(`שגיאת AI (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "ai"]), text: z.string() })).min(1),
  context: z.string().optional(),
});

export const askAdvisor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const history = data.messages.slice(-12).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    const text = await callGateway({
      messages: [
        { role: "system", content: SYSTEM + (data.context ? `\n\nנתוני המשתמש היום: ${data.context}` : "") },
        ...history,
      ],
    });
    return { text: text || "לא הצלחתי לנסח תשובה, נסה לשאול שוב." };
  });

const ImageInput = z.object({ image: z.string().min(20).optional(), hint: z.string().optional() });

/** מחפש מוצר אמיתי לפי ברקוד ב-Open Food Facts. אין כאן הערכת קלוריות. */
async function lookupBarcode(barcode: string) {
  const clean = barcode.replace(/\D/g, "").slice(0, 18);
  if (clean.length < 8) return null;
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json?fields=code,product_name,product_name_he,brands,serving_quantity,nutriments`;
    const res = await fetch(url, {
      headers: { "User-Agent": "HalevTovYomi/1.0 (nutrition app)" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: number; product?: Record<string, unknown> };
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const n = (p.nutriments ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const calories = num(n["energy-kcal_100g"] ?? (n["energy_100g"] ? num(n["energy_100g"]) / 4.184 : 0));
    const name = String(p["product_name_he"] ?? p["product_name"] ?? "").trim();
    if (!name || calories <= 0) return null;
    const brand = String(p["brands"] ?? "").split(",")[0]?.trim();
    const displayName = brand && !name.includes(brand) ? `${name} · ${brand}` : name;
    return {
      name: displayName,
      grams: Math.max(1, Math.round(num(p["serving_quantity"]) || 100)),
      calories: Math.round(calories),
      protein: +num(n["proteins_100g"]).toFixed(1),
      carbs: +num(n["carbohydrates_100g"]).toFixed(1),
      fat: +num(n["fat_100g"]).toFixed(1),
      barcode: clean,
    };
  } catch {
    return null;
  }
}

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const content: Record<string, unknown>[] = [{
      type: "text",
      text: data.image
        ? data.hint
          ? `הקשר מהמשתמש: ${data.hint}`
          : "זהה קודם כל אם יש ברקוד קריא. אם אין ברקוד, זהה את המזון והערך את הערכים התזונתיים."
        : `המשתמש תיאר בטקסט מה אכל: ${data.hint ?? ""}. הערך את הערכים התזונתיים.`,
    }];
    if (data.image) content.push({ type: "image_url", image_url: { url: data.image } });

    const raw = await callGateway({
      messages: [
        { role: "system", content: VISION_SYSTEM },
        { role: "user", content },
      ],
    });

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false as const, note: raw || "לא הצלחתי לזהות את התמונה" };
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
      const barcode = String(parsed["barcode"] ?? "").replace(/\D/g, "").slice(0, 18);

      // ברקוד זוהה -> מחפשים את המוצר באינטרנט. בשום מצב לא משתמשים בהערכת AI.
      if (barcode.length >= 8) {
        const product = await lookupBarcode(barcode);
        if (!product) {
          return {
            ok: false as const,
            note: `זיהיתי ברקוד ${barcode}, אבל לא מצאתי את המוצר במאגר האינטרנט. לא אנחש את הקלוריות. נסה צילום חד יותר של הברקוד או חפש את המוצר לפי שם.`,
          };
        }
        return {
          ok: true as const,
          result: {
            ...product,
            confidence: 1,
            note: `זוהה ברקוד ${barcode}. הערכים נלקחו מהמוצר שנמצא באינטרנט, ללא הערכת AI.`,
          },
        };
      }

      // אין ברקוד -> מסלול AI רגיל להערכת מנה.
      return {
        ok: true as const,
        result: {
          name: String(parsed["name"] ?? "מנה לא מזוהה"),
          grams: Math.max(1, Math.round(num(parsed["grams"], 100))),
          calories: Math.max(0, Math.round(num(parsed["calories"]))),
          protein: +num(parsed["protein"]).toFixed(1),
          carbs: +num(parsed["carbs"]).toFixed(1),
          fat: +num(parsed["fat"]).toFixed(1),
          note: String(parsed["note"] ?? ""),
          confidence: num(parsed["confidence"], 0.6),
        },
      };
    } catch {
      return { ok: false as const, note: raw };
    }
  });
