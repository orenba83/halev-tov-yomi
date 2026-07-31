import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Footprints, Plus, Ruler, Scale, Trash2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/Stat";
import { MeasureDialog, WeightDialog } from "@/components/FabMenu";
import { Button } from "@/components/ui/button";
import { actions, dayTotals, heShort, todayKey, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "התקדמות — פיטראק" },
      { name: "description", content: "גרף משקל, היקפי גוף, צעדים והיסטוריית מדידות." },
      { property: "og:title", content: "התקדמות — פיטראק" },
      { property: "og:description", content: "גרף משקל, היקפי גוף והיסטוריית מדידות." },
    ],
  }),
  component: Progress,
});

const RANGES = [
  { key: 7, label: "שבוע" },
  { key: 30, label: "חודש" },
  { key: 90, label: "3 חודשים" },
];

function Progress() {
  const state = useStore();
  const [range, setRange] = useState(30);
  const [weightOpen, setWeightOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const today = todayKey();

  const data = useMemo(() => {
    const min = new Date(Date.now() - range * 86400000);
    return state.weights
      .filter((w) => new Date(w.date + "T00:00:00") >= min)
      .map((w) => ({ name: heShort(w.date), value: w.value }));
  }, [state.weights, range]);

  const last = state.weights[state.weights.length - 1];
  const first = data[0];
  const diff = last && first ? +(last.value - first.value).toFixed(1) : 0;
  const lastM = state.measurements[state.measurements.length - 1];
  const totals = dayTotals(state, today);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">ההתקדמות שלי</h1>
          <p className="text-sm text-muted-foreground">מדדים, מגמות והיסטוריה</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setWeightOpen(true)}>
            <Scale className="size-4" /> שקילה
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => setMeasureOpen(true)}>
            <Ruler className="size-4" /> מדידה
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={Scale} label="משקל נוכחי" value={last ? `${last.value} ק״ג` : "—"} />
        <Tile icon={Ruler} label="היקף מותניים" value={lastM ? `${lastM.waist} ס״מ` : "—"} />
        <Tile
          icon={Footprints}
          label="צעדים היום"
          value={(state.steps[today] ?? 0).toLocaleString("he-IL")}
        />
        <Tile icon={Flame} label="קלוריות היום" value={`${totals.calories}`} />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">גרף משקל</h2>
            <p className="text-xs text-muted-foreground">
              שינוי בטווח הנבחר: {diff > 0 ? `+${diff}` : diff} ק״ג
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={3}
                fill="url(#wg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-bold">היסטוריית שקילות</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {[...state.weights].reverse().map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5">
                <span className="flex-1 text-sm">{heShort(w.date)}</span>
                <span className="font-semibold tabular-nums">{w.value} ק״ג</span>
                <button
                  onClick={() => actions.deleteWeight(w.id)}
                  aria-label="מחיקה"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {!state.weights.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">אין נתונים</p>
            )}
          </div>
          <Button variant="outline" className="w-full rounded-full" onClick={() => setWeightOpen(true)}>
            <Plus className="size-4" /> הוספת שקילה
          </Button>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">היקפי גוף</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {[...state.measurements].reverse().map((m) => (
              <div key={m.id} className="rounded-2xl bg-muted/50 px-3 py-2.5">
                <p className="text-sm font-medium">{heShort(m.date)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  מותניים {m.waist} · חזה {m.chest} · יד {m.arm} · ירך {m.thigh} (ס״מ)
                </p>
              </div>
            ))}
            {!state.measurements.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">אין נתונים</p>
            )}
          </div>
          <Button variant="outline" className="w-full rounded-full" onClick={() => setMeasureOpen(true)}>
            <Plus className="size-4" /> הוספת מדידה
          </Button>
        </Card>
      </div>

      <WeightDialog open={weightOpen} onOpenChange={setWeightOpen} />
      <MeasureDialog open={measureOpen} onOpenChange={setMeasureOpen} />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card className="space-y-1">
      <Icon className="size-4 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </Card>
  );
}
