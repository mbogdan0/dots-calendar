/**
 * One-shot scroll intent consumed by the next grid mount.
 *
 * Ordering contract: the intent MUST be set before the store call that emits,
 * because Store.emit() runs the re-render (and thus takeScrollIntent())
 * synchronously. render.ts consumes the intent exactly once per mount on
 * every branch, so a stale intent can never leak into a later render.
 */

export type ScrollIntent =
  | { type: 'initial' }
  | { type: 'today' }
  | { type: 'mutation'; ymd: string }
  | { type: 'width' }
  | { type: 'preserve' };

let current: ScrollIntent = { type: 'initial' };

export function setScrollIntent(intent: ScrollIntent): void {
  current = intent;
}

/** Return the pending intent and reset to the default ('preserve'). */
export function takeScrollIntent(): ScrollIntent {
  const intent = current;
  current = { type: 'preserve' };
  return intent;
}
