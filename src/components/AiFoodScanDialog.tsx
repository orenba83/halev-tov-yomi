import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Send, Sparkles, Star } from "lucide-react";
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

const scrollIntoViewOnFocus = (e: { currentTarget: HTMLElement }) => {
  const el = e.currentTarget;
  setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
};

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
  mode?: "photo" | "barcode" | "text" | "gallery";
}) {
  const [image, setImage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [hint, setHint] = useState("");
  const [values, setValues] = useState<ScanValues>(EMPTY);
  const [saveFavorite, setSaveFavorite] = useState(true);
  const baseRef = useRef<{ g: number; cal: number; p: number; c: number; f: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImage(null);
    setStarted(false);
    setThread([]);
    setHint("");
    setValues(EMPTY);
    setBusy(false);
    setSaveFavorite(true);
    baseRef.current = null;
  };

  useEffect(() => {
    if (!open) return;
    if (mode === "photo" || mode === "barcode") {
      const t = setTimeout(() => fileRef.current?.click(), 120);
      return () => clearTimeout(t);
    }
    if (mode === "gallery") {
      const t = setTimeout(() => galleryRef.current?.click(), 120);
      return () => clearTimeout(t);
    }
    return;
  }, [open, mode]);

  const applyResult = (r: {
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    note?: string;
  }) => {
    baseRef.current = {
      g: r.grams,
      cal: r.calories,
      p: r.protein,
      c: r.carbs,
      f: r.fat,
    };
    setValues({
      name: r.name,
      grams: String(r.grams),
      calories: String(r.calories),
      protein: String(r.protein),
      carbs: String(r.carbs),
      fat: String(r.fat),
    });
  };

  /** When user edits grams, scale macros from the last AI baseline */
  const onGramsChange = (raw: string) => {
    setValues((prev) => {
      const next = { ...prev, grams: raw };
      const g = Number(raw);
      const base = baseRef.current;
      if (!base || !Number.isFinite(g) || g <= 0 || base.g <= 0) return next;
      const ratio = g / base.g;
      return {
        ...next,
        calories: String(Math.round(base.cal * ratio)),
        protein: String(+(base.p * ratio).toFixed(1)),
        carbs: String(+(base.c * ratio).toFixed(1)),
        fat: String(+(base.f * ratio).toFixed(1)),
      };
    });
  };

  const analyze = async (dataUrl: string | null, userHint?: string) => {
    setBusy(true);
    setStarted(true);
    try {
      const res = await analyzeFoodImage({ data: { image: dataUrl ?? undefined, hint: userHint } });
      if (!res.ok) {
        setThread((t) => [...t, { role: "ai", text: res.note || "לא הצלחתי לזהות, נסה תמונה ברורה יותר" }]);
        return;
      }
      const r = res.result;
      applyResult(r);
      setThread((t) => [
        ...t,
        {
          role: "ai",
          text: `${r.note || `נראה לי שזו ${r.name}`}\nהערכה: ${r.grams} ג׳ · ${r.calories} קל׳ · חלבון ${r.protein} · פחמימות ${r.carbs} · שומן ${r.fat}\nשנו את הכמות בגרמים — הקלוריות והמאקרו יתעדכנו אוטומטית. אפשר גם לערוך ידנית וללחוץ "הוסף לארוחה".`,
        },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בזיהוי המנה");
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
      setThread([{ role: "user", text: "צילמתי מנה / ברקוד" }]);
      void analyze(url);
    };
    reader.readAsDataURL(file);
  };

  const sendHint = () => {
    const h = hint.trim();
    if (!h) return;
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
    const per = 100 / g;
    const p = +Number(values.protein || 0).toFixed(1);
    const c = +Number(values.carbs || 0).toFixed(1);
    const f = +Number(values.fat || 0).toFixed(1);
    const name = values.name.trim();
    actions.addEntry({
      date,
      meal,
      name,
      grams: g,
      calories: Math.round(cal),
      protein: p,
      carbs: c,
      fat: f,
    });
    const saved = actions.addCustomFood({
      name,
      calories: Math.round(cal * per),
      protein: +(p * per).toFixed(1),
      carbs: +(c * per).toFixed(1),
      fat: +(f * per).toFixed(1),
      serving: g,
    });
    actions.pushRecent(saved.id);
    if (saveFavorite) actions.toggleFavorite(saved.id);
    toast.success(saveFavorite ? "נוסף לארוחה, למאגר ולמועדפים" : "נוסף לארוחה ולמאגר שלי");

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
      <DialogContent
        className={cn(
          "grid-cols-1 w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden p-4 text-right sm:w-full sm:max-w-md sm:p-6",
          "top-2 max-h-[85dvh] translate-y-0 sm:top-1/2 sm:max-h-[90vh] sm:-translate-y-1/2",
        )}
      >
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {mode === "text" ? "תיאור בטקסט" : mode === "gallery" ? "העלאת תמונה" : "צילום מנה או ברקוד"}
          </DialogTitle>
          <DialogDescription>
            {mode === "text"
              ? "פרטו ככל האפשר את המנה כדי לקבל תוצאה מדויקת"
              : mode === "gallery"
                ? "בחרו תמונה מהגלריה — ה-AI יזהה את המנה ויאשר את הערכים"
                : "ה-AI יזהה מה בתמונה, ערכו כמויות לפי הצורך ואז הוסיפו לארוחה"}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />

        {!image && !started ? (
          <div className="space-y-3">
            {mode === "text" ? (
              <>
                <Input
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  onFocus={scrollIntoViewOnFocus}
                  onKeyDown={(e) => e.key === "Enter" && sendHint()}
                  placeholder="למשל: פיתה עם חומוס, ביצה קשה וסלט"
                />
                <Button className="w-full" onClick={sendHint} disabled={!hint.trim()}>
                  <Sparkles className="size-4" /> חשב ערכים עם AI
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="grid w-full place-items-center gap-2 rounded-3xl border-2 border-dashed border-border py-10 text-muted-foreground hover:bg-accent"
                >
                  <Camera className="size-8 text-primary" />
                  <span className="text-sm font-medium">פתיחת מצלמה</span>
                </button>
                <Button variant="outline" className="w-full" onClick={() => galleryRef.current?.click()}>
                  <ImagePlus className="size-4" /> העלאת תמונה מהגלריה
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {image && <img src={image} alt="התמונה שצולמה" className="h-40 w-full rounded-2xl object-cover" />}

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

            <div className="sticky bottom-0 z-10 flex gap-2 bg-background pb-1 pt-2">
              <Input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                onFocus={scrollIntoViewOnFocus}
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
                aria-label="צילום מחדש"
              >
                <Camera className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 rounded-full"
                onClick={() => galleryRef.current?.click()}
                aria-label="העלאת תמונה"
              >
                <ImagePlus className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="שם המנה" value={values.name} onChange={(v) => setValues({ ...values, name: v })} />
              <Field label="כמות (ג׳)" value={values.grams} onChange={onGramsChange} num />
              <Field
                label="קלוריות"
                value={values.calories}
                onChange={(v) => setValues({ ...values, calories: v })}
                num
              />
              <Field
                label="חלבון (ג׳)"
                value={values.protein}
                onChange={(v) => setValues({ ...values, protein: v })}
                num
              />
              <Field
                label="פחמימות (ג׳)"
                value={values.carbs}
                onChange={(v) => setValues({ ...values, carbs: v })}
                num
              />
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

            <button
              type="button"
              onClick={() => setSaveFavorite((v) => !v)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium transition-colors",
                saveFavorite ? "border-primary/40 bg-primary/5 text-primary" : "text-muted-foreground",
              )}
            >
              <Star className={cn("size-4", saveFavorite && "fill-current")} />
              {saveFavorite ? "יישמר גם כמועדף" : "ללא שמירה כמועדף"}
            </button>

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
