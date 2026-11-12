import type { GraphNode, RoomVisit } from '../../core/model';
import { isDeadEnd, setDeadEnd, setState } from './rules';
import { strings } from '../../ui/strings';
import type { LearnSession } from './session';
import type { MenuAction, PanelRequest as SharedPanelRequest } from '../../ui/graph/types';
import { trace } from '../../frame/debug/trace.svelte';

export type NodeActionId = 'light' | 'restore' | 'more' | 'rewrite' | 'own' | 'dismiss' | 'deadend' | 'delete';
export interface NodeAction extends MenuAction { id: NodeActionId }
/** The node menu asks the panel to open its own form or dialog for a node. */
export type PanelRequest = SharedPanelRequest;

/** GV-55: one definition for the node panel's actions and the graph's node menu (LR-11/20..23). */
export function nodeActions(visit: RoomVisit, node: GraphNode, running: { nodeId: string } | null): NodeAction[] {
  const busy = running?.nodeId === node.id, actions: NodeAction[] = [];
  if (node.state === 'open') actions.push({ id: 'light', label: strings.lightUp, disabled: !!running, task: true });
  if (node.state === 'dismissed') actions.push({ id: 'restore', label: strings.restore, disabled: busy });
  if (node.state === 'lit' || node.state === 'understood') actions.push(
    // The web demo has no further directions prepared, so it offers no "More options".
    // LR-101: no new directions on a dead end; the tooltip says why.
    ...(import.meta.env.VITE_DEMO ? [] : [{ id: 'more' as const, label: strings.moreOptions, disabled: !!running || isDeadEnd(node), task: true, ...(isDeadEnd(node) ? { title: strings.deadEndHint } : {}) },
      // LR-45: the panel's form asks what should change before the call.
      { id: 'rewrite' as const, label: strings.rewrite, disabled: !!running, task: true, toPanel: true }]),
    { id: 'own', label: strings.ownNode, disabled: busy, toPanel: true });
  if (node.state === 'open') actions.push({ id: 'dismiss', label: strings.dismiss, disabled: busy || running?.nodeId === node.parents[0] });
  // LR-102: any node but a dismissed one; a view of the node's future, not its state.
  if (node.state !== 'dismissed') actions.push({ id: 'deadend', label: isDeadEnd(node) ? strings.unmarkDeadEnd : strings.markDeadEnd, disabled: busy });
  if (node.id !== visit.rootId) actions.push({ id: 'delete', label: strings.delete, disabled: false, toPanel: true });
  return actions;
}

/** Runs the actions that need no form; `rewrite`, `own` and `delete` belong to the panel's forms and dialog. */
export function runNodeAction(session: LearnSession, id: Exclude<NodeActionId, 'rewrite' | 'own' | 'delete'>, nodeId: string): void {
  if (id === 'light' || id === 'more') { void session.run(id, nodeId); return; }
  if (id === 'deadend') {
    const on = !isDeadEnd(session.visit.nodes[nodeId]);
    trace.action('learn', on ? 'Mark as dead end' : 'Not a dead end', { nodeId });
    setDeadEnd(session.visit, nodeId, on); session.touch(); return;
  }
  trace.action('learn', id === 'dismiss' ? 'Dismiss' : 'Restore', { nodeId });
  setState(session.visit, nodeId, id === 'dismiss' ? 'dismissed' : 'open');
  session.touch();
}
