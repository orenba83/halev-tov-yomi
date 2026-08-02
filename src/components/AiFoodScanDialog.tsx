import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, todayKey } from "@/lib/store";
import { analyzeFoodImage } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { MEALS, type MealKey } from "@/lib/types";

export interface ScanValues {
  name: string;
  grams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY: ScanValues = { name: "", grams: "", calories: "", protein: "", carbs: "", fat: "" };

export function AiFoodScanDialog({
  open,
  onOpenChange,
  meal,
  onMealChange,
  date = todayKey(),
  mode = "photo",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meal: MealKey;
  onMealChange?: ((m: MealKey) => void) | undefined;
  date?: string | undefined;
  mode?: "photo" | "barcode" | "text";
}) {
  const [image, setImage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [hint, setHint] = useState("");
  const [values, setValues] = useState<ScanValues>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImage(null);
    setStarted(false);
    setThread([]);
    setHint("");
    setValues(EMPTY);
    setBusy(false);
  };


  const analyze = async (dataUrl: string, userHint?: string) => {
    setBusy(true);
    try {
      const res = await analyzeFoodImage({ data: { image: dataUrl, hint: userHint } });
      if (!res.ok) {
        setThread((t) => [...t, { role: "ai", text: res.note || "לא הצלחתי לזהות, נסה תמונה ברורה יותר" }]);
        return;
      }
      const r = res.result;
      setValues({
        name: r.name,
        grams: String(r.grams),
        calories: String(r.calories),
        protein: String(r.protein),
        carbs: String(r.carbs),
        fat: String(r.fat),
      });
      setThread((t) => [
        ...t,
        {
          role: "ai",
          text: `${r.note || `נראה לי שזו ${r.name}`}\nהערכה: ${r.grams} ג׳ · ${r.calories} קל׳ · חלבון ${r.protein} · פחמימות ${r.carbs} · שומן ${r.fat}\nאם משהו לא מדויק — כתוב לי ואעדכן, או ערוך ידנית ולחץ "הוסף לארוחה".`,
        },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בזיהוי התמונה");
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File) => {
    if (file.size > 6 * 1024 * 1024) {
      toast.error("התמונה גדולה מדי (עד 6MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setImage(url);
      setThread([{ role: "user", text: mode === "barcode" ? "סרקתי ברקוד/תווית" : "צילמתי מנה" }]);
      void analyze(url);
    };
    reader.readAsDataURL(file);
  };

  const sendHint = () => {
    const h = hint.trim();
    if (!h || !image) return;
    setThread((t) => [...t, { role: "user", text: h }]);
    setHint("");
    void analyze(image, h);
  };

  const add = () => {
    const g = Number(values.grams);
    const cal = Number(values.calories);
    if (!values.name.trim()) {
      toast.error("יש להזין שם מנה");
      return;
    }
    if (!Number.isFinite(g) || g <= 0) {
      toast.error("יש להזין כמות חיובית");
      return;
    }
    if (!Number.isFinite(cal) || cal < 0) {
      toast.error("קלוריות לא תקינות");
      return;
    }
    actions.addEntry({
      date,
      meal,
      name: values.name.trim(),
      grams: g,
      calories: Math.round(cal),
      protein: +Number(values.protein || 0).toFixed(1),
      carbs: +Number(values.carbs || 0).toFixed(1),
      fat: +Number(values.fat || 0).toFixed(1),
    });
    toast.success("נוסף לארוחה");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto text-right sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {mode === "barcode" ? "סריקת ברקוד / תווית" : "צילום מנה או מוצר"}
          </DialogTitle>
          <DialogDescription>ה-AI יזהה מה בתמונה, תאשרו יחד את הערכים ואז נוסיף לארוחה</DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />

        {!image ? (
          <div className="space-y-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="grid w-full place-items-center gap-2 rounded-3xl border-2 border-dashed border-border py-10 text-muted-foreground hover:bg-accent"
            >
              <Camera className="size-8 text-primary" />
              <span className="text-sm font-medium">פתיחת מצלמה / בחירת תמונה</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <img src={image} alt="התמונה שצולמה" className="h-40 w-full rounded-2xl object-cover" />

            <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-muted/40 p-3">
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-fit max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
                    m.role === "user" ? "mr-auto bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {m.text}
                </div>
              ))}
              {busy && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> מנתח את התמונה…
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendHint()}
                placeholder="לדוגמה: זה עם חצי כוס אורז בלבד"
              />
              <Button size="icon" className="shrink-0 rounded-full" onClick={sendHint} aria-label="שליחה">
                <Send className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 rounded-full"
                onClick={() => fileRef.current?.click()}
                aria-label="תמונה אחרת"
              >
                <ImagePlus className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="שם המנה" value={values.name} onChange={(v) => setValues({ ...values, name: v })} />
              <Field label="כמות (ג׳)" value={values.grams} onChange={(v) => setValues({ ...values, grams: v })} num />
              <Field label="קלוריות" value={values.calories} onChange={(v) => setValues({ ...values, calories: v })} num />
              <Field label="חלבון (ג׳)" value={values.protein} onChange={(v) => setValues({ ...values, protein: v })} num />
              <Field label="פחמימות (ג׳)" value={values.carbs} onChange={(v) => setValues({ ...values, carbs: v })} num />
              <Field label="שומן (ג׳)" value={values.fat} onChange={(v) => setValues({ ...values, fat: v })} num />
            </div>

            <div className="flex flex-wrap gap-2">
              {MEALS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => onMealChange?.(m.key)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-medium",
                    meal === m.key ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <Button className="w-full" onClick={add} disabled={busy}>
              הוסף לארוחה
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  num,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  num?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        inputMode={num ? "decimal" : "text"}
        onChange={(e) => onChange(e.target.value)}
        dir={num ? "ltr" : "rtl"}
        className={num ? "text-right" : ""}
      />
    </div>
  );
}
