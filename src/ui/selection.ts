type Listener = () => void;

/**
 * Multi-select state for day squares. Lives outside the Store on purpose: a
 * store field would remount the whole grid on every toggle. The DOM stays in
 * sync from both ends — clicks toggle the class directly, while rebuilt cells
 * (store remounts, lazy scroll) consult isSelected() at build time in
 * buildDayCell, the same pattern search uses with matchIds.
 */

const selected = new Set<string>();
let selectMode = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const fn of listeners) fn();
}

function stripClasses(): void {
  for (const el of document.querySelectorAll('.day.is-selected')) {
    el.classList.remove('is-selected');
  }
}

export function isSelectMode(): boolean {
  return selectMode;
}

/** Leaving select mode always discards the selection. */
export function setSelectMode(on: boolean): void {
  if (selectMode === on) return;
  selectMode = on;
  document.body.classList.toggle('is-select-mode', on);
  if (!on && selected.size > 0) {
    selected.clear();
    stripClasses();
  }
  emit();
}

export function toggleDay(cell: HTMLElement): void {
  const key = cell.dataset.ymd;
  if (!key) return;
  if (selected.has(key)) {
    selected.delete(key);
    cell.classList.remove('is-selected');
  } else {
    selected.add(key);
    cell.classList.add('is-selected');
  }
  emit();
}

export function isSelected(ymd: string): boolean {
  return selected.has(ymd);
}

export function selectionSize(): number {
  return selected.size;
}

/** Sorted ascending — lexicographic order is chronological for YYYY-MM-DD. */
export function selectedYmds(): string[] {
  return [...selected].sort();
}

/** Clear the selection but stay in select mode. */
export function clearSelection(): void {
  if (selected.size === 0) return;
  selected.clear();
  stripClasses();
  emit();
}

export function onSelectionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
