import { UI_TEXT } from '../config/settings';
import { fmtDMY } from '../domain/dateUtils';
import { diffParts, diffStr } from '../domain/relativeTime';
import { detailsIn, detailsOut, fadeIn, fadeOut } from './effects';
import { selectedYmds } from './selection';
import type { Store } from './state';

/**
 * Combined view of the selected days: a centered modal listing them in
 * chronological order — each day's date and events, with the elapsed span
 * ("спустя 1 месяц 4 дня") between consecutive days. Read-only by design;
 * editing stays in the per-day panel. Reads the store's unfiltered
 * eventsByDay: the combined view always shows a day in full, even while an
 * importance filter or search trims the grid.
 */

let overlayEl: HTMLElement | null = null;
let unsubscribe: (() => void) | null = null;

/** Close the modal if open; returns whether there was one (for Esc routing). */
export function closeCombined(): boolean {
  const overlay = overlayEl;
  if (!overlay) return false;
  overlayEl = null;
  unsubscribe?.();
  unsubscribe = null;
  const modal = overlay.querySelector<HTMLElement>('.combined');
  if (modal) detailsOut(modal, () => {});
  fadeOut(overlay, () => overlay.remove());
  return true;
}

export function openCombined(store: Store): void {
  closeCombined();
  const ymds = selectedYmds();
  if (ymds.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'combined-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCombined();
  });

  const modal = document.createElement('div');
  modal.className = 'combined';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'combined-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', UI_TEXT.cancel);
  closeBtn.addEventListener('click', () => closeCombined());
  modal.appendChild(closeBtn);

  const eventsByDay = store.get().eventsByDay;
  const now = new Date();
  let prev: Date | null = null;

  for (const key of ymds) {
    // Component-wise parse: new Date('YYYY-MM-DD') would be UTC midnight and
    // shift a day in negative-offset timezones.
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);

    if (prev) {
      const gap = document.createElement('div');
      gap.className = 'combined-gap';
      gap.textContent = `${UI_TEXT.gapPrefix} ${diffParts(prev, date)}`;
      modal.appendChild(gap);
    }
    prev = date;

    const day = document.createElement('section');
    day.className = 'combined-day';

    const head = document.createElement('div');
    head.className = 'details-head';
    const dateEl = document.createElement('span');
    dateEl.className = 'details-date';
    dateEl.textContent = fmtDMY(date);
    head.appendChild(dateEl);
    const rel = diffStr(date, now, 3);
    if (rel) {
      const relEl = document.createElement('span');
      relEl.className = 'rel-time';
      relEl.textContent = rel;
      head.appendChild(relEl);
    }
    day.appendChild(head);

    const items = eventsByDay.get(key) ?? [];
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'combined-empty';
      empty.textContent = UI_TEXT.noEventsText;
      day.appendChild(empty);
    } else {
      for (const ev of items) {
        const row = document.createElement('div');
        row.className = 'combined-event';
        row.textContent = ev.short + (ev.full ? ' — ' + ev.full : '');
        day.appendChild(row);
      }
    }
    modal.appendChild(day);
  }

  overlay.appendChild(modal);
  overlayEl = overlay;
  document.body.appendChild(overlay);
  fadeIn(overlay);
  detailsIn(modal);

  // Any data/view mutation invalidates the snapshot — close like details does.
  unsubscribe = store.subscribe(() => closeCombined());
}
