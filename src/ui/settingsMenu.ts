import {
  FILTER_LABELS,
  FILTER_OPTIONS,
  UI_TEXT,
  type Filter,
  type ViewMode,
} from '../config/settings';
import { dataSource } from '../data';
import { normalizeEvents } from '../data/LocalStorageDataSource';
import { pill } from './pill';
import { setScrollIntent } from './scrollIntent';
import type { Store } from './state';

/**
 * Settings (⚙) popover: view toggle, importance filter, Import/Export.
 * Visibility is controlled by the caller (controls.ts) via the `hidden` attr.
 */
export function createSettingsMenu(store: Store): HTMLElement {
  const el = document.createElement('div');
  el.className = 'popover settings-menu';
  el.hidden = true;

  // --- View toggle -----------------------------------------------------------
  const viewSeg = document.createElement('div');
  viewSeg.className = 'seg';
  const viewButtons: { mode: ViewMode; el: HTMLButtonElement }[] = [
    { mode: 'stream', el: pill(UI_TEXT.viewStream) },
    { mode: 'months', el: pill(UI_TEXT.viewMonths) },
  ];
  for (const vb of viewButtons) {
    vb.el.addEventListener('click', () => store.setView(vb.mode));
    viewSeg.appendChild(vb.el);
  }

  // --- Importance filter -----------------------------------------------------
  const filterSeg = document.createElement('div');
  filterSeg.className = 'seg';
  const filterButtons: { filter: Filter; el: HTMLButtonElement }[] = [];
  for (const f of FILTER_OPTIONS) {
    const btn = pill(FILTER_LABELS[f]);
    btn.addEventListener('click', () => store.setFilter(f));
    filterSeg.appendChild(btn);
    filterButtons.push({ filter: f, el: btn });
  }

  // --- Import / Export -------------------------------------------------------
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;

  const importBtn = pill(UI_TEXT.importLabel, 'ghost');
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    void (async () => {
      try {
        const events = normalizeEvents(JSON.parse(await file.text()));
        await dataSource.replaceAll(events);
        // A full data replacement invalidates any scroll anchor — restart on today.
        setScrollIntent({ type: 'initial' });
        store.setEvents(events);
      } catch {
        alert('Не удалось импортировать файл (ожидается JSON-массив событий).');
      }
    })();
  });

  const exportBtn = pill(UI_TEXT.exportLabel, 'ghost');
  exportBtn.addEventListener('click', () => {
    void (async () => {
      const events = await dataSource.load();
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dots-export.json';
      a.click();
      URL.revokeObjectURL(url);
    })();
  });

  const dataRow = document.createElement('div');
  dataRow.className = 'menu-row';
  dataRow.append(importBtn, exportBtn, fileInput);

  el.append(viewSeg, filterSeg, dataRow);

  function sync(): void {
    const s = store.get();
    for (const vb of viewButtons) vb.el.classList.toggle('is-active', vb.mode === s.view);
    for (const fb of filterButtons) fb.el.classList.toggle('is-active', fb.filter === s.filter);
  }
  store.subscribe(sync);
  sync();

  return el;
}
