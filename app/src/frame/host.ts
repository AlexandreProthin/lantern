/** NW-30, NW-31: where the page runs.
 * - `native`: the Tauri window (window controls, file dialogs, Explorer, updates).
 * - `remote`: a browser on another device, served by Lantern on the network (the server marks `index.html`).
 * - `backend`: either of the two: real files and a real provider, reached through `ipc.ts`.
 * The plain browser build and the web demo are neither: fakes and browser storage. */
export const native = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const remote = !native && typeof document !== 'undefined' && !!document.querySelector('meta[name="lantern-remote"]');
export const backend = native || remote;
