import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Droplets, UtensilsCrossed } from "lucide-react";
import { Card, MacroTile } from "@/components/Stat";
import { DayNav } from "@/components/DayNav";
import { Button } from "@/components/ui/button";
import { dayTotals, dayWater, heDate, todayKey, useStore } from "@/lib/store";
import { MEALS } from "@/lib/types";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "יומן יומי — פיטראק" },
      { name: "description", content: "ניהול 4 ארוחות ביום, פריטי מזון ומעקב שתיית מים." },
      { property: "og:title", content: "יומן יומי — פיטראק" },
      { property: "og:description", content: "ניהול ארוחות ומעקב שתיית מים יומי." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyLog,
});

function DailyLog() {
  const state = useStore();
  const [date, setDate] = useState(todayKey());
  const totals = dayTotals(state, date);
  const water = dayWater(state, date);
  const { settings } = state;
  const remaining = Math.max(0, settings.calorieGoal - totals.calories);

  return (
    <div className="space-y-4">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">היומן שלי</h1>
        <p className="text-sm text-muted-foreground">
          {heDate(date)} · נותרו {remaining} קל׳
        </p>
      </header>

      <DayNav date={date} onChange={setDate} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MacroTile label="קלוריות" value={totals.calories} goal={settings.calorieGoal} color="primary" unit="קל׳" />
        <MacroTile label="חלבון" value={totals.protein} goal={settings.proteinGoal} color="protein" />
        <MacroTile label="פחמימות" value={totals.carbs} goal={settings.carbGoal} color="carb" />
        <MacroTile label="שומן" value={totals.fat} goal={settings.fatGoal} color="fat" />
      </div>

      <div className="space-y-3">
        {MEALS.map((m) => {
          const items = state.entries.filter((e) => e.date === date && e.meal === m.key);
          const cal = items.reduce((a, e) => a + e.calories, 0);
          return (
            <Link key={m.key} to="/meal/$meal" params={{ meal: m.key }} search={{ date }}>
              <Card className="flex items-center gap-3 transition-colors hover:bg-accent/40">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <UtensilsCrossed className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {items.length} פריטים · {m.time}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{cal} קל׳</span>
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>

      <Link to="/water" search={{ date }}>
        <Card className="flex items-center gap-3 transition-colors hover:bg-accent/40">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-water/15 text-water">
            <Droplets className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">שתיית מים</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {water} מ״ל מתוך {settings.waterGoal} מ״ל
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 rounded-full">
            מסך מעקב
          </Button>
        </Card>
      </Link>
    </div>
  );
}
