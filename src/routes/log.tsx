import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Droplets, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { FoodPickerDialog, NumField } from "@/components/FoodPickerDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { actions, dayTotals, heDate, todayKey, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MEALS, type LogEntry, type MealKey } from "@/lib/types";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "יומן יומי — פיטראק" },
      { name: "description", content: "ניהול ארוחות, פריטי מזון ומעקב שתיית מים יומי." },
      { property: "og:title", content: "יומן יומי — פיטראק" },
      { property: "og:description", content: "ניהול ארוחות ומעקב שתיית מים יומי." },
    ],
  }),
  component: DailyLog,
});

function DailyLog() {
  const state = useStore();
  const date = todayKey();
  const [open, setOpen] = useState<MealKey | null>("breakfast");
  const [picker, setPicker] = useState(false);
  const [meal, setMeal] = useState<MealKey>("breakfast");
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const totals = dayTotals(state, date);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">היומן שלי</h1>
        <p className="text-sm text-muted-foreground">
          {heDate(date)} · {totals.calories} קק״ל נצרכו
        </p>
      </header>

      <div className="space-y-3">
        {MEALS.map((m) => {
          const items = state.entries.filter((e) => e.date === date && e.meal === m.key);
          const cal = items.reduce((a, e) => a + e.calories, 0);
          const isOpen = open === m.key;
          return (
            <Card key={m.key} className="p-0">
              <button
                onClick={() => setOpen(isOpen ? null : m.key)}
                className="flex w-full items-center gap-3 p-4 text-right"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {items.length} פריטים · {m.time}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{cal} קק״ל</span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </button>

              {isOpen && (
                <div className="space-y-2 border-t border-border/70 p-4">
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.grams} ג׳ · ח {e.protein} · פ {e.carbs} · ש {e.fat}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {e.calories}
                      </span>
                      <button
                        onClick={() => setEditing(e)}
                        aria-label="עריכה"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          actions.deleteEntry(e.id);
                          toast.success("הפריט נמחק");
                        }}
                        aria-label="מחיקה"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {!items.length && (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                      עדיין לא נוספו פריטים
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={() => {
                      setMeal(m.key);
                      setPicker(true);
                    }}
                  >
                    <Plus className="size-4" /> הוספת פריט ל{m.label}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <WaterTracker date={date} />

      <FoodPickerDialog open={picker} onOpenChange={setPicker} meal={meal} onMealChange={setMeal} />
      <EditEntryDialog entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function WaterTracker({ date }: { date: string }) {
  const state = useStore();
  const [custom, setCustom] = useState("");
  const ml = state.water[date] ?? 0;
  const goal = state.settings.waterGoal;
  const pct = Math.min(100, (ml / goal) * 100);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-water/15 text-water">
          <Droplets className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">מעקב מים</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {ml} מ״ל מתוך {goal} מ״ל
          </p>
        </div>
        <span className="shrink-0 text-lg font-bold tabular-nums">{Math.round(pct)}%</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-water transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => actions.addWater(date, 250)}>
          <span dir="ltr">+250</span> מ״ל
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => actions.addWater(date, 500)}>
          <span dir="ltr">+500</span> מ״ל
        </Button>
        <Button variant="ghost" className="rounded-full" onClick={() => actions.addWater(date, -250)}>
          <span dir="ltr">-250</span> מ״ל
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="כמות מותאמת (מ״ל)"
        />
        <Button
          onClick={() => {
            const v = Number(custom);
            if (!Number.isFinite(v) || v <= 0) {
              toast.error("יש להזין כמות חיובית");
              return;
            }
            actions.addWater(date, v);
            setCustom("");
            toast.success("נוסף בהצלחה");
          }}
        >
          הוספה
        </Button>
      </div>
    </Card>
  );
}

function EditEntryDialog({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  const [grams, setGrams] = useState("");

  return (
    <Dialog
      open={!!entry}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>עריכת {entry?.name}</DialogTitle>
        </DialogHeader>
        {entry && (
          <div className="space-y-4">
            <NumField
              label={`כמות (גרם) — כרגע ${entry.grams} ג׳`}
              value={grams}
              onChange={setGrams}
            />
            <Button
              className="w-full"
              onClick={() => {
                const g = Number(grams);
                if (!Number.isFinite(g) || g <= 0) {
                  toast.error("יש להזין כמות חיובית");
                  return;
                }
                const f = g / entry.grams;
                actions.updateEntry(entry.id, {
                  grams: g,
                  calories: Math.round(entry.calories * f),
                  protein: +(entry.protein * f).toFixed(1),
                  carbs: +(entry.carbs * f).toFixed(1),
                  fat: +(entry.fat * f).toFixed(1),
                });
                toast.success("עודכן");
                setGrams("");
                onClose();
              }}
            >
              שמירת שינויים
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
