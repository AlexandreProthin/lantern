import { nodeOf } from '../../core/graph';
import { cloneJson, newId, normalizeTitle, now } from '../../core/model';
import type { Generation, GraphNode, RoomVisit, Subject } from '../../core/model';
import { ProviderError, zeroUsage } from '../../frame/provider';
import type { Completion, InferenceProvider, ToolUse } from '../../frame/provider';
import { addChooseChild, answerNeed, cells, chooseProduct, kindOf, markBought, normalize, rejectProduct, restoreProduct, setNeedsNote, setState,
  toneOf, unchooseProduct } from './rules';
import type { Cell, NodeKind, Task } from './rules';
import { fresh, inTarget, liveCells, parseReply, placeProducts, recommendedProduct, visibleText } from './protocol';
import type { CellEntry, Recommendation } from './protocol';
import { fillTarget } from './context';
import type { Slot } from './context';
import { taskPrompt } from './prompts';
import { fitPrompt } from '../../frame/context-fit';
import { contextSizeOf } from '../../ui/model-choices.svelte';

/** One call in flight: the main lane (LR-40) or the research lane (CP-41). `progress` is the last tool use (IP-13). */
export interface Running { nodeId: string; task: Task; text: string; web: boolean; progress: ToolUse | null; controller: AbortController }
export interface Research extends Running { slots: Slot[] }
export interface SessionNotice { nodeId: string; kind: 'directions' | 'error'; count?: number; error?: ProviderError; retry: () => Promise<void> }
/** CP-30.4: a need the model offered to record; the user adds or ignores it. */
export interface NeedOffer { nodeId: string; question: string; answer: string }
export interface RunOptions { message?: string; turn?: number; cell?: Slot; retry?: boolean }
/** The research tasks of CR-40 that get the web when *Use the web* is on (CP-10). */
const RESEARCH: Task[] = ['find', 'fill', 'check'];
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const slotKey = (s: Slot) => `${s.productId}×${s.criterionId}`;

/** CR-80, CP-10 to CP-41: Choose's policy over the core graph. */
export class ChooseSession {
  running: Running | null = null;
  research: Research | null = null;
  /** CP-40: queued fills, one group per product column or criterion row, oldest first. */
  queue: { key: string; slots: Slot[] }[] = [];
  notice: SessionNotice | null = null;
  needOffer: NeedOffer | null = null;
  recommendation: (Recommendation & { productId: string | null }) | null = null;
  constructor(public subject: Subject, private provider: InferenceProvider, private changed: () => void, private render: () => void = changed,
    public displayName = '', public budgetTokens = 12_000, public useWeb: () => boolean = () => true, public today: () => string = localToday) {}
  get visit(): RoomVisit { return this.subject.rooms.choose; }
  get focus() { return nodeOf(this.visit, this.visit.focusId); }
  setFocus(id: string): void { nodeOf(this.visit, id); this.visit.focusId = id; this.notice = null; this.commit(); }
  busy(id: string): boolean { return this.running?.nodeId === id; }
  /** CP-41: cells the research lane is filling now, shown striped. */
  filling(): Set<string> { return new Set(this.research?.slots.map(slotKey) ?? []); }
  touch(): void { this.commit(); }
  initialize(): Promise<void> { return this.run('intro', this.visit.rootId); }
  cancel(): void { this.running?.controller.abort(); }
  /** CP-40: Cancel in the research line stops the running fill and drops the queue. */
  cancelResearch(): void { this.queue = []; this.research?.controller.abort(); this.render(); }
  private commit(): void { normalize(this.visit); this.changed(); this.render(); }
  /** CP-10: web only for research tasks, and only when the room's *Use the web* is on. */
  webFor(task: Task): boolean { return RESEARCH.includes(task) && this.useWeb(); }

  /** CP-10: `light` on a family and `more` under a family are a `find`. */
  private resolve(task: Task, n: GraphNode): Task {
    if (task === 'light' && n.kind === 'family') return 'find';
    if (task === 'more' && n.kind === 'family') return 'find';
    return task;
  }
  private allowed(task: Task, n: GraphNode, v: RoomVisit, o: RunOptions): boolean {
    const kind = kindOf(n);
    switch (task) {
      case 'intro': return n.id === v.rootId && n.state === 'open';
      case 'light': return (['concept', 'own'].includes(kind) && n.state === 'open') || (['need', 'criterion'].includes(kind) && n.state !== 'dismissed');
      case 'find': return n.id === v.rootId ? n.state === 'lit' : kind === 'family' && n.state !== 'dismissed';
      case 'more': return n.state === 'lit';
      case 'reply': return !!o.message?.trim() || !!o.retry;
      case 'check': return this.useWeb() && n.state !== 'dismissed' && (o.turn === undefined || n.dialogue[o.turn]?.role === 'model');
      case 'recommend': return n.id === v.rootId;
      default: return false;
    }
  }

  /** LR-1, LR-2, LR-40 for the main lane: atomic results, nothing stored before `ok`, one call at a time. */
  async run(requested: Task, id: string, o: RunOptions = {}): Promise<void> {
    if (this.running) throw new Error('A generation is already running');
    if (requested === 'fill') throw new Error('Fills run in the research lane');
    const v = this.visit, node = nodeOf(v, id), task = this.resolve(requested, node);
    if (!this.allowed(task, node, v, o)) throw new Error('Action unavailable for this state');
    if (task === 'reply' && !o.retry) {
      node.dialogue.push({ role: 'user', text: o.message!.trim(), at: now(), author: { kind: 'user', by: this.displayName } });
      this.commit();
    }
    const web = this.webFor(task), controller = new AbortController();
    this.running = { nodeId: id, task, text: '', web, progress: null, controller }; this.notice = null; this.needOffer = null; this.render();
    const retry = () => this.run(requested, id, { ...o, retry: task === 'reply' });
    await this.call(this.running, () => this.running?.controller === controller, (result, next, gid) => this.apply(next, task, id, result, o, web, gid), retry, { turn: o.turn });
    this.running = null; this.commit();
  }

  /** CP-40: queue the empty cells of a column, a row or every shortlisted product, then pump the lane. */
  queueFill(slots: Slot[]): void {
    const queued = new Set(this.queue.flatMap(g => g.slots.map(slotKey)));
    for (const s of slots) {
      if (queued.has(slotKey(s)) || this.filling().has(slotKey(s))) continue;
      queued.add(slotKey(s));
      const key = `p:${s.productId}`, group = this.queue.find(g => g.key === key);
      if (group) group.slots.push(s); else this.queue.push({ key, slots: [s] });
    }
    void this.pump();
  }
  /** CP-40: a row queued by ranking a criterion is one group, not one call per product. */
  private queueRow(criterionId: string): void {
    const slots = fillTarget(this.visit, criterionId).filter(s => !this.queue.some(g => g.slots.some(q => slotKey(q) === slotKey(s))));
    if (slots.length) { this.queue.push({ key: `c:${criterionId}`, slots }); void this.pump(); }
  }
  /** CP-41: one fill at a time per subject, beside the main lane. */
  private async pump(): Promise<void> {
    if (this.research) return;
    const group = this.queue.shift(); if (!group) { this.render(); return; }
    const slots = group.slots.filter(s => !cells(this.visit.nodes[s.productId] ?? ({} as GraphNode))[s.criterionId] && this.visit.nodes[s.productId] && this.visit.nodes[s.criterionId]);
    if (!slots.length) return this.pump();
    const focusId = group.key.startsWith('c:') ? group.key.slice(2) : slots[0].productId, controller = new AbortController();
    const lane: Research = { nodeId: focusId, task: 'fill', text: '', web: this.webFor('fill'), progress: null, controller, slots };
    this.research = lane; this.render();
    await this.call(lane, () => this.research === lane, (result, next, gid) => this.applyCells(next, inTarget(liveCells(next, parseReply(result.text, 'fill', { today: this.today(), web: lane.web }).cells), slots), gid), () => { this.queueFill(slots); return Promise.resolve(); }, { target: slots });
    this.research = null; this.commit(); void this.pump();
  }

  /** The shared call: stream, log every outcome (LR-3, DM-32), apply on a copy and swap it in (LR-1). */
  private async call(lane: Running, current: () => boolean, apply: (result: Completion, next: RoomVisit, generationId: string) => void, retry: () => Promise<void>, extra: { turn?: number; target?: Slot[] } = {}): Promise<void> {
    const v = this.visit, id = lane.nodeId, generationId = newId(), startedAt = now(), started = performance.now(), tone = toneOf(v);
    // CE-31: on an endpoint model the map also fits the model's context size (research runs on Claude Code, CE-55).
    const prompts = fitPrompt(budgetTokens => taskPrompt(v, lane.task, id, { budgetTokens, today: this.today(), web: lane.web, ...extra }), this.budgetTokens, lane.web ? undefined : contextSizeOf(v.model));
    let raw = '';
    const record = (r: { model: string; usage: Generation['usage']; durationMs: number; costUsd?: number; toolCalls?: Record<string, number> }, outcome: Generation['outcome']): Generation => ({
      id: generationId, nodeId: id, task: lane.task, effort: v.effort, model: r.model || 'unknown', promptVersion: prompts.promptVersion, startedAt,
      durationMs: r.durationMs || Math.round(performance.now() - started), usage: r.usage ?? zeroUsage(), ...(r.costUsd !== undefined ? { costUsd: r.costUsd } : {}),
      ...(r.toolCalls && Object.keys(r.toolCalls).length ? { toolCalls: r.toolCalls } : {}), outcome, data: { tone, web: lane.web } });
    try {
      const result = await this.provider.stream({ requestId: generationId, system: prompts.system, prompt: prompts.prompt, model: v.model, effort: v.effort, web: lane.web, cancel: lane.controller.signal },
        chunk => { raw += chunk; if (current() && !lane.controller.signal.aborted) { lane.text = visibleText(raw); this.render(); } },
        // IP-13, CP-32: a tool use closes the text before it; the answer is what follows the last one.
        tool => { raw = ''; if (current()) { lane.text = ''; lane.progress = tool; this.render(); } });
      if (lane.controller.signal.aborted || !Object.hasOwn(this.visit.nodes, id)) throw new ProviderError('cancelled', '', result.model, result.usage, result.durationMs, result.toolCalls);
      if (result.outcome !== 'ok') throw new ProviderError(result.outcome === 'cancelled' ? 'cancelled' : 'process-crashed', '', result.model, result.usage, result.durationMs, result.toolCalls);
      const next = cloneJson(this.visit);
      apply(result, next, generationId);
      next.log.push(record(result, 'ok')); normalize(next); this.subject.rooms.choose = next;
    } catch (e) {
      const error = e instanceof ProviderError ? e : new ProviderError('protocol', String(e));
      this.visit.log.push(record(error, error.kind === 'cancelled' ? 'cancelled' : 'error'));
      if (error.kind !== 'cancelled') this.notice = { nodeId: id, kind: 'error', error, retry };
    }
  }

  /** CP-30: what each task's blocks do to the graph, checked against the graph as it is now (LR-43). */
  private apply(next: RoomVisit, task: Task, id: string, result: Completion, o: RunOptions, web: boolean, generationId: string): void {
    const target = nodeOf(next, id), kind = kindOf(target);
    const parsed = parseReply(result.text, task, { today: this.today(), web, focusKind: kind });
    if (parsed.emptyError) throw new ProviderError('protocol', 'The model returned no usable text', result.model, result.usage, result.durationMs, result.toolCalls);
    const by = { kind: 'model' as const, model: result.model, effort: next.effort, generationId };
    const grow = (options: { title: string; hook: string; kind: NodeKind }[], parentId: string) => {
      let count = 0;
      for (const opt of fresh(next, options)) { addChooseChild(next, parentId, { ...opt, createdBy: 'model' }); count++; }
      return count;
    };
    let grown = -1;
    if (task === 'intro' || (task === 'light' && ['concept', 'own'].includes(kind))) {
      target.content = parsed.text; target.author = by; setState(next, id, 'lit'); grown = grow(parsed.options, id);
    } else if (task === 'light') { target.content = parsed.text; target.author = by; }
    else if (task === 'more') grown = grow(parsed.options, id);
    else if (task === 'find') {
      if (kind === 'family' && parsed.text) { target.content = parsed.text; target.author = by; if (target.state === 'open') setState(next, id, 'lit'); }
      grown = 0; const families = new Map<string, string>();
      for (const p of placeProducts(next, parsed.products, id)) {
        // CP-30.2: products naming the same new family share the one created for the first of them.
        const key = normalizeTitle(p.newFamily ?? '');
        const parentId = p.parentId ?? families.get(key) ?? addChooseChild(next, next.rootId, { title: p.newFamily!, kind: 'family', createdBy: 'model' }).id;
        if (p.newFamily) families.set(key, parentId);
        const product = addChooseChild(next, parentId, { title: p.product.title, hook: p.product.hook, kind: 'product', createdBy: 'model' });
        if (p.product.facts.length) product.data = { facts: p.product.facts };
        grown++;
      }
    } else if (task === 'reply' || task === 'check' || task === 'recommend') {
      target.dialogue.push({ role: 'model', text: parsed.text, at: now(), author: by });
      if (task === 'reply') {
        if (parsed.need) this.needOffer = { nodeId: id, ...parsed.need };
        if (parsed.branch && !Object.values(next.nodes).some(n => normalizeTitle(n.title) === normalizeTitle(parsed.branch!.title))) addChooseChild(next, id, { ...parsed.branch, createdBy: 'model' });
      }
      if (task === 'check') {
        // CP-13: a check refreshes the room's facts or cells, never the user's values; a cell check keeps only that cell.
        if (kind === 'product' && parsed.facts.length) target.data = { ...target.data, facts: parsed.facts };
        const checked = liveCells(next, parsed.cells).filter(c => !o.cell || (c.product === o.cell.productId && c.criterion === o.cell.criterionId));
        this.applyCells(next, checked, generationId);
      }
      if (task === 'recommend') this.recommendation = parsed.recommend ? { ...parsed.recommend, productId: recommendedProduct(next, parsed.recommend) } : null;
    }
    if (grown >= 0 && grown < 3 && ['intro', 'light', 'more'].includes(task) && !(task === 'light' && ['need', 'criterion'].includes(kind)))
      this.notice = { nodeId: id, kind: 'directions', count: grown, retry: () => this.run('more', id) };
  }
  /** CP-5, CP-13: the room's value is written; a user's value stays beside it. */
  private applyCells(next: RoomVisit, entries: CellEntry[], generationId: string): void {
    for (const e of entries) {
      const product = nodeOf(next, e.product), previous = cells(product)[e.criterion];
      const cell: Cell = { value: e.value, ...(e.note ? { note: e.note } : {}), ...(e.disagree ? { disagree: true } : {}), sources: e.sources,
        ...(previous?.user ? { user: previous.user } : {}), generationId, at: now() };
      product.data = { ...product.data, cells: { ...cells(product), [e.criterion]: cell } };
    }
  }

  // User actions (CR-21 to CR-24, CR-51, CP-30.4). Each one saves; shortlisting and ranking queue fills (CP-40).
  shortlist(id: string): void { setState(this.visit, id, 'shortlisted'); this.commit(); this.queueFill(fillTarget(this.visit, id)); }
  unshortlist(id: string): void { setState(this.visit, id, 'candidate'); this.commit(); }
  rank(id: string, state: 'must' | 'nice' | 'irrelevant'): void { setState(this.visit, id, state); this.commit(); if (state !== 'irrelevant') this.queueRow(id); }
  fillCompare(): void { this.queueFill(fillTarget(this.visit, this.visit.rootId)); }
  answer(id: string, text: string): void { answerNeed(this.visit, id, text, this.displayName); this.commit(); }
  addOfferedNeed(): void {
    const offer = this.needOffer; if (!offer) return;
    const need = addChooseChild(this.visit, this.visit.rootId, { title: offer.question, kind: 'need', createdBy: 'user', author: { kind: 'user', by: this.displayName } });
    answerNeed(this.visit, need.id, offer.answer, this.displayName); this.needOffer = null; this.commit();
  }
  ignoreOfferedNeed(): void { this.needOffer = null; this.render(); }
  setNeedsNote(text: string): void { setNeedsNote(this.visit, text); this.commit(); }
  reject(id: string, reason: string): void { rejectProduct(this.visit, id, reason); this.commit(); }
  restore(id: string): void { restoreProduct(this.visit, id); this.commit(); }
  choose(id: string): void { chooseProduct(this.visit, id); this.commit(); }
  unchoose(id: string): void { unchooseProduct(this.visit, id); this.commit(); }
  bought(): void { markBought(this.visit); this.commit(); }
  dismiss(id: string): void { setState(this.visit, id, 'dismissed'); this.commit(); }
  undismiss(id: string): void { setState(this.visit, id, 'open'); this.commit(); }
  /** CR-51, DM-16: the user's value goes beside the room's, which stays. */
  saveCell(slot: Slot, value: string): void {
    value = value.trim(); if (!value || [...value].length > 160) throw new Error('Invalid value');
    const product = nodeOf(this.visit, slot.productId), cell = cells(product)[slot.criterionId] ?? { value: null, sources: [], generationId: '', at: now() };
    product.data = { ...product.data, cells: { ...cells(product), [slot.criterionId]: { ...cell, user: { value, at: now(), by: this.displayName } } } };
    this.commit();
  }
  revertCell(slot: Slot): void {
    const product = nodeOf(this.visit, slot.productId), cell = cells(product)[slot.criterionId]; if (!cell?.user) return;
    const { user: _, ...room } = cell;
    product.data = { ...product.data, cells: { ...cells(product), [slot.criterionId]: room } }; this.commit();
  }
}
