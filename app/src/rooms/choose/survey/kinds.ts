import type { GraphNode, RoomVisit } from '../../../core/model';
import { chooseData } from '../rules';

/** CR-20, CR-21 (choose-nodes recipe): the ring's four looks plus the faded and quiet ones, by the exact state shown. */
export type Look = 'open' | 'lit' | 'settled' | 'quiet' | 'faded';
export type GlyphState = string;
export const LOOK: Record<string, Look> = {
  open: 'open', candidate: 'open', lit: 'lit', answered: 'settled', must: 'settled', nice: 'settled', shortlisted: 'settled', chosen: 'settled',
  irrelevant: 'quiet', rejected: 'faded', dismissed: 'faded', exploring: 'lit', decided: 'lit', bought: 'settled',
};
/** Recipe motion: faded 0 < open, candidate, irrelevant 1 < lit, exploring, decided 2 < answered, must, nice, shortlisted 3 < chosen, bought 4. */
export const RANK: Record<string, number> = {
  rejected: 0, dismissed: 0, open: 1, candidate: 1, irrelevant: 1, lit: 2, exploring: 2, decided: 2,
  answered: 3, must: 3, nice: 3, shortlisted: 3, chosen: 4, bought: 4,
};
/** The rim badge's glyph by state; none for open, candidate, lit and dismissed. */
export const BADGE_OF: Record<string, string | undefined> = {
  answered: 'answered', must: 'must', nice: 'nice', irrelevant: 'irrelevant', shortlisted: 'shortlisted', chosen: 'chosen', rejected: 'rejected',
  exploring: 'exploring', decided: 'decided', bought: 'bought',
};
/** The subject shows its status (CR-24); every other node its state. */
export const glyphState = (n: Pick<GraphNode, 'id' | 'kind' | 'state'>, v: RoomVisit): GlyphState => n.kind === 'subject' && n.id === v.rootId ? chooseData(v).status : n.state;
/** A glow comes with lit, the chosen product and a subject that is exploring or decided. */
export const hasGlow = (state: GlyphState) => LOOK[state] === 'lit' || state === 'chosen';
