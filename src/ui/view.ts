import type { Filter, RowWidth, ViewMode } from '../config/settings';
import type { DotEvent } from '../data/types';
import type { DateRange } from '../domain/events';

/** Shared, immutable view of the app state. */
export interface AppState {
  view: ViewMode;
  width: RowWidth;
  events: DotEvent[];
  eventsByDay: Map<string, DotEvent[]>;
  filter: Filter;
  /** Trimmed search query; '' means search is inactive. Never persisted. */
  search: string;
}

/** Derived input computed once per render and passed to the active renderer. */
export interface ViewInput {
  view: ViewMode;
  width: RowWidth;
  /** Grouped events after the importance filter (search: matches only). */
  eventsByDay: Map<string, DotEvent[]>;
  /** Explicit render range (normal or search-bounded). */
  range: DateRange;
  /** false during active search — bounded range, no lazy extension. */
  infinite: boolean;
  /** Ids of search-matched events, for the .is-match highlight. */
  matchIds?: Set<string>;
}

/** A rendered view (stream or months) the orchestrator can control.
 * Scrolling is owned by the orchestrator (render.ts + scroll.ts). */
export interface MountedView {
  destroy(): void;
}
