export type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: { key: MealKey; label: string; time: string }[] = [
  { key: "breakfast", label: "ארוחת בוקר", time: "08:00" },
  { key: "lunch", label: "ארוחת צהריים", time: "13:00" },
  { key: "dinner", label: "ארוחת ערב", time: "19:00" },
  { key: "snack", label: "ארוחה רביעית / חטיף", time: "16:00" },
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
  /** גודל מנה בגרמים (למשל פרכית אחת) – לשימוש בהיסטוריה */
  serving?: number;
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

export interface WaterEntry {
  id: string;
  date: string;
  ml: number;
}

export const MEASURE_FIELDS = [
  { key: "waist", label: "מותניים" },
  { key: "chest", label: "חזה" },
  { key: "arm", label: "יד" },
  { key: "thigh", label: "ירך" },
  { key: "hips", label: "אגן" },
] as const;

export type MeasureKey = (typeof MEASURE_FIELDS)[number]["key"];

export interface MeasurementEntry {
  id: string;
  date: string;
  waist: number;
  chest: number;
  arm: number;
  thigh: number;
  hips: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  image?: string;
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
  /** סנכרון צעדים מהצמיד (Huawei Health → Google Fit) */
  huaweiEmail?: string;
  huaweiConnected?: boolean;
  huaweiLastSync?: string;
}

export interface AppState {
  settings: Settings;
  entries: LogEntry[];
  water: WaterEntry[];
  steps: Record<string, number>;
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  customFoods: Food[];
  recent: string[];
  favorites: string[];
  chat: ChatMessage[];
}
