import { useSyncExternalStore } from "react";
import { GLOBAL_FOODS } from "./foods";
import type {
  AppState,
  ChatMessage,
  Food,
  LogEntry,
  MeasurementEntry,
  Settings,
  WeightEntry,
} from "./types";

const KEY = "fitrack-state-v1";

export const todayKey = () => toKey(new Date());
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): AppState {
  const now = new Date();
  const dayAgo = (n: number) => toKey(new Date(now.getTime() - n * 86400000));
  const weights: WeightEntry[] = [8, 6, 4, 2, 0].map((n, i) => ({
    id: uid(),
    date: dayAgo(n),
    value: 78.4 - i * 0.35,
  }));
  const steps: Record<string, number> = {};
  for (let i = 0; i < 10; i++) steps[dayAgo(i)] = 4200 + Math.round(Math.random() * 5200);
  return {
    settings: {
      name: "אלוף",
      calorieGoal: 2200,
      stepGoal: 10000,
      waterGoal: 2500,
      proteinGoal: 150,
      carbGoal: 220,
      fatGoal: 70,
      theme: "light",
    },
    entries: [
      {
        id: uid(),
        date: todayKey(),
        meal: "breakfast",
        name: "שיבולת שועל",
        grams: 60,
        calories: 233,
        protein: 10.2,
        carbs: 39.6,
        fat: 4.2,
      },
      {
        id: uid(),
        date: todayKey(),
        meal: "breakfast",
        name: "יוגורט יווני 0%",
        grams: 150,
        calories: 89,
        protein: 15,
        carbs: 5.4,
        fat: 0.6,
      },
      {
        id: uid(),
        date: todayKey(),
        meal: "lunch",
        name: "חזה עוף בגריל",
        grams: 180,
        calories: 297,
        protein: 55.8,
        carbs: 0,
        fat: 6.5,
      },
    ],
    water: { [todayKey()]: 750 },
    steps,
    weights,
    measurements: [
      { id: uid(), date: dayAgo(7), waist: 86, chest: 102, arm: 35, thigh: 58 },
      { id: uid(), date: todayKey(), waist: 84.5, chest: 102.5, arm: 35.4, thigh: 58 },
    ],
    customFoods: [],
    recent: ["g1", "g6", "g18", "g9"],
    favorites: ["g1"],
    chat: [
      {
        id: uid(),
        role: "ai",
        text: "שלום! אני היועץ התזונתי החכם שלך. אפשר לשאול אותי כל שאלה על תזונה, אימונים או להעלות תמונה של מוצר לסריקה.",
      },
    ],
  };
}

let state: AppState = seed();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...state, ...(JSON.parse(raw) as AppState) };
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
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

const getSnapshot = () => state;

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
    set((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + ml) } }));
  },
  setSteps(date: string, value: number) {
    set((s) => ({ ...s, steps: { ...s.steps, [date]: Math.max(0, value) } }));
  },
  addWeight(date: string, value: number) {
    set((s) => ({
      ...s,
      weights: [...s.weights.filter((w) => w.date !== date), { id: uid(), date, value }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }));
  },
  deleteWeight(id: string) {
    set((s) => ({ ...s, weights: s.weights.filter((w) => w.id !== id) }));
  },
  addMeasurement(m: Omit<MeasurementEntry, "id">) {
    set((s) => ({ ...s, measurements: [...s.measurements, { ...m, id: uid() }] }));
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
  addChat(msg: Omit<ChatMessage, "id">) {
    set((s) => ({ ...s, chat: [...s.chat, { ...msg, id: uid() }] }));
  },
  resetAll() {
    set(() => seed());
  },
  importState(next: AppState) {
    set(() => next);
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

export const heDate = (key: string) =>
  new Date(key + "T00:00:00").toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const heShort = (key: string) =>
  new Date(key + "T00:00:00").toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
