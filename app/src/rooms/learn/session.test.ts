import { expect, test } from 'vitest';
import { createSubject } from '../../core/model';
import { FakeProvider } from './fake-provider';
import { LearnSession } from './session';
test('LR-1/10/11/13/15/33: intro, light, check, reply and demonstrated understanding', async () => {
  const s = createSubject('Tides'); const session = new LearnSession(s, new FakeProvider(0), () => {});
  await session.run('intro', session.visit.rootId); expect(session.visit.log[0].task).toBe('intro');
  const child = Object.values(session.visit.nodes).find(n => n.kind === 'axis')!;
  await session.run('light', child.id); expect(session.visit.nodes[child.id].state).toBe('lit');
  await session.run('reply', child.id, 'Why?'); expect(session.visit.nodes[child.id].state).toBe('lit');
  await session.run('check', child.id); await session.run('reply', child.id, 'Because the forces differ.');
  expect(session.visit.nodes[child.id]).toMatchObject({ state: 'understood', understoodBy: 'demonstrated' });
  expect(session.visit.log).toHaveLength(5); expect(session.visit.nodes[child.id].dialogue).toHaveLength(5);
});
test('LR-2/36/37/40: partial stream is transient, cancellation keeps learner message and logs failure', async () => {
  const s = createSubject('Tides'), provider = new FakeProvider(1), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId); const id = session.visit.rootId;
  provider.delayMs = 1000;
  const reply = session.run('reply', id, 'Question');
  await expect(session.run('more', id)).rejects.toThrow('already running'); session.cancel(); await reply;
  expect(session.visit.nodes[id].dialogue).toHaveLength(1); expect(session.visit.log.at(-1)?.outcome).toBe('cancelled');
  expect(session.running).toBeNull(); expect(session.visit.nodes[id].state).toBe('lit');
});
test('LR-4/33: retry preserves the answer and pending check; settings snapshot stays fixed', async () => {
  const s = createSubject('Tides'), provider = new FakeProvider(0), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId); const id = session.visit.rootId;
  await session.run('check', id); provider.failNext = 'network';
  const reply = session.run('reply', id, 'My answer'); session.visit.effort = 'high'; await reply;
  expect(session.visit.log.at(-1)).toMatchObject({ effort: 'medium', outcome: 'error' });
  expect(session.notice?.kind).toBe('error'); await session.notice!.retry();
  expect(session.visit.nodes[id].dialogue.filter(t => t.role === 'learner')).toHaveLength(1);
  expect(session.visit.nodes[id].understoodBy).toBe('demonstrated');
});
test('LR-60..63: apply filters duplicates against current graph; deleted target result is cancelled', async () => {
  const s = createSubject('Tides'), provider = new FakeProvider(0), session = new LearnSession(s, provider, () => {});
  await session.run('intro', session.visit.rootId);
  provider.response = '<options>[{"title":"Mechanism 1"},{"title":"Unique"},{"title":"Unique"},{"title":"Third"}]</options>';
  await session.run('more', session.visit.rootId); expect(session.notice).toMatchObject({ kind: 'directions', count: 2 });
  const target = Object.values(session.visit.nodes).find(n => n.title === 'Unique')!;
  const call = session.run('light', target.id); delete session.visit.nodes[target.id]; await call;
  expect(session.visit.log.at(-1)?.outcome).toBe('cancelled');
});
test('LR-2/TP-32: streamed machine block fragments never become visible JSON', async () => {
  const s = createSubject('Tides'), provider = new FakeProvider(0); const displays: string[] = [];
  const session = new LearnSession(s, provider, () => {}, () => { if (session.running) displays.push(session.running.text); });
  await session.run('intro', session.visit.rootId);
  expect(displays.some(text => text.includes('"title"') || text.includes('<options'))).toBe(false);
});
