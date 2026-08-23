export type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  foodId?: string;
}

export interface WaterEntry {
  id: string;
  date: string;
  ml: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
}

export interface MeasurementEntry {
  id: string;
  date: string;
  waist?: number;
  hip?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
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
  /** חיבור לסנכרון צעדים מהצמיד (דרך Google Fit) */
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
