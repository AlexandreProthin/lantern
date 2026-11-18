// The app's drawn icons (RS-38): the line style of the top bar's glyphs (glyphs.ts), 16×16, in currentColor.
// Each is the inner markup of an <svg viewBox="0 0 16 16">, drawn by Icon.svelte. No typed character stands in for an icon.
import { glyphs } from './glyphs';
export const icons = {
  close: '<path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/>',
  minus: '<path d="M3.5 8h9"/>',
  plus: '<path d="M8 3.5v9M3.5 8h9"/>',
  recenter: '<circle cx="8" cy="8" r="4"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5"/><circle cx="8" cy="8" r=".6" fill="currentColor" stroke="none"/>',
  chevronLeft: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
  chevronRight: '<path d="m6 3.5 4.5 4.5L6 12.5"/>',
  chevronDown: '<path d="m3.5 6 4.5 4.5L12.5 6"/>',
  chevronUp: '<path d="M3.5 10 8 5.5l4.5 4.5"/>',
  check: '<path d="m3.5 8.5 3 3 6-7"/>',
  notEqual: '<path d="M3.5 6.5h9M3.5 9.5h9M10.5 3.5l-5 9"/>',
  question: '<path d="M6 6.2a2 2 0 1 1 2.9 1.8c-.6.3-.9.7-.9 1.3v.4"/><circle cx="8" cy="12" r=".7" fill="currentColor" stroke="none"/>',
  pencil: '<path d="M10.5 3.2 12.8 5.5 6 12.3l-2.8.5.5-2.8z"/><path d="m9.2 4.5 2.3 2.3"/>',
  arrowDown: '<path d="M8 3v10M4.5 9.5 8 13l3.5-3.5"/>',
  arrowUp: '<path d="M8 13V3M4.5 6.5 8 3l3.5 3.5"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.4 4.5l.7 8.5h5.8l.7-8.5"/>',
  branch: '<circle cx="3.5" cy="8" r="1.5"/><path d="M5 8h3.5M8.5 8l4-3.5M8.5 8h4M8.5 8l4 3.5"/>',
  flame: '<path d="M8 2.5c.6 2 3.2 3.3 3.2 6.4a3.2 3.2 0 0 1-6.4 0c0-1.5.7-2.5 1.5-3.2.2 1 .7 1.7 1.3 1.9C7.3 6 7.3 4.2 8 2.5z"/>',
  undo: '<path d="M5.5 3.5 3 6l2.5 2.5"/><path d="M3 6h6.5a3.5 3.5 0 0 1 0 7H6"/>',
  dismiss: '<circle cx="8" cy="8" r="5"/><path d="m4.5 11.5 7-7"/>',
  deadEnd: '<path d="M2.5 8h7.5M12 4.5v7"/>',
  search: glyphs.search,
  verify: '<circle cx="7" cy="7" r="4.2"/><path d="m10.1 10.1 3.4 3.4M5.2 7.1l1.2 1.2 2.3-2.5"/>',
  book: '<path d="M8 4.6C6.6 3.6 4.6 3.3 2.5 3.5V12c2.1-.2 4.1.1 5.5 1 1.4-.9 3.4-1.2 5.5-1V3.5c-2.1-.2-4.1.1-5.5 1.1zM8 4.6V13"/>',
  star: '<path d="m8 2.8 1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 11l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"/>',
  bag: '<path d="M3.5 5.5h9l-.7 8h-7.6zM6 7V4.5a2 2 0 0 1 4 0V7"/>',
  rank: '<path d="M3.5 4.5h9M3.5 8h6M3.5 11.5h3"/>',
  foldAll: '<path d="m4 3 4 3 4-3M4 13l4-3 4 3"/>',
  unfoldAll: '<path d="m4 6 4-3 4 3M4 10l4 3 4-3"/>',
  dot: '<circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>',
  ring: '<circle cx="8" cy="8" r="3"/>',
  pin: '<path d="M6 2.5h4M7 2.5v4L4.5 9h7L9 6.5v-4M8 9v4.5"/>',
  ellipsis: '<circle cx="3.5" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r=".9" fill="currentColor" stroke="none"/>',
} as const;
export type IconName = keyof typeof icons;
/** The node menu's icon per action id (GV-55), across rooms; an action without one keeps the column empty. */
export const actionIcons: Record<string, IconName> = {
  light: 'flame', more: 'branch', find: 'search', own: 'plus', rewrite: 'pencil', dismiss: 'dismiss', restore: 'undo', deadend: 'deadEnd',
  delete: 'trash', explain: 'book', must: 'rank', nice: 'rank', irrelevant: 'rank', shortlist: 'star', reject: 'close', choose: 'check',
  remove: 'minus', bought: 'bag', unchoose: 'undo', unreject: 'undo', check: 'verify', collapse: 'foldAll', expand: 'unfoldAll', unpin: 'pin',
};
