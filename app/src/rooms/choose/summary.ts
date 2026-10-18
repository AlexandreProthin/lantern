import type { VisitSummary } from '../../core/model';
import type { SubjectSummary } from '../../frame/catalogue';
import type { HistoryEntry, Pick, Status } from './rules';

/** CR-24, CR-25: what Welcome's and Gallery's cards show, read from the room-neutral summary only (ST-7, WG-35). */
export interface ChooseCard {
  status: Status;
  /** The last chosen product; with status `exploring` it is the un-chosen one (CP-2). */
  pick?: Pick; unchosen: boolean;
  history: HistoryEntry[];
  /** The steps bar: needs answered / total, criteria ranked / total, shortlist count (full at 2), pick. */
  steps: { needsAnswered: number; needsTotal: number; criteriaRanked: number; criteriaTotal: number; shortlisted: number; pick: 'none' | 'chosen' | 'bought' };
  /** CR-25: dismissed nodes do not count; shortlisted includes the chosen product. */
  stats: { needs: number; criteria: number; shortlisted: number };
  board: { must: number; nice: number; toRank: number; irrelevant: number; candidates: number; shortlisted: number; rejected: number };
  /** CR-61 as far as the summary can tell (the empty Compare cells are not in it); empty unless exploring. */
  missing: string[]; ready: boolean;
}
export type ChooseSummary = Partial<SubjectSummary> & { choose: ChooseCard };

const count = (states: Record<string, number> | undefined, ...names: string[]) => names.reduce((n, s) => n + (states?.[s] ?? 0), 0);
const isStatus = (s: unknown): s is Status => s === 'exploring' || s === 'decided' || s === 'bought';
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** ST-7, CR-24: Choose's reading of the room-neutral summary. */
export function chooseSummary(s: VisitSummary): ChooseSummary {
  const d = s.data, k = s.kindStates;
  const status: Status = isStatus(d.status) ? d.status : 'exploring';
  const pick = d.pick && typeof d.pick === 'object' ? d.pick as unknown as Pick : undefined;
  const history = Array.isArray(d.history) ? d.history as unknown as HistoryEntry[] : [];
  const needsAnswered = count(k.need, 'answered'), needsTotal = count(k.need, 'open', 'answered');
  const must = count(k.criterion, 'must'), nice = count(k.criterion, 'nice'), irrelevant = count(k.criterion, 'irrelevant'), toRank = count(k.criterion, 'open');
  const chosen = count(k.product, 'chosen'), shortlistedOnly = count(k.product, 'shortlisted');
  const shortlisted = shortlistedOnly + chosen, criteria = must + nice + irrelevant + toRank;
  const missing: string[] = [];
  if (status === 'exploring') {
    if (needsTotal > needsAnswered) missing.push(plural(needsTotal - needsAnswered, 'need to answer', 'needs to answer'));
    if (!must) missing.push('a must criterion');
    if (toRank) missing.push(plural(toRank, 'criterion to rank', 'criteria to rank'));
    if (shortlisted < 2) missing.push(shortlisted ? 'one more product to shortlist' : 'two products to shortlist');
  }
  return {
    input: s.input, output: s.output, tokens: s.tokens, mainModel: s.mainModel, modelOutputs: s.modelOutputs, modelInputs: s.modelInputs, generations: s.generations,
    total: Object.values(s.states).reduce((a, b) => a + b, 0), tone: d.tone as SubjectSummary['tone'],
    choose: {
      status, pick, unchosen: status === 'exploring' && !!pick, history,
      steps: { needsAnswered, needsTotal, criteriaRanked: criteria - toRank, criteriaTotal: criteria, shortlisted, pick: status === 'bought' ? 'bought' : chosen ? 'chosen' : 'none' },
      stats: { needs: needsTotal, criteria, shortlisted },
      board: { must, nice, toRank, irrelevant, candidates: count(k.product, 'candidate'), shortlisted: shortlistedOnly, rejected: count(k.product, 'rejected') },
      missing, ready: status === 'exploring' && !missing.length,
    },
  };
}
/** The card data of a catalogue entry: the summarize result when present, else read from the room's visit summary. */
export const chooseOf = (s: SubjectSummary): ChooseCard | undefined => (s as SubjectSummary & { choose?: ChooseCard }).choose ?? (s.rooms?.choose ? chooseSummary(s.rooms.choose).choose : undefined);
