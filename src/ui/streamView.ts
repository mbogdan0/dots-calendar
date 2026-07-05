import { MONTHS_RU_SHORT, SETTINGS } from '../config/settings';
import { resolveColors } from '../domain/colors';
import { addDays, setNoon, startOfWeek, ymd } from '../domain/dateUtils';
import { buildDayCell } from './cell';
import { InfiniteScroll } from './infiniteScroll';
import type { MountedView, ViewInput } from './view';

/**
 * Continuous, Monday-aligned grid. Each row holds `width` consecutive days; the
 * left gutter shows the month name on the row that contains the 1st of a month.
 */
export function createStreamView(grid: HTMLElement, input: ViewInput): MountedView {
  const { width, eventsByDay, range, infinite, matchIds } = input;
  const colors = resolveColors();
  const todayKey = ymd(setNoon(new Date()));
  const stride = width; // days advanced per row

  const columns = `var(--gutter-w) repeat(${width}, minmax(0, 1fr))`;

  function buildRow(rowStart: Date): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gridTemplateColumns = columns;

    const gutter = document.createElement('div');
    gutter.className = 'gutter';
    for (let i = 0; i < width; i++) {
      const d = addDays(rowStart, i);
      if (d.getDate() === 1) {
        // Child span, not textContent: cq font units resolve against the
        // nearest ancestor container (the gutter itself), so the text must
        // live one level below it.
        const label = document.createElement('span');
        label.textContent =
          MONTHS_RU_SHORT[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2);
        gutter.appendChild(label);
        gutter.classList.add('has-label');
        break;
      }
    }
    row.appendChild(gutter);

    for (let i = 0; i < width; i++) {
      row.appendChild(
        buildDayCell(setNoon(addDays(rowStart, i)), todayKey, eventsByDay, colors, matchIds),
      );
    }
    return row;
  }

  // Initial fill: from the Monday at/before range.start to the row covering range.end.
  let firstStart = startOfWeek(range.start);
  let lastStart = firstStart;
  const endStart = startOfWeek(range.end);

  const initial = document.createDocumentFragment();
  for (let s = firstStart; s.getTime() <= endStart.getTime(); s = addDays(s, stride)) {
    initial.appendChild(buildRow(s));
    lastStart = s;
  }
  grid.appendChild(initial);

  // Bounded (search) mode: render exactly the given range, no lazy extension.
  if (!infinite) {
    return { destroy: () => {} };
  }

  const scroller = new InfiniteScroll(grid);

  scroller.onTop = () => {
    const newFirst = addDays(firstStart, -stride * SETTINGS.extendChunkRows);
    const frag = document.createDocumentFragment();
    for (let s = newFirst; s.getTime() < firstStart.getTime(); s = addDays(s, stride)) {
      frag.appendChild(buildRow(s));
    }
    firstStart = newFirst;
    scroller.insertTopPreservingScroll(frag);
  };

  scroller.onBottom = () => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < SETTINGS.extendChunkRows; i++) {
      lastStart = addDays(lastStart, stride);
      frag.appendChild(buildRow(lastStart));
    }
    scroller.insertBottom(frag);
  };

  return { destroy: () => scroller.destroy() };
}
