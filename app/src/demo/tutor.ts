// Web demo only: a tutor that replays prepared answers instead of calling a model.
// It reads the task, subject and node from the prompt the way the fake provider does (IP-71),
// waits like a model before its first words, then streams. Unprepared requests get an honest fallback.
import { ProviderError, zeroUsage } from '../frame/provider';
import type { Completion, InferenceProvider, Request } from '../frame/provider';
import { normalizeTitle } from '../core/model';
import { strings } from '../ui/strings';

/** Prepared answers for one subject, keyed by node title. Raw text: options blocks included where the task asks. */
export interface LearnScript {
  subject: string;
  intro?: string;
  light: Record<string, string>;
  check: Record<string, string>;
  /** What a good answer to the node's check question covers; never graded, so no <understood/>. */
  answer: Record<string, string>;
}
export const DEMO_MODEL = 'claude-opus-5-5';
type Kind = 'axis' | 'deeper' | 'application' | 'adjacent' | 'exercise';
/** The options block the tutor ends an intro or a light with, from [title, hook, kind] triples. */
export const options = (...list: [string, string, Kind][]) =>
  `\n\n<options>${JSON.stringify(list.map(([title, hook, kind]) => ({ title, hook, kind })))}</options>`;

const key = (title: string) => normalizeTitle(title);
const field = (prompt: string, pattern: RegExp) => pattern.exec(prompt)?.[1]?.trim() ?? '';
/** The current node is the last step of the path block: "Title (id)". */
const currentNode = (prompt: string) => field(prompt, /^PATH TO CURRENT NODE: (.*)$/m).split(' > ').at(-1)?.replace(/ \([^()]*\)$/, '') ?? '';

export function scriptedReply(scripts: LearnScript[], prompt: string): string {
  const subject = field(prompt, /^SUBJECT: (.*)$/m), script = scripts.find(s => key(s.subject) === key(subject));
  const pick = (table: keyof Pick<LearnScript, 'light' | 'check' | 'answer'>, title: string) => script?.[table][key(title)];
  if (prompt.includes('TASK: introduce')) return script?.intro ?? strings.demoNoIntro(subject);
  if (prompt.includes('TASK: light up')) { const title = field(prompt, /The learner chose: "(.*?)"/); return pick('light', title) ?? strings.demoNoLight(title); }
  if (prompt.includes('TASK: test')) return pick('check', currentNode(prompt)) ?? strings.demoNoCheck;
  if (prompt.includes('TASK: reply')) return prompt.includes('PENDING CHECK: yes') ? pick('answer', currentNode(prompt)) ?? strings.demoNoAnswer : strings.demoNoQuestion;
  return '<options>[]</options>'; // "more" and "suggest": nothing prepared
}

/** Tables are written with readable titles; lookups use the app's normalised form. */
export function prepared(script: LearnScript): LearnScript {
  const norm = (t: Record<string, string>) => Object.fromEntries(Object.entries(t).map(([k, v]) => [key(k), v.trim()]));
  return { ...script, intro: script.intro?.trim(), light: norm(script.light), check: norm(script.check), answer: norm(script.answer) };
}

export class ScriptedTutor implements InferenceProvider {
  constructor(private scripts: LearnScript[], private firstWordsMs = () => 2000 + Math.random() * 2000, private chunkMs = 22) {}
  async stream(req: Request, onText: (chunk: string) => void): Promise<Completion> {
    const start = performance.now(), text = scriptedReply(this.scripts, req.prompt);
    const wait = (ms: number) => new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stop = () => { clearTimeout(timer); reject(new ProviderError('cancelled', '', DEMO_MODEL)); };
      if (req.cancel.aborted) { stop(); return; }
      timer = setTimeout(() => { req.cancel.removeEventListener('abort', stop); resolve(); }, ms);
      req.cancel.addEventListener('abort', stop, { once: true });
    });
    await wait(this.firstWordsMs());
    for (let at = 0; at < text.length; at += 18) { onText(text.slice(at, at + 18)); await wait(this.chunkMs); }
    return { text, model: DEMO_MODEL, usage: { ...zeroUsage(), input: Math.ceil((req.system.length + req.prompt.length) / 4), output: Math.ceil(text.length / 4) },
      durationMs: Math.round(performance.now() - start), outcome: 'ok', resolvedEffort: req.effort };
  }
}
