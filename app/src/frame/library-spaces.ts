import type { Catalogue, SubjectSummary } from './catalogue';
import type { GraphNode, Tone } from '../core/model';
import type { InferenceProvider } from './provider';
export interface ThumbnailGraph {
  rootId: string; nodes: Record<string, Pick<GraphNode, 'id' | 'parents' | 'createdAt' | 'state'>>; omitted: number;
}
export interface LibrarySpaces {
  catalogue: Catalogue; provider: InferenceProvider; available: boolean; providerReady: boolean;
  create(title: string, tone: Tone, model: string, direction?: string): Promise<void>;
  open(id: string): Promise<void>; rename(id: string, title: string): Promise<void>;
  remove(id: string): Promise<void>; reveal(id: string): Promise<void>; filePath(id: string): Promise<string>;
  thumbnail(summary: SubjectSummary): Promise<ThumbnailGraph>;
  isRunning(id: string): boolean; settings(): void; refresh(): Promise<void>;
}
/** Same breadth-first order as native thumbnail projection, bounded to WG-41. */
export function thumbnailGraph(rootId: string, nodes: ThumbnailGraph['nodes']): ThumbnailGraph {
  const children = new Map<string, typeof nodes[string][]>();
  for (const n of Object.values(nodes)) {
    const parent = n.parents[0];
    if (parent) children.set(parent, [...(children.get(parent) ?? []), n]);
  }
  for (const list of children.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const queue = [rootId], selected: ThumbnailGraph['nodes'] = {};
  for (let i = 0; i < queue.length && Object.keys(selected).length < 60; i++) {
    const node = nodes[queue[i]]; if (!node || node.state === 'dismissed' || selected[node.id]) continue;
    const { id, parents, createdAt, state } = node; selected[id] = { id, parents, createdAt, state };
    queue.push(...(children.get(id) ?? []).map(n => n.id));
  }
  return { rootId, nodes: selected, omitted: Math.max(0, Object.values(nodes).filter(n => n.state !== 'dismissed').length - Object.keys(selected).length) };
}
