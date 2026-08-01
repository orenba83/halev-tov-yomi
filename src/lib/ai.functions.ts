import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SYSTEM = `את/ה יועץ תזונה וכושר מקצועי בשם "פיטראק". ענה תמיד בעברית, בקצרה ולעניין (עד 6 שורות),
בטון ידידותי ומעשי. תן מספרים קונקרטיים (קלוריות, גרם חלבון/פחמימה/שומן) כשרלוונטי.
אל תיתן ייעוץ רפואי — במקרה של בעיה רפואית המלץ לפנות לאיש מקצוע.`;

const VISION_SYSTEM = `את/ה מזהה מזון מתמונות עבור אפליקציית תזונה בעברית.
נתח את התמונה (מנה, מוצר או ברקוד/תווית) והחזר JSON בלבד, ללא טקסט נוסף, במבנה:
{"name":"שם המנה בעברית","grams":<גרם משוער למנה שבתמונה>,"calories":<קלוריות למנה>,"protein":<גרם>,"carbs":<גרם>,"fat":<גרם>,"confidence":<0-1>,"note":"משפט קצר בעברית מה זיהית ומה ההנחות"}`;

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
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "ai"]), text: z.string() })).min(1),
  context: z.string().optional(),
});

export const askAdvisor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const history = data.messages.slice(-12).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    }));
    const text = await callGateway({
      messages: [
        { role: "system", content: SYSTEM + (data.context ? `\n\nנתוני המשתמש היום: ${data.context}` : "") },
        ...history,
      ],
    });
    return { text: text || "לא הצלחתי לנסח תשובה, נסה לשאול שוב." };
  });

const ImageInput = z.object({
  image: z.string().min(20),
  hint: z.string().optional(),
});

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const raw = await callGateway({
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: data.hint ? `הקשר מהמשתמש: ${data.hint}` : "מה רואים בתמונה ומה הערכים התזונתיים?",
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false as const, note: raw || "לא הצלחתי לזהות את התמונה" };
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
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
