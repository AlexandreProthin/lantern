// LR-91..96: replaying stored text through the streaming display, with no wait and no model.
// Room-neutral: a room hands it text and shows what it receives.

/** LR-91: a replay takes about this long whatever the text's length. */
export const REPLAY_STREAM_MS = 1000;
/** About 30 updates a second: smooth enough for text, light on markdown rendering (NP-74). */
const REPLAY_STEP_MS = 33;

export type ReplayEnd = 'done' | 'skipped' | 'cancelled';
export interface Replay {
  /** Resolves when the text is whole (`done`, `skipped`) or the replay was aborted (`cancelled`). */
  finished: Promise<ReplayEnd>;
  /** LR-93: put the whole text in place now. */
  skip(): void;
}

/** Streams `text` to `show` as a growing prefix. Reduced motion shows it whole at once (LR-93). */
export function replayText(text: string, show: (visible: string) => void,
  { durationMs = REPLAY_STREAM_MS, reduced = false, signal }: { durationMs?: number; reduced?: boolean; signal?: AbortSignal } = {}): Replay {
  let timer: ReturnType<typeof setTimeout> | undefined, settle!: (end: ReplayEnd) => void, ended = false;
  const finished = new Promise<ReplayEnd>(resolve => { settle = resolve; });
  const end = (how: ReplayEnd) => {
    if (ended) return; ended = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
    if (how !== 'cancelled') show(text);
    settle(how);
  };
  const abort = () => end('cancelled');
  if (signal?.aborted) { end('cancelled'); return { finished, skip() {} }; }
  signal?.addEventListener('abort', abort, { once: true });
  if (reduced || !text || durationMs <= 0) { end('done'); return { finished, skip() {} }; }
  const steps = Math.max(1, Math.round(durationMs / REPLAY_STEP_MS));
  let step = 0;
  const tick = () => {
    step++;
    if (step >= steps) { end('done'); return; }
    let cut = Math.ceil(text.length * step / steps);
    // Never split a surrogate pair: the half character would render as a box for a frame.
    if (cut < text.length && /[\uDC00-\uDFFF]/.test(text[cut])) cut++;
    show(text.slice(0, cut));
    timer = setTimeout(tick, durationMs / steps);
  };
  show('');
  timer = setTimeout(tick, durationMs / steps);
  return { finished, skip: () => end('skipped') };
}

/** GV-100: the OS preference or the app's Appearance override (`data-reduce-motion` on the root). False outside a browser. */
export const motionReduced = (): boolean => typeof matchMedia === 'function' && typeof document !== 'undefined'
  && (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'on');
