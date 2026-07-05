/** Shared button factory for the bottom bar, popovers, and forms. */
export function pill(text: string, extra = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = extra ? `pill ${extra}` : 'pill';
  b.textContent = text;
  return b;
}
