import type { Snippet } from 'svelte';
import type { GraphNode, Turn, RoomVisit } from '../core/model';
import type { MenuAction } from './graph/types';
export type { PanelRequest } from './graph/types';
/** A room's running generation, as the panel shows it. */
export interface PanelRunning { nodeId: string; task: string; text: string }
export interface PanelNotice { nodeId: string; kind: string }
/** What the panel reads and drives of a room's session. */
export interface PanelSession {
  visit: RoomVisit; running: PanelRunning | null; notice: PanelNotice | null; displayName: string;
  setFocus(id: string): void; cancel(): void; touch(): void; run(task: string, nodeId: string, message?: string): Promise<void>;
}
/** The room's side of the reading panel (PS-5): vocabulary, rules and the actions it offers. */
export interface PanelRoomView {
  /** Added to the panel's root, for the room's own CSS (`:global(.panel.<className> ...)`). */
  className: string;
  untitled: string;
  /** Generation tasks by what the panel shows: streamed text in the body, skeleton children, a dialogue turn. */
  tasks: { stream: readonly string[]; spawn: readonly string[]; dialogue: readonly string[] };
  kindLabel: (kind: string) => string;
  /** The state chip's text; the chip also carries `data-state`. */
  stateLabel: (node: GraphNode) => string;
  /** The node cannot be edited or acted on (Learn: running, or dismissed). */
  frozen: (node: GraphNode, busy: boolean) => boolean;
  /** No explanation yet, or set aside: the `placeholder` snippet shows instead of the content. */
  dormant: (node: GraphNode) => boolean;
  /** Has a conversation: shows the dialogue and the composer (Learn: lit or understood). */
  conversable: (node: GraphNode) => boolean;
  /** The section above the children (Learn: Axes at the root, Where next below). */
  nextHeading: (node: GraphNode, visit: RoomVisit) => string;
  /** Small text under a child option. */
  optionTag: (child: GraphNode) => string;
  /** A child that is set aside (listed under *dismissed*), and how to bring it back. */
  setAside: (child: GraphNode) => boolean;
  restore: (visit: RoomVisit, id: string) => void;
  editText: (target: GraphNode | Turn, text: string, by: string) => void;
  addChild: (visit: RoomVisit, parentId: string, own: { title: string; hook: string; by: string }) => void;
  actions: (visit: RoomVisit, node: GraphNode, running: PanelRunning | null) => MenuAction[];
  /** Row actions other than `own` / `delete`, which the panel handles itself. */
  runAction: (id: string, nodeId: string) => void;
  /** An extra line in the delete dialog (Learn: how many understood nodes go); empty for none. */
  deleteNote?: (visit: RoomVisit, ids: string[]) => string;
  /** Action ids kept out of the row because the placeholder shows them (Learn: light, restore). */
  inlineActions?: readonly string[];
}
export interface PanelSnippets {
  /** The body when `room.dormant(node)`: the room's notice and its main button. */
  placeholder: Snippet<[GraphNode, { running: PanelRunning | null; perform: (fn: () => void) => void }]>;
  /** The session's notice (retry, failure), inside the panel's notice box. */
  notice: Snippet<[PanelNotice, { running: PanelRunning | null }]>;
  /** Footer buttons after Send / Cancel (Learn: Check, Understood). */
  footer: Snippet<[GraphNode, { running: PanelRunning | null; busy: boolean; perform: (fn: () => void) => void }]>;
  /** Optional (Choose): the room's own section after the explanation and before the children (answer form, facts, ranking). */
  body?: Snippet<[GraphNode, { running: PanelRunning | null; busy: boolean; perform: (fn: () => void) => void }]>;
  /** Optional (Choose): after the dialogue (an offered need, the recommendation's button). */
  after?: Snippet<[GraphNode, { running: PanelRunning | null; busy: boolean; perform: (fn: () => void) => void }]>;
}
