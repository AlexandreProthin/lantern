// Rebuilds a Choose subject from a saved choose-1 eval run, without calling the model: the run's replies are replayed
// through ChooseSession, so they are parsed, source-checked (CP-31) and logged as in the app. Ids in the replies belong
// to the run's own fixture and are mapped onto this one (TARGET order for cells, titles for the recommendation).
// Usage: tsx evals/choose-subject.ts <results.json> [--run 1]; writes <results>-subject.json beside it.
import { readFileSync, writeFileSync } from 'node:fs';
import type { InferenceProvider, Request } from '../src/frame/provider';
import { zeroUsage } from '../src/frame/provider';
import { parseSubject } from '../src/core/model';
import { addChooseChild, validateChoose } from '../src/rooms/choose/rules';
import { ChooseSession } from '../src/rooms/choose/session';
import { printer } from './choose-fixture';

const [file] = process.argv.slice(2).filter(a => !a.startsWith('--')), args = process.argv.slice(2);
if (!file) throw new Error('Usage: tsx evals/choose-subject.ts <results.json> [--run 1]');
const run = Number(args.includes('--run') ? args[args.indexOf('--run') + 1] : 1);
const saved = JSON.parse(readFileSync(file, 'utf8')) as { today: string; results: { run: number; id: string; text?: string; model?: string; usage?: Record<string, number>; durationMs?: number; costUsd?: number; toolCalls?: Record<string, number>; details?: string }[] };
const reply = (id: string) => { const r = saved.results.find(x => x.run === run && x.id === id && x.text && !x.details); if (!r) throw new Error(`No reply for ${id} in run ${run}`); return r; };

/** Old ids in a reply's block, in order of appearance, mapped onto the new ids listed in the request's TARGET. */
function mapCells(text: string, prompt: string): string {
  const target = (prompt.split('TARGET (the cells to fill, exactly these):\n')[1] ?? '').split('\n').map(l => /^(\w+) × (\w+) /.exec(l)).filter(m => !!m) as RegExpExecArray[];
  const block = /<cells>([\s\S]*?)<\/cells>/.exec(text); if (!block) return text;
  const cells = JSON.parse(block[1]) as { product: string; criterion: string }[], order = (key: 'product' | 'criterion') => [...new Set(cells.map(c => c[key]))];
  const products = new Map(order('product').map((id, i) => [id, [...new Set(target.map(t => t[1]))][i] ?? id]));
  const criteria = new Map(order('criterion').map((id, i) => [id, [...new Set(target.map(t => t[2]))][i] ?? id]));
  return text.replace(block[1], JSON.stringify(cells.map(c => ({ ...c, product: products.get(c.product), criterion: criteria.get(c.criterion) }))));
}

const { s, v, ids } = printer('3D printer (eval run)', { noise: true });
const queue: Record<string, string[]> = { light: ['1-light'], reply: ['2-reply-need'], find: ['3-find-1'], fill: ['5-disagree-1', '6-fill-1'], check: ['7-user-value'], recommend: ['9-recommend'] };
const replay: InferenceProvider = {
  async stream(request: Request, onText) {
    const task = /TASK: ([a-z]+)/.exec(request.prompt)?.[1] ?? '', name = ({ introduce: 'intro', propose: 'more' } as Record<string, string>)[task] ?? task;
    const r = reply(queue[name]?.shift() ?? `none-${name}`);
    let text = r.text!;
    if (name === 'fill') text = mapCells(text, request.prompt);
    if (name === 'check') text = text.replace(/<cells>[\s\S]*?<\/cells>/, '');
    if (name === 'recommend') {
      const pick = Object.values(session.visit.nodes).filter(n => n.state === 'shortlisted').map(n => ({ n, at: text.indexOf(n.title) })).filter(x => x.at >= 0).sort((a, b) => a.at - b.at)[0]?.n;
      text = text.replace(/"product":\s*"[^"]*"/, `"product": ${pick ? `"${pick.id}"` : 'null'}`);
    }
    onText(text);
    const u = r.usage ?? {};
    return { text, model: r.model || 'claude-opus-5-5', outcome: 'ok', durationMs: r.durationMs ?? 0, ...(r.costUsd ? { costUsd: r.costUsd } : {}), ...(r.toolCalls && Object.keys(r.toolCalls).length ? { toolCalls: r.toolCalls } : {}),
      usage: { ...zeroUsage(), input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 } };
  },
};
const session = new ChooseSession(s, replay, () => {}, () => {}, 'Alex', 12_000, () => true, () => saved.today);
const idle = async () => { for (let i = 0; i < 400 && (session.research || session.queue.length); i++) await new Promise(r => setTimeout(r, 5)); };
const step = async (what: string, action: () => Promise<void> | void) => { await action(); if (session.notice?.kind === 'error') throw new Error(`${what}: ${session.notice.error?.details}`); };

await step('light', () => session.run('light', ids.heated));
v.nodes[v.rootId].dialogue.push({ role: 'user', text: 'Also, it has to be quiet: it will sit in our living room.', at: '2026-10-15T20:00:00.000Z', author: { kind: 'user', by: 'Alex' } });
await step('reply', () => session.run('reply', v.rootId, { retry: true })); session.addOfferedNeed();
await step('find', () => session.run('find', v.rootId));
await step('rank', () => { session.rank(ids.noise, 'irrelevant'); session.rank(ids.noise, 'nice'); }); await idle();
const centauri = addChooseChild(session.visit, ids.family, { title: 'Elegoo Centauri Carbon', kind: 'product', createdBy: 'model' }).id;
await step('shortlist', () => session.shortlist(centauri)); await idle();
await step('check', () => session.run('check', ids.volume));
await step('recommend', () => session.run('recommend', session.visit.rootId));
validateChoose(session.visit); parseSubject(JSON.parse(JSON.stringify(session.subject))); // what Lantern checks when it opens the file
const out = file.replace(/\.json$/, `-run${run}-subject.json`);
writeFileSync(out, JSON.stringify(session.subject, null, 2));
const n = Object.values(session.visit.nodes);
console.log(`${out}\nid ${session.subject.id}: ${n.length} nodes, ${n.filter(x => x.kind === 'product').length} products, ${session.visit.log.length} records, recommendation ${session.recommendation?.productId ? 'names a shortlisted product' : 'names none'}`);
