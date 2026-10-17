import { displayModel, isEndpointModel, parseModelId } from '../core/models';
import { endpointNames, type EndpointConfig } from '../frame/endpoints';
import { strings } from './strings';

/** CE-22: the endpoints every model picker and model label reads; the Shell keeps it in step with `provider.endpoints`. */
export const modelChoices = $state<{ endpoints: EndpointConfig[] }>({ endpoints: [] });

/** CE-22: each endpoint's pinned models, as picker groups; empty when no endpoint is set, so pickers look as before. */
export function endpointGroups(endpoints: readonly EndpointConfig[] = modelChoices.endpoints) {
  return endpoints.map(e => ({ id: e.id, name: e.name, models: e.models.filter(m => m.pinned).map(m => ({ id: `${e.id}:${m.id}`, label: m.id })) })).filter(g => g.models.length);
}
/** CE-25, CE-56: *Ollama · gemma4:e2b · not evaluated* for an endpoint model; a Claude Code model keeps its name. */
export function endpointAwareName(id: string): string {
  return isEndpointModel(id) ? `${displayModel(id, endpointNames(modelChoices.endpoints))} · ${strings.notEvaluated}` : displayModel(id);
}
/** CE-41: the endpoint's name for an endpoint model; null for a Claude Code model. */
export function endpointNameOf(id: string): string | null {
  const { endpointId } = parseModelId(id);
  return endpointId === null ? null : modelChoices.endpoints.find(e => e.id === endpointId)?.name ?? endpointId;
}
/** CE-30, CE-31: the context size set for an endpoint model; undefined for a Claude Code model or an unknown size. */
export function contextSizeOf(id: string): number | undefined {
  const { endpointId, model } = parseModelId(id);
  return endpointId === null ? undefined : modelChoices.endpoints.find(e => e.id === endpointId)?.models.find(m => m.id === model)?.contextSize;
}
