// Russian relative-time formatter ("через 2 дня", "5 лет назад").
// Typed port of diffStr() from old.js — logic unchanged.

type PluralForms = readonly [string, string, string];

const FORMS: readonly PluralForms[] = [
  ['год', 'года', 'лет'],
  ['месяц', 'месяца', 'месяцев'],
  ['день', 'дня', 'дней'],
];

function pluralIndex(n: number): number {
  if (n % 10 === 1 && n % 100 !== 11) return 0;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1;
  return 2;
}

const dayStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function addMonths(d: Date, m: number): Date {
  const x = dayStart(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + m);
  x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  return x;
}

/** Bare span between two days, oldest first: "1 месяц 4 дня". '' when same day. */
export function diffParts(from: Date | number, to: Date | number, n = 3): string {
  n = Math.max(1, n | 0);
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const a0 = dayStart(a);
  const b0 = dayStart(b);
  return a0.getTime() <= b0.getTime() ? partsStr(a0, b0, n) : partsStr(b0, a0, n);
}

/** The years/months/days walk from `start` up to `end` (both day-aligned). */
function partsStr(startDay: Date, end: Date, n: number): string {
  let start = startDay;
  const parts: { v: number; i: number }[] = [];

  let years = end.getFullYear() - start.getFullYear();
  if (addMonths(start, years * 12).getTime() > end.getTime()) years--;
  if (years > 0) {
    parts.push({ v: years, i: 0 });
    start = addMonths(start, years * 12);
  }

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (addMonths(start, months).getTime() > end.getTime()) months--;
  if (months > 0) {
    parts.push({ v: months, i: 1 });
    start = addMonths(start, months);
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days > 0) parts.push({ v: days, i: 2 });

  return parts
    .slice(0, n)
    .map((p) => p.v + ' ' + FORMS[p.i][pluralIndex(p.v)])
    .join(' ');
}

export function diffStr(t: Date | number, e: Date | number = new Date(), n = 3): string {
  n = Math.max(1, n | 0);
  const a = new Date(t);
  const b = new Date(e);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';

  const a0 = dayStart(a);
  const b0 = dayStart(b);
  const dd = Math.round((a0.getTime() - b0.getTime()) / 86_400_000);
  if (dd === 0) return 'сегодня';
  if (dd === -1) return 'вчера';
  if (dd === 1) return 'завтра';

  const future = a.getTime() > b.getTime();
  const out = future ? partsStr(b0, a0, n) : partsStr(a0, b0, n);
  return (future ? 'через ' : '') + out + (future ? '' : ' назад');
}
