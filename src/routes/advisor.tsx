import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, KeyRound, Mic, MicOff, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, dayTotals, todayKey, useStore } from "@/lib/store";
import { askAdvisor } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/advisor")({
  head: () => ({ meta: [{ title: "יועץ תזונה חכם — פיטראק" }, { name: "description", content: "יועץ תזונה חכם עם Gemini AI." }] }),
  component: Advisor,
});

function Advisor() {
  const state = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const totals = dayTotals(state, todayKey());

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [state.chat.length, busy]);

  const send = async (value: string) => {
    const q = value.trim();
    if (!q || busy) return;
    actions.addChat({ role: "user", text: q });
    setText("");
    setBusy(true);
    try {
      const context = `שם: ${state.settings.name}; יעד קלוריות: ${state.settings.calorieGoal}; חלבון: ${state.settings.proteinGoal} ג׳; פחמימות: ${state.settings.carbGoal} ג׳; שומן: ${state.settings.fatGoal} ג׳; היום עד עכשיו: ${totals.calories} קק״ל, ${totals.protein} ג׳ חלבון, ${totals.carbs} ג׳ פחמימות, ${totals.fat} ג׳ שומן.`;
      const messages = [...state.chat.map((m) => ({ role: m.role, text: m.text })), { role: "user" as const, text: q }];
      const result = await askAdvisor({ data: { messages, context } });
      actions.addChat({ role: "ai", text: result.text });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ה-AI לא זמין כרגע");
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    const SR = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return toast.error("הדפדפן שלך לא תומך בזיהוי דיבור");
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "he-IL";
    rec.interimResults = false;
    rec.onresult = (e: any) => void send(e.results[0][0].transcript as string);
    rec.onerror = () => toast.error("לא הצלחתי לשמוע, נסה שוב");
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">יועץ התזונה החכם</h1><p className="text-sm text-muted-foreground">שיחה אמיתית עם Gemini AI</p></div>
        <Link to="/ai-settings"><Button variant="outline" size="sm" className="rounded-full"><KeyRound className="size-4" /> הגדרות AI</Button></Link>
      </header>

      <Card className="flex flex-col gap-3 p-0">
        <div className="flex max-h-[58vh] min-h-72 flex-col gap-3 overflow-y-auto p-4">
          {!state.chat.length && <div className="m-auto max-w-sm text-center text-sm text-muted-foreground">שאל אותי על קלוריות, מאקרו, ארוחות, מים, אימונים או התקדמות. אם תגדיר Gemini בהגדרות AI, השיחה תעבוד עם המפתח האישי שלך.</div>}
          {state.chat.map((m) => <div key={m.id} className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-full", m.role === "ai" ? "bg-primary text-primary-foreground" : "bg-muted")}>{m.role === "ai" ? <Bot className="size-4" /> : <User className="size-4" />}</span><div className={cn("max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{m.text}</div></div>)}
          {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Bot className="size-4 animate-pulse" /> Gemini חושב…</div>}
          <div ref={endRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-border/70 p-3">
          <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label="קלט קולי" onClick={toggleVoice}>{listening ? <MicOff className="size-4 text-destructive" /> : <Mic className="size-4" />}</Button>
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send(text)} placeholder="שאל את היועץ…" disabled={busy} />
          <Button size="icon" className="shrink-0 rounded-full" onClick={() => void send(text)} disabled={busy} aria-label="שליחה"><Send className="size-4" /></Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">{["מה לאכול היום?", "איך להשלים חלבון?", "כמה קלוריות נשארו לי?", "כמה מים לשתות?"] .map((s) => <button key={s} onClick={() => void send(s)} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">{s}</button>)}</div>
    </div>
  );
}
