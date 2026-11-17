import type { RoomVisit } from '../../core/model';
import type { AmberState } from './state';
/**
 * CO-37 to CO-39 (added 2026-11-17): Amber's rare nudges. Rooms write the rules and the lines (`RoomCompanion.nudges`);
 * the frame decides when one may be said. Pure, so the rate limits are unit-tested.
 */
export interface NudgeRule {
  /** Stable: a nudge is remembered as seen by its id and the subject's (SE-50). */
  id: string;
  /** The space it is said in. */
  space: string;
  /** The line when the rule holds for this visit, else null. Called on a quiet moment, never per frame. */
  line: (visit: RoomVisit) => string | null;
}
/** A nudge waits for this long without typing or a change to the subject before it is said. */
export const NUDGE_QUIET = 8000;
/** At most one nudge in this long, whatever the subject. */
export const NUDGE_GAP = 10 * 60_000;
/** A nudge said fades after this long, unless the pointer rests on it. */
export const NUDGE_MS = 15000;
export interface NudgeMoment {
  /** Amber shown and its tips and nudges on (CO-1, CO-39). */
  on: boolean;
  /** A generation of the open subject is running (CO-38). */
  generating: boolean;
  /** The user typed within NUDGE_QUIET, or a field they are writing in is not empty (CO-38). */
  typing: boolean;
  /** Amber is saying something else, its bubble or menu is open, or it is moving. */
  busy: boolean;
  /** This opening of the subject already had its nudge (CO-38). */
  sessionNudged: boolean;
  /** Since the last nudge of this launch, in ms (Infinity before the first). */
  sinceLast: number;
}
/** The id a seen nudge is kept under: the rule and the subject, in the state file's id alphabet. */
export const nudgeKey = (rule: string, subject: string) => `${rule}/${subject}`.replace(/[^A-Za-z0-9._:/-]/g, '-').slice(0, 80);
export const mayNudge = (m: NudgeMoment) => m.on && !m.generating && !m.typing && !m.busy && !m.sessionNudged && m.sinceLast >= NUDGE_GAP;
/** CO-37, CO-38: the first rule of this space that holds and was never said for this subject, if a nudge may be said now. */
export function pickNudge(rules: readonly NudgeRule[] | undefined, space: string, subject: string, visit: RoomVisit, state: AmberState, moment: NudgeMoment): { key: string; text: string } | null {
  if (!rules?.length || !mayNudge(moment)) return null;
  for (const rule of rules) {
    if (rule.space !== space) continue;
    const key = nudgeKey(rule.id, subject);
    if (state.seenNudges?.includes(key)) continue;
    const text = rule.line(visit);
    if (text) return { key, text };
  }
  return null;
}
/** A nudge being said goes when its rule stops holding (the user did what it suggested). */
export function stillHolds(rules: readonly NudgeRule[] | undefined, key: string, subject: string, visit: RoomVisit): boolean {
  const rule = rules?.find(r => nudgeKey(r.id, subject) === key);
  return !!rule && rule.line(visit) !== null;
}
/** CO-38: typing is a key pressed within NUDGE_QUIET, or a focused field with text in it (`draft`: its text, or null). */
export const typingNow = (lastKey: number, now: number, draft: string | null, quiet = NUDGE_QUIET) => now - lastKey < quiet || !!draft?.trim();
/** The text of the focused field, if the focus is in one. */
export function draftOf(focused: Element | null): string | null {
  if (!focused) return null;
  if (focused instanceof HTMLTextAreaElement) return focused.value;
  if (focused instanceof HTMLInputElement) return ['text', 'search', 'url', 'email'].includes(focused.type) ? focused.value : null;
  return focused instanceof HTMLElement && focused.isContentEditable ? focused.textContent : null;
}
