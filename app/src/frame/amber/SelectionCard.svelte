<script lang="ts">
  import { onMount } from 'svelte';
  import type { RoomVisit } from '../../core/model';
  import { renderMarkdown } from '../../ui/markdown';
  import { strings } from '../../ui/strings';
  import type { AskAmberDetail } from '../../ui/ask-amber';
  import type { AmberChat } from './chat';
  /** CO-45, NP-54: Amber's answer on a selection, in a card anchored to it; not saved. The same with Amber off. */
  let { detail, chat, revision, close, openSettings }: { detail: AskAmberDetail; chat: AmberChat; revision: number; close: () => void; openSettings: () => void } = $props();
  const WIDTH = 340, GAP = 8;
  const noVisit = { nodes: {} } as unknown as RoomVisit;
  let root: HTMLElement, height = $state(0);
  // Below the selection when it fits, else above; always inside the window.
  const left = $derived(Math.max(GAP, Math.min(innerWidth - WIDTH - GAP, detail.rect.left)));
  const top = $derived(detail.rect.bottom + GAP + height <= innerHeight - GAP ? detail.rect.bottom + GAP : Math.max(GAP, detail.rect.top - GAP - height));
  const view = $derived.by(() => { void revision; return { turn: chat.turns[0], pending: chat.pending, phase: chat.phase }; });
  function outside(e: PointerEvent) { if (root && e.target instanceof Node && !root.contains(e.target)) close(); }
  function key(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
  function tutor() { detail.askTutor(); close(); }
  onMount(() => { void chat.ask(strings.amberDefine, detail.text); root.focus(); });
  const fixable = (kind: string) => ['not-installed', 'not-logged-in', 'model-unknown'].includes(kind);
</script>
<svelte:window onpointerdowncapture={outside} onkeydowncapture={key} />
<div class="card" role="dialog" aria-label={strings.askAmber} tabindex="-1" bind:this={root} bind:clientHeight={height} style:left={`${left}px`} style:top={`${top}px`} style:width={`${WIDTH}px`}>
  <q>{detail.text.length > 120 ? detail.text.slice(0, 120) + '…' : detail.text}</q>
  {#if view.turn}<div class="answer" aria-live="polite">{@html renderMarkdown(view.turn.answer, noVisit)}</div>
  {:else if view.pending?.error}
    <div class="error" role="alert"><strong>{strings.amberFailed}</strong><p>{strings.errorKinds[view.pending.error.kind]}</p>
      <div class="actions"><button onclick={() => void chat.retry()}>{strings.retry}</button>{#if fixable(view.pending.error.kind)}<button onclick={openSettings}>{strings.settings}</button>{/if}</div></div>
  {:else if view.phase === 'thinking'}<p class="thinking" role="status">{strings.amberThinking}</p>
  {:else if view.pending?.answer}<div class="answer" aria-live="polite">{@html renderMarkdown(view.pending.answer, noVisit)}</div>{/if}
  <div class="actions"><button onclick={tutor}>{strings.askTutor}</button><button onclick={close}>{strings.close}</button></div>
</div>
<style>
  .card { position:fixed; z-index:14; display:grid; gap:8px; padding:12px 14px; box-sizing:border-box; background:var(--surface); border:1px solid var(--line); border-radius:10px;
    box-shadow:0 10px 28px rgba(0,0,0,.35); font-size:14px; line-height:1.5; max-height:min(50vh,420px); overflow:auto; }
  .card:focus { outline:none; }
  q { color:var(--ink-mute); font-style:italic; } .answer :global(p) { margin:0 0 6px; } .thinking { color:var(--accent); margin:0; }
  .error { display:grid; gap:4px; color:var(--error-ink); } .error p { margin:0; } .actions { display:flex; gap:8px; justify-content:flex-end; }
</style>
