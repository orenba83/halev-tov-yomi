import type { Food } from "./types";

export type UnitKey = "gram" | "tbsp" | "tsp" | "piece";

export const UNIT_LABELS: Record<UnitKey, string> = {
  gram: "גרם",
  tbsp: "כף",
  tsp: "כפית",
  piece: "יחידה",
};

const PIECE_WEIGHTS: [string, number][] = [
  ["פרכית", 8],
  ["ביצה", 55],
  ["בננה", 120],
  ["תפוח", 180],
  ["מלפפון", 110],
  ["עגבני", 120],
  ["פרוסה", 30],
  ["לחם", 30],
  ["פיתה", 70],
  ["לחמני", 60],
  ["תמר", 8],
  ["שקד", 1.2],
  ["אגוז", 5],
  ["קרקר", 6],
  ["עוגי", 15],
  ["בורקס", 90],
  ["שניצל", 100],
  ["חזה עוף", 150],
  ["יוגורט", 150],
  ["קוטג", 250],
  ["גביע", 200],
  ["כוס", 240],
];

const SPREADS = ["חומוס", "טחינה", "ממרח", "חמאה", "שמנת", "קטשופ", "מיונז", "ריבה", "סילאן", "דבש"];
const POWDERS = ["אבקה", "קמח", "סוכר", "קקאו", "קינמון", "מלח", "שועל"];
const LIQUIDS = ["שמן", "חלב", "מים", "מיץ", "רוטב", "סירופ", "חומץ"];

const has = (name: string, list: string[]) => list.some((k) => name.includes(k));

/** הערכת משקל בגרמים לכל יחידת מדידה, לפי סוג המוצר */
export function unitGrams(food: Pick<Food, "name" | "serving">): Record<UnitKey, number> {
  const name = food.name ?? "";
  let tbsp = 15;
  let tsp = 5;
  if (has(name, SPREADS)) {
    tbsp = 20;
    tsp = 7;
  } else if (has(name, POWDERS)) {
    tbsp = 10;
    tsp = 3;
  } else if (has(name, LIQUIDS)) {
    tbsp = 15;
    tsp = 5;
  }
  const match = PIECE_WEIGHTS.find(([k]) => name.includes(k));
  const piece = food.serving && food.serving > 0 ? food.serving : (match?.[1] ?? 100);
  return { gram: 1, tbsp, tsp, piece };
}
