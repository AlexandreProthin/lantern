<script lang="ts">
  /** The Compare space (CR-50, CR-51; agent_design/choose-compare/RECIPE.md, r006-03): a ledger of shortlisted products by ranked criteria. */
  import { untrack } from 'svelte';
  import type { SpaceProps } from '../../frame/room';
  import type { ToolUse } from '../../frame/provider';
  import type { ChooseSession } from './session';
  import { cells, chooseData } from './rules';
  import type { Cell } from './rules';
  import { fillTarget } from './context';
  import { chooseSettings } from './settings';
  import { candidatesOf, clickAll, clickCell, clickRow, columnsOf, irrelevantCount, keepOpen, nothingOpen, rowsOf, rowSummary, slotKey, splitKey, fillKey } from './compare/model';
  import type { CardActions, Open } from './compare/model';
  import { ColumnFlip, cardFx, keep, rowFx, valueFx } from './compare/motion';
  import { strings } from './compare/strings';
  import Card from './compare/Card.svelte';
  import CellBody from './compare/CellBody.svelte';
  let { session, revision, visible, settings, navigate, preferencesChanged }: SpaceProps = $props();
  const choose = $derived(session as ChooseSession | null);
  let open = $state<Open>(nothingOpen), showIrr = $state(false), noHover = $state(false), scroller = $state<HTMLElement | null>(null);

  const view = $derived.by(() => {
    revision; const s = choose; if (!s) return null;
    const v = s.visit, cols = columnsOf(v), groups = rowsOf(v, showIrr), filling = s.filling();
    return { v, cols, groups, filling, irr: irrelevantCount(v), candidates: candidatesOf(v), rowIds: groups.flatMap(g => g.rows.map(r => r.id)),
      chosenId: cols.find(c => c.state === 'chosen')?.id ?? null, empty: fillTarget(v, v.rootId).length, running: s.running, research: s.research, queued: s.queue.length, notice: s.notice };
  });
  const cur = $derived(view ? keepOpen(open, view.rowIds, view.cols.map(c => c.id)) : nothingOpen);
  const web = $derived(chooseSettings(settings).useWeb && !!choose?.useWeb());
  const busy = $derived(!!view?.running);
  const allOpen = $derived(!!view?.rowIds.length && view.rowIds.every(id => cur.rows.includes(id)));
  const stepText = (p: ToolUse | null) => !p ? strings.starting : p.name === 'WebFetch' ? strings.reading(p.detail) : strings.searching(p.detail);
  const failed = $derived(view?.notice?.kind === 'error' && (view.cols.some(c => c.id === view.notice!.nodeId) || view.v.nodes[view.notice.nodeId]?.kind === 'criterion') ? view.notice : null);

  const go = (next: Open) => { noHover = true; open = next; };
  const guard = (f: () => unknown) => { try { void Promise.resolve(f()).catch(() => {}); } catch { /* the session reports what failed */ } };
  const actions = (productId: string, criterionId: string): CardActions => ({
    save: value => guard(() => choose!.saveCell({ productId, criterionId }, value)), revert: () => guard(() => choose!.revertCell({ productId, criterionId })),
    check: () => guard(() => choose!.run('check', productId, { cell: { productId, criterionId } })), fold: () => go(nothingOpen) });
  const cellOf = (productId: string, criterionId: string): Cell | undefined => { const p = view?.v.nodes[productId]; return p ? cells(p)[criterionId] : undefined; };
  const key = (e: KeyboardEvent, f: () => void) => { if (e.key === 'Enter' || e.key === ' ') { if ((e.target as HTMLElement).closest('input,textarea')) return; e.preventDefault(); f(); } };
  const webOn = () => { chooseSettings(settings).useWeb = true; preferencesChanged(); };

  /** Columns ease to their new widths whenever the selection changes (RECIPE: motion). */
  const flip = new ColumnFlip(() => scroller ? [...scroller.querySelectorAll<HTMLElement>('thead th')] : []);
  $effect.pre(() => { cur; untrack(() => flip.before()); });
  $effect(() => { cur; untrack(() => flip.after()); });
</script>
{#snippet band(rowId: string, title: string, price: boolean, full: boolean)}
  <tr class="ev" class:full class:single={!full} in:rowFx out:rowFx={{ out: true }} use:keep>
    <th class="evh"><div class="w">{#if full}{strings.evidenceFor(title)}{#if web}<button class="outline" disabled={busy} onclick={() => guard(() => choose!.run('check', rowId))}>{strings.checkRow}</button>{/if}{/if}</div></th>
    {#each view!.cols as p (p.id)}
      {@const k = slotKey(p.id, rowId)}
      {@const shown = full || cur.item === k}
      <td class:chosen={p.id === view!.chosenId} class:has={shown}><div class="w">
        {#if shown}<div class="cw" in:cardFx out:cardFx={{ out: true }}>
          <Card product={p.title} criterion={title} cell={cellOf(p.id, rowId)} filling={view!.filling.has(fillKey(p.id, rowId))} {price} {web} {busy} single={!full} act={actions(p.id, rowId)} /></div>{/if}
      </div></td>
    {/each}
  </tr>
{/snippet}
{#if visible}
  <main class="compare">
    {#if choose && view}
      {#if !web}<div class="banner">{strings.webOff}<button onclick={webOn}>{strings.webOn}</button></div>{/if}
      <div class="bar">
        <h1>{strings.title}</h1>
        {#if view.research || view.queued}
          <span class="research"><span class="spin" aria-hidden="true"></span><span aria-live="polite">{view.research ? `${strings.filling(view.research.slots.length)} · ${stepText(view.research.progress)}` : strings.starting}</span>
            <button onclick={() => choose!.cancelResearch()}>{strings.cancel}</button></span>
        {/if}
        {#if view.running?.task === 'check'}
          <span class="research"><span class="spin" aria-hidden="true"></span><span aria-live="polite">{strings.checking} · {stepText(view.running.progress)}</span><button onclick={() => choose!.cancel()}>{strings.cancel}</button></span>
        {/if}
        {#if failed}<span class="failed" role="alert">{strings.checkFailed} <button onclick={() => void failed.retry().catch(() => {})}>{strings.retry}</button></span>{/if}
        <span class="sp"></span>
        {#if view.irr}<button class:on={showIrr} aria-pressed={showIrr} onclick={() => { noHover = true; showIrr = !showIrr; }}>{showIrr ? strings.hideIrrelevant(view.irr) : strings.showIrrelevant(view.irr)}</button>{/if}
        {#if view.cols.length}<button disabled={!view.empty} onclick={() => choose!.fillCompare()}>{strings.fillCompare}</button>{/if}
      </div>
      {#if !view.cols.length}
        <div class="stage"><div class="emptystate"><h2>{strings.emptyTitle}</h2><p>{strings.emptyBody}</p><button onclick={() => navigate('survey')}>{strings.openSurvey}</button></div></div>
      {:else}
        <div class="stage"><div class="scroll" bind:this={scroller} onpointermove={() => noHover = false} role="presentation">
          <table role="grid" class:nohover={noHover}>
            <thead><tr>
              <th class="corner" scope="col" aria-label={allOpen ? strings.foldAllLabel : strings.unfoldAllLabel} aria-expanded={allOpen}>
                <button class="corner-btn" data-all onclick={() => go(clickAll(cur, view!.rowIds))}><span class="cnt">{strings.shortlisted(view.cols.length)}</span><small>{allOpen ? strings.foldAll : strings.unfoldAll}</small></button></th>
              {#each view.cols as p (p.id)}
                {@const chosen = p.id === view.chosenId}
                <th class="prod" class:chosen scope="col" data-product={p.id}><span class="pn">{chosen ? '✓ ' : ''}{p.title}</span>
                  <div class="acts">{#if chosen}<span class="chosen-l">{strings.chosen}</span><button onclick={() => guard(() => choose!.unchoose(p.id))}>{strings.unchoose}</button>
                    {:else}<button class="outline" onclick={() => guard(() => choose!.choose(p.id))}>{strings.choose}</button><button onclick={() => guard(() => choose!.unshortlist(p.id))}>{strings.remove}</button>{/if}</div></th>
              {/each}
              {#if view.cols.length === 1}
                <th class="prod more-h" scope="col"><div class="more">{strings.oneProduct(view.candidates.slice(0, 3).map(c => c.title), Math.max(0, view.candidates.length - 3))}
                  <button onclick={() => navigate('survey')}>{strings.openSurvey}</button></div></th>
              {/if}
            </tr></thead>
            <tbody>
              {#each view.groups as g (g.state)}
                <tr class="grp" in:rowFx|global out:rowFx|global={{ out: true }}><th colspan={view.cols.length + 1 + (view.cols.length === 1 ? 1 : 0)}><div class="w">{strings.groups[g.state]}</div></th></tr>
                {#each g.rows as r (r.id)}
                  {@const full = cur.rows.includes(r.id)}
                  {@const banded = full || (cur.item !== null && splitKey(cur.item).criterionId === r.id)}
                  <tr class="crow" class:irr={g.state === 'irrelevant'} class:banded in:rowFx|global out:rowFx|global={{ out: true }}>
                    <th class="crit" scope="row" data-row={r.id} onclick={() => go(clickRow(cur, r.id))}><div class="w">
                      <button class="crit-btn" aria-expanded={full} onkeydown={e => key(e, () => go(clickRow(cur, r.id)))}>
                        <span class="tw" aria-hidden="true">{full ? '▾' : '▸'}</span><span class="cn">{r.title}</span>{#if r.why}<span class="why" title={r.why}>{r.why}</span>{/if}
                        <span class="sum">{rowSummary(view.cols, r.id, view.filling)}</span></button></div></th>
                    {#each view.cols as p (p.id)}
                      {@const k = slotKey(p.id, r.id)}
                      {@const cell = cellOf(p.id, r.id)}
                      {@const filling = view.filling.has(fillKey(p.id, r.id))}
                      <td class:chosen={p.id === view.chosenId} class:filling class:item={cur.item === k} data-cell={k} data-status={filling ? 'filling' : cell ? (cell.user ? 'edited' : cell.value === null ? 'none' : cell.disagree ? 'disagree' : 'ok') : 'empty'}
                        onclick={() => go(clickCell(cur, k))}><div class="w">
                        <button class="cell-btn" aria-expanded={full || cur.item === k} onkeydown={e => { key(e, () => go(clickCell(cur, k))); if (e.key === 'Escape' && cur.item) go(nothingOpen); }}>
                          {#key `${filling}|${cell?.at}|${cell?.user?.at}`}<span class="body" in:valueFx><CellBody {cell} {filling} price={r.price} /></span>{/key}</button></div></td>
                    {/each}
                    {#if view.cols.length === 1}<td class="spare"><div class="w"></div></td>{/if}
                  </tr>
                  {#if banded}{@render band(r.id, r.title, r.price, full)}{/if}
                {/each}
              {/each}
              {#if !view.groups.length}<tr><td class="nocrit" colspan={view.cols.length + 1}><div class="w">{strings.noCriteria}</div></td></tr>{/if}
            </tbody>
          </table></div></div>
      {/if}
    {/if}
  </main>
{/if}
<style>
  .compare { --ink-faint: color-mix(in srgb, var(--ink-mute) 62%, var(--bg)); --band: color-mix(in srgb, var(--surface-2) 60%, transparent); --fill: color-mix(in srgb, var(--ink) 5%, transparent);
    position: absolute; inset: 0; display: flex; flex-direction: column; font: 400 12px/1.4 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif; }
  .banner button, .bar button { font: 400 12px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; padding: 3px 10px; }
  .banner { padding: 7px 16px; font-size: 12px; background: color-mix(in srgb, var(--surface-2) 70%, transparent); border-bottom: 1px solid var(--glass-line); }
  .banner button { margin-left: 8px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 16px; }
  .bar h1 { margin: 0; font: 350 24px/1.2 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif; } .sp { flex: 1; }
  .research { display: flex; gap: 10px; align-items: center; font-size: 12px; border: 1px solid var(--accent); padding: 3px 4px 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--surface) 70%, transparent); }
  .research button { font-size: 11px; padding: 1px 8px; border-radius: 999px; }
  .spin { display: inline-block; width: 9px; height: 9px; border: 1.5px solid var(--accent); border-radius: 50%; border-right-color: transparent; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(1turn); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; border-right-color: var(--accent); border-style: dashed; } .prod.chosen { animation: none; } }
  :global(:root[data-reduce-motion='on']) .spin { animation: none; border-right-color: var(--accent); border-style: dashed; }
  :global(:root[data-reduce-motion='on']) .prod.chosen { animation: none; }
  .failed { color: var(--error-ink); }
  .stage { position: relative; flex: 1; min-height: 0; }
  .emptystate { max-width: 460px; margin: 10vh auto; padding: 0 16px; text-align: center; } .emptystate h2 { font: 350 24px 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif; margin: 0 0 8px; } .emptystate p { color: var(--ink-mute); font-size: 13px; }
  .scroll { position: absolute; inset: 0; overflow: auto; padding-bottom: 40px; background: var(--glass); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-top: 1px solid var(--glass-line); }
  table { border-collapse: separate; border-spacing: 0; min-width: 100%; }
  th, td { vertical-align: top; text-align: left; padding: 0; border-bottom: 1px solid var(--glass-line); border-right: 1px solid var(--glass-line); font-weight: 400; }
  td { max-width: 260px; } .w { padding: 6px 8px; box-sizing: border-box; }
  .cell-btn, .crit-btn, .corner-btn { all: unset; display: block; box-sizing: border-box; width: 100%; cursor: pointer; font: inherit; color: inherit; }
  .cell-btn:focus-visible, .crit-btn:focus-visible, .corner-btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
  thead th { position: sticky; top: 0; z-index: 2; background: color-mix(in srgb, var(--surface) 92%, transparent); padding: 6px 8px; min-width: 170px; border-bottom: 1px solid var(--line); }
  thead th.corner { left: 0; z-index: 3; width: 190px; min-width: 190px; padding: 0; } .corner-btn { padding: 6px 8px; }
  .cnt { display: block; font: 600 11px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; } .corner small { display: block; font: 400 11px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; color: var(--ink-mute); }
  .pn { display: block; font: 600 15px/1.25 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif; }
  .acts { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px; } .acts button { font-size: 11px; padding: 0 6px; border-radius: 2px; } .chosen-l { font: 400 11px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; }
  .outline { border-color: var(--accent); color: var(--accent); background: transparent; }
  th.prod.chosen { background: var(--accent); color: var(--accent-ink); animation: lift 200ms ease-out; } th.prod.chosen .acts button { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }
  @keyframes lift { from { opacity: .45; } }
  .more { font-weight: 400; color: var(--ink-mute); border: 1px dashed var(--line); padding: 6px; display: grid; gap: 4px; justify-items: start; }
  tr.grp th { background: color-mix(in srgb, var(--surface) 92%, transparent); color: var(--accent); font: 600 11px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; border-right: 0; }
  tr.grp .w { padding: 3px 8px; position: sticky; left: 0; width: max-content; }
  tbody th.crit { position: sticky; left: 0; z-index: 1; width: 190px; min-width: 190px; max-width: 190px; background: color-mix(in srgb, var(--surface) 88%, transparent); cursor: pointer; }
  tbody th.crit .w { padding: 0; } .crit-btn { padding: 6px 8px; }
  .crit-btn .why, .crit-btn .sum { display: block; } .crit-btn .tw { display: inline-block; width: 14px; color: var(--accent); } .crit-btn .cn { display: inline; font: 600 13px 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif; }
  .why, .sum { margin-left: 14px; font: 400 11px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
  .why { color: var(--ink-faint); } .sum { color: var(--ink-mute); }
  tr.crow.banded > th.crit { box-shadow: inset 2px 0 0 var(--accent); }
  tr.crow:hover > * { background: color-mix(in srgb, var(--ink) 4%, transparent); } tr.crow:hover > th.crit { background: color-mix(in srgb, var(--surface-2) 92%, transparent); }
  table.nohover tr.crow:hover > td:not(.item):not(.filling) { background: transparent; } table.nohover tr.crow:hover > th.crit { background: color-mix(in srgb, var(--surface) 88%, transparent); }
  tr.irr { color: var(--ink-faint); }
  td[data-cell] { cursor: pointer; } td.chosen { box-shadow: inset 2px 0 0 var(--accent), inset -2px 0 0 var(--accent); }
  td.filling { background: repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, var(--accent) 10%, transparent) 5px 10px); }
  td.item { box-shadow: inset 0 -2px 0 var(--accent); background: var(--band); } td.item.chosen { box-shadow: inset 2px 0 0 var(--accent), inset -2px 0 0 var(--accent), inset 0 -2px 0 var(--accent); }
  td.spare, td.nocrit { cursor: default; } td.nocrit { color: var(--ink-mute); }
  tr.ev > * { background: var(--band); border-bottom: 1px solid color-mix(in srgb, var(--accent) calc(var(--fx, 1) * 100%), var(--glass-line)); cursor: default; }
  tr.ev > th .w, tr.ev > td .w { padding: 6px 8px 10px; }
  tr.ev > th { position: sticky; left: 0; z-index: 1; } tr.ev th .w { color: var(--ink-mute); font: 400 11px 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif; } tr.ev th .w button { display: block; margin-top: 4px; font-size: 11px; padding: 0 6px; border-radius: 2px; }
  tr.ev.single > td.has { box-shadow: inset calc(var(--fx, 1) * 2px) 0 0 var(--accent); }
  tr.ev.single > td.has.chosen { box-shadow: inset 2px 0 0 var(--accent), inset -2px 0 0 var(--accent); }
  tr.ev > td.chosen { box-shadow: inset 2px 0 0 var(--accent), inset -2px 0 0 var(--accent); }
</style>
