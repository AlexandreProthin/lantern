import { normalizeTitle } from '../../core/model';
import { newLearnSubject } from './rules';
import type { Tone } from '../../core/model';
import { ProviderError } from '../../frame/provider';
import type { InferenceProvider } from '../../frame/provider';
import type { Settings } from '../../frame/settings';
import { taskPrompt } from './prompts';
import { parseReply } from './protocol';
import type { Option } from './protocol';
import { trace } from '../../frame/debug/trace.svelte';

/** WG-4: one unlogged Welcome request, using the approved suggest prompt/parser.
 * The transient visit exists only to reuse context assembly; nothing is persisted.
 * The D1 UI owns chip selection (fill the field, never automatically submit).
 */
export class SubjectSuggestions {
  options: Option[] = [];
  running = false;
  error: ProviderError | null = null;
  private controller?: AbortController;
  private disposed = false;
  constructor(private provider: InferenceProvider, private changed: () => void = () => {}) {}

  async suggest(hint: string, tone: Tone, settings: Settings, existingTitles: string[]): Promise<void> {
    if (this.running || this.disposed) return;
    trace.action('learn', 'Suggest subjects', { hint: hint.trim().length > 0 });
    const controller = new AbortController(); this.controller = controller;
    this.running = true; this.error = null; this.options = []; this.changed();
    try {
      const visit = newLearnSubject('Suggestions', { tone, model: settings.provider.defaultModel,
        effort: settings.provider.defaultEffort }).rooms.learn;
      const request = taskPrompt(visit, 'suggest', visit.rootId, { hint, existingSubjects: existingTitles });
      const requestId = crypto.randomUUID();
      const result = await this.provider.stream({ requestId, system: request.system,
        prompt: request.prompt, model: visit.model, effort: visit.effort, cancel: controller.signal,
        trace: { origin: 'learn·suggest', promptVersion: request.promptVersion, layers: request.layers, stats: request.stats } }, () => {});
      if (controller.signal.aborted) return;
      if (result.outcome !== 'ok') throw new ProviderError(result.outcome === 'cancelled' ? 'cancelled' : 'protocol', '', result.model, result.usage, result.durationMs);
      const parsed = parseReply(result.text, 'suggest');
      const seen = new Set(existingTitles.map(normalizeTitle));
      const options = parsed.options.filter(option => {
        const title = normalizeTitle(option.title);
        if (seen.has(title)) return false;
        seen.add(title); return true;
      }).slice(0, 3);
      trace.parsed(requestId, { options, optionsValid: parsed.optionsValid, ...(parsed.options.length > options.length ? { rejected: parsed.options.filter(o => !options.includes(o)).map(o => o.title) } : {}) });
      if (options.length !== 3) throw new ProviderError('protocol', 'Expected three distinct subject suggestions', result.model, result.usage, result.durationMs);
      this.options = options;
    } catch (error) {
      if (!controller.signal.aborted && !(error instanceof ProviderError && error.kind === 'cancelled'))
        this.error = error instanceof ProviderError ? error : new ProviderError('protocol', String(error));
    } finally {
      this.running = false; this.controller = undefined;
      if (!this.disposed) this.changed();
    }
  }
  cancel(): void { this.controller?.abort(); }
  dispose(): void { this.disposed = true; this.cancel(); }
}
