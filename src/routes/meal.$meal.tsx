import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Camera, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { EditEntryDialog, FoodPickerDialog } from "@/components/FoodPickerDialog";
import { AiFoodScanDialog } from "@/components/AiFoodScanDialog";
import { Button } from "@/components/ui/button";
import { actions, heDayLabel, todayKey, useStore } from "@/lib/store";
import { MEALS, type LogEntry, type MealKey } from "@/lib/types";

export const Route = createFileRoute("/meal/$meal")({
  validateSearch: (s: Record<string, unknown>): { date?: string } =>
    typeof s["date"] === "string" ? { date: s["date"] } : {},

  head: () => ({
    meta: [
      { title: "פירוט ארוחה — פיטראק" },
      { name: "description", content: "סיכום קלורי ומאקרו לארוחה, עריכה, הוספה ומחיקה של פריטים." },
      { property: "og:title", content: "פירוט ארוחה — פיטראק" },
      { property: "og:description", content: "סיכום ועריכת פריטי הארוחה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MealScreen,
});

function MealScreen() {
  const { meal } = Route.useParams();
  const { date: searchDate } = Route.useSearch();
  const date = searchDate ?? todayKey();
  const state = useStore();
  const mealKey = (MEALS.find((m) => m.key === meal)?.key ?? "breakfast") as MealKey;
  const info = MEALS.find((m) => m.key === mealKey)!;
  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const items = state.entries.filter((e) => e.date === date && e.meal === mealKey);

  /** Unique recent items by name+grams (last 12), for one-tap re-add */
  const recentFromHistory = useMemo(() => {
    const seen = new Set<string>();
    const out: LogEntry[] = [];
    for (let i = state.entries.length - 1; i >= 0; i--) {
      const e = state.entries[i]!;
      const key = `${e.name}|${e.grams}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= 8) break;
    }
    return out;
  }, [state.entries]);

  const reAdd = (e: LogEntry) => {
    actions.addEntry({
      date,
      meal: mealKey,
      name: e.name,
      grams: e.grams,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
    });
    toast.success(`נוסף: ${e.name}`);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/log">
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{info.label}</h1>
          <p className="text-sm text-muted-foreground">{heDayLabel(date)}</p>
        </div>
      </header>

      <Card className="space-y-2">
        <h2 className="font-bold">מה אכלתי</h2>
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {e.name} <span className="text-muted-foreground">· {e.grams} ג׳</span>
              </p>
            </div>
            <button
              onClick={() => reAdd(e)}
              aria-label="הוסף שוב"
              title="הוסף שוב"
              className="text-muted-foreground hover:text-primary"
            >
              <RotateCcw className="size-4" />
            </button>
            <button onClick={() => setEditing(e)} aria-label="עריכה" className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => {
                actions.deleteEntry(e.id);
                toast.success("הפריט נמחק");
              }}
              aria-label="מחיקה"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!items.length && <p className="py-4 text-center text-sm text-muted-foreground">עדיין לא נוספו פריטים</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="flex-1 rounded-full" onClick={() => setPicker(true)}>
            <Plus className="size-4" /> הוספת מוצר
          </Button>
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => setScan(true)}>
            <Camera className="size-4" /> צילום מנה / ברקוד
          </Button>
        </div>
      </Card>

      {recentFromHistory.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-bold">הוסף שוב מההיסטוריה</h2>
          <p className="text-xs text-muted-foreground">לחיצה אחת מוסיפה את אותו פריט לארוחה הזו</p>
          <div className="flex flex-wrap gap-2">
            {recentFromHistory.map((e) => (
              <button
                key={`${e.name}-${e.grams}-${e.id}`}
                type="button"
                onClick={() => reAdd(e)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <RotateCcw className="size-3.5 text-primary" />
                <span className="max-w-[10rem] truncate">{e.name}</span>
                <span className="text-muted-foreground">{e.grams}ג׳</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <FoodPickerDialog open={picker} onOpenChange={setPicker} meal={mealKey} date={date} showMealSelect={false} />
      <AiFoodScanDialog open={scan} onOpenChange={setScan} meal={mealKey} date={date} />
      <EditEntryDialog entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
