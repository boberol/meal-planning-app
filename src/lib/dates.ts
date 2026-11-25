/**
 * Small date helpers. Weeks start on Monday (a setting can change this later).
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Midnight on the Monday of the week that contains `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Sunday is 0 in JavaScript; we want Monday = 0.
  d.setDate(d.getDate() - offset);
  return d;
}

/** The seven days of the week that contains `date`, Monday first. */
export function weekDays(date: Date): { date: Date; label: string; day: number; isToday: boolean }[] {
  const start = startOfWeek(date);
  const today = new Date();
  return DAYS.map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, label, day: d.getDate(), isToday: sameDay(d, today) };
  });
}

/** "23 – 29 November", or "29 December – 4 January" across months. */
export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A date as "2026-11-25", in local time (what the database's `date` columns hold). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The opposite of toISODate: "2026-11-25" → midnight that day, local time. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** "This week", "Next week", "Last week", "In 3 weeks", "2 weeks ago". */
export function relativeWeekLabel(date: Date, now: Date = new Date()): string {
  const diff = Math.round((startOfWeek(date).getTime() - startOfWeek(now).getTime()) / (7 * 24 * 3600 * 1000));
  if (diff === 0) return 'This week';
  if (diff === 1) return 'Next week';
  if (diff === -1) return 'Last week';
  return diff > 1 ? `In ${diff} weeks` : `${-diff} weeks ago`;
}

/** "Wednesday · today", "Thursday · tomorrow", or "Friday 27 November". */
export function dayHeading(date: Date, now: Date = new Date()): string {
  const name = LONG_DAYS[date.getDay()];
  if (sameDay(date, now)) return `${name} · today`;
  if (sameDay(date, addDays(now, 1))) return `${name} · tomorrow`;
  if (sameDay(date, addDays(now, -1))) return `${name} · yesterday`;
  return `${name} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Wed 25 Nov", short enough for a button. */
export function shortDate(date: Date): string {
  return `${DAYS[(date.getDay() + 6) % 7]} ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}
