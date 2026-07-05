import type { DotEvent } from '../data/types';
import { colorFor, type ResolvedColors } from '../domain/colors';
import { fmtDMY, isWeekend, ymd } from '../domain/dateUtils';
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
  /** Longest visible line in chars — drives the width-aware font (--ln). */
  len: number;
}

/** Char count that treats an emoji/surrogate pair as one glyph. */
const glyphLen = (s: string): number => [...s].length;

/**
 * Cell text rule: 0=empty, 1=name, 2=two stacked names, 3+=primary name plus
 * a "+N" overflow line (an important event's name wins the visible slot).
 * Every variant carries a hidden fallback for cells too small for text —
 * `.li` (the name's first letter) for a single event, `.lc` (full count) for
 * several — revealed by container queries in style.css.
 */
export function makeCellLabel(evs: DotEvent[]): CellLabel {
  const count = evs.length;
  if (count === 0) return { html: '', two: false, plus: false, len: 0 };
  if (count === 1) {
    const short = evs[0].short;
    // Spread, not charAt: an emoji/surrogate-pair initial stays whole.
    const html =
      `<span class="l1">${esc(short)}</span>` + `<span class="li">${esc([...short][0] ?? '')}</span>`;
    return { html, two: false, plus: false, len: glyphLen(short) };
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
      len: Math.max(glyphLen(evs[0].short), glyphLen(evs[1].short)),
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
    len: Math.max(glyphLen(primary.short), 1 + String(count - 1).length),
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

  const { html, two, plus, len } = makeCellLabel(evs);

  const el = document.createElement('div');
  el.className = 'day';
  if (two) el.classList.add('is-two');
  if (plus) el.classList.add('is-plus');
  if (matchIds && evs.some((ev) => matchIds.has(ev.id))) el.classList.add('is-match');
  if (isSelected(key)) el.classList.add('is-selected');
  el.dataset.date = fmtDMY(date);
  el.dataset.ymd = key;
  el.dataset.ts = String(date.getTime());
  if (isToday) el.dataset.today = '1';
  el.style.background = colorFor(isToday, isEvent, isWeekend(date), isPast, colors);

  const span = document.createElement('span');
  if (html) {
    span.innerHTML = html;
    span.style.setProperty('--ln', String(Math.max(1, len)));
  }
  el.appendChild(span);
  return el;
}

export function buildEmptyCell(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'empty';
  return el;
}
