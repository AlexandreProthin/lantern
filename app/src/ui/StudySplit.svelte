<script lang="ts">
  // GV-85: the graph | divider | panel frame of a room's study space, shared (PS-5). The room fills the
  // graph and panel; a room may replace the divider (Choose: the counter rail) and render anything in the graph side.
  import type { Snippet } from 'svelte';
  import type { Settings } from '../frame/settings';
  import { strings } from './strings';
  import { phone } from './phone.svelte';
  let { settings, preferencesChanged, visible, ready = true, panelBusy = false, sheetButton = true, graph, panel, divider }: {
    settings: Settings; preferencesChanged: () => void; visible: boolean; ready?: boolean; panelBusy?: boolean;
    /** NW-42: whether the phone layout's Details button shows over the graph side (a room hides it while it covers the graph). */
    sheetButton?: boolean;
    /** Receives whether the graph side is shown (not collapsed). */
    graph: Snippet<[boolean]>; panel: Snippet; divider?: Snippet;
  } = $props();
  let body: HTMLDivElement;
  let width = $state(1000), dragging = $state(false);
  /** NW-42: on a phone the graph fills the space and the panel is a sheet over it, opened by a tap on a node or its menu. */
  let sheet = $state(false);
  const narrow = $derived(phone.current);
  $effect(() => { if (!narrow || !visible) sheet = false; });
  function tapped(e: MouseEvent) { if (narrow && (e.target as Element).closest?.('.node[data-id], .node-menu [role=menuitem]')) sheet = true; }
  function sheetKey(e: KeyboardEvent) { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.preventDefault(); e.stopPropagation(); sheet = false; } }
  const graphPercent = $derived(Math.max(320/width*100, Math.min(100-380/width*100, 100-settings.ui.studySplitPercent)));
  function move(e: PointerEvent) {
    if (!dragging) return;
    const x = e.clientX - body.getBoundingClientRect().left;
    if (x < 160) settings.ui.studyCollapsed = 'graph';
    else if (width-x < 190) settings.ui.studyCollapsed = 'panel';
    else { settings.ui.studyCollapsed = 'none'; settings.ui.studySplitPercent = Math.max(20, Math.min(80, (width-x)/width*100)); }
    preferencesChanged();
  }
  function reset() { settings.ui.studySplitPercent = 44; settings.ui.studyCollapsed = 'none'; preferencesChanged(); }
  function key(e: KeyboardEvent) {
    if (e.key === 'Home') reset();
    else if (e.key === 'Enter') { settings.ui.studyCollapsed = settings.ui.studyCollapsed === 'panel' ? 'none' : 'panel'; preferencesChanged(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { settings.ui.studySplitPercent = Math.max(20,Math.min(80,settings.ui.studySplitPercent+(e.key === 'ArrowLeft' ? 16 : -16)/width*100)); preferencesChanged(); }
    else return; e.preventDefault();
  }
</script>
<svelte:window onpointermove={move} onpointerup={() => dragging = false} />
<div class="study" class:dragging class:hidden={!visible} class:narrow class:sheet bind:this={body} bind:clientWidth={width}>
  {#if ready && narrow}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="graph-side" onclick={tapped}><div class="kept-space">{@render graph(visible && !sheet)}</div></div>
    {#if divider}{@render divider()}{/if}
    {#if !sheet && sheetButton}<button class="sheet-open" onclick={() => sheet = true}>{strings.openPanel}{panelBusy ? ' ·' : ''}</button>{/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="panel-side" class:hidden={!sheet} onkeydown={sheetKey}>
      <button class="sheet-close" onclick={() => sheet = false}>‹ {strings.backToGraph}</button>
      <div class="kept-space">{@render panel()}</div>
    </div>
  {:else if ready}
    <div class="graph-side" class:collapsed={settings.ui.studyCollapsed === 'graph'} style:width={settings.ui.studyCollapsed === 'graph' ? '28px' : settings.ui.studyCollapsed === 'panel' ? 'calc(100% - 36px)' : `calc(${graphPercent}% - 4px)`}>
      {#if settings.ui.studyCollapsed === 'graph'}<button class="rail" aria-label={strings.restoreGraph} onclick={() => { settings.ui.studyCollapsed='none'; preferencesChanged(); }}>›</button>
      {/if}
      <div class:hidden={settings.ui.studyCollapsed === 'graph'} class="kept-space">{@render graph(visible && settings.ui.studyCollapsed !== 'graph')}</div>
    </div>
    {#if divider}{@render divider()}{:else}
    <!-- This focusable separator implements the keyboard contract of GV-85. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div class="divider" role="separator" aria-orientation="vertical" aria-valuenow={Math.round(settings.ui.studySplitPercent)} aria-valuemin="20" aria-valuemax="80" tabindex="0" onpointerdown={e => { e.preventDefault(); dragging=true; }} ondblclick={reset} onkeydown={key}>
      <button aria-label={strings.collapseGraph} onclick={() => { settings.ui.studyCollapsed = settings.ui.studyCollapsed === 'graph' ? 'none' : 'graph'; preferencesChanged(); }}>‹</button>
      <button aria-label={strings.collapsePanel} onclick={() => { settings.ui.studyCollapsed = settings.ui.studyCollapsed === 'panel' ? 'none' : 'panel'; preferencesChanged(); }}>›</button>
    </div>
    {/if}
    <div class="panel-side" class:collapsed={settings.ui.studyCollapsed === 'panel'}>
      {#if settings.ui.studyCollapsed === 'panel'}<button class="rail" aria-label={strings.restorePanel} onclick={() => { settings.ui.studyCollapsed='none'; preferencesChanged(); }}>‹{panelBusy ? '·' : ''}</button>
      {/if}
      <div class:hidden={settings.ui.studyCollapsed === 'panel'} class="kept-space">{@render panel()}</div>
    </div>
  {/if}
</div>
<style>
  .study { display:flex; width:100%; height:100%; overflow:hidden; } .hidden { display:none; } .dragging { user-select:none; cursor:col-resize; }
  .graph-side { min-width:0; height:100%; }.panel-side { min-width:0; flex:1; height:100%; }.panel-side.collapsed { flex:0 0 28px; }
  .kept-space { height:100%; }
  .narrow { position:relative; flex-direction:column; } .narrow .graph-side { position:relative; width:100%; flex:1; min-height:0; }
  .narrow .panel-side { position:absolute; inset:0; z-index:5; display:flex; flex-direction:column; background:var(--bg); padding-bottom:env(safe-area-inset-bottom); }
  .narrow .panel-side.hidden { display:none; } .narrow .panel-side .kept-space { flex:1; min-height:0; overflow:auto; }
  .sheet-close { flex:none; height:44px; text-align:left; padding:0 16px; border:0; border-bottom:1px solid var(--glass-line); border-radius:0; background:var(--glass); font-size:15px; }
  .sheet-open { position:absolute; left:12px; top:12px; z-index:4; height:40px; padding:0 18px; border-radius:20px; font-size:15px; background:var(--surface); }
  .divider { width:8px; flex:0 0 8px; background:var(--glass-line); cursor:col-resize; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:8px; z-index:3; }
  .divider button { border:0; padding:2px; width:20px; height:28px; font-size:12px; }.rail { width:28px; height:100%; padding:0; border-radius:0; }
</style>
