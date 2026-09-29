// Thin bridge to the Tauri backend. Outside Tauri (plain browser, for UI work) it falls
// back to a canned fake tutor and localStorage so the loop can still be clicked through.

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Subject } from './subject';

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function infer(
  system: string,
  prompt: string,
  onText: (full: string) => void
): Promise<string> {
  if (!inTauri) return fakeInfer(prompt, onText);
  const requestId = crypto.randomUUID();
  let full = '';
  const unlisten = await listen<{ request_id: string; text: string }>('llm-chunk', (e) => {
    if (e.payload.request_id !== requestId) return;
    full += e.payload.text;
    onText(full);
  });
  try {
    const result = await invoke<string>('infer', { requestId, system, prompt });
    if (result && result !== full) onText(result);
    return result || full;
  } finally {
    unlisten();
  }
}

export async function listSubjects(): Promise<Subject[]> {
  const raw: string[] = inTauri
    ? await invoke<string[]>('list_subjects')
    : Object.keys(localStorage)
        .filter((k) => k.startsWith('lantern:'))
        .map((k) => localStorage.getItem(k) ?? '');
  const out: Subject[] = [];
  for (const text of raw) {
    try {
      out.push(JSON.parse(text));
    } catch {
      /* skip unreadable files */
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveSubject(s: Subject): Promise<void> {
  const json = JSON.stringify(s, null, 2);
  if (inTauri) await invoke('save_subject', { id: s.id, json });
  else localStorage.setItem(`lantern:${s.id}`, json);
}

export async function deleteSubject(id: string): Promise<void> {
  if (inTauri) await invoke('delete_subject', { id });
  else localStorage.removeItem(`lantern:${id}`);
}

export async function subjectsFolder(): Promise<string> {
  return inTauri ? invoke<string>('subjects_folder') : 'localStorage (browser mode)';
}

async function fakeInfer(prompt: string, onText: (full: string) => void): Promise<string> {
  const isQuestion = prompt.includes('TASK: reply');
  const isSuggest = prompt.includes('TASK: suggest');
  let text: string;
  if (isSuggest) {
    text = `<options>[{"title":"How vaccines train immunity","hook":"Teaching the body with a wanted poster"},{"title":"TCP congestion control","hook":"How the internet avoids jamming itself"},{"title":"Bayesian reasoning","hook":"Updating beliefs one clue at a time"}]</options>`;
  } else if (isQuestion) {
    text = `Good question. *(browser mode: this is a canned reply, run the app in Tauri for the real tutor.)*\n\nHere is a short answer with a **key point** and a follow-up thought.`;
  } else {
    text = `This is **browser mode**: a canned explanation so the UI can be exercised without the Claude CLI.\n\n- A first idea, explained plainly.\n- A second idea with an example: \`f(x) = x²\`.\n\nA closing paragraph that ties it together and sets up what comes next.\n\n<options>[{"title":"Option A ${Math.floor(Math.random() * 99)}","hook":"A first direction to explore","kind":"deeper"},{"title":"Option B","hook":"A practical application","kind":"application"},{"title":"Option C","hook":"Try it yourself","kind":"exercise"}]</options>`;
  }
  let shown = '';
  for (const word of text.split(/(?<= )/)) {
    shown += word;
    onText(shown);
    await new Promise((r) => setTimeout(r, 15));
  }
  return text;
}
