import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Beef,
  Droplets,
  Flame,
  Footprints,
  Plus,
  RotateCcw,
  TrendingDown,
  UtensilsCrossed,
  Wheat,
  Droplet,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Card, DarkCalorieRing, MacroSideCard, MiniPercentRing } from "@/components/Stat";
import { DayNav } from "@/components/DayNav";
import { MetricHistoryButton } from "@/components/MetricHistoryDialog";
import { FoodPickerDialog } from "@/components/FoodPickerDialog";
import { HuaweiStepsHint, HuaweiStepsSync } from "@/components/HuaweiStepsSync";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actions,
  dayTotals,
  dayWater,
  getActiveGoals,
  getDayMode,
  heDayLabel,
  todayKey,
  useStore,
} from "@/lib/store";
import { lastSyncIsToday } from "@/lib/huaweiSteps";
import { MEALS, type DayMode, type LogEntry, type MealKey } from "@/lib/types";

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
  const dayMode = getDayMode(state, date);
  const goals = getActiveGoals(state, date);
  const remaining = Math.max(0, goals.calorieGoal - totals.calories);
  const steps = state.steps[date] ?? 0;
  const water = dayWater(state, date);
  const showHuaweiHint = date === todayKey() && !lastSyncIsToday(settings.huaweiLastSync);
  const caloriePct =
    goals.calorieGoal > 0 ? Math.min(100, (totals.calories / goals.calorieGoal) * 100) : 0;
  const waterPct =
    settings.waterGoal > 0 ? Math.min(100, (water / settings.waterGoal) * 100) : 0;

  const weightData = useMemo(
    () => state.weights.slice(-7).map((w) => ({ name: heDayLabel(w.date), value: w.value })),
    [state.weights],
  );
  const trend =
    weightData.length > 1
      ? +((weightData.at(-1)?.value ?? 0) - (weightData[0]?.value ?? 0)).toFixed(1)
      : 0;

  const nextMeal =
    MEALS.find((m) => !state.entries.some((e) => e.date === date && e.meal === m.key)) ?? MEALS[3]!;

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

  const onModeChange = (value: string) => {
    const mode = value as DayMode;
    actions.setDayMode(date, mode);
    toast.success(mode === "training" ? "עברת ליום אימון" : "עברת ליום מנוחה");
  };

  const addWaterQuick = (ml: number) => {
    actions.addWater(date, ml);
    toast.success(`נוספו ${ml} מ״ל מים`);
  };

  return (
    <div className="space-y-4">
      {/* כותרת + מצב יום — כמו בצילום */}
      <div className="flex items-center justify-between gap-3">
        <Select value={dayMode} onValueChange={onModeChange}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-full border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="training">יום אימון</SelectItem>
            <SelectItem value="rest">יום מנוחה</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-bold tracking-tight">צריכת קלוריות</h2>
          <Flame className="size-5 text-primary" />
        </div>
      </div>

      {showHuaweiHint && <HuaweiStepsHint onSync={() => setStepsOpen(true)} />}

      {/* בלוק קלוריות ראשי — טבעת כהה + מאקרו בצד */}
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-3 items-stretch">
        {/* כרטיס כהה עם טבעת */}
        <div className="flex flex-col overflow-hidden rounded-[1.35rem] bg-[#2a2a2a] shadow-md dark:bg-[#1a1a1a]">
          <div className="flex flex-1 items-center justify-center px-2 pt-5 pb-2">
            <DarkCalorieRing
              remaining={remaining}
              consumed={totals.calories}
              goal={goals.calorieGoal}
              size={168}
            />
          </div>
          <div className="flex flex-col items-center gap-2.5 bg-card px-3 pb-4 pt-3 rounded-t-2xl -mt-1">
            <p className="text-sm font-semibold text-primary tabular-nums">
              {goals.calorieGoal} קלוריות ביעדים
            </p>
            <Button
              variant="outline"
              className="h-10 w-full max-w-[200px] rounded-full border-2 border-foreground/80 font-semibold"
              asChild
            >
              <Link to="/log">יומן יומי</Link>
            </Button>
          </div>
        </div>

        {/* מאקרו בצד */}
        <div className="flex flex-col gap-2.5">
          <MacroSideCard
            label="חלבון"
            value={totals.protein}
            goal={goals.proteinGoal}
            icon={<Beef className="size-4" />}
            accentClass="text-protein"
            barClass="bg-protein"
          />
          <MacroSideCard
            label="פחמימות"
            value={totals.carbs}
            goal={goals.carbGoal}
            icon={<Wheat className="size-4" />}
            accentClass="text-carb"
            barClass="bg-carb"
          />
          <MacroSideCard
            label="שומן"
            value={totals.fat}
            goal={goals.fatGoal}
            icon={<Droplet className="size-4" />}
            accentClass="text-fat"
            barClass="bg-fat"
          />
        </div>
      </div>

      {/* מים + אחוז התקדמות קלורית */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <Droplets className="size-6 shrink-0 text-water" />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tabular-nums leading-none">{water}ml</p>
            <p className="mt-0.5 text-xs text-muted-foreground">צריכת מים</p>
          </div>
          <button
            type="button"
            aria-label="הוסף מים"
            onClick={() => addWaterQuick(250)}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2ea3f2] text-white shadow-md transition active:scale-95"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="shrink-0 rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
          <MiniPercentRing percent={caloriePct} size={56} />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <MetricHistoryButton kind="calories" label="היסטוריית קלוריות" />
        <MetricHistoryButton kind="protein" label="חלבון" />
        <MetricHistoryButton kind="carbs" label="פחמימות" />
        <MetricHistoryButton kind="fat" label="שומן" />
      </div>

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
            <p className="text-xs text-muted-foreground">צעדים מהצמיד</p>
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
          <Button size="sm" className="rounded-full" onClick={() => setStepsOpen(true)}>
            מהצמיד
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => actions.setSteps(date, steps + 1000)}>
            <span dir="ltr">+1000</span>
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
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-water" style={{ width: `${waterPct}%` }} />
          </div>
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
      <HuaweiStepsSync open={stepsOpen} onOpenChange={setStepsOpen} date={date} />
    </div>
  );
}
