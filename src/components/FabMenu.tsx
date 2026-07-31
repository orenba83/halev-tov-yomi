import { useState } from "react";
import { Plus, Ruler, Scale, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, todayKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { MealKey } from "@/lib/types";
import { FoodPickerDialog, NumField } from "./FoodPickerDialog";

export function FabMenu() {
  const [open, setOpen] = useState(false);
  const [food, setFood] = useState(false);
  const [meal, setMeal] = useState<MealKey>("breakfast");
  const [weight, setWeight] = useState(false);
  const [measure, setMeasure] = useState(false);

  const items = [
    {
      icon: UtensilsCrossed,
      label: "ארוחה / מוצר",
      onClick: () => {
        setOpen(false);
        setFood(true);
      },
    },
    {
      icon: Scale,
      label: "שקילה",
      onClick: () => {
        setOpen(false);
        setWeight(true);
      },
    },
    {
      icon: Ruler,
      label: "מדידת היקפים",
      onClick: () => {
        setOpen(false);
        setMeasure(true);
      },
    },
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayKey());

  const save = () => {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("יש להזין משקל חיובי");
      return;
    }
    actions.addWeight(date, +v.toFixed(1));
    toast.success("המשקל נשמר");
    setValue("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>הוספת שקילה</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <NumField label="משקל (ק״ג) *" value={value} onChange={setValue} step="0.1" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">תאריך</label>
            <input
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>
          <Button onClick={save}>שמירה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MeasureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [f, setF] = useState({ waist: "", chest: "", arm: "", thigh: "" });

  const save = () => {
    const nums = Object.values(f).map((v) => Number(v || 0));
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error("ערכים לא יכולים להיות שליליים");
      return;
    }
    if (nums.every((n) => n === 0)) {
      toast.error("יש למלא לפחות מדידה אחת");
      return;
    }
    actions.addMeasurement({
      date: todayKey(),
      waist: nums[0],
      chest: nums[1],
      arm: nums[2],
      thigh: nums[3],
    });
    toast.success("המדידות נשמרו");
    setF({ waist: "", chest: "", arm: "", thigh: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-right sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>מדידת היקפים (ס״מ)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="מותניים" value={f.waist} onChange={(v) => setF({ ...f, waist: v })} step="0.1" />
          <NumField label="חזה" value={f.chest} onChange={(v) => setF({ ...f, chest: v })} step="0.1" />
          <NumField label="יד" value={f.arm} onChange={(v) => setF({ ...f, arm: v })} step="0.1" />
          <NumField label="ירך" value={f.thigh} onChange={(v) => setF({ ...f, thigh: v })} step="0.1" />
        </div>
        <Button onClick={save}>שמירה</Button>
      </DialogContent>
    </Dialog>
  );
}
