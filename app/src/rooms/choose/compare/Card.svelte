<script lang="ts">
  /** One evidence card (CR-51): every source of a cell, the room's value beside the user's, and the only place a cell is edited. */
  import { untrack } from 'svelte';
  import { cellStatus } from '../rules';
  import type { Cell } from '../rules';
  import { day, timeDay } from './model';
  import type { CardActions } from './model';
  import { strings } from './strings';
  import Tag from './Tag.svelte';
  let { product, criterion, cell, filling, price, web, busy, single, act }: { product: string; criterion: string; cell: Cell | undefined; filling: boolean; price: boolean;
    web: boolean; busy: boolean; single: boolean; act: CardActions } = $props();
  let draft = $state(untrack(() => cell?.user?.value ?? ''));
  const status = $derived(cellStatus(cell)), save = () => { if (draft.trim()) act.save(draft); };
</script>
<div class="card" data-testid="card">
  <div class="ch"><b>{product}</b><span>{criterion}</span>{#if single}<button class="fold" onclick={act.fold} aria-label={strings.fold}>✕</button>{/if}</div>
  {#if status === 'edited'}
    <div class="yours"><Tag kind="user" /> {cell!.user!.value} · {timeDay(cell!.user!.at)}<br><span class="mute">{strings.roomValue} <s>{cell!.value ?? strings.nothingFound}</s></span></div>
  {/if}
  {#if cell?.note}<div class="note">{cell.note}</div>{/if}
  <div class="srclist">
    {#if filling}<div class="mute">{strings.researchingCard}</div>
    {:else if !cell}<div class="mute">{strings.noCell}</div>
    {:else}{#each cell.sources as s}
      <div class="src" class:sponsored={s.kind === 'sponsored'}><span class="sv">{s.value ?? cell.value ?? '—'}</span>
        <span class="meta"><Tag kind={s.kind} />{s.name} · {strings.read} {day(s.read)}{s.kind === 'sponsored' ? ` · ${strings.notUsed}` : ''}</span></div>
    {:else}<div class="mute">{strings.noSource}</div>{/each}{/if}
  </div>
  {#if price}<div class="pricenote">{strings.priceCard}</div>{/if}
  <div class="ed">
    <input class="edit" bind:value={draft} placeholder={strings.yourValue} aria-label={strings.yourValueFor(product, criterion)} maxlength="160" onkeydown={e => { if (e.key === 'Enter') save(); }}>
    <div class="row">
      <button onclick={save} disabled={!draft.trim()}>{strings.saveMine}</button>
      {#if status === 'edited'}<button onclick={act.revert}>{strings.revert}</button>{/if}
      {#if web && !filling}<button onclick={act.check} disabled={busy}>{strings.checkThis}</button>{/if}
    </div>
  </div>
</div>
<style>
  .card { font: 400 11px/1.35 var(--font-small, 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif); }
  .ch { display: flex; gap: 8px; align-items: baseline; color: var(--ink-mute); margin-bottom: 4px; }
  .ch b { font: 600 12px var(--font-text, 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif); color: var(--ink); }
  .ch .fold { margin-left: auto; }
  .mute { color: var(--ink-mute); }
  .yours, .note, .pricenote { margin: 3px 0; }
  .note { border-left: 2px solid var(--focus); padding-left: 5px; }
  .pricenote { color: var(--ink-mute); }
  .src { padding: 3px 0; border-bottom: 1px solid var(--glass-line); display: grid; }
  .sv { font: 400 12px/1.35 var(--font-text, 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif); overflow-wrap: anywhere; }
  .meta { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; color: var(--ink-mute); }
  .src.sponsored { color: var(--ink-faint); } .src.sponsored .sv { text-decoration: line-through; }
  .ed { display: grid; gap: 3px; margin-top: 6px; } .row { display: flex; flex-wrap: wrap; gap: 3px; }
  .edit { border: 0; border-bottom: 1px dashed var(--glass-line); border-radius: 0; background: transparent; padding: 1px 0; width: 100%; font: 400 12px var(--font-text, 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif); color: var(--ink); caret-color: var(--accent); }
  .edit:focus { border-bottom-color: var(--accent); outline: none; } .edit::placeholder { color: var(--ink-faint); }
  button { font: 400 11px var(--font-small, 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif); padding: 0 6px; border-radius: 2px; }
  button:disabled { opacity: .5; cursor: default; }
</style>
