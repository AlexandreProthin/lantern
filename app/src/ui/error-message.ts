import { CODEX, parseModelId } from '../core/models';
import type { ErrorKind } from '../frame/provider';
import { modelChoices } from './model-choices.svelte';
import { strings } from './strings';

const host = (url: string) => { try { return new URL(url).host; } catch { return url; } };
/** CE-40: Rust appends the server's `Retry-After` to the details as *(retry after N)*; only a number of seconds is read. */
function retryAfter(details = ''): string {
  const s = Number(/\(retry after (\d{1,6})\)/.exec(details)?.[1]); if (!s) return '';
  return s < 90 ? `${s} seconds` : `about ${Math.round(s / 60)} minutes`;
}
/**
 * CE-40, SE-45: one vocabulary for every failure. A Claude Code call reads exactly as before (`strings.errorKinds`);
 * an endpoint call names its server and says what to do; a web call without Claude Code says research needs it (CE-55).
 */
export function errorMessage(error: { kind: ErrorKind; model?: string; details?: string }, context: { web?: boolean } = {}): string {
  const { endpointId, model } = parseModelId(error.model ?? '');
  if (endpointId === null) return context.web && error.kind === 'not-installed' ? strings.researchNeedsClaude : strings.errorKinds[error.kind];
  // CE-58: Codex speaks for itself, in the CLI's vocabulary.
  if (endpointId === CODEX) return error.kind === 'model-unknown' ? strings.codex.modelUnknown(model) : strings.codex.errors[error.kind] ?? strings.errorKinds[error.kind];
  const e = modelChoices.endpoints.find(x => x.id === endpointId), name = e?.name ?? endpointId, m = strings.endpointErrors;
  if (!e) return m.missing(endpointId);
  // CE-80: Rust refused plain http to an address that is not this machine nor a confirmed LAN address.
  if (error.kind === 'protocol' && error.details?.startsWith('Lantern sends http://')) return strings.lanHint;
  switch (error.kind) {
    case 'unreachable': return m.unreachable(name, host(e.baseUrl));
    case 'model-unknown': return e.preset === 'ollama' ? m.pull(model, name) : m.noModel(model, name);
    case 'usage-limit': { const wait = retryAfter(error.details); return wait ? m.limitedFor(name, wait) : m.limited(name); }
    case 'context-too-long': return m.tooLong(model);
    case 'network': return m.network(name);
    case 'process-crashed': return m.server(name);
    case 'protocol': return m.unreadable(name);
    // CE-72: Rust refused before sending, for want of a key or because the key belongs to another address.
    case 'key-rejected': return error.details?.includes('needs an API key') ? m.keyMissing(name) : error.details?.includes('Lantern does not send it') || error.details?.includes('only sent over https') ? m.keyElsewhere(name) : m.key(name);
    default: return strings.errorKinds[error.kind];
  }
}
