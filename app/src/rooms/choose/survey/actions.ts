import type { GraphNode, RoomVisit } from '../../../core/model';
import { subtreeIds } from '../../../core/graph';
import type { MenuAction } from '../../../ui/graph/types';
import { kindOf, statusOf } from '../rules';
import type { ChooseSession } from '../session';
import { t } from './strings';
import { trace } from '../../../frame/debug/trace.svelte';

export type ActionId = 'light' | 'explain' | 'find' | 'more' | 'check' | 'own' | 'dismiss' | 'restore' | 'delete'
  | 'shortlist' | 'remove' | 'reject' | 'unreject' | 'choose' | 'unchoose' | 'bought' | 'must' | 'nice' | 'irrelevant';
export interface NodeAction extends MenuAction { id: ActionId }
/** Actions the reading panel shows in its placeholder, its ranking control or its footer rather than in the row. */
export const inlineActions: readonly string[] = ['light', 'restore', 'must', 'nice', 'irrelevant', 'check'];
const rankIds = ['must', 'nice', 'irrelevant'] as const;
export const isRank = (id: string): id is typeof rankIds[number] => (rankIds as readonly string[]).includes(id);

/** CP-10, CR-21 to CR-24: one definition for the panel's action row and the graph's node menu. `useWeb` hides *Check this* (CR-44). */
export function nodeActions(visit: RoomVisit, node: GraphNode, running: { nodeId: string } | null, useWeb = true): NodeAction[] {
  const kind = kindOf(node), state = node.state, any = !!running, busy = running?.nodeId === node.id, out: NodeAction[] = [];
  const task = (id: ActionId, label: string) => out.push({ id, label, disabled: any, task: true });
  const act = (id: ActionId, label: string, disabled = busy) => out.push({ id, label, disabled });
  const dismissable = () => act('dismiss', t.dismiss, busy || running?.nodeId === node.parents[0]);
  const parentKinds = ['subject', 'concept', 'family', 'own'];
  if (state === 'dismissed') act('restore', t.restore);
  else if (parentKinds.includes(kind)) {
    if (kind === 'subject') { if (state === 'open') task('light', t.lightSubject); else { task('find', t.find); task('more', t.more); } }
    else if (kind === 'family') task('find', t.find);
    else if (state === 'open') task('light', t.lightSubject); else task('more', t.more);
    if (kind === 'family' || kind === 'subject' || state === 'lit') out.push({ id: 'own', label: t.own, disabled: busy, toPanel: true });
    if (state === 'open' && kind !== 'subject') dismissable();
  } else if (kind === 'need' || kind === 'criterion') {
    task('explain', t.explain);
    if (kind === 'criterion') for (const id of rankIds) act(id, t.rankAs[id], busy || state === id);
    if (state === 'open') dismissable();
  } else {
    if (state === 'candidate') { act('shortlist', t.shortlist); act('reject', t.reject); }
    if (state === 'shortlisted') { act('choose', t.choose); act('remove', t.remove); act('reject', t.reject); }
    if (state === 'chosen') { if (statusOf(visit) === 'decided') act('bought', t.bought); act('unchoose', t.unchoose); }
    if (state === 'rejected') act('unreject', t.restore);
  }
  if (useWeb && state !== 'dismissed' && (node.content || node.dialogue.length || ['need', 'criterion', 'product'].includes(kind))) task('check', t.check);
  if (node.id !== visit.rootId) out.push({ id: 'delete', label: t.delete, disabled: subtreeIds(visit, node.id).some(id => visit.nodes[id].state === 'chosen'), toPanel: true });
  return out;
}

const tasks: Record<string, 'light' | 'find' | 'more' | 'check'> = { light: 'light', explain: 'light', find: 'find', more: 'more', check: 'check' };
/** Runs an action that needs no form. `reject` needs a reason, `own` and `delete` a form or dialog: the caller handles them. */
export function runAction(session: ChooseSession, id: ActionId, nodeId: string): void {
  if (id in tasks) { session.run(tasks[id], nodeId).catch(e => { console.warn(String(e)); trace.warn('choose', String(e)); }); return; }
  if (isRank(id)) return session.rank(nodeId, id);
  switch (id) {
    case 'dismiss': return session.dismiss(nodeId);
    case 'restore': return session.undismiss(nodeId);
    case 'shortlist': return session.shortlist(nodeId);
    case 'remove': return session.unshortlist(nodeId);
    case 'choose': return session.choose(nodeId);
    case 'unchoose': return session.unchoose(nodeId);
    case 'bought': return session.bought();
    case 'unreject': return session.restore(nodeId);
    default: throw new Error(`No action ${id}`);
  }
}
