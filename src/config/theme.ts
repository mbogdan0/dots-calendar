// Visual theme — ported verbatim from old.js so colors/design stay identical.
export const THEME = {
  bg: '#fdf0d5',
  weekday: '#dda15e',
  weekend: '#bc6c25',
  event: '#c1121f',
  today: '#0c7c59',
  monthLabel: '#6d7653',

  radius: '7px',
  radiusLg: '10px',
  shadowSoft: '0 2px 4px rgba(0,0,0,.05)',
  borderSoft: '1px solid rgba(0,0,0,.03)',

  panelBg: 'rgba(253,240,213,.85)',
  panelBorder: '1px solid rgba(0,0,0,.05)',
  panelShadow: '0 -3px 15px rgba(0,0,0,.05)',
  pill: 'rgba(0,0,0,.1)',

  // The one color that is NOT part of the day-square palette: it marks the
  // add/edit form surface (and the row/day tied to it) so editing state is
  // instantly distinguishable from the timeline itself.
  formAccent: '#457b9d',
  formTint: 'rgba(69,123,157,.08)',
} as const;

/** Mirror the theme onto :root as CSS custom properties consumed by style.css. */
export function applyTheme(root: HTMLElement = document.documentElement): void {
  const set = (k: string, v: string): void => root.style.setProperty(k, v);
  set('--bg', THEME.bg);
  set('--weekday', THEME.weekday);
  set('--weekend', THEME.weekend);
  set('--event', THEME.event);
  set('--today', THEME.today);
  set('--monthLabel', THEME.monthLabel);
  set('--radius', THEME.radius);
  set('--radius-lg', THEME.radiusLg);
  set('--shadow-soft', THEME.shadowSoft);
  set('--border-soft', THEME.borderSoft);
  set('--panel-bg', THEME.panelBg);
  set('--panel-border', THEME.panelBorder);
  set('--panel-shadow', THEME.panelShadow);
  set('--pill', THEME.pill);
  set('--form-accent', THEME.formAccent);
  set('--form-tint', THEME.formTint);
}
