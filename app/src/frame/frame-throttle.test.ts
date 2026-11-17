import { afterEach, expect, test, vi } from 'vitest';
import { frameThrottle } from './frame-throttle';

afterEach(() => { vi.unstubAllGlobals(); });

test('streamed chunks are drawn at most once a frame', () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames[id - 1] = () => {}; });
  const draw = vi.fn(), streamed = frameThrottle(draw);
  streamed(); streamed(); streamed();
  expect(draw).not.toHaveBeenCalled(); expect(frames).toHaveLength(1);
  frames[0](0); expect(draw).toHaveBeenCalledOnce();
  streamed(); streamed.cancel(); frames[1](16); expect(draw).toHaveBeenCalledOnce();
});

test('with no frames (Node), each call runs at once', () => {
  vi.stubGlobal('requestAnimationFrame', undefined);
  const draw = vi.fn(), streamed = frameThrottle(draw);
  streamed(); streamed(); expect(draw).toHaveBeenCalledTimes(2);
});
