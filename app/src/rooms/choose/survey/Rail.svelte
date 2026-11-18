<script lang="ts">
  // CR-14, choose-board recipe r005-02 "Unfold from the spine": the counter rail between graph and panel, in place of the divider.
  // Counters from stats.ts board(); a dot where something is missing, hover lists what; a click opens the board.
  import { untrack } from 'svelte';
  import type { Settings } from '../../../frame/settings';
  import { board } from '../stats';
  import type { ChooseSession } from '../session';
  import { missingItems, stageOf } from './missing';
  import { EASE_OUT, mayMove } from './motion';
  import { t } from './strings';
  import { icons } from '../../../ui/icons';
  /** The pick counter's tick, drawn (RS-38); counters are markup so they can roll. */
  const tick = `<svg class="icon tick" viewBox="0 0 16 16" aria-hidden="true">${icons.check}</svg>`;

  let { session, revision, settings, open, toggle, recommend }: {
    session: ChooseSession; revision: number; settings: Settings; open: boolean; toggle: () => void; recommend: () => void;
  } = $props();
  // Only the graph counts here: a streamed chunk or a focus change (same visit, same edits) recomputes nothing.
  const visit = $derived.by(() => { revision; return session.visit; }), edits = $derived.by(() => { revision; return session.edits; });
  const view = $derived.by(() => { edits; const v = visit; return { b: board(v), miss: missingItems(v), stage: stageOf(v) }; });
  const busy = $derived.by(() => { revision; return !!session.running; });
  const b = $derived(view.b), miss = $derived(view.miss), stage = $derived(view.stage);
  const tip = (area: string) => miss.filter(m => m.area === area);
  const counters = $derived([
    { key: 'needs', value: `${b.needsAnswered}<span class="faint">/${b.needsTotal}</span>`, label: t.needsLabel, area: 'needs' },
    { key: 'must', value: String(b.must), label: t.mustLabel(b.nice), area: 'criteria' },
    { key: 'shortlist', value: String(b.shortlisted), label: t.shortlistLabel, area: 'shortlist' },
    { key: 'pick', value: b.chosen ? tick : '—', label: b.chosen ? b.chosen.title : t.pickLabel, area: '' },
  ]);
  const els: HTMLElement[] = [];
  let spine: HTMLElement, chip = $state<HTMLElement>(), rec = $state<HTMLElement>(), recWidth = $state(0);
  let previous: { values: string[]; html: string[]; stage: string; status: string } | null = null;
  // Motion of the recipe, on changes only: counters roll, the status chip slides, a light runs up the spine when the board becomes complete.
  $effect(() => {
    const values = counters.map(c => c.value), status = b.status, now = stage;
    untrack(() => {
      const old = previous;
      if (old && mayMove(settings)) {
        values.forEach((value, i) => { if (old.values[i] !== value && els[i]) roll(els[i], old.html[i]); });
        if (old.status !== status && chip) chip.animate([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE_OUT });
        if (now === 'ready' && old.stage !== 'ready') {
          spine?.animate([{ transform: 'scaleY(0)', opacity: 1 }, { transform: 'scaleY(1)', opacity: 1, offset: .75 }, { transform: 'scaleY(1)', opacity: 0 }], { duration: 600, easing: EASE_OUT });
          rec?.animate([{ clipPath: 'inset(0 100% 0 0 round 8px)' }, { clipPath: 'inset(0 0 0 0 round 8px)' }], { duration: 360, delay: 420, easing: EASE_OUT, fill: 'backwards' });
        }
      }
      previous = { values, html: els.map(e => e?.innerHTML ?? ''), stage: now, status };
    });
  });
  function roll(el: HTMLElement, oldHtml: string) {
    const ghost = el.cloneNode(false) as HTMLElement; ghost.innerHTML = oldHtml; ghost.classList.add('ghost');
    ghost.style.cssText = `position:absolute;left:0;right:0;top:${el.offsetTop}px;margin:0;pointer-events:none`; el.parentElement!.appendChild(ghost);
    const gone = ghost.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60%)', opacity: 0 }], { duration: 280, easing: EASE_OUT, fill: 'forwards' });
    gone.onfinish = () => ghost.remove(); setTimeout(() => ghost.remove(), 450);
    el.animate([{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: EASE_OUT });
  }
</script>
<aside class="rail" aria-label={t.rail} data-open={open} style:--rec={b.status === 'exploring' ? `${recWidth}px` : '0px'}>
  <span class="spine-run" bind:this={spine}></span>
  <button class="open" aria-expanded={open} aria-label={open ? t.closeBoard : t.openBoard} onclick={toggle}>
    <span class="head"><span class="ttl">{t.boardTitle}</span>
    <span class="st" data-s={stage} bind:this={chip}>{t.stages[stage]}</span></span>
    {#each counters as c, i (c.key)}
      {@const items = c.area ? tip(c.area) : []}
      <span class="ctr" class:miss={items.length} data-counter={c.key}>
        <b bind:this={els[i]}>{@html c.value}</b><small>{c.label}</small>
        {#if items.length}<span class="tip" role="tooltip">{#each items as m, k (k)}<span>{m.text}</span>{/each}</span>{/if}
      </span>
    {/each}
    <span class="gap"></span>
    <span class="miss-n">{miss.length ? t.missingCount(miss.length) : b.chosen ? t.stages[stage] : t.complete}</span>
  </button>
  {#if b.status === 'exploring'}<button class="rec" class:on={stage === 'ready'} bind:this={rec} bind:offsetWidth={recWidth} disabled={busy} onclick={recommend}>{stage === 'ready' ? t.recommendReady : t.recommend}</button>{/if}
</aside>
<style>
  .rail { --ink-faint:color-mix(in srgb, var(--ink-mute) var(--faint-share), var(--bg)); position:relative; flex:0 0 88px; width:88px; height:100%; box-sizing:border-box; display:flex; flex-direction:column; z-index:3;
    background:var(--surface); border-left:2px solid var(--accent); font-family:'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; }
  .open { all:unset; box-sizing:border-box; flex:1; min-height:0; display:flex; flex-direction:column; align-items:stretch; gap:22px; padding:18px 8px; text-align:center; cursor:pointer; }
  .open:hover { background:color-mix(in srgb, var(--ink) 5%, transparent); }
  .open:focus-visible { outline:1px solid var(--focus); outline-offset:-3px; }
  .ttl { font:600 calc(11px * var(--text-scale)) var(--font-small, 'Segoe UI Variable Small','Segoe UI',sans-serif); color:var(--accent); }
  .st { font:400 calc(11px * var(--text-scale)) 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; border:0; padding:0; color:var(--accent); display:block; }
  .st[data-s='ready'] { background:color-mix(in srgb, var(--accent) 18%, transparent); border-radius:999px; }
  .st[data-s='decided'] { background:var(--surface-2); color:var(--focus); border-radius:999px; }
  .st[data-s='bought'] { background:var(--accent); color:var(--accent-ink); border-radius:999px; }
  .ctr { position:relative; display:block; }
  .ctr b { display:block; font:350 calc(30px * var(--text-scale))/1.1 'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif; letter-spacing:-.01em; font-variant-numeric:tabular-nums; color:var(--accent); }
  .ctr b :global(.faint) { font-size:calc(15px * var(--text-scale)); color:var(--ink-faint); } .ctr b :global(.tick) { width:26px; height:26px; stroke-width:1.6; vertical-align:-3px; }
  .ctr small { display:block; margin-top:6px; font:400 calc(11px * var(--text-scale))/1.3 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--ink-mute); overflow-wrap:anywhere; }
  .ctr.miss b { color:var(--ink); }
  .ctr.miss b::before { content:''; display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--focus); vertical-align:middle; margin:0 5px 0 -10px; }
  .tip { display:none; position:absolute; right:calc(100% + 10px); top:0; width:230px; box-sizing:border-box; text-align:left; z-index:5; padding:12px 14px; font:400 calc(12px * var(--text-scale))/1.65 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif;
    background:var(--surface); border:1px solid var(--line); color:var(--ink); box-shadow:0 10px 30px color-mix(in srgb, var(--code) 70%, transparent); }
  .tip span { display:block; }
  .ctr:hover .tip { display:block; }
  .gap { flex:1; }
  .miss-n { font:400 calc(11px * var(--text-scale)) 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; color:var(--ink-mute); }
  /* RS-38: Recommend is a quiet accent button until the board is ready, then the filled primary; nothing glows. */
  .rec { margin:0 5px 18px; font:600 calc(11px * var(--text-scale)) 'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif; padding:6px 2px; white-space:nowrap; color:var(--accent); }
  .rec.on { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
  .rec.on:hover:not(:disabled) { background:color-mix(in srgb, var(--accent) 86%, var(--ink)); }
  .head { display:contents; }
  /* NW-40: on a phone the rail is a bar under the graph in two rows: the title, the stage and what is missing beside
     Recommend, then the four counters in equal columns, so none hides under the button (amended 2026-11-18). */
  @media (max-width: 719px) {
    .rail { flex:none; width:100%; height:auto; display:block; border-left:0; border-top:2px solid var(--accent); padding-bottom:env(safe-area-inset-bottom); }
    .open { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); column-gap:10px; row-gap:6px; width:100%; padding:8px 12px 10px; text-align:left; }
    .head { grid-row:1; grid-column:1 / -1; justify-self:start; display:flex; align-items:center; gap:10px; min-height:32px; min-width:0; }
    .st[data-s] { padding:2px 8px; }
    .miss-n { grid-row:1; grid-column:1 / -1; justify-self:end; align-self:center; margin-right:calc(var(--rec, 0px) + 10px); white-space:nowrap; }
    .ctr { grid-row:2; min-width:0; } .ctr b { font-size:calc(20px * var(--text-scale)); } .ctr.miss b::before { margin-left:0; }
    .ctr small { margin-top:2px; font-size:calc(10px * var(--text-scale)); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .gap, .spine-run, .tip { display:none !important; }
    .rec { position:absolute; top:8px; right:12px; margin:0; padding:7px 12px; }
  }
  .spine-run { position:absolute; left:-2px; top:0; bottom:0; width:2px; background:var(--focus); transform-origin:50% 100%; pointer-events:none; box-shadow:0 0 8px var(--glow-near); opacity:0; }
</style>
