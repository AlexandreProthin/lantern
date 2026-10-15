<script lang="ts">
  // GV-85: the graph | divider | panel frame of a room's study space, shared (PS-5). The room fills the
  // graph and panel; a room may replace the divider (Choose: the counter rail) and render anything in the graph side.
  import type { Snippet } from 'svelte';
  import type { Settings } from '../frame/settings';
  import { strings } from './strings';
  let { settings, preferencesChanged, visible, ready = true, panelBusy = false, graph, panel, divider }: {
    settings: Settings; preferencesChanged: () => void; visible: boolean; ready?: boolean; panelBusy?: boolean;
    /** Receives whether the graph side is shown (not collapsed). */
    graph: Snippet<[boolean]>; panel: Snippet; divider?: Snippet;
  } = $props();
  let body: HTMLDivElement;
  let width = $state(1000), dragging = $state(false);
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
<div class="study" class:dragging class:hidden={!visible} bind:this={body} bind:clientWidth={width}>
  {#if ready}
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
  .divider { width:8px; flex:0 0 8px; background:var(--glass-line); cursor:col-resize; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:8px; z-index:3; }
  .divider button { border:0; padding:2px; width:20px; height:28px; font-size:12px; }.rail { width:28px; height:100%; padding:0; border-radius:0; }
</style>
