import { cn } from "@/lib/utils";

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
