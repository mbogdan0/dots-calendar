import { UI_TEXT } from '../config/settings';

/** Shared button factory for the bottom bar, popovers, and forms. */
export function pill(text: string, extra = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = extra ? `pill ${extra}` : 'pill';
  b.textContent = text;
  return b;
}

/** Importance marker for entry rows (details panel, combined view). */
export function importantDot(): HTMLElement {
  const dot = document.createElement('span');
  dot.className = 'entry-dot';
  dot.title = UI_TEXT.important;
  return dot;
}
