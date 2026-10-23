import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { cases } from './fixtures';
import type { EvalCase } from './fixtures';
import { taskPrompt, promptVersion } from '../src/rooms/learn/prompts';
import { nodeLinks, parseReply } from '../src/rooms/learn/protocol';
import { normalizeTitle } from '../src/core/model';
const args = process.argv.slice(2), argument = (name: string, fallback: string) => args[args.indexOf(name) + 1] ?? fallback;
const model = args.includes('--model') ? argument('--model', 'haiku') : 'haiku';
const effort = args.includes('--effort') ? argument('--effort', 'low') : 'low';
const runs = Number(args.includes('--runs') ? argument('--runs', '3') : 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 3) throw new Error('--runs must be 1 to 3');
const executable = process.env.LANTERN_CLAUDE ?? join(homedir(), '.local', 'bin', 'claude.exe');
if (!existsSync(executable)) throw new Error('Set LANTERN_CLAUDE to the installed CLI executable');
async function call(c: EvalCase) {
  const request = taskPrompt(c.subject.rooms.learn, c.task, c.focusId, { note: c.note });
  const start = performance.now();
  return new Promise<{ text: string; model: string; usage: unknown; durationMs: number; details?: string }>((resolve, reject) => {
    const child = spawn(executable, ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--safe-mode', '--strict-mcp-config', '--no-session-persistence', '--tools', '', '--system-prompt', request.system, '--model', model, '--effort', effort], { cwd: tmpdir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', stderr = '', last = performance.now();
    const timer = setInterval(() => { if (performance.now() - last > 120_000) child.kill(); }, 1000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (s: string) => { output += s; last = performance.now(); }); child.stderr.on('data', (s: string) => { stderr += s; });
    child.on('error', e => { clearInterval(timer); reject(e); });
    child.on('close', () => {
      clearInterval(timer); let resolved = '', result: Record<string, any> | undefined;
      for (const line of output.split('\n')) try { const v = JSON.parse(line); if (v.type === 'system' && v.subtype === 'init') resolved = v.model; if (v.type === 'result') result = v; } catch { /* reported if no result */ }
      resolve({ text: result?.result ?? '', model: resolved, usage: result?.usage ?? {}, durationMs: result?.duration_ms ?? Math.round(performance.now() - start),
        ...(result && !result.is_error ? {} : { details: result?.result ?? stderr ?? 'No result' }) });
    });
    child.stdin.end(request.prompt);
  });
}
function judge(c: EvalCase, raw: string) {
  const v = c.subject.rooms.learn, parsed = parseReply(raw, c.task, c.pending), failures: string[] = [];
  if (parsed.emptyError) failures.push('empty visible text');
  if (['intro', 'light', 'more'].includes(c.task)) {
    if (!parsed.optionsValid || parsed.options.length !== 3) failures.push('not exactly three valid options');
    const known = new Set(Object.values(v.nodes).map(n => normalizeTitle(n.title))), seen = new Set<string>();
    for (const opt of parsed.options) {
      const key = normalizeTitle(opt.title); if (seen.has(key) || known.has(key)) failures.push('duplicate direction'); seen.add(key);
    }
  }
  if (c.task === 'check' && /<(options|branch|understood)/.test(raw)) failures.push('check emitted a block');
  if (c.task === 'reply' && /<options>/.test(raw)) failures.push('reply emitted options');
  if (c.task === 'rewrite') {
    if (/<(options|branch|understood)/.test(raw)) failures.push('rewrite emitted a block');
    // A fresh text, not the old one touched up: no sentence of 40 characters or more is copied.
    const old = v.nodes[c.focusId].content.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 40);
    if (old.some(s => parsed.text.includes(s) && !(c.keeps && s.includes(c.keeps)))) failures.push('copied a sentence of the old text');
    if (/new version|rewrit|as I (said|explained)|(earlier|previous|first) explanation|nouvelle version|réécri|comme je l'ai (dit|expliqué)|explication (précédente|initiale)/i.test(parsed.text)) failures.push('mentions the rewrite');
    if (c.follows && !c.follows.test(parsed.text)) failures.push("the learner's note not followed");
    if (c.keeps && !parsed.text.includes(c.keeps)) failures.push("the learner's correction not kept");
    if (c.focusId === v.rootId && parsed.text.length > 1200) failures.push('the introduction is no longer short');
  }
  if (!c.pending && /<understood\s*\/>/.test(raw)) failures.push('understood without pending check');
  if (c.pending && !parsed.understood) failures.push('clear check answer not recognised');
  if (nodeLinks(raw, v).some(l => !l.exists || l.id === c.focusId)) failures.push('invalid node link');
  // Deterministic language smoke check; semantic pedagogy still requires human review.
  const languageText = (parsed.text + ' ' + parsed.options.map(o => o.title + ' ' + o.hook).join(' ')).toLowerCase();
  if (c.language === 'fr' && !/\b(le|la|les|des|une|pour|est|sur|dans|du|comment|pourquoi|deux)\b/.test(languageText)) failures.push('French language not detected');
  if (c.language === 'en' && !/\b(the|a|an|is|of|to|and|how|why|two|what)\b/.test(languageText)) failures.push('English language not detected');
  return failures;
}
const results: Record<string, unknown>[] = [];
const only = args.includes('--only') ? new RegExp(argument('--only', '.')) : null;
const fixtures = cases().filter(c => !only || only.test(c.id));
for (let run = 1; run <= runs; run++) {
  let passed = 0;
  for (let index = 0; index < fixtures.length; index += 3) {
    const batch = await Promise.all(fixtures.slice(index, index + 3).map(async c => {
      try { const result = await call(c); const failures = result.details ? ['provider error: ' + result.details] : judge(c, result.text);
        return { run, id: c.id, ...result, failures, pass: failures.length === 0 }; }
      catch (e) { return { run, id: c.id, failures: [String(e)], pass: false }; }
    }));
    for (const r of batch) { results.push(r); if (r.pass) passed++; console.log(`${r.pass ? 'PASS' : 'FAIL'} run ${run} ${r.id}${r.pass ? '' : ': ' + r.failures.join('; ')}`); }
  }
  console.log(`Run ${run}: ${passed}/${fixtures.length} (${(100 * passed / fixtures.length).toFixed(1)}%)`);
}
// Informational, not gated: does a reply with a direction visibly pick up its theme (harbours, sailing)?
const steered = results.filter(r => { const c = fixtures.find(f => f.id === r.id)!; return c.subject.rooms.learn.data?.direction && ['intro', 'light', 'more'].includes(c.task) && typeof r.text === 'string'; });
const reflects = steered.filter(r => /harbo|port|sail|boat|ship|navig|bateau|voil|marin|naviga/i.test(r.text as string));
console.log(`Direction reflected (informational): ${reflects.length}/${steered.length} intro/light/more replies mention harbours or sailing`);
const folder = join(import.meta.dirname, 'results'); mkdirSync(folder, { recursive: true });
const file = join(folder, `${new Date().toISOString().replace(/[:.]/g, '-')}-${model.replace(/[^a-z0-9-]/gi, '-')}.json`);
writeFileSync(file, JSON.stringify({ promptVersion, model, effort, runs, cases: fixtures.length, results }, null, 2));
console.log(`Results: ${file}`);
if (Array.from({ length: runs }, (_, i) => results.filter(r => r.run === i + 1 && r.pass).length / fixtures.length).some(rate => rate < .95)) process.exitCode = 1;
