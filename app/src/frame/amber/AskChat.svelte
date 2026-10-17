<script lang="ts">
  import { tick } from 'svelte';
  import type { RoomVisit } from '../../core/model';
  import { renderMarkdown } from '../../ui/markdown';
  import { strings } from '../../ui/strings';
  import type { AmberChat } from './chat';
  /** CO-41 to CO-49: the chat itself, shared by the Ask box (Amber off) and Amber's bubble (Amber on). */
  let { chat, revision, close, openSettings, autofocus = true }: { chat: AmberChat; revision: number; close: () => void; openSettings: () => void; autofocus?: boolean } = $props();
  let field = $state<HTMLTextAreaElement>(), log = $state<HTMLElement>(), draft = $state('');
  const noVisit = { nodes: {} } as unknown as RoomVisit;
  const busy = $derived.by(() => { void revision; return chat.phase === 'thinking' || chat.phase === 'streaming'; });
  export function focus() { field?.focus(); }
  $effect(() => { revision; void tick().then(() => { if (log) log.scrollTop = log.scrollHeight; }); });
  $effect(() => { if (autofocus) field?.focus(); });
  function submit() { const question = draft.trim(); if (!question || busy) return; draft = ''; void chat.ask(question); }
  function key(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  }
  const fixable = (kind: string) => ['not-installed', 'not-logged-in', 'model-unknown'].includes(kind);
</script>
{#key revision}
{#if chat.turns.length || chat.pending}
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
{/if}
{/key}
<textarea bind:this={field} bind:value={draft} rows="2" aria-label={strings.askAmber} placeholder={strings.askAmberPlaceholder} onkeydown={key}></textarea>
<style>
  .log { overflow:auto; display:grid; gap:8px; min-height:0; font-size:14px; line-height:1.5; }
  .you { color:var(--ink-mute); margin:0; } .you q { font-style:italic; } .amber :global(p) { margin:0 0 6px; } .thinking { color:var(--accent); margin:0; }
  .error { display:grid; gap:6px; color:var(--error-ink); } .error p { margin:0; } .actions { display:flex; gap:8px; }
  textarea { resize:none; width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; }
  textarea:focus { outline:none; border-color:var(--accent); }
</style>
