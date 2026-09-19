import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Download,
  Dumbbell,
  Link2,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { pullNow, signOut, syncNow, useSyncInfo } from "@/lib/sync";
import { toast } from "sonner";
import { Card } from "@/components/Stat";
import { NumField } from "@/components/FoodPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AppState, MacroGoals } from "@/lib/types";
import { displayNameForEmail } from "@/lib/sharedAccount";

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

function goalsToForm(g?: MacroGoals) {
  return {
    calorieGoal: String(g?.calorieGoal ?? 2200),
    proteinGoal: String(g?.proteinGoal ?? 150),
    carbGoal: String(g?.carbGoal ?? 220),
    fatGoal: String(g?.fatGoal ?? 70),
  };
}

function SettingsPage() {
  const state = useStore();
  const s = state.settings;
  const [name, setName] = useState(s.name);
  const [stepGoal, setStepGoal] = useState(String(s.stepGoal));
  const [waterGoal, setWaterGoal] = useState(String(s.waterGoal));
  const [training, setTraining] = useState(() => goalsToForm(s.trainingGoals ?? {
    calorieGoal: Math.round(s.calorieGoal * 1.15),
    proteinGoal: Math.round(s.proteinGoal * 1.15),
    carbGoal: Math.round(s.carbGoal * 1.2),
    fatGoal: Math.round(s.fatGoal * 1.05),
  }));
  const [rest, setRest] = useState(() => goalsToForm(s.restGoals ?? {
    calorieGoal: s.calorieGoal,
    proteinGoal: s.proteinGoal,
    carbGoal: s.carbGoal,
    fatGoal: s.fatGoal,
  }));

  const parseGoals = (f: ReturnType<typeof goalsToForm>): MacroGoals | null => {
    const nums = {
      calorieGoal: Number(f.calorieGoal),
      proteinGoal: Number(f.proteinGoal),
      carbGoal: Number(f.carbGoal),
      fatGoal: Number(f.fatGoal),
    };
    if (Object.values(nums).some((n) => !Number.isFinite(n) || n <= 0)) return null;
    return nums;
  };

  const macroCals = (f: ReturnType<typeof goalsToForm>) =>
    Number(f.proteinGoal || 0) * 4 + Number(f.carbGoal || 0) * 4 + Number(f.fatGoal || 0) * 9;

  const save = () => {
    if (!name.trim()) {
      toast.error("יש להזין שם");
      return;
    }
    const t = parseGoals(training);
    const r = parseGoals(rest);
    const steps = Number(stepGoal);
    const water = Number(waterGoal);
    if (!t || !r || !Number.isFinite(steps) || steps <= 0 || !Number.isFinite(water) || water <= 0) {
      toast.error("כל היעדים חייבים להיות מספרים חיוביים");
      return;
    }
    actions.updateSettings({
      name: name.trim(),
      stepGoal: steps,
      waterGoal: water,
      trainingGoals: t,
      restGoals: r,
      calorieGoal: r.calorieGoal,
      proteinGoal: r.proteinGoal,
      carbGoal: r.carbGoal,
      fatGoal: r.fatGoal,
    });
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
        <h2 className="font-bold">פרופיל</h2>
        <div className="space-y-1.5">
          <Label>שם</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="יעד צעדים" value={stepGoal} onChange={setStepGoal} />
          <NumField label="יעד מים (מ״ל)" value={waterGoal} onChange={setWaterGoal} />
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" />
          <h2 className="font-bold">יעדים — יום אימון</h2>
        </div>
        <p className="text-xs text-muted-foreground">יעדים גבוהים יותר לימי אימון</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField
            label="יעד קלוריות"
            value={training.calorieGoal}
            onChange={(v) => setTraining({ ...training, calorieGoal: v })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MacroField
            label="חלבון (ג׳)"
            value={training.proteinGoal}
            onChange={(v) => setTraining({ ...training, proteinGoal: v })}
            kcal={Number(training.proteinGoal || 0) * 4}
          />
          <MacroField
            label="פחמימות (ג׳)"
            value={training.carbGoal}
            onChange={(v) => setTraining({ ...training, carbGoal: v })}
            kcal={Number(training.carbGoal || 0) * 4}
          />
          <MacroField
            label="שומן (ג׳)"
            value={training.fatGoal}
            onChange={(v) => setTraining({ ...training, fatGoal: v })}
            kcal={Number(training.fatGoal || 0) * 9}
          />
        </div>
        <p
          className={cn(
            "text-xs",
            Math.abs(macroCals(training) - Number(training.calorieGoal || 0)) > 150
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          סך המאקרו: {Math.round(macroCals(training))} קק״ל מתוך יעד {training.calorieGoal || 0} קק״ל
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">יעדים — יום מנוחה</h2>
        <p className="text-xs text-muted-foreground">יעדים לימי מנוחה (ברירת מחדל)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField
            label="יעד קלוריות"
            value={rest.calorieGoal}
            onChange={(v) => setRest({ ...rest, calorieGoal: v })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MacroField
            label="חלבון (ג׳)"
            value={rest.proteinGoal}
            onChange={(v) => setRest({ ...rest, proteinGoal: v })}
            kcal={Number(rest.proteinGoal || 0) * 4}
          />
          <MacroField
            label="פחמימות (ג׳)"
            value={rest.carbGoal}
            onChange={(v) => setRest({ ...rest, carbGoal: v })}
            kcal={Number(rest.carbGoal || 0) * 4}
          />
          <MacroField
            label="שומן (ג׳)"
            value={rest.fatGoal}
            onChange={(v) => setRest({ ...rest, fatGoal: v })}
            kcal={Number(rest.fatGoal || 0) * 9}
          />
        </div>
        <p
          className={cn(
            "text-xs",
            Math.abs(macroCals(rest) - Number(rest.calorieGoal || 0)) > 150
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          סך המאקרו: {Math.round(macroCals(rest))} קק״ל מתוך יעד {rest.calorieGoal || 0} קק״ל
        </p>
        <Button onClick={save}>שמירת כל היעדים</Button>
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

      <CloudCard />

      <Card className="space-y-3">
        <h2 className="font-bold">נתונים וגיבוי</h2>
        <p className="text-xs text-muted-foreground">
          כשמחוברים לחשבון הנתונים נשמרים בענן ומסתנכרנים בין כל המכשירים. אפשר גם לייצא גיבוי מקומי.
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

function CloudCard() {
  const sync = useSyncInfo();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const accountLabel = displayNameForEmail(sync.email);

  const statusLabel = (() => {
    switch (sync.status) {
      case "signed-out":
        return "לא מחובר — הנתונים נשמרים רק במכשיר הזה";
      case "loading":
        return "טוען נתונים מהענן…";
      case "saving":
        return "שומר שינויים בענן…";
      case "synced":
        return "מסונכרן עם הענן";
      case "error":
        return sync.error || "שגיאת סנכרון";
      default:
        return "";
    }
  })();

  const lastSynced =
    sync.lastSyncedAt != null
      ? new Date(sync.lastSyncedAt).toLocaleString("he-IL", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Cloud className="size-5 text-primary" />
        <h2 className="font-bold">סנכרון בין מכשירים</h2>
      </div>

      {sync.userId ? (
        <>
          <p className="text-xs text-muted-foreground">
            מחובר/ת כ־<span className="font-semibold text-foreground">{accountLabel}</span>
          </p>
          <div className="flex items-start gap-2 text-sm">
            {sync.status === "synced" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : sync.status === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin" />
            )}
            <div className="min-w-0">
              <p className={cn(sync.status === "error" && "text-destructive")}>{statusLabel}</p>
              {lastSynced && sync.status === "synced" && (
                <p className="mt-0.5 text-xs text-muted-foreground">סנכרון אחרון: {lastSynced}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await syncNow();
                setBusy(false);
                if (ok) toast.success("הנתונים נשמרו בענן");
                else toast.error("השמירה בענן נכשלה");
              }}
            >
              <RefreshCw className="size-4" /> סנכרן עכשיו
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await pullNow();
                setBusy(false);
                if (ok) toast.success("הנתונים נטענו מהענן");
                else toast.error("המשיכה מהענן נכשלה");
              }}
            >
              <Download className="size-4" /> משיכה מהענן
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-xs text-destructive"
              onClick={async () => {
                await signOut();
                toast.success("התנתקת — הנתונים נשארים במכשיר הזה");
              }}
            >
              <LogOut className="size-4" /> התנתקות
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            התחברות עם <b>דנה</b> וסיסמה <b dir="ltr">1234</b> — ואז כל הזנה מסתנכרנת בין הטלפון למחשב.
          </p>
          {sync.error && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {sync.error}
            </p>
          )}
          <Button className="rounded-full" onClick={() => navigate({ to: "/auth" })}>
            <Link2 className="size-4" /> התחברות וסנכרון
          </Button>
        </>
      )}
    </Card>
  );
}
