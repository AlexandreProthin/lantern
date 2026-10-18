import { isEndpointModel, parseModelId } from '../core/models';
import { type EndpointConfig, type WireEndpoint, wireEndpoint } from './endpoints';
import { contextTooLong, promptFits } from './context-fit';
import { type Completion, type EndpointTransport, type InferenceProvider, ProviderError, type Request, type ToolUse } from './provider';

export type Route = { kind: 'claude'; request: Request } | { kind: 'endpoint'; request: Request; endpoint: WireEndpoint } | { kind: 'missing'; endpointId: string };
/**
 * CE-23, CE-55: a model with an endpoint prefix goes to that endpoint with its bare id; any other model is a
 * Claude Code call, sent unchanged. A web call never goes to an endpoint: it runs on the subject's model if that
 * is a Claude Code model, else on the default model if that is one, else on `opus`.
 */
export function route(request: Request, endpoints: readonly EndpointConfig[], defaultModel: string): Route {
  const { endpointId, model } = parseModelId(request.model ?? '');
  if (endpointId === null) return { kind: 'claude', request };
  if (request.web) return { kind: 'claude', request: { ...request, model: isEndpointModel(defaultModel) ? 'opus' : defaultModel } };
  const endpoint = endpoints.find(e => e.id === endpointId);
  return endpoint ? { kind: 'endpoint', request: { ...request, model }, endpoint: wireEndpoint(endpoint, model) } : { kind: 'missing', endpointId };
}
/** The provider every room and Amber call: Claude Code calls keep their own health (SE-42); each endpoint reports its own. */
export class RoutingProvider implements InferenceProvider {
  constructor(private claude: InferenceProvider, private transport: EndpointTransport,
    private config: () => { endpoints: readonly EndpointConfig[]; defaultModel: string },
    private reportEndpoint: (endpointId: string, health: Completion | ProviderError) => void = () => {}) {}
  async stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    const { endpoints, defaultModel } = this.config(); const r = route(request, endpoints, defaultModel);
    if (r.kind === 'claude') return this.claude.stream(r.request, onText, onTool);
    if (r.kind === 'missing') throw new ProviderError('model-unknown', `No endpoint named “${r.endpointId}” is set up in Settings.`, request.model ?? '');
    // CE-33: a prompt that cannot fit the model's set context size is refused before it is sent, never cut by the server.
    if (r.endpoint.contextSize) { const fit = promptFits(r.request.system, r.request.prompt, r.endpoint.contextSize); if (!fit.fits) throw contextTooLong(request.model ?? '', fit.needed, r.endpoint.contextSize); }
    try { const result = await this.transport.streamEndpoint(r.request, r.endpoint, onText); this.reportEndpoint(r.endpoint.id, result); return result; }
    catch (error) { if (error instanceof ProviderError && error.kind !== 'cancelled') this.reportEndpoint(r.endpoint.id, error); throw error; }
  }
}
