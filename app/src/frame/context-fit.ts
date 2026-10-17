import { ProviderError } from './provider';

/** CA-11: the same conservative estimate the map budget uses. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3);
/** CE-31: room left for the reply, a quarter of a small window, at most 4096 tokens. */
export const replyRoom = (contextSize: number) => Math.min(4096, Math.floor(contextSize / 4));
/** CE-31, CE-33: whether a prompt fits a model's context size with room for the reply. */
export function promptFits(system: string, prompt: string, contextSize: number): { fits: boolean; needed: number; limit: number } {
  const needed = estimateTokens(system) + estimateTokens(prompt), limit = contextSize - replyRoom(contextSize);
  return { fits: needed <= limit, needed, limit };
}
/**
 * CE-31: a room's prompt, with its map budget (CA-10) lowered until the whole prompt fits the model's context size.
 * The map shrinks through the room's own reduced form; nothing is cut. Without a known size, the prompt is built as before.
 */
export function fitPrompt<P extends { system: string; prompt: string }>(build: (budgetTokens: number) => P, budgetTokens: number, contextSize?: number): P {
  let prompt = build(budgetTokens);
  if (!contextSize) return prompt;
  for (let budget = budgetTokens, tries = 0; tries < 4; tries++) {
    const { fits, needed, limit } = promptFits(prompt.system, prompt.prompt, contextSize);
    if (fits || budget === 0) return prompt;
    budget = Math.max(0, budget - (needed - limit) - 200);
    prompt = build(budget);
  }
  return prompt;
}
/** CE-33: refused before sending, with how to raise the size. */
export function contextTooLong(model: string, needed: number, contextSize: number): ProviderError {
  return new ProviderError('context-too-long', `This prompt needs about ${needed} tokens plus room for the reply; ${model} is set to ${contextSize}. Raise its context size in Settings → Provider → Endpoints.`, model);
}
