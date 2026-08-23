export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  const at = v.indexOf("@");
  const dot = v.lastIndexOf(".");
  return at > 0 && dot > at + 1 && dot < v.length - 1 && !v.includes(" ");
}

export function looksLikeIsoDate(value: string): boolean {
  if (value.length !== 10) return false;
  if (value[4] !== "-" || value[7] !== "-") return false;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  return y >= 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

export function splitCsvLine(line: string): [string, string] {
  const comma = line.indexOf(",");
  const semi = line.indexOf(";");
  const tab = line.indexOf("\t");
  const idx = [comma, semi, tab].filter((n) => n >= 0).sort((a, b) => a - b)[0] ?? -1;
  if (idx < 0) return [line, ""];
  return [line.slice(0, idx), line.slice(idx + 1)];
}
