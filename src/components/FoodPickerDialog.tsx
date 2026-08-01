import { useMemo, useState } from "react";
import { Camera, Heart, Plus, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { MEALS, type Food, type LogEntry, type MealKey } from "@/lib/types";
import { AiFoodScanDialog } from "./AiFoodScanDialog";

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
  const [grams, setGrams] = useState("100");
  const [scan, setScan] = useState(false);
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  const foods = allFoods(state);
  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return foods.slice(0, 14);
    return foods.filter((f) => f.name.includes(q)).slice(0, 25);
  }, [query, foods]);

  const history = useMemo(() => {
    const ids = [...state.favorites, ...state.recent];
    const seen = new Set<string>();
    return ids
      .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
      .map((id) => foods.find((f) => f.id === id))
      .filter(Boolean)
      .slice(0, 20) as Food[];
  }, [state.favorites, state.recent, foods]);

  const close = () => {
    setSelected(null);
    setQuery("");
    setGrams("100");
    setManual({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    onOpenChange(false);
  };

  const addPicked = () => {
    if (!selected) return;
    const g = Number(grams);
    if (!Number.isFinite(g) || g <= 0) {
      toast.error("יש להזין כמות חיובית בגרמים");
      return;
    }
    actions.addEntry({ date, meal, ...scale(selected, g) });
    actions.pushRecent(selected.id);
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

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
        <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto text-right sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>חיפוש והוספת מזון</DialogTitle>
            <DialogDescription>חיפוש במאגר, היסטוריית מוצרים, צילום או הזנה ידנית</DialogDescription>
          </DialogHeader>

          {showMealSelect && (
            <div className="flex flex-wrap gap-2">
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

          <Button variant="outline" className="w-full rounded-full" onClick={() => setScan(true)}>
            <Camera className="size-4" /> צילום מנה / ברקוד עם AI
          </Button>

          <Tabs defaultValue="search">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">חיפוש</TabsTrigger>
              <TabsTrigger value="history">היסטוריה</TabsTrigger>
              <TabsTrigger value="manual">ידני</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חפש מוצר… (למשל: עוף, אורז)"
                  className="pr-9"
                />
              </div>
              <FoodList items={results} selected={selected} onSelect={setSelected} />
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">20 המוצרים האחרונים והמועדפים שלך</p>
              {history.length ? (
                <FoodList items={history} selected={selected} onSelect={setSelected} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">אין עדיין מוצרים בהיסטוריה</p>
              )}
            </TabsContent>

            <TabsContent value="manual" className="mt-3 space-y-3">
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
            </TabsContent>
          </Tabs>

          {selected && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{selected.name}</span>
                <button
                  onClick={() => actions.toggleFavorite(selected.id)}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  aria-label="הוסף למועדפים"
                >
                  <Heart className={cn("size-4", state.favorites.includes(selected.id) && "fill-primary text-primary")} />
                </button>
              </div>
              <Preview food={selected} grams={Number(grams) || 0} />
              <div className="flex items-end gap-3">
                <div className="w-32">
                  <NumField label="כמות (גרם)" value={grams} onChange={setGrams} />
                </div>
                <Button className="flex-1" onClick={addPicked}>
                  <Plus className="size-4" /> הוספה ליומן
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AiFoodScanDialog open={scan} onOpenChange={setScan} meal={meal} onMealChange={onMealChange} date={date} />
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
