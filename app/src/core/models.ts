/** SE-48: the static model list shared by every model picker. The value is what the CLI receives. */
export const MODELS: readonly { id: string; label: string }[] = [
  { id: 'opus', label: 'Opus (latest)' },
  { id: 'sonnet', label: 'Sonnet (latest)' },
  { id: 'haiku', label: 'Haiku (latest)' },
  { id: 'claude-fable-5-1', label: 'Fable 5.1' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5' },
  { id: 'claude-opus-5', label: 'Opus 5' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' }
];
export const isListedModel = (id: string) => MODELS.some(m => m.id === id);
/** CE-58: Codex models are `codex:<model>`, a prefix no endpoint may take; `codex:default` lets Codex choose. */
export const CODEX = 'codex';
export const CODEX_DEFAULT = 'default';
export const CODEX_MODELS: readonly { id: string; label: string }[] = [
  { id: 'codex:default', label: 'Codex default' },
  { id: 'codex:gpt-6.1-sol', label: 'GPT-6.1 Sol' },
  { id: 'codex:gpt-6-astra', label: 'GPT-6 Astra' },
  { id: 'codex:gpt-6-luna', label: 'GPT-6 Luna' }
];
export const isCodexModel = (id: string) => parseModelId(id).endpointId === CODEX;
/** Same rule as provider.defaultModel (settings catalogue). */
/** `/` is allowed for endpoint ids such as `nvidia:google/gemma-…` (settings, amended 2026-10-17). */
export const isValidModel = (id: string) => /^[A-Za-z0-9._:/-]{1,100}$/.test(id);
/** CE-23: an endpoint model is `<endpointId>:<model>`, split at the first `:` (Ollama tags hold `:` too). Claude Code ids have no `:`. A Codex model reads as one too (CE-58). */
export function parseModelId(id: string): { endpointId: string | null; model: string } {
  const at = id.indexOf(':');
  return at > 0 ? { endpointId: id.slice(0, at), model: id.slice(at + 1) } : { endpointId: null, model: id };
}
/** Whether the model is not a Claude Code one: an endpoint's or Codex's. */
export const isEndpointModel = (id: string) => parseModelId(id).endpointId !== null;
/** CE-22, CE-25: *Ollama · gemma4:e2b* for an endpoint model, `modelName` for a Claude Code one. */
export function displayModel(id: string, endpointNames: Readonly<Record<string, string>> = {}): string {
  const { endpointId, model } = parseModelId(id);
  if (endpointId === CODEX) return `Codex · ${CODEX_MODELS.find(m => m.id === id)?.label ?? model}`;
  return endpointId === null ? modelName(id) : `${endpointNames[endpointId] ?? endpointId} · ${model}`;
}

/** Display name of a stored or resolved id; the stored value is never rewritten. */
export function modelName(id: string): string {
  const match = /^(?:claude-)?(opus|sonnet|haiku|fable|mythos)(?:-(\d{1,2})(?:-(\d{1,2}))?)?(?:-\d{8})?$/i.exec(id);
  if (!match) return id;
  const family = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return match[2] ? `${family} ${match[2]}${match[3] ? '.' + match[3] : ''}` : family;
}
