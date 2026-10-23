import { nodeOf } from '../../core/graph';
import { addLearnChild, setState, toneOf } from './rules';
import { newId, normalizeTitle, now, cloneJson } from '../../core/model';
import type { Generation, RoomVisit, Subject } from '../../core/model';
import { ProviderError, zeroUsage } from '../../frame/provider';
import type { InferenceProvider } from '../../frame/provider';
import { pendingCheck } from './context';
import { parseReply, visibleText } from './protocol';
import type { Task } from './protocol';
import { taskPrompt } from './prompts';
import { fitPrompt } from '../../frame/context-fit';
import { contextSizeOf } from '../../ui/model-choices.svelte';
export interface Running { nodeId: string; task: Task; text: string; controller: AbortController }
export interface SessionNotice { nodeId: string; kind: 'directions' | 'error'; count?: number; error?: ProviderError; retry: () => Promise<void> }
/** LR-1..67: Learn policy. Core operations know nothing of generation or prompts. */
export class LearnSession {
  running: Running | null = null;
  notice: SessionNotice | null = null;
  constructor(public subject: Subject, private provider: InferenceProvider, private changed: () => void,
    private render: () => void = changed, public displayName = '', public budgetTokens = 12_000) {}
  get visit(): RoomVisit { return this.subject.rooms.learn; }
  get focus() { return nodeOf(this.visit, this.visit.focusId); }
  setFocus(id: string): void { nodeOf(this.visit, id); this.visit.focusId = id; this.notice = null; this.changed(); this.render(); }
  busy(id: string): boolean { return this.running?.nodeId === id; }
  touch(): void { this.changed(); this.render(); }
  initialize(): Promise<void> { return this.run('intro', this.visit.rootId); }
  cancel(): void { this.running?.controller.abort(); }
  async run(task: Exclude<Task, 'suggest'>, id: string, message?: string, retry = false, checkOverride?: boolean): Promise<void> {
    if (this.running) throw new Error('A generation is already running');
    const v = this.visit, node = nodeOf(v, id);
    if ((task === 'intro' && (id !== v.rootId || node.state !== 'open')) || (task === 'light' && node.state !== 'open')
      || (['more', 'reply', 'check', 'rewrite'].includes(task) && !['lit', 'understood'].includes(node.state))) throw new Error('Action unavailable for this state');
    if (task === 'light' && id === v.rootId) task = 'intro';
    if (task === 'reply' && !retry) {
      if (!message?.trim()) throw new Error('Message is empty');
      node.dialogue.push({ role: 'user', text: message.trim(), at: now(), author: { kind: 'user', by: this.displayName } });
      this.changed();
    }
    const check = checkOverride ?? pendingCheck(v, id);
    const config = cloneJson({ tone: toneOf(v), model: v.model, effort: v.effort });
    // CE-31: on an endpoint model the map also fits the model's context size.
    // TP-14: for a rewrite, `message` is the learner's optional note on what should change.
    const note = task === 'rewrite' ? message : undefined;
    const prompts = fitPrompt(budgetTokens => taskPrompt(v, task, id, { budgetTokens, note }), this.budgetTokens, contextSizeOf(config.model));
    const generationId = newId(), startedAt = now(), started = performance.now();
    const controller = new AbortController(); this.running = { nodeId: id, task, text: '', controller }; this.notice = null; this.render();
    const retryCall = () => this.run(task, id, note, task === 'reply', check);
    let record: Generation;
    let rawStream = '';
    try {
      const result = await this.provider.stream({ requestId: generationId, ...prompts, model: config.model, effort: config.effort, cancel: controller.signal }, chunk => {
        rawStream += chunk;
        if (this.running?.controller === controller && !controller.signal.aborted) { this.running.text = visibleText(rawStream); this.render(); }
      });
      if (controller.signal.aborted || !Object.hasOwn(this.visit.nodes, id)) throw new ProviderError('cancelled', '', result.model, result.usage, result.durationMs);
      if (result.outcome !== 'ok') throw new ProviderError(result.outcome === 'cancelled' ? 'cancelled' : 'process-crashed', '', result.model, result.usage, result.durationMs);
      const parsed = parseReply(result.text, task, check);
      if (parsed.emptyError) throw new ProviderError('protocol', 'The tutor returned no usable text', result.model, result.usage, result.durationMs);
      // Apply against the graph now, not a stale snapshot. One swap includes all mutations and the log.
      const next = cloneJson(this.visit), target = nodeOf(next, id);
      const author = { kind: 'model' as const, model: result.model, effort: config.effort, generationId };
      if (task === 'intro' || task === 'light') { target.content = parsed.text; target.author = author; setState(next, id, 'lit'); }
      // DM-16: a rewrite keeps the text it replaces as the one previous version; the new text is the model's own.
      if (task === 'rewrite') { target.previous = target.content; target.content = parsed.text; target.author = author; delete target.edited; }
      if (task === 'reply' || task === 'check') target.dialogue.push({ role: 'model', text: parsed.text, at: now(), author });
      if (parsed.understood) setState(next, id, 'understood', 'demonstrated');
      let count = 0;
      for (const opt of parsed.options) {
        if (count === 3) break;
        if (Object.values(next.nodes).some(n => normalizeTitle(n.title) === normalizeTitle(opt.title))) continue;
        addLearnChild(next, id, { ...opt, kind: task === 'intro' ? 'axis' : opt.kind ?? 'deeper', createdBy: 'model' }); count++;
      }
      if (parsed.branch && !Object.values(next.nodes).some(n => normalizeTitle(n.title) === normalizeTitle(parsed.branch!.title))) addLearnChild(next, id, { ...parsed.branch, kind: 'question', createdBy: 'model' });
      record = { id: generationId, nodeId: id, task, effort: config.effort, data: { tone: config.tone }, model: result.model, promptVersion: prompts.promptVersion, startedAt,
        durationMs: result.durationMs, usage: result.usage, ...(result.costUsd !== undefined ? { costUsd: result.costUsd } : {}), ...(result.servedModel ? { servedModel: result.servedModel } : {}), outcome: 'ok' };
      next.log.push(record); this.subject.rooms.learn = next;
      if (['intro', 'light', 'more'].includes(task) && count < 3) this.notice = { nodeId: id, kind: 'directions', count, retry: () => this.run('more', id) };
    } catch (e) {
      const error = e instanceof ProviderError ? e : new ProviderError('protocol', String(e));
      this.visit.log.push({ id: generationId, nodeId: id, task, effort: config.effort, data: { tone: config.tone }, model: error.model || 'unknown', promptVersion: prompts.promptVersion, startedAt,
        durationMs: error.durationMs || Math.round(performance.now() - started), usage: error.usage ?? zeroUsage(), outcome: error.kind === 'cancelled' ? 'cancelled' : 'error' });
      if (error.kind !== 'cancelled') this.notice = { nodeId: id, kind: 'error', error, retry: retryCall };
    } finally { this.running = null; this.changed(); this.render(); }
  }
}
