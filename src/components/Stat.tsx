import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-3xl border border-border/80 bg-card p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Ring({
  value,
  goal,
  size = 168,
  label,
  sub,
}: {
  value: number;
  goal: number;
  size?: number;
  label: string;
  sub: string;
}) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={12} className="stroke-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={12}
          strokeLinecap="round"
          className="stroke-primary transition-all duration-500"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center leading-tight">
        <div className="text-3xl font-extrabold tabular-nums">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

/** טבעת לבנה על רקע כהה — כמו בעיצוב היעד */
export function DarkCalorieRing({
  remaining,
  consumed,
  goal,
  size = 200,
}: {
  remaining: number;
  consumed: number;
  goal: number;
  size?: number;
}) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const stroke = 10;
  const r = size / 2 - stroke - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke="rgba(255,255,255,0.22)"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="white"
          fill="none"
          className="transition-all duration-500"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center leading-tight text-white">
        <div className="text-4xl font-extrabold tabular-nums tracking-tight">
          {Math.round(remaining)}
        </div>
        <div className="mt-1 text-[13px] font-medium text-white/80">קלוריות נותרו</div>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: "protein" | "carb" | "fat" | "water";
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const bg = { protein: "bg-protein", carb: "bg-carb", fat: "bg-fat", water: "bg-water" }[color];
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value)} / {goal} ג׳
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-500", bg)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** קוביית מאקרו לתצוגה במבט אחד */
export function MacroTile({
  label,
  value,
  goal,
  color,
  unit = "ג׳",
}: {
  label: string;
  value: number;
  goal: number;
  color: "primary" | "protein" | "carb" | "fat";
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const bg = {
    primary: "bg-primary",
    protein: "bg-protein",
    carb: "bg-carb",
    fat: "bg-fat",
  }[color];
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums leading-tight">{Math.round(value)}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        מתוך {goal} {unit}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** כרטיס מאקרו קומפקטי כמו בצילום */
export function MacroSideCard({
  label,
  value,
  goal,
  icon,
  accentClass,
  barClass,
}: {
  label: string;
  value: number;
  goal: number;
  icon: ReactNode;
  accentClass: string;
  barClass: string;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("grid size-5 place-items-center", accentClass)}>{icon}</span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {Math.round(value)} / {goal}g
        </p>
      </div>
    </div>
  );
}

/** טבעת אחוזים קטנה */
export function MiniPercentRing({
  percent,
  size = 64,
  stroke = 5,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min(1, Math.max(0, percent / 100));
  const r = size / 2 - stroke - 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-muted"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary transition-all duration-500"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums text-foreground">
        {Math.round(percent)}%
      </span>
    </div>
  );
}
