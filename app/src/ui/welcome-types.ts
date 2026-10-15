import type { Snippet } from 'svelte';
import type { Tone } from '../core/model';
import type { SubjectSummary } from '../frame/catalogue';
import type { ErrorKind, InferenceProvider } from '../frame/provider';
import type { Settings } from '../frame/settings';
export interface SuggestedOption { title: string; hook: string }
/** WG-4: a room's subject suggestions; the Welcome shows the button, the chips and the error. */
export interface SuggestionSource {
  options: SuggestedOption[]; running: boolean; error: { kind: ErrorKind } | null;
  suggest(hint: string, tone: Tone, settings: Settings, existingTitles: string[]): Promise<void>; cancel(): void; dispose(): void;
}
/** Texts a room words its own way; the rest come from the shared strings. */
export interface WelcomeLabels {
  lede: string; question: string; example: string; directionPlaceholder: string; carryIn: string; recent: string; continue: string;
}
/** The room's side of the Welcome (PS-5): the capsule, pickers and direction field are shared. */
export interface WelcomeRoomView {
  defaultTone: (settings: Settings) => Tone;
  labels?: Partial<WelcomeLabels>;
  /** Omit for a room without suggestions: the button and chips are not drawn. */
  suggestions?: (provider: InferenceProvider, changed: () => void) => SuggestionSource;
}
export interface WelcomeSnippets {
  /** The recent card's picture (Learn: the graph thumbnail). */
  visual: Snippet<[SubjectSummary]>;
  /** The recent card's figure, left of the date (Learn: understood / nodes). */
  figure: Snippet<[SubjectSummary]>;
}
