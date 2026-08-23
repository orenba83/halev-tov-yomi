import { useRef, useState } from "react";
import { Camera, Footprints, ImagePlus, RefreshCw, Watch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseStepsImage } from "@/lib/ai.functions";
import {
  applyStepRows,
  fileToDataUrl,
  openHuaweiHealthApp,
  parseHuaweiStepsFile,
} from "@/lib/huaweiSteps";
import { autoSyncStepsIfConnected, isGoogleFitConnected, pullGoogleFitSteps } from "@/lib/googleFit";
import { actions, todayKey, useStore } from "@/lib/store";
import { NumField } from "./FoodPickerDialog";

export function HuaweiStepsSync({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date?: string;
}) {
  const day = date ?? todayKey();
  const current = useStore().steps[day] ?? 0;
  const [value, setValue] = useState(current ? String(current) : "");
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveNumber = () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("יש להזין מספר צעדים תקין");
      return;
    }
    actions.setSteps(day, Math.round(n));
    actions.updateSettings({ huaweiConnected: true, huaweiLastSync: new Date().toISOString() });
    toast.success("הצעדים עודכנו מהצמיד");
    onOpenChange(false);
  };

  const fromImage = async (file: File) => {
    setBusy(true);
    try {
      const image = await fileToDataUrl(file);
      const result = await parseStepsImage({ data: { image } });
      if (!result.ok) {
        toast.error(result.note || "לא הצלחתי לקרוא צעדים מהתמונה");
        return;
      }
      const d = result.date && result.date.length === 10 ? result.date : day;
      actions.setSteps(d, result.steps);
      actions.updateSettings({ huaweiConnected: true, huaweiLastSync: new Date().toISOString() });
      setValue(String(result.steps));
      toast.success(`עודכנו ${result.steps.toLocaleString("he-IL")} צעדים`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "קריאת התמונה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const fromExport = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseHuaweiStepsFile(text);
      if (!rows.length) {
        toast.error("לא נמצאו צעדים בקובץ");
        return;
      }
      applyStepRows(rows);
      toast.success(`סונכרנו ${rows.length} ימי צעדים`);
      onOpenChange(false);
    } catch {
      toast.error("קובץ לא תקין");
    } finally {
      setBusy(false);
    }
  };

  const fromGoogle = async () => {
    setBusy(true);
    try {
      const n = await pullGoogleFitSteps(7);
      toast.success(n > 0 ? `עודכנו צעדים ל־${n} ימים` : "אין צעדים חדשים");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "הסנכרון נכשל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 w-[calc(100vw-1.5rem)] overflow-x-hidden p-4 text-right sm:max-w-sm sm:p-6">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Watch className="size-5 text-primary" /> סנכרון צעדים מהצמיד
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          אתר לא יכול לקרוא את Huawei Health ברקע. הדרך המהירה: פותחים את האפליקציה ומצלמים את מסך הצעדים.
        </p>

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="rounded-full justify-start"
            disabled={busy}
            onClick={() => openHuaweiHealthApp()}
          >
            <Watch className="size-4" /> פתח את Huawei Health
          </Button>
          <Button
            className="rounded-full justify-start"
            disabled={busy}
            onClick={() => camRef.current?.click()}
          >
            <Camera className="size-4" /> {busy ? "קורא את המסך…" : "צלם את מסך הצעדים"}
          </Button>
          <Button
            variant="outline"
            className="rounded-full justify-start"
            disabled={busy}
            onClick={() => galRef.current?.click()}
          >
            <ImagePlus className="size-4" /> בחר צילום מסך מהגלריה
          </Button>
          {isGoogleFitConnected() && (
            <Button
              variant="outline"
              className="rounded-full justify-start"
              disabled={busy}
              onClick={() => void fromGoogle()}
            >
              <RefreshCw className="size-4" /> סנכרן אוטומטית מ־Google Fit
            </Button>
          )}
        </div>

        <div className="grid gap-2 pt-1">
          <NumField label={`צעדים ל־${day === todayKey() ? "היום" : day}`} value={value} onChange={setValue} step="100" />
          <Button onClick={saveNumber} disabled={busy}>
            <Footprints className="size-4" /> שמירת צעדים
          </Button>
        </div>

        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => fileRef.current?.click()}
        >
          או ייבוא קובץ ייצוא מ־Huawei Health
        </button>

        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && void fromImage(e.target.files[0])} />
        <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void fromImage(e.target.files[0])} />
        <input ref={fileRef} type="file" accept=".json,.csv,text/csv,application/json,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && void fromExport(e.target.files[0])} />
      </DialogContent>
    </Dialog>
  );
}

/** Banner on home if steps were not synced today. */
export function HuaweiStepsHint({ onSync }: { onSync: () => void }) {
  return (
    <button
      type="button"
      onClick={onSync}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-right"
    >
      <Watch className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">עדכון מהצמיד</span>
        <span className="block text-xs text-muted-foreground">צלם את מסך Huawei Health — הצעדים ייכנסו לבד</span>
      </span>
    </button>
  );
}

void autoSyncStepsIfConnected;
