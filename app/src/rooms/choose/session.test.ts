import { expect, test } from 'vitest';
import type { Request, ToolUse } from '../../frame/provider';
import { ChooseFakeProvider } from './fake-provider';
import { ChooseSession } from './session';
import { cells, chosenOf, facts, newChooseSubject, validateChoose } from './rules';

const today = () => '2026-10-15';
function setup(web = true, delay = 0) {
  const s = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }, 'Alex');
  const provider = new ChooseFakeProvider(delay), requests: Request[] = [], tools: ToolUse[] = [], shown: string[] = [], stream = provider.stream.bind(provider);
  provider.stream = (r, onText, onTool) => { requests.push(r); return stream(r, onText, t => { tools.push(t); onTool?.(t); }); };
  let session!: ChooseSession;
  session = new ChooseSession(s, provider, () => {}, () => { if (session?.running) shown.push(session.running.text); }, 'Alex', 12_000, () => web, today);
  return { session, provider, requests, tools, shown };
}
const idle = async (s: ChooseSession) => { for (let i = 0; i < 200 && (s.research || s.queue.length || s.running); i++) await new Promise(r => setTimeout(r, 5)); };
const kids = (s: ChooseSession, kind: string) => Object.values(s.visit.nodes).filter(n => n.kind === kind);

test('CP-10/CP-6: intro, light and explain run without the web and are logged with tone and web', async () => {
  const { session, requests } = setup();
  await session.initialize();
  const v = session.visit; expect(v.nodes[v.rootId].state).toBe('lit');
  expect(Object.values(v.nodes).filter(n => n.parents[0] === v.rootId).map(n => n.kind).sort()).toEqual(['criterion', 'family', 'need']);
  const need = kids(session, 'need')[0];
  await session.run('light', need.id);
  expect(session.visit.nodes[need.id]).toMatchObject({ state: 'open', content: expect.stringContaining('criterion matters') });
  expect(requests.every(r => r.web === false)).toBe(true);
  expect(session.visit.log.map(g => [g.task, g.data, g.toolCalls])).toEqual([['intro', { tone: 'curious', web: false }, undefined], ['light', { tone: 'curious', web: false }, undefined]]);
  expect(() => validateChoose(session.visit)).not.toThrow();
});

test('CP-10/IP-13/CP-32: find searches the web, shows progress, drops the preamble and records tool calls', async () => {
  const { session, requests, tools, shown } = setup();
  await session.initialize(); await session.run('find', session.visit.rootId);
  expect(requests.at(-1)?.web).toBe(true); expect(tools.map(t => t.name)).toEqual(['WebSearch', 'WebFetch']);
  expect(shown.at(-1)).toBe('Two printers that fit.'); expect(shown.some(t => t.includes("I'll search"))).toBe(true);
  const products = kids(session, 'product'); expect(products.map(p => p.state)).toEqual(['candidate', 'candidate']);
  expect(session.visit.nodes[products[0].parents[0]]).toMatchObject({ kind: 'family', title: 'Bed slingers' });
  expect(facts(products[0])[0]).toMatchObject({ label: 'Price', value: '399 €', sources: [{ kind: 'manufacturer', read: '2026-10-15' }] });
  expect(session.visit.log.at(-1)).toMatchObject({ task: 'find', toolCalls: { WebSearch: 1, WebFetch: 1 }, data: { web: true } });
  expect(session.visit.nodes[session.visit.rootId].content).not.toContain("I'll search");
});

test('CR-44/CP-11: with the web off, find runs from model knowledge and Check is unavailable', async () => {
  const { session, requests } = setup(false);
  await session.initialize(); await session.run('find', session.visit.rootId);
  expect(requests.at(-1)?.web).toBe(false);
  expect(facts(kids(session, 'product')[0])[0].sources[0]).toMatchObject({ kind: 'model', read: '2026-10' });
  await expect(session.run('check', kids(session, 'product')[0].id)).rejects.toThrow();
});

test('CP-40/CP-41: shortlisting and ranking fill Compare in the research lane, beside a reply', async () => {
  const { session } = setup(true, 2);
  await session.initialize(); await session.run('find', session.visit.rootId);
  const [a, b] = kids(session, 'product'), crit = kids(session, 'criterion')[0];
  session.rank(crit.id, 'must'); session.shortlist(a.id); session.shortlist(b.id);
  expect(session.research).not.toBeNull();
  const reply = session.run('reply', session.visit.rootId, { message: 'Which is quieter?' });
  expect(session.running?.task).toBe('reply');
  await reply; await idle(session);
  for (const p of [a, b]) expect(cells(session.visit.nodes[p.id])[crit.id]).toMatchObject({ value: expect.stringMatching(/^value/), sources: [{ kind: 'manufacturer' }] });
  const fills = session.visit.log.filter(g => g.task === 'fill');
  expect(fills.length).toBe(2); expect(fills.every(g => g.data?.web === true && g.toolCalls?.WebSearch === 1)).toBe(true);
  expect(() => validateChoose(session.visit)).not.toThrow();
});

test('CR-51/CP-13: the user\'s cell value stays beside the room\'s; Cancel drops the research queue', async () => {
  const { session } = setup(true, 2);
  await session.initialize(); await session.run('find', session.visit.rootId);
  const [a, b] = kids(session, 'product'), crit = kids(session, 'criterion')[0];
  session.rank(crit.id, 'must'); session.shortlist(a.id); await idle(session);
  session.saveCell({ productId: a.id, criterionId: crit.id }, '250 mm');
  expect(cells(session.visit.nodes[a.id])[crit.id]).toMatchObject({ value: expect.stringMatching(/^value/), user: { value: '250 mm', by: 'Alex' } });
  session.revertCell({ productId: a.id, criterionId: crit.id }); expect(cells(session.visit.nodes[a.id])[crit.id].user).toBeUndefined();
  session.shortlist(b.id); session.cancelResearch(); await idle(session);
  expect(session.queue).toEqual([]); expect(cells(session.visit.nodes[b.id])[crit.id]).toBeUndefined();
  expect(session.visit.log.at(-1)).toMatchObject({ task: 'fill', outcome: 'cancelled' });
});

test('CP-30.4/CP-30.5/CR-24: a need offered in a reply, a recommendation, then choose and buy', async () => {
  const { session } = setup();
  await session.initialize();
  await session.run('reply', session.visit.rootId, { message: 'I need it for figurines' });
  expect(session.needOffer).toMatchObject({ question: 'What is your budget?', answer: 'about 500 €' });
  session.addOfferedNeed(); expect(kids(session, 'need').find(n => n.title === 'What is your budget?')).toMatchObject({ state: 'answered', createdBy: 'user' });
  await session.run('find', session.visit.rootId);
  const [a, b] = kids(session, 'product'); session.shortlist(a.id); session.shortlist(b.id); session.cancelResearch(); await idle(session);
  await session.run('recommend', session.visit.rootId);
  expect(session.recommendation).toMatchObject({ productId: a.id, confidence: 'medium' });
  expect(chosenOf(session.visit)).toBeUndefined();
  session.choose(a.id); session.bought();
  expect(session.visit.data).toMatchObject({ status: 'bought', pick: { productId: a.id, price: '399 €' } });
  expect(() => validateChoose(session.visit)).not.toThrow();
});

test('LR-3/DM-32: a failed call is logged with its web flag and offers a retry', async () => {
  const { session, provider } = setup();
  await session.initialize(); provider.failNext = 'network';
  await session.run('find', session.visit.rootId);
  expect(session.visit.log.at(-1)).toMatchObject({ task: 'find', outcome: 'error', data: { web: true } });
  expect(session.notice).toMatchObject({ kind: 'error' }); await session.notice!.retry();
  expect(kids(session, 'product').length).toBe(2);
});
