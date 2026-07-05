import { SETTINGS, UI_TEXT } from '../config/settings';
import { dataSource } from '../data';
import type { DotEvent } from '../data/types';
import { fmtLong } from '../domain/dateUtils';
import { diffStr } from '../domain/relativeTime';
import { detailsIn, detailsOut, swapHeight } from './effects';
import { buildEntryForm, type EntryFormOptions } from './entryForm';
import { importantDot, pill } from './pill';
import { setScrollIntent } from './scrollIntent';
import { isSelectMode, onSelectionChange, toggleDay } from './selection';
import type { Store } from './state';

/**
 * Delegated day-click handling on a stable root element. Clicking a day marks
 * the square (.is-open) and opens a popover anchored to it — positioned in
 * document coordinates so the grid never shifts. The popover flips above the
 * cell when there is no room below, clamps to the viewport horizontally, and
 * springs open out of the cell. An empty day opens the add form directly; a
 * non-empty day lists its entries — a whole row is one click target that opens
 * the edit form and gets highlighted while it is being edited. Esc, outside
 * clicks, re-clicks and any store change close it — the latter also closes it
 * after every successful mutation (the cell pulse confirms the save).
 */
export function attachDetails(root: HTMLElement, store: Store): void {
  let detailsEl: HTMLElement | null = null;
  let activeDay: HTMLElement | null = null;
  let placedAbove = false;

  // Lazy top-prepends shift document coordinates; follow by the exact delta.
  const onPrepend = ((e: CustomEvent<{ delta: number }>): void => {
    if (!detailsEl) return;
    detailsEl.style.top = `${parseFloat(detailsEl.style.top || '0') + e.detail.delta}px`;
  }) as EventListener;

  function clear(animated = false): void {
    const el = detailsEl;
    detailsEl = null;
    if (el) {
      if (animated) detailsOut(el, () => el.remove());
      else el.remove();
    }
    activeDay?.classList.remove('is-open');
    activeDay = null;
    window.removeEventListener('dots:prepend', onPrepend);
  }

  /**
   * Swap animation policy for the form slot: when the popover hangs below the
   * cell it simply grows downward (animated); when it sits above the cell it
   * is re-anchored instantly so growth never covers the cell.
   */
  function onFormSwap(formSlot: HTMLElement, apply: () => void): void {
    if (!placedAbove) {
      swapHeight(formSlot, apply);
      return;
    }
    apply();
    if (detailsEl && activeDay) positionPanel(detailsEl, activeDay);
  }

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const day = target?.closest<HTMLElement>('.day') ?? null;
    if (!day || !root.contains(day)) return;

    // Select mode diverts day clicks to the selection instead of the panel.
    if (isSelectMode()) {
      toggleDay(day);
      return;
    }

    if (activeDay === day && detailsEl) {
      clear(true);
      return;
    }
    clear();

    const panel = buildDayPanel(day, store, () => clear(true), onFormSwap);
    detailsEl = panel;
    // Hidden before insertion so the full-size panel never flashes for a frame;
    // opacity does not affect the offsetWidth/Height reads in positionPanel.
    panel.style.opacity = '0';
    document.body.appendChild(panel);
    placedAbove = positionPanel(panel, day);
    detailsIn(panel);
    activeDay = day;
    day.classList.add('is-open');
    window.addEventListener('dots:prepend', onPrepend);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailsEl) clear(true);
  });
  document.addEventListener('click', (e) => {
    if (!detailsEl) return;
    const t = e.target as HTMLElement | null;
    // A click inside the panel may detach its own target synchronously (form
    // swaps): a disconnected target was never an outside click.
    if (!t || !t.isConnected) return;
    // Day clicks are handled by the delegated opener above.
    if (detailsEl.contains(t) || t.closest('.day')) return;
    clear(true);
  });

  store.subscribe(() => clear());
  // Entering select mode (or any selection activity) dismisses an open panel.
  onSelectionChange(() => {
    if (isSelectMode()) clear();
  });
}

/**
 * Place the popover under (or above) its anchor cell in document coordinates
 * and point the transform origin at the cell so detailsIn scales out of it.
 * Returns true when the popover was flipped above the cell.
 */
function positionPanel(panel: HTMLElement, day: HTMLElement): boolean {
  const { viewportMarginPx, anchorGapPx, dockClearancePx } = SETTINGS.POPOVER;
  const r = day.getBoundingClientRect();
  const panelW = panel.offsetWidth;
  const panelH = panel.offsetHeight;

  const left = Math.min(
    Math.max(window.scrollX + r.left + r.width / 2 - panelW / 2, window.scrollX + viewportMarginPx),
    window.scrollX + window.innerWidth - viewportMarginPx - panelW,
  );

  const fitsBelow = r.bottom + anchorGapPx + panelH <= window.innerHeight - dockClearancePx;
  const fitsAbove = r.top - anchorGapPx - panelH >= 0;
  const above = !fitsBelow && fitsAbove;
  const top = above
    ? window.scrollY + r.top - anchorGapPx - panelH
    : window.scrollY + r.bottom + anchorGapPx;

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  const originX = Math.min(Math.max(window.scrollX + r.left + r.width / 2 - left, 0), panelW);
  panel.style.transformOrigin = `${originX}px ${above ? `${panelH}px` : '0px'}`;
  return above;
}

/** Persist a mutation result produced by the store's CRUD helpers. */
function persist(next: DotEvent[]): void {
  void dataSource.replaceAll(next);
}

function buildDayPanel(
  day: HTMLElement,
  store: Store,
  close: () => void,
  formSwap: (formSlot: HTMLElement, apply: () => void) => void,
): HTMLElement {
  const key = day.dataset.ymd ?? '';
  const items = store.get().eventsByDay.get(key) ?? [];

  const panel = document.createElement('div');
  panel.className = 'details';

  const head = document.createElement('div');
  head.className = 'details-head';
  const ts = day.dataset.ts ? Number(day.dataset.ts) : 0;
  const dateEl = document.createElement('span');
  dateEl.className = 'details-date';
  dateEl.textContent = ts ? fmtLong(new Date(ts)) : '';
  head.appendChild(dateEl);
  const rel = ts ? diffStr(new Date(ts), new Date(), 3) : '';
  if (rel) {
    const relEl = document.createElement('span');
    relEl.className = 'rel-time';
    relEl.textContent = rel;
    head.appendChild(relEl);
  }
  panel.appendChild(head);

  const formSlot = document.createElement('div');
  formSlot.className = 'details-form';

  let addBtn: HTMLButtonElement | null = null;
  let editingRow: HTMLElement | null = null;

  // Single place that swaps the form: highlights the row being edited and
  // hides "+ Добавить" while any form is open, so only one action is visible.
  function setForm(formEl: HTMLElement | null, row: HTMLElement | null): void {
    editingRow?.classList.remove('is-editing');
    editingRow = row;
    row?.classList.add('is-editing');
    formSwap(formSlot, () => {
      if (addBtn) addBtn.hidden = formEl !== null;
      if (formEl) formSlot.replaceChildren(formEl);
      else formSlot.replaceChildren();
    });
  }

  const addForm = (onCancel: EntryFormOptions['onCancel']): HTMLFormElement =>
    buildEntryForm({
      mode: 'add',
      initial: { ymd: key },
      onSave: (draft) => {
        const ev: DotEvent = { id: crypto.randomUUID(), ...draft };
        setScrollIntent({ type: 'mutation', ymd: draft.ymd });
        persist(store.addEvent(ev));
      },
      onCancel,
    });

  if (items.length === 0) {
    // Empty day: the panel is just the add form; cancelling closes the panel.
    formSlot.appendChild(addForm(close));
  } else {
    const list = document.createElement('div');
    list.className = 'details-list';
    for (const ev of items) list.appendChild(buildEntryRow(ev, store, setForm));
    panel.appendChild(list);

    // Adding to a non-empty day is gated behind an explicit second click.
    addBtn = pill('+ ' + UI_TEXT.addLabel, 'ghost');
    addBtn.classList.add('details-add');
    addBtn.addEventListener('click', () => setForm(addForm(() => setForm(null, null)), null));
    panel.appendChild(addBtn);
  }
  panel.appendChild(formSlot);

  return panel;
}

function buildEntryRow(
  ev: DotEvent,
  store: Store,
  setForm: (formEl: HTMLElement | null, row: HTMLElement | null) => void,
): HTMLElement {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'details-entry';
  row.title = UI_TEXT.edit;

  const text = document.createElement('span');
  text.className = 'entry-text';
  text.textContent = ev.short + (ev.full ? ' — ' + ev.full : '');

  const hint = document.createElement('span');
  hint.className = 'entry-edit-hint';
  hint.textContent = '✎';
  hint.setAttribute('aria-hidden', 'true');

  // Important entries carry a dot in the event color; routine ones carry none.
  if (ev.important) row.appendChild(importantDot());
  row.append(text, hint);

  row.addEventListener('click', () => {
    setForm(
      buildEntryForm({
        mode: 'edit',
        initial: ev,
        onSave: (draft) => {
          // The edit may move the event to another date — pulse where it landed.
          setScrollIntent({ type: 'mutation', ymd: draft.ymd });
          persist(store.updateEvent(ev.id, draft));
        },
        onCancel: () => setForm(null, null),
        onDelete: () => {
          if (!confirm(UI_TEXT.deleteConfirm)) return;
          setScrollIntent({ type: 'mutation', ymd: ev.ymd });
          persist(store.deleteEvent(ev.id));
        },
      }),
      row,
    );
  });

  return row;
}
