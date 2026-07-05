import { SETTINGS, UI_TEXT, WIDTH_OPTIONS, type RowWidth } from '../config/settings';
import { dataSource } from '../data';
import type { DotEvent } from '../data/types';
import { applyCellSize, clampCellPx, fitCellPx } from './cellSize';
import { closeCombined, openCombined } from './combined';
import { popIn } from './effects';
import { buildEntryForm } from './entryForm';
import { pill } from './pill';
import { createSettingsMenu } from './settingsMenu';
import { loadPrefs, savePrefs } from './prefs';
import type { AppHandle } from './render';
import type { Anchor } from './scroll';
import {
  clearSelection,
  isSelectMode,
  onSelectionChange,
  selectionSize,
  setSelectMode,
} from './selection';
import { setScrollIntent } from './scrollIntent';
import type { Store } from './state';

/**
 * Bottom dock: always-visible bar (Size, Width, Search, Today, Add, ⚙) plus
 * the popovers anchored above it (Add form, Settings menu). Popovers close on
 * outside click and Esc.
 */
export function createControls(store: Store, app: AppHandle): HTMLElement {
  const dock = document.createElement('div');
  dock.className = 'dock';

  const panel = document.createElement('div');
  panel.className = 'panel';

  // --- Cell size slider (always visible) -------------------------------------
  // Bypasses the store entirely: each input tick only rewrites the --cell-max
  // CSS var (applyCellSize) and re-pins the anchored day, so dragging never
  // rebuilds the grid. The anchor is captured once per drag — captureAnchor
  // walks every row; restoreAnchor is a single lookup and cheap per tick.
  const sizeGroup = document.createElement('div');
  sizeGroup.className = 'group';
  const sizeLabel = document.createElement('span');
  sizeLabel.className = 'label';
  sizeLabel.textContent = UI_TEXT.sizeLabel;
  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.className = 'size-slider';
  sizeSlider.min = String(SETTINGS.LAYOUT.cellPxMin);
  sizeSlider.max = String(SETTINGS.LAYOUT.cellPxMax);
  sizeSlider.step = '1';
  sizeSlider.value = String(loadPrefs().cellPx);
  sizeSlider.setAttribute('aria-label', UI_TEXT.sizeLabel);
  let sizeAnchor: Anchor | null = null;
  sizeSlider.addEventListener('pointerdown', () => {
    sizeAnchor = app.captureViewportAnchor();
  });
  sizeSlider.addEventListener('input', () => {
    if (!sizeAnchor) sizeAnchor = app.captureViewportAnchor(); // keyboard path
    applyCellSize(sizeSlider.valueAsNumber, store.get().width);
    if (sizeAnchor) app.restoreViewportAnchor(sizeAnchor);
  });
  sizeSlider.addEventListener('change', () => {
    savePrefs({ cellPx: clampCellPx(sizeSlider.valueAsNumber) });
    sizeAnchor = null;
  });
  sizeGroup.append(sizeLabel, sizeSlider);

  // The slider's top end tracks the largest size that actually fits, so the
  // whole scale stays live (no dead zone where dragging changes nothing).
  // Changing `max` silently re-sanitizes `value` without an input event, so
  // the size is re-applied explicitly.
  function syncSliderMax(): void {
    const width = store.get().width;
    sizeSlider.max = String(clampCellPx(fitCellPx(width)));
    applyCellSize(sizeSlider.valueAsNumber, width);
  }
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(syncSliderMax);
  });

  // --- Width selector (always visible) --------------------------------------
  const widthGroup = document.createElement('div');
  widthGroup.className = 'group';
  const widthLabel = document.createElement('span');
  widthLabel.className = 'label';
  widthLabel.textContent = UI_TEXT.widthLabel;
  const widthSeg = document.createElement('div');
  widthSeg.className = 'seg';
  const widthButtons: { w: RowWidth; el: HTMLButtonElement }[] = [];
  for (const w of WIDTH_OPTIONS) {
    const el = pill(String(w));
    el.addEventListener('click', () => {
      setScrollIntent({ type: 'width' });
      store.setWidth(w);
    });
    widthSeg.appendChild(el);
    widthButtons.push({ w, el });
  }
  widthGroup.append(widthLabel, widthSeg);

  // --- Search ----------------------------------------------------------------
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'search-input';
  searchInput.placeholder = UI_TEXT.searchPlaceholder;
  let searchTimer = 0;
  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(
      () => store.setSearch(searchInput.value),
      SETTINGS.searchDebounceMs,
    );
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.clearTimeout(searchTimer);
      searchInput.value = '';
      store.setSearch('');
    }
  });

  // --- Today (clears an active search first) ---------------------------------
  const todayBtn = pill(UI_TEXT.today, 'ghost');
  todayBtn.addEventListener('click', () => {
    if (store.get().search) {
      window.clearTimeout(searchTimer);
      searchInput.value = '';
      setScrollIntent({ type: 'today' });
      store.setSearch('');
    } else {
      app.scrollToToday();
    }
  });

  // --- Add + Settings popovers ------------------------------------------------
  const addPop = document.createElement('div');
  addPop.className = 'popover';
  addPop.hidden = true;

  const settingsMenu = createSettingsMenu(store);

  function closePopovers(): void {
    addPop.hidden = true;
    addPop.replaceChildren();
    settingsMenu.hidden = true;
  }

  const addBtn = pill(UI_TEXT.addLabel, 'ghost');
  addBtn.addEventListener('click', () => {
    const wasHidden = addPop.hidden;
    closePopovers();
    if (!wasHidden) return;
    // A fresh form each time: today's date, empty fields.
    addPop.appendChild(
      buildEntryForm({
        mode: 'add',
        onSave: (draft) => {
          const ev: DotEvent = { id: crypto.randomUUID(), ...draft };
          setScrollIntent({ type: 'mutation', ymd: draft.ymd });
          void dataSource.replaceAll(store.addEvent(ev));
          closePopovers();
        },
        onCancel: closePopovers,
      }),
    );
    addPop.hidden = false;
    popIn(addPop);
  });

  const settingsBtn = pill('⚙', 'ghost');
  settingsBtn.setAttribute('aria-label', UI_TEXT.settings);
  settingsBtn.title = UI_TEXT.settings;
  settingsBtn.addEventListener('click', () => {
    const wasHidden = settingsMenu.hidden;
    closePopovers();
    settingsMenu.hidden = !wasHidden;
    if (wasHidden) popIn(settingsMenu);
  });

  // --- Day selection (select toggle + combine/reset while ≥1 day picked) ------
  const selectBtn = pill(UI_TEXT.selectLabel, 'ghost');
  selectBtn.addEventListener('click', () => {
    closePopovers();
    setSelectMode(!isSelectMode());
  });

  const combineBtn = pill(UI_TEXT.combineLabel, 'is-primary');
  combineBtn.addEventListener('click', () => openCombined(store));

  const resetBtn = pill(UI_TEXT.resetLabel, 'ghost');
  resetBtn.addEventListener('click', () => clearSelection());

  function syncSelection(): void {
    const n = selectionSize();
    const on = isSelectMode();
    // Active select mode must be unmissable: the pill turns the selection
    // accent (same blue as the day outlines) and gains a ✕ to exit.
    selectBtn.classList.toggle('is-select-on', on);
    selectBtn.textContent = on ? UI_TEXT.selectActiveLabel : UI_TEXT.selectLabel;
    combineBtn.textContent = `${UI_TEXT.combineLabel}${n > 1 ? ` ${n}` : ''}`;
    combineBtn.hidden = resetBtn.hidden = !(on && n >= 1);
  }
  onSelectionChange(syncSelection);
  syncSelection();

  document.addEventListener('click', (e) => {
    if (!dock.contains(e.target as Node)) closePopovers();
  });
  // Esc precedence, single owner: combined modal → select mode → popovers.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (closeCombined()) return;
    if (isSelectMode()) {
      setSelectMode(false);
      closePopovers();
      return;
    }
    closePopovers();
  });

  panel.append(
    sizeGroup,
    widthGroup,
    searchInput,
    todayBtn,
    addBtn,
    settingsBtn,
    selectBtn,
    combineBtn,
    resetBtn,
  );
  dock.append(addPop, settingsMenu, panel);

  function sync(): void {
    const s = store.get();
    for (const wb of widthButtons) wb.el.classList.toggle('is-active', wb.w === s.width);
    syncSliderMax();
  }
  store.subscribe(sync);
  sync();

  return dock;
}
