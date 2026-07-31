import { useMemo, useState } from "react";
import { Heart, Plus, Search, Star } from "lucide-react";
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
import { actions, allFoods, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MEALS, type Food, type MealKey } from "@/lib/types";

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

export function FoodPickerDialog({
  open,
  onOpenChange,
  meal,
  onMealChange,
  showMealSelect = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meal: MealKey;
  onMealChange?: (m: MealKey) => void;
  showMealSelect?: boolean;
}) {
  const state = useStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  const foods = allFoods(state);
  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return foods.slice(0, 12);
    return foods.filter((f) => f.name.includes(q)).slice(0, 20);
  }, [query, foods]);

  const quick = useMemo(() => {
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
    if (!Number.isFinite(g) || g <= 0) return toast.error("יש להזין כמות חיובית בגרמים");
    actions.addEntry({ date: dateToday(), meal, ...scale(selected, g) });
    actions.pushRecent(selected.id);
    toast.success(`${selected.name} נוסף ליומן`);
    close();
  };

  const addManual = () => {
    const cal = Number(manual.calories);
    const p = Number(manual.protein || 0);
    const c = Number(manual.carbs || 0);
    const f = Number(manual.fat || 0);
    if (!manual.name.trim()) return toast.error("יש להזין שם מוצר");
    if (!Number.isFinite(cal) || cal <= 0) return toast.error("יש להזין קלוריות חיוביות");
    if ([p, c, f].some((v) => !Number.isFinite(v) || v < 0))
      return toast.error("ערכי מאקרו לא יכולים להיות שליליים");
    const food = actions.addCustomFood({
      name: manual.name.trim(),
      calories: cal,
      protein: p,
      carbs: c,
      fat: f,
    });
    actions.addEntry({ date: dateToday(), meal, ...scale(food, 100) });
    actions.pushRecent(food.id);
    toast.success("המוצר נוסף למאגר הפרטי וליומן");
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[88vh] gap-4 overflow-y-auto text-right sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>הוספת מזון</DialogTitle>
          <DialogDescription>חיפוש במאגר, מועדפים או הזנה ידנית</DialogDescription>
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

        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">חיפוש</TabsTrigger>
            <TabsTrigger value="quick">אחרונים</TabsTrigger>
            <TabsTrigger value="manual">ידני</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-3 space-y-3">
            <div className="relative">
              <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חפש מוצר… (למשל: עוף, אורז)"
                className="pr-9"
              />
            </div>
            <FoodList items={results} selected={selected} onSelect={setSelected} />
          </TabsContent>

          <TabsContent value="quick" className="mt-3">
            {quick.length ? (
              <FoodList items={quick} selected={selected} onSelect={setSelected} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">אין עדיין מוצרים אחרונים</p>
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
              <NumField
                label="קלוריות *"
                value={manual.calories}
                onChange={(v) => setManual({ ...manual, calories: v })}
              />
              <NumField
                label="חלבון (ג׳)"
                value={manual.protein}
                onChange={(v) => setManual({ ...manual, protein: v })}
              />
              <NumField
                label="פחמימות (ג׳)"
                value={manual.carbs}
                onChange={(v) => setManual({ ...manual, carbs: v })}
              />
              <NumField
                label="שומן (ג׳)"
                value={manual.fat}
                onChange={(v) => setManual({ ...manual, fat: v })}
              />
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
                <Heart
                  className={cn(
                    "size-4",
                    state.favorites.includes(selected.id) && "fill-primary text-primary",
                  )}
                />
              </button>
            </div>
            <div className="flex items-end gap-3">
              <div className="w-32 space-y-1.5">
                <Label>כמות (גרם)</Label>
                <Input
                  type="number"
                  min={1}
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>
              <div className="flex-1 text-sm text-muted-foreground">
                {(() => {
                  const s = scale(selected, Math.max(0, Number(grams) || 0));
                  return `${s.calories} קק״ל · ח ${s.protein} · פ ${s.carbs} · ש ${s.fat}`;
                })()}
              </div>
            </div>
            <Button className="w-full" onClick={addPicked}>
              <Plus className="size-4" /> הוסף ליומן
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
    <div className="max-h-64 space-y-1.5 overflow-y-auto">
      {items.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-muted/50 px-3 py-2.5 text-right transition-colors hover:bg-accent",
            selected?.id === f.id && "border-primary bg-accent",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {f.custom && <Star className="size-3.5 shrink-0 text-primary" />}
            <span className="truncate text-sm font-medium">{f.name}</span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{f.calories} קק״ל / 100ג׳</span>
        </button>
      ))}
      {!items.length && (
        <p className="py-6 text-center text-sm text-muted-foreground">לא נמצאו תוצאות</p>
      )}
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function dateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
