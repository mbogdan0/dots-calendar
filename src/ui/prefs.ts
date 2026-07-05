import {
  FILTER_OPTIONS,
  SETTINGS,
  WIDTH_OPTIONS,
  type Filter,
  type RowWidth,
  type ViewMode,
} from '../config/settings';
import { clampCellPx } from './cellSize';

export interface Prefs {
  view: ViewMode;
  width: RowWidth;
  filter: Filter;
  /** Max edge length of a day square (the size slider), px. */
  cellPx: number;
}

const DEFAULT: Prefs = {
  view: SETTINGS.initialView,
  width: SETTINGS.initialWidth,
  filter: SETTINGS.initialFilter,
  cellPx: SETTINGS.LAYOUT.cellPxDefault,
};

/** Last known full prefs; savePrefs merges partial updates over it so callers
 * that only own some fields (store subscription vs. size slider) cannot
 * clobber each other's values. */
let current: Prefs = DEFAULT;

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(SETTINGS.prefsKey);
    if (!raw) return (current = DEFAULT);
    const o = JSON.parse(raw) as Partial<Prefs>;
    const view: ViewMode = o.view === 'months' || o.view === 'stream' ? o.view : DEFAULT.view;
    const width: RowWidth = WIDTH_OPTIONS.includes(o.width as RowWidth)
      ? (o.width as RowWidth)
      : DEFAULT.width;
    const filter: Filter = FILTER_OPTIONS.includes(o.filter as Filter)
      ? (o.filter as Filter)
      : DEFAULT.filter;
    const cellPx = Number.isFinite(o.cellPx) ? clampCellPx(o.cellPx as number) : DEFAULT.cellPx;
    return (current = { view, width, filter, cellPx });
  } catch {
    return (current = DEFAULT);
  }
}

export function savePrefs(patch: Partial<Prefs>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(SETTINGS.prefsKey, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}
