import { parseModelId } from '../core/models';
import { isCloudEndpoint } from './endpoints';
import { modelChoices } from '../ui/model-choices.svelte';
import { strings } from '../ui/strings';
import { tokens } from './library-format';

export interface TokenPair { input: number; output: number }
export interface TokenSplit { claude: TokenPair; local: TokenPair }
/**
 * CE-53, cloud slice 4: a model is local when it runs on an endpoint on this machine or the local network. NVIDIA and
 * other cloud endpoints count with Claude. A record from an endpoint that is no longer set up counts as local, unless
 * its id is a preset's own (`nvidia`, `nvidia-2`).
 */
export function isLocalModel(id: string): boolean {
  const { endpointId } = parseModelId(id); if (endpointId === null) return false;
  const e = modelChoices.endpoints.find(x => x.id === endpointId);
  return e ? !isCloudEndpoint(e) : !/^nvidia(-\d+)?$/.test(endpointId);
}
/** CE-53: Claude and local tokens apart, or null while no local token has been spent (the figures then look as before). */
export function splitTokens(entries: Iterable<readonly [model: string, input: number, output: number]>): TokenSplit | null {
  const claude = { input: 0, output: 0 }, local = { input: 0, output: 0 };
  for (const [model, input, output] of entries) { const to = isLocalModel(model) ? local : claude; to.input += input; to.output += output; }
  return local.input + local.output > 0 ? { claude, local } : null;
}
/** From a summary's per-model figures (ST-7, SE-51). */
export const splitSummary = (s: { modelInputs?: Record<string, number>; modelOutputs?: Record<string, number> }) =>
  splitTokens([...new Set([...Object.keys(s.modelInputs ?? {}), ...Object.keys(s.modelOutputs ?? {})])].map(m => [m, s.modelInputs?.[m] ?? 0, s.modelOutputs?.[m] ?? 0] as const));
/** From a generation log (the header's stats hover). */
export const splitLog = (log: readonly { model: string; usage: TokenPair }[]) => splitTokens(log.map(g => [g.model, g.usage.input, g.usage.output] as const));
/** From Amber's per-model totals (CO-47). */
export const splitModels = (models: Record<string, TokenPair> = {}) => splitTokens(Object.entries(models).map(([m, t]) => [m, t.input, t.output] as const));

/** *48.3k in / 21.0k out*, or *Claude 40.1k in / 20.2k out · local 8.2k in / 0.8k out*. */
export function inOutText(input: number, output: number, split: TokenSplit | null): string {
  if (!split) return strings.inOut(tokens(input), tokens(output));
  return strings.tokenSplit(strings.inOut(tokens(split.claude.input), tokens(split.claude.output)), strings.inOut(tokens(split.local.input), tokens(split.local.output)));
}
/** *69.3k*, or *Claude 60.3k · local 9.0k*. */
export function totalText(total: number, split: TokenSplit | null): string {
  return split ? strings.tokenSplit(tokens(split.claude.input + split.claude.output), tokens(split.local.input + split.local.output)) : tokens(total);
}
