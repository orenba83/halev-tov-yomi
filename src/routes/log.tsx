import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sunrise,
  Sun,
  Sunset,
  Cookie,
} from "lucide-react";
import { toast } from "sonner";
import { FoodPickerDialog } from "@/components/FoodPickerDialog";
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
  getActiveGoals,
  getDayMode,
  heDayLabel,
  todayKey,
  toKey,
  useStore,
} from "@/lib/store";
import { MEALS, type DayMode, type MealKey } from "@/lib/types";
import { cn } from "@/lib/utils";

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

const MEAL_ICONS = [Sunrise, Sun, Sunset, Cookie] as const;
const MEAL_ICON_BG = [
  "bg-sky-100 text-sky-500",
  "bg-amber-100 text-amber-500",
  "bg-orange-100 text-orange-500",
  "bg-violet-100 text-violet-500",
] as const;

function DailyLog() {
  const state = useStore();
  const [date, setDate] = useState(todayKey());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMeal, setPickerMeal] = useState<MealKey>("breakfast");

  const totals = dayTotals(state, date);
  const dayMode = getDayMode(state, date);
  const goals = getActiveGoals(state, date);
  const isToday = date === todayKey();

  const proteinKcal = Math.round(totals.protein * 4);
  const carbKcal = Math.round(totals.carbs * 4);
  const fatKcal = Math.round(totals.fat * 9);
  const proteinGoalKcal = Math.round(goals.proteinGoal * 4);
  const carbGoalKcal = Math.round(goals.carbGoal * 4);
  const fatGoalKcal = Math.round(goals.fatGoal * 9);

  const eatenPct =
    goals.calorieGoal > 0 ? Math.min(1, totals.calories / goals.calorieGoal) : 0;
  const ringSize = 148;
  const stroke = 10;
  const r = ringSize / 2 - stroke - 4;
  const circ = 2 * Math.PI * r;

  const shiftDate = (days: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    if (d > new Date()) return;
    setDate(toKey(d));
  };

  const onModeChange = (value: string) => {
    const mode = value as DayMode;
    actions.setDayMode(date, mode);
    toast.success(mode === "training" ? "עברת ליום אימון" : "עברת ליום מנוחה");
  };

  const openAdd = (meal: MealKey) => {
    setPickerMeal(meal);
    setPickerOpen(true);
  };

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-primary">יומן יומי</h1>
      </header>

      <div className="flex justify-start">
        <Select value={dayMode} onValueChange={onModeChange}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-full border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="training">יום אימון</SelectItem>
            <SelectItem value="rest">יום מנוחה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              strokeWidth={stroke}
              className="stroke-muted"
              fill="none"
              strokeDasharray="4 6"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              strokeWidth={stroke}
              strokeLinecap="round"
              className="stroke-primary transition-all duration-500"
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - eatenPct)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold tabular-nums leading-none">
              {Math.round(totals.calories)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">קלוריות נאכלו</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-right text-sm font-semibold">
            <span className="text-primary tabular-nums">{goals.calorieGoal}</span>
            <span className="text-muted-foreground"> קלוריות ביעדים</span>
          </p>
          <MacroKcalRow label="חלבון" value={proteinKcal} goal={proteinGoalKcal} dotClass="bg-protein" />
          <MacroKcalRow label="פחמימות" value={carbKcal} goal={carbGoalKcal} dotClass="bg-carb" />
          <MacroKcalRow label="שומן" value={fatKcal} goal={fatGoalKcal} dotClass="bg-fat" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="יום קודם"
          onClick={() => shiftDate(-1)}
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-accent"
        >
          <ChevronRight className="size-5" />
        </button>
        <span className="min-w-[5.5rem] text-center text-base font-semibold">
          {isToday ? "היום" : heDayLabel(date)}
        </span>
        <button
          type="button"
          aria-label="יום הבא"
          disabled={isToday}
          onClick={() => shiftDate(1)}
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-accent disabled:opacity-40"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      <div className="space-y-3">
        {MEALS.map((m, i) => {
          const items = state.entries.filter((e) => e.date === date && e.meal === m.key);
          const cal = items.reduce((a, e) => a + e.calories, 0);
          const Icon = MEAL_ICONS[i] ?? Sunrise;
          const iconBg = MEAL_ICON_BG[i] ?? MEAL_ICON_BG[0];
          const hasFood = items.length > 0;

          return (
            <div
              key={m.key}
              className="rounded-3xl border border-border/70 bg-card px-4 py-3.5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={cn("grid size-9 place-items-center rounded-full", iconBg)}>
                  <Icon className="size-4" />
                </span>
                <div>
                  <Link
                    to="/meal/$meal"
                    params={{ meal: m.key }}
                    search={{ date }}
                    className="text-base font-bold hover:underline"
                  >
                    {m.label}
                  </Link>
                  {hasFood && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {Math.round(cal)} קל׳ · {items.length} פריטים
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAdd(m.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  <MessageCircle className="size-3.5" />
                  הוספת מוצר
                </button>
                <Link
                  to="/advisor"
                  className="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent"
                  aria-label="יועץ AI"
                >
                  <MessageCircle className="size-3.5" />
                </Link>
                <Button size="sm" className="mr-auto rounded-full px-4 text-xs font-semibold" asChild>
                  <Link to="/meal/$meal" params={{ meal: m.key }} search={{ date }}>
                    {hasFood ? "צפייה בארוחה" : "סמן כנאכל"}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <FoodPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        meal={pickerMeal}
        onMealChange={setPickerMeal}
        date={date}
      />
    </div>
  );
}

function MacroKcalRow({
  label,
  value,
  goal,
  dotClass,
}: {
  label: string;
  value: number;
  goal: number;
  dotClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-xs tabular-nums text-muted-foreground">
        {value}/{goal} קק״ל
      </span>
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {label}
        <span className={cn("size-2.5 rounded-full", dotClass)} />
      </span>
    </div>
  );
}
