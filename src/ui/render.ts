import { SETTINGS, UI_TEXT } from '../config/settings';
import { DAY_MS, setNoon } from '../domain/dateUtils';
import { groupByDay, initialRange } from '../domain/events';
import { createMonthsView } from './monthsView';
import { applyScrollIntent, captureAnchor, goToToday, restoreAnchor, type Anchor } from './scroll';
import { takeScrollIntent } from './scrollIntent';
import type { Store } from './state';
import { createStreamView } from './streamView';
import type { AppState, MountedView, ViewInput } from './view';

export interface AppHandle {
  scrollToToday(): void;
  /** Anchor capture/restore around live cell resizes (size slider). */
  captureViewportAnchor(): Anchor | null;
  restoreViewportAnchor(anchor: Anchor): void;
}

/**
 * Derive the render input from raw state: importance filter → optional
 * search-bounded range → grouped events. During an active search only the
 * matched events stay on the grid (non-matches are hidden, not just
 * de-emphasized). Returns null when an active search has no matches (the
 * caller renders the empty-state message).
 */
function computeViewInput(state: Readonly<AppState>): ViewInput | null {
  const visible =
    state.filter === 'all'
      ? state.events
      : state.events.filter((e) => e.important === (state.filter === 'important'));

  if (state.search) {
    const q = state.search.toLowerCase();
    const matches = visible.filter(
      (e) => e.short.toLowerCase().includes(q) || e.full.toLowerCase().includes(q),
    );
    if (matches.length === 0) return null;

    let min = matches[0].date;
    let max = matches[0].date;
    for (const m of matches) {
      if (m.date < min) min = m.date;
      if (m.date > max) max = m.date;
    }
    const pad = SETTINGS.searchPadDays * DAY_MS;
    return {
      view: state.view,
      width: state.width,
      eventsByDay: groupByDay(matches),
      range: { start: setNoon(new Date(min - pad)), end: setNoon(new Date(max + pad)) },
      infinite: false,
      matchIds: new Set(matches.map((m) => m.id)),
    };
  }

  return {
    view: state.view,
    width: state.width,
    eventsByDay: groupByDay(visible),
    range: initialRange(visible),
    infinite: true,
  };
}

/**
 * Owns the scrollable grid element and swaps the active view (stream/months)
 * whenever the store changes. Post-rebuild scrolling is intent-driven: the
 * action that caused the rebuild decides whether the viewport is preserved,
 * anchored, or travels to a specific day (see scrollIntent.ts / scroll.ts).
 */
export function createApp(root: HTMLElement, store: Store): AppHandle {
  const grid = document.createElement('div');
  grid.className = 'grid';
  root.appendChild(grid);

  let mounted: MountedView | null = null;

  function applyWidthSizing(): void {
    const w = store.get().width;
    // var()-based so a --cell-max change (size slider) re-lays-out the grid
    // with zero JS involvement.
    grid.style.maxWidth = `calc(var(--gutter-w) + ${w} * var(--cell-max) + ${w + 1} * var(--grid-gap))`;
  }

  function mount(): void {
    // Consume the intent on every branch so a stale one never leaks.
    const intent = takeScrollIntent();
    const needsAnchor =
      intent.type === 'width' || intent.type === 'preserve' || intent.type === 'mutation';
    // Measure before teardown: the anchor day must be located in the old DOM.
    const anchor: Anchor | null = needsAnchor ? captureAnchor(grid) : null;

    mounted?.destroy();
    mounted = null;
    grid.replaceChildren();
    applyWidthSizing();

    const input = computeViewInput(store.get());
    if (!input) {
      const msg = document.createElement('div');
      msg.className = 'empty-state';
      msg.textContent = UI_TEXT.searchEmpty;
      grid.appendChild(msg);
      window.scrollTo({ top: 0 });
      return;
    }

    mounted =
      input.view === 'months' ? createMonthsView(grid, input) : createStreamView(grid, input);

    if (input.infinite) applyScrollIntent(intent, anchor, grid);
    else window.scrollTo({ top: 0 });
  }

  store.subscribe(mount);
  mount();

  return {
    scrollToToday: () => goToToday(grid),
    captureViewportAnchor: () => captureAnchor(grid),
    restoreViewportAnchor: (anchor) => {
      restoreAnchor(grid, anchor);
    },
  };
}
