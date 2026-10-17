<script lang="ts">
  import { strings } from '../../ui/strings';
  import type { AmberChat } from './chat';
  import AskChat from './AskChat.svelte';
  /** CO-41: Ask Amber's box while Amber is off (Ctrl+J, the capsule's *Ask*); with Amber on, the same chat lives in its bubble. */
  let { chat, revision, close, openSettings }: { chat: AmberChat; revision: number; close: () => void; openSettings: () => void } = $props();
  let root: HTMLElement, inner = $state<ReturnType<typeof AskChat>>();
  export function focus() { inner?.focus(); }
  // CO-20/CO-41: a press outside the box closes it (and forgets the chat, CO-44).
  function outside(e: PointerEvent) { if (root && e.target instanceof Node && !root.contains(e.target)) close(); }
</script>
<svelte:window onpointerdowncapture={outside} />
<div class="ask" role="dialog" tabindex="-1" aria-label={strings.askAmber} bind:this={root} onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
  <header><h2>{strings.askAmber}</h2><button aria-label={strings.close} onclick={close}>×</button></header>
  <AskChat bind:this={inner} {chat} {revision} {close} {openSettings} />
</div>
<style>
  .ask { position:fixed; right:16px; top:68px; z-index:15; width:min(400px,calc(100vw - 32px)); max-height:min(70vh,560px); display:flex; flex-direction:column; gap:10px; padding:14px 16px 16px;
    background:var(--surface); border:1px solid var(--line); border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,.35); }
  header { display:flex; align-items:center; justify-content:space-between; } h2 { font-size:14px; font-weight:600; margin:0; } header button { background:none; border:0; padding:2px 8px; }
</style>
