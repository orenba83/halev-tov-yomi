import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Download,
  Link2,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  Upload,
  Watch,
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
import type { AppState } from "@/lib/types";
import { displayNameForEmail } from "@/lib/sharedAccount";
import {
  clearFitToken,
  connectGoogleFit,
  getGoogleClientId,
  isGoogleFitConnected,
  pullGoogleFitSteps,
  setGoogleClientId,
} from "@/lib/googleFit";

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
          <NumField label="יעד קלוריות" value={form.calorieGoal} onChange={(v) => setForm({ ...form, calorieGoal: v })} />
          <NumField label="יעד צעדים" value={form.stepGoal} onChange={(v) => setForm({ ...form, stepGoal: v })} />
          <NumField label="יעד מים (מ״ל)" value={form.waterGoal} onChange={(v) => setForm({ ...form, waterGoal: v })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MacroField label="חלבון (ג׳)" value={form.proteinGoal} onChange={(v) => setForm({ ...form, proteinGoal: v })} kcal={Number(form.proteinGoal || 0) * 4} />
          <MacroField label="פחמימות (ג׳)" value={form.carbGoal} onChange={(v) => setForm({ ...form, carbGoal: v })} kcal={Number(form.carbGoal || 0) * 4} />
          <MacroField label="שומן (ג׳)" value={form.fatGoal} onChange={(v) => setForm({ ...form, fatGoal: v })} kcal={Number(form.fatGoal || 0) * 9} />
        </div>
        <p className={cn("text-xs", Math.abs(macroCals - Number(form.calorieGoal || 0)) > 150 ? "text-destructive" : "text-muted-foreground")}>
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

      <CloudCard />
      <HuaweiCard />

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
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
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

function HuaweiCard() {
  const { settings } = useStore();
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState(() => getGoogleClientId());
  const [connected, setConnected] = useState(() => isGoogleFitConnected());

  const syncNowSteps = async () => {
    setBusy(true);
    try {
      const n = await pullGoogleFitSteps(7);
      setConnected(true);
      toast.success(n > 0 ? `עודכנו צעדים ל־${n} ימים מהצמיד` : "אין צעדים חדשים לעדכון");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "הסנכרון נכשל");
      setConnected(false);
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    if (clientId.trim()) setGoogleClientId(clientId.trim());
    setBusy(true);
    try {
      await connectGoogleFit();
      setConnected(true);
      actions.updateSettings({ huaweiConnected: true, huaweiEmail: "Google Fit (Huawei)" });
      const n = await pullGoogleFitSteps(7);
      toast.success(n > 0 ? `מחובר! עודכנו ${n} ימים` : "מחובר ל־Google Fit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "החיבור נכשל");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    clearFitToken();
    setConnected(false);
    actions.updateSettings({ huaweiConnected: false, huaweiEmail: "", huaweiLastSync: "" });
    toast.success("החיבור לצעדים נותק");
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Watch className="size-5" />
        </span>
        <div>
          <h2 className="font-bold">צעדים מהצמיד (Huawei)</h2>
          <p className="text-xs text-muted-foreground">סנכרון אוטומטי דרך Google Fit</p>
        </div>
      </div>

      <div className="space-y-1.5 rounded-2xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">הגדרה חד־פעמית בטלפון:</p>
        <ol className="list-decimal space-y-1 pr-4">
          <li>וודא שהצמיד מסונכרן ל־Huawei Health</li>
          <li>
            התקן את האפליקציה <b>Health Sync</b> (מחברת Huawei Health ל־Google Fit)
          </li>
          <li>ב־Health Sync: מקור = Huawei Health, יעד = Google Fit, סנכרן צעדים</li>
          <li>כאן באפליקציה — התחבר עם Google</li>
        </ol>
        <p>אחרי זה, בכל פתיחה של פיטראק הצעדים מתעדכנים לבד.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Google Client ID (חד־פעמי)</Label>
        <Input
          dir="ltr"
          value={clientId}
          placeholder="xxxxx.apps.googleusercontent.com"
          onChange={(e) => setClientId(e.target.value)}
          onBlur={() => setGoogleClientId(clientId)}
        />
        <p className="text-[11px] text-muted-foreground">
          מ־Google Cloud Console → OAuth Client מטיפוס Web, עם כתובת האתר ב־Authorized JavaScript origins. יש להפעיל Fitness API.
        </p>
      </div>

      {connected || settings.huaweiConnected ? (
        <>
          <p className="text-sm">
            סנכרון פעיל
            {settings.huaweiLastSync && (
              <span className="block text-xs text-muted-foreground">
                סנכרון אחרון: {new Date(settings.huaweiLastSync).toLocaleString("he-IL")}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full" disabled={busy} onClick={() => void syncNowSteps()}>
              <RefreshCw className="size-4" /> {busy ? "מסנכרן…" : "סנכרן צעדים עכשיו"}
            </Button>
            <Button variant="ghost" className="rounded-full text-destructive" onClick={disconnect}>
              ניתוק
            </Button>
          </div>
        </>
      ) : (
        <Button className="rounded-full" disabled={busy} onClick={() => void connect()}>
          <Link2 className="size-4" /> {busy ? "מתחבר…" : "חיבור Google Fit (אוטומטי)"}
        </Button>
      )}

      <details className="rounded-2xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-semibold">גיבוי: ייבוא קובץ מ־Huawei Health</summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Health → אני → הגדרות פרטיות → ייצוא נתונים, ואז העלה כאן JSON/CSV.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            <Upload className="size-4" /> העלאת קובץ צעדים
            <input
              type="file"
              accept=".json,.csv,text/csv,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const text = String(reader.result);
                  let rows: { date: string; steps: number }[] = [];
                  try {
                    const json = JSON.parse(text);
                    const arr = Array.isArray(json) ? json : (json.steps ?? json.data ?? []);
                    rows = (arr as any[])
                      .map((r) => ({
                        date: String(r.date ?? r.day ?? r.time ?? "").slice(0, 10),
                        steps: Number(r.steps ?? r.value ?? r.stepCount ?? 0),
                      }))
                      .filter((r) => r.date.length === 10 && r.steps > 0);
                  } catch {
                    rows = text
                      .split(/\r?\n/)
                      .slice(1)
                      .map((line) => {
                        const parts = line.split(/[,;\t]/);
                        return {
                          date: String(parts[0] ?? "").trim().slice(0, 10),
                          steps: Number(parts[1]),
                        };
                      })
                      .filter((r) => r.date.length === 10 && Number.isFinite(r.steps) && r.steps > 0);
                  }
                  if (!rows.length) {
                    toast.error("לא נמצאו נתוני צעדים בקובץ");
                    return;
                  }
                  rows.forEach((r) => actions.setSteps(r.date, r.steps));
                  actions.updateSettings({
                    huaweiLastSync: new Date().toISOString(),
                    huaweiConnected: true,
                  });
                  toast.success(`סונכרנו ${rows.length} ימי צעדים`);
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </details>
    </Card>
  );
}
