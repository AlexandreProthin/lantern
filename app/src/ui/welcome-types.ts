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
  /** Wording Learn's defaults cover and a room may replace: the key hint after the example, the direction field's name, its two messages, the starters' lead-in, the CLI and library messages. */
  addsDirection: string; directionLabel: string; directionAlone: string; directionOver: (over: number, limit: number) => string;
  startersLabel: string; cliNotReady: string; libraryUnavailable: string;
}
/** CR-13: a starter inserts only `insert` at the cursor; the caret lands `caretBack` characters before its end. */
export interface WelcomeStarter { label: string; insert: string; caretBack?: number }
/** The room's side of the Welcome (PS-5): the capsule, pickers and direction field are shared. */
export interface WelcomeRoomView {
  defaultTone: (settings: Settings) => Tone;
  labels?: Partial<WelcomeLabels>;
  /** Omit for a room without suggestions: the button and chips are not drawn. */
  suggestions?: (provider: InferenceProvider, changed: () => void) => SuggestionSource;
  /** Omit for no starters row under the direction field. */
  starters?: (settings: Settings) => WelcomeStarter[];
  /** Width in px of the recent shelf when wider than the column (default: the column). */
  shelfWidth?: number;
}
/** What the room's own card (WelcomeSnippets.card) may call: open the subject, run a light between two screen points. */
export interface WelcomeCardTools { open: () => void; light: (from: { x: number; y: number }, to: { x: number; y: number }) => void }
export interface WelcomeSnippets {
  /** The recent card's picture (Learn: the graph thumbnail). */
  visual?: Snippet<[SubjectSummary]>;
  /** The recent card's figure, left of the date (Learn: understood / nodes). */
  figure?: Snippet<[SubjectSummary]>;
  /** Replaces the whole recent card (Choose: Gallery's resting card with a Continue link). */
  card?: Snippet<[SubjectSummary, WelcomeCardTools]>;
  /** A line under the pickers (Choose: the locale line). */
  extra?: Snippet;
}
