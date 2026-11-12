import { invoke } from './ipc';
import { backend } from './host';

/** GV-136: the graph's collapsed node ids per subject, in the app state file (SE-50), never in the subject. */
export interface CollapseStore { load(subjectId: string): Promise<string[]>; save(subjectId: string, nodes: string[]): Promise<void> }

const ids = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && !!v))] : [];

export const desktopCollapseStore: CollapseStore = {
  load: async id => ids((await invoke<{ collapsed?: Record<string, unknown> }>('read_state')).collapsed?.[id]),
  save: (id, nodes) => invoke('save_collapsed', { id, nodes })
};

const KEY = 'lantern.collapsed';
const readAll = (): Record<string, unknown> => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
/** The browser build's surrogate (fake-provider tests, the web demo). */
export const browserCollapseStore: CollapseStore = {
  async load(id) { return ids(readAll()[id]); },
  async save(id, nodes) {
    const all = readAll();
    if (nodes.length) all[id] = nodes; else delete all[id];
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* a view state; losing it is harmless */ }
  }
};
/** GV-136: a deleted subject's folds go with it (the desktop drops them in `delete_subject`). */
export function browserForgetCollapsed(id: string): void { void browserCollapseStore.save(id, []); }

export const collapseStore: CollapseStore = backend ? desktopCollapseStore : browserCollapseStore;
