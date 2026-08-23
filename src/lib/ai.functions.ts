import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const SYSTEM = `את/ה יועץ תזונה וכושר מקצועי בשם "פיטראק". ענה תמיד בעברית, בקצרה ולעניין (עד 6 שורות), בטון ידידותי ומעשי. תן מספרים קונקרטיים (קלוריות, גרם חלבון/פחמימה/שומן) כשרלוונטי. אל תיתן ייעוץ רפואי — במקרה של בעיה רפואית המלץ לפנות לאיש מקצוע.`;
const VISION_SYSTEM = `את/ה מזהה מזון מתמונות עבור אפליקציית תזונה בעברית.
קודם כל בדוק האם בתמונה יש ברקוד מוצר (EAN/UPC/GTIN), גם אם הוא קטן או על האריזה.
אם יש ברקוד שניתן לקרוא, החזר אותו בשדה barcode בדיוק כפי שמופיע בתמונה, ורק אז נמשיך לחיפוש מוצר באינטרנט.
אם אין ברקוד, נתח את המנה כרגיל.
החזר JSON בלבד, ללא טקסט נוסף, במבנה:
{"barcode":"מספר הברקוד או מחרוזת ריקה אם אין","name":"שם המנה בעברית","grams":<גרם משוער למנה שבתמונה>,"calories":<קלוריות למנה>,"protein":<גרם>,"carbs":<גרם>,"fat":<גרם>,"confidence":<0-1>,"note":"משפט קצר בעברית מה זיהית ומה ההנחות"}`;

const STEPS_SYSTEM = `את/ה קורא/ת מספר צעדים מצילום מסך של אפליקציית Huawei Health או מהצמיד עצמו.
מצא את מספר הצעדים היומי הבולט ביותר (steps / צעדים).
התעלם מקלוריות, מרחק, דופק ומספרי תאריך.
החזר JSON בלבד:
{"steps":<מספר שלם>,"date":"YYYY-MM-DD או מחרוזת ריקה אם לא ברור","note":"משפט קצר"}`;

function getGeminiKey() {
  return getCookie("gemini_api_key")?.trim() || process.env["GEMINI_API_KEY"]?.trim() || "";
}

function dataUrlToInlineData(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  return match ? { mime_type: match[1], data: match[2] } : null;
}

async function callGemini(contents: unknown[], systemInstruction = SYSTEM) {
  const key = getGeminiKey();
  if (!key) return null;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { temperature: 0.2 } }),
  });
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error("מפתח Gemini לא תקין או שאין לו הרשאה. בדוק אותו בהגדרות AI.");
  if (res.status === 429) throw new Error("מכסת Gemini החינמית נוצלה כרגע. נסה שוב מאוחר יותר.");
  if (!res.ok) throw new Error(`שגיאת Gemini (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
}

async function callGateway(body: Record<string, unknown>) {
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    const messages = Array.isArray(body.messages) ? (body.messages as { role: string; content: unknown }[]) : [];
    const system = messages.find((m) => m.role === "system")?.content;
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: typeof m.content === "string" ? [{ text: m.content }] : m.content }));
    const result = await callGemini(contents, typeof system === "string" ? system : SYSTEM);
    if (result !== null) return result;
  }
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("שירות ה-AI אינו מוגדר. היכנס להגדרות AI והוסף מפתח Gemini.");
  const res = await fetch(GATEWAY, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: MODEL, ...body }) });
  if (res.status === 429) throw new Error("יותר מדי בקשות — נסה שוב בעוד רגע");
  if (res.status === 402) throw new Error("נגמרו הקרדיטים של שירות ה-AI");
  if (!res.ok) throw new Error(`שגיאת AI (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

const ChatInput = z.object({ messages: z.array(z.object({ role: z.enum(["user", "ai"]), text: z.string() })).min(1), context: z.string().optional() });

export const askAdvisor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const history = data.messages.slice(-12).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    const text = await callGateway({ messages: [{ role: "system", content: SYSTEM + (data.context ? `\n\nנתוני המשתמש היום: ${data.context}` : "") }, ...history] });
    return { text: text || "לא הצלחתי לנסח תשובה, נסה לשאול שוב." };
  });

export const testGemini = createServerFn({ method: "POST" }).handler(async () => {
  const result = await callGemini([{ role: "user", parts: [{ text: "ענה רק: החיבור ל-Gemini תקין" }] }], SYSTEM);
  return { ok: !!result, text: result || "לא התקבלה תשובה" };
});

const ImageInput = z.object({ image: z.string().min(20).optional(), hint: z.string().optional() });

async function lookupBarcode(barcode: string) {
  const clean = barcode.replace(/\D/g, "").slice(0, 18);
  if (clean.length < 8) return null;
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json?fields=code,product_name,product_name_he,brands,serving_quantity,nutriments`;
    const res = await fetch(url, { headers: { "User-Agent": "HalevTovYomi/1.0 (nutrition app)" }, signal: AbortSignal.timeout(9000) });
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
    return { name: brand && !name.includes(brand) ? `${name} · ${brand}` : name, grams: Math.max(1, Math.round(num(p["serving_quantity"]) || 100)), calories: Math.round(calories), protein: +num(n["proteins_100g"]).toFixed(1), carbs: +num(n["carbohydrates_100g"]).toFixed(1), fat: +num(n["fat_100g"]).toFixed(1), barcode: clean };
  } catch { return null; }
}

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const prompt = data.image ? (data.hint ? `הקשר מהמשתמש: ${data.hint}` : "זהה קודם כל אם יש ברקוד קריא. אם אין ברקוד, זהה את המזון והערך את הערכים התזונתיים.") : `המשתמש תיאר בטקסט מה אכל: ${data.hint ?? ""}. הערך את הערכים התזונתיים.`;
    const key = getGeminiKey();
    let raw: string | null = null;
    if (key) {
      const parts: unknown[] = [{ text: prompt }];
      if (data.image) {
        const inline = dataUrlToInlineData(data.image);
        if (inline) parts.push({ inline_data: inline });
      }
      raw = await callGemini([{ role: "user", parts }], VISION_SYSTEM);
    } else {
      const content: Record<string, unknown>[] = [{ type: "text", text: prompt }];
      if (data.image) content.push({ type: "image_url", image_url: { url: data.image } });
      raw = await callGateway({ messages: [{ role: "system", content: VISION_SYSTEM }, { role: "user", content }] });
    }
    const match = raw?.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false as const, note: raw || "לא הצלחתי לזהות את התמונה" };
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
      const barcode = String(parsed["barcode"] ?? "").replace(/\D/g, "").slice(0, 18);
      if (barcode.length >= 8) {
        const product = await lookupBarcode(barcode);
        if (!product) return { ok: false as const, note: `זיהיתי ברקוד ${barcode}, אבל לא מצאתי את המוצר במאגר האינטרנט. לא אנחש את הקלוריות. נסה צילום חד יותר של הברקוד או חפש את המוצר לפי שם.` };
        return { ok: true as const, result: { ...product, confidence: 1, note: `זוהה ברקוד ${barcode}. הערכים נלקחו מהמוצר שנמצא באינטרנט, ללא הערכת AI.` } };
      }
      return { ok: true as const, result: { name: String(parsed["name"] ?? "מנה לא מזוהה"), grams: Math.max(1, Math.round(num(parsed["grams"], 100))), calories: Math.max(0, Math.round(num(parsed["calories"]))), protein: +num(parsed["protein"]).toFixed(1), carbs: +num(parsed["carbs"]).toFixed(1), fat: +num(parsed["fat"]).toFixed(1), note: String(parsed["note"] ?? ""), confidence: num(parsed["confidence"], 0.6) } };
    } catch { return { ok: false as const, note: raw || "תשובת AI לא תקינה" }; }
  });

const StepsImageInput = z.object({ image: z.string().min(20) });

export const parseStepsImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StepsImageInput.parse(d))
  .handler(async ({ data }) => {
    const prompt = "קרא את מספר הצעדים היומי מצילום המסך. החזר JSON בלבד.";
    const key = getGeminiKey();
    let raw: string | null = null;
    if (key) {
      const parts: unknown[] = [{ text: prompt }];
      const inline = dataUrlToInlineData(data.image);
      if (inline) parts.push({ inline_data: inline });
      raw = await callGemini([{ role: "user", parts }], STEPS_SYSTEM);
    } else {
      raw = await callGateway({
        messages: [
          { role: "system", content: STEPS_SYSTEM },
          { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: data.image } }] },
        ],
      });
    }
    const match = raw?.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false as const, note: raw || "לא נמצא מספר צעדים בתמונה" };
    try {
      const parsed = JSON.parse(match[0]) as { steps?: unknown; date?: unknown; note?: unknown };
      const steps = Math.round(Number(parsed.steps));
      if (!Number.isFinite(steps) || steps <= 0 || steps > 200000) {
        return { ok: false as const, note: "לא הצלחתי לקרוא מספר צעדים הגיוני מהתמונה" };
      }
      const date = String(parsed.date ?? "").slice(0, 10);
      return { ok: true as const, steps, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "", note: String(parsed.note ?? "") };
    } catch {
      return { ok: false as const, note: raw || "תשובת AI לא תקינה" };
    }
  });
