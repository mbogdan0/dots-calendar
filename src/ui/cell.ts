import type { DotEvent } from '../data/types';
import { colorFor, type ResolvedColors } from '../domain/colors';
import { isWeekend, ymd } from '../domain/dateUtils';
import { isSelected } from './selection';

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface CellLabel {
  html: string;
  two: boolean;
  plus: boolean;
  /** Widest visible line in em — drives the width-aware font (--wf). */
  em: number;
}

/**
 * Measured text width in em at the label font (body stack, weight 500), so the
 * CSS fit formula sizes for the actual glyphs — "Wow" gets a smaller font than
 * "ill" instead of an ellipsis. Cached per string: names are ≤ SHORT_MAX chars
 * and mostly repeat, so the cache stays tiny.
 */
const emCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

function emWidth(s: string): number {
  const hit = emCache.get(s);
  if (hit !== undefined) return hit;
  if (measureCtx === undefined) {
    measureCtx = document.createElement('canvas').getContext('2d');
    if (measureCtx) {
      measureCtx.font = '500 100px -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    }
  }
  // No-canvas fallback: the old average-width heuristic (~0.63em per glyph).
  // Layout adds 0.01em letter-spacing per glyph (style.css .day > span) that
  // measureText does not see — without it a snug label overflows a few px,
  // and an overflowing centered line clips end-only, looking off-center.
  const glyphs = [...s].length;
  const em = (measureCtx ? measureCtx.measureText(s).width / 100 : glyphs * 0.63) + glyphs * 0.01;
  emCache.set(s, em);
  return em;
}

/**
 * Cell text rule: 0=empty, 1=name, 2=two stacked names, 3+=primary name plus
 * a "+N" overflow line (an important event's name wins the visible slot).
 * Every variant carries a hidden fallback for cells too small for text —
 * `.li` (the name's first letter) for a single event, `.lc` (full count) for
 * several — revealed by container queries in style.css.
 */
export function makeCellLabel(evs: DotEvent[]): CellLabel {
  const count = evs.length;
  if (count === 0) return { html: '', two: false, plus: false, em: 0 };
  if (count === 1) {
    const short = evs[0].short;
    // Spread, not charAt: an emoji/surrogate-pair initial stays whole.
    const html =
      `<span class="l1">${esc(short)}</span>` + `<span class="li">${esc([...short][0] ?? '')}</span>`;
    return { html, two: false, plus: false, em: emWidth(short) };
  }
  if (count === 2) {
    const html =
      `<span class="l1">${esc(evs[0].short)}</span>` +
      `<span class="l2">${esc(evs[1].short)}</span>` +
      `<span class="lc">2</span>`;
    return {
      html,
      two: true,
      plus: false,
      em: Math.max(emWidth(evs[0].short), emWidth(evs[1].short)),
    };
  }
  const primary = evs.find((ev) => ev.important) ?? evs[0];
  const html =
    `<span class="l1">${esc(primary.short)}</span>` +
    `<span class="l2">+${count - 1}</span>` +
    `<span class="lc">${count}</span>`;
  return {
    html,
    two: true,
    plus: true,
    // The +N line renders at 0.85em (.is-plus .l2) — scale before comparing.
    em: Math.max(emWidth(primary.short), emWidth(`+${count - 1}`) * 0.85),
  };
}

/** Build a single colored day square with datasets used by clicks & today-scroll. */
export function buildDayCell(
  date: Date,
  todayKey: string,
  eventsByDay: Map<string, DotEvent[]>,
  colors: ResolvedColors,
  matchIds?: Set<string>,
): HTMLElement {
  const key = ymd(date);
  const evs = eventsByDay.get(key) ?? [];
  const isToday = key === todayKey;
  const isPast = key < todayKey; // lexicographic compare is valid for YYYY-MM-DD
  const isEvent = evs.length > 0;

  const { html, two, plus, em } = makeCellLabel(evs);

  const el = document.createElement('div');
  el.className = 'day';
  if (two) el.classList.add('is-two');
  if (plus) el.classList.add('is-plus');
  if (matchIds && evs.some((ev) => matchIds.has(ev.id))) el.classList.add('is-match');
  if (isSelected(key)) el.classList.add('is-selected');
  el.dataset.ymd = key;
  el.dataset.ts = String(date.getTime());
  if (isToday) el.dataset.today = '1';
  el.style.background = colorFor(isToday, isEvent, isWeekend(date), isPast, colors);

  const span = document.createElement('span');
  if (html) {
    span.innerHTML = html;
    span.style.setProperty('--wf', Math.max(0.5, em).toFixed(3));
  }
  el.appendChild(span);
  return el;
}

export function buildEmptyCell(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'empty';
  return el;
}
