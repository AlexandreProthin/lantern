<script lang="ts">
  /** What a Compare cell shows inline (CR-50, CR-51, CR-42): value, sources, notes, the user's value beside the room's. */
  import { cellStatus } from '../rules';
  import type { Cell } from '../rules';
  import { day, priceDate, sponsoredSources, timeDay, usedSources } from './model';
  import { strings } from './strings';
  import Tag from './Tag.svelte';
  let { cell, filling, price }: { cell: Cell | undefined; filling: boolean; price: boolean } = $props();
  const status = $derived(cellStatus(cell)), date = $derived(priceDate(cell));
</script>
{#if filling}
  <span class="v none">{strings.researching}</span>
{:else if !cell}
  <span class="v none">{strings.notFilled}</span>
{:else}
  <span class="v" class:none={status === 'none'}><span class="mark" aria-hidden="true">{status === 'disagree' ? '≠ ' : status === 'none' ? '? ' : ''}</span>{status === 'edited' ? cell.user!.value : cell.value ?? strings.noneFound}</span>
  {#if price && cell.value !== null && date}<span class="line price">{strings.priceCaution(day(date))}</span>{/if}
  {#if status === 'edited'}
    <span class="srcs"><span class="tagline"><Tag kind="user" /><span class="sn">{timeDay(cell.user!.at)}</span></span></span>
    <span class="line">{strings.roomValue} <s>{cell.value ?? strings.nothingFound}</s></span>
  {:else if cell.note}<span class="note">{cell.note}</span>{/if}
  <span class="srcs">
    {#each usedSources(cell) as s}<span class="tagline"><Tag kind={s.kind} /><span class="sn" title={`${s.name} · ${day(s.read)}`}>{s.name} · {day(s.read)}</span></span>{/each}
    {#each sponsoredSources(cell) as s}<span class="tagline"><Tag kind="sponsored" /><span class="sn" title={s.name}>{s.name}: {strings.notUsed}</span></span>{/each}
  </span>
{/if}
<style>
  span { display: block; }
  .v { font: 600 13px/1.3 var(--font-text, 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif); overflow-wrap: anywhere; }
  .v.none { font-weight: 400; font-style: italic; color: var(--ink-mute); }
  .mark { display: inline; color: var(--focus); }
  .line, .note, .tagline { font: 400 11px/1.35 var(--font-small, 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif); }
  .line { color: var(--ink-mute); }
  .note { margin-top: 3px; border-left: 2px solid var(--focus); padding-left: 5px; }
  .srcs { display: flex; flex-wrap: wrap; gap: 2px 6px; margin-top: 3px; align-items: center; }
  .tagline { display: inline-flex; gap: 5px; align-items: center; max-width: 100%; color: var(--ink-mute); }
  .sn { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
</style>
