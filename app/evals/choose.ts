// CP-60, CP-61: the choose-1 evals, every case on the default model, research cases twice. Run by hand (PQ-34).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import type { RoomVisit } from '../src/core/model';
import { normalizeTitle } from '../src/core/model';
import { addChooseChild, answerNeed, newChooseSubject, setPriceCriterion, setState, validateChoose } from '../src/rooms/choose/rules';
import type { Cell, NodeKind, Source, Task } from '../src/rooms/choose/rules';
import { taskPrompt, promptVersion } from '../src/rooms/choose/prompts';
import { nodeLinks, parseReply, recommendedProduct } from '../src/rooms/choose/protocol';
import type { Slot } from '../src/rooms/choose/context';

const args = process.argv.slice(2), argument = (name: string, fallback: string) => args.includes(name) ? args[args.indexOf(name) + 1] ?? fallback : fallback;
const model = argument('--model', 'opus'), effort = argument('--effort', 'medium'), runs = Number(argument('--runs', '3')), only = argument('--only', '');
if (!Number.isInteger(runs) || runs < 1 || runs > 3) throw new Error('--runs must be 1 to 3');
const executable = process.env.LANTERN_CLAUDE ?? join(homedir(), '.local', 'bin', 'claude.exe');
if (!existsSync(executable)) throw new Error('Set LANTERN_CLAUDE to the installed CLI executable');
const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The fixture of CP-60: needs answered, criteria ranked, 3 shortlisted with their must cells filled.
const READ = '2026-10-10', src = (name: string, url: string, kind: Source['kind'] = 'manufacturer'): Source => ({ kind, name, url, read: READ });
const cell = (value: string, sources: Source[], extra: Partial<Cell> = {}): Cell => ({ value, sources, generationId: 'fixture', at: '2026-10-10T10:00:00.000Z', ...extra });
function printer(title = '3D printer', options: { openNeed?: boolean; fourth?: boolean; noise?: boolean } = {}) {
  const s = newChooseSubject(title, { tone: 'curious', model, effort: effort as 'medium', locale: { country: 'FR', currency: 'EUR' }, needsNote: 'Budget about 500 €, figurines and toys for my kids.' }, 'Alex');
  const v = s.rooms.choose, root = v.rootId, ids: Record<string, string> = {};
  setState(v, root, 'lit'); v.nodes[root].content = 'A home 3D printer melts plastic filament layer by layer. What decides a choice here: build volume, how much tinkering it needs, and price.';
  const add = (key: string, kind: NodeKind, t: string, hook = '', parent = root) => { ids[key] = addChooseChild(v, parent, { title: t, hook, kind, createdBy: 'model' }).id; return ids[key]; };
  add('budget', 'need', 'How much can you spend?', 'The budget sets the class of printer.'); answerNeed(v, ids.budget, 'About 500 €', 'Alex');
  add('use', 'need', 'What will you print?', 'Small figurines need fine detail; toys need strength.'); answerNeed(v, ids.use, 'Figurines and toys for my kids, at home', 'Alex');
  if (options.openNeed) add('space', 'need', 'Where will it stand?', 'Noise and fumes matter in a living room.');
  add('volume', 'criterion', 'Build volume', 'Toys need room; figurines do not.'); setState(v, ids.volume, 'must');
  add('ease', 'criterion', 'Ease of use', 'You want to print, not tinker.'); setState(v, ids.ease, 'must');
  add('price', 'criterion', 'Price', 'About 500 € all in.'); setState(v, ids.price, 'must'); setPriceCriterion(v, ids.price);
  add('noise', 'criterion', 'Noise', 'It runs at home for hours.'); setState(v, ids.noise, 'nice');
  add('multi', 'criterion', 'Multi-colour printing', 'Not needed for now.'); setState(v, ids.multi, 'irrelevant');
  add('heated', 'concept', 'Heated bed', 'Why the first layer sticks.');
  add('family', 'family', 'Bed slingers around 300 €', 'Open frame, the bed moves.'); setState(v, ids.family, 'lit');
  v.nodes[ids.family].content = 'Open-frame printers whose bed moves back and forth: cheap, simple, a bit loud.';
  const products: [string, string, string, string, string][] = [['a1', 'Bambu Lab A1', '256 × 256 × 256 mm', 'Auto-calibration, guided setup', '349 €'], ['mk4s', 'Prusa MK4S', '250 × 210 × 220 mm', 'Kit or assembled; very reliable', '799 €'], ['k1c', 'Creality K1C', '220 × 220 × 250 mm', 'Enclosed, fast, ready out of the box', '399 €']];
  for (const [key, t, volume, ease, price] of products) {
    add(key, 'product', t, '', ids.family); setState(v, ids[key], 'shortlisted');
    const maker = src(`${t.split(' ')[0]} specs`, `https://example.com/${key}`);
    v.nodes[ids[key]].data = { facts: [{ label: 'Price', value: price, sources: [{ ...maker, kind: 'shop', name: 'Maker shop' }] }], cells: {
      [ids.volume]: cell(volume, [maker]), [ids.ease]: cell(ease, [src('Tom\'s Hardware', 'https://www.tomshardware.com', 'measured')]), [ids.price]: cell(price, [{ ...maker, kind: 'shop', name: 'Maker shop' }]),
      ...(options.noise ? {} : { [ids.noise]: cell('about 48 dB', [src('Tom\'s Hardware', 'https://www.tomshardware.com', 'measured')]) }) } };
  }
  // CP-60 case 7: the user corrected one cell.
  const k1c = v.nodes[ids.k1c]; (k1c.data!.cells as Record<string, Cell>)[ids.volume].user = { value: '220 × 220 × 240 mm', at: '2026-10-11T09:00:00.000Z', by: 'Alex' };
  if (options.fourth) { add('centauri', 'product', 'Elegoo Centauri Carbon', '', ids.family); setState(v, ids.centauri, 'shortlisted'); }
  return { s, v, ids };
}

interface Case { id: string; research: boolean; task: Task; web: boolean; v: RoomVisit; focusId: string; target?: Slot[]; turn?: number; language: 'en' | 'fr'; judge: (raw: string, text: string) => string[] }
const words = (t: string) => new Set(normalizeTitle(t).split(/[^a-z0-9€]+/).filter(w => w.length > 3));
const known = (v: RoomVisit) => new Set(Object.values(v.nodes).map(n => normalizeTitle(n.title)));
const blockJson = (raw: string, tag: string) => { const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(raw); try { return m ? JSON.parse(m[1]) : null; } catch { return null; } };
function options(v: RoomVisit, raw: string, task: Task, focusKind: NodeKind, needOne = false) {
  const p = parseReply(raw, task, { today, web: false, focusKind }), f: string[] = [], seen = known(v);
  if (!p.optionsValid || p.options.length !== 3) f.push('not exactly three valid options');
  if (p.options.some(o => seen.has(normalizeTitle(o.title)))) f.push('option already in the map');
  if (needOne && !p.options.some(o => o.kind === 'need')) f.push('no need option in intro');
  return f;
}
function cases(): Case[] {
  const list: Case[] = [];
  const push = (c: Omit<Case, 'language'> & { language?: 'en' | 'fr' }) => list.push({ language: 'en', ...c });
  { const s = newChooseSubject('3D printer', { tone: 'curious', model, effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }); const v = s.rooms.choose;
    push({ id: '1-intro', research: false, task: 'intro', web: false, v, focusId: v.rootId, judge: raw => options(v, raw, 'intro', 'subject', true) }); }
  { const { v, ids } = printer(); push({ id: '1-light', research: false, task: 'light', web: false, v, focusId: ids.heated, judge: raw => options(v, raw, 'light', 'concept') }); }
  { const { v, ids } = printer(); setState(v, ids.heated, 'lit'); v.nodes[ids.heated].content = 'A heated bed keeps the first layer warm so it sticks; PLA needs about 60 °C.';
    push({ id: '1-more', research: false, task: 'more', web: false, v, focusId: ids.heated, judge: raw => options(v, raw, 'more', 'concept') }); }
  for (const [id, message, wantNeed] of [['2-reply-plain', 'Which of these is easiest for a complete beginner?', false], ['2-reply-need', 'Also, it has to be quiet: it will sit in our living room.', true]] as const) {
    const { v } = printer(); v.nodes[v.rootId].dialogue.push({ role: 'user', text: message, at: '2026-10-12T10:00:00.000Z', author: { kind: 'user', by: 'Alex' } });
    push({ id, research: false, task: 'reply', web: false, v, focusId: v.rootId, judge: raw => {
      const need = parseReply(raw, 'reply', { today, web: false, focusKind: 'subject' }).need, f: string[] = [];
      if (!wantNeed && need) f.push('need invented: ' + need.answer);
      if (wantNeed && !need) f.push('stated need not offered');
      if (wantNeed && need && ![...words(need.answer)].some(w => words(message).has(w))) f.push('need not in the user\'s words: ' + need.answer);
      return f; } });
  }
  const findJudge = (v: RoomVisit, web: boolean) => (raw: string) => {
    const p = parseReply(raw, 'find', { today, web, focusKind: 'subject' }), rawList = blockJson(raw, 'products'), f: string[] = [], seen = known(v);
    if (!p.productsValid || !p.products.length || p.products.length > 3) f.push(`products: ${p.products.length}`);
    if (p.products.some(x => seen.has(normalizeTitle(x.title)))) f.push('product already in the map');
    if (p.products.some(x => !x.facts.some(y => /^price$/i.test(y.label) && /€|eur/i.test(y.value)))) f.push('a product without a price in EUR');
    const rawFacts = Array.isArray(rawList) ? rawList.reduce((n: number, x: { facts?: unknown[] }) => n + (Array.isArray(x.facts) ? x.facts.length : 0), 0) : 0;
    const kept = p.products.reduce((n, x) => n + x.facts.length, 0);
    if (rawFacts !== kept) f.push(`${rawFacts - kept} fact(s) without a valid source and date`);
    if (!web && p.products.flatMap(x => x.facts.flatMap(y => y.sources)).some(x => x.kind !== 'model' || !/^\d{4}-\d{2}$/.test(x.read))) f.push('web off: a source other than model knowledge');
    if (!web && !/may have changed|indicat|approximat|check (the )?current/i.test(p.text + raw)) f.push('web off: prices not called indications');
    return f;
  };
  for (const rep of [1, 2]) {
    { const { v } = printer(); push({ id: `3-find-${rep}`, research: true, task: 'find', web: true, v, focusId: v.rootId, judge: findJudge(v, true) }); }
    { const { v, ids } = printer(); v.nodes[ids.family].title = 'Enclosed CoreXY around 600 €';
      push({ id: `4-sources-${rep}`, research: true, task: 'find', web: true, v, focusId: ids.family, judge: raw => {
        const p = parseReply(raw, 'find', { today, web: true, focusKind: 'family' }), rawList = blockJson(raw, 'products') ?? [], f: string[] = [];
        const all: Source[] = (Array.isArray(rawList) ? rawList : []).flatMap((x: { facts?: { sources?: Source[] }[] }) => (x.facts ?? []).flatMap(y => y.sources ?? []));
        if (all.some(x => /reddit|forum|community|facebook|discord/i.test(`${x.name} ${x.url ?? ''}`) && x.kind !== 'opinion')) f.push('community source not marked opinion');
        // An affiliate-looking address (best-of list, deals, coupons) that is not a review or test.
        if (all.some(x => /best|top-?\d|deal|coupon|affiliate/i.test(`${x.url ?? ''}`) && !/review|test/i.test(`${x.url ?? ''}`) && !['sponsored', 'opinion', 'shop'].includes(x.kind))) f.push('affiliate-looking source used as a fact source');
        for (const x of p.products) for (const y of x.facts) if (/volume|dimension|size|speed|weight|nozzle|temperature/i.test(y.label) && !y.sources.some(z => z.kind === 'manufacturer' || z.kind === 'shop')) f.push(`spec "${y.label}" without the manufacturer`); // a shop quoting the maker is allowed (SOURCES, amended 2026-10-15)
        return [...findJudge(v, true)(raw), ...f]; } }); }
    { const { v, ids } = printer('3D printer', { noise: true }); const target = ['a1', 'mk4s', 'k1c'].map(k => ({ productId: ids[k], criterionId: ids.noise }));
      push({ id: `5-disagree-${rep}`, research: true, task: 'fill', web: true, v, focusId: ids.noise, target, judge: raw => {
        const p = parseReply(raw, 'fill', { today, web: true }), f: string[] = [];
        if (p.cells.length !== 3) f.push(`${p.cells.length} cells for 3 targets`);
        for (const c of p.cells) { const values = new Set(c.sources.map(x => x.value).filter(Boolean)); if (values.size > 1 && !c.disagree) f.push('sources disagree without disagree: true'); }
        return f; } }); }
    { const { v, ids } = printer('3D printer', { fourth: true }); const target = ['volume', 'ease', 'price', 'noise'].map(k => ({ productId: ids.centauri, criterionId: ids[k] }));
      push({ id: `6-fill-${rep}`, research: true, task: 'fill', web: true, v, focusId: ids.centauri, target, judge: raw => {
        const p = parseReply(raw, 'fill', { today, web: true }), f: string[] = [], keys = new Set(target.map(t => `${t.productId}×${t.criterionId}`));
        const got = p.cells.map(c => `${c.product}×${c.criterion}`);
        if (got.some(k => !keys.has(k))) f.push('cell outside TARGET'); if (new Set(got).size !== keys.size) f.push(`${new Set(got).size} of ${keys.size} target cells`);
        if (p.cells.some(c => c.value === null && !c.note)) f.push('nothing found without a note');
        return f; } }); }
    { const { v } = printer(); push({ id: `8-weboff-${rep}`, research: true, task: 'find', web: false, v, focusId: v.rootId, judge: findJudge(v, false) }); }
  }
  { const { v, ids } = printer(); push({ id: '7-user-value', research: true, task: 'check', web: true, v, focusId: ids.volume, judge: (raw, text) => {
    const cells = parseReply(raw, 'check', { today, web: true, focusKind: 'criterion' }).cells, f: string[] = [];
    const touched = cells.find(c => c.product === ids.k1c && c.criterion === ids.volume);
    if (touched && !/your (value|correction|figure)|you (entered|wrote|corrected)|240/i.test(text)) f.push('the user\'s value contradicted silently');
    return f; } }); }
  for (const [id, open] of [['9-recommend', false], ['9-recommend-incomplete', true]] as const) {
    const { v } = printer('3D printer', { openNeed: open });
    push({ id, research: false, task: 'recommend', web: false, v, focusId: v.rootId, judge: (raw, text) => {
      const r = parseReply(raw, 'recommend', { today, web: false, focusKind: 'subject' }).recommend, f: string[] = [];
      if (!r) return ['no recommend block'];
      if (!open) {
        if (!recommendedProduct(v, r)) f.push('no shortlisted product named');
        if (!/build volume|ease|price|budget|500/i.test(text)) f.push('reasons not tied to must criteria');
        if (!/figurine|kid|toy|child/i.test(text)) f.push('reasons not tied to the needs');
        if (!/give up|trade-?off|less|but |however|downside|at the cost|instead/i.test(text)) f.push('nothing given up');
      } else { if (!r.missing.length) f.push('incomplete board, nothing missing'); if (r.confidence === 'high') f.push('incomplete board with high confidence'); }
      return f; } });
  }
  { const s = newChooseSubject('Imprimante 3D', { tone: 'curious', model, effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }); const v = s.rooms.choose;
    push({ id: '10-intro-fr', research: false, task: 'intro', web: false, v, focusId: v.rootId, language: 'fr', judge: raw => options(v, raw, 'intro', 'subject', true) }); }
  return list.filter(c => !only || c.id.startsWith(only));
}

async function call(c: Case) {
  const request = taskPrompt(c.v, c.task, c.focusId, { today, web: c.web, target: c.target, turn: c.turn }), start = performance.now();
  const tools = c.web ? ['--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch', 'WebFetch'] : ['--tools', ''];
  return new Promise<{ text: string; model: string; usage: Record<string, number>; costUsd: number; durationMs: number; toolCalls: Record<string, number>; models: string[]; details?: string }>((resolve, reject) => {
    const child = spawn(executable, ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--safe-mode', '--strict-mcp-config', '--no-session-persistence', ...tools, '--system-prompt', request.system, '--model', model, '--effort', effort],
      { cwd: tmpdir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...(c.web ? { ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-opus-5-5' } : {}) } });
    let output = '', stderr = '', last = performance.now();
    const timer = setInterval(() => { if (performance.now() - last > 120_000) child.kill(); }, 1000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (s: string) => { output += s; last = performance.now(); }); child.stderr.on('data', (s: string) => { stderr += s; });
    child.on('error', e => { clearInterval(timer); reject(e); });
    child.on('close', () => {
      clearInterval(timer); let resolved = '', result: Record<string, any> | undefined; const toolCalls: Record<string, number> = {}, ids = new Set<string>();
      for (const line of output.split('\n')) try {
        const v = JSON.parse(line); if (v.type === 'system' && v.subtype === 'init') resolved = v.model; if (v.type === 'result') result = v;
        if (v.type === 'assistant') for (const b of v.message?.content ?? []) if (b.type === 'tool_use' && !ids.has(b.id)) { ids.add(b.id); toolCalls[b.name] = (toolCalls[b.name] ?? 0) + 1; }
      } catch { /* reported if no result */ }
      resolve({ text: result?.result ?? '', model: resolved, usage: result?.usage ?? {}, costUsd: result?.total_cost_usd ?? 0, durationMs: result?.duration_ms ?? Math.round(performance.now() - start), toolCalls,
        models: Object.keys(result?.modelUsage ?? {}), ...(result && !result.is_error ? {} : { details: result?.result ?? stderr ?? 'No result' }) });
    });
    child.stdin.end(request.prompt);
  });
}
function check(c: Case, raw: string) {
  const text = parseReply(raw, c.task, { today, web: c.web, focusKind: c.v.nodes[c.focusId].kind as NodeKind }).text, f = c.judge(raw, text);
  if (nodeLinks(raw, c.v).some(l => !l.exists)) f.push('invalid node link');
  const prose = text.toLowerCase();
  if (prose && c.language === 'fr' && !/\b(le|la|les|des|une|pour|est|sur|dans|du|votre|vous)\b/.test(prose)) f.push('French not detected');
  if (prose && c.language === 'en' && !/\b(the|a|an|is|of|to|and|your|you)\b/.test(prose)) f.push('English not detected');
  return f;
}

const fixtures = cases(), results: Record<string, unknown>[] = [];
if (args.includes('--dry')) {
  for (const c of fixtures) { validateChoose(c.v); const r = taskPrompt(c.v, c.task, c.focusId, { today, web: c.web, target: c.target, turn: c.turn }); console.log(`${c.id}: ${c.task}${c.web ? ' +web' : ''}, prompt ${r.prompt.length} chars${c.target ? `, target ${c.target.length}` : ''}`); }
  process.exit(0);
}
console.log(`choose evals: ${fixtures.length} cases × ${runs} run(s), model ${model}, effort ${effort}, today ${today}`);
for (let run = 1; run <= runs; run++) {
  let passed = 0, cost = 0;
  for (let index = 0; index < fixtures.length; index += 3) {
    const batch = await Promise.all(fixtures.slice(index, index + 3).map(async c => {
      try { const r = await call(c); const failures = r.details ? ['provider error: ' + r.details] : check(c, r.text); return { run, id: c.id, ...r, failures, pass: failures.length === 0 }; }
      catch (e) { return { run, id: c.id, failures: [String(e)], pass: false, costUsd: 0 }; }
    }));
    for (const r of batch) {
      results.push(r); cost += r.costUsd ?? 0; if (r.pass) passed++;
      const extra = 'toolCalls' in r ? ` ${Math.round((r.durationMs ?? 0) / 1000)} s${Object.keys(r.toolCalls ?? {}).length ? ' ' + JSON.stringify(r.toolCalls) : ''}${(r.models?.length ?? 0) > 1 ? ' models ' + r.models!.join(',') : ''}` : '';
      console.log(`${r.pass ? 'PASS' : 'FAIL'} run ${run} ${r.id}${extra}${r.pass ? '' : ': ' + r.failures.join('; ')}`);
    }
  }
  console.log(`Run ${run}: ${passed}/${fixtures.length} (${(100 * passed / fixtures.length).toFixed(1)}%), API-equivalent $${cost.toFixed(2)}`);
}
const folder = join(import.meta.dirname, 'results'); mkdirSync(folder, { recursive: true });
const file = join(folder, `${new Date().toISOString().replace(/[:.]/g, '-')}-choose-${model.replace(/[^a-z0-9-]/gi, '-')}.json`);
writeFileSync(file, JSON.stringify({ promptVersion, model, effort, runs, today, cases: fixtures.length, results }, null, 2));
console.log(`Results: ${file}`);
if (Array.from({ length: runs }, (_, i) => results.filter(r => r.run === i + 1 && r.pass).length / fixtures.length).some(rate => rate < .95)) process.exitCode = 1;
