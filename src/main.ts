import './styles/style.css';
import { SETTINGS } from './config/settings';
import { applyTheme } from './config/theme';
import { dataSource } from './data';
import { applyCellSize } from './ui/cellSize';
import { createControls } from './ui/controls';
import { attachDetails } from './ui/details';
import { loadPrefs, savePrefs } from './ui/prefs';
import { createApp } from './ui/render';
import { Store } from './ui/state';

function applyLayoutVars(): void {
  // --gutter-w and --cell-max are owned by applyCellSize (ui/cellSize.ts).
  document.documentElement.style.setProperty('--grid-gap', `${SETTINGS.LAYOUT.gapPx}px`);
}

async function main(): Promise<void> {
  applyTheme();
  applyLayoutVars();

  const prefs = loadPrefs();
  const events = await dataSource.load();
  const store = new Store({ view: prefs.view, width: prefs.width, filter: prefs.filter, events });

  const app = document.getElementById('app');
  if (!app) return;

  applyCellSize(prefs.cellPx, prefs.width);
  attachDetails(app, store);
  const handle = createApp(app, store);
  // createControls re-syncs the size once more (syncSliderMax), absorbing any
  // classic-scrollbar width that appeared when the grid content mounted.
  app.appendChild(createControls(store, handle));

  store.subscribe(() => {
    const s = store.get();
    savePrefs({ view: s.view, width: s.width, filter: s.filter }); // search is transient
  });
}

void main();
