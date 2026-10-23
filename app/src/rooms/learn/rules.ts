import { addChild, editText, nodeOf } from '../../core/graph';
import { checkedDirection, createSubject, DIRECTION_LIMIT, validTone } from '../../core/model';
import type { Author, Effort, GraphNode, Role, RoomVisit, Subject, Tone, Turn, VisitSummary } from '../../core/model';

/** Learn's values for the room-owned parts of lantern/2 (DM-12, DM-13, DM-30, DM-65). */
export type NodeKind = 'subject' | 'axis' | 'deeper' | 'application' | 'adjacent' | 'exercise' | 'question' | 'own';
export type NodeState = 'open' | 'lit' | 'understood' | 'dismissed';
export type UnderstoodBy = 'demonstrated' | 'self' | null;
export const kinds: NodeKind[] = ['subject', 'axis', 'deeper', 'application', 'adjacent', 'exercise', 'question', 'own'];
export const states: NodeState[] = ['open', 'lit', 'understood', 'dismissed'];
export const tasks = ['intro', 'light', 'reply', 'check', 'more', 'rewrite'] as const;
export interface LearnData { tone: Tone; direction?: string }

/** Valid visits always carry a tone (validateLearn); the cast is the only place that reads `data`. */
export const learnData = (v: RoomVisit) => (v.data ?? {}) as unknown as LearnData;
export const toneOf = (v: RoomVisit): Tone => learnData(v).tone;
export const directionOf = (v: RoomVisit): string => learnData(v).direction ?? '';
export function setTone(v: RoomVisit, tone: Tone): void { v.data = { ...v.data, tone }; }
/** DM-41: absent and "" both mean no direction; an empty one is not stored. */
export function setDirection(v: RoomVisit, direction: string): void {
  const { direction: _, ...rest } = v.data ?? {}; v.data = direction ? { ...rest, direction } : rest;
}
export const understoodBy = (n: Pick<GraphNode, 'data'>): UnderstoodBy => (n.data?.understoodBy as UnderstoodBy | undefined) ?? null;

/** DM-66: the room's half of validation, on load and before every save. */
export function validateLearn(v: RoomVisit): void {
  const data = v.data ?? {};
  if (!validTone(data.tone) || (data.direction !== undefined && (typeof data.direction !== 'string' || [...data.direction].length > DIRECTION_LIMIT))) throw new Error('Invalid Learn visit data');
  for (const n of Object.values(v.nodes)) {
    const by = n.data?.understoodBy;
    if (!kinds.includes(n.kind as NodeKind) || !states.includes(n.state as NodeState)) throw new Error('Invalid Learn node kind or state');
    // DM-14: present exactly when understood.
    if ((n.state === 'understood') !== (by === 'self' || by === 'demonstrated') || (n.state !== 'understood' && by !== undefined)) throw new Error('Invalid understanding provenance');
  }
  for (const g of v.log) if (!(tasks as readonly string[]).includes(g.task) || !validTone(g.data?.tone)) throw new Error('Invalid Learn generation record');
}

/** LR state machine (LR-30..39). */
export function setState(v: RoomVisit, id: string, state: NodeState, by: UnderstoodBy = null): void {
  const n = nodeOf(v, id);
  const valid = (n.state === 'open' && ['lit', 'dismissed'].includes(state)) || (n.state === 'dismissed' && state === 'open')
    || (n.state === 'lit' && state === 'understood') || (n.state === 'understood' && state === 'lit')
    || (n.state === 'understood' && state === 'understood' && by === 'demonstrated');
  if (!valid || ((state === 'understood') !== (by === 'self' || by === 'demonstrated'))) throw new Error('Invalid state transition');
  n.state = state;
  const { understoodBy: _, ...rest } = n.data ?? {};
  if (by) n.data = { ...rest, understoodBy: by };
  else if (Object.keys(rest).length) n.data = rest; else delete n.data;
}
/** LR-39: children only grow from a lit or understood node, and start open. */
export function addLearnChild(v: RoomVisit, parentId: string, input: { title: string; hook?: string; kind: NodeKind; createdBy: Role; author?: Author }): GraphNode {
  if (!['lit', 'understood'].includes(nodeOf(v, parentId).state)) throw new Error('Parent must be lit');
  return addChild(v, parentId, { ...input, state: 'open' });
}
/** An explanation is editable only once it exists (lit or understood). */
export function editLearnText(target: GraphNode | Turn, text: string, by: string): void {
  if ('state' in target && !['lit', 'understood'].includes(target.state)) throw new Error('Node must be lit');
  editText(target, text, by);
}
export function newLearnSubject(title: string, settings: { tone: Tone; model: string; effort: Effort; direction?: string } = { tone: 'curious', model: 'opus', effort: 'medium' }, by = ''): Subject {
  const { tone, model, effort } = settings, direction = checkedDirection(settings.direction ?? '');
  return createSubject(title, 'learn', { model, effort, data: { tone, ...(direction ? { direction } : {}) }, root: { kind: 'subject', state: 'open' } }, by);
}
/** WG-30..36 from the room-neutral storage summary (ST-7). */
export function learnSummary(s: VisitSummary) {
  const count = (state: NodeState) => s.states[state] ?? 0, by = s.nodeData.understoodBy ?? {};
  return { total: count('open') + count('lit') + count('understood'), lit: count('lit') + count('understood'), dark: count('open'),
    understood: count('understood'), demonstrated: by.demonstrated ?? 0, self: by.self ?? 0,
    tone: s.data.tone as Tone | undefined, input: s.input, output: s.output, tokens: s.tokens, mainModel: s.mainModel,
    modelOutputs: s.modelOutputs, modelInputs: s.modelInputs, generations: s.generations };
}
