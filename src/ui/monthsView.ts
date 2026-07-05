import { MONTHS_RU, SETTINGS } from '../config/settings';
import { resolveColors } from '../domain/colors';
import { mondayIndex, setNoon, ymd } from '../domain/dateUtils';
import { buildDayCell, buildEmptyCell } from './cell';
import { InfiniteScroll } from './infiniteScroll';
import type { MountedView, ViewInput } from './view';

interface YM {
  y: number;
  m: number;
}

const nextMonth = ({ y, m }: YM): YM => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
const prevMonth = ({ y, m }: YM): YM => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
const cmp = (a: YM, b: YM): number => (a.y !== b.y ? a.y - b.y : a.m - b.m);

/**
 * Month-separated blocks: a month header followed by Monday-aligned day rows with
 * leading offset padding. Rows share the same gutter+columns layout as the stream
 * view, so day squares stay the same size across both views.
 */
export function createMonthsView(grid: HTMLElement, input: ViewInput): MountedView {
  const { width, eventsByDay, range, infinite, matchIds } = input;
  const colors = resolveColors();
  const todayKey = ymd(setNoon(new Date()));

  const columns = `var(--gutter-w) repeat(${width}, minmax(0, 1fr))`;

  function newRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gridTemplateColumns = columns;
    const gutter = document.createElement('div');
    gutter.className = 'gutter';
    row.appendChild(gutter);
    return row;
  }

  function appendMonth(target: DocumentFragment, year: number, month: number): void {
    const label = document.createElement('div');
    label.className = 'monthLabel';
    label.textContent = MONTHS_RU[month] + ' ' + year;
    target.appendChild(label);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = mondayIndex(setNoon(new Date(year, month, 1)));

    let row = newRow();
    let inRow = 0;
    for (let i = 0; i < lead; i++) {
      row.appendChild(buildEmptyCell());
      inRow++;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      if (inRow === width) {
        target.appendChild(row);
        row = newRow();
        inRow = 0;
      }
      row.appendChild(
        buildDayCell(setNoon(new Date(year, month, day)), todayKey, eventsByDay, colors, matchIds),
      );
      inRow++;
    }
    target.appendChild(row);
  }

  let firstMonth: YM = { y: range.start.getFullYear(), m: range.start.getMonth() };
  let lastMonth: YM = { y: range.end.getFullYear(), m: range.end.getMonth() };

  const initial = document.createDocumentFragment();
  for (let cur = firstMonth; cmp(cur, lastMonth) <= 0; cur = nextMonth(cur)) {
    appendMonth(initial, cur.y, cur.m);
  }
  grid.appendChild(initial);

  // Bounded (search) mode: render exactly the given range, no lazy extension.
  if (!infinite) {
    return { destroy: () => {} };
  }

  const scroller = new InfiniteScroll(grid);

  scroller.onTop = () => {
    const months: YM[] = [];
    let cur = firstMonth;
    for (let i = 0; i < SETTINGS.extendChunkMonths; i++) {
      cur = prevMonth(cur);
      months.push(cur);
    }
    firstMonth = cur;
    months.reverse(); // oldest first so the prepended block reads top-to-bottom
    const frag = document.createDocumentFragment();
    for (const mo of months) appendMonth(frag, mo.y, mo.m);
    scroller.insertTopPreservingScroll(frag);
  };

  scroller.onBottom = () => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < SETTINGS.extendChunkMonths; i++) {
      lastMonth = nextMonth(lastMonth);
      appendMonth(frag, lastMonth.y, lastMonth.m);
    }
    scroller.insertBottom(frag);
  };

  return { destroy: () => scroller.destroy() };
}
