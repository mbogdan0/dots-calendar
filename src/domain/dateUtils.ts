import { MONTHS_RU_GEN, WEEKDAYS_RU } from '../config/settings';

export const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' — lexicographically sortable, matches old.js. */
export function ymd(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** '14 марта 2026, суббота' for the details panel and combined view. */
export function fmtLong(d: Date): string {
  return `${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]} ${d.getFullYear()}, ${WEEKDAYS_RU[d.getDay()]}`;
}

export function setNoon(d: Date): Date {
  d.setHours(12, 0, 0, 0);
  return d;
}

export function isWeekend(d: Date): boolean {
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

/** Monday = 0 … Sunday = 6 (weeks are Monday-aligned). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Noon on the Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = setNoon(new Date(d));
  x.setDate(x.getDate() - mondayIndex(x));
  return x;
}
