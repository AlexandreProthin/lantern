<script lang="ts">
  // RS-12..RS-20, RS-25, RS-53: the accepted top bar (agent_design/top-bar/RECIPE.md, r005-02 "Gliding marker").
  // It is the window's title bar: the header and its top strip drag the window, under a 3 px resize edge.
  import { onMount, tick } from 'svelte';
  import { strings } from '../ui/strings';
  import { glyphs } from '../ui/glyphs';
  import WindowControls from './WindowControls.svelte';
  import { barFit, BAR_GAP } from './topbar';
  import type { BarFit } from './topbar';
  import type { RoomDefinition } from './room';
  let { rooms, room, space, subjectCount, title, busy, summary, showTokenStats, desktop, mark, panelOpen, roomMenu = $bindable(), fieldWidth = $bindable(),
    navigate, switchRoom, openSettings, togglePanel, ask }: {
    rooms: readonly RoomDefinition[]; room: RoomDefinition; space: string; subjectCount: number; title: string | null; busy: boolean;
    summary: { text: string; tooltip: string } | null; showTokenStats: boolean; desktop: boolean; mark: string; panelOpen: boolean;
    roomMenu: boolean; fieldWidth: number;
    navigate: (space: string) => void; switchRoom: (id: string) => void; openSettings: () => void; togglePanel: () => void;
    /** RS-12, CO-41: given only while Amber is off; the capsule then ends with *Ask*. */
    ask?: () => void;
  } = $props();
  /** The window controls' width (3 × 46 px); the stats end one gap before them. */
  const CONTROLS = 138, PAD = 16;
  let header = $state<HTMLElement>(), capsule = $state<HTMLElement>(), stats = $state<HTMLElement>(), field = $state<HTMLElement>();
  let fit = $state.raw<BarFit>({ tokenHover: true, stats: true, words: true, fieldPct: 34 });
  let marker = $state({ left: 0, width: 0, dot: 0, shown: false }), instant = $state(true), placedKey = '';

  /** RS-18: measure what each part needs at full size, whatever the current fold, then pick the level. */
  function measure() {
    if (!header || !capsule) return;
    const words = [...capsule.querySelectorAll<HTMLElement>('.word')];
    const shown = words.reduce((sum, w) => sum + w.offsetWidth + (w.offsetWidth ? 6 : 0), 0), natural = words.reduce((sum, w) => sum + w.scrollWidth + 6, 0);
    const capGlyphs = capsule.offsetWidth - shown, width = header.clientWidth;
    const next = barFit({ width, capLeft: capsule.offsetLeft, capWords: capGlyphs + natural, capGlyphs, stats: stats?.scrollWidth ?? 0,
      statsRight: width - (desktop ? CONTROLS : PAD) - (desktop ? BAR_GAP : 0) });
    // barFit returns one of its fixed levels, so an unchanged level keeps the same object and wakes nothing.
    if (next !== fit) fit = next;
  }
  /** RS-20: the underline and its dot sit under the current space; they glide on a switch, and jump on a room change or a fold. */
  async function place() {
    await tick();
    const current = capsule?.querySelector<HTMLElement>('.space[aria-current=page]');
    if (!current) { marker.shown = false; return; }
    const key = `${room.id}:${fit.words}`, jump = key !== placedKey || !marker.shown;
    placedKey = key; instant = jump;
    marker = { left: current.offsetLeft + 6, width: current.offsetWidth - 12, dot: current.offsetLeft + current.offsetWidth - 9, shown: true };
    if (jump) { await tick(); capsule?.offsetWidth; instant = false; }
  }
  $effect(() => { room; title; summary?.text; void tick().then(measure); });
  $effect(() => { space; room; fit.words; void place(); });
  $effect(() => { fit.fieldPct; if (field) fieldWidth = field.offsetWidth; });
  onMount(() => {
    const observer = new ResizeObserver(() => { measure(); void place(); if (field) fieldWidth = field.offsetWidth; });
    if (header) observer.observe(header);
    void document.fonts?.ready.then(() => { measure(); void place(); });
    return () => observer.disconnect();
  });
</script>
<header bind:this={header} data-tauri-drag-region style:--field={`${fit.fieldPct}%`}>
  <div class="drag-strip" data-tauri-drag-region style:right={desktop ? `${CONTROLS}px` : '0'}></div>
  <button class="mark" onclick={() => navigate('welcome')} title={strings.welcome} aria-label={strings.welcome}><span class="mark-art" aria-hidden="true">{@html mark}</span></button>
  <div class="capsule" class:instant bind:this={capsule}>
    {#if rooms.length > 1}<span class="room-chip"><button class="room menu" aria-label={room.name} aria-haspopup="menu" aria-expanded={roomMenu} title={strings.rooms} onclick={() => roomMenu = !roomMenu}>{room.name}</button>{#if roomMenu}<div class="room-menu" role="menu" aria-label={strings.rooms}>{#each rooms as r, i (r.id)}<button role="menuitemradio" aria-checked={r.id === room.id} title={`Ctrl+Shift+${i + 1}`} onclick={() => switchRoom(r.id)}><span class="swatch" style:background={r.accent['--accent']}></span>{r.name}</button>{/each}</div>{/if}</span>{:else}<span class="room">{room.name}</span>{/if}
    <span class="sep" aria-hidden="true"></span>
    <nav aria-label={strings.spaces} class:folded={!fit.words}>{#each room.spaces as item (item.id)}<button class="space" aria-label={item.label} title={`${item.label} · Ctrl+${item.shortcutIndex}`} aria-current={space === item.id ? 'page' : undefined} disabled={item.id !== 'welcome' && !subjectCount} onclick={() => navigate(item.id)}><svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">{@html item.icon}</svg><span class="word" aria-hidden="true">{item.label}</span></button>{/each}</nav>
    <span class="sep" aria-hidden="true"></span>
    <button class="gear" aria-label={strings.settings} title={`${strings.settings} · Ctrl+,`} onclick={openSettings}><svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">{@html glyphs.settings}</svg></button>
    <!-- RS-12, CO-41: while Amber is off, its Ask button is the capsule's last segment. -->
    {#if ask}<span class="sep" aria-hidden="true"></span><button class="ask" aria-label={strings.askAmber} title={`${strings.askAmber} · Ctrl+J`} onclick={ask}><svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">{@html glyphs.ask}</svg></button>{/if}
    {#if marker.shown}<span class="marker" aria-hidden="true" style:left={`${marker.left}px`} style:width={`${marker.width}px`}></span><span class="dot" aria-hidden="true" style:left={`${marker.dot}px`}></span>{/if}
  </div>
  <button class="subject-field" bind:this={field} aria-haspopup="dialog" aria-expanded={panelOpen} aria-keyshortcuts="Control+K" title={title ?? strings.openASubject} onclick={togglePanel}>
    {#if title}<span class="title">{title}</span>{#if busy}<span class="busy-dot" role="img" aria-label={strings.generating}></span>{/if}{:else}<span class="placeholder">{strings.openASubject}</span>{/if}
    <span class="kbd" aria-hidden="true">Ctrl+K</span>
  </button>
  <span class="spacer" data-tauri-drag-region></span>
  {#if summary}<small class="stats" class:folded={!fit.stats} bind:this={stats} data-tauri-drag-region title={showTokenStats && fit.tokenHover ? summary.tooltip : undefined}>{summary.text}</small>{/if}
  {#if desktop}<WindowControls />{/if}
</header>
<style>
  header { position:relative; z-index:2; flex-shrink:0; height:56px; display:flex; align-items:center; gap:14px; padding:0 16px; border-bottom:1px solid var(--glass-line); background:var(--glass); backdrop-filter:var(--glass-blur); }
  /* The top strip drags the window above the controls; the 3 px above it stay the resize edge. */
  .drag-strip { position:absolute; left:0; top:3px; height:7px; z-index:3; }
  header button { background:none; border:0; border-radius:0; padding:0; min-width:0; color:var(--ink-mute); }
  header button:hover:not(:disabled) { background:none; color:var(--ink); }
  .mark { display:flex; align-items:center; flex:none; }
  .mark-art, .mark-art :global(svg) { display:block; width:26px; height:26px; }
  /* RS-53: the flame is the mark's only path with its own fill; it takes the room's accent. */
  .mark-art :global(path[fill]) { fill:var(--accent); }
  .capsule { position:relative; z-index:1; flex:none; display:flex; align-items:center; height:36px; box-sizing:border-box; padding:0 4px; border:1px solid var(--line); border-radius:18px; }
  .capsule button, .capsule .room { height:34px; padding:0 9px; font-size:13px; display:inline-flex; align-items:center; white-space:nowrap; transition:color .12s; }
  .room { color:var(--ink); }
  .room.menu::after { content:'▾'; margin-left:6px; font-size:10px; color:var(--ink-mute); }
  .sep { width:1px; height:18px; background:var(--line); flex:none; }
  nav { display:flex; align-items:center; }
  .space[aria-current='page'] { color:var(--ink); }
  .space:disabled { opacity:.45; }
  .glyph { width:16px; height:16px; flex:none; fill:none; stroke:currentColor; stroke-width:1.3; stroke-linecap:round; stroke-linejoin:round; }
  .word { display:inline-block; margin-left:6px; overflow:hidden; }
  .folded .word { max-width:0; margin-left:0; }
  .marker { position:absolute; bottom:0; height:1px; background:var(--ink); }
  .dot { position:absolute; top:7px; width:5px; height:5px; margin-left:-2px; border-radius:50%; background:var(--accent); }
  .marker, .dot { transition:left .24s cubic-bezier(.2,.8,.2,1), width .24s cubic-bezier(.2,.8,.2,1); }
  .instant .marker, .instant .dot { transition:none; }
  .room-chip { position:relative; display:inline-flex; }
  .room-menu { position:absolute; left:50%; transform:translateX(-50%); top:42px; z-index:13; display:grid; gap:2px; min-width:180px; padding:6px; background:var(--surface); border:1px solid var(--line); border-radius:6px; box-shadow:0 12px 32px color-mix(in srgb, var(--bg) 70%, transparent); }
  .room-menu button { height:32px; display:flex; align-items:center; gap:8px; padding:0 10px; border-radius:4px; color:var(--ink); text-align:left; }
  .room-menu button:hover { background:color-mix(in srgb, var(--ink) 6%, transparent); }
  .room-menu [aria-checked='true'] { box-shadow:inset 2px 0 0 var(--accent); }
  .swatch { width:10px; height:10px; border-radius:50%; flex:none; }
  /* RS-12: the field, centred in the window whatever sits beside it. */
  header .subject-field { position:absolute; left:50%; top:11px; transform:translateX(-50%); width:var(--field); height:34px; box-sizing:border-box; display:flex; align-items:center; gap:8px; padding:0 14px;
    border:1px solid color-mix(in srgb, var(--accent) 45%, transparent); border-radius:17px; background:color-mix(in srgb, var(--accent) 6%, var(--bg)); color:var(--ink); cursor:pointer; transition:border-color .18s ease; }
  header .subject-field:hover:not(:disabled) { border-color:color-mix(in srgb, var(--accent) 70%, transparent); background:color-mix(in srgb, var(--accent) 6%, var(--bg)); }
  .title { font-size:13px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
  .placeholder { font-size:13px; color:var(--ink-mute); }
  .kbd { margin-left:auto; flex:none; font:11px ui-monospace, Consolas, monospace; color:var(--accent); }
  /* RS-25: the busy dot pulses after the title while a generation runs. */
  .busy-dot { flex:none; width:6px; height:6px; border-radius:50%; background:var(--accent); animation:pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity:.35; } }
  /* Empty bar space drags the window and keeps the stats and the window controls flush right. */
  .spacer { flex:1; align-self:stretch; min-width:0; }
  .stats { font-size:12px; color:var(--ink-mute); white-space:nowrap; display:inline-block; overflow:hidden; }
  .stats.folded { max-width:0; visibility:hidden; }
  @media (prefers-reduced-motion: reduce) { .marker, .dot, .subject-field, .capsule button { transition:none; } .busy-dot { animation:none; } }
  :global(:root[data-reduce-motion='on']) :is(.marker, .dot, .subject-field, .capsule button) { transition:none; }
  :global(:root[data-reduce-motion='on']) .busy-dot { animation:none; }
</style>
