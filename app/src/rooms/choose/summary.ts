import type { VisitSummary } from '../../core/model';
import type { SubjectSummary } from '../../frame/catalogue';
/** ST-7, CR-24: Choose's reading of the room-neutral summary. Stub: filled in B4 slice 7. */
export function chooseSummary(s: VisitSummary): Partial<SubjectSummary> {
  return { input: s.input, output: s.output, tokens: s.tokens, mainModel: s.mainModel, modelOutputs: s.modelOutputs, generations: s.generations };
}
