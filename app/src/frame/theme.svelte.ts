// SE-60, SE-61: text size and colour theme on the document. The frame calls `applyAppearance` with the stored
// settings; 'system' follows the operating system's preference, live. `shown.theme` is the theme on screen, for
// the parts drawn in script (the backdrop, Amber's identity context).
import { resolveTheme, type TextSize, type Theme } from './settings';

/** The page's background per theme, for the browser chrome (`<meta name="theme-color">`). */
export const themeColors = { dark: '#101827', light: '#f6f1e8' } as const;

export const shown = $state<{ theme: 'dark' | 'light' }>({ theme: 'dark' });

let chosen: Theme = 'dark';
let query: MediaQueryList | undefined;
function systemLight(): boolean {
  query ??= typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : undefined;
  return query?.matches ?? false;
}
function paint(): void {
  const theme = resolveTheme(chosen, systemLight()), root = document.documentElement;
  root.dataset.theme = theme;
  shown.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
}
let listening = false;
export function applyAppearance(textSize: TextSize, theme: Theme): void {
  document.documentElement.dataset.textSize = textSize;
  chosen = theme;
  systemLight();
  if (!listening && query) { query.addEventListener('change', () => { if (chosen === 'system') paint(); }); listening = true; }
  paint();
}
