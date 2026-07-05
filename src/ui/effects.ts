import { spring } from 'motion';
import { animate } from 'motion/mini';

/**
 * The single home for motion-library usage and the reduced-motion policy.
 * Every entry point degrades to an instant final state when the user prefers
 * reduced motion (WAAPI does not respect that setting by itself).
 */

const POP_SPRING = { type: spring, stiffness: 520, damping: 34 } as const;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Springy entrance for popovers/panels: fade + scale + small rise. */
export function popIn(el: HTMLElement): void {
  if (prefersReducedMotion()) return;
  animate(
    el,
    { opacity: [0, 1], transform: ['scale(0.94) translateY(6px)', 'scale(1) translateY(0)'] },
    POP_SPRING,
  );
}

/* Slightly underdamped: a touch of overshoot sells "springs out of the cell".
   The day panel's transform-origin is pointed at its anchor cell by
   details.ts/positionPanel, so scale-only keyframes are all it takes. */
const DETAILS_SPRING = { type: spring, stiffness: 420, damping: 28 } as const;

/** Day-details panel entrance: springs open out of the clicked cell. */
export function detailsIn(el: HTMLElement): void {
  if (prefersReducedMotion()) {
    el.style.opacity = '';
    return;
  }
  animate(el, { opacity: [0, 1], transform: ['scale(0.55)', 'scale(1)'] }, DETAILS_SPRING);
}

/** Day-details panel exit: shrinks back into the cell; always removes via done(). */
export function detailsOut(el: HTMLElement, done: () => void): void {
  if (el.dataset.closing) return; // already on its way out
  el.dataset.closing = '1';
  if (prefersReducedMotion()) {
    done();
    return;
  }
  const anim = animate(
    el,
    { opacity: 0, transform: 'scale(0.6)' },
    { duration: 0.16, ease: 'easeIn' },
  );
  anim.finished.then(done, done);
}

/** Plain fade for full-screen overlays. */
export function fadeIn(el: HTMLElement): void {
  if (prefersReducedMotion()) return;
  animate(el, { opacity: [0, 1] }, { duration: 0.16, ease: 'easeOut' });
}

export function fadeOut(el: HTMLElement, done: () => void): void {
  if (prefersReducedMotion()) {
    done();
    return;
  }
  const anim = animate(el, { opacity: 0 }, { duration: 0.16, ease: 'easeOut' });
  anim.finished.then(done, done);
}

/** Attention pulse on a day cell after a mutation touched it. */
export function pulseCell(el: HTMLElement): void {
  el.classList.add('is-pulse');
  window.setTimeout(() => el.classList.remove('is-pulse'), 600);
  if (prefersReducedMotion()) return;
  animate(
    el,
    { transform: ['scale(1)', 'scale(1.12)', 'scale(1)'] },
    { duration: 0.45, ease: 'easeInOut' },
  );
}

/**
 * Run a DOM swap inside `container` while animating its height from the old
 * value to the new one (with a fade-in of the new content).
 */
export function swapHeight(container: HTMLElement, apply: () => void): void {
  if (prefersReducedMotion()) {
    apply();
    return;
  }
  const from = container.offsetHeight;
  apply();
  const to = container.offsetHeight;
  if (from === to) return;
  container.style.overflow = 'hidden';
  const anim = animate(
    container,
    { height: [`${from}px`, `${to}px`] },
    { duration: 0.18, ease: 'easeOut' },
  );
  const cleanup = (): void => {
    container.style.height = '';
    container.style.overflow = '';
  };
  anim.finished.then(cleanup, cleanup);
}
