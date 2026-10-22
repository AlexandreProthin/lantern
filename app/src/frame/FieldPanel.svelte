<script lang="ts">
  // RS-15..RS-17, RS-19: the field's panel. This subject's settings on top (today's subject menu), then the
  // palette of this room's other subjects, the rooms and Settings. Opening and closing are the frame's (Shell).
  import { onMount, tick } from 'svelte';
  import { strings } from '../ui/strings';
  import { glyphs } from '../ui/glyphs';
  import ModelPicker from '../ui/ModelPicker.svelte';
  import { filterRows, foldPanel, growPanel, reducedMotion } from './topbar';
  import type { PaletteRow } from './topbar';
  import type { RoomDefinition, RoomSession } from './room';
  import type { SubjectSummary } from './catalogue';
  let { session, room, rooms, revision, subjects, fieldWidth, rename, changed, openSubject, switchRoom, openSettings }: {
    session: RoomSession | null; room: RoomDefinition; rooms: readonly RoomDefinition[]; revision: number; subjects: readonly SubjectSummary[];
    fieldWidth: number; rename: (title: string) => Promise<void>; changed: (appliesNext: boolean) => void;
    openSubject: (id: string) => void; switchRoom: (id: string) => void; openSettings: () => void;
  } = $props();
  const reduced = reducedMotion();
  let filter = $state(''), active = $state(0), filterInput = $state<HTMLInputElement>(), panel = $state<HTMLElement>();
  let titleDraft = $state(''), titleError = $state('');
  const savedTitle = $derived.by(() => { revision; return session?.subject.title ?? ''; });
  $effect.pre(() => { titleDraft = savedTitle; titleError = ''; });

  const groups = { subjects: strings.otherSubjects, rooms: strings.rooms, settings: strings.settings } as const;
  const rows = $derived.by((): PaletteRow[] => [
    ...subjects.filter(s => s.id !== session?.subject.id).map(s => ({ key: `subject:${s.id}`, group: 'subjects' as const, label: s.title })),
    ...(rooms.length > 1 ? rooms.map((r, i) => ({ key: `room:${r.id}`, group: 'rooms' as const, label: r.name, hint: `Ctrl+Shift+${i + 1}`, current: r.id === room.id })) : []),
    { key: 'settings', group: 'settings', label: strings.settings, hint: 'Ctrl+,' },
  ]);
  const shown = $derived(filterRows(rows, filter));
  const sections = $derived((['subjects', 'rooms', 'settings'] as const).map(group => ({ group, rows: shown.filter(r => r.group === group) })).filter(s => s.rows.length));
  $effect.pre(() => { filter; active = 0; });
  const optionId = (row: PaletteRow) => `palette-${row.key.replace(/[^a-z0-9-]/gi, '-')}`;

  function choose(row: PaletteRow | undefined) {
    if (!row) return;
    if (row.group === 'subjects') openSubject(row.key.slice('subject:'.length));
    else if (row.group === 'rooms') switchRoom(row.key.slice('room:'.length));
    else openSettings();
  }
  async function move(by: number) {
    if (!shown.length) return;
    active = (active + by + shown.length) % shown.length;
    await tick(); panel?.querySelector(`#${optionId(shown[active])}`)?.scrollIntoView({ block: 'nearest' });
  }
  function paletteKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); void move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); void move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(shown[active]); }
  }
  /** RS-15: Enter saves the title, Esc cancels the edit, an empty title is rejected. */
  async function titleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && titleDraft !== savedTitle) { e.stopPropagation(); titleDraft = savedTitle; titleError = ''; }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (!titleDraft.trim()) { titleError = strings.emptyTitle; return; }
      try { await rename(titleDraft); titleError = ''; } catch (error) { titleError = error instanceof Error ? error.message : String(error); }
    }
  }
  onMount(() => {
    // Ctrl+K from a text field: closing gives the focus back there.
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    filterInput?.focus();
    return () => { const now = document.activeElement; if (before?.isConnected && (!now || now === document.body || panel?.contains(now))) before.focus(); };
  });
</script>
<div class="field-panel" role="dialog" aria-label={strings.subjectField} bind:this={panel} in:growPanel={{ field: fieldWidth, reduced }} out:foldPanel={{ field: fieldWidth, reduced }}>
  {#if session}
    <section class="subject-menu" aria-label={strings.thisSubject}>
      <h3>{strings.thisSubject}</h3>
      <label>{strings.title}<input aria-label={strings.title} aria-invalid={titleError ? 'true' : undefined} bind:value={titleDraft} maxlength="120" onkeydown={titleKey} oninput={() => titleError = ''} /></label>
      {#if titleError}<small class="error" role="alert">{titleError}</small>{/if}
      <room.subjectMenu visit={session.subject.rooms[room.id]} {revision} {changed} />
      <div class="field"><label for="subject-model">{strings.defaultModel}</label><ModelPicker id="subject-model" value={session.subject.rooms[room.id].model} label={strings.defaultModel} commit={model => { session!.subject.rooms[room.id].model = model; changed(true); }} /></div>
      <label>{strings.defaultEffort}<select value={session.subject.rooms[room.id].effort} onchange={e => { session!.subject.rooms[room.id].effort = e.currentTarget.value as typeof session.subject.rooms[string]['effort']; changed(true); }}>{#each ['low', 'medium', 'high', 'xhigh', 'max'] as effort}<option>{effort}</option>{/each}</select></label>
    </section>
  {/if}
  <div class="palette">
    <div class="filter"><svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">{@html glyphs.search}</svg>
      <input bind:this={filterInput} bind:value={filter} role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" aria-activedescendant={shown[active] ? optionId(shown[active]) : undefined}
        aria-label={strings.paletteFilter} placeholder={strings.paletteFilter} onkeydown={paletteKey} />
    </div>
    <div id="palette-list" role="listbox" aria-label={strings.paletteLabel}>
      {#each sections as section (section.group)}
        <div role="group" aria-labelledby={`palette-head-${section.group}`}>
          {#if section.group !== 'settings'}<div class="head" id={`palette-head-${section.group}`}>{groups[section.group]}</div>{:else}<span hidden id="palette-head-settings">{strings.settings}</span>{/if}
          {#each section.rows as row (row.key)}{@const index = shown.indexOf(row)}
            <div class="row" id={optionId(row)} role="option" aria-selected={index === active} class:active={index === active} class:current={row.current} tabindex="-1"
              onpointermove={() => active = index} onclick={() => choose(row)} onkeydown={() => {}}>
              {#if row.group === 'rooms'}<span class="swatch" style:background={rooms.find(r => `room:${r.id}` === row.key)?.accent['--accent']}></span>{:else if row.group === 'settings'}<svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">{@html glyphs.settings}</svg>{/if}
              <span class="label">{row.label}</span>{#if row.hint}<span class="hint">{row.hint}</span>{/if}
            </div>
          {/each}
        </div>
      {:else}<div class="empty">{strings.noNodeMatches}</div>{/each}
    </div>
  </div>
</div>
<style>
  /* RS-15: centred under the field, just below the bar, above the spaces (and above Amber, CO-17). */
  .field-panel { position:fixed; left:50%; top:52px; transform:translateX(-50%); z-index:12; width:clamp(440px, 36vw, 560px); max-height:calc(100vh - 72px); overflow:auto; box-sizing:border-box;
    padding:6px; background:var(--surface); border:1px solid var(--line); border-radius:6px; box-shadow:0 12px 32px color-mix(in srgb, var(--bg) 70%, transparent); color:var(--ink); }
  /* NW-41: on a phone the panel spans the width, under the bar's second row (the field). */
  @media (max-width: 719px) {
    .field-panel { left:12px; right:12px; width:auto; transform:none; top:calc(110px + env(safe-area-inset-top)); max-height:calc(100dvh - 124px - env(safe-area-inset-top)); }
  }
  h3, .head { margin:0; padding:6px 8px 2px; font:11px ui-monospace, Consolas, monospace; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-mute); }
  .subject-menu { display:grid; gap:10px; padding:4px 8px 12px; border-bottom:1px solid var(--line); margin-bottom:6px; }
  .subject-menu h3 { padding:6px 0 0; }
  .subject-menu label, .subject-menu .field { display:grid; gap:5px; font-size:13px; color:var(--ink-mute); }
  .subject-menu :global(label) { color:var(--ink-mute); font-size:13px; }
  .subject-menu :global(:is(input, select, textarea)) { color:var(--ink); font-size:13px; width:100%; box-sizing:border-box; }
  .error { color:var(--error-ink); font-size:12px; }
  .filter { display:flex; align-items:center; gap:8px; padding:0 8px; margin:2px 0 4px; border:1px solid var(--line); border-radius:6px; background:var(--bg); color:var(--ink-mute); }
  .filter input { flex:1; border:0; background:none; padding:8px 0; font-size:13px; outline:none; }
  .filter:focus-within { border-color:var(--accent); }
  .glyph { width:16px; height:16px; flex:none; fill:none; stroke:currentColor; stroke-width:1.3; stroke-linecap:round; stroke-linejoin:round; }
  .row { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:4px; font-size:13px; cursor:pointer; white-space:nowrap; }
  .row.active { background:color-mix(in srgb, var(--ink) 7%, transparent); }
  .row.current { box-shadow:inset 2px 0 0 var(--accent); }
  .label { overflow:hidden; text-overflow:ellipsis; min-width:0; }
  .hint { margin-left:auto; font:11px ui-monospace, Consolas, monospace; color:var(--ink-mute); }
  .swatch { width:10px; height:10px; border-radius:50%; flex:none; }
  .empty { padding:8px; font-size:13px; color:var(--ink-mute); }
</style>
