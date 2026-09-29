// One open subject and the actions that grow it. Every tutor reply is parsed back into
// the graph: options become open nodes, <branch> adds a node, <understood/> marks one.

import { infer, saveSubject } from './backend';
import {
  checkPrompt,
  explorePrompt,
  introPrompt,
  LEARN_SYSTEM,
  parseBranch,
  parseOptions,
  replyPrompt,
  saysUnderstood,
  visibleText
} from './prompts';
import { addChild, now, type LNode, type Subject } from './subject';

export class Session {
  subject = $state<Subject>() as Subject;
  /** Raw text being streamed, per node id (for the node's content or its next tutor turn). */
  streaming = $state<Record<string, { target: 'content' | 'dialogue'; raw: string }>>({});
  errors = $state<Record<string, string>>({});

  constructor(subject: Subject) {
    this.subject = subject;
  }

  get focus(): LNode {
    return this.subject.nodes[this.subject.focusId];
  }

  busy(id: string): boolean {
    return id in this.streaming;
  }

  setFocus(id: string) {
    if (this.subject.nodes[id]) {
      this.subject.focusId = id;
      this.save();
    }
  }

  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.subject.updatedAt = now();
      saveSubject($state.snapshot(this.subject) as Subject).catch((e) =>
        console.error('save failed', e)
      );
    }, 300);
  }

  private async run(
    id: string,
    target: 'content' | 'dialogue',
    prompt: string,
    done: (raw: string) => void
  ) {
    if (this.busy(id)) return;
    delete this.errors[id];
    this.streaming[id] = { target, raw: '' };
    try {
      const raw = await infer(LEARN_SYSTEM, prompt, (full) => {
        if (this.streaming[id]) this.streaming[id].raw = full;
      });
      done(raw);
      this.save();
    } catch (e) {
      this.errors[id] = String(e);
    } finally {
      delete this.streaming[id];
    }
  }

  /** Light up an open node: explanation + 3 new open children. */
  explore(id: string) {
    const node = this.subject.nodes[id];
    if (!node) return;
    const isRoot = id === this.subject.rootId;
    const prompt = isRoot ? introPrompt(this.subject) : explorePrompt(this.subject, node);
    this.run(id, 'content', prompt, (raw) => {
      node.content = visibleText(raw);
      if (node.state === 'open') node.state = 'lit';
      for (const opt of parseOptions(raw)) {
        addChild(this.subject, id, opt, isRoot ? 'axis' : 'deeper');
      }
    });
  }

  /** The learner says something on a node: a question, or an answer to a check. */
  ask(id: string, text: string) {
    const node = this.subject.nodes[id];
    if (!node || !text.trim()) return;
    node.dialogue.push({ role: 'learner', text: text.trim(), at: now() });
    this.save();
    this.run(id, 'dialogue', replyPrompt(this.subject, node), (raw) => {
      node.dialogue.push({ role: 'tutor', text: visibleText(raw), at: now() });
      if (saysUnderstood(raw)) node.state = 'understood';
      const branch = parseBranch(raw);
      if (branch) addChild(this.subject, id, branch, 'question');
    });
  }

  /** Ask the tutor to test the learner on this node. */
  check(id: string) {
    const node = this.subject.nodes[id];
    if (!node) return;
    this.run(id, 'dialogue', checkPrompt(this.subject, node), (raw) => {
      node.dialogue.push({ role: 'tutor', text: visibleText(raw), at: now() });
    });
  }

  toggleUnderstood(id: string) {
    const node = this.subject.nodes[id];
    if (!node || node.state === 'open') return;
    node.state = node.state === 'understood' ? 'lit' : 'understood';
    this.save();
  }
}
