export type ViewMode = 'stream' | 'months';
export type RowWidth = 7 | 14 | 21 | 28;
export type Filter = 'all' | 'important' | 'routine';

export const WIDTH_OPTIONS: readonly RowWidth[] = [7, 14, 21, 28];
export const FILTER_OPTIONS: readonly Filter[] = ['all', 'important', 'routine'];

/** Max length of an entry name (shown on the square). */
export const SHORT_MAX = 4;
/** Max length of an entry description. */
export const FULL_MAX = 64;

export const SETTINGS = {
  /** localStorage key for the event data. v2 = new model; old v1 data is discarded. */
  storageKey: 'dots.events.v2',
  /** localStorage key for view/width/filter preferences. */
  prefsKey: 'dots.prefs.v1',

  initialView: 'stream' as ViewMode,
  initialWidth: 7 as RowWidth,
  initialFilter: 'all' as Filter,

  /** Padding (days) added around the event range when seeding the initial render. */
  eventsPaddingDays: 7,
  /** When no events exist, render today ± this many days as a starting seed. */
  fallbackRangeDays: 30,
  /** Padding (days) around the first/last search match in the bounded search view. */
  searchPadDays: 7,
  /** Debounce (ms) for the search input before the store is updated. */
  searchDebounceMs: 220,

  /** Rows added per lazy extend in the stream view. */
  extendChunkRows: 20,
  /** Months added per lazy extend in the months view. */
  extendChunkMonths: 4,
  /** Pre-load distance for the scroll sentinels. */
  sentinelMarginPx: 600,

  SCROLL: {
    /** Shortest/longest allowed scroll animation. */
    minDurationMs: 190,
    maxDurationMs: 600,
    /** Animation speed used to derive duration from distance. */
    pxPerMs: 3,
    /** Distances beyond this many viewport heights teleport most of the way. */
    teleportThresholdVh: 2.5,
    /** How far (in viewport heights) from the target the teleport lands. */
    teleportLandingVh: 1.2,
    /** Viewport height fraction where a targeted day is placed (0.5 = center). */
    todayViewportFraction: 0.5,
  },

  POPOVER: {
    /** Minimal gap between the popover and the viewport edges. */
    viewportMarginPx: 12,
    /** Gap between the popover and its anchor cell. */
    anchorGapPx: 8,
    /** Space kept clear above the bottom dock when placing below. */
    dockClearancePx: 64,
  },

  LAYOUT: {
    /** Slider range for the max edge length of a day square; wider modes
     * shrink below the chosen cap to fit. Label density reacts to the actual
     * cell size via two breakpoints living in style.css as literals
     * (@container conditions cannot read CSS vars): 40px collapses stacked
     * labels, 28px switches to initial-letter/count-only. */
    cellPxMin: 22,
    cellPxMax: 120,
    cellPxDefault: 88,
    /** Gap between cells and between rows. */
    gapPx: 3,
    /** The left gutter (side month labels) scales with the cell size:
     * clamp(gutterMinPx, cellPx * gutterRatio, gutterMaxPx). Sized so the
     * ~3.3em "июн 26" label at its width-capped font (28cqw, style.css)
     * uses ≤90% of the gutter content box — clipping-proof by construction. */
    gutterMinPx: 44,
    gutterMaxPx: 88,
    gutterRatio: 0.85,
    /** At or below this effective cell size the root gets .cells-s: rows turn
     * into content-visibility islands and per-cell chrome (shadow, border,
     * hover zoom) is dropped — it is invisible at this scale but dominates
     * layout/paint cost when thousands of squares are on screen. Matches the
     * 40px label-density breakpoint above. */
    smallCellPx: 40,
  },
} as const;

export const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
] as const;

export const MONTHS_RU_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const;

/** Genitive month names for full dates ("14 марта 2026"). */
export const MONTHS_RU_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

/** Weekday names indexed by Date#getDay() (Sunday first). */
export const WEEKDAYS_RU = [
  'воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота',
] as const;

export const UI_TEXT = {
  noEventsText: 'Нет событий',
  today: 'Сегодня',
  viewStream: 'Лента',
  viewMonths: 'С месяцами',
  widthLabel: 'Ширина',
  sizeLabel: 'Размер',
  importLabel: 'Импорт',
  exportLabel: 'Экспорт',

  selectLabel: 'Выбрать',
  /** Shown on the same pill while select mode is on: the cross signals that
   * the next click exits the mode. */
  selectActiveLabel: '✕ Выбор',
  // "Сравнить", not "Объединить": the modal merges nothing — it lays the
  // selected days side by side with the elapsed span between them.
  combineLabel: 'Сравнить',
  resetLabel: 'Сбросить',
  gapPrefix: 'спустя',

  addLabel: 'Добавить',
  save: 'Сохранить',
  cancel: 'Отмена',
  delete: 'Удалить',
  edit: 'Изменить',
  settings: 'Настройки',
  searchPlaceholder: 'Поиск',
  filterAll: 'Все',
  filterImportant: 'Важные',
  filterRoutine: 'Рутина',
  important: 'Важно',
  routine: 'Рутина',
  fieldName: 'Название',
  fieldDescription: 'Описание',
  fieldDate: 'Дата',
  formTitleAdd: 'Новая запись',
  formTitleEdit: 'Редактирование',
  deleteEntry: 'Удалить запись',
  searchEmpty: 'Ничего не найдено',
  deleteConfirm: 'Удалить запись?',
} as const;

export const FILTER_LABELS: Record<Filter, string> = {
  all: UI_TEXT.filterAll,
  important: UI_TEXT.filterImportant,
  routine: UI_TEXT.filterRoutine,
};
