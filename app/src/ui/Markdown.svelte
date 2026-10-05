<script lang="ts">
  import { tick } from 'svelte';
  import type { RoomVisit } from '../core/model';
  import { renderMarkdown, renderDiagrams } from './markdown';
  import { strings } from './strings';
  import { invoke } from '@tauri-apps/api/core';
  import 'katex/dist/katex.min.css';
  let { text, visit, streaming = false, focus }: { text: string; visit: RoomVisit; streaming?: boolean; focus: (id: string) => void } = $props();
  let root: HTMLElement;
  const html = $derived(renderMarkdown(text, visit));
  $effect(() => { html; if (!streaming && root) tick().then(() => renderDiagrams(root)); });
  function click(e: MouseEvent) {
    const element = e.target as HTMLElement, link = element.closest<HTMLButtonElement>('[data-node-id]');
    if (link?.dataset.nodeId) { focus(link.dataset.nodeId); return; }
    const copy = element.closest<HTMLButtonElement>('[data-copy]');
    if (copy) { navigator.clipboard.writeText(copy.parentElement?.querySelector('code')?.textContent ?? '').then(() => { copy.textContent = strings.copied; }); return; }
    const external = element.closest<HTMLAnchorElement>('a[href]');
    if (external && '__TAURI_INTERNALS__' in window) { e.preventDefault(); void invoke('open_external', { url: external.href }); }
  }
</script>
<!-- Generated buttons/links handle the keyboard's synthetic click events. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<article class="md" class:streaming bind:this={root} onclick={click}>{@html html}</article>
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
  .streaming::after { content:'▍'; color:var(--accent); animation:cursor 1s steps(2) infinite; }
  @keyframes cursor { to { opacity:0; } }
  @media(prefers-reduced-motion:reduce) { .streaming::after { animation:none; } }
  :global(html[data-reduce-motion='on']) .streaming::after {animation:none;}
</style>
