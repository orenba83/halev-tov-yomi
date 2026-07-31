export type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: { key: MealKey; label: string; time: string }[] = [
  { key: "breakfast", label: "ארוחת בוקר", time: "08:00" },
  { key: "lunch", label: "ארוחת צהריים", time: "13:00" },
  { key: "dinner", label: "ארוחת ערב", time: "19:00" },
  { key: "snack", label: "חטיף / ביניים", time: "16:00" },
];

export interface Food {
  id: string;
  name: string;
  /** ערכים ל-100 גרם */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit?: string;
  custom?: boolean;
}

export interface LogEntry {
  id: string;
  date: string;
  meal: MealKey;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  value: number;
}

export interface MeasurementEntry {
  id: string;
  date: string;
  waist: number;
  chest: number;
  arm: number;
  thigh: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

export interface Settings {
  name: string;
  calorieGoal: number;
  stepGoal: number;
  waterGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  theme: "light" | "dark";
}

export interface AppState {
  settings: Settings;
  entries: LogEntry[];
  water: Record<string, number>;
  steps: Record<string, number>;
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  customFoods: Food[];
  recent: string[];
  favorites: string[];
  chat: ChatMessage[];
}
