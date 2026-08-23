import { actions, todayKey } from "./store";

export type StepRow = { date: string; steps: number };

function isIsoDate(value: string): boolean {
  return value.length === 10 && value[4] === "-" && value[7] === "-";
}

function toIsoDate(raw: string): string | null {
  const s = raw.trim().slice(0, 19);
  if (isIsoDate(s.slice(0, 10))) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) {
    const d = m[1]!.padStart(2, "0");
    const mo = m[2]!.padStart(2, "0");
    let y = m[3]!;
    if (y.length === 2) y = `20${y}`;
    const iso = `${y}-${mo}-${d}`;
    return isIsoDate(iso) ? iso : null;
  }
  return null;
}

export function parseHuaweiStepsFile(text: string): StepRow[] {
  const out: StepRow[] = [];
  const seen = new Set<string>();
  const push = (date: string | null, steps: number) => {
    if (!date || !Number.isFinite(steps) || steps <= 0) return;
    if (seen.has(date)) return;
    seen.add(date);
    out.push({ date, steps: Math.round(steps) });
  };

  try {
    const json = JSON.parse(text) as unknown;
    const walk = (node: unknown) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== "object") return;
      const r = node as Record<string, unknown>;
      const date = toIsoDate(
        String(r.date ?? r.day ?? r.time ?? r.startTime ?? r.recordDay ?? ""),
      );
      const steps = Number(
        r.steps ?? r.step ?? r.value ?? r.stepCount ?? r.stepsDelta ?? r.count ?? 0,
      );
      if (date && steps > 0) push(date, steps);
      Object.values(r).forEach((v) => {
        if (v && typeof v === "object") walk(v);
      });
    };
    walk(json);
    if (out.length) return out;
  } catch {
    /* CSV */
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    if (parts.length < 2) continue;
    let date: string | null = null;
    let steps = 0;
    for (const p of parts) {
      if (!date) date = toIsoDate(p);
      const n = Number(p.replace(/[^0-9.]/g, ""));
      if (n >= 50 && n <= 200000) steps = n;
    }
    push(date, steps);
  }
  return out;
}

export function applyStepRows(rows: StepRow[]) {
  rows.forEach((r) => actions.setSteps(r.date, r.steps));
  actions.updateSettings({
    huaweiConnected: true,
    huaweiLastSync: new Date().toISOString(),
  });
}

export function openHuaweiHealthApp() {
  if (typeof window === "undefined") return;
  const intent =
    "intent://health#Intent;scheme=huaweihealth;package=com.huawei.health;end";
  window.location.href = intent;
  window.setTimeout(() => {
    window.location.href = "https://appgallery.huawei.com/app/C10121925";
  }, 1200);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}

export function lastSyncIsToday(iso?: string): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === todayKey();
}
