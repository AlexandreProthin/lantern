<script lang="ts">
  import { tick } from 'svelte';
  import type { RoomVisit } from '../../core/model';
  import { renderMarkdown } from '../../ui/markdown';
  import { strings } from '../../ui/strings';
  import { errorMessage } from '../../ui/error-message';
  import type { AmberChat } from './chat';
  /** CO-41 to CO-49: the chat itself, shared by the Ask box (Amber off) and Amber's bubble (Amber on). */
  let { chat, revision, close, openSettings, autofocus = true }: { chat: AmberChat; revision: number; close: () => void; openSettings: () => void; autofocus?: boolean } = $props();
  let field = $state<HTMLTextAreaElement>(), log = $state<HTMLElement>(), draft = $state('');
  const noVisit = { nodes: {} } as unknown as RoomVisit;
  const busy = $derived.by(() => { void revision; return chat.phase === 'thinking' || chat.phase === 'streaming'; });
  // Per part, so a streamed chunk redraws the answer being written and nothing else: done turns keep their markup.
  const phase = $derived.by(() => { void revision; return chat.phase; });
  const turns = $derived.by(() => { void revision; return chat.turns; });
  const pending = $derived.by(() => { void revision; const p = chat.pending; return p ? { question: p.question, selection: p.selection, error: p.error } : null; });
  const answer = $derived.by(() => { void revision; return chat.pending?.answer ?? ''; });
  const answerHtml = $derived(answer ? renderMarkdown(answer, noVisit) : '');
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
{#if turns.length || pending}
<div class="log" bind:this={log} aria-live="polite">
  {#each turns as turn (turn)}
    <p class="you">{#if turn.selection}<q>{turn.selection}</q> {/if}{turn.question}</p>
    <div class="amber">{@html renderMarkdown(turn.answer, noVisit)}</div>
  {/each}
  {#if pending}
    <p class="you">{#if pending.selection}<q>{pending.selection}</q> {/if}{pending.question}</p>
    {#if phase === 'thinking'}<p class="thinking" role="status">{strings.amberThinking}</p>
    {:else if answer}<div class="amber" data-testid="amber-streaming">{@html answerHtml}</div>{/if}
    {#if pending.error}
      <div class="error" role="alert"><strong>{strings.amberFailed}</strong><p>{errorMessage(pending.error)}</p>
        <details><summary>{strings.details}</summary><pre>{pending.error.details}</pre></details>
        <div class="actions"><button onclick={() => void chat.retry()}>{strings.retry}</button>{#if fixable(pending.error.kind)}<button onclick={openSettings}>{strings.settings}</button>{/if}</div></div>
    {/if}
  {/if}
</div>
{/if}
<textarea bind:this={field} bind:value={draft} rows="2" aria-label={strings.askAmber} placeholder={strings.askAmberPlaceholder} onkeydown={key}></textarea>
<style>
  .log { overflow:auto; display:grid; gap:8px; min-height:0; font-size:calc(14px * var(--text-scale)); line-height:1.5; }
  .you { color:var(--ink-mute); margin:0; } .you q { font-style:italic; } .amber :global(p) { margin:0 0 6px; } .thinking { color:var(--accent); margin:0; }
  .error { display:grid; gap:6px; color:var(--error-ink); } .error p { margin:0; } .actions { display:flex; gap:8px; }
  textarea { resize:none; width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; }
  textarea:focus { outline:none; border-color:var(--accent); }
</style>
