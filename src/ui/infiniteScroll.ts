import { SETTINGS } from '../config/settings';

/**
 * Soft, grow-only virtualization. Two sentinels at the ends of the grid trigger
 * lazy extension as they approach the viewport. Rendered nodes are never recycled,
 * so the browser's Ctrl+F keeps finding everything that has been rendered.
 *
 * At most one extend runs per observer batch (re-entrancy guard): multiple
 * entries in one callback (both sentinels, or repeated hits) cannot trigger
 * overlapping extends in the same tick. After an extend the observer is re-armed
 * on the next animation frame — re-observing forces fresh entries even for a
 * sentinel that stayed inside the margin the whole time.
 */
export class InfiniteScroll {
  readonly topSentinel: HTMLElement;
  readonly bottomSentinel: HTMLElement;
  onTop: (() => void) | null = null;
  onBottom: (() => void) | null = null;

  private readonly io: IntersectionObserver;
  private busy = false;
  private destroyed = false;

  constructor(private readonly grid: HTMLElement) {
    this.topSentinel = makeSentinel();
    this.bottomSentinel = makeSentinel();
    grid.insertBefore(this.topSentinel, grid.firstChild);
    grid.appendChild(this.bottomSentinel);

    this.io = new IntersectionObserver(
      (entries) => {
        if (this.busy) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.busy = true;
          if (entry.target === this.topSentinel) this.onTop?.();
          else if (entry.target === this.bottomSentinel) this.onBottom?.();
          requestAnimationFrame(() => this.rearm());
          break;
        }
      },
      { root: null, rootMargin: `${SETTINGS.sentinelMarginPx}px 0px` },
    );
    this.io.observe(this.topSentinel);
    this.io.observe(this.bottomSentinel);
  }

  /** Append content at the bottom (chronologically later). */
  insertBottom(node: Node): void {
    this.grid.insertBefore(node, this.bottomSentinel);
  }

  /** Prepend content at the top, compensating scroll so the view does not jump. */
  insertTopPreservingScroll(node: Node): void {
    const prevHeight = document.documentElement.scrollHeight;
    const prevTop = window.scrollY;
    this.grid.insertBefore(node, this.topSentinel.nextSibling);
    const delta = document.documentElement.scrollHeight - prevHeight;
    if (delta) {
      window.scrollTo({ top: prevTop + delta });
      // Anything positioned in document coordinates (the day popover) follows.
      window.dispatchEvent(new CustomEvent('dots:prepend', { detail: { delta } }));
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.io.disconnect();
  }

  private rearm(): void {
    if (this.destroyed) return;
    this.busy = false;
    this.io.unobserve(this.topSentinel);
    this.io.unobserve(this.bottomSentinel);
    this.io.observe(this.topSentinel);
    this.io.observe(this.bottomSentinel);
  }
}

function makeSentinel(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'sentinel';
  el.setAttribute('aria-hidden', 'true');
  return el;
}
