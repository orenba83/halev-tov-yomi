import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Camera, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, MacroTile } from "@/components/Stat";
import { EditEntryDialog, FoodPickerDialog } from "@/components/FoodPickerDialog";
import { AiFoodScanDialog } from "@/components/AiFoodScanDialog";
import { Button } from "@/components/ui/button";
import { actions, dayTotals, heDayLabel, todayKey, useStore } from "@/lib/store";
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
  const sum = items.reduce(
    (a, e) => ({
      calories: a.calories + e.calories,
      protein: a.protein + e.protein,
      carbs: a.carbs + e.carbs,
      fat: a.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const dayLeft = Math.max(0, state.settings.calorieGoal - dayTotals(state, date).calories);

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MacroTile label="קלוריות בארוחה" value={sum.calories} goal={state.settings.calorieGoal} color="primary" unit="קל׳" />
        <MacroTile label="חלבון" value={sum.protein} goal={state.settings.proteinGoal} color="protein" />
        <MacroTile label="פחמימות" value={sum.carbs} goal={state.settings.carbGoal} color="carb" />
        <MacroTile label="שומן" value={sum.fat} goal={state.settings.fatGoal} color="fat" />
      </div>

      <Card className="text-center">
        <p className="text-sm text-muted-foreground">נותר לי היום לאכול</p>
        <p className="text-3xl font-extrabold tabular-nums">{dayLeft} קל׳</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-bold">מה אכלתי</h2>
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {e.name} <span className="text-muted-foreground">· {e.grams} ג׳</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {e.calories} קל׳ · חלבון {e.protein} ג׳ · פחמימות {e.carbs} ג׳ · שומן {e.fat} ג׳
              </p>
            </div>
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

      <FoodPickerDialog open={picker} onOpenChange={setPicker} meal={mealKey} date={date} showMealSelect={false} />
      <AiFoodScanDialog open={scan} onOpenChange={setScan} meal={mealKey} date={date} />
      <EditEntryDialog entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
