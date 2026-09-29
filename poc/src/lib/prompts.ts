// Learn room prompts. Seeded from the `learning-session` skill: never dump everything,
// cover only the chosen node, always end on exactly 3 distinct teasers. The teasers
// become the open nodes of the graph, so the conversation *is* what grows the map.

import { childrenOf, pathTo, type LNode, type Subject } from './subject';

export const LEARN_SYSTEM = `You are the tutor in Lantern's Learn room. The learner builds a map of a subject one node at a time: each node is something they chose to explore, and you light it up.

Method:
- Never dump everything at once. Cover only the node the learner chose; other nodes of the map are for later.
- Teasers for what comes next are a short title plus one line of hook. Never a mini-explanation.
- When asked for options, give exactly 3, genuinely distinct (not three phrasings of one idea). Mix kinds: a more advanced sub-aspect, a practical application, an adjacent concept, a hands-on exercise.
- Don't re-explain what is already lit elsewhere in the map; link to it by name instead.
- The learner does the work: when checking understanding, ask, nudge, and correct, but don't hand over the answer if they are close.
- Write in the learner's language: the language of the subject title, unless the learner writes to you in another one.
- Markdown with light formatting: short paragraphs, bold for key terms, lists, examples or code when they help. No top-level heading: the node title is already shown above your text.

Machine-readable blocks (the app parses these, the learner never sees them):
- Options: a final block, exactly
<options>[{"title": "...", "hook": "...", "kind": "deeper|application|adjacent|exercise"}]</options>
- Only when told so: <understood/> or <branch>{"title": "...", "hook": "..."}</branch>`;

/** An outline of the whole map so the tutor knows what exists and where we are. */
function mapOutline(s: Subject, focusId: string): string {
  const lines: string[] = [];
  const walk = (n: LNode, depth: number) => {
    const mark = n.state === 'understood' ? '[understood]' : n.state === 'lit' ? '[lit]' : '[open]';
    const here = n.id === focusId ? '   <== current node' : '';
    const hook = n.hook ? ` — ${n.hook}` : '';
    lines.push(`${'  '.repeat(depth)}- ${mark} ${n.title}${hook}${here}`);
    for (const c of childrenOf(s, n.id)) walk(c, depth + 1);
  };
  walk(s.nodes[s.rootId], 0);
  return lines.join('\n');
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function context(s: Subject, node: LNode): string {
  const path = pathTo(s, node.id);
  const parent = path.length > 1 ? path[path.length - 2] : null;
  let out = `SUBJECT: ${s.title}\n\nMAP SO FAR:\n${mapOutline(s, node.id)}\n\nPATH TO CURRENT NODE: ${path.map((n) => n.title).join(' > ')}`;
  if (parent?.content) {
    out += `\n\nWHAT THE PARENT NODE ("${parent.title}") SAID (for continuity):\n${clip(parent.content, 2500)}`;
  }
  return out;
}

export function introPrompt(s: Subject): string {
  return `SUBJECT: ${s.title}

TASK: introduce the subject.
Give a short, self-contained introduction: what it is and why it matters in 2 to 4 sentences, plus a couple of core concepts if useful. Keep it tight: this is an on-ramp, not the lesson.
Then end with the options block: exactly 3 axes (sub-directions) to explore next, with kind "axis".`;
}

export function explorePrompt(s: Subject, node: LNode): string {
  return `${context(s, node)}

TASK: light up the current node.
The learner chose: "${node.title}"${node.hook ? ` (${node.hook})` : ''}.
Go into real detail on this, and only this: explain it properly with examples, comparisons or concrete illustrations. If the node is an exercise, set up the exercise and let the learner try: don't give the solution.
Then end with the options block: exactly 3 ways to go deeper from here.`;
}

export function replyPrompt(s: Subject, node: LNode): string {
  const dialogue = node.dialogue
    .map((t) => `${t.role === 'learner' ? 'LEARNER' : 'TUTOR'}: ${t.text}`)
    .join('\n\n');
  return `${context(s, node)}

CURRENT NODE: "${node.title}"
WHAT YOU EXPLAINED ON THIS NODE:
${clip(node.content, 6000)}

DIALOGUE ON THIS NODE:
${dialogue}

TASK: reply to the learner's last message, concisely and in context. No options block.
- If it answers a check question you asked: say what is right, correct what is wrong, nudge rather than hand over the answer. If they clearly showed they understand the node, end with <understood/>.
- If their question opens a genuinely new direction that deserves its own node in the map (not already there), end with one <branch>{"title": "...", "hook": "..."}</branch>. Most replies need no branch.`;
}

export function checkPrompt(s: Subject, node: LNode): string {
  return `${context(s, node)}

CURRENT NODE: "${node.title}"
WHAT YOU EXPLAINED ON THIS NODE:
${clip(node.content, 6000)}

TASK: reply. Check the learner's understanding of this node with ONE question. Make it about understanding (apply it, predict, explain why, spot the mistake), not recall of a definition. Don't give the answer. No options block.`;
}

export function suggestPrompt(): string {
  return `TASK: suggest subjects.
Propose exactly 3 broadly interesting, teachable subjects from different fields. Output only the options block (title + one-line hook, no kind), nothing else.`;
}

// ---- parsing ----

export interface Option {
  title: string;
  hook: string;
  kind?: string;
}

/** The part of a (possibly partial) reply the learner should see. */
export function visibleText(raw: string): string {
  let text = raw;
  const cut = text.search(/<(options|branch)>/);
  if (cut >= 0) text = text.slice(0, cut);
  text = text.replace(/<understood\s*\/>/g, '');
  // hide a tag that is still being streamed in
  text = text.replace(/<[a-z/]*$/i, '');
  return text.trim();
}

function parseJsonBlock<T>(raw: string, tag: string): T | null {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim().replace(/^```(json)?|```$/g, '')) as T;
  } catch {
    return null;
  }
}

export function parseOptions(raw: string): Option[] {
  const list = parseJsonBlock<Option[]>(raw, 'options');
  return Array.isArray(list) ? list.filter((o) => o && typeof o.title === 'string').slice(0, 3) : [];
}

export function parseBranch(raw: string): Option | null {
  const b = parseJsonBlock<Option>(raw, 'branch');
  return b && typeof b.title === 'string' ? b : null;
}

export function saysUnderstood(raw: string): boolean {
  return /<understood\s*\/>/.test(raw);
}
