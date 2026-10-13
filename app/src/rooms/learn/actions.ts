import type { GraphNode, RoomVisit } from '../../core/model';
import { setState } from './rules';
import { strings } from '../../ui/strings';
import type { LearnSession } from './session';

export type NodeActionId = 'light' | 'restore' | 'more' | 'own' | 'dismiss' | 'delete';
export interface NodeAction { id: NodeActionId; label: string; disabled: boolean }
/** The node menu asks the panel to open its own form or dialog for a node. */
export type PanelRequest = { kind: 'own' | 'delete'; nodeId: string; seq: number };

/** GV-55: one definition for the node panel's actions and the graph's node menu (LR-11/20..23). */
export function nodeActions(visit: RoomVisit, node: GraphNode, running: { nodeId: string } | null): NodeAction[] {
  const busy = running?.nodeId === node.id, actions: NodeAction[] = [];
  if (node.state === 'open') actions.push({ id: 'light', label: strings.lightUp, disabled: !!running });
  if (node.state === 'dismissed') actions.push({ id: 'restore', label: strings.restore, disabled: busy });
  if (node.state === 'lit' || node.state === 'understood') actions.push(
    { id: 'more', label: strings.moreOptions, disabled: !!running },
    { id: 'own', label: strings.ownNode, disabled: busy });
  if (node.state === 'open') actions.push({ id: 'dismiss', label: strings.dismiss, disabled: busy || running?.nodeId === node.parents[0] });
  if (node.id !== visit.rootId) actions.push({ id: 'delete', label: strings.delete, disabled: false });
  return actions;
}

/** Runs the actions that need no form; `own` and `delete` belong to the panel's form and dialog. */
export function runNodeAction(session: LearnSession, id: Exclude<NodeActionId, 'own' | 'delete'>, nodeId: string): void {
  if (id === 'light' || id === 'more') { void session.run(id, nodeId); return; }
  setState(session.visit, nodeId, id === 'dismiss' ? 'dismissed' : 'open');
  session.touch();
}
