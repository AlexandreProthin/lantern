// CO-48, PQ-30..34: Ask Amber's evals (amber-1) on Amber's default model, Haiku 5.5, at low effort with no tools. Run by hand.
// A case passes only when the reply names the expected category in a well-formed tag and its answer meets the case's check.
// The gate: every run at 95 % of cases or more (PQ-33), and the category right on every case.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { strings } from '../src/ui/strings';
import { amberHelp } from '../src/frame/amber/help';
import type { HelpRoom } from '../src/frame/amber/help';
import { amberRequest, promptVersion } from '../src/frame/amber/prompt';
import type { AmberContext, AmberTurn } from '../src/frame/amber/prompt';
import { splitReply } from '../src/frame/amber/gate';
import type { AmberCategory } from '../src/frame/amber/log';
import { learnCompanion } from '../src/rooms/learn/companion';
import { chooseCompanion } from '../src/rooms/choose/companion';

const args = process.argv.slice(2), argument = (name: string, fallback: string) => args.includes(name) ? args[args.indexOf(name) + 1] ?? fallback : fallback;
const model = argument('--model', 'claude-haiku-5-5'), effort = argument('--effort', 'low'), runs = Number(argument('--runs', '3')), only = argument('--only', '');
if (!Number.isInteger(runs) || runs < 1 || runs > 3) throw new Error('--runs must be 1 to 3');

// The registered rooms as the help sees them (rooms/index.ts, without their Svelte components).
const rooms: HelpRoom[] = [
  { name: strings.learn, spaces: [{ id: 'welcome', label: strings.welcome }, { id: 'study', label: strings.study }, { id: 'gallery', label: strings.gallery }], companion: learnCompanion },
  { name: 'Choose', spaces: [{ id: 'welcome', label: 'Welcome' }, { id: 'survey', label: 'Survey' }, { id: 'compare', label: 'Compare' }, { id: 'gallery', label: 'Gallery' }], companion: chooseCompanion }
];
const help = amberHelp(rooms);

const spring = 'Spring tides happen twice a month, at new moon and full moon, when the Sun, the Earth and the Moon line up. The Sun\'s pull then adds to the Moon\'s, so high tides are higher and low tides lower. The tidal range (the difference between high and low water) is at its largest. At perigee, when the Moon is closest to the Earth, spring tides are stronger still.';
const springFr = 'Les marées de vives-eaux ont lieu deux fois par mois, à la nouvelle et à la pleine lune, quand le Soleil, la Terre et la Lune sont alignés. Le marnage (l\'écart entre pleine et basse mer) est alors le plus grand.';
const heated = 'A heated bed keeps the first layer warm so it sticks to the plate. PLA prints well at about 60 °C; ABS and ASA need 100 °C and an enclosure. Most printers with a CoreXY frame move the head on two belts, which keeps it light and fast.';
const learnStudy: AmberContext = { room: 'Learn', space: 'Study', subject: { title: 'Ocean tides', focus: { title: 'Spring tides', explanation: spring } } };
const learnFr: AmberContext = { room: 'Learn', space: 'Study', subject: { title: 'Les marées', focus: { title: 'Vives-eaux', explanation: springFr } } };
const wrong: AmberContext = { room: 'Learn', space: 'Study', subject: { title: 'Ocean tides', focus: { title: 'Spring tides', explanation: 'Spring tides are the strong tides of the spring season, from March to June; the rest of the year tides are weaker.' } } };
const chooseSurvey: AmberContext = { room: 'Choose', space: 'Survey', subject: { title: '3D printer', focus: { title: 'Heated bed', explanation: heated } } };
const learnWelcome: AmberContext = { room: 'Learn', space: 'Welcome' };
const chooseCompare: AmberContext = { room: 'Choose', space: 'Compare', subject: { title: '3D printer' } };

type Check = (answer: string) => string[];
interface Case { id: string; expect: AmberCategory; context: AmberContext; question: string; selection?: string; earlier?: AmberTurn[]; language?: 'en' | 'fr'; check?: Check }
const has = (pattern: RegExp, why: string): Check => answer => pattern.test(answer) ? [] : [why];
const lacks = (pattern: RegExp, why: string): Check => answer => pattern.test(answer) ? [why] : [];
const all = (...checks: Check[]): Check => answer => checks.flatMap(c => c(answer));

const list: Case[] = [
  // app: answered from the help, naming the exact key or button; never an invented feature.
  { id: 'app-settings', expect: 'app', context: learnStudy, question: 'How do I open the settings?', check: has(/Ctrl\+,/, 'no Ctrl+,') },
  { id: 'app-hide', expect: 'app', context: learnStudy, question: 'How can I hide you?', check: has(/Settings|Companion|right-click|Shift\+F10|Hide/i, 'no way to hide') },
  { id: 'app-light', expect: 'app', context: learnStudy, question: 'How do I light up a node?', check: has(/Enter|Light it up/, 'no Enter or Light it up') },
  { id: 'app-shortlist', expect: 'app', context: chooseSurvey, question: 'How do I get a product into Compare?', check: has(/Shortlist/i, 'no Shortlist') },
  { id: 'app-search', expect: 'app', context: learnStudy, question: 'Is there a shortcut to search the nodes?', check: has(/Ctrl\+F/, 'no Ctrl+F') },
  { id: 'app-unknown', expect: 'app', context: learnStudy, question: 'How do I export my subject as a PDF?',
    check: all(has(/not sure|n[o']t (see|find|know|have|offer|seem)|no (way|option|export)|cannot|can't|isn't|doesn't/i, 'claims an export it does not have'), lacks(/Ctrl\+(E|P|S)\b|File\s*→|Export button/i, 'invented a key or button')) },
  { id: 'app-amber', expect: 'app', context: learnWelcome, question: 'What can you do for me?', check: has(/tip|ask|Ctrl\+J|Alt\+D|question/i, 'does not say what Amber does') },
  { id: 'app-fr', expect: 'app', context: learnWelcome, language: 'fr', question: 'Comment je passe d\'une pièce à l\'autre ?', check: has(/Ctrl\+Shift\+[12]|menu/i, 'no Ctrl+Shift or room menu') },
  // subject: the open subject or the focused node.
  { id: 'subject-why', expect: 'subject', context: learnStudy, question: 'Why are spring tides stronger than other tides?', check: has(/Sun/i, 'no Sun') },
  { id: 'subject-summary', expect: 'subject', context: learnStudy, question: 'Can you sum up this node in one sentence?', check: answer => answer.split(/[.!?](\s|$)/).filter(s => s.trim()).length <= 3 ? [] : ['not short'] },
  { id: 'subject-choose', expect: 'subject', context: chooseSurvey, question: 'Do I really need a heated bed if I only print PLA?', check: has(/PLA/i, 'no PLA') },
  { id: 'subject-wrong', expect: 'subject', context: wrong, question: 'So spring tides only happen in spring?',
    check: has(/\bno\b|not|twice a month|new moon|full moon|isn't|aren't/i, 'did not correct the wrong explanation') },
  { id: 'subject-fr', expect: 'subject', context: learnFr, language: 'fr', question: 'Pourquoi le marnage est-il plus grand à ce moment-là ?', check: has(/Soleil|Lune|align/i, 'no Sun or Moon') },
  // general: anything else, even with a subject open.
  { id: 'general-fact', expect: 'general', context: learnStudy, question: 'What is the capital of Australia?', check: has(/Canberra/, 'no Canberra') },
  { id: 'general-price', expect: 'general', context: chooseCompare, question: 'What is the price of Bitcoin right now?',
    check: all(has(/can(no|')t|not able|don't have|no (live|real-time|current)|check/i, 'does not say it cannot look it up'), lacks(/\$\s?\d{2,}|\d{2,}[ ,]?\d{3} ?(\$|USD|€)/, 'gave a price')) },
  { id: 'general-dinner', expect: 'general', context: learnWelcome, question: 'Give me a quick idea for dinner tonight.' },
  { id: 'general-owls', expect: 'general', context: learnWelcome, question: 'Tell me a fun fact about owls.', check: has(/owl/i, 'no owl') },
  { id: 'general-fr', expect: 'general', context: learnStudy, language: 'fr', question: 'Il est midi à Paris, quelle heure est-il à Tokyo ?', check: has(/19|20|heures|h\b/i, 'no time') },
  // selections (CO-45): a definition of the selected words, as used in the subject.
  { id: 'sel-perigee', expect: 'subject', context: learnStudy, selection: 'perigee', question: 'What does this mean?', check: has(/clos|near/i, 'no closest or nearest') },
  { id: 'sel-corexy', expect: 'subject', context: chooseSurvey, selection: 'CoreXY', question: 'Explain this.', check: has(/belt|motor|head|X|Y/i, 'no motion system') },
  { id: 'sel-fr', expect: 'subject', context: learnFr, language: 'fr', selection: 'marnage', question: 'Ça veut dire quoi ?', check: has(/écart|différence|hauteur|haute|basse/i, 'no definition') },
  // follow-ups keep the category of what they are about, not of the turn before.
  { id: 'follow-app', expect: 'app', context: learnStudy, question: 'Can I ask the tutor about that instead?',
    earlier: [{ question: 'Why are spring tides stronger?', answer: 'Because the Sun and the Moon pull in line.', category: 'subject' }], check: has(/Alt\+A|Ask about this|panel|composer|Ctrl\+Enter/i, 'no way to ask the tutor') },
  { id: 'follow-subject', expect: 'subject', context: learnStudy, question: 'Thanks. And how do neap tides compare to this?',
    earlier: [{ question: 'How do I open the settings?', answer: 'Press Ctrl+, anywhere.', category: 'app' }], check: has(/neap/i, 'no neap') },
  { id: 'follow-general', expect: 'general', context: learnStudy, question: 'Unrelated, but how many legs does a spider have?',
    earlier: [{ question: 'Why are spring tides stronger?', answer: 'Because the Sun and the Moon pull in line.', category: 'subject' }], check: has(/\b8\b|eight/i, 'no eight') }
];
const cases = list.filter(c => !only || c.id.startsWith(only));

function check(c: Case, raw: string): { category: AmberCategory; tagOk: boolean; failures: string[] } {
  const { category, tagOk, answer } = splitReply(raw), f: string[] = [];
  if (!tagOk) f.push('missing or broken category tag');
  if (category !== c.expect) f.push(`category ${category}, expected ${c.expect}`);
  if (!answer) f.push('empty answer');
  if (answer.length > 900) f.push(`long answer (${answer.length} chars)`);
  if (/^#{1,6} /m.test(answer)) f.push('heading in the answer');
  if (/<\/?category>/.test(answer)) f.push('tag repeated in the answer');
  const prose = answer.toLowerCase();
  if ((c.language ?? 'en') === 'fr' && !/\b(le|la|les|des|une|pour|est|sur|dans|du|vous|il|à)\b/.test(prose)) f.push('French not detected');
  if ((c.language ?? 'en') === 'en' && !/\b(the|a|an|is|of|to|and|your|you|it)\b/.test(prose)) f.push('English not detected');
  f.push(...(c.check?.(answer) ?? []));
  return { category, tagOk, failures: f };
}

const request = (c: Case) => amberRequest(help, c.context, c.earlier ?? [], c.question, c.selection);
if (args.includes('--dry')) {
  const first = request(cases[0]); console.log(`amber evals: ${cases.length} cases, ${promptVersion}; system ${first.system.length} chars`);
  for (const c of cases) console.log(`${c.id}: expects ${c.expect}, prompt ${request(c).prompt.length} chars`);
  if (args.includes('--show')) { console.log('\n--- SYSTEM ---\n' + first.system); for (const c of cases.filter(x => x.id === argument('--show', ''))) console.log('\n--- PROMPT ---\n' + request(c).prompt); }
  process.exit(0);
}
const executable = process.env.LANTERN_CLAUDE ?? join(homedir(), '.local', 'bin', 'claude.exe');
if (!existsSync(executable)) throw new Error('Set LANTERN_CLAUDE to the installed CLI executable');

/** The app's flags for a call without web (provider.rs `args`). */
async function call(c: Case) {
  const r = request(c), start = performance.now();
  return new Promise<{ text: string; model: string; usage: Record<string, number>; costUsd: number; durationMs: number; firstTextMs?: number; details?: string }>((resolve, reject) => {
    const child = spawn(executable, ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--safe-mode', '--strict-mcp-config', '--no-session-persistence', '--tools', '', '--system-prompt', r.system, '--model', model, '--effort', effort],
      { cwd: tmpdir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', stderr = '', last = performance.now(), firstTextMs: number | undefined;
    const timer = setInterval(() => { if (performance.now() - last > 120_000) child.kill(); }, 1000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (s: string) => { output += s; last = performance.now(); if (firstTextMs === undefined && s.includes('"text_delta"')) firstTextMs = Math.round(last - start); });
    child.stderr.on('data', (s: string) => { stderr += s; });
    child.on('error', e => { clearInterval(timer); reject(e); });
    child.on('close', () => {
      clearInterval(timer); let resolved = '', result: Record<string, any> | undefined;
      for (const line of output.split('\n')) try { const v = JSON.parse(line); if (v.type === 'system' && v.subtype === 'init') resolved = v.model; if (v.type === 'result') result = v; } catch { /* reported if no result */ }
      resolve({ text: result?.result ?? '', model: resolved, usage: result?.usage ?? {}, costUsd: result?.total_cost_usd ?? 0, durationMs: result?.duration_ms ?? Math.round(performance.now() - start), firstTextMs,
        ...(result && !result.is_error ? {} : { details: result?.result ?? stderr ?? 'No result' }) });
    });
    child.stdin.end(r.prompt);
  });
}

console.log(`amber evals: ${cases.length} cases × ${runs} run(s), ${promptVersion}, model ${model}, effort ${effort}`);
const results: Record<string, any>[] = [];
for (let run = 1; run <= runs; run++) {
  let passed = 0, categories = 0, cost = 0;
  for (let index = 0; index < cases.length; index += 3) {
    const batch = await Promise.all(cases.slice(index, index + 3).map(async c => {
      try { const r = await call(c); const judged = r.details ? { category: null, tagOk: false, failures: ['provider error: ' + r.details] } : check(c, r.text);
        return { run, id: c.id, expect: c.expect, ...r, ...judged, pass: judged.failures.length === 0 }; }
      catch (e) { return { run, id: c.id, expect: c.expect, category: null, failures: [String(e)], pass: false, costUsd: 0 }; }
    }));
    for (const r of batch) {
      results.push(r); cost += r.costUsd ?? 0; if (r.pass) passed++; if (r.category === r.expect && (r as { tagOk?: boolean }).tagOk) categories++;
      const timing = 'durationMs' in r ? ` ${((r.durationMs ?? 0) / 1000).toFixed(1)} s${r.firstTextMs !== undefined ? `, first text ${(r.firstTextMs / 1000).toFixed(1)} s` : ''}` : '';
      console.log(`${r.pass ? 'PASS' : 'FAIL'} run ${run} ${r.id}${timing}${r.pass ? '' : ': ' + r.failures.join('; ')}`);
    }
  }
  console.log(`Run ${run}: ${passed}/${cases.length} (${(100 * passed / cases.length).toFixed(1)}%), categories ${categories}/${cases.length}, API-equivalent $${cost.toFixed(3)}`);
}
const folder = join(import.meta.dirname, 'results'); mkdirSync(folder, { recursive: true });
const file = join(folder, `${new Date().toISOString().replace(/[:.]/g, '-')}-amber-${model.replace(/[^a-z0-9-]/gi, '-')}.json`);
writeFileSync(file, JSON.stringify({ promptVersion, model, effort, runs, cases: cases.length, results }, null, 2));
console.log(`Results: ${file}`);
const runPass = (i: number) => { const rs = results.filter(r => r.run === i + 1); return rs.filter(r => r.pass).length / cases.length >= .95 && rs.every(r => r.category === r.expect && r.tagOk); };
if (!Array.from({ length: runs }, (_, i) => runPass(i)).every(Boolean)) process.exitCode = 1;
