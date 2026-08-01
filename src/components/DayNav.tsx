import { ChevronLeft, ChevronRight } from "lucide-react";
import { heDayLabel, toKey, todayKey } from "@/lib/store";

export function DayNav({
  date,
  onChange,
  className,
}: {
  date: string;
  onChange: (d: string) => void;
  className?: string;
}) {
  const shift = (days: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    if (d > new Date()) return;
    onChange(toKey(d));
  };

  return (
    <div
      className={
        "flex items-center justify-center gap-1 rounded-full border border-border bg-card p-1 " +
        (className ?? "")
      }
    >
      <button
        onClick={() => shift(-1)}
        className="grid size-8 place-items-center rounded-full hover:bg-accent"
        aria-label="יום קודם"
      >
        <ChevronRight className="size-4" />
      </button>
      <span className="min-w-32 px-2 text-center text-xs font-medium">{heDayLabel(date)}</span>
      <button
        onClick={() => shift(1)}
        disabled={date === todayKey()}
        className="grid size-8 place-items-center rounded-full hover:bg-accent disabled:opacity-40"
        aria-label="יום הבא"
      >
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}
