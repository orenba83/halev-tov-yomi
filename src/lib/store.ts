import { useSyncExternalStore } from "react";
import { GLOBAL_FOODS } from "./foods";
import { getActiveDisplayName, storageKeyForUser, SHARED_USERNAME_HE } from "./sharedAccount";
import type {
  AppState,
  ChatMessage,
  DayMode,
  Food,
  LogEntry,
  MacroGoals,
  MeasurementEntry,
  Settings,
  WaterEntry,
  WeightEntry,
} from "./types";

const LEGACY_KEY = "fitrack-state-v2";

function currentKey(): string {
  return storageKeyForUser(getActiveDisplayName() || SHARED_USERNAME_HE);
}

export const todayKey = () => toKey(new Date());
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const uid = () => Math.random().toString(36).slice(2, 10);

/** מספר ימי שמירה */
export const KEEP_DAYS = 90;
export const KEEP_DAYS_LONG = 183;

const daysAgo = (key: string) =>
  Math.floor((Date.now() - new Date(key + "T00:00:00").getTime()) / 86400000);

function defaultMacroGoals(s: Partial<Settings> = {}): MacroGoals {
  return {
    calorieGoal: s.calorieGoal ?? 2200,
    proteinGoal: s.proteinGoal ?? 150,
    carbGoal: s.carbGoal ?? 220,
    fatGoal: s.fatGoal ?? 70,
  };
}

function seed(): AppState {
  const baseGoals = defaultMacroGoals();
  const name = getActiveDisplayName() || SHARED_USERNAME_HE;
  return {
    settings: {
      name,
      calorieGoal: baseGoals.calorieGoal,
      stepGoal: 10000,
      waterGoal: 2500,
      proteinGoal: baseGoals.proteinGoal,
      carbGoal: baseGoals.carbGoal,
      fatGoal: baseGoals.fatGoal,
      theme: "light",
      trainingGoals: {
        calorieGoal: 2600,
        proteinGoal: 180,
        carbGoal: 280,
        fatGoal: 75,
      },
      restGoals: {
        calorieGoal: 2000,
        proteinGoal: 140,
        carbGoal: 180,
        fatGoal: 65,
      },
    },
    entries: [],
    water: [],
    steps: {},
    weights: [],
    measurements: [],
    customFoods: [],
    recent: [],
    favorites: [],
    chat: [
      {
        id: "c1",
        role: "ai",
        text: "שלום! אני היועץ התזונתי החכם שלך. אפשר לשאול אותי כל שאלה על תזונה או אימונים, לדבר איתי בקול, או להעלות תמונה של מנה/מוצר ואזהה עבורך את הערכים.",
      },
    ],
    dayModes: {},
  };
}

function prune(s: AppState): AppState {
  return {
    ...s,
    entries: s.entries.filter((e) => daysAgo(e.date) <= KEEP_DAYS),
    water: s.water.filter((w) => daysAgo(w.date) <= KEEP_DAYS),
    steps: Object.fromEntries(Object.entries(s.steps).filter(([d]) => daysAgo(d) <= KEEP_DAYS)),
    weights: s.weights.filter((w) => daysAgo(w.date) <= KEEP_DAYS_LONG),
    measurements: s.measurements.filter((m) => daysAgo(m.date) <= KEEP_DAYS_LONG),
  };
}

function migrate(raw: any): AppState {
  const base = seed();
  const next: AppState = { ...base, ...raw, settings: { ...base.settings, ...(raw?.settings ?? {}) } };
  if (raw?.water && !Array.isArray(raw.water)) {
    next.water = Object.entries(raw.water as Record<string, number>).map(([date, ml]) => ({
      id: uid(),
      date,
      ml: Number(ml) || 0,
    }));
  }
  next.measurements = (next.measurements ?? []).map((m) => ({ ...m, hips: m.hips ?? 0 }));
  const s = next.settings;
  if (!s.trainingGoals) {
    s.trainingGoals = {
      calorieGoal: Math.round((s.calorieGoal ?? 2200) * 1.15),
      proteinGoal: Math.round((s.proteinGoal ?? 150) * 1.15),
      carbGoal: Math.round((s.carbGoal ?? 220) * 1.2),
      fatGoal: Math.round((s.fatGoal ?? 70) * 1.05),
    };
  }
  if (!s.restGoals) {
    s.restGoals = defaultMacroGoals(s);
  }
  next.dayModes = next.dayModes ?? {};
  next.entries = next.entries ?? [];
  next.water = next.water ?? [];
  return prune(next);
}

let state: AppState = seed();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    let raw = window.localStorage.getItem(currentKey());
    if (!raw && currentKey().endsWith("-dana")) {
      raw = window.localStorage.getItem(LEGACY_KEY);
      if (raw) {
        window.localStorage.setItem(currentKey(), raw);
      }
    }
    if (raw) state = migrate(JSON.parse(raw));
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(currentKey(), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function set(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  cb();
  return () => listeners.delete(cb);
}

export function subscribeStore(cb: () => void) {
  load();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getState(): AppState {
  load();
  return state;
}

/** טעינת מצב מחדש לפי המשתמש המחובר (דנה / אורן — נתונים נפרדים) */
export function reloadStateForActiveUser(): void {
  if (typeof window === "undefined") return;
  loaded = true;
  try {
    let raw = window.localStorage.getItem(currentKey());
    if (!raw && currentKey().endsWith("-dana")) {
      raw = window.localStorage.getItem(LEGACY_KEY);
    }
    state = raw ? migrate(JSON.parse(raw)) : seed();
    const name = getActiveDisplayName();
    if (name && state.settings.name !== name) {
      state = { ...state, settings: { ...state.settings, name } };
      persist();
    }
  } catch {
    state = seed();
  }
  listeners.forEach((l) => l());
}

const getSnapshot = () => state;
const serverState = state;
const getServerSnapshot = () => serverState;

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const actions = {
  addEntry(entry: Omit<LogEntry, "id">) {
    set((s) => ({ ...s, entries: [...s.entries, { ...entry, id: uid() }] }));
  },
  updateEntry(id: string, patch: Partial<LogEntry>) {
    set((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },
  deleteEntry(id: string) {
    set((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
  },
  addWater(date: string, ml: number) {
    set((s) => ({ ...s, water: [...s.water, { id: uid(), date, ml }] }));
  },
  updateWater(id: string, ml: number) {
    set((s) => ({ ...s, water: s.water.map((w) => (w.id === id ? { ...w, ml } : w)) }));
  },
  deleteWater(id: string) {
    set((s) => ({ ...s, water: s.water.filter((w) => w.id !== id) }));
  },
  setSteps(date: string, value: number) {
    set((s) => ({ ...s, steps: { ...s.steps, [date]: Math.max(0, value) } }));
  },
  deleteSteps(date: string) {
    set((s) => {
      const steps = { ...s.steps };
      delete steps[date];
      return { ...s, steps };
    });
  },
  addWeight(date: string, value: number) {
    set((s) => ({
      ...s,
      weights: [...s.weights.filter((w) => w.date !== date), { id: uid(), date, value }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }));
  },
  updateWeight(id: string, patch: Partial<WeightEntry>) {
    set((s) => ({
      ...s,
      weights: s.weights
        .map((w) => (w.id === id ? { ...w, ...patch } : w))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }));
  },
  deleteWeight(id: string) {
    set((s) => ({ ...s, weights: s.weights.filter((w) => w.id !== id) }));
  },
  addMeasurement(m: Omit<MeasurementEntry, "id">) {
    set((s) => ({ ...s, measurements: [...s.measurements, { ...m, id: uid() }] }));
  },
  updateMeasurement(id: string, patch: Partial<MeasurementEntry>) {
    set((s) => ({
      ...s,
      measurements: s.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  },
  deleteMeasurement(id: string) {
    set((s) => ({ ...s, measurements: s.measurements.filter((m) => m.id !== id) }));
  },
  addCustomFood(f: Omit<Food, "id">) {
    const food: Food = { ...f, id: uid(), custom: true };
    set((s) => ({ ...s, customFoods: [food, ...s.customFoods] }));
    return food;
  },
  pushRecent(id: string) {
    set((s) => ({ ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 20) }));
  },
  toggleFavorite(id: string) {
    set((s) => ({
      ...s,
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((f) => f !== id)
        : [...s.favorites, id],
    }));
  },
  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  setDayMode(date: string, mode: DayMode) {
    set((s) => ({
      ...s,
      dayModes: { ...(s.dayModes ?? {}), [date]: mode },
    }));
  },
  addChat(msg: Omit<ChatMessage, "id">) {
    const id = uid();
    set((s) => ({ ...s, chat: [...s.chat, { ...msg, id }] }));
    return id;
  },
  updateChat(id: string, patch: Partial<ChatMessage>) {
    set((s) => ({ ...s, chat: s.chat.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  },
  clearChat() {
    set((s) => ({ ...s, chat: seed().chat }));
  },
  resetAll() {
    set(() => seed());
  },
  importState(next: AppState) {
    set(() => migrate(next));
  },
};

export function allFoods(s: AppState): Food[] {
  return [...s.customFoods, ...GLOBAL_FOODS];
}

export function dayTotals(s: AppState, date: string) {
  return s.entries
    .filter((e) => e.date === date)
    .reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export function dayWater(s: AppState, date: string) {
  return s.water.filter((w) => w.date === date).reduce((a, w) => a + w.ml, 0);
}

export function getDayMode(s: AppState, date: string): DayMode {
  return s.dayModes?.[date] ?? "rest";
}

export function getActiveGoals(s: AppState, date: string): MacroGoals {
  const mode = getDayMode(s, date);
  const settings = s.settings;
  if (mode === "training" && settings.trainingGoals) {
    return settings.trainingGoals;
  }
  if (mode === "rest" && settings.restGoals) {
    return settings.restGoals;
  }
  return {
    calorieGoal: settings.calorieGoal,
    proteinGoal: settings.proteinGoal,
    carbGoal: settings.carbGoal,
    fatGoal: settings.fatGoal,
  };
}

export const heDate = (key: string) =>
  new Date(key + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const heShort = (key: string) =>
  new Date(key + "T00:00:00").toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });

export const heWeekday = (key: string) =>
  new Date(key + "T00:00:00").toLocaleDateString("he-IL", { weekday: "short" });

export const heDayLabel = (key: string) =>
  key === todayKey()
    ? "היום"
    : key === toKey(new Date(Date.now() - 86400000))
      ? "אתמול"
      : `יום ${heWeekday(key)} · ${heShort(key)}`;

export const lastDays = (n: number, end = todayKey()) => {
  const base = new Date(end + "T00:00:00").getTime();
  return Array.from({ length: n }, (_, i) => toKey(new Date(base - (n - 1 - i) * 86400000)));
};

export function archiveOlderThan(s: AppState, days = KEEP_DAYS) {
  return {
    weights: s.weights.filter((w) => daysAgo(w.date) > days),
    measurements: s.measurements.filter((m) => daysAgo(m.date) > days),
  };
}
