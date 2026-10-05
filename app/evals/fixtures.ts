import type { GraphNode, RoomVisit, Subject, Turn } from '../src/core/model';
import type { Task } from '../src/rooms/learn/protocol';
export interface EvalCase { id: string; subject: Subject; task: Task; focusId: string; language: 'en' | 'fr'; pending: boolean }
/** PQ-31/32: reproducible EN/FR subjects, small and large, with check/ordinary replies. */
export function cases(): EvalCase[] {
  const result: EvalCase[] = [];
  for (const language of ['en', 'fr'] as const) for (const size of [5, 300]) {
    const at = '2026-10-02T00:00:00Z'; const french = language === 'fr';
    const title = french ? 'Comment fonctionnent les marées' : 'How ocean tides work';
    const root: GraphNode = { id: 'n0', parents: [], title, hook: '', kind: 'subject', state: 'lit', understoodBy: null,
      content: french ? 'Les marées viennent des différences de gravitation entre les endroits de la Terre. La Lune domine cet effet.' : 'Tides arise from differences in gravitational pull across Earth. The Moon dominates this effect.',
      author: { kind: 'unknown' }, dialogue: [], createdAt: at, createdBy: 'learner' };
    const nodes: Record<string, GraphNode> = { n0: root };
    nodes.n1 = { ...structuredClone(root), id: 'n1', parents: ['n0'], title: french ? 'Pourquoi deux bourrelets' : 'Why two tidal bulges', kind: 'axis', createdBy: 'tutor',
      content: french ? 'La force de la Lune est plus forte sur la face proche, plus faible sur la face éloignée. Par rapport au centre, les deux faces sont étirées en sens opposés.' : 'The Moon pulls harder on the near side, less on the far side. Relative to the centre, the two sides stretch in opposite directions.' };
    for (let i = 2; i < size; i++) nodes[`n${i}`] = { ...structuredClone(root), id: `n${i}`, parents: ['n0'], title: french ? `Direction réservée ${i}` : `Reserved direction ${i}`, hook: french ? 'Une direction déjà proposée, à ne pas répéter.' : 'An existing direction that must never be repeated.', state: i % 5 === 0 ? 'dismissed' : 'open', kind: 'axis', createdBy: 'tutor', content: '' };
    const visit: RoomVisit = { tone: 'curious', model: 'haiku', effort: 'low', rootId: 'n0', focusId: 'n1', nodes, log: [] };
    // TP-13 (learn-2): the small subjects carry a direction, the large ones none, so both prompt shapes are gated.
    if (size === 5) visit.direction = french ? 'Commencez par ce que les marées changent pour les ports et la navigation,\npuis seulement la physique.' : 'Start with what tides change for harbours and sailing,\nthen the physics.';
    const subject: Subject = { format: 'lantern/1', id: `tides-${language}-${size}`, title, createdAt: at, rooms: { learn: visit } };
    for (const task of ['intro', 'light', 'more', 'check', 'reply'] as const) {
      const fixture = structuredClone(subject), v = fixture.rooms.learn;
      const focusId = task === 'intro' ? 'n0' : 'n1';
      if (task === 'light') { v.nodes.n1.state = 'open'; v.nodes.n1.content = ''; }
      if (task === 'reply') v.nodes.n1.dialogue = [{ role: 'learner', text: french ? 'Pourquoi le côté éloigné se soulève-t-il aussi ?' : 'Why does the far side rise too?', at, author: { kind: 'user', by: 'fixture' } }];
      result.push({ id: `${language}-${size}-${task}`, subject: fixture, task, focusId, language, pending: false });
    }
    const pending = structuredClone(subject), v = pending.rooms.learn;
    const question: Turn = { role: 'tutor', text: french ? 'Comparez la gravitation de la Lune sur les faces proche et éloignée avec celle au centre. Pourquoi deux bourrelets ?' : 'Compare lunar gravity on the near and far sides with gravity at the centre. Why two bulges?', at, author: { kind: 'model', model: 'fixture', generationId: 'check' } };
    const answer: Turn = { role: 'learner', text: french ? 'La face proche est davantage attirée que le centre et la face éloignée moins attirée. Les différences relatives au centre étirent donc les deux faces en sens opposés : deux bourrelets.' : 'The near side is pulled more than the centre, the far side less. Relative to the centre these differences stretch both sides in opposite directions, producing two bulges.', at, author: { kind: 'user', by: 'fixture' } };
    v.nodes.n1.dialogue = [question, answer];
    v.log.push({ id: 'check', nodeId: 'n1', task: 'check', model: 'fixture', effort: 'low', tone: 'curious', promptVersion: 'learn-1', startedAt: at, durationMs: 0, usage: { input: 0, output: 0, thinking: 0, cacheRead: 0, cacheWrite: 0 }, outcome: 'ok' });
    result.push({ id: `${language}-${size}-check-answer`, subject: pending, task: 'reply', focusId: 'n1', language, pending: true });
  }
  return result;
}
