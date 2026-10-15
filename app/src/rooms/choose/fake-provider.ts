import { ProviderError, zeroUsage } from '../../frame/provider';
import type { Completion, ErrorKind, InferenceProvider, Request, ToolUse } from '../../frame/provider';

/** IP-71 for Choose: deterministic answers per task, canned web results with tool events (IP-13), delays and injected errors. */
export class ChooseFakeProvider implements InferenceProvider {
  private counter = 0;
  constructor(public delayMs = 12, public failNext?: ErrorKind, public response?: string) {}
  async stream(req: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    const start = performance.now(), n = ++this.counter, p = req.prompt, today = /TODAY: (\d{4}-\d{2}-\d{2})/.exec(p)?.[1] ?? '2026-10-15';
    const source = (name: string, url: string) => req.web ? { kind: 'manufacturer', name, url, read: today } : { kind: 'model', name: 'Model knowledge', read: today.slice(0, 7) };
    const options = (kinds: string[]) => `<options>${JSON.stringify(kinds.map((kind, i) => ({ title: `${['Print volume', 'What will you print', 'Enclosed printers'][i]} ${n}`, hook: `Why it matters ${i + 1}`, kind })))}</options>`;
    const task = /TASK: ([a-z]+)/.exec(p)?.[1] ?? '';
    const ids = (head: string) => (p.split(head)[1] ?? '').split('\n\n')[0].split('\n').map(l => /^- (\w+) /.exec(l)?.[1]).filter((id): id is string => !!id);
    const tools: ToolUse[] = req.web && ['find', 'fill', 'check'].some(t => p.includes(`TASK: ${t}`)) ? [{ name: 'WebSearch', detail: 'printers around 500 €' }, { name: 'WebFetch', detail: 'bambulab.com' }] : [];
    const text = this.response ?? ({
      introduce: `A 3D printer builds objects layer by layer. What decides a choice: volume, ease of use and materials.\n\n${options(['criterion', 'need', 'family'])}`,
      light: `This matters for your choice because it limits what you can print.\n\n${options(['concept', 'need', 'family'])}`,
      explain: 'This criterion matters because it changes which printers fit your needs.',
      find: `Two printers that fit.\n\n<products>${JSON.stringify([`Printer A${n}`, `Printer B${n}`].map((title, i) => ({ title, hook: `Fake product ${i + 1}`, family: 'Bed slingers',
        facts: [{ label: 'Price', value: `${399 + 100 * i} €`, sources: [source('Maker shop', 'https://example.com/shop')] }, { label: 'Build volume', value: '256 mm', sources: [source('Maker specs', 'https://example.com/specs')] }] })))}</products>`,
      propose: options(['concept', 'criterion', 'need']),
      reply: `Here is what that means for your choice.${p.includes('I need') ? '<need>{"question":"What is your budget?","answer":"about 500 €"}</need>' : ''}`,
      fill: `<cells>${JSON.stringify((p.split('TARGET (the cells to fill, exactly these):\n')[1] ?? '').split('\n').map(l => /^(\w+) × (\w+) /.exec(l)).filter(m => !!m)
        .map(m => ({ product: m![1], criterion: m![2], value: `value ${n}`, disagree: false, sources: [source('Maker specs', 'https://example.com/specs')] })))}</cells>`,
      check: 'Checked against the maker\'s page: the facts hold.',
      recommend: `Printer A fits your needs best.\n\n<recommend>${JSON.stringify({ product: ids('SHORTLIST:')[0] ?? null, confidence: 'medium', missing: [] })}</recommend>`,
    } as Record<string, string>)[task] ?? 'Fake answer.';
    const wait = () => new Promise<void>((resolve, reject) => {
      if (req.cancel.aborted) { reject(new ProviderError('cancelled', '', 'fake-tutor')); return; }
      const timer = setTimeout(() => { req.cancel.removeEventListener('abort', abort); resolve(); }, this.delayMs);
      const abort = () => { clearTimeout(timer); req.cancel.removeEventListener('abort', abort); reject(new ProviderError('cancelled', '', 'fake-tutor')); };
      req.cancel.addEventListener('abort', abort, { once: true });
    });
    await wait();
    if (this.failNext) { const error = this.failNext; this.failNext = undefined; throw new ProviderError(error, 'Injected fake-provider failure', 'fake-tutor'); }
    // CP-32: a short preamble before the first tool use, which the session must drop.
    if (tools.length) { onText("I'll search the makers' sites."); for (const tool of tools) { await wait(); onTool?.(tool); } }
    for (let offset = 0; offset < text.length; offset += 24) { await wait(); onText(text.slice(offset, offset + 24)); }
    const toolCalls = tools.length ? Object.fromEntries(tools.map(t => [t.name, 1])) : undefined;
    return { text, model: 'fake-tutor', usage: { ...zeroUsage(), input: Math.ceil(p.length / 3), output: Math.ceil(text.length / 3) }, durationMs: Math.round(performance.now() - start), outcome: 'ok', resolvedEffort: req.effort, ...(toolCalls ? { toolCalls } : {}) };
  }
}
