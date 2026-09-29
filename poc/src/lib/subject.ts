// The subject model. A subject belongs to the learner and visits rooms; the PoC only
// has the Learn room, so the graph lives directly on the subject for now.

export type NodeState = 'open' | 'lit' | 'understood';
export type NodeKind = 'subject' | 'axis' | 'deeper' | 'application' | 'adjacent' | 'exercise' | 'question';

export interface Turn {
  role: 'learner' | 'tutor';
  text: string;
  at: string;
}

export interface LNode {
  id: string;
  parentId: string | null;
  title: string;
  hook: string;
  kind: NodeKind;
  state: NodeState;
  /** The tutor's explanation, set when the node is lit. */
  content: string;
  dialogue: Turn[];
  createdAt: string;
}

export interface Subject {
  format: 'lantern-poc/1';
  id: string;
  title: string;
  room: 'learn';
  rootId: string;
  focusId: string;
  nodes: Record<string, LNode>;
  createdAt: string;
  updatedAt: string;
}

export const now = () => new Date().toISOString();

export function newId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function slug(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${s || 'subject'}-${newId().slice(0, 4)}`;
}

export function createSubject(title: string): Subject {
  const root: LNode = {
    id: newId(),
    parentId: null,
    title,
    hook: '',
    kind: 'subject',
    state: 'open',
    content: '',
    dialogue: [],
    createdAt: now()
  };
  return {
    format: 'lantern-poc/1',
    id: slug(title),
    title,
    room: 'learn',
    rootId: root.id,
    focusId: root.id,
    nodes: { [root.id]: root },
    createdAt: now(),
    updatedAt: now()
  };
}

export function childrenOf(s: Subject, id: string): LNode[] {
  return Object.values(s.nodes)
    .filter((n) => n.parentId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function pathTo(s: Subject, id: string): LNode[] {
  const out: LNode[] = [];
  let cur: LNode | undefined = s.nodes[id];
  while (cur) {
    out.unshift(cur);
    cur = cur.parentId ? s.nodes[cur.parentId] : undefined;
  }
  return out;
}

export function addChild(
  s: Subject,
  parentId: string,
  opt: { title: string; hook: string; kind?: string },
  fallbackKind: NodeKind
): LNode {
  const kinds: NodeKind[] = ['axis', 'deeper', 'application', 'adjacent', 'exercise', 'question'];
  const kind = kinds.includes(opt.kind as NodeKind) ? (opt.kind as NodeKind) : fallbackKind;
  const node: LNode = {
    id: newId(),
    parentId,
    title: opt.title.trim(),
    hook: (opt.hook ?? '').trim(),
    kind,
    state: 'open',
    content: '',
    dialogue: [],
    createdAt: now()
  };
  s.nodes[node.id] = node;
  return node;
}

export function stats(s: Subject) {
  const all = Object.values(s.nodes);
  return {
    total: all.length,
    lit: all.filter((n) => n.state !== 'open').length,
    understood: all.filter((n) => n.state === 'understood').length
  };
}
