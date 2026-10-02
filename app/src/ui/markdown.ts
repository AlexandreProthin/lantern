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
md.renderer.rules.link_open = (tokens, index, _, env: { visit: RoomVisit }) => {
  const target = tokens[index].attrGet('href') ?? '';
  if (target.startsWith('node:')) {
    const id = target.slice(5);
    if (Object.hasOwn(env.visit.nodes, id)) return `<button type="button" class="node-link" data-node-id="${escape(id)}">`;
    return '<span>';
  }
  return /^(https?:|mailto:)/i.test(target) ? `<a href="${escape(target)}" target="_blank" rel="noopener noreferrer">` : '<span>';
};
md.renderer.rules.link_close = (tokens, index, _, env: { visit: RoomVisit }) => {
  // Inline tokens nest formatting inside labels; locate the corresponding opener.
  let depth = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (tokens[i].type === 'link_close') depth++;
    if (tokens[i].type === 'link_open' && --depth === 0) {
      const target = tokens[i].attrGet('href') ?? '';
      if (target.startsWith('node:')) return Object.hasOwn(env.visit.nodes, target.slice(5)) ? '</button>' : '</span>';
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
  if (state.src[pos] !== '$' || /[\d\s$]/.test(state.src[pos + 1] ?? '') || state.src[pos - 1] === '\\') return false;
  let end = pos + 1;
  while ((end = state.src.indexOf('$', end)) !== -1 && state.src[end - 1] === '\\') end++;
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
export function renderMarkdown(text: string, visit: RoomVisit): string {
  return DOMPurify.sanitize(md.render(text, { visit }), { FORBID_TAGS: ['style', 'iframe', 'script'], FORBID_ATTR: ['style'], ADD_ATTR: ['data-node-id', 'data-copy', 'data-mermaid'] });
}
let diagramSequence = 0;
export async function renderDiagrams(root: HTMLElement): Promise<void> {
  if (!root.querySelector('[data-mermaid]')) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark', themeVariables: {
    primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
    primaryTextColor: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
    lineColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  } });
  for (const block of root.querySelectorAll<HTMLElement>('[data-mermaid]')) {
    if (block.dataset.rendered) continue; block.dataset.rendered = 'true';
    const source = block.textContent ?? '';
    try { const { svg } = await mermaid.render(`lantern-diagram-${++diagramSequence}`, source);
      if (block.isConnected) block.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_ATTR: ['style'], FORBID_TAGS: ['foreignObject', 'script', 'style'] });
    } catch { block.title = strings.diagramFailed; }
  }
}
