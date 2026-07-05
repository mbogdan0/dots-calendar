import { SETTINGS } from '../config/settings';

/**
 * Cell size lives outside the Store on purpose: it is pure presentation.
 * Applying it only touches :root CSS custom properties — the grid max-width
 * (a calc() over --cell-max, see render.ts) and every container-query-driven
 * font react natively, so dragging the size slider never rebuilds the DOM.
 *
 * The vars are always set from the EFFECTIVE cell size — min(slider, what
 * fits the window). Deriving the gutter from the raw slider value would let
 * it keep growing after the cells hit the window-width plateau, shrinking
 * them and clipping the gutter labels.
 */

export function clampCellPx(px: number): number {
  const { cellPxMin, cellPxMax } = SETTINGS.LAYOUT;
  return Math.round(Math.min(cellPxMax, Math.max(cellPxMin, px)));
}

function gutterFor(cellPx: number): number {
  const { gutterMinPx, gutterMaxPx, gutterRatio } = SETTINGS.LAYOUT;
  return Math.round(Math.min(gutterMaxPx, Math.max(gutterMinPx, cellPx * gutterRatio)));
}

/**
 * Largest cell size whose grid max-width — gutter(c) + w·c + (w+1)·gap, the
 * exact formula render.ts uses — fits the #app content width. total(c) is
 * strictly increasing, so exactly one gutter branch (min / ratio / max) is
 * consistent; try them top-down.
 */
export function fitCellPx(rowWidth: number): number {
  const { gapPx, gutterMinPx, gutterMaxPx, gutterRatio, cellPxMin } = SETTINGS.LAYOUT;
  const avail = document.getElementById('app')?.clientWidth ?? 0;
  if (avail <= 0) return SETTINGS.LAYOUT.cellPxMax;
  const rest = avail - (rowWidth + 1) * gapPx;

  let c = (rest - gutterMaxPx) / rowWidth;
  if (c < gutterMaxPx / gutterRatio) {
    c = rest / (rowWidth + gutterRatio);
    if (c < gutterMinPx / gutterRatio) c = (rest - gutterMinPx) / rowWidth;
  }
  return Math.max(cellPxMin, Math.floor(c));
}

export function applyCellSize(sliderPx: number, rowWidth: number): void {
  const cell = Math.min(clampCellPx(sliderPx), fitCellPx(rowWidth));
  const root = document.documentElement;
  root.style.setProperty('--cell-max', `${cell}px`);
  root.style.setProperty('--gutter-w', `${gutterFor(cell)}px`);
}
