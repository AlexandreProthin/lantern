import type { RoomCompanion, RoomDefinition, RoomSession } from '../room';
import { strings } from '../../ui/strings';
import type { AmberContext, AmberHelp } from './prompt';

/** What the help needs of a room; a RoomDefinition is one, and the evals build them without the room's components. */
export interface HelpRoom { name: string; spaces: readonly { id: string; label: string }[]; companion?: RoomCompanion }
/** CO-43: the app's help, sent with every call: what the rooms are, the shortcut table, every guide line and every tip. */
export function amberHelp(rooms: readonly HelpRoom[]): AmberHelp {
  const shortcuts = strings.shortcutTable + (rooms.length > 1 ? '\n' + strings.roomShortcuts(rooms.map(r => r.name)) : '');
  return {
    about: strings.amberAbout(rooms.filter(r => r.companion).map(r => strings.amberRoomLine(r.name, r.companion!.about, r.spaces.map(s => s.label)))),
    shortcuts,
    guide: rooms.flatMap(r => r.spaces.map(s => ({ room: r.name, space: s.label, lines: r.companion?.guide[s.id] ?? [] })).filter(g => g.lines.length)),
    tips: [...strings.amberTips, ...rooms.flatMap(r => r.companion?.tips ?? [])].map(t => t.text)
  };
}

/** CO-43: where the user is, and the open subject's title and focused node (core fields only; the frame knows no room). */
export function amberContext(room: RoomDefinition, space: string, session: RoomSession | null): AmberContext {
  const label = room.spaces.find(s => s.id === space)?.label ?? space;
  if (!session) return { room: room.name, space: label };
  const visit = session.subject.rooms[room.id], node = visit?.nodes[visit.focusId];
  return { room: room.name, space: label, subject: { title: session.subject.title, ...(node ? { focus: { title: node.title, explanation: node.content ?? '' } } : {}) } };
}
