import { useState } from "react";
import { History, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StepsDialog } from "@/components/FabMenu";
import { dayTotals, dayWater, heDayLabel, lastDays, useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";

export type MetricKind = "calories" | "steps" | "water" | "protein" | "carbs" | "fat";

const META: Record<MetricKind, { title: string; unit: string; value: (s: AppState, d: string) => number }> = {
  calories: { title: "קלוריות", unit: "קל׳", value: (s, d) => Math.round(dayTotals(s, d).calories) },
  protein: { title: "חלבון", unit: "ג׳", value: (s, d) => Math.round(dayTotals(s, d).protein) },
  carbs: { title: "פחמימות", unit: "ג׳", value: (s, d) => Math.round(dayTotals(s, d).carbs) },
  fat: { title: "שומן", unit: "ג׳", value: (s, d) => Math.round(dayTotals(s, d).fat) },
  steps: { title: "צעדים", unit: "צעדים", value: (s, d) => s.steps[d] ?? 0 },
  water: { title: "מים", unit: "מ״ל", value: (s, d) => dayWater(s, d) },
};

export function MetricHistoryButton({ kind, label = "היסטוריה" }: { kind: MetricKind; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
      >
        <History className="size-3.5" /> {label}
      </button>
      <MetricHistoryDialog kind={kind} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function MetricHistoryDialog({
  kind,
  open,
  onOpenChange,
}: {
  kind: MetricKind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const state = useStore();
  const [range, setRange] = useState(7);
  const [editDate, setEditDate] = useState<string | null>(null);
  const meta = META[kind];
  const days = lastDays(range).reverse();
  const goal =
    kind === "calories"
      ? state.settings.calorieGoal
      : kind === "steps"
        ? state.settings.stepGoal
        : kind === "water"
          ? state.settings.waterGoal
          : kind === "protein"
            ? state.settings.proteinGoal
            : kind === "carbs"
              ? state.settings.carbGoal
              : state.settings.fatGoal;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid-cols-1 w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 text-right sm:w-full sm:max-w-sm sm:p-6">
          <DialogHeader className="text-right">
            <DialogTitle>היסטוריית {meta.title}</DialogTitle>
            <DialogDescription>לפי יום בשבוע ותאריך</DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 rounded-full border border-border p-1">
            {[
              { d: 7, l: "שבוע" },
              { d: 30, l: "חודש" },
              { d: 90, l: "3 חודשים" },
            ].map((r) => (
              <button
                key={r.d}
                onClick={() => setRange(r.d)}
                className={
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-medium " +
                  (range === r.d ? "bg-primary text-primary-foreground" : "text-muted-foreground")
                }
              >
                {r.l}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {days.map((d) => {
              const v = meta.value(state, d);
              return (
                <div key={d} className="flex items-center gap-2 rounded-2xl bg-muted/50 px-3 py-2.5">
                  <span className="flex-1 text-sm">{heDayLabel(d)}</span>
                  <span className="font-semibold tabular-nums">
                    {v.toLocaleString("he-IL")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {goal.toLocaleString("he-IL")} {meta.unit}
                    </span>
                  </span>
                  {kind === "steps" && (
                    <button
                      onClick={() => setEditDate(d)}
                      aria-label="עריכה"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <Button variant="outline" className="w-full rounded-full" onClick={() => onOpenChange(false)}>
            סגירה
          </Button>
        </DialogContent>
      </Dialog>

      {kind === "steps" && (
        <StepsDialog
          open={!!editDate}
          onOpenChange={(v) => !v && setEditDate(null)}
          date={editDate ?? undefined}
        />
      )}
    </>
  );
}
