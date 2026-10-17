import { parseModelId } from '../core/models';
import type { ErrorKind } from '../frame/provider';
import { modelChoices } from './model-choices.svelte';
import { strings } from './strings';

const host = (url: string) => { try { return new URL(url).host; } catch { return url; } };
/**
 * CE-40, SE-45: one vocabulary for every failure. A Claude Code call reads exactly as before (`strings.errorKinds`);
 * an endpoint call names its server and says what to do; a web call without Claude Code says research needs it (CE-55).
 */
export function errorMessage(error: { kind: ErrorKind; model?: string }, context: { web?: boolean } = {}): string {
  const { endpointId, model } = parseModelId(error.model ?? '');
  if (endpointId === null) return context.web && error.kind === 'not-installed' ? strings.researchNeedsClaude : strings.errorKinds[error.kind];
  const e = modelChoices.endpoints.find(x => x.id === endpointId), name = e?.name ?? endpointId, m = strings.endpointErrors;
  if (!e) return m.missing(endpointId);
  switch (error.kind) {
    case 'unreachable': return m.unreachable(name, host(e.baseUrl));
    case 'model-unknown': return e.preset === 'ollama' ? m.pull(model, name) : m.noModel(model, name);
    case 'usage-limit': return m.limited(name);
    case 'context-too-long': return m.tooLong(model);
    case 'network': return m.network(name);
    case 'process-crashed': return m.server(name);
    case 'protocol': return m.unreadable(name);
    case 'key-rejected': return m.key(name);
    default: return strings.errorKinds[error.kind];
  }
}
