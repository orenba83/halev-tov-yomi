import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Droplets, Flame, Footprints, Plus, RotateCcw, TrendingDown, UtensilsCrossed } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Card, MacroTile, Ring } from "@/components/Stat";
import { DayNav } from "@/components/DayNav";
import { MetricHistoryButton } from "@/components/MetricHistoryDialog";
import { FoodPickerDialog } from "@/components/FoodPickerDialog";
import { StepsDialog } from "@/components/FabMenu";
import { Button } from "@/components/ui/button";
import { actions, dayTotals, dayWater, heDayLabel, todayKey, useStore } from "@/lib/store";
import { MEALS, type LogEntry, type MealKey } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "לוח בקרה — פיטראק" },
      { name: "description", content: "מאזן קלורי יומי, מאקרו, צעדים ומגמת משקל במקום אחד." },
      { property: "og:title", content: "לוח בקרה — פיטראק" },
      { property: "og:description", content: "מאזן קלורי יומי, מאקרו, צעדים ומגמת משקל." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useStore();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayKey());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [meal, setMeal] = useState<MealKey>("breakfast");

  const totals = dayTotals(state, date);
  const { settings } = state;
  const remaining = Math.max(0, settings.calorieGoal - totals.calories);
  const steps = state.steps[date] ?? 0;
  const water = dayWater(state, date);

  const weightData = useMemo(
    () => state.weights.slice(-7).map((w) => ({ name: heDayLabel(w.date), value: w.value })),
    [state.weights],
  );
  const trend =
    weightData.length > 1
      ? +((weightData.at(-1)?.value ?? 0) - (weightData[0]?.value ?? 0)).toFixed(1)
      : 0;

  const [greeting, setGreeting] = useState("שלום");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "בוקר טוב" : hour < 18 ? "צהריים טובים" : "ערב טוב");
  }, []);
  const nextMeal =
    MEALS.find((m) => !state.entries.some((e) => e.date === date && e.meal === m.key)) ?? MEALS[3]!;

  /** Unique recent log items for one-tap re-add */
  const recentFromHistory = useMemo(() => {
    const seen = new Set<string>();
    const out: LogEntry[] = [];
    for (let i = state.entries.length - 1; i >= 0; i--) {
      const e = state.entries[i]!;
      const key = `${e.name}|${e.grams}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= 6) break;
    }
    return out;
  }, [state.entries]);

  const reAdd = (e: LogEntry) => {
    actions.addEntry({
      date,
      meal: nextMeal.key,
      name: e.name,
      grams: e.grams,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
    });
    toast.success(`נוסף ל${nextMeal.label}: ${e.name}`);
  };

  return (
    <div className="space-y-4">
      <header className="text-center">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{settings.name}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MacroTile label="קלוריות" value={totals.calories} goal={settings.calorieGoal} color="primary" unit="קל׳" />
        <MacroTile label="חלבון" value={totals.protein} goal={settings.proteinGoal} color="protein" />
        <MacroTile label="פחמימות" value={totals.carbs} goal={settings.carbGoal} color="carb" />
        <MacroTile label="שומן" value={totals.fat} goal={settings.fatGoal} color="fat" />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <MetricHistoryButton kind="calories" label="היסטוריית קלוריות" />
        <MetricHistoryButton kind="protein" label="חלבון" />
        <MetricHistoryButton kind="carbs" label="פחמימות" />
        <MetricHistoryButton kind="fat" label="שומן" />
      </div>

      <Card className="flex flex-col items-center gap-5 md:flex-row md:justify-center">
        <Ring value={totals.calories} goal={settings.calorieGoal} label={`${remaining}`} sub="קל׳ נותרו" />
        <div className="grid w-full max-w-sm grid-cols-3 gap-2 text-center">
          <Metric title="סה״כ נאכל" value={`${Math.round(totals.calories)}`} />
          <Metric title="יעד" value={`${settings.calorieGoal}`} />
          <Metric title="נותר" value={`${remaining}`} />
        </div>
      </Card>

      {recentFromHistory.length > 0 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">הוסף שוב</h2>
            <span className="text-xs text-muted-foreground">ל{nextMeal.label}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentFromHistory.map((e) => (
              <button
                key={`${e.name}-${e.grams}-${e.id}`}
                type="button"
                onClick={() => reAdd(e)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <RotateCcw className="size-3.5 text-primary" />
                <span className="max-w-[9rem] truncate">{e.name}</span>
                <span className="text-muted-foreground">{e.grams}ג׳</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="font-bold">פירוט לפי ארוחות</h2>
        {MEALS.map((m) => {
          const t = state.entries
            .filter((e) => e.date === date && e.meal === m.key)
            .reduce(
              (a, e) => ({
                calories: a.calories + e.calories,
                protein: a.protein + e.protein,
                carbs: a.carbs + e.carbs,
                fat: a.fat + e.fat,
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 },
            );
          return (
            <Link
              key={m.key}
              to="/meal/$meal"
              params={{ meal: m.key }}
              search={{ date }}
              className="block rounded-2xl bg-muted/50 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-sm font-bold tabular-nums">{Math.round(t.calories)} קל׳</span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                חלבון {Math.round(t.protein)} ג׳ · פחמימות {Math.round(t.carbs)} ג׳ · שומן {Math.round(t.fat)} ג׳
              </p>
            </Link>
          );
        })}
      </Card>

      <Card className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Footprints className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">צעדים</p>
            <MetricHistoryButton kind="steps" />
          </div>
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
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => actions.setSteps(date, steps + 1000)}>
            <span dir="ltr">+1000</span>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setStepsOpen(true)}>
            עדכון
          </Button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <UtensilsCrossed className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">הארוחה הבאה</p>
          <p className="text-lg font-extrabold">{nextMeal.label}</p>
          <p className="text-xs text-muted-foreground">מומלץ סביב {nextMeal.time}</p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => {
            setMeal(nextMeal.key);
            setPickerOpen(true);
          }}
        >
          <Plus className="size-4" /> הוסף מוצר לארוחה זאת
        </Button>
      </Card>

      <DayNav date={date} onChange={setDate} />

      <Card className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-water/15 text-water">
          <Droplets className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">מים</p>
          <p className="text-xl font-bold tabular-nums">
            {water}{" "}
            <span className="text-xs font-normal text-muted-foreground">/ {settings.waterGoal} מ״ל</span>
          </p>
        </div>
        <MetricHistoryButton kind="water" />
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate({ to: "/water" })}>
          מעקב מים
        </Button>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">מגמת משקל — שבוע אחרון</h2>
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <TrendingDown className="size-4" />
            {trend > 0 ? `+${trend}` : trend} ק״ג
          </span>
        </div>
        <div className="h-48 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--card-foreground)",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Button variant="outline" className="mt-3 w-full rounded-full" asChild>
          <Link to="/progress">לכל ההתקדמות וההיסטוריה</Link>
        </Button>
      </Card>

      <FoodPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        meal={meal}
        onMealChange={setMeal}
        date={date}
      />
      <StepsDialog open={stepsOpen} onOpenChange={setStepsOpen} date={date} />
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
