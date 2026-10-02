import type { Component } from 'svelte';
import type { Subject, Tone } from '../core/model';
import type { InferenceProvider } from './provider';
import type { Settings } from './settings';
export interface RoomSession {
  subject: Subject; running: { nodeId: string; task: string } | null;
  setFocus(id: string): void; cancel(): void; touch(): void; initialize(): Promise<void>;
  displayName: string; budgetTokens: number;
}
export interface SpaceProps {
  session: RoomSession | null; revision: number; visible: boolean; settings: Settings;
  navigate: (space: string) => void; preferencesChanged: () => void;
}
export interface RoomDefinition {
  id: string; name: string; accent: Record<string, string>;
  spaces: { id: string; label: string; icon: string; shortcutIndex: number; component: Component<SpaceProps> }[];
  defaultSpace: string; settingsMenu: Component<{ settings: Settings; changed: () => void }>;
  prompts: { version: string; createSession: (subject: Subject, provider: InferenceProvider, save: () => void, render: () => void, settings: Settings) => RoomSession };
  nodeKinds: Record<string, { label: string; glyph: string }>; nodeStates: Record<string, { label: string; glyph: string }>;
  legend: { label: string; glyph: string }[];
  statsSummary: (subject: Subject) => { text: string; tooltip: string };
  newSubject: (title: string, tone: Tone, settings: Settings) => Subject;
}
