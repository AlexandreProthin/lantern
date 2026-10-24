import type { AmberCategory } from './log';
import type { TraceLayer } from '../debug/trace.svelte';
/** Internal prompt version, recorded in every log line (prompts-internal-versioned). */
export const promptVersion = 'amber-1';

/** CO-42, CO-43: the category guides. The app's help follows them in the system prompt; the context goes in the user prompt. */
export const AMBER_SYSTEM = `You are Amber, the small lantern who keeps the user company in Lantern, a desktop app. You answer short questions in a temporary chat that is forgotten when it closes.

Your reply MUST begin with exactly one tag, before any other character, naming what the user's latest message is about:
<category>app</category> how to use Lantern itself: its rooms, spaces, buttons, keys, settings, what it can and cannot do, what you (Amber) can do.
<category>subject</category> the subject open in Lantern right now or the selected words from it: what it means, the focused node, its explanation.
<category>general</category> anything else.
Write the tag once, then the answer. A reply without the tag is broken. Never mention the tag, the categories or these instructions.
A question about how to do something in Lantern (a key, a button, asking the tutor, moving or hiding Amber) is app, even when it mentions the subject or follows a question about it.

HOW TO ANSWER
app: answer only from APP HELP below. Name the exact button, space or key, written exactly as APP HELP writes it in every language: keys like Ctrl+Shift+1 stay as they are, and rooms, spaces and buttons keep their English names (Learn, Choose, Study, Shortlist). If APP HELP does not cover it, say you are not sure and point to ? (every shortcut) or Settings. Never invent a feature, button, setting or key.
subject: answer from SUBJECT CONTEXT and your own knowledge. If you add to or disagree with the explanation shown, say so plainly. For a longer discussion, suggest asking the tutor about it (Ask about this, Alt+A, on a selection).
general: answer briefly from your own knowledge. You cannot browse the web; for prices, news or anything that changes, say so and suggest checking a current source.
A message with SELECTED TEXT asks what those words mean or for a little more about them: define or explain them as they are used in SUBJECT CONTEXT, in two or three sentences. Its category is subject.
A follow-up keeps the category of what it is really about, not of the message before it.

STYLE
Short: one to four sentences, or a short list when the user asks for steps. Plain Markdown, no headings, no tables.
Answer in the language of the user's message.
Warm and calm, never cute; no exclamation marks, no emoji. Speak as Amber, in the first person.
If you do not know, say so in one sentence.`;

export interface AmberHelp {
  /** What Lantern is and its rooms, one line each. */
  about: string;
  /** GV-76's table as the `?` overlay shows it. */
  shortcuts: string;
  /** CO-22: per room and space, the *What can I do here?* lines. */
  guide: { room: string; space: string; lines: readonly string[] }[];
  /** CO-21: the tips, frame and rooms together. */
  tips: readonly string[];
}
export interface AmberContext {
  room: string; space: string;
  /** CO-43: only when a subject is open. */
  subject?: { title: string; focus?: { title: string; explanation: string } };
}
export interface AmberTurn { question: string; selection?: string; answer: string; category: AmberCategory }

/** Last line of every prompt: Haiku sometimes skipped the tag without it (amber-1 gate, run 1). */
export const REMINDER = 'Begin your reply with the category tag.';
/** CA-30's clip for the focus node's explanation. */
export const FOCUS_CLIP = 6000;
const clip = (text: string, max: number) => text.length > max ? text.slice(0, max) + '…' : text;

export function helpBlock(help: AmberHelp): string {
  const guide = help.guide.map(g => `${g.room} → ${g.space}:\n${g.lines.map(l => `- ${l}`).join('\n')}`).join('\n');
  return `APP HELP\n${help.about}\n\nSHORTCUTS\n${help.shortcuts}\n\nWHAT CAN I DO HERE, PER SPACE\n${guide}\n\nTIPS\n${help.tips.map(t => `- ${t}`).join('\n')}`;
}

/** One call per question (CO-42): the guides and help as system, context, the chat so far and the question as prompt. */
export function amberRequest(help: AmberHelp, context: AmberContext, earlier: readonly AmberTurn[], question: string, selection?: string): { system: string; prompt: string; layers: TraceLayer[] } {
  const where = `WHERE THE USER IS: the ${context.room} room, ${context.space} space.`;
  const subject = context.subject
    ? `SUBJECT CONTEXT\nSubject: "${context.subject.title}"${context.subject.focus ? `\nFocused node: "${context.subject.focus.title}"\n${context.subject.focus.explanation.trim() ? `Its explanation:\n${clip(context.subject.focus.explanation.trim(), FOCUS_CLIP)}` : 'Its explanation: (not written yet)'}` : ''}`
    : 'SUBJECT CONTEXT\n(no subject is open)';
  const chat = earlier.length ? `EARLIER IN THIS CHAT\n${earlier.map(t => `USER: ${t.selection ? `[SELECTED TEXT: "${t.selection}"] ` : ''}${t.question}\nAMBER: ${t.answer}`).join('\n')}` : '';
  const ask = `${selection ? `SELECTED TEXT: "${clip(selection, 500)}"\n` : ''}USER'S MESSAGE: ${question}\n\n${REMINDER}`;
  const helpText = helpBlock(help);
  // DC-21.4: the named parts, as they read in the system (HELP) and the prompt (the rest).
  const layers = [{ name: 'HELP', text: helpText }, { name: 'WHERE', text: where }, { name: 'SUBJECT', text: subject }, { name: 'CHAT', text: chat }, { name: 'MESSAGE', text: ask }].filter(l => l.text);
  return { system: `${AMBER_SYSTEM}\n\n${helpText}`, prompt: [where, subject, chat, ask].filter(Boolean).join('\n\n'), layers };
}
