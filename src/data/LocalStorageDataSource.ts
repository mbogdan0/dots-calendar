import { FULL_MAX, SETTINGS, SHORT_MAX } from '../config/settings';
import { createSeed } from './seed';
import type { DataSource, DotEvent } from './types';

/** localStorage-backed implementation of {@link DataSource}. */
export class LocalStorageDataSource implements DataSource {
  private readonly key: string;

  constructor(key: string = SETTINGS.storageKey) {
    this.key = key;
  }

  async load(): Promise<DotEvent[]> {
    const raw = this.read();
    if (raw === null) {
      const seed = createSeed();
      this.write(seed);
      return seed;
    }
    try {
      return normalizeEvents(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async replaceAll(events: DotEvent[]): Promise<void> {
    this.write(normalizeEvents(events));
  }

  private read(): string | null {
    try {
      return localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  private write(events: DotEvent[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(events));
    } catch {
      /* storage full / unavailable — ignore, in-memory state still works */
    }
  }
}

/** Coerce arbitrary parsed JSON into a clean DotEvent[] (used for import too). */
export function normalizeEvents(value: unknown): DotEvent[] {
  if (!Array.isArray(value)) return [];
  const out: DotEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.ymd === 'string' ? o.ymd : '';
    const date = typeof o.date === 'number' ? o.date : Date.parse(key + 'T12:00:00');
    if (!key || Number.isNaN(date)) continue;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
      ymd: key,
      date,
      short: (typeof o.short === 'string' ? o.short : '').slice(0, SHORT_MAX),
      full: (typeof o.full === 'string' ? o.full : '').slice(0, FULL_MAX),
      important: Boolean(o.important),
    });
  }
  return out;
}
