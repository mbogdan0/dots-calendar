import type { Filter, RowWidth, ViewMode } from '../config/settings';
import type { DotEvent } from '../data/types';
import { groupByDay } from '../domain/events';
import type { AppState } from './view';

type Listener = () => void;

/**
 * Minimal observable store; any change triggers a full re-render. The store is
 * pure — persistence stays with the callers (see the CRUD helpers below).
 */
export class Store {
  private state: AppState;
  private readonly listeners = new Set<Listener>();

  constructor(init: { view: ViewMode; width: RowWidth; filter: Filter; events: DotEvent[] }) {
    this.state = {
      view: init.view,
      width: init.width,
      filter: init.filter,
      search: '',
      events: init.events,
      eventsByDay: groupByDay(init.events),
    };
  }

  get(): Readonly<AppState> {
    return this.state;
  }

  setView(view: ViewMode): void {
    if (this.state.view === view) return;
    this.state = { ...this.state, view };
    this.emit();
  }

  setWidth(width: RowWidth): void {
    if (this.state.width === width) return;
    this.state = { ...this.state, width };
    this.emit();
  }

  setFilter(filter: Filter): void {
    if (this.state.filter === filter) return;
    this.state = { ...this.state, filter };
    this.emit();
  }

  setSearch(query: string): void {
    const search = query.trim();
    if (this.state.search === search) return;
    this.state = { ...this.state, search };
    this.emit();
  }

  setEvents(events: DotEvent[]): void {
    this.state = { ...this.state, events, eventsByDay: groupByDay(events) };
    this.emit();
  }

  /**
   * CRUD helpers: array transform + setEvents only. Each returns the next
   * array so the caller can persist it (dataSource.replaceAll).
   */
  addEvent(ev: DotEvent): DotEvent[] {
    const next = [...this.state.events, ev];
    this.setEvents(next);
    return next;
  }

  updateEvent(id: string, patch: Partial<Omit<DotEvent, 'id'>>): DotEvent[] {
    const next = this.state.events.map((e) => (e.id === id ? { ...e, ...patch } : e));
    this.setEvents(next);
    return next;
  }

  deleteEvent(id: string): DotEvent[] {
    const next = this.state.events.filter((e) => e.id !== id);
    this.setEvents(next);
    return next;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
