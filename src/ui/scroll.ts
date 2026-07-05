import { SETTINGS } from '../config/settings';
import { animateScrollTo } from './animateScroll';
import { pulseCell } from './effects';
import type { ScrollIntent } from './scrollIntent';

/**
 * Scroll positioning around the day grid. Two families of helpers:
 *  - anchor capture/restore, keeping the day under the viewport center in
 *    place across full grid remounts (width/view/filter changes, mutations);
 *  - day targeting, placing a specific date at a viewport fraction either
 *    instantly (first paint) or animated (Today button, remote mutations).
 */

/** A day to keep visually stable across a remount. */
export interface Anchor {
  ymd: string;
  /** rect.top of the day at capture time. */
  viewportTop: number;
}

function findDay(grid: HTMLElement, ymd: string): HTMLElement | null {
  return grid.querySelector<HTMLElement>(`.day[data-ymd="${ymd}"]`);
}

function todayYmd(grid: HTMLElement): string | null {
  return grid.querySelector<HTMLElement>('.day[data-today="1"]')?.dataset.ymd ?? null;
}

/** Target scroll offset that puts `el` at the given viewport height fraction. */
function targetFor(el: HTMLElement, fraction: number): number {
  const rect = el.getBoundingClientRect();
  return window.scrollY + rect.top - (window.innerHeight - rect.height) * fraction;
}

/** The day whose row sits nearest the viewport vertical center. */
export function captureAnchor(grid: HTMLElement): Anchor | null {
  const rows = grid.querySelectorAll<HTMLElement>('.row');
  const center = window.innerHeight / 2;
  let last: HTMLElement | null = null;
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    last = row;
    if (rect.bottom >= center) break;
  }
  const day = last?.querySelector<HTMLElement>('.day');
  if (!day?.dataset.ymd) return null;
  return { ymd: day.dataset.ymd, viewportTop: day.getBoundingClientRect().top };
}

/** Instantly put the anchor day back at its captured viewport offset. */
export function restoreAnchor(grid: HTMLElement, anchor: Anchor): boolean {
  const el = findDay(grid, anchor.ymd);
  if (!el) return false; // anchor date fell out of the rebuilt range
  window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - anchor.viewportTop });
  return true;
}

/** Anchor restore with a sane fallback: a lost anchor re-centers on today. */
function restoreAnchorOrToday(grid: HTMLElement, anchor: Anchor | null): boolean {
  if (anchor && restoreAnchor(grid, anchor)) return true;
  const ymd = todayYmd(grid);
  if (ymd) placeDayInstant(grid, ymd, SETTINGS.SCROLL.todayViewportFraction);
  return false;
}

export function placeDayInstant(grid: HTMLElement, ymd: string, fraction: number): void {
  const el = findDay(grid, ymd);
  if (el) window.scrollTo({ top: Math.max(0, targetFor(el, fraction)) });
}

/** Animated travel to a day (teleports most of a long distance first). */
export function scrollToDayAnimated(
  grid: HTMLElement,
  ymd: string,
  fraction: number,
): Promise<boolean> {
  if (!findDay(grid, ymd)) return Promise.resolve(false);
  // Re-resolve per frame: lazy prepends move the element in document coords.
  return animateScrollTo(() => {
    const el = findDay(grid, ymd);
    return el ? targetFor(el, fraction) : window.scrollY;
  });
}

export function isDayInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

/** Animated centering on today plus the confirmation pulse. */
export function goToToday(grid: HTMLElement): void {
  const ymd = todayYmd(grid);
  if (!ymd) return;
  void scrollToDayAnimated(grid, ymd, SETTINGS.SCROLL.todayViewportFraction).then((done) => {
    const el = findDay(grid, ymd);
    if (done && el) pulseCell(el);
  });
}

/**
 * Post-remount scroll policy: where the viewport goes after the grid has been
 * rebuilt, driven by what caused the rebuild.
 */
export function applyScrollIntent(
  intent: ScrollIntent,
  anchor: Anchor | null,
  grid: HTMLElement,
): void {
  switch (intent.type) {
    case 'initial': {
      const ymd = todayYmd(grid);
      if (ymd) placeDayInstant(grid, ymd, SETTINGS.SCROLL.todayViewportFraction);
      break;
    }
    case 'today':
      goToToday(grid);
      break;
    case 'width':
    case 'preserve':
      restoreAnchorOrToday(grid, anchor);
      break;
    case 'mutation': {
      restoreAnchorOrToday(grid, anchor);
      const el = findDay(grid, intent.ymd);
      if (!el) break; // mutated day filtered out or outside the rebuilt range
      if (isDayInViewport(el)) {
        requestAnimationFrame(() => pulseCell(el));
      } else {
        void scrollToDayAnimated(grid, intent.ymd, SETTINGS.SCROLL.todayViewportFraction).then(
          (done) => {
            const target = findDay(grid, intent.ymd);
            if (done && target) pulseCell(target);
          },
        );
      }
      break;
    }
  }
}
