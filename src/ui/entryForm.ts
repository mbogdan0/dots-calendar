import { FULL_MAX, SHORT_MAX, UI_TEXT } from '../config/settings';
import { setNoon, ymd } from '../domain/dateUtils';
import { pill } from './pill';

/** Validated form output — everything needed to build/patch a DotEvent except id. */
export interface EntryDraft {
  short: string;
  full: string;
  ymd: string;
  date: number;
  important: boolean;
}

export interface EntryFormOptions {
  /** Drives the form title (Новая запись / Редактирование). */
  mode: 'add' | 'edit';
  initial?: { short?: string; full?: string; ymd?: string; important?: boolean };
  onSave(draft: EntryDraft): void;
  onCancel(): void;
  /** Edit mode only: adds the destructive "Удалить запись" action. */
  onDelete?(): void;
}

/**
 * One reusable add/edit form, used by the bottom Add popover and the day panel.
 * Visually color-coded with --form-accent so it reads as a distinct editing
 * surface. Enforces the same caps as normalizeEvents (SHORT_MAX / FULL_MAX).
 */
export function buildEntryForm(opts: EntryFormOptions): HTMLFormElement {
  const form = document.createElement('form');
  form.className = 'entry-form';

  const title = document.createElement('div');
  title.className = 'form-title';
  title.textContent = opts.mode === 'edit' ? UI_TEXT.formTitleEdit : UI_TEXT.formTitleAdd;
  form.appendChild(title);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = SHORT_MAX;
  nameInput.value = opts.initial?.short ?? '';

  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.maxLength = FULL_MAX;
  descInput.value = opts.initial?.full ?? '';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = opts.initial?.ymd ?? ymd(setNoon(new Date()));

  // Name is ≤ 4 chars, so it shares a row with the date to keep the form short.
  const topRow = document.createElement('div');
  topRow.className = 'form-row';
  topRow.append(
    field(UI_TEXT.fieldName, nameInput, 'field-name'),
    field(UI_TEXT.fieldDate, dateInput, 'field-date'),
  );
  form.append(topRow, field(UI_TEXT.fieldDescription, descInput));

  // Importance: two-option toggle Важно / Рутина.
  let important = opts.initial?.important ?? false;
  const impSeg = document.createElement('div');
  impSeg.className = 'seg';
  const impButtons: { value: boolean; el: HTMLButtonElement }[] = [
    { value: true, el: pill(UI_TEXT.important) },
    { value: false, el: pill(UI_TEXT.routine) },
  ];
  function syncImportance(): void {
    for (const b of impButtons) b.el.classList.toggle('is-active', b.value === important);
  }
  for (const b of impButtons) {
    b.el.addEventListener('click', () => {
      important = b.value;
      syncImportance();
    });
    impSeg.appendChild(b.el);
  }
  syncImportance();

  const footer = document.createElement('div');
  footer.className = 'form-footer';
  footer.appendChild(impSeg);

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const cancelBtn = pill(UI_TEXT.cancel, 'ghost');
  cancelBtn.addEventListener('click', () => opts.onCancel());
  const saveBtn = pill(UI_TEXT.save);
  saveBtn.type = 'submit';
  saveBtn.classList.add('is-primary');
  actions.append(cancelBtn, saveBtn);
  footer.appendChild(actions);
  form.appendChild(footer);

  // Destructive action lives alone on its own line, styled apart from Save/Cancel.
  if (opts.onDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'form-danger';
    deleteBtn.textContent = UI_TEXT.deleteEntry;
    deleteBtn.addEventListener('click', () => opts.onDelete?.());
    form.appendChild(deleteBtn);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const short = nameInput.value.trim().slice(0, SHORT_MAX);
    if (!short) {
      nameInput.focus();
      return;
    }
    const ts = Date.parse(dateInput.value + 'T12:00:00');
    if (!dateInput.value || Number.isNaN(ts)) {
      dateInput.focus();
      return;
    }
    opts.onSave({
      short,
      full: descInput.value.trim().slice(0, FULL_MAX),
      ymd: ymd(new Date(ts)),
      date: ts,
      important,
    });
  });

  // Focus the name field once the caller has attached the form to the DOM.
  // preventScroll: the form may sit in a popover partially past the viewport
  // edge — focusing must not fight the app's own scroll positioning.
  requestAnimationFrame(() => nameInput.focus({ preventScroll: true }));

  return form;
}

function field(label: string, input: HTMLInputElement, extra = ''): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.className = extra ? `field ${extra}` : 'field';
  const caption = document.createElement('span');
  caption.textContent = label;
  wrap.append(caption, input);
  return wrap;
}
