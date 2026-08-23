/**
 * Google Fit bridge for Huawei band steps.
 * Flow: Huawei Health → Health Sync → Google Fit → this app (auto on open).
 */

import { actions } from "./store";

const TOKEN_KEY = "fitrack_google_fit_token";
const CLIENT_ID_KEY = "fitrack_google_client_id";
const SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";

export function getGoogleClientId(): string {
  if (typeof window === "undefined") return "";
  const fromEnv =
    (import.meta as { env?: Record<string, string> }).env?.["VITE_GOOGLE_CLIENT_ID"]?.trim() || "";
  if (fromEnv) return fromEnv;
  return localStorage.getItem(CLIENT_ID_KEY)?.trim() || "";
}

export function setGoogleClientId(id: string) {
  if (typeof window === "undefined") return;
  const v = id.trim();
  if (v) localStorage.setItem(CLIENT_ID_KEY, v);
  else localStorage.removeItem(CLIENT_ID_KEY);
}

export function getFitToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string; expires_at?: number };
    if (!parsed.access_token) return null;
    if (parsed.expires_at && Date.now() > parsed.expires_at - 60_000) return null;
    return parsed.access_token;
  } catch {
    return null;
  }
}

function saveFitToken(access_token: string, expires_in: number) {
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    }),
  );
}

export function clearFitToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isGoogleFitConnected(): boolean {
  return !!getFitToken();
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.dataset.gis = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("לא ניתן לטעון את Google Sign-In"));
    document.head.appendChild(s);
  });
}

/** One-click OAuth for Google Fit steps scope. */
export async function connectGoogleFit(): Promise<void> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "חסר Google Client ID. הוסף אותו בהגדרות (שדה Client ID) או ב־VITE_GOOGLE_CLIENT_ID.",
    );
  }
  await loadGis();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google Sign-In לא זמין");

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || "ההרשאה נכשלה"));
          return;
        }
        saveFitToken(resp.access_token, resp.expires_in ?? 3600);
        resolve();
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

function dayKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fetch daily step totals for the last `days` days and write into the store. */
export async function pullGoogleFitSteps(days = 7): Promise<number> {
  const token = getFitToken();
  if (!token) throw new Error("לא מחובר ל־Google Fit");

  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;

  const body = {
    aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: end,
  };

  const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearFitToken();
    throw new Error("פג תוקף החיבור ל־Google Fit — התחבר מחדש");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`שגיאת Google Fit (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    bucket?: {
      startTimeMillis?: string;
      dataset?: { point?: { value?: { intVal?: number; fpVal?: number }[] }[] }[];
    }[];
  };

  let updated = 0;
  for (const bucket of json.bucket ?? []) {
    const t = Number(bucket.startTimeMillis ?? 0);
    if (!t) continue;
    const date = dayKeyFromMs(t);
    let steps = 0;
    for (const ds of bucket.dataset ?? []) {
      for (const pt of ds.point ?? []) {
        for (const v of pt.value ?? []) {
          steps += Number(v.intVal ?? v.fpVal ?? 0);
        }
      }
    }
    if (steps > 0) {
      actions.setSteps(date, Math.round(steps));
      updated += 1;
    }
  }

  actions.updateSettings({
    huaweiConnected: true,
    huaweiLastSync: new Date().toISOString(),
  });

  return updated;
}

/** Best-effort auto sync when the app opens / gains focus. */
export async function autoSyncStepsIfConnected(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getFitToken()) return;
  try {
    await pullGoogleFitSteps(7);
  } catch (e) {
    console.warn("[steps] auto sync failed", e);
  }
}
