import type { RoomVisit } from '../../core/model';
import { cells, chooseData, nodesOfKind } from './rules';

/** CR-14, CR-61: the board's counters and what is still missing before a decision. */
export function board(v: RoomVisit) {
  const live = (kind: Parameters<typeof nodesOfKind>[1]) => nodesOfKind(v, kind).filter(n => n.state !== 'dismissed');
  const needs = live('need'), criteria = live('criterion'), products = nodesOfKind(v, 'product');
  const must = criteria.filter(n => n.state === 'must'), nice = criteria.filter(n => n.state === 'nice'), toRank = criteria.filter(n => n.state === 'open');
  const shortlisted = products.filter(n => n.state === 'shortlisted'), chosen = products.find(n => n.state === 'chosen') ?? null;
  const compared = chosen ? [...shortlisted, chosen] : shortlisted;
  const emptyCells = compared.flatMap(p => must.filter(c => !cells(p)[c.id]).map(c => ({ productId: p.id, criterionId: c.id })));
  const openNeeds = needs.filter(n => n.state !== 'answered');
  // CR-61: complete when every need is answered, criteria are ranked with at least one must,
  // two products are shortlisted or one is chosen, and no shortlist × must cell is empty.
  const missing = {
    needs: openNeeds.map(n => n.id), mustCriterion: must.length === 0, toRank: toRank.map(n => n.id),
    shortlist: shortlisted.length < 2 && !chosen, cells: emptyCells,
  };
  const missingCount = missing.needs.length + Number(missing.mustCriterion) + missing.toRank.length + Number(missing.shortlist) + missing.cells.length;
  return { needsAnswered: needs.length - openNeeds.length, needsTotal: needs.length, must: must.length, nice: nice.length,
    irrelevant: criteria.filter(n => n.state === 'irrelevant').length, toRank: toRank.length, criteria: criteria.length,
    shortlisted: shortlisted.length, chosen, status: chooseData(v).status, missing, missingCount, complete: missingCount === 0 };
}
/** CR-25: *4 needs · 6 criteria · 3 shortlisted*. */
export const headerStats = (v: RoomVisit) => { const b = board(v); return { needs: b.needsTotal, criteria: b.criteria, shortlisted: b.shortlisted + (b.chosen ? 1 : 0) }; };
