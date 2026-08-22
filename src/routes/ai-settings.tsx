import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { testGemini } from "@/lib/ai.functions";

export const Route = createFileRoute("/ai-settings")({
  head: () => ({
    meta: [
      { title: "הגדרות AI — פיטראק" },
      { name: "description", content: "הגדרת מפתח Gemini לשימוש אישי ביכולות ה-AI של פיטראק." },
    ],
  }),
  component: AiSettingsPage,
});

const COOKIE = "gemini_api_key";

function readKey() {
  if (typeof document === "undefined") return "";
  const item = document.cookie.split("; ").find((x) => x.startsWith(`${COOKIE}=`));
  return item ? decodeURIComponent(item.split("=").slice(1).join("=")) : "";
}

function saveKey(key: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(key.trim())}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}

function clearKey() {
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

function AiSettingsPage() {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => setKey(readKey()), []);

  const save = () => {
    if (!key.trim()) {
      toast.error("יש להזין מפתח Gemini");
      return;
    }
    saveKey(key);
    toast.success("מפתח Gemini נשמר במכשיר");
  };

  const test = async () => {
    saveKey(key);
    setTesting(true);
    try {
      const result = await testGemini();
      if (result.ok) toast.success("החיבור ל-Gemini תקין");
      else toast.error(result.text || "לא התקבלה תשובה מ-Gemini");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "בדיקת Gemini נכשלה");
    } finally {
      setTesting(false);
    }
  };

  const remove = () => {
    clearKey();
    setKey("");
    toast.success("מפתח Gemini נמחק מהמכשיר");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">הגדרות AI</h1>
        <p className="text-sm text-muted-foreground">שימוש ב-Gemini API האישי שלך במקום שירות AI חיצוני</p>
      </header>

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Bot className="size-5" /></span>
          <div>
            <h2 className="font-bold">Google Gemini</h2>
            <p className="text-xs text-muted-foreground">Gemini 3.1 Flash-Lite — מסלול חינמי זמין</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gemini-key">Gemini API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input id="gemini-key" dir="ltr" type={show ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza..." className="pr-10" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="הצג/הסתר מפתח">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button onClick={save}><KeyRound className="size-4" /> שמור</Button>
          </div>
          <p className="text-xs text-muted-foreground">המפתח נשמר כ-cookie מקומי במכשיר הזה ולא נכתב ל-GitHub.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={test} disabled={!key.trim() || testing}>
            {testing ? "בודק…" : <><CheckCircle2 className="size-4" /> בדוק חיבור</>}
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={remove} disabled={!key}>
            <Trash2 className="size-4" /> מחק מפתח
          </Button>
        </div>
      </Card>

      <Card className="space-y-2 text-sm">
        <h2 className="font-bold">איך מקבלים מפתח?</h2>
        <p className="text-muted-foreground">פותחים Google AI Studio, יוצרים API Key, ומדביקים אותו כאן. Google מציעה מסלול חינמי עם מכסות מוגבלות.</p>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-block text-primary underline">פתיחת Google AI Studio →</a>
      </Card>

      <Card className="space-y-2 text-xs text-muted-foreground">
        <p><b>פרטיות:</b> המפתח נשלח לשרת האפליקציה רק בעת פעולת AI, כדי שהשרת יוכל לקרוא ל-Gemini. אל תשתף את המפתח עם אנשים אחרים.</p>
        <p>כאשר מוגדר Gemini, גם ייעוץ AI וגם ניתוח תמונות משתמשים בו. אם אין מפתח, המערכת מנסה את שירות ה-AI הקיים של האפליקציה.</p>
      </Card>
    </div>
  );
}
