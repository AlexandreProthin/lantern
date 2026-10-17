<script lang="ts">
  import { tick } from 'svelte';
  import { strings } from '../../ui/strings';
  import type { RoomDefinition } from '../room';
  import { companionSvg, still, GESTURE } from '../../assets/identity/companion/lantern';
  import type { AmberChat } from './chat';
  import type { AmberState } from './state';
  import { markTipSeen, nextTip, setSpot, spotOf } from './state';
  import { AMBER_H, AMBER_W, BAR, TIE_X, TIE_Y, bubbleBox, hangSpots, spotById } from './place';
  import AskChat from './AskChat.svelte';
  import Emphasis from './Emphasis.svelte';
  import GuideLines from './GuideLines.svelte';
  /**
   * The companion (companion spec): hangs from the top bar (CO-10, CO-11), opens its bubble on a click or Enter (CO-20),
   * its menu on right-click, the context-menu key or Shift+F10 (CO-16, CO-58), and lets clicks outside its drawn shape
   * through (CO-17). Movement, gestures and the living flame come in v0.4.0 slices 6 and 7.
   */
  let { room, space, desktop, amberState, saveState, chat, revision, hide, openSettings }: {
    room: RoomDefinition; space: string; desktop: boolean; amberState: AmberState; saveState: (s: AmberState) => void;
    chat: AmberChat; revision: number; hide: () => void; openSettings: () => void;
  } = $props();
  const BUBBLE_W = 340, CONTROLS = 138;
  /** CO-17: the lantern's silhouette (loop, frame and the flame inside it, in the actor's units) takes the pointer; the halo around it does not. */
  const HIT = 'M42 3 H58 V22 C70 34 86 47 86 65 C86 79 81 89 77 99 H23 C19 89 14 79 14 65 C14 47 30 34 42 22 Z';
  let width = $state(innerWidth), bubble = $state(false), mode = $state<'tip' | 'guide'>('tip'), tipId = $state<string>(), menu = $state<null | 'main' | 'move'>(null);
  let button = $state<HTMLButtonElement>(), bubbleEl = $state<HTMLElement>(), menuEl = $state<HTMLElement>(), askChat = $state<ReturnType<typeof AskChat>>();
  const uid = `amber-${Math.random().toString(36).slice(2, 8)}`;
  const spots = $derived(hangSpots(width, desktop ? CONTROLS : 0));
  const spot = $derived(spotById(spots, spotOf(amberState, room.id, space)));
  // CO-55: the identity's warm flame and body; the halo and the light on the frame follow the room's --amber-* tokens.
  const svg = $derived(companionSvg(GESTURE.suspension, still(GESTURE.suspension), uid, 'learn', true));
  const pool = $derived([...strings.amberTips, ...(room.companion?.tips ?? [])]);
  const tip = $derived(pool.find(t => t.id === tipId));
  const guide = $derived(room.companion?.guide[space] ?? []);
  const box = $derived(bubbleBox(spot, width, BUBBLE_W));

  /** CO-21: the next tip, unseen first; it is remembered as seen once shown. */
  function showNextTip() {
    const id = nextTip(pool.map(t => t.id), amberState, tipId); tipId = id; mode = 'tip';
    if (id) saveState(markTipSeen(amberState, id));
  }
  /** CO-20, CO-41: opens the bubble; Ctrl+J also focuses the Ask field. */
  export async function open(focusAsk = false) {
    menu = null;
    if (!bubble) { bubble = true; showNextTip(); }
    await tick(); if (focusAsk) askChat?.focus(); else bubbleEl?.focus();
  }
  function closeBubble(refocus = false) { bubble = false; chat.close(); if (refocus) button?.focus(); }
  async function openMenu() { closeBubble(); menu = 'main'; await tick(); menuEl?.querySelector<HTMLElement>('[role^=menuitem]')?.focus(); }
  function closeMenu() { menu = null; button?.focus(); }
  function moveTo(id: string) { saveState(setSpot(amberState, room.id, space, id)); closeMenu(); }
  function buttonKey(e: KeyboardEvent) { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); void openMenu(); } }
  function menuKey(e: KeyboardEvent) {
    const items = [...(menuEl?.querySelectorAll<HTMLElement>('[role^=menuitem]') ?? [])], at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (menu === 'move') { menu = 'main'; void tick().then(() => menuEl?.querySelector<HTMLElement>('[role^=menuitem]')?.focus()); } else closeMenu(); }
  }
  // CO-20: Esc or a press outside closes the bubble (and forgets its chat, CO-44); the same for the menu.
  function outside(e: PointerEvent) {
    if (!(e.target instanceof Node)) return;
    if (bubble && !bubbleEl?.contains(e.target) && !button?.contains(e.target)) closeBubble();
    if (menu && !menuEl?.contains(e.target)) menu = null;
  }
  $effect(() => () => chat.close());
</script>
<svelte:window bind:innerWidth={width} onpointerdowncapture={outside} />
<svg class="rope" aria-hidden="true" style:left={`${spot.left + TIE_X - 2}px`} style:top={`${BAR}px`} width="4" height={Math.max(1, spot.top + TIE_Y - BAR)}>
  <path d={`M2 0 V${Math.max(1, spot.top + TIE_Y - BAR)}`} />
</svg>
<button bind:this={button} class="amber" data-spot={spot.id} aria-label={strings.amberName} title={strings.amberTitle} aria-haspopup="dialog" aria-expanded={bubble}
  style:left={`${spot.left}px`} style:top={`${spot.top}px`} style:width={`${AMBER_W}px`} style:height={`${AMBER_H}px`}
  onclick={() => bubble ? closeBubble() : void open()} oncontextmenu={e => { e.preventDefault(); void openMenu(); }} onkeydown={buttonKey}>{@html svg}<svg class="hit" viewBox="-20 -24 140 148" aria-hidden="true"><path d={HIT} /></svg></button>
{#if bubble}
  <div class="bubble" role="dialog" aria-label={strings.amberName} tabindex="-1" bind:this={bubbleEl} style:left={`${box.left}px`} style:top={`${box.top}px`} style:width={`${BUBBLE_W}px`}
    onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeBubble(true); } }}>
    {#if mode === 'tip'}<p class="tip">{#if tip}<Emphasis text={tip.text} />{/if}</p>
    {:else}<h3>{strings.whatCanIDo}</h3><GuideLines lines={guide} />{/if}
    <div class="row"><button onclick={showNextTip}>{strings.nextTip}</button>{#if guide.length}<button aria-pressed={mode === 'guide'} onclick={() => mode = 'guide'}>{strings.whatCanIDo}</button>{/if}</div>
    <AskChat bind:this={askChat} {chat} {revision} close={() => closeBubble(true)} {openSettings} autofocus={false} />
  </div>
{/if}
{#if menu}
  <div class="menu" role="menu" tabindex="-1" aria-label={strings.amberName} bind:this={menuEl} onkeydown={menuKey} style:left={`${Math.min(width - 230, spot.left)}px`} style:top={`${spot.top + AMBER_H + 6}px`}>
    {#if menu === 'main'}
      <button role="menuitem" aria-haspopup="menu" onclick={async () => { menu = 'move'; await tick(); menuEl?.querySelector<HTMLElement>('[aria-checked=true]')?.focus(); }}>{strings.moveTo}</button>
      <button role="menuitem" onclick={() => { menu = null; hide(); }}>{strings.hideAmber}</button>
    {:else}
      {#each spots as s (s.id)}<button role="menuitemradio" aria-checked={s.id === spot.id} onclick={() => moveTo(s.id)}>{strings.amberSpotHang(s.index + 1)}</button>{/each}
    {/if}
  </div>
{/if}
<style>
  /* Above the spaces, under the header's menus, the toasts and every popover (CO-17). */
  .amber, .rope { position:fixed; z-index:1; }
  .rope { pointer-events:none; overflow:visible; } .rope path { stroke:var(--amber-lit-far, #86624a); stroke-width:1.6; fill:none; }
  /* Only the drawn shape takes the pointer; the halo and the box around it let clicks through. */
  .amber { padding:0; margin:0; border:0; background:none; min-width:0; pointer-events:none; cursor:pointer; border-radius:12px; }
  .amber :global(svg) { display:block; width:100%; height:100%; pointer-events:none; overflow:visible; }
  .amber :global(svg path), .amber :global(svg rect) { pointer-events:visiblePainted; }
  .amber :global(defs *) { pointer-events:none; }
  .amber { position:fixed; } .hit { position:absolute; inset:0; } .hit path { fill:transparent; pointer-events:visiblePainted; }
  .amber:hover:not(:disabled), .amber:active { background:none; border:0; box-shadow:none; }
  .amber:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
  .bubble { position:fixed; z-index:9; display:grid; gap:10px; padding:14px 16px; box-sizing:border-box; max-height:min(70vh,560px); overflow:auto;
    background:var(--surface); border:1px solid var(--line); border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,.35); font-size:14px; line-height:1.5; }
  .bubble:focus { outline:none; } .tip { margin:0; } h3 { margin:0; font-size:14px; font-weight:600; }
  .row { display:flex; gap:8px; flex-wrap:wrap; } .row button { font-size:13px; } .row [aria-pressed='true'] { border-color:var(--accent); }
  .menu { position:fixed; z-index:9; display:grid; gap:2px; min-width:200px; max-height:60vh; overflow:auto; padding:6px; background:var(--surface); border:1px solid var(--line); border-radius:8px; box-shadow:0 10px 28px rgba(0,0,0,.35); }
  .menu button { text-align:left; border:0; background:none; padding:6px 10px; border-radius:6px; font-size:13px; }
  .menu button:hover, .menu button:focus { background:var(--surface-2); outline:none; } .menu [aria-checked='true'] { color:var(--accent); }
</style>
