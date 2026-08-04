import { useEffect, useMemo, useState } from "react";
import { Camera, Clock, Heart, Loader2, MessageSquareText, Plus, Search, Sparkles, Star } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actions, allFoods, todayKey, useStore } from "@/lib/store";
import { searchProducts } from "@/lib/foodsearch.functions";
import { cn } from "@/lib/utils";
import { MEALS, type Food, type LogEntry, type MealKey } from "@/lib/types";
import { UNIT_LABELS, unitGrams, type UnitKey } from "@/lib/units";
import { AiFoodScanDialog } from "./AiFoodScanDialog";

/** מונע מהמקלדת להסתיר את שורת ההקלדה במובייל */
export const scrollIntoViewOnFocus = (e: { currentTarget: HTMLElement }) => {
  const el = e.currentTarget;
  setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
};


export interface PickedFood {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function scale(food: Food, grams: number): PickedFood {
  const f = grams / 100;
  return {
    name: food.name,
    grams,
    calories: Math.round(food.calories * f),
    protein: +(food.protein * f).toFixed(1),
    carbs: +(food.carbs * f).toFixed(1),
    fat: +(food.fat * f).toFixed(1),
  };
}

export function NumField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        dir="ltr"
        className="text-right"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function FoodPickerDialog({
  open,
  onOpenChange,
  meal,
  onMealChange,
  date = todayKey(),
  showMealSelect = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meal: MealKey;
  onMealChange?: (m: MealKey) => void;
  date?: string;
  showMealSelect?: boolean;
}) {
  const state = useStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [unit, setUnit] = useState<UnitKey>("gram");
  const [amount, setAmount] = useState("100");
  const [scan, setScan] = useState(false);
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  const perUnit = selected ? unitGrams(selected) : null;
  const grams = perUnit ? +((Number(amount) || 0) * perUnit[unit]).toFixed(1) : 0;


  const foods = allFoods(state);
  const [remote, setRemote] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);

  const localResults = useMemo(() => {
    const q = query.trim();
    if (!q) return foods.slice(0, 14);
    return foods.filter((f) => f.name.includes(q)).slice(0, 25);
  }, [query, foods]);

  /** חיפוש במאגר המוצרים העולמי (Open Food Facts) */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchProducts({ data: { q } })
        .then((r) => alive && setRemote(r))
        .catch(() => alive && setRemote([]))
        .finally(() => alive && setSearching(false));
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const results = useMemo(() => {
    const seen = new Set(localResults.map((f) => f.name.trim()));
    return [...localResults, ...remote.filter((f) => !seen.has(f.name.trim()))];
  }, [localResults, remote]);


  /** היסטוריה: כל מה שנאכל בפועל (לפי יומן) + מועדפים ומוצרים אחרונים מהמאגר */
  const history = useMemo(() => {
    const out: Food[] = [];
    const seen = new Set<string>();
    const eaten = [...state.entries].reverse();
    for (const e of eaten) {
      const key = e.name.trim();
      if (!key || seen.has(key) || e.grams <= 0) continue;
      seen.add(key);
      const per = 100 / e.grams;
      out.push({
        id: `entry:${e.id}`,
        name: e.name,
        calories: Math.round(e.calories * per),
        protein: +(e.protein * per).toFixed(1),
        carbs: +(e.carbs * per).toFixed(1),
        fat: +(e.fat * per).toFixed(1),
        serving: e.grams,
      });
    }
    for (const id of [...state.favorites, ...state.recent]) {
      const f = foods.find((x) => x.id === id);
      if (f && !seen.has(f.name.trim())) {
        seen.add(f.name.trim());
        out.push(f);
      }
    }
    return out.slice(0, 20);
  }, [state.entries, state.favorites, state.recent, foods]);


  const close = () => {
    setSelected(null);
    setQuery("");
    setUnit("gram");
    setAmount("100");
    setManual({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    onOpenChange(false);
  };

  const pick = (f: Food) => {
    setSelected(f);
    if (f.serving && f.serving > 0) {
      setUnit("piece");
      setAmount("1");
    } else {
      setUnit("gram");
      setAmount("100");
    }
  };

  const addPicked = () => {
    if (!selected) return;
    if (!Number.isFinite(grams) || grams <= 0) {
      toast.error("יש להזין כמות חיובית");
      return;
    }
    actions.addEntry({ date, meal, ...scale(selected, grams) });
    if (!selected.id.startsWith("entry:")) actions.pushRecent(selected.id);
    toast.success(`${selected.name} נוסף ליומן`);
    close();
  };



  const addManual = () => {
    const cal = Number(manual.calories);
    const p = Number(manual.protein || 0);
    const c = Number(manual.carbs || 0);
    const f = Number(manual.fat || 0);
    if (!manual.name.trim()) {
      toast.error("יש להזין שם מוצר");
      return;
    }
    if (!Number.isFinite(cal) || cal <= 0) {
      toast.error("יש להזין קלוריות חיוביות");
      return;
    }
    if ([p, c, f].some((v) => !Number.isFinite(v) || v < 0)) {
      toast.error("ערכי מאקרו לא יכולים להיות שליליים");
      return;
    }
    const food = actions.addCustomFood({ name: manual.name.trim(), calories: cal, protein: p, carbs: c, fat: f });
    actions.addEntry({ date, meal, ...scale(food, 100) });
    actions.pushRecent(food.id);
    toast.success("המוצר נוסף למאגר הפרטי וליומן");
    close();
  };

  const [tab, setTab] = useState<"history" | "favorites" | "new">("new");
  const [scanMode, setScanMode] = useState<"photo" | "barcode" | "text">("photo");
  const favorites = useMemo(
    () => state.favorites.map((id) => foods.find((f) => f.id === id)).filter(Boolean) as Food[],
    [state.favorites, foods],
  );
  const openScan = (m: "photo" | "barcode" | "text") => {
    setScanMode(m);
    setScan(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
        <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto text-right sm:max-w-lg">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-center">{MEALS.find((m) => m.key === meal)?.label ?? "הוספת מזון"}</DialogTitle>
            <DialogDescription className="sr-only">חיפוש במאגר, היסטוריה, מועדפים, הזנה ידנית או AI</DialogDescription>
          </DialogHeader>

          {showMealSelect && (
            <div className="flex flex-wrap justify-center gap-2">
              {MEALS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => onMealChange?.(m.key)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                    meal === m.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "new", label: "מוצר חדש", icon: Plus },
              { key: "favorites", label: "מועדפים", icon: Star },
              { key: "history", label: "היסטוריה", icon: Clock },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors",
                  tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={scrollIntoViewOnFocus}
              placeholder="חיפוש מוצר במאגר (כולל מאגר מוצרים עולמי)"
              className="rounded-2xl bg-muted pr-9"
            />
            {searching && (
              <Loader2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>


          {query.trim() ? (
            <FoodList items={results} selected={selected} onSelect={pick} />
          ) : tab === "history" ? (
            history.length ? (
              <FoodList items={history} selected={selected} onSelect={pick} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">אין עדיין מוצרים בהיסטוריה</p>
            )
          ) : tab === "favorites" ? (
            favorites.length ? (
              <FoodList items={favorites} selected={selected} onSelect={pick} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">עדיין לא סימנת מועדפים</p>
            )
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 pt-2 text-center">
                <Sparkles className="mx-auto size-9 text-primary" />
                <h3 className="text-xl font-extrabold">הוספה באמצעות AI</h3>
                <p className="text-sm text-muted-foreground">פרט ככל האפשר את המנה כדי לקבל תוצאה מדויקת.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "photo", label: "צילום מנה או ברקוד", icon: Camera },
                  { key: "text", label: "תיאור בטקסט", icon: MessageSquareText },
                ] as const).map((c) => (
                  <button
                    key={c.key}
                    onClick={() => openScan(c.key)}
                    className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-2 py-5 text-center transition-colors hover:bg-accent"
                  >
                    <c.icon className="size-7 text-foreground" />
                    <span className="text-sm font-bold leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>


              <details className="rounded-2xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-semibold">הזנה ידנית של ערכים</summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">כל הערכים הם ל-100 גרם</p>
                  <div className="space-y-1.5">
                    <Label>שם המוצר *</Label>
                    <Input
                      value={manual.name}
                      onChange={(e) => setManual({ ...manual, name: e.target.value })}
                      placeholder="למשל: עוגיית שיבולת שועל"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="קלוריות *" value={manual.calories} onChange={(v) => setManual({ ...manual, calories: v })} />
                    <NumField label="חלבון (ג׳)" value={manual.protein} onChange={(v) => setManual({ ...manual, protein: v })} />
                    <NumField label="פחמימות (ג׳)" value={manual.carbs} onChange={(v) => setManual({ ...manual, carbs: v })} />
                    <NumField label="שומן (ג׳)" value={manual.fat} onChange={(v) => setManual({ ...manual, fat: v })} />
                  </div>
                  <Button className="w-full" onClick={addManual}>
                    <Plus className="size-4" /> שמור והוסף ליומן
                  </Button>
                </div>
              </details>
            </div>
          )}

          {selected && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{selected.name}</span>
                {!selected.id.startsWith("entry:") && (
                  <button
                    onClick={() => actions.toggleFavorite(selected.id)}
                    className="shrink-0 text-muted-foreground hover:text-primary"
                    aria-label="הוסף למועדפים"
                  >
                    <Heart className={cn("size-4", state.favorites.includes(selected.id) && "fill-primary text-primary")} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">באיזו יחידת מדידה?</p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(UNIT_LABELS) as UnitKey[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        setUnit(u);
                        setAmount(u === "gram" ? "100" : "1");
                      }}
                      className={cn(
                        "rounded-full border border-border px-2 py-1.5 text-xs font-semibold transition-colors",
                        unit === u ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      {UNIT_LABELS[u]}
                    </button>
                  ))}
                </div>
                {unit !== "gram" && perUnit && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">
                      {UNIT_LABELS[unit]} אחת ≈ {perUnit[unit]} ג׳
                    </span>
                    {[0.5, 1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAmount(String(n))}
                        className={cn(
                          "rounded-full border border-border px-3 py-1 text-xs font-semibold transition-colors",
                          Number(amount) === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                        )}
                      >
                        ×{n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Preview food={selected} grams={grams} />
              <div className="flex items-end gap-3">
                <div className="w-32">
                  <NumField
                    label={unit === "gram" ? "כמות (גרם)" : `כמות (${UNIT_LABELS[unit]})`}
                    value={amount}
                    onChange={setAmount}
                    step={unit === "gram" ? "1" : "0.5"}
                  />
                </div>
                <Button className="flex-1" onClick={addPicked}>
                  <Plus className="size-4" /> הוספה ליומן ({grams} ג׳)
                </Button>
              </div>

            </div>
          )}

        </DialogContent>
      </Dialog>

      <AiFoodScanDialog
        open={scan}
        onOpenChange={setScan}
        meal={meal}
        onMealChange={onMealChange}
        date={date}
        mode={scanMode}
      />
    </>
  );
}


function Preview({ food, grams }: { food: Food; grams: number }) {
  const s = scale(food, grams > 0 ? grams : 100);
  return (
    <div className="grid grid-cols-4 gap-2 text-center text-xs">
      {[
        ["קל׳", s.calories],
        ["חלבון", s.protein],
        ["פחמ׳", s.carbs],
        ["שומן", s.fat],
      ].map(([l, v]) => (
        <div key={String(l)} className="rounded-xl bg-card px-2 py-1.5">
          <p className="text-muted-foreground">{l}</p>
          <p className="font-bold tabular-nums">{v}</p>
        </div>
      ))}
    </div>
  );
}

function FoodList({
  items,
  selected,
  onSelect,
}: {
  items: Food[];
  selected: Food | null;
  onSelect: (f: Food) => void;
}) {
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {items.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-border/70 px-3 py-2.5 text-right transition-colors hover:bg-accent",
            selected?.id === f.id && "border-primary bg-accent",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              ל-100 ג׳: {f.calories} קל׳ · חלבון {f.protein} · פחמ׳ {f.carbs} · שומן {f.fat}
            </p>
          </div>
        </button>
      ))}
      {!items.length && <p className="py-6 text-center text-sm text-muted-foreground">לא נמצאו תוצאות</p>}
    </div>
  );
}

/** עריכת פריט שנאכל — כל הערכים ניתנים לעריכה */
export function EditEntryDialog({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  const [f, setF] = useState({ name: "", grams: "", calories: "", protein: "", carbs: "", fat: "" });
  const [id, setId] = useState<string | null>(null);

  if (entry && entry.id !== id) {
    setId(entry.id);
    setF({
      name: entry.name,
      grams: String(entry.grams),
      calories: String(entry.calories),
      protein: String(entry.protein),
      carbs: String(entry.carbs),
      fat: String(entry.fat),
    });
  }

  const save = () => {
    if (!entry) return;
    const nums = [f.grams, f.calories, f.protein, f.carbs, f.fat].map(Number);
    if (!f.name.trim() || nums.some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error("יש למלא שם וערכים תקינים");
      return;
    }
    actions.updateEntry(entry.id, {
      name: f.name.trim(),
      grams: Number(f.grams),
      calories: Math.round(Number(f.calories)),
      protein: +Number(f.protein).toFixed(1),
      carbs: +Number(f.carbs).toFixed(1),
      fat: +Number(f.fat).toFixed(1),
    });
    toast.success("הפריט עודכן");
    onClose();
  };

  const rescale = (grams: string) => {
    if (!entry) return;
    const g = Number(grams);
    setF((prev) => {
      if (!Number.isFinite(g) || g <= 0 || entry.grams <= 0) return { ...prev, grams };
      const r = g / entry.grams;
      return {
        ...prev,
        grams,
        calories: String(Math.round(entry.calories * r)),
        protein: (entry.protein * r).toFixed(1),
        carbs: (entry.carbs * r).toFixed(1),
        fat: (entry.fat * r).toFixed(1),
      };
    });
  };

  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>עריכת פריט</DialogTitle>
          <DialogDescription>שינוי הכמות מעדכן אוטומטית את הערכים</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">שם</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="כמות (ג׳)" value={f.grams} onChange={rescale} />
            <NumField label="קלוריות" value={f.calories} onChange={(v) => setF({ ...f, calories: v })} />
            <NumField label="חלבון (ג׳)" value={f.protein} onChange={(v) => setF({ ...f, protein: v })} step="0.1" />
            <NumField label="פחמימות (ג׳)" value={f.carbs} onChange={(v) => setF({ ...f, carbs: v })} step="0.1" />
            <NumField label="שומן (ג׳)" value={f.fat} onChange={(v) => setF({ ...f, fat: v })} step="0.1" />
          </div>
          <Button className="w-full" onClick={save}>
            שמירת שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
