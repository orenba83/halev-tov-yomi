import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Droplets, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DayNav } from "@/components/DayNav";
import { actions, dayWater, todayKey, useStore } from "@/lib/store";
import type { WaterEntry } from "@/lib/types";

export const Route = createFileRoute("/water")({
  validateSearch: (s: Record<string, unknown>) => ({ date: typeof s["date"] === "string" ? s["date"] : undefined }),
  head: () => ({
    meta: [
      { title: "מעקב מים — פיטראק" },
      { name: "description", content: "מעקב שתיית מים יומי מול יעד, הוספה, עריכה ומחיקה של רישומים." },
      { property: "og:title", content: "מעקב מים — פיטראק" },
      { property: "og:description", content: "מעקב שתיית מים יומי מול יעד אישי." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WaterScreen,
});

const QUICK = [200, 250, 330, 500];

function WaterScreen() {
  const { date: searchDate } = Route.useSearch();
  const state = useStore();
  const [date, setDate] = useState(searchDate ?? todayKey());
  const [custom, setCustom] = useState("");
  const [editing, setEditing] = useState<WaterEntry | null>(null);

  const total = dayWater(state, date);
  const goal = state.settings.waterGoal;
  const pct = Math.min(100, Math.round((total / goal) * 100));
  const items = state.water.filter((w) => w.date === date);

  const addCustom = () => {
    const n = Number(custom);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("יש להזין כמות חיובית");
      return;
    }
    actions.addWater(date, n);
    setCustom("");
    toast.success(`נוספו ${n} מ״ל`);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/log">
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">מעקב מים</h1>
          <p className="text-sm text-muted-foreground">יעד יומי: {goal} מ״ל (ניתן לשינוי בהגדרות)</p>
        </div>
      </header>

      <DayNav date={date} onChange={setDate} />

      <Card className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-3xl bg-water/15 text-water">
          <Droplets className="size-7" />
        </span>
        <p className="text-4xl font-extrabold tabular-nums">{total}</p>
        <p className="text-sm text-muted-foreground">
          מ״ל מתוך {goal} · {pct}%
        </p>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-water transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">הוספת שתייה</h2>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <Button key={q} variant="outline" className="rounded-full" onClick={() => actions.addWater(date, q)}>
              <span dir="ltr">+{q}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>כמות מותאמת (מ״ל)</Label>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="750"
            />
          </div>
          <Button className="rounded-full" onClick={addCustom}>
            <Plus className="size-4" /> הוספה
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-bold">רישומי היום</h2>
        {items.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5">
            <Droplets className="size-4 shrink-0 text-water" />
            <span className="flex-1 text-sm tabular-nums">{w.ml} מ״ל</span>
            <span className="text-xs text-muted-foreground">{w.time}</span>
            <button onClick={() => setEditing(w)} aria-label="עריכה" className="text-muted-foreground hover:text-foreground">
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => {
                actions.deleteWater(w.id);
                toast.success("הרישום נמחק");
              }}
              aria-label="מחיקה"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!items.length && <p className="py-4 text-center text-sm text-muted-foreground">אין רישומים ליום זה</p>}
      </Card>

      <EditWaterDialog entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditWaterDialog({ entry, onClose }: { entry: WaterEntry | null; onClose: () => void }) {
  const [ml, setMl] = useState("");
  return (
    <Dialog
      open={!!entry}
      onOpenChange={(v) => {
        if (!v) onClose();
        else if (entry) setMl(String(entry.ml));
      }}
    >
      <DialogContent
        className="text-right sm:max-w-sm"
        onOpenAutoFocus={() => entry && setMl(String(entry.ml))}
      >
        <DialogHeader className="text-right">
          <DialogTitle>עריכת שתייה</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>כמות (מ״ל)</Label>
          <Input inputMode="numeric" dir="ltr" value={ml} onChange={(e) => setMl(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const n = Number(ml);
              if (!entry || !Number.isFinite(n) || n <= 0) {
                toast.error("כמות לא תקינה");
                return;
              }
              actions.updateWater(entry.id, n);
              toast.success("עודכן");
              onClose();
            }}
          >
            שמירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
