import type { Component } from 'svelte';
import type { RoomVisit, Subject, Tone, VisitSummary } from '../core/model';
import type { SubjectSummary } from './catalogue';
import type { InferenceProvider } from './provider';
import type { Settings } from './settings';
import type { LibrarySpaces } from './library-spaces';
export interface RoomSession {
  subject: Subject; running: { nodeId: string; task: string } | null;
  setFocus(id: string): void; cancel(): void; touch(): void; initialize(): Promise<void>;
  displayName: string; budgetTokens: number;
}
export interface SpaceProps {
  session: RoomSession | null; revision: number; visible: boolean; settings: Settings;
  navigate: (space: string) => void; preferencesChanged: () => void;
  library: LibrarySpaces;
}
export interface RoomDefinition {
  id: string; name: string; accent: Record<string, string>;
  spaces: { id: string; label: string; icon: string; shortcutIndex: number; component: Component<SpaceProps> }[];
  defaultSpace: string; settingsMenu: Component<{ settings: Settings; changed: () => void }>;
  prompts: { version: string; createSession: (subject: Subject, provider: InferenceProvider, save: () => void, render: () => void, settings: Settings) => RoomSession };
  nodeKinds: Record<string, { label: string; glyph: string }>; nodeStates: Record<string, { label: string; glyph: string }>;
  legend: { label: string; glyph: string }[];
  statsSummary: (subject: Subject) => { text: string; tooltip: string };
  newSubject: (title: string, tone: Tone, settings: Settings, direction?: string) => Subject;
  /** DM-66: the room's values (kind, state, task, data), on load and before every save. */
  validate: (visit: RoomVisit) => void;
  /** ST-7: the room's reading of the room-neutral storage summary, for its Welcome and Gallery. */
  summarize: (visit: VisitSummary) => Partial<SubjectSummary>;
  /** RS-15/RS-19 subject menu fields; moves into the room with the subject menu (v0.2.0 A3). */
  subjectTone: { get: (visit: RoomVisit) => Tone; set: (visit: RoomVisit, tone: Tone) => void };
  subjectDirection: { get: (visit: RoomVisit) => string; set: (visit: RoomVisit, direction: string) => void };
}
