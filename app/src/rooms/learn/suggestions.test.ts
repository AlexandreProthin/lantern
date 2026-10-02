import { expect, it, vi } from 'vitest';
import { SubjectSuggestions } from './suggestions';
import { ProviderError, zeroUsage } from '../../frame/provider';
import type { Completion, InferenceProvider, Request } from '../../frame/provider';
import { defaultSettings } from '../../frame/settings';
const result = (titles = ['Tides', 'Optics', 'Music']): Completion => ({
  text: `<options>${JSON.stringify(titles.map(title => ({ title, hook: 'A subject to explore' })))}</options>`,
  model: 'fake-tutor', usage: zeroUsage(), durationMs: 1, outcome: 'ok'
});
it('WG-4 snapshots defaults, uses the approved suggest task, and never persists a subject', async () => {
  const settings = defaultSettings(); const before = JSON.stringify(settings);
  const stream = vi.fn<InferenceProvider['stream']>().mockResolvedValue(result());
  const controller = new SubjectSuggestions({ stream });
  await controller.suggest('Light', 'engineer', settings, ['Stars']);
  expect(controller.options).toHaveLength(3); expect(controller.running).toBe(false); expect(controller.error).toBeNull();
  const request = stream.mock.calls[0][0];
  expect(request).toMatchObject({ model: 'opus', effort: 'medium' });
  expect(request.prompt).toContain('TASK: suggest subjects.'); expect(request.prompt).toContain('Stars');
  expect(request.prompt).toContain('Light'); expect(request.system).toContain('Be precise and practical');
  expect(JSON.stringify(settings)).toBe(before);
});
it('serializes suggestions and ignores a late success after cancellation', async () => {
  let complete!: (value: Completion) => void;
  const stream = vi.fn<InferenceProvider['stream']>(() => new Promise(resolve => complete = resolve));
  const controller = new SubjectSuggestions({ stream });
  const pending = controller.suggest('', 'curious', defaultSettings(), []);
  expect(controller.running).toBe(true);
  await controller.suggest('second', 'expert', defaultSettings(), []); expect(stream).toHaveBeenCalledTimes(1);
  controller.cancel(); complete(result()); await pending;
  expect(controller.options).toEqual([]); expect(controller.error).toBeNull(); expect(controller.running).toBe(false);
});
it('rejects duplicate/existing or missing options and can retry provider errors', async () => {
  const stream = vi.fn<InferenceProvider['stream']>().mockResolvedValueOnce(result(['Tides', ' tides ', 'Music']))
    .mockResolvedValueOnce(result()).mockRejectedValueOnce(new ProviderError('network', 'offline')).mockResolvedValue(result());
  const controller = new SubjectSuggestions({ stream }); const settings = defaultSettings();
  await controller.suggest('', 'curious', settings, []); expect(controller.error?.kind).toBe('protocol');
  await controller.suggest('', 'curious', settings, ['Óptics']); expect(controller.error?.kind).toBe('protocol');
  await controller.suggest('', 'curious', settings, []); expect(controller.error?.kind).toBe('network');
  await controller.suggest('', 'curious', settings, []); expect(controller.error).toBeNull(); expect(controller.options).toHaveLength(3);
});
it('disposal cancels the request and prevents late render callbacks or further calls', async () => {
  let request!: Request, complete!: (value: Completion) => void;
  const stream = vi.fn<InferenceProvider['stream']>(req => { request = req; return new Promise(resolve => complete = resolve); });
  const changed = vi.fn(); const controller = new SubjectSuggestions({ stream }, changed);
  const pending = controller.suggest('', 'curious', defaultSettings(), []);
  controller.dispose(); expect(request.cancel.aborted).toBe(true);
  complete(result()); await pending;
  expect(changed).toHaveBeenCalledTimes(1);
  await controller.suggest('', 'curious', defaultSettings(), []); expect(stream).toHaveBeenCalledTimes(1);
});
