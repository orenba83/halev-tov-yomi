import type { Food } from "./types";

/** מאגר מזון גלובלי – ערכים ל-100 גרם */
export const GLOBAL_FOODS: Food[] = [
  { id: "g1", name: "חזה עוף בגריל", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: "g2", name: "אורז לבן מבושל", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "g3", name: "אורז מלא מבושל", calories: 123, protein: 2.6, carbs: 26, fat: 1 },
  { id: "g4", name: "ביצה קשה", calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { id: "g5", name: "קוטג' 5%", calories: 103, protein: 11, carbs: 3.5, fat: 5 },
  { id: "g6", name: "יוגורט יווני 0%", calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { id: "g7", name: "לחם מחיטה מלאה", calories: 247, protein: 13, carbs: 41, fat: 3.4 },
  { id: "g8", name: "אבוקדו", calories: 160, protein: 2, carbs: 9, fat: 15 },
  { id: "g9", name: "בננה", calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { id: "g10", name: "תפוח עץ", calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: "g11", name: "שקדים", calories: 579, protein: 21, carbs: 22, fat: 50 },
  { id: "g12", name: "טונה במים", calories: 116, protein: 26, carbs: 0, fat: 1 },
  { id: "g13", name: "סלמון אפוי", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { id: "g14", name: "בטטה אפויה", calories: 90, protein: 2, carbs: 21, fat: 0.1 },
  { id: "g15", name: "חומוס מוכן", calories: 166, protein: 8, carbs: 14, fat: 9 },
  { id: "g16", name: "סלט ירקות", calories: 35, protein: 1.2, carbs: 6, fat: 0.5 },
  { id: "g17", name: "אבקת חלבון (מנה)", calories: 380, protein: 78, carbs: 8, fat: 4 },
  { id: "g18", name: "שיבולת שועל", calories: 389, protein: 17, carbs: 66, fat: 7 },
  { id: "g19", name: "גבינה צהובה 28%", calories: 350, protein: 25, carbs: 1, fat: 28 },
  { id: "g20", name: "פסטה מבושלת", calories: 158, protein: 6, carbs: 31, fat: 0.9 },
  { id: "g21", name: "בשר בקר טחון 5%", calories: 137, protein: 21, carbs: 0, fat: 5 },
  { id: "g22", name: "טופו", calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { id: "g23", name: "חלב 3%", calories: 61, protein: 3.3, carbs: 4.7, fat: 3.3 },
  { id: "g24", name: "שוקולד מריר 70%", calories: 598, protein: 7.8, carbs: 46, fat: 43 },

  // ביצים לפי גודל
  { id: "e1", name: "ביצה גודל S (45 ג׳)", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, serving: 45 },
  { id: "e2", name: "ביצה גודל M (55 ג׳)", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, serving: 55 },
  { id: "e3", name: "ביצה גודל L (63 ג׳)", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, serving: 63 },
  { id: "e4", name: "ביצה גודל XL (73 ג׳)", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, serving: 73 },
  { id: "e5", name: "חלבון ביצה", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, serving: 33 },
  { id: "e6", name: "חלמון ביצה", calories: 322, protein: 16, carbs: 3.6, fat: 27, serving: 17 },
  { id: "e7", name: "ביצת עין מטוגנת", calories: 196, protein: 13.6, carbs: 0.8, fat: 15, serving: 60 },
  { id: "e8", name: "חביתה משתי ביצים", calories: 170, protein: 12, carbs: 1, fat: 13, serving: 120 },

  // יוגורטים
  { id: "y1", name: "יוגורט טבעי 3%", calories: 61, protein: 3.5, carbs: 4.7, fat: 3, serving: 150 },
  { id: "y2", name: "יוגורט טבעי 1.5%", calories: 50, protein: 3.8, carbs: 5, fat: 1.5, serving: 150 },
  { id: "y3", name: "יוגורט טבעי 0%", calories: 40, protein: 4.2, carbs: 5.2, fat: 0.1, serving: 150 },
  { id: "y4", name: "יוגורט יווני 2%", calories: 73, protein: 9, carbs: 3.8, fat: 2, serving: 150 },
  { id: "y5", name: "יוגורט יווני 5%", calories: 97, protein: 8.7, carbs: 3.6, fat: 5, serving: 150 },
  { id: "y6", name: "יוגורט עם פירות", calories: 95, protein: 3.3, carbs: 15, fat: 2.5, serving: 150 },
  { id: "y7", name: "יוגורט פרו חלבון", calories: 62, protein: 10, carbs: 4.5, fat: 0.2, serving: 200 },
  { id: "y8", name: "יוגורט כבשים", calories: 108, protein: 5.5, carbs: 5.4, fat: 7, serving: 150 },
  { id: "y9", name: "יוגורט עיזים", calories: 70, protein: 3.6, carbs: 4.5, fat: 4, serving: 150 },
  { id: "y10", name: "אשל 4.5%", calories: 74, protein: 3.6, carbs: 4, fat: 4.5, serving: 200 },
  { id: "y11", name: "לבן 3%", calories: 62, protein: 3.6, carbs: 4.5, fat: 3, serving: 200 },
  { id: "y12", name: "דנונה / מעדן חלב", calories: 105, protein: 3, carbs: 16, fat: 3, serving: 100 },

  // לחמים ופחמימות נפוצות
  { id: "b1", name: "פרוסת לחם אחיד", calories: 265, protein: 9, carbs: 49, fat: 3, serving: 30 },
  { id: "b2", name: "פרכית אורז", calories: 387, protein: 8, carbs: 81, fat: 3, serving: 8 },
  { id: "b3", name: "פיתה מלאה", calories: 262, protein: 9.5, carbs: 51, fat: 1.6, serving: 70 },
];

