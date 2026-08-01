import { useEffect, useState } from "react";
import { Footprints, Plus, Ruler, Scale, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, todayKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MEASURE_FIELDS, type MeasurementEntry, type MealKey, type WeightEntry } from "@/lib/types";
import { FoodPickerDialog, NumField } from "./FoodPickerDialog";

export function FabMenu() {
  const [open, setOpen] = useState(false);
  const [food, setFood] = useState(false);
  const [meal, setMeal] = useState<MealKey>("breakfast");
  const [weight, setWeight] = useState(false);
  const [measure, setMeasure] = useState(false);

  const items = [
    { icon: UtensilsCrossed, label: "ארוחה / מוצר", onClick: () => (setOpen(false), setFood(true)) },
    { icon: Scale, label: "שקילה", onClick: () => (setOpen(false), setWeight(true)) },
    { icon: Ruler, label: "מדידת היקפים", onClick: () => (setOpen(false), setMeasure(true)) },
  ];

  return (
    <>
      <div className="fixed bottom-20 left-4 z-40 flex flex-col items-start gap-3 md:bottom-8">
        {open &&
          items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-[1.02]"
            >
              <item.icon className="size-4 text-primary" />
              {item.label}
            </button>
          ))}
        <button
          aria-label="הוספה מהירה"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform",
            open && "rotate-45",
          )}
        >
          {open ? <X className="size-6" /> : <Plus className="size-7" />}
        </button>
      </div>

      <FoodPickerDialog open={food} onOpenChange={setFood} meal={meal} onMealChange={setMeal} />
      <WeightDialog open={weight} onOpenChange={setWeight} />
      <MeasureDialog open={measure} onOpenChange={setMeasure} />
    </>
  );
}

export function WeightDialog({
  open,
  onOpenChange,
  edit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit?: WeightEntry | null | undefined;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    if (open) {
      setValue(edit ? String(edit.value) : "");
      setDate(edit ? edit.date : todayKey());
    }
  }, [open, edit]);

  const save = () => {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("יש להזין משקל חיובי");
      return;
    }
    if (edit) actions.updateWeight(edit.id, { value: +v.toFixed(1), date });
    else actions.addWeight(date, +v.toFixed(1));
    toast.success("המשקל נשמר");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>{edit ? "עריכת שקילה" : "הוספת שקילה"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <NumField label="משקל (ק״ג) *" value={value} onChange={setValue} step="0.1" />
          <DateField value={date} onChange={setDate} />
          <Button onClick={save}>שמירה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MeasureDialog({
  open,
  onOpenChange,
  edit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  edit?: MeasurementEntry | null | undefined;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    MEASURE_FIELDS.forEach((m) => (init[m.key] = edit ? String(edit[m.key] ?? "") : ""));
    setF(init);
    setDate(edit ? edit.date : todayKey());
  }, [open, edit]);

  const save = () => {
    const nums = MEASURE_FIELDS.map((m) => Number(f[m.key] || 0));
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error("ערכים לא יכולים להיות שליליים");
      return;
    }
    if (nums.every((n) => n === 0)) {
      toast.error("יש למלא לפחות מדידה אחת");
      return;
    }
    const payload = {
      date,
      waist: Number(f["waist"] || 0),
      chest: Number(f["chest"] || 0),
      arm: Number(f["arm"] || 0),
      thigh: Number(f["thigh"] || 0),
      hips: Number(f["hips"] || 0),
    };
    if (edit) actions.updateMeasurement(edit.id, payload);
    else actions.addMeasurement(payload);
    toast.success("המדידות נשמרו");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>{edit ? "עריכת היקפים" : "מדידת היקפים"} (ס״מ)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {MEASURE_FIELDS.map((m) => (
            <NumField
              key={m.key}
              label={m.label}
              value={f[m.key] ?? ""}
              onChange={(v) => setF({ ...f, [m.key]: v })}
              step="0.1"
            />
          ))}
          <DateField value={date} onChange={setDate} />
        </div>
        <Button onClick={save}>שמירה</Button>
      </DialogContent>
    </Dialog>
  );
}

export function StepsDialog({
  open,
  onOpenChange,
  date: initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date?: string | undefined;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(initial ?? todayKey());

  useEffect(() => {
    if (open) setDate(initial ?? todayKey());
  }, [open, initial]);

  const save = () => {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0) {
      toast.error("יש להזין מספר צעדים תקין");
      return;
    }
    actions.setSteps(date, Math.round(v));
    toast.success("הצעדים נשמרו");
    setValue("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="size-5 text-primary" /> עדכון צעדים
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <NumField label="מספר צעדים" value={value} onChange={setValue} step="100" />
          <DateField value={date} onChange={setDate} />
          <Button onClick={save}>שמירה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">תאריך</label>
      <input
        type="date"
        value={value}
        max={todayKey()}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      />
    </div>
  );
}
