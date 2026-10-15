import { expect, test } from 'vitest';
import { newLearnSubject, understoodBy } from './rules';
import { FakeProvider } from './fake-provider';
import { LearnSession } from './session';
import type { Request } from '../../frame/provider';
test('LR-1/10/11/13/15/33: intro, light, check, reply and demonstrated understanding', async () => {
  const s = newLearnSubject('Tides'); const session = new LearnSession(s, new FakeProvider(0), () => {});
  await session.run('intro', session.visit.rootId); expect(session.visit.log[0].task).toBe('intro');
  const child = Object.values(session.visit.nodes).find(n => n.kind === 'axis')!;
  await session.run('light', child.id); expect(session.visit.nodes[child.id].state).toBe('lit');
  await session.run('reply', child.id, 'Why?'); expect(session.visit.nodes[child.id].state).toBe('lit');
  await session.run('check', child.id); await session.run('reply', child.id, 'Because the forces differ.');
  expect(session.visit.nodes[child.id]).toMatchObject({ state: 'understood', data: { understoodBy: 'demonstrated' } });
  expect(session.visit.log).toHaveLength(5); expect(session.visit.nodes[child.id].dialogue).toHaveLength(5);
});
test('LR-2/36/37/40: partial stream is transient, cancellation keeps learner message and logs failure', async () => {
  const s = newLearnSubject('Tides'), provider = new FakeProvider(1), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId); const id = session.visit.rootId;
  provider.delayMs = 1000;
  const reply = session.run('reply', id, 'Question');
  await expect(session.run('more', id)).rejects.toThrow('already running'); session.cancel(); await reply;
  expect(session.visit.nodes[id].dialogue).toHaveLength(1); expect(session.visit.log.at(-1)?.outcome).toBe('cancelled');
  expect(session.running).toBeNull(); expect(session.visit.nodes[id].state).toBe('lit');
});
test('LR-4/33: retry preserves the answer and pending check; settings snapshot stays fixed', async () => {
  const s = newLearnSubject('Tides'), provider = new FakeProvider(0), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId); const id = session.visit.rootId;
  await session.run('check', id); provider.failNext = 'network';
  const reply = session.run('reply', id, 'My answer'); session.visit.effort = 'high'; await reply;
  expect(session.visit.log.at(-1)).toMatchObject({ effort: 'medium', outcome: 'error' });
  expect(session.notice?.kind).toBe('error'); await session.notice!.retry();
  expect(session.visit.nodes[id].dialogue.filter(t => t.role === 'user')).toHaveLength(1);
  expect(understoodBy(session.visit.nodes[id])).toBe('demonstrated');
});
test('LR-60..63: apply filters duplicates against current graph; deleted target result is cancelled', async () => {
  const s = newLearnSubject('Tides'), provider = new FakeProvider(0), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId);
  provider.response = '<options>[{"title":"Mechanism 1"},{"title":"Unique"},{"title":"Unique"},{"title":"Third"}]</options>';
  await session.run('more', session.visit.rootId); expect(session.notice).toMatchObject({ kind: 'directions', count: 2 });
  const target = Object.values(session.visit.nodes).find(n => n.title === 'Unique')!;
  const call = session.run('light', target.id); delete session.visit.nodes[target.id]; await call;
  expect(session.visit.log.at(-1)?.outcome).toBe('cancelled');
});
test('LR-2/TP-32: streamed machine block fragments never become visible JSON', async () => {
  const s = newLearnSubject('Tides'), provider = new FakeProvider(0); const displays: string[] = [];
  const session = new LearnSession(s, provider, () => {}, () => { if (session.running) displays.push(session.running.text); });
  await session.run('intro', session.visit.rootId);
  expect(displays.some(text => text.includes('"title"') || text.includes('<options'))).toBe(false);
});
test('IP-1/IP-60: no Learn call asks for a tool', async () => {
  const provider = new FakeProvider(0), requests: Request[] = [], stream = provider.stream.bind(provider);
  provider.stream = (request, onText) => { requests.push(request); return stream(request, onText); };
  const s = newLearnSubject('Tides'), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId); const id = Object.keys(session.visit.nodes).find(k => k !== session.visit.rootId)!;
  await session.run('light', id); await session.run('more', id); await session.run('check', id); await session.run('reply', id, 'Because the moon pulls.');
  expect(requests.length).toBe(5); expect(requests.every(r => r.web === undefined)).toBe(true);
});
