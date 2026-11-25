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
