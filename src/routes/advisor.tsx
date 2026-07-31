import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Camera, Mic, MicOff, ScanBarcode, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { NumField } from "@/components/FoodPickerDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { actions, todayKey, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MEALS, type MealKey } from "@/lib/types";

export const Route = createFileRoute("/advisor")({
  head: () => ({
    meta: [
      { title: "יועץ תזונה חכם — פיטראק" },
      { name: "description", content: "צ׳אט חכם עם קלט קולי וסריקת מוצרים להוספה מהירה ליומן." },
      { property: "og:title", content: "יועץ תזונה חכם — פיטראק" },
      { property: "og:description", content: "צ׳אט חכם עם קלט קולי וסריקת מוצרים." },
    ],
  }),
  component: Advisor,
});

const SCAN_RESULTS = [
  { name: "חטיף חלבון שוקולד", calories: 210, protein: 20, carbs: 21, fat: 6, grams: 60 },
  { name: "יוגורט פרי 3%", calories: 145, protein: 6, carbs: 19, fat: 4.5, grams: 150 },
  { name: "לחמניה מקמח מלא", calories: 190, protein: 7, carbs: 34, fat: 2.5, grams: 70 },
];

function reply(q: string) {
  const t = q.trim();
  if (t.includes("חלבון"))
    return "כדי להגיע ליעד החלבון היומי כדאי לפזר 25-40 גרם חלבון בכל ארוחה: חזה עוף, טונה, ביצים, יוגורט יווני או אבקת חלבון אחרי אימון.";
  if (t.includes("ירידה") || t.includes("לרזות") || t.includes("שומן"))
    return "לירידה בשומן שמור על גירעון של 300-500 קק״ל ביום, 1.6-2 גרם חלבון לכל ק״ג משקל גוף, 8-10 אלף צעדים ביום ו-2-3 אימוני כוח בשבוע.";
  if (t.includes("מים") || t.includes("שתייה"))
    return "מומלץ לשתות 30-35 מ״ל מים לכל ק״ג משקל גוף. אפשר לעקוב אחרי הכמות במסך היומן ולהוסיף בלחיצה אחת.";
  if (t.includes("ארוחה") || t.includes("מה לאכול"))
    return "רעיון מאוזן: 150 גרם חזה עוף, כוס אורז מלא, סלט ירקות עם כף שמן זית — כ-520 קק״ל עם 45 גרם חלבון.";
  if (t.includes("אימון"))
    return "אכול פחמימה זמינה כשעה לפני האימון, ואחריו ארוחה עם 30-40 גרם חלבון ופחמימה לשיקום הגליקוגן.";
  return "שאלה מצוינת! על בסיס היעדים שהגדרת, כדאי לשמור על עקביות בקלוריות ובחלבון לאורך השבוע. אפשר לשאול אותי על ארוחות, מאקרו, מים או אימונים.";
}

function Advisor() {
  const state = useStore();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [scan, setScan] = useState<(typeof SCAN_RESULTS)[number] | null>(null);
  const [scanning, setScanning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chat.length]);

  const send = (value: string) => {
    const q = value.trim();
    if (!q) return;
    actions.addChat({ role: "user", text: q });
    setText("");
    setTimeout(() => actions.addChat({ role: "ai", text: reply(q) }), 500);
  };

  const toggleVoice = () => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) {
      toast.error("הדפדפן שלך לא תומך בזיהוי דיבור");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "he-IL";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      send(transcript);
    };
    rec.onerror = () => toast.error("לא הצלחתי לשמוע, נסה שוב");
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
    toast.info("מקשיב… דבר עכשיו");
  };

  const runScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const pick = SCAN_RESULTS[Math.floor(Math.random() * SCAN_RESULTS.length)]!;
      setScan(pick);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">יועץ התזונה החכם</h1>
        <p className="text-sm text-muted-foreground">שאל בטקסט או בקול, או סרוק מוצר להוספה ליומן</p>
      </header>

      <Card className="flex flex-col gap-3 p-0">
        <div className="flex max-h-[52vh] min-h-72 flex-col gap-3 overflow-y-auto p-4">
          {state.chat.map((m) => (
            <div
              key={m.id}
              className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  m.role === "ai" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m.role === "ai" ? <Bot className="size-4" /> : <User className="size-4" />}
              </span>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border/70 p-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            aria-label="קלט קולי"
            onClick={toggleVoice}
          >
            {listening ? <MicOff className="size-4 text-destructive" /> : <Mic className="size-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            aria-label="סריקת מוצר"
            onClick={runScan}
          >
            {scanning ? <ScanBarcode className="size-4 animate-pulse" /> : <Camera className="size-4" />}
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(text)}
            placeholder="שאל את היועץ…"
          />
          <Button size="icon" className="shrink-0 rounded-full" onClick={() => send(text)} aria-label="שליחה">
            <Send className="size-4" />
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {["מה לאכול היום?", "איך משלימים חלבון?", "טיפים לירידה בשומן", "כמה מים לשתות?"].map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      <ScanDialog result={scan} onClose={() => setScan(null)} />
    </div>
  );
}

function ScanDialog({
  result,
  onClose,
}: {
  result: (typeof SCAN_RESULTS)[number] | null;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState<MealKey>("snack");
  const [grams, setGrams] = useState("");

  const g = Number(grams || result?.grams || 0);

  return (
    <Dialog open={!!result} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>זוהה מוצר: {result?.name}</DialogTitle>
          <DialogDescription>בדוק את הערכים לפני ההוספה ליומן</DialogDescription>
        </DialogHeader>
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Val label="קלוריות" value={`${Math.round((result.calories * g) / result.grams)}`} />
              <Val label="חלבון" value={`${((result.protein * g) / result.grams).toFixed(1)} ג׳`} />
              <Val label="פחמימות" value={`${((result.carbs * g) / result.grams).toFixed(1)} ג׳`} />
              <Val label="שומן" value={`${((result.fat * g) / result.grams).toFixed(1)} ג׳`} />
            </div>
            <NumField
              label={`כמות (גרם) — ברירת מחדל ${result.grams}`}
              value={grams}
              onChange={setGrams}
            />
            <div className="flex flex-wrap gap-2">
              {MEALS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMeal(m.key)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-medium",
                    meal === m.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!Number.isFinite(g) || g <= 0) {
                  toast.error("יש להזין כמות חיובית");
                  return;
                }
                const f = g / result.grams;
                actions.addEntry({
                  date: todayKey(),
                  meal,
                  name: result.name,
                  grams: g,
                  calories: Math.round(result.calories * f),
                  protein: +(result.protein * f).toFixed(1),
                  carbs: +(result.carbs * f).toFixed(1),
                  fat: +(result.fat * f).toFixed(1),
                });
                toast.success("המוצר נוסף ליומן");
                setGrams("");
                onClose();
              }}
            >
              אישור והוספה ליומן
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Val({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold tabular-nums">{value}</p>
    </div>
  );
}
