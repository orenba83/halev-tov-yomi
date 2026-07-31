import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Moon, RotateCcw, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { NumField } from "@/components/FoodPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AppState } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "הגדרות ויעדים — פיטראק" },
      { name: "description", content: "הגדרת יעדי קלוריות, מאקרו, צעדים ומים, מצב תצוגה וגיבוי נתונים." },
      { property: "og:title", content: "הגדרות ויעדים — פיטראק" },
      { property: "og:description", content: "יעדים אישיים, מצב תצוגה וגיבוי נתונים." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const state = useStore();
  const s = state.settings;
  const [form, setForm] = useState({
    name: s.name,
    calorieGoal: String(s.calorieGoal),
    stepGoal: String(s.stepGoal),
    waterGoal: String(s.waterGoal),
    proteinGoal: String(s.proteinGoal),
    carbGoal: String(s.carbGoal),
    fatGoal: String(s.fatGoal),
  });

  const macroCals =
    Number(form.proteinGoal || 0) * 4 + Number(form.carbGoal || 0) * 4 + Number(form.fatGoal || 0) * 9;

  const save = () => {
    const nums = {
      calorieGoal: Number(form.calorieGoal),
      stepGoal: Number(form.stepGoal),
      waterGoal: Number(form.waterGoal),
      proteinGoal: Number(form.proteinGoal),
      carbGoal: Number(form.carbGoal),
      fatGoal: Number(form.fatGoal),
    };
    if (!form.name.trim()) {
      toast.error("יש להזין שם");
      return;
    }
    if (Object.values(nums).some((n) => !Number.isFinite(n) || n <= 0)) {
      toast.error("כל היעדים חייבים להיות מספרים חיוביים");
      return;
    }
    actions.updateSettings({ name: form.name.trim(), ...nums });
    toast.success("היעדים נשמרו");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("הגיבוי הורד בהצלחה");
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        actions.importState(JSON.parse(String(reader.result)) as AppState);
        toast.success("הנתונים שוחזרו");
      } catch {
        toast.error("קובץ לא תקין");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">הגדרות</h1>
        <p className="text-sm text-muted-foreground">יעדים אישיים, תצוגה וגיבוי</p>
      </header>

      <Card className="space-y-4">
        <h2 className="font-bold">פרופיל ויעדים יומיים</h2>
        <div className="space-y-1.5">
          <Label>שם</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumField
            label="יעד קלוריות"
            value={form.calorieGoal}
            onChange={(v) => setForm({ ...form, calorieGoal: v })}
          />
          <NumField
            label="יעד צעדים"
            value={form.stepGoal}
            onChange={(v) => setForm({ ...form, stepGoal: v })}
          />
          <NumField
            label="יעד מים (מ״ל)"
            value={form.waterGoal}
            onChange={(v) => setForm({ ...form, waterGoal: v })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MacroField
            label="חלבון (ג׳)"
            value={form.proteinGoal}
            onChange={(v) => setForm({ ...form, proteinGoal: v })}
            kcal={Number(form.proteinGoal || 0) * 4}
          />
          <MacroField
            label="פחמימות (ג׳)"
            value={form.carbGoal}
            onChange={(v) => setForm({ ...form, carbGoal: v })}
            kcal={Number(form.carbGoal || 0) * 4}
          />
          <MacroField
            label="שומן (ג׳)"
            value={form.fatGoal}
            onChange={(v) => setForm({ ...form, fatGoal: v })}
            kcal={Number(form.fatGoal || 0) * 9}
          />
        </div>
        <p
          className={cn(
            "text-xs",
            Math.abs(macroCals - Number(form.calorieGoal || 0)) > 150
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          סך המאקרו: {Math.round(macroCals)} קק״ל מתוך יעד {form.calorieGoal || 0} קק״ל
        </p>
        <Button onClick={save}>שמירת יעדים</Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">מצב תצוגה</h2>
        <div className="flex gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => actions.updateSettings({ theme: t })}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition-colors",
                s.theme === t ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              {t === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {t === "light" ? "בהיר" : "כהה"}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">נתונים וגיבוי</h2>
        <p className="text-xs text-muted-foreground">
          כל הנתונים נשמרים מקומית במכשיר שלך. מומלץ לייצא גיבוי מדי פעם.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={exportData}>
            <Download className="size-4" /> ייצוא גיבוי
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            <Upload className="size-4" /> שחזור מגיבוי
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
            />
          </label>
          <Button
            variant="ghost"
            className="rounded-full text-destructive"
            onClick={() => {
              actions.resetAll();
              toast.success("הנתונים אופסו");
            }}
          >
            <RotateCcw className="size-4" /> איפוס נתונים
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MacroField({
  label,
  value,
  onChange,
  kcal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kcal: number;
}) {
  return (
    <div>
      <NumField label={label} value={value} onChange={onChange} />
      <p className="mt-1 text-xs text-muted-foreground">≈ {Math.round(kcal)} קק״ל</p>
    </div>
  );
}
