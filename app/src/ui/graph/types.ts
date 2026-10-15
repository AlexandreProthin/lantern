import type { Snippet } from 'svelte';
import type { GraphNode, RoomVisit, Subject } from '../../core/model';
import type { SceneNode, SceneOptions, SceneRunning } from './graph-scene';
/** What the graph reads of a room's session (GV-*). */
export interface GraphSession {
  subject: Subject; visit: RoomVisit; running: SceneRunning | null;
  setFocus(id: string): void; busy(id: string): boolean;
}
/** GV-55: one entry of the node menu and the panel's action row. `toPanel` entries open a form or dialog in the panel; `task` entries start a generation. */
export interface MenuAction { id: string; label: string; disabled: boolean; toPanel?: boolean; task?: boolean }
/** The node menu asks the panel to open its own form or dialog for a node. */
export type PanelRequest = { kind: 'own' | 'delete'; nodeId: string; seq: number };
/** The room's side of the graph (PS-5): the graph asks, the room answers. Optional members have the defaults named. */
export interface GraphRoomView {
  /** Added to the graph's root, so the room's own CSS can reach node states (`:global(.graph.<className> ...)`). */
  className: string;
  scene: SceneOptions;
  /** GV-40: text relations drawn as dotted curves. Default none. */
  links?: (visit: RoomVisit) => { id: string; from: string; to: string }[];
  /** Extra attributes on a node button, e.g. `data-understood`. */
  dataAttrs?: (node: SceneNode) => Record<string, string | undefined>;
  /** Appended to the node's accessible name after `title · kind · state`. */
  labelExtra?: (node: GraphNode) => string;
  /** Appended to the node's tooltip after `title · state` (Choose: a rejected product's reason). Default none. */
  tooltipExtra?: (node: GraphNode) => string;
  /** A node that takes no pulse or travelling light (Learn: dismissed). */
  quiet?: (node: GraphNode) => boolean;
  /** RS-34: a node that becomes this warms the backdrop. Default `state === 'lit'`. */
  lights?: (node: GraphNode) => boolean;
  untitled: string;
  menuActions: (visit: RoomVisit, node: GraphNode, running: SceneRunning | null) => MenuAction[];
  runMenuAction: (action: MenuAction, nodeId: string) => void;
  /** Enter on a node: true when the room handled it, else the panel takes focus. */
  enter: (nodeId: string) => boolean;
}
export interface GraphSnippets {
  /** The disc's contents (pictogram, rings, badge...), drawn inside `.disc`. */
  glyph: Snippet<[SceneNode]>;
  /** Legend rows: `<span>` children of the legend, after its toggle button. */
  legend: Snippet;
}
