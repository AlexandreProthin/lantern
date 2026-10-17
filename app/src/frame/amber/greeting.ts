import type { AmberState } from './state';
import { NOTES_MAX } from './state';
/**
 * CO-30, CO-31: the line Amber says when the app opens. The first launch after a fresh install has its own line;
 * the first launch after an update brings the release's notes (kept when it was installed, UP-13 amended); any other
 * launch, one line of the pool, never the same twice in a row.
 */
export type Greeting =
  | { kind: 'first'; text: string }
  | { kind: 'launch'; id: string; text: string }
  | { kind: 'update'; version: string; text: string; notes?: string };

/** UP-13: the release page of a version, where the notes are in full. */
export const releasePage = (version: string) => `https://github.com/AlexandreProthin/lantern/releases/tag/v${version}`;

export interface GreetingLines { first: string; updated: (version: string) => string; pool: readonly { id: string; text: string }[] }

/**
 * `known`: the app has been used before (it has recents), so a state without a version is an update from a version
 * before Amber, not a fresh install. Returns the greeting and the state to save once it is said.
 */
export function greeting(state: AmberState, version: string, known: boolean, lines: GreetingLines, random = Math.random): { greeting: Greeting; next: AmberState } {
  const said = (extra: Partial<AmberState>) => { const next: AmberState = { ...state, lastVersion: version, ...extra }; if (next.notes?.version === version || 'notes' in extra) delete next.notes; return next; };
  if (!state.lastVersion && !known) return { greeting: { kind: 'first', text: lines.first }, next: said({}) };
  if (state.lastVersion !== version) {
    const notes = state.notes?.version === version && state.notes.text.trim() ? state.notes.text.trim() : undefined;
    return { greeting: { kind: 'update', version, text: lines.updated(version), ...(notes ? { notes } : {}) }, next: said({}) };
  }
  const choices = lines.pool.filter(l => l.id !== state.lastGreeting), pick = (choices.length ? choices : lines.pool)[Math.floor(random() * (choices.length || lines.pool.length))];
  return { greeting: { kind: 'launch', id: pick.id, text: pick.text }, next: said({ lastGreeting: pick.id }) };
}
/** CO-31: long notes are cut at a word, about 280 characters; a click shows them in full. */
export function cutNotes(text: string, max = 280): { short: string; cut: boolean } {
  if (text.length <= max) return { short: text, cut: false };
  const at = text.lastIndexOf(' ', max); return { short: text.slice(0, at > max * .6 ? at : max).trimEnd() + '…', cut: true };
}
/** CO-30: about 6 s; notes stay a little longer, by their length, up to 15 s. Hovering pauses the fade. */
export const greetingMs = (g: Greeting, shown: string) => g.kind === 'update' && g.notes ? Math.min(15000, 6000 + shown.length * 30) : 6000;
/** CO-31: the notes of an update being installed, kept for the first launch after it. */
export const keepNotes = (state: AmberState, version: string, notes: string | null): AmberState =>
  notes?.trim() ? { ...state, notes: { version, text: notes.trim().slice(0, NOTES_MAX) } } : state;
