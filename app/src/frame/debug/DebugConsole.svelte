<script lang="ts">
  // DC-2, DC-10..DC-16, DC-40..DC-42: the console docked at the bottom of the window while debug mode is on.
  import { tick, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { Settings } from '../settings';
  import { strings } from '../../ui/strings';
  import { invoke } from '../ipc';
  import { native } from '../host';
  import { trace, type TraceEntry, type TraceKind } from './trace.svelte';
  import { entryMarkdown } from './markdown';
  import { pickLogFolder, recorder, saveLog } from './recorder';
  import { clampHeight, emptyFilter, isFiltering, KINDS, matches, originsOf, SearchCache } from './console-filter';
  import ConsoleEntry from './ConsoleEntry.svelte';
  let { settings, changed }: { settings: Settings; changed: () => void } = $props();
  const s = strings.debug;
  /** DC-16: rows rendered at once; earlier matches come in pages. */
  const PAGE = 300;

  let list = $state<HTMLDivElement>();
  let windowHeight = $state(typeof window === 'undefined' ? 800 : window.innerHeight);
  const collapsed = $derived(settings.developer.consoleCollapsed);
  const height = $derived(clampHeight(settings.developer.consoleHeight, windowHeight));

  // DC-15: filter state and the matching rows.
  let filter = $state(emptyFilter());
  let filterOpen = $state(false), folderOpen = $state(false);
  const cache = new SearchCache();
  const filtering = $derived(isFiltering(filter));
  const matching = $derived.by(() => {
    void trace.revision;
    const all = trace.entries;
    if (!filtering) return all.slice();
    cache.prune(all);
    return all.filter(e => matches(e, filter, x => cache.get(x)));
  });
  let limit = $state(PAGE);
  const rows = $derived(matching.slice(-limit));
  const earlier = $derived(Math.max(0, matching.length - rows.length));
  const origins = $derived.by(() => { void trace.revision; return filterOpen ? originsOf(trace.entries) : []; });

  // Selection and expansion.
  let selectedId = $state<number | null>(null);
  const expanded = new SvelteSet<number>();
  const hasBody = (e: TraceEntry) => e.kind === 'call' || e.detail !== undefined;
  function toggle(id: number) {
    const entry = rows.find(r => r.id === id); if (!entry) return;
    if (selectedId !== id) { selectedId = id; if (hasBody(entry)) expanded.add(id); }
    else if (hasBody(entry)) { if (expanded.has(id)) expanded.delete(id); else expanded.add(id); }
  }
  function expandAll() { if (expanded.size) expanded.clear(); else for (const e of rows) if (hasBody(e)) expanded.add(e.id); }

  // DC-12: follow the newest entry; scrolling up pauses, Follow resumes.
  let follow = $state(true);
  $effect(() => {
    void trace.revision; void rows.length;
    if (!follow || collapsed || !list) return;
    const el = list;
    void tick().then(() => { el.scrollTop = el.scrollHeight; });
  });
  function scrolled() {
    if (!list) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
    if (atBottom !== follow) follow = atBottom;
  }
  function resume() { follow = true; if (list) list.scrollTop = list.scrollHeight; }

  // DC-11: resize by dragging the top edge; save while dragging (debounced) and on release.
  let dragBottom = 0, dragging = false, saveTimer: ReturnType<typeof setTimeout> | undefined;
  function setHeight(value: number, final: boolean) {
    settings.developer.consoleHeight = clampHeight(value, windowHeight);
    clearTimeout(saveTimer);
    if (final) changed(); else saveTimer = setTimeout(changed, 400);
  }
  function gripDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const root = (e.currentTarget as HTMLElement).parentElement!;
    dragBottom = root.getBoundingClientRect().bottom; dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function gripMove(e: PointerEvent) { if (dragging) setHeight(dragBottom - e.clientY, false); }
  function gripUp(e: PointerEvent) { if (!dragging) return; dragging = false; setHeight(dragBottom - e.clientY, true); }
  function gripKey(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); setHeight(height + 24, true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHeight(height - 24, true); }
  }
  function toggleCollapsed() { settings.developer.consoleCollapsed = !collapsed; changed(); }

  // Header notices (Save result, copy).
  let notice = $state(''), noticeError = $state(false), noticeTimer: ReturnType<typeof setTimeout> | undefined;
  function notify(text: string, error = false) {
    notice = text; noticeError = error; clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice = '', error ? 10_000 : 5000);
  }
  const message = (e: unknown) => e instanceof Error ? e.message : String(e);

  // DC-42: Record follows the setting; a failed write turns it off (the recorder logs the error line).
  $effect(() => {
    const folder = settings.developer.logFolder, on = settings.developer.record;
    untrack(() => { if (on) recorder.start(folder); else recorder.stop(); });
    return () => untrack(() => recorder.stop());
  });
  $effect(() => {
    if (recorder.error && settings.developer.record) { settings.developer.record = false; changed(); }
  });

  /** DC-40: picks the log folder; null when cancelled. */
  async function chooseFolder(): Promise<string | null> {
    try {
      const picked = await pickLogFolder(settings.developer.logFolder || undefined);
      if (picked) { settings.developer.logFolder = picked; changed(); }
      return picked;
    } catch (e) { notify(message(e), true); return null; }
  }
  /** DC-41: all entries, not only the filtered ones; without a folder, ask for one first (desktop). */
  async function save() {
    let folder = settings.developer.logFolder;
    if (!folder && native) { folder = await chooseFolder() ?? ''; if (!folder) return; }
    try { notify(s.saved(await saveLog(folder, $state.snapshot(trace.entries) as TraceEntry[]))); }
    catch (e) { notify(s.saveFailed(message(e)), true); }
  }
  async function toggleRecord() {
    if (!settings.developer.record && !settings.developer.logFolder && native && !(await chooseFolder())) return;
    settings.developer.record = !settings.developer.record; changed();
  }
  function reveal() { void invoke('reveal_library', { path: settings.developer.logFolder }).catch(e => notify(message(e), true)); }
  function clear() { trace.clear(); expanded.clear(); selectedId = null; limit = PAGE; follow = true; }
  /** DC-14: the selected entry as Markdown. */
  async function copy() {
    const entry = trace.entries.find(e => e.id === selectedId); if (!entry) return;
    try { await navigator.clipboard.writeText(entryMarkdown($state.snapshot(entry) as TraceEntry)); notify(s.copied); }
    catch { notify(s.copyFailed, true); }
  }
  const selected = $derived(selectedId !== null && trace.entries.some(e => e.id === selectedId));
  function toggleOrigin(origin: string, on: boolean) { filter.origins = on ? [...filter.origins, origin] : filter.origins.filter(o => o !== origin); }
  function toggleKind(kind: TraceKind, on: boolean) { filter.kinds[kind] = on; }
</script>
<svelte:window bind:innerHeight={windowHeight} />
<section class="debug-console" class:collapsed aria-label={strings.debugConsole} style:height={collapsed ? null : `${height}px`}>
  {#if !collapsed}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div class="grip" role="separator" aria-orientation="horizontal" aria-label={s.resize} title={s.resize} aria-valuenow={height} aria-valuemin={120} aria-valuemax={clampHeight(Infinity, windowHeight)} tabindex="0"
      onpointerdown={gripDown} onpointermove={gripMove} onpointerup={gripUp} onpointercancel={gripUp} onkeydown={gripKey}></div>
  {/if}
  <header>
    <button class="icon" aria-expanded={!collapsed} aria-label={collapsed ? s.expand : s.collapse} title={collapsed ? s.expand : s.collapse} onclick={toggleCollapsed}>{collapsed ? '▸' : '▾'}</button>
    <h2>{strings.debugConsole}</h2>
    <span class="count" data-testid="debug-count">{s.matching(matching.length, trace.entries.length)}</span>
    {#if trace.dropped > 0}<span class="dropped">{s.dropped(trace.dropped)}</span>{/if}
    {#if recorder.active}<span class="rec" title={recorder.file}>● {s.recording(recorder.file)}</span>{/if}
    {#if recorder.error}<span class="bad" role="alert">{recorder.error}</span>{/if}
    {#if notice}<span class:bad={noticeError} class="notice" role="status">{notice}</span>{/if}
    <span class="spacer"></span>
    {#if !collapsed}<button class="follow" aria-pressed={follow} title={s.followTitle} onclick={resume}>{s.follow}</button>{/if}
  </header>
  {#if !collapsed}
    <div class="main">
      <div class="pane">
        {#if filterOpen}
          <div class="drawer filters" role="group" aria-label={s.filter}>
            <fieldset><legend>{s.kindsLabel}</legend>
              {#each KINDS as kind (kind)}<label class="k-{kind}"><input type="checkbox" checked={filter.kinds[kind]} onchange={e => toggleKind(kind, e.currentTarget.checked)} />{s.kinds[kind]}</label>{/each}
            </fieldset>
            <fieldset><legend>{s.originsLabel}{#if !filter.origins.length} <span class="dim">({s.allOrigins})</span>{/if}</legend>
              {#each origins as origin (origin)}<label><input type="checkbox" checked={filter.origins.includes(origin)} onchange={e => toggleOrigin(origin, e.currentTarget.checked)} />{origin}</label>{/each}
            </fieldset>
            <label class="search">{s.search}<input type="search" bind:value={filter.text} placeholder={s.searchPlaceholder} spellcheck="false" /></label>
            <button disabled={!filtering} onclick={() => filter = emptyFilter()}>{s.resetFilter}</button>
          </div>
        {/if}
        {#if folderOpen}
          <div class="drawer folder" role="group" aria-label={s.folder}>
            <span class="path" class:dim={!settings.developer.logFolder}>{settings.developer.logFolder || s.noFolder}</span>
            <button disabled={!native} onclick={() => void chooseFolder()}>{settings.developer.logFolder ? s.changeFolder : s.browse}</button>
            {#if settings.developer.logFolder}<button disabled={!native} onclick={reveal}>{s.revealFolder}</button>{/if}
          </div>
        {/if}
        <div class="list" role="log" aria-live="off" aria-label={strings.debugConsole} bind:this={list} onscroll={scrolled}>
          {#if earlier}<button class="earlier" onclick={() => { follow = false; limit += PAGE; }}>{s.earlier(Math.min(PAGE, earlier))}</button>{/if}
          {#each rows as entry (entry.id)}
            <ConsoleEntry {entry} selected={selectedId === entry.id} expanded={expanded.has(entry.id)} {toggle} />
          {/each}
          {#if !rows.length}<p class="empty">{trace.entries.length ? s.noMatch : s.empty}</p>{/if}
        </div>
      </div>
      <div class="actions" role="toolbar" aria-orientation="vertical" aria-label={strings.debugConsole}>
        <button title={s.saveTitle} aria-label={s.save} onclick={save}>{s.save}</button>
        <button title={recorder.active ? s.recording(recorder.file) : s.recordTitle} aria-label={s.record} aria-pressed={settings.developer.record} class:on={settings.developer.record} onclick={toggleRecord}>{s.record}</button>
        <button title={settings.developer.logFolder || s.noFolder} aria-label={s.folder} aria-expanded={folderOpen} onclick={() => folderOpen = !folderOpen}>{s.folder}</button>
        <button title={s.clearTitle} aria-label={s.clear} onclick={clear}>{s.clear}</button>
        <button title={s.filterTitle} aria-label={s.filter} aria-expanded={filterOpen} class:on={filtering} onclick={() => filterOpen = !filterOpen}>{s.filter}</button>
        <button title={s.copyTitle} aria-label={s.copy} disabled={!selected} onclick={copy}>{s.copy}</button>
        <button aria-label={expanded.size ? s.collapseAll : s.expandAll} title={expanded.size ? s.collapseAll : s.expandAll} onclick={expandAll}>{expanded.size ? s.collapseAll : s.expandAll}</button>
      </div>
    </div>
  {/if}
</section>
<style>
  /* DC-10: its own dark palette, the same in both themes. */
  .debug-console {
    --dc-bg:#0f141b; --dc-bar:#161d27; --dc-well:#0a0e13; --dc-line:#2a3442; --dc-ink:#d5dde6; --dc-mute:#7d8a99; --dc-head:#aebccb;
    --dc-origin:#a5b4c4; --dc-link:#6cb6ff; --dc-call:#c3a6ff; --dc-action:#56d4c0; --dc-event:#79c0ff; --dc-warn:#e8c26a; --dc-error:#ff7b72;
    --dc-running:#e8c26a; --dc-ok:#7ee787; --dc-tool:#d2a8ff; --dc-select:#1c2938; --dc-hover:#172130;
    position:relative; z-index:1; flex-shrink:0; display:flex; flex-direction:column; min-height:0; box-sizing:border-box;
    background:var(--dc-bg); color:var(--dc-ink); border-top:1px solid var(--dc-line); color-scheme:dark;
    font:12px/1.5 ui-monospace, 'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  }
  .grip { position:absolute; top:-4px; left:0; right:0; height:8px; cursor:ns-resize; z-index:2; touch-action:none; }
  .grip:hover, .grip:focus-visible { background:color-mix(in srgb, var(--dc-link) 35%, transparent); outline:none; }
  header { display:flex; align-items:center; gap:10px; padding:2px 8px; background:var(--dc-bar); border-bottom:1px solid var(--dc-line); min-height:26px; white-space:nowrap; overflow:hidden; flex:none; }
  .collapsed header { border-bottom:0; }
  h2 { margin:0; font:inherit; font-weight:600; color:var(--dc-head); }
  .count { color:var(--dc-mute); font-variant-numeric:tabular-nums; }
  .dropped { color:var(--dc-warn); }
  .rec { color:var(--dc-error); overflow:hidden; text-overflow:ellipsis; }
  .notice { color:var(--dc-ok); overflow:hidden; text-overflow:ellipsis; }
  .bad { color:var(--dc-error); overflow:hidden; text-overflow:ellipsis; }
  .spacer { flex:1; }
  button { font:inherit; color:var(--dc-ink); background:transparent; border:1px solid var(--dc-line); border-radius:4px; padding:1px 8px; cursor:pointer; }
  button:hover:not(:disabled) { background:var(--dc-hover); border-color:var(--dc-mute); }
  button:disabled { opacity:.45; cursor:default; }
  button:focus-visible { outline:1px solid var(--dc-link); outline-offset:1px; }
  button.icon { border:0; padding:0 4px; color:var(--dc-mute); }
  button.on, button[aria-pressed='true'].follow { color:var(--dc-link); border-color:var(--dc-link); }
  .actions button.on[aria-label] { color:var(--dc-link); }
  .main { flex:1; min-height:0; display:flex; }
  .pane { flex:1; min-width:0; display:flex; flex-direction:column; }
  .list { flex:1; min-height:0; overflow:auto; padding:2px 0 6px; }
  .empty { margin:8px 12px; color:var(--dc-mute); }
  .earlier { margin:4px 8px; }
  .actions { flex:none; display:flex; flex-direction:column; gap:4px; padding:6px; border-left:1px solid var(--dc-line); background:var(--dc-bar); overflow:auto; }
  .actions button { text-align:left; min-width:96px; }
  .drawer { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:6px 14px; padding:6px 10px; border-bottom:1px solid var(--dc-line); background:var(--dc-bar); }
  fieldset { display:flex; flex-wrap:wrap; align-items:center; gap:2px 10px; border:0; margin:0; padding:0; max-height:72px; overflow:auto; }
  legend { float:left; color:var(--dc-mute); margin-right:6px; }
  label { display:inline-flex; align-items:center; gap:4px; cursor:pointer; }
  .k-call { color:var(--dc-call); } .k-action { color:var(--dc-action); } .k-event { color:var(--dc-event); } .k-warn { color:var(--dc-warn); } .k-error { color:var(--dc-error); }
  input[type='checkbox'] { margin:0; accent-color:var(--dc-link); }
  input[type='search'] { font:inherit; color:var(--dc-ink); background:var(--dc-well); border:1px solid var(--dc-line); border-radius:4px; padding:1px 6px; width:min(320px, 40vw); }
  .search { color:var(--dc-mute); }
  .path { overflow-wrap:anywhere; }
  .dim { color:var(--dc-mute); }
  @media (max-width: 719px) { .actions button { min-width:0; } }
</style>
