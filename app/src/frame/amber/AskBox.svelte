<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { RoomVisit } from '../../core/model';
  import { renderMarkdown } from '../../ui/markdown';
  import { strings } from '../../ui/strings';
  import type { AmberChat } from './chat';
  /** CO-41: Ask Amber's box. With Amber off it opens on its own (Ctrl+J, the *Ask* button); slice 5 puts the same box in Amber's bubble. */
  let { chat, revision, close, openSettings }: { chat: AmberChat; revision: number; close: () => void; openSettings: () => void } = $props();
  let field: HTMLTextAreaElement, root: HTMLElement, log = $state<HTMLElement>(), draft = $state('');
  const noVisit = { nodes: {} } as unknown as RoomVisit;
  const busy = $derived.by(() => { void revision; return chat.phase === 'thinking' || chat.phase === 'streaming'; });
  export function focus() { field?.focus(); }
  $effect(() => { revision; void tick().then(() => { if (log) log.scrollTop = log.scrollHeight; }); });
  function submit() { const question = draft.trim(); if (!question || busy) return; draft = ''; void chat.ask(question); }
  function key(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  }
  // CO-20/CO-41: a press outside the box closes it (and forgets the chat, CO-44).
  function outside(e: PointerEvent) { if (root && e.target instanceof Node && !root.contains(e.target)) close(); }
  onMount(() => { field.focus(); });
  const fixable = (kind: string) => ['not-installed', 'not-logged-in', 'model-unknown'].includes(kind);
</script>
<svelte:window onpointerdowncapture={outside} />
<div class="ask" role="dialog" tabindex="-1" aria-label={strings.askAmber} bind:this={root} onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
  <header><h2>{strings.askAmber}</h2><button aria-label={strings.close} onclick={close}>×</button></header>
  {#key revision}
  <div class="log" bind:this={log} aria-live="polite">
    {#each chat.turns as turn}
      <p class="you">{#if turn.selection}<q>{turn.selection}</q> {/if}{turn.question}</p>
      <div class="amber">{@html renderMarkdown(turn.answer, noVisit)}</div>
    {/each}
    {#if chat.pending}
      <p class="you">{#if chat.pending.selection}<q>{chat.pending.selection}</q> {/if}{chat.pending.question}</p>
      {#if chat.phase === 'thinking'}<p class="thinking" role="status">{strings.amberThinking}</p>
      {:else if chat.pending.answer}<div class="amber" data-testid="amber-streaming">{@html renderMarkdown(chat.pending.answer, noVisit)}</div>{/if}
      {#if chat.pending.error}
        <div class="error" role="alert"><strong>{strings.amberFailed}</strong><p>{strings.errorKinds[chat.pending.error.kind]}</p>
          <details><summary>{strings.details}</summary><pre>{chat.pending.error.details}</pre></details>
          <div class="actions"><button onclick={() => void chat.retry()}>{strings.retry}</button>{#if fixable(chat.pending.error.kind)}<button onclick={openSettings}>{strings.settings}</button>{/if}</div></div>
      {/if}
    {/if}
  </div>
  {/key}
  <textarea bind:this={field} bind:value={draft} rows="2" aria-label={strings.askAmber} placeholder={strings.askAmberPlaceholder} onkeydown={key}></textarea>
</div>
<style>
  .ask { position:fixed; right:16px; top:68px; z-index:15; width:min(400px,calc(100vw - 32px)); max-height:min(70vh,560px); display:flex; flex-direction:column; gap:10px; padding:14px 16px 16px;
    background:var(--surface); border:1px solid var(--line); border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,.35); }
  header { display:flex; align-items:center; justify-content:space-between; } h2 { font-size:14px; font-weight:600; } header button { background:none; border:0; padding:2px 8px; }
  .log { overflow:auto; display:grid; gap:8px; min-height:0; font-size:14px; line-height:1.5; }
  .log:empty { display:none; }
  .you { color:var(--ink-mute); margin:0; } .you q { font-style:italic; } .amber :global(p) { margin:0 0 6px; } .thinking { color:var(--accent); margin:0; }
  .error { display:grid; gap:6px; color:var(--error-ink); } .error p { margin:0; } .actions { display:flex; gap:8px; }
  textarea { resize:none; width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; }
  textarea:focus { outline:none; border-color:var(--accent); }
</style>
