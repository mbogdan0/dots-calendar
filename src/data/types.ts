/** A single dated entry rendered on the grid. */
export interface DotEvent {
  /** Stable id (crypto.randomUUID) — enables edit/delete. */
  id: string;
  /** Local calendar day key, 'YYYY-MM-DD'. */
  ymd: string;
  /** Timestamp (ms) at noon of that day — used for sorting and relative time. */
  date: number;
  /** Name shown inside the cell, <= SHORT_MAX chars. */
  short: string;
  /** Description shown in the day panel, <= FULL_MAX chars. */
  full: string;
  /** true = важно, false = рутина. Feeds the filter only — never the square color. */
  important: boolean;
}

/**
 * Storage abstraction for events. Swapping the backend (REST, IndexedDB, …)
 * only requires another implementation wired up in data/index.ts.
 */
export interface DataSource {
  load(): Promise<DotEvent[]>;
  replaceAll(events: DotEvent[]): Promise<void>;
}
