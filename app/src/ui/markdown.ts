import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import hljs from 'highlight.js/lib/common';
import type { RoomVisit } from '../core/model';
import { strings } from './strings';
const md: MarkdownIt = new MarkdownIt({ html: false, linkify: true, breaks: false, highlight: (code, language): string => {
  if (language && hljs.getLanguage(language)) try { return hljs.highlight(code, { language, ignoreIllegals: true }).value; } catch { /* escaped fallback */ }
  return md.utils.escapeHtml(code);
} });
const escape = (text: string) => md.utils.escapeHtml(text);
md.validateLink = url => /^(node:|https?:|mailto:)/i.test(url);
md.renderer.rules.image = (tokens, index) => {
  const token = tokens[index], source = token.attrGet('src') ?? '', alt = token.content;
  return /^https?:/i.test(source) ? `<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">${escape(alt || source)}</a>` : escape(alt);
};
/** NP-71: a node link is a link when the node exists and, for a room with a progress rule, is shown (GV-120). */
type Env = { visit: RoomVisit; linkable?: (id: string) => boolean };
const linkTarget = (env: Env, id: string) => Object.hasOwn(env.visit.nodes, id) && (env.linkable?.(id) ?? true);
md.renderer.rules.link_open = (tokens, index, _, env: Env) => {
  const target = tokens[index].attrGet('href') ?? '';
  if (target.startsWith('node:')) {
    const id = target.slice(5);
    if (linkTarget(env, id)) return `<button type="button" class="node-link" data-node-id="${escape(id)}">`;
    return '<span>';
  }
  return /^(https?:|mailto:)/i.test(target) ? `<a href="${escape(target)}" target="_blank" rel="noopener noreferrer">` : '<span>';
};
md.renderer.rules.link_close = (tokens, index, _, env: Env) => {
  // Inline tokens nest formatting inside labels; locate the corresponding opener.
  let depth = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (tokens[i].type === 'link_close') depth++;
    if (tokens[i].type === 'link_open' && --depth === 0) {
      const target = tokens[i].attrGet('href') ?? '';
      if (target.startsWith('node:')) return linkTarget(env, target.slice(5)) ? '</button>' : '</span>';
      return /^(https?:|mailto:)/i.test(target) ? '</a>' : '</span>';
    }
  }
  return '</span>';
};
function math(source: string, displayMode: boolean): string {
  try { return katex.renderToString(source, { displayMode, trust: false, throwOnError: true, output: 'html' }); }
  catch (e) { return `<code class="math-error" title="${escape(String(e))}">${escape(source)}</code>`; }
}
md.inline.ruler.before('escape', 'lantern-math', (state, silent) => {
  const pos = state.pos;
  // Pandoc's rule: the opener is followed by non-space, the closer follows non-space and is not
  // followed by a digit. `$1/r^2$` is math; "between $5 and $10" stays text.
  if (state.src[pos] !== '$' || /[\s$]/.test(state.src[pos + 1] ?? ' ') || state.src[pos - 1] === '\\') return false;
  let end = pos + 1;
  while ((end = state.src.indexOf('$', end)) !== -1 && (/[\s\\]/.test(state.src[end - 1]) || /\d/.test(state.src[end + 1] ?? ''))) end++;
  if (end === -1) return false;
  if (!silent) { const token = state.push('lantern_math', '', 0); token.content = state.src.slice(pos + 1, end); }
  state.pos = end + 1; return true;
});
md.renderer.rules.lantern_math = (tokens, i) => math(tokens[i].content, false);
md.block.ruler.before('fence', 'lantern-math-block', (state, start, end, silent) => {
  const first = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]);
  if (!first.startsWith('$$')) return false;
  let line = start, source = first.slice(2);
  if (!source.endsWith('$$')) {
    for (line = start + 1; line < end; line++) {
      const part = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]); source += '\n' + part;
      if (part.trimEnd().endsWith('$$')) break;
    }
    if (line >= end) return false;
  }
  if (silent) return true;
  const token = state.push('lantern_math_block', '', 0); token.block = true; token.content = source.slice(0, source.lastIndexOf('$$'));
  state.line = line + 1; return true;
});
md.renderer.rules.lantern_math_block = (tokens, i) => math(tokens[i].content, true);
const fence = md.renderer.rules.fence!;
md.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index], language = token.info.trim().split(/\s+/)[0];
  if (language === 'mermaid') return `<pre class="mermaid-source" data-mermaid="true"><code>${escape(token.content)}</code></pre>`;
  return `<div class="code-block"><button type="button" data-copy="true">${strings.copy}</button>${fence(tokens, index, options, env, self)}</div>`;
};
// NP-75, NP-76: collapsible blocks for solutions. Markdown HTML stays off; this rule alone knows
// `<details>`, `<summary>` and `</details>` lines and emits the tags itself, copying no attribute.
const DETAILS_OPEN = /^<details(\s+open)?\s*>\s*(?:<summary>(.*?)<\/summary>\s*)?$/;
const SUMMARY = /^<summary>(.*?)<\/summary>\s*$/, DETAILS_CLOSE = /^<\/details>\s*$/, FENCE = /^(`{3,}|~{3,})/;
md.block.ruler.before('fence', 'lantern-details', (state, start, end, silent) => {
  const line = (n: number) => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]).trimEnd();
  if (state.sCount[start] - state.blkIndent >= 4) return false;
  const opening = DETAILS_OPEN.exec(line(start));
  if (!opening) return false;
  let summary = opening[2], first = start + 1;
  if (summary === undefined && first < end) { const next = SUMMARY.exec(line(first)); if (next) { summary = next[1]; first++; } }
  // The block ends at its own `</details>`: nested blocks count, and lines inside a code fence do not.
  let depth = 1, close = first, fence = '';
  for (; close < end; close++) {
    const text = line(close), marker = FENCE.exec(text)?.[1];
    if (fence) { if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = ''; continue; }
    if (marker) { fence = marker; continue; }
    if (DETAILS_OPEN.test(text)) depth++;
    else if (DETAILS_CLOSE.test(text) && --depth === 0) break;
  }
  if (close >= end) return false; // NP-63: an unclosed block stays text until it is closed.
  if (silent) return true;
  const open = state.push('lantern_details_open', 'details', 1);
  open.block = true; open.meta = { open: !!opening[1] }; open.map = [start, close + 1];
  state.push('lantern_summary_open', 'summary', 1);
  const label = state.push('inline', '', 0);
  label.content = summary?.trim() || strings.details; label.map = [start, first]; label.children = [];
  state.push('lantern_summary_close', 'summary', -1);
  const parent = state.parentType, lineMax = state.lineMax;
  state.parentType = 'blockquote' as typeof state.parentType; state.lineMax = close;
  state.md.block.tokenize(state, first, close);
  state.parentType = parent; state.lineMax = lineMax;
  state.push('lantern_details_close', 'details', -1).block = true;
  state.line = close + 1;
  return true;
}, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
md.renderer.rules.lantern_details_open = (tokens, i) => `<details class="md-details"${tokens[i].meta?.open ? ' open' : ''}>`;
md.renderer.rules.lantern_details_close = () => '</details>\n';
md.renderer.rules.lantern_summary_open = () => '<summary>';
md.renderer.rules.lantern_summary_close = () => '</summary>\n';
/** The renderer's HTML before sanitising; exported for tests. */
export const markdownHtml = (text: string, visit: RoomVisit, linkable?: (id: string) => boolean): string => md.render(text, { visit, linkable } satisfies Env);
export function renderMarkdown(text: string, visit: RoomVisit, linkable?: (id: string) => boolean): string {
  // Inline styles originate only in trusted KaTeX output (raw Markdown HTML is escaped,
  // KaTeX trust is false). Retain its geometry; removing styles breaks fractions/matrices.
  return DOMPurify.sanitize(markdownHtml(text, visit, linkable), { FORBID_TAGS: ['style', 'iframe', 'script'], ADD_ATTR: ['data-node-id', 'data-copy', 'data-mermaid'] });
}
function safeCss(css: string): string {
  // Backslashes go first so a CSS escape cannot spell `url` or `@import` past the checks.
  return css.replace(/\\/g, '').replace(/@import[^;]*;?/gi, '').replace(/expression\s*\(/gi, 'none(')
    .replace(/url\s*\((?!\s*['"]?#)[^)]*\)/gi, 'none');
}
export function sanitizeDiagram(svg: string): string {
  const safe = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'image', 'animate', 'set'] });
  const template = document.createElement('template'); template.innerHTML = safe;
  // Preserve Mermaid's generated theme/geometry, but prevent CSS or SVG references
  // from loading remote content. Diagram links are handled as text in strict mode.
  // Mermaid's own stylesheet uses same-document `url(#id-gradient)`, so only non-fragment
  // urls are neutralised; dropping the whole block left every shape black (v0.1.1 B1).
  for (const el of template.content.querySelectorAll('*')) {
    if (el.tagName.toLowerCase() === 'style') el.textContent = safeCss(el.textContent ?? '');
    const style = el.getAttribute('style');
    if (style !== null) el.setAttribute('style', safeCss(style));
    for (const attr of ['href', 'xlink:href']) if (el.hasAttribute(attr) && !el.getAttribute(attr)!.startsWith('#')) el.removeAttribute(attr);
  }
  return template.innerHTML;
}
let diagramSequence = 0;
export async function renderDiagrams(root: HTMLElement): Promise<void> {
  if (!root.querySelector('[data-mermaid]')) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark', htmlLabels: false, flowchart: { htmlLabels: false }, themeVariables: {
    primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
    primaryTextColor: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
    lineColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  } });
  for (const block of root.querySelectorAll<HTMLElement>('[data-mermaid]')) {
    if (block.dataset.rendered) continue; block.dataset.rendered = 'true';
    const source = (block.textContent ?? '').replace(/%%\{[\s\S]*?\}%%/g, '');
    try { const { svg } = await mermaid.render(`lantern-diagram-${++diagramSequence}`, source);
      if (block.isConnected) block.innerHTML = sanitizeDiagram(svg);
    } catch { block.title = strings.diagramFailed; }
  }
}
