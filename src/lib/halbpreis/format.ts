const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function chf(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (Number.isInteger(n)) return `${n}.–`;
  return n.toFixed(2);
}

function parse(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Mi 11.11." */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parse(iso);
  return `${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
}

/** Validity line for a card: "bis Mi 11.11." / "ab Do 12.11." / "solange Vorrat" */
export function validity(from: string | null, to: string | null): string {
  const t = todayIso();
  if (from && from > t) return `ab ${shortDate(from)}`;
  if (to) return to === t ? "nur heute" : `bis ${shortDate(to)}`;
  if (from) return `seit ${shortDate(from)}`;
  return "";
}

/** "Fr 06.11., 06:17" */
export function stamp(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  const date = d.toLocaleDateString("de-CH", {
    timeZone: "Europe/Zurich",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const time = d.toLocaleTimeString("de-CH", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
}
