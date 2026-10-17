import type { Component } from 'svelte';
import type { RoomVisit, Subject, Tone, VisitSummary } from '../core/model';
import type { SubjectSummary } from './catalogue';
import type { ErrorKind, InferenceProvider } from './provider';
import type { Settings } from './settings';
import type { LibrarySpaces } from './library-spaces';
export interface RoomSession {
  subject: Subject; running: { nodeId: string; task: string } | null;
  setFocus(id: string): void; cancel(): void; touch(): void; initialize(): Promise<void>;
}
export interface SpaceProps {
  session: RoomSession | null; revision: number; visible: boolean; settings: Settings;
  navigate: (space: string) => void; preferencesChanged: () => void;
  library: LibrarySpaces;
}
/** RS-15/RS-19: the room's own fields in the subject menu. `changed(true)` also says "applies to the next generation". */
export interface SubjectMenuProps { visit: RoomVisit; revision: number; changed: (appliesNext: boolean) => void }
/** CO-13: a bottom resting position, in a bottom corner of an element of the space, a little inside it. */
export interface RestSpec { id: string; label: string; anchor: string; side: 'left' | 'right'; inset?: { x: number; y: number } }
/** RS-3, CO-13, CO-22, CO-23: what Amber says about a room, and where it can rest in each space. */
export interface RoomCompanion {
  /** One line for Amber's app help: what the room is for. */
  about: string;
  /** CO-21: ids are stable, since seen tips are remembered by id (SE-50). */
  tips: readonly { id: string; text: string }[];
  /** CO-22, GV-73: *What can I do here?* per space id, each line an action and its key. */
  guide: Record<string, readonly string[]>;
  /** CO-13: bottom resting positions per space id; a space without any gets the space's two bottom corners. */
  rests?: Record<string, readonly RestSpec[]>;
}
/** RS-1..3, RS-30, SE-12, DM-66, ST-7. The frame calls only these members (RS-2). */
export interface RoomDefinition {
  id: string; name: string;
  /** RS-30/RS-12: the palette lives in CSS under data-room; the accent is repeated here for the room menu's swatch. */
  accent: Record<string, string>;
  /** RS-20: `icon` is a glyph's inner SVG markup on a 16×16 viewBox (ui/glyphs.ts). */
  spaces: { id: string; label: string; icon: string; shortcutIndex: number; component: Component<SpaceProps> }[];
  defaultSpace: string; settingsMenu: Component<{ settings: Settings; changed: () => void }>;
  /** SE-12: the room's settings group, stored under the room id. */
  settings: { defaults: Record<string, unknown>; validate: (stored: Record<string, unknown>) => Record<string, unknown> };
  /** The tone a new subject gets when no other is given (the DEV Study harness). */
  defaultTone: (settings: Settings) => Tone;
  prompts: { version: string; createSession: (subject: Subject, provider: InferenceProvider, save: () => void, render: () => void, settings: Settings) => RoomSession };
  /** Settings that reach open sessions when they change (display name, context budget). */
  applySettings: (session: RoomSession, settings: Settings) => void;
  /** The browser build and Playwright tests talk to this instead of the CLI (IP-71). */
  fakeProvider: (delayMs: number, error?: ErrorKind) => InferenceProvider;
  nodeKinds: Record<string, { label: string; glyph: string }>; nodeStates: Record<string, { label: string; glyph: string }>;
  legend: { label: string; glyph: string }[];
  statsSummary: (subject: Subject) => { text: string; tooltip: string };
  newSubject: (title: string, tone: Tone, settings: Settings, direction?: string) => Subject;
  /** DM-66: the room's values (kind, state, task, data), on load and before every save. */
  validate: (visit: RoomVisit) => void;
  /** ST-7: the room's reading of the room-neutral storage summary, for its Welcome and Gallery. */
  summarize: (visit: VisitSummary) => Partial<SubjectSummary>;
  /** RS-15/RS-19: rendered in the subject menu below the title. */
  subjectMenu: Component<SubjectMenuProps>;
  /** RS-3 (round 9): Amber's tips and guide lines for this room; a room without it gets the frame's alone. */
  companion?: RoomCompanion;
}
