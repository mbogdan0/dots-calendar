import { SETTINGS } from '../config/settings';
import type { DotEvent } from '../data/types';
import { DAY_MS, setNoon } from './dateUtils';

/** Group events by their 'YYYY-MM-DD' key. */
export function groupByDay(events: DotEvent[]): Map<string, DotEvent[]> {
  const m = new Map<string, DotEvent[]>();
  for (const ev of events) {
    const arr = m.get(ev.ymd);
    if (arr) arr.push(ev);
    else m.set(ev.ymd, [ev]);
  }
  return m;
}

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Initial render window. Always includes today (so "Today" works immediately)
 * and the full event-bearing range padded a little (so every event is in the DOM
 * and findable via Ctrl+F). There is no hardcoded multi-year window — the range
 * only grows lazily from here as the user scrolls.
 */
export function initialRange(events: DotEvent[]): DateRange {
  const today = setNoon(new Date());
  const fallback = SETTINGS.fallbackRangeDays * DAY_MS;
  let minTs = today.getTime() - fallback;
  let maxTs = today.getTime() + fallback;

  if (events.length) {
    const sorted = [...events].sort((a, b) => a.date - b.date);
    const pad = SETTINGS.eventsPaddingDays * DAY_MS;
    minTs = Math.min(minTs, sorted[0].date - pad);
    maxTs = Math.max(maxTs, sorted[sorted.length - 1].date + pad);
  }

  return { start: setNoon(new Date(minTs)), end: setNoon(new Date(maxTs)) };
}
