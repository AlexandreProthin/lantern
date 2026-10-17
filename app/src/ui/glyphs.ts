// RS-20: the top bar's line glyphs (agent_design/top-bar, assets/bar-kit.js), 16×16, drawn in currentColor.
// Each is the inner markup of an <svg viewBox="0 0 16 16">; rooms name theirs in definition.ts.
export const glyphs = {
  welcome: '<path d="M2.5 7.5 8 3l5.5 4.5V13h-11z"/><path d="M6.5 13V9.5h3V13"/>',
  study: '<circle cx="4" cy="4" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="7" cy="12" r="1.6"/><path d="M5.4 4.3 10.4 4.8M4.7 5.4 6.3 10.6M11.2 6.4 7.9 10.7"/>',
  gallery: '<rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><rect x="9" y="9" width="4.5" height="4.5"/>',
  survey: '<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>',
  compare: '<path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11M6 2v12M10 2v12"/>',
  settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4"/>',
  ask: '<path d="M3 3.5h10a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H8l-3 2.5V11H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/>',
  search: '<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>',
} as const;
