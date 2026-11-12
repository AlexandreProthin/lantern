<script lang="ts" module>
  /** NP-77: open blocks per rendered text, for the session; the oldest texts are forgotten first. */
  const openDetails = new Map<string, Set<number>>(), OPEN_DETAILS_KEPT = 200;
</script>
<script lang="ts">
  import { tick } from 'svelte';
  import type { RoomVisit } from '../core/model';
  import { renderMarkdown, renderDiagrams } from './markdown';
  import { strings } from './strings';
  import { invoke } from '../frame/ipc';
  import { native } from '../frame/host';
  import 'katex/dist/katex.min.css';
  let { text, visit, streaming = false, focus, preview }: { text: string; visit: RoomVisit; streaming?: boolean; focus: (id: string) => void; preview?: (id: string | null) => void } = $props();
  let root: HTMLElement;
  const html = $derived(renderMarkdown(text, visit));
  $effect(() => { html; if (!streaming && root) tick().then(() => { restoreDetails(); return renderDiagrams(root); }); });
  // NP-77: a collapsible block stays open or closed for the session while the text is unchanged,
  // even when the rendering is redone (a save elsewhere, a node link becoming valid).
  function restoreDetails() {
    const open = openDetails.get(text);
    if (open) root.querySelectorAll('details').forEach((d, i) => { d.open = open.has(i); });
  }
  $effect(() => {
    const toggled = (e: Event) => {
      if (!(e.target instanceof HTMLDetailsElement)) return;
      const all = [...root.querySelectorAll('details')], open = new Set(all.flatMap((d, i) => d.open ? [i] : []));
      openDetails.delete(text); openDetails.set(text, open);
      if (openDetails.size > OPEN_DETAILS_KEPT) openDetails.delete(openDetails.keys().next().value!);
      if (e.target.open) void renderDiagrams(root);
    };
    root.addEventListener('toggle', toggled, true);
    return () => root.removeEventListener('toggle', toggled, true);
  });
  // GV-44: tell the graph which node link is under the pointer or keyboard focus.
  let previewing: string | null = null;
  function hover(e: Event) {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-node-id]')?.dataset.nodeId ?? null;
    if (id !== previewing) { previewing = id; preview?.(id); }
  }
  function leave() { if (previewing) { previewing = null; preview?.(null); } }
  function click(e: MouseEvent) {
    const element = e.target as HTMLElement, link = element.closest<HTMLButtonElement>('[data-node-id]');
    if (link?.dataset.nodeId) { focus(link.dataset.nodeId); return; }
    const copy = element.closest<HTMLButtonElement>('[data-copy]');
    if (copy) { navigator.clipboard.writeText(copy.parentElement?.querySelector('code')?.textContent ?? '').then(() => { copy.textContent = strings.copied; }); return; }
    const external = element.closest<HTMLAnchorElement>('a[href]');
    if (external && native) { e.preventDefault(); void invoke('open_external', { url: external.href }); }
  }
</script>
<!-- Generated buttons/links handle the keyboard's synthetic click events. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_mouse_events_have_key_events -->
<article class="md" class:streaming bind:this={root} onclick={click} onmouseover={hover} onfocusin={hover} onmouseleave={leave} onfocusout={leave}>{@html html}</article>
<style>
  .md { max-width:75ch; overflow-wrap:anywhere; line-height:1.65; }
  .md :global(strong) { color:var(--focus); }
  .md :global(a), .md :global(.node-link) { color:var(--accent); }
  .md :global(.node-link) { padding:0; border:0; background:none; text-decoration:underline; font:inherit; }
  .md :global(pre) { overflow:auto; padding:14px; background:var(--code); border-radius:7px; }
  .md :global(table) { border-collapse:collapse; max-width:100%; }
  .md :global(th), .md :global(td) { padding:6px 10px; border:1px solid var(--line); }
  .md :global(blockquote) { border-left:2px solid var(--line); margin-left:0; padding-left:16px; color:var(--ink-mute); }
  .md :global(.code-block) { position:relative; }
  .md :global([data-copy]) { position:absolute; right:4px; top:4px; font-size:11px; }
  .md :global(.math-error) { color:var(--error-ink); }
  .md :global(.hljs-keyword),.md :global(.hljs-selector-tag),.md :global(.hljs-meta .hljs-keyword) {color:var(--code-keyword);}
  .md :global(.hljs-string),.md :global(.hljs-regexp),.md :global(.hljs-symbol),.md :global(.hljs-template-tag),.md :global(.hljs-addition) {color:var(--code-string);}
  .md :global(.hljs-number),.md :global(.hljs-literal),.md :global(.hljs-variable.constant_) {color:var(--code-number);}
  .md :global(.hljs-title),.md :global(.hljs-title.function_),.md :global(.hljs-section) {color:var(--code-function);}
  .md :global(.hljs-built_in),.md :global(.hljs-type),.md :global(.hljs-title.class_),.md :global(.hljs-name),.md :global(.hljs-selector-class) {color:var(--code-type);}
  .md :global(.hljs-attr),.md :global(.hljs-attribute),.md :global(.hljs-property),.md :global(.hljs-params),.md :global(.hljs-variable),.md :global(.hljs-template-variable),.md :global(.hljs-meta) {color:var(--code-attr);}
  .md :global(.hljs-comment),.md :global(.hljs-quote),.md :global(.hljs-deletion) {color:var(--code-comment);font-style:italic;}
  .md :global(svg) { max-width:100%; height:auto; }
  /* NP-78: collapsible blocks, in the panel's tokens. */
  .md :global(details.md-details) { margin:1em 0; border:1px solid var(--line); border-radius:6px; background:var(--surface); }
  .md :global(details.md-details > summary) { cursor:pointer; padding:7px 12px; color:var(--ink-mute); list-style:none; border-radius:6px; user-select:none; }
  .md :global(details.md-details > summary::-webkit-details-marker) { display:none; }
  .md :global(details.md-details > summary::before) { content:''; display:inline-block; width:6px; height:6px; margin:0 10px 2px 2px; border-right:1.5px solid currentColor; border-bottom:1.5px solid currentColor; transform:rotate(-45deg); transition:transform .15s ease-out; }
  .md :global(details.md-details[open] > summary::before) { transform:rotate(45deg); }
  .md :global(details.md-details > summary:hover) { color:var(--accent); }
  .md :global(details.md-details > summary:focus-visible) { outline:1px solid var(--focus); outline-offset:2px; }
  .md :global(details.md-details[open] > summary) { border-bottom:1px solid var(--line); border-radius:6px 6px 0 0; }
  .md :global(details.md-details > :not(summary)) { margin-left:16px; margin-right:16px; }
  .md :global(details.md-details > :last-child:not(summary)) { margin-bottom:12px; }
  @media(prefers-reduced-motion:reduce) { .md :global(details.md-details > summary::before) { transition:none; } }
  .streaming::after { content:'▍'; color:var(--accent); animation:cursor 1s steps(2) infinite; }
  @keyframes cursor { to { opacity:0; } }
  @media(prefers-reduced-motion:reduce) { .streaming::after { animation:none; } }
  :global(html[data-reduce-motion='on']) .streaming::after {animation:none;}
</style>
