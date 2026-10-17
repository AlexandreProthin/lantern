import { ProviderError, zeroUsage } from '../provider';
import type { Completion, ErrorKind, InferenceProvider, Request } from '../provider';
/**
 * IP-71: Amber's fake for the browser build and Playwright. The answer names its category the way the prompt
 * asks; a message containing `[no tag]` answers without a tag; `failNext` injects one error.
 */
export class AmberFakeProvider implements InferenceProvider {
  constructor(public delayMs = 12, public failNext?: ErrorKind) {}
  async stream(req: Request, onText: (chunk: string) => void): Promise<Completion> {
    const start = performance.now(), message = /USER'S MESSAGE: ([\s\S]*?)(\n\n|$)/.exec(req.prompt)?.[1] ?? '';
    const selected = /^SELECTED TEXT: "([^"]*)"/m.exec(req.prompt)?.[1];
    const earlier = (req.prompt.match(/^USER: /gm) ?? []).length;
    const category = selected ? 'subject' : /lantern|shortcut|key|button|setting|amber|room|space/i.test(message) ? 'app' : /this|node|subject|explanation/i.test(message) ? 'subject' : 'general';
    const answer = selected ? `“${selected}” here means the part of the idea the explanation leans on.`
      : category === 'app' ? 'Press Ctrl+J anywhere to ask me, and ? for every shortcut.'
      : category === 'subject' ? 'The focused node explains the mechanism in a few steps.' : 'That depends on the details; here is the short version.';
    const text = `${message.includes('[no tag]') ? '' : `<category>${category}</category>`}${answer}${earlier ? ` (follow-up ${earlier + 1})` : ''}`;
    const wait = () => new Promise<void>((resolve, reject) => {
      if (req.cancel.aborted) { reject(new ProviderError('cancelled', '', 'fake-amber')); return; }
      const timer = setTimeout(() => { req.cancel.removeEventListener('abort', abort); resolve(); }, this.delayMs);
      const abort = () => { clearTimeout(timer); reject(new ProviderError('cancelled', '', 'fake-amber')); };
      req.cancel.addEventListener('abort', abort, { once: true });
    });
    await wait();
    if (this.failNext) { const kind = this.failNext; this.failNext = undefined; throw new ProviderError(kind, 'Injected fake-provider failure', 'fake-amber'); }
    for (let offset = 0; offset < text.length; offset += 9) { await wait(); onText(text.slice(offset, offset + 9)); }
    return { text, model: 'fake-amber', usage: { ...zeroUsage(), input: Math.ceil((req.system.length + req.prompt.length) / 3), output: Math.ceil(text.length / 3) },
      durationMs: Math.round(performance.now() - start), outcome: 'ok', resolvedEffort: req.effort };
  }
}
