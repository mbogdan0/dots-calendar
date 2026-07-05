import { SETTINGS } from '../config/settings';
import { prefersReducedMotion } from './effects';

/**
 * Custom window-scroll animation with UX guardrails the native smooth scroll
 * lacks: distance-capped duration, an instant "teleport" for very long jumps
 * (so no scroll ever takes more than ~half a second), cancellation on any
 * user input, and a per-frame re-resolved target — lazy top-prepends shift
 * document coordinates mid-flight and the animation must keep landing on the
 * element, not on a stale pixel offset.
 */

const CANCEL_EVENTS = ['wheel', 'touchstart', 'mousedown', 'pointerdown'] as const;
const SCROLL_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ',
]);

let active: { cancel: () => void } | null = null;

function clampTarget(y: number): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.min(Math.max(y, 0), Math.max(max, 0));
}

export function cancelScrollAnimation(): void {
  active?.cancel();
  active = null;
}

/**
 * Animate window scroll to a target that is re-resolved every frame.
 * Resolves true when the animation completed, false when the user cancelled it.
 */
export function animateScrollTo(resolveTarget: () => number): Promise<boolean> {
  cancelScrollAnimation();

  const { minDurationMs, maxDurationMs, pxPerMs, teleportThresholdVh, teleportLandingVh } =
    SETTINGS.SCROLL;

  if (prefersReducedMotion()) {
    window.scrollTo({ top: clampTarget(resolveTarget()) });
    return Promise.resolve(true);
  }

  // Long-distance rule: jump most of the way instantly, animate only a short
  // final approach so remote targets do not produce marathon scrolls.
  const initialTarget = clampTarget(resolveTarget());
  const distance = initialTarget - window.scrollY;
  if (Math.abs(distance) > teleportThresholdVh * window.innerHeight) {
    const landing = initialTarget - Math.sign(distance) * teleportLandingVh * window.innerHeight;
    window.scrollTo({ top: clampTarget(landing) });
  }

  // Remaining distance after the optional teleport. The animation is expressed
  // relative to the (re-resolved) target: pos = target - dist * (1 - eased).
  // If a prepend shifts the document, the whole path shifts with the target
  // instead of snapping back toward a stale start position.
  const dist = clampTarget(resolveTarget()) - window.scrollY;
  const duration = Math.min(Math.max(Math.abs(dist) / pxPerMs, minDurationMs), maxDurationMs);

  return new Promise<boolean>((resolve) => {
    const startTime = performance.now();
    let raf = 0;

    const finish = (completed: boolean): void => {
      cancelAnimationFrame(raf);
      for (const ev of CANCEL_EVENTS) window.removeEventListener(ev, onInput);
      window.removeEventListener('keydown', onKey);
      if (active?.cancel === cancel) active = null;
      resolve(completed);
    };
    const cancel = (): void => finish(false);
    const onInput = (): void => cancel();
    const onKey = (e: KeyboardEvent): void => {
      if (SCROLL_KEYS.has(e.key)) cancel();
    };

    for (const ev of CANCEL_EVENTS) window.addEventListener(ev, onInput, { passive: true });
    window.addEventListener('keydown', onKey);
    active = { cancel };

    const tick = (now: number): void => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const target = clampTarget(resolveTarget());
      window.scrollTo({ top: target - dist * (1 - eased) });
      if (t >= 1) finish(true);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
