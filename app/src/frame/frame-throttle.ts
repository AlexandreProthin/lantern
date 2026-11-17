/** A call coalesced to one per animation frame: what changes per streamed chunk is drawn at most once a frame.
 * Where there are no frames (Node, tests) it runs at once. `cancel` drops a call not yet run. */
export interface FrameThrottled { (): void; cancel(): void }
export function frameThrottle(fn: () => void): FrameThrottled {
  let frame = 0;
  const call = (() => {
    if (typeof requestAnimationFrame !== 'function') { fn(); return; }
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; fn(); });
  }) as FrameThrottled;
  call.cancel = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
  return call;
}
