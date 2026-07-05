import { THEME } from '../config/theme';

export interface ResolvedColors {
  today: string;
  weekend: string;
  weekday: string;
  event: string;
  weekendPast: string;
  weekdayPast: string;
  eventPast: string;
}

/** Blend a hex color toward white by `pct` percent (ported from old.js). */
export function lighten(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const blend = (c: number): number => Math.round(c + (255 - c) * (pct / 100));
  const hx = (v: number): string => v.toString(16).padStart(2, '0');
  return '#' + hx(blend(r)) + hx(blend(g)) + hx(blend(b));
}

let cached: ResolvedColors | null = null;

/** Resolve theme colors + their lightened "past" variants (computed once). */
export function resolveColors(): ResolvedColors {
  if (cached) return cached;
  cached = {
    today: THEME.today,
    weekend: THEME.weekend,
    weekday: THEME.weekday,
    event: THEME.event,
    weekendPast: lighten(THEME.weekend, 45),
    weekdayPast: lighten(THEME.weekday, 45),
    eventPast: lighten(THEME.event, 25),
  };
  return cached;
}

export function colorFor(
  isToday: boolean,
  isEvent: boolean,
  weekend: boolean,
  isPast: boolean,
  c: ResolvedColors,
): string {
  if (isToday) return c.today;
  if (isEvent) return isPast ? c.eventPast : c.event;
  if (weekend) return isPast ? c.weekendPast : c.weekend;
  return isPast ? c.weekdayPast : c.weekday;
}
