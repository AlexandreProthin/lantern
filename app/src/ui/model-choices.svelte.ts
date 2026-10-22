import { CODEX, CODEX_MODELS, displayModel, isEndpointModel, parseModelId } from '../core/models';
import { endpointNames, type EndpointConfig } from '../frame/endpoints';
import { strings } from './strings';

/** CE-22: the endpoints every model picker and model label reads; the Shell keeps it in step with `provider.endpoints` (and `provider.codex`, CE-58). */
export const modelChoices = $state<{ endpoints: EndpointConfig[]; codex: boolean }>({ endpoints: [], codex: false });

/** CE-22: each endpoint's pinned models, as picker groups; empty when no endpoint is set, so pickers look as before. */
export function endpointGroups(endpoints: readonly EndpointConfig[] = modelChoices.endpoints, codex = modelChoices.codex) {
  const groups = endpoints.map(e => ({ id: e.id, name: e.name, models: e.models.filter(m => m.pinned).map(m => ({ id: `${e.id}:${m.id}`, label: m.id })) })).filter(g => g.models.length);
  // CE-58: Codex's models come first after Claude Code's, while Codex is turned on.
  return codex ? [{ id: CODEX, name: strings.codex.title, models: [...CODEX_MODELS] }, ...groups] : groups;
}
/** CE-25, CE-56: *Ollama · gemma4:e2b · not evaluated* for an endpoint model; a Claude Code model keeps its name. */
export function endpointAwareName(id: string): string {
  return isEndpointModel(id) ? `${displayModel(id, endpointNames(modelChoices.endpoints))} · ${strings.notEvaluated}` : displayModel(id);
}
/** CE-41: the endpoint's name for an endpoint model, for the waits a model server has; null for a Claude Code or Codex model (CE-58). */
export function endpointNameOf(id: string): string | null {
  const { endpointId } = parseModelId(id);
  return endpointId === null || endpointId === CODEX ? null : modelChoices.endpoints.find(e => e.id === endpointId)?.name ?? endpointId;
}
/** CE-30, CE-31: the context size set for an endpoint model; undefined for a Claude Code model or an unknown size. */
export function contextSizeOf(id: string): number | undefined {
  const { endpointId, model } = parseModelId(id);
  return endpointId === null ? undefined : modelChoices.endpoints.find(e => e.id === endpointId)?.models.find(m => m.id === model)?.contextSize;
}
