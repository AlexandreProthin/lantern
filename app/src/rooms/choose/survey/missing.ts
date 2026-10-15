import type { RoomVisit } from '../../../core/model';
import { nodeOf } from '../../../core/graph';
import { board } from '../stats';
import { statusOf } from '../rules';
import { t } from './strings';

/** CR-14, CR-61: what is still missing, in the recipe's order, one line each; `area` says which rail counter it marks. */
export interface Missing { area: 'needs' | 'criteria' | 'shortlist'; text: string; id?: string }
export function missingItems(v: RoomVisit): Missing[] {
  const b = board(v), out: Missing[] = [];
  for (const id of b.missing.needs) out.push({ area: 'needs', text: t.missing.answer(nodeOf(v, id).title), id });
  if (b.missing.mustCriterion) out.push({ area: 'criteria', text: b.criteria === 0 ? t.missing.noCriteria : t.missing.noMust });
  for (const id of b.missing.toRank) out.push({ area: 'criteria', text: t.missing.rank(nodeOf(v, id).title), id });
  if (b.missing.shortlist) out.push({ area: 'shortlist', text: b.shortlisted === 1 ? t.missing.shortlist1 : t.missing.shortlist2 });
  if (b.missing.cells.length) out.push({ area: 'shortlist', text: t.missing.cells(b.missing.cells.length) });
  return out;
}
/** The status chip: the subject status, or *ready* when the board is complete and nothing is chosen (CR-61). */
export const stageOf = (v: RoomVisit): 'exploring' | 'ready' | 'decided' | 'bought' => { const s = statusOf(v); return s !== 'exploring' ? s : board(v).complete ? 'ready' : 'exploring'; };
