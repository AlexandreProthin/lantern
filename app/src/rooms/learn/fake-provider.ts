import { ProviderError, zeroUsage } from '../../frame/provider';
import type { Completion, ErrorKind, InferenceProvider, Request } from '../../frame/provider';
/** IP-71: deterministic scenario text, delays and typed injected errors. */
export class FakeProvider implements InferenceProvider {
  private counter = 0;
  constructor(public delayMs = 12, public failNext?: ErrorKind, public response?: string) {}
  async stream(req: Request, onText: (chunk: string) => void): Promise<Completion> {
    const start = performance.now(), sequence = ++this.counter;
    const options = ['Mechanism', 'Application', 'Experiment'].map((title, i) => ({ title: `${title} ${sequence}`, hook: `Direction ${i + 1}`, kind: ['deeper', 'application', 'exercise'][i] }));
    const tag = `<options>${JSON.stringify(options)}</options>`;
    const isCheck = req.prompt.includes('TASK: test');
    const text = this.response ?? (req.prompt.includes('TASK: suggest') || req.prompt.includes('TASK: propose') ? tag
      : isCheck ? 'What would change if this mechanism stopped working? Explain why.'
      : req.prompt.includes('TASK: rewrite') ? 'Seen from another side, this mechanism shows up in what we can measure. Picture it step by step.'
      : req.prompt.includes('TASK: reply') ? `Your reasoning identifies the key mechanism.${req.prompt.includes('PENDING CHECK: yes') ? '<understood/>' : ''}`
      : `This subject connects a mechanism to what we can observe. Explore one direction at a time.\n\n${tag}`);
    const wait = () => new Promise<void>((resolve, reject) => {
      if (req.cancel.aborted) { reject(new ProviderError('cancelled', '', 'fake-tutor')); return; }
      const timer = setTimeout(() => { req.cancel.removeEventListener('abort', abort); resolve(); }, this.delayMs);
      const abort = () => { clearTimeout(timer); req.cancel.removeEventListener('abort', abort); reject(new ProviderError('cancelled', '', 'fake-tutor')); };
      req.cancel.addEventListener('abort', abort, { once: true });
    });
    await wait();
    if (this.failNext) { const error = this.failNext; this.failNext = undefined; throw new ProviderError(error, 'Injected fake-provider failure', 'fake-tutor'); }
    for (let offset = 0; offset < text.length; offset += 24) { await wait(); onText(text.slice(offset, offset + 24)); }
    return { text, model: 'fake-tutor', usage: { ...zeroUsage(), input: Math.ceil(req.prompt.length / 3), output: Math.ceil(text.length / 3) }, durationMs: Math.round(performance.now() - start), outcome: 'ok', resolvedEffort: req.effort };
  }
}
