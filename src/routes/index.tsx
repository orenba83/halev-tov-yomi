import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Footprints, Plus, TrendingDown } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, MacroBar, Ring } from "@/components/Stat";
import { FoodPickerDialog } from "@/components/FoodPickerDialog";
import { Button } from "@/components/ui/button";
import { actions, dayTotals, heDate, heShort, toKey, todayKey, useStore } from "@/lib/store";
import { MEALS, type MealKey } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "לוח בקרה — פיטראק" },
      { name: "description", content: "מאזן קלורי יומי, מאקרו, צעדים ומגמת משקל במקום אחד." },
      { property: "og:title", content: "לוח בקרה — פיטראק" },
      { property: "og:description", content: "מאזן קלורי יומי, מאקרו, צעדים ומגמת משקל." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useStore();
  const [date, setDate] = useState(todayKey());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [meal, setMeal] = useState<MealKey>("breakfast");

  const totals = dayTotals(state, date);
  const { settings } = state;
  const remaining = Math.max(0, settings.calorieGoal - totals.calories);
  const steps = state.steps[date] ?? 0;

  const shift = (days: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    if (d > new Date()) return;
    setDate(toKey(d));
  };

  const weightData = useMemo(
    () =>
      state.weights
        .slice(-7)
        .map((w) => ({ name: heShort(w.date), value: w.value })),
    [state.weights],
  );
  const trend =
    weightData.length > 1
      ? +(weightData[weightData.length - 1].value - weightData[0].value).toFixed(1)
      : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "בוקר טוב" : hour < 18 ? "צהריים טובים" : "ערב טוב";
  const nextMeal =
    MEALS.find((m) => !state.entries.some((e) => e.date === date && e.meal === m.key)) ?? MEALS[3];

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{settings.name}</h1>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            onClick={() => shift(-1)}
            className="grid size-8 place-items-center rounded-full hover:bg-accent"
            aria-label="יום קודם"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="min-w-36 px-2 text-center text-xs font-medium">
            {date === todayKey() ? "היום" : heDate(date)}
          </span>
          <button
            onClick={() => shift(1)}
            disabled={date === todayKey()}
            className="grid size-8 place-items-center rounded-full hover:bg-accent disabled:opacity-40"
            aria-label="יום הבא"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Footprints className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">צעדים</p>
            <p className="text-xl font-bold tabular-nums">
              {steps.toLocaleString("he-IL")}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / {settings.stepGoal.toLocaleString("he-IL")}
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (steps / settings.stepGoal) * 100)}%` }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => actions.setSteps(date, steps + 1000)}
          >
            +1000
          </Button>
        </Card>

        <Card className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Flame className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">קלוריות שנצרכו</p>
            <p className="text-xl font-bold tabular-nums">
              {totals.calories}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / {settings.calorieGoal}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              נותרו {remaining} קק״ל להשלמת היעד
            </p>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col items-center gap-6 md:flex-row md:items-center">
        <Ring
          value={totals.calories}
          goal={settings.calorieGoal}
          label={`${remaining}`}
          sub="קק״ל נותרו"
        />
        <div className="w-full flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric title="נצרך" value={`${totals.calories}`} />
            <Metric title="יעד" value={`${settings.calorieGoal}`} />
            <Metric title="נותר" value={`${remaining}`} />
          </div>
          <div className="space-y-3">
            <MacroBar label="חלבון" value={totals.protein} goal={settings.proteinGoal} color="protein" />
            <MacroBar label="פחמימות" value={totals.carbs} goal={settings.carbGoal} color="carb" />
            <MacroBar label="שומן" value={totals.fat} goal={settings.fatGoal} color="fat" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">מגמת משקל שבועית</h2>
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <TrendingDown className="size-4" />
              {trend > 0 ? `+${trend}` : trend} ק״ג
            </span>
          </div>
          <div className="h-44 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--card-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-bold">הארוחה הבאה</h2>
            <p className="mt-3 text-2xl font-extrabold">{nextMeal.label}</p>
            <p className="text-sm text-muted-foreground">מומלץ סביב השעה {nextMeal.time}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-full"
              onClick={() => {
                setMeal(nextMeal.key);
                setPickerOpen(true);
              }}
            >
              <Plus className="size-4" /> הוספה מהירה
            </Button>
            <Button variant="outline" className="rounded-full" asChild>
              <Link to="/log">מעבר ליומן</Link>
            </Button>
          </div>
        </Card>
      </div>

      <FoodPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        meal={meal}
        onMealChange={setMeal}
      />
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 py-2.5">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
