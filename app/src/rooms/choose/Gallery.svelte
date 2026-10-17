<script lang="ts">
  import { untrack } from 'svelte';
  // Choose's Gallery (CR-12, CR-24, WG-51..71): the shared grid with status tabs, five sorts, the status band, the steps bar,
  // the pick line, and the selected card lifted over a still grid with its history and the board's numbers.
  import type { SpaceProps } from '../../frame/room';
  import type { SubjectSummary } from '../../frame/catalogue';
  import { inOutText, splitSummary } from '../../frame/token-split';
  import type { CardDetail, GalleryRoomView, GalleryToolbarContext } from '../../ui/gallery-types';
  import { tokens, modelName, exactDate } from '../../frame/library-format';
  import GalleryGrid from '../../ui/GalleryGrid.svelte';
  import { arrange, counts, sortKeys, type SortKey, type Tab } from './library/arrange';
  import { dateTime, hoursAgo } from './library/format';
  import { text } from './library/strings';
  import Band from './library/Band.svelte';
  import Steps from './library/Steps.svelte';
  import PickLine from './library/PickLine.svelte';
  import { chooseOf } from './summary';
  let { visible, settings, library, revision, navigate }: SpaceProps = $props();
  const catalogue = untrack(() => library.catalogue);
  // WG-55: tab, sort and direction last for the session.
  let tab = $state<Tab>('all'), sort = $state<SortKey>('lastOpened'), reverse = $state(false);
  const named = $derived.by(() => { revision; return catalogue.visible; });
  const tabCounts = $derived(counts(named));
  const filter = $derived.by(() => { revision; return catalogue.filter; });
  const selectedId = $derived.by(() => { revision; return catalogue.selectedId; });
  const room: GalleryRoomView = {
    className: 'cg', labels: { open: text.openInSurvey, delete: text.deleteAction, reveal: text.reveal }, arrange: cards => arrange(cards, tab, sort, reverse, catalogue.state.lastOpenedAt),
    deleteNote(s, showTokens) {
      const c = chooseOf(s), parts = [text.nodesN(s.total ?? 0)];
      if (c) { parts.push(text.needsN(c.stats.needs), text.criteriaN(c.stats.criteria), text.shortlistedN(c.stats.shortlisted));
        if (c.pick && !c.unchosen) parts.push(c.status === 'bought' ? text.boughtProduct(c.pick.title) : text.choseProduct(c.pick.title)); }
      if (showTokens) parts.push(text.tokensHistory(tokens(s.tokens)));
      return text.deleteNote(parts);
    },
  };
  const opened = (s: SubjectSummary) => { revision; return catalogue.state.lastOpenedAt[s.id]; };
  const running = (s: SubjectSummary) => { revision; return library.isRunning(s.id); };
  function setTab(next: Tab) { tab = next; catalogue.select(null); }
  const statsLine = (s: SubjectSummary) => { const c = chooseOf(s); return c ? `${text.needsN(c.stats.needs)} · ${text.criteriaN(c.stats.criteria)} · ${text.shortlistedN(c.stats.shortlisted)}` : ''; };
  /** CR-24: newest first, ending with the start; a product's name is known only for the last pick (the summary holds no more). */
  const timeline = (s: SubjectSummary) => {
    const c = chooseOf(s)!, title = (id?: string) => id && c.pick?.productId === id ? c.pick.title : null;
    const entries = c.history.map(h => ({ at: h.at, kind: h.unchosen ? 'u' : h.status[0], label: h.unchosen ? text.unchose(h.title ?? title(h.productId)) : h.status === 'decided' ? text.choseEntry(h.title ?? title(h.productId)) : h.status === 'bought' ? text.boughtEntry(h.title ?? title(h.productId)) : text.startedExploring })).reverse();
    return [...entries, { at: s.createdAt, kind: 'e', label: text.startedExploring }];
  };
  const lastAt = (s: SubjectSummary, pred: (h: NonNullable<ReturnType<typeof chooseOf>>['history'][number]) => boolean) => chooseOf(s)?.history.findLast(pred)?.at;
  const tabs: [Tab, string][] = [['all', text.all], ['exploring', text.status.exploring], ['decided', text.status.decided], ['bought', text.status.bought]];
</script>
{#snippet toolbar(ctx: GalleryToolbarContext)}
  <div class="bar">
    <div class="tabs" role="group" aria-label={text.tabs}>
      {#each tabs as [key, label] (key)}
        <button class="tab" class:on={tab === key} data-status={key} aria-pressed={tab === key} onclick={() => setTab(key)}>{#if key !== 'all'}<span class="dot" data-s={key}></span>{/if}<span class="tl">{label}</span><span class="n">{#key tabCounts[key]}<span class="roll">{tabCounts[key]}</span>{/key}</span></button>
      {/each}
    </div>
    <span class="sp"></span>
    <input type="search" placeholder={text.filterName} aria-label={text.filterName} value={filter} oninput={e => catalogue.setFilter(e.currentTarget.value)} onkeydown={e => { if (e.key === 'Escape') { e.stopPropagation(); catalogue.setFilter(''); } }} />
    <label class="sortl"><span>{text.sort}</span> <select aria-label={text.sort} value={sort} onchange={e => sort = e.currentTarget.value as SortKey}>{#each sortKeys as key}<option value={key}>{text.sorts[key]}</option>{/each}</select></label>
    <button class="dirb" aria-label={text.reverse} onclick={() => reverse = !reverse}>{reverse ? '↑' : '↓'}</button>
    <span class="count">{text.count(ctx.cards.length, ctx.count)}</span>
  </div>
{/snippet}
{#snippet noMatch(f: string)}
  <p class="nomatch">{text.noMatch(f, tab)}. <button onclick={() => { if (f) catalogue.setFilter(''); else tab = 'all'; }}>{f ? text.clearFilter : text.showAll}</button></p>
{/snippet}
{#snippet empty()}
  <div class="emptyc"><h1>{text.emptyTitle}</h1><p>{text.emptyNote}</p><button onclick={() => navigate('welcome')}>{text.startOne}</button></div>
{/snippet}
{#snippet visual(summary: SubjectSummary)}<Band {summary} openedAt={opened(summary)} lifted={selectedId === summary.id} />{/snippet}
{#snippet figures(summary: SubjectSummary, _detail: CardDetail)}
  <div class="mid"><Steps {summary} /></div><div class="mid"><PickLine {summary} running={running(summary)} /></div>
  <div class="mid stats">{statsLine(summary)}</div>
{/snippet}
{#snippet lifted(summary: SubjectSummary, _detail: CardDetail)}
  {@const c = chooseOf(summary)}
  {#if c}<div class="uf pk">
    {#if c.pick && !c.unchosen}
      <span class="verb">{c.status === 'bought' ? text.bought : text.chosenVerb}</span><b>{c.pick.title}</b>
      {#if c.pick.price}<span class="price">{c.pick.price}</span><span class="src">{c.pick.source ? text.seenAt(c.pick.source.name, c.pick.source.read) + ' · ' : ''}{text.priceNote}</span>{/if}
      <span class="src">{(c.status === 'bought' ? text.boughtOn : text.chosenOn)(dateTime(lastAt(summary, h => h.status === c.status) ?? c.pick.at))}</span>
    {:else if c.pick}
      <span class="verb">{text.noPick}</span><b class="struck">{c.pick.title}</b><span class="fact">{text.unchosenAgo(hoursAgo(lastAt(summary, h => !!h.unchosen) ?? c.pick.at))}</span>
      {#if c.missing.length}<span class="fact">{c.missing.join(' · ')}</span>{/if}
    {:else}
      <span class="verb">{text.noPickYet}</span>
      {#if c.missing.length}<b>{text.missingCount(c.missing.length)}</b><span class="fact">{c.missing.join(' · ')}</span>{:else}<b>{text.ready}</b><span class="fact">{text.readyWhole}</span>{/if}
    {/if}
    {#if running(summary)}<span class="fact">{text.generationRunning}</span>{/if}
  </div>{/if}
{/snippet}
{#snippet details(summary: SubjectSummary, detail: CardDetail)}
  {@const c = chooseOf(summary)}
  {#if c}<div class="uf">
    <section class="sec"><h3>{text.history}</h3><ul class="vt">{#each timeline(summary) as h}<li class={h.kind}><span>{h.label}</span><small title={dateTime(h.at)}>{dateTime(h.at)}</small></li>{/each}</ul></section>
    <section class="sec"><h3>{text.board}</h3><dl>
      <dt>{text.boardRows.needs}</dt><dd>{text.needsAnswered(c.steps.needsAnswered, c.steps.needsTotal)}</dd>
      <dt>{text.boardRows.criteria}</dt><dd>{text.criteriaSplit(c.board.must, c.board.nice, c.board.toRank, c.board.irrelevant)}</dd>
      <dt>{text.boardRows.products}</dt><dd>{text.productsSplit(c.steps.shortlisted, c.board.candidates, c.board.rejected)}</dd>
    </dl></section>
    {#if summary.rooms?.choose?.data.needsNote}<section class="sec"><h3>{text.needsNote}</h3><p class="note">“{summary.rooms.choose.data.needsNote}”</p></section>{/if}
    <section class="sec"><h3>{text.subject}</h3><dl>
      <dt>{text.created}</dt><dd>{exactDate(detail.createdAt)}</dd><dt>{text.openedRow}</dt><dd>{exactDate(detail.lastOpenedAt)}</dd>
      <dt>{text.nodes}</dt><dd>{detail.total ?? 0}</dd>
      <dt>{text.tone}</dt><dd>{typeof detail.tone === 'object' ? detail.tone.custom : detail.tone ?? '—'}</dd>
      <dt>{text.model}</dt><dd>{modelName(detail.mainModel)}</dd><dt>{text.generations}</dt><dd>{detail.generations ?? 0}{running(summary) ? ' · one running' : ''}</dd>
      {#if settings.appearance.showTokenStats}<dt>{text.tokens}</dt><dd>{inOutText(detail.input ?? 0, detail.output ?? 0, splitSummary(summary))}</dd>{/if}
    </dl></section>
  </div>{/if}
{/snippet}
<GalleryGrid {visible} {settings} {library} {revision} {navigate} {visual} {figures} {details} {lifted} {toolbar} {noMatch} {empty} {room} />
<style>
  /* The recipe's form, type and colour (choose-gallery final), over the shared grid's structure. */
  :global(.cg.gallery){--font-text:'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif;--font-display:'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;--font-small:'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif;--ink-faint:color-mix(in srgb,var(--ink-mute) 62%,var(--bg));--line-strong:color-mix(in srgb,var(--line) 65%,var(--ink-mute));padding:8px 40px 130px;font:13px/1.45 var(--font-text)}
  .bar{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:24px 0 16px}.sp{flex:1}.tabs{display:flex;gap:6px}
  .tab{display:inline-flex;gap:6px;align-items:center;padding:5px 13px;font:12px var(--font-small);color:var(--ink-mute);border:1px solid var(--line);border-radius:999px;background:transparent}.tab:hover{border-color:var(--line-strong)}
  .tab.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}.tab .n{font-size:11px;line-height:1.5;padding:0 1px;color:var(--ink-faint);overflow:hidden;display:inline-block}.tab.on .n{color:color-mix(in srgb,var(--accent-ink) 75%,transparent)}
  .roll{display:inline-block;animation:roll 280ms cubic-bezier(.2,.7,.2,1)}
  .dot{width:7px;height:7px;border-radius:50%;box-sizing:border-box;border:1px dashed var(--accent)}.dot[data-s=decided]{border:1.5px solid var(--focus)}.dot[data-s=bought]{background:var(--accent);border:0}.tab.on .dot{border-color:var(--accent-ink)}.tab.on .dot[data-s=bought]{background:var(--accent-ink)}
  .bar input{width:220px;max-width:100%;border-radius:999px;padding:6px 14px;background:var(--glass);border:1px solid var(--line);color:var(--ink);caret-color:var(--accent);font:13px var(--font-text)}.bar input::placeholder{color:var(--ink-faint)}.bar input:focus{border-color:var(--accent);outline:none}
  .sortl{display:flex;align-items:center;gap:8px;color:var(--ink-faint);font:12px var(--font-small)}.sortl select{padding:4px 10px;border:1px solid var(--line);border-radius:999px;background:var(--glass);color:var(--ink);font:12px var(--font-small)}.sortl option{background:var(--surface)}
  .dirb{padding:4px 10px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink);font:12px var(--font-small)}.count{color:var(--ink-faint);font:12px var(--font-small);font-variant-numeric:tabular-nums}
  .nomatch{color:var(--ink-mute)}.nomatch button{background:none;border:0;padding:0;color:var(--accent);text-decoration:underline;text-underline-offset:3px}
  .emptyc{text-align:center;padding:18vh 0;color:var(--ink-mute)}.emptyc h1{font:350 24px/1.1 var(--font-display);color:var(--ink);margin:0 0 10px}.emptyc p{max-width:380px;margin:0 auto 18px}
  .emptyc button{background:var(--accent);color:var(--accent-ink);border:1px solid var(--accent);border-radius:999px;font:600 12px var(--font-small);padding:7px 16px}
  /* resting card slots */
  .mid{margin:0 20px;min-width:0}.stats{font:11px/1.45 var(--font-small);color:var(--ink-faint);border-top:1px solid var(--glass-line);padding-top:10px}
  /* lifted card */
  .uf{display:grid;gap:18px;margin:0 22px;min-width:0}.pk{gap:3px}.pk .verb{font:11px var(--font-small);color:var(--ink-faint)}.pk b{font:600 18px/1.25 var(--font-display);color:var(--ink);overflow-wrap:anywhere}.pk b.struck{text-decoration:line-through;text-decoration-thickness:1px;font-weight:350;color:var(--ink-mute)}
  .pk .fact{font:12px/1.45 var(--font-text);color:var(--ink-mute)}.pk .price{font:15px var(--font-text);color:var(--ink);margin-top:4px}.pk .src{font:11px/1.45 var(--font-small);color:var(--ink-faint)}
  .sec{border-top:1px solid var(--glass-line);padding-top:12px}.sec h3{margin:0 0 6px;font:600 11px var(--font-small);color:var(--accent)}.note{margin:0;font:13px/1.65 var(--font-text);color:var(--ink-mute);overflow-wrap:anywhere}
  .vt{list-style:none;margin:0;padding:0 0 0 16px;display:grid;gap:12px;position:relative}.vt:before{content:'';position:absolute;left:4px;top:6px;bottom:6px;width:1px;background:var(--line)}
  .vt li{position:relative;display:grid;font:13px/1.45 var(--font-text)}.vt li:before{content:'';position:absolute;left:-16px;top:4px;width:9px;height:9px;border-radius:50%;box-sizing:border-box;border:1.5px solid var(--node-open);background:var(--surface)}
  .vt li.d:before{border:2px solid var(--focus);background:var(--surface-2)}.vt li.b:before{background:var(--accent);border-color:var(--accent)}.vt li.u:before{border:1.5px dashed var(--ink-mute)}.vt small{font:11px var(--font-small);color:var(--ink-faint)}
  dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:0 14px;font:12px/1.65 var(--font-text)}dt{color:var(--ink-faint);font-family:var(--font-small)}dd{margin:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;text-align:left}
  @keyframes roll{from{transform:translateY(60%);opacity:0}to{transform:none;opacity:1}}
  @media(max-width:640px){.bar input{width:100%}}
  @media(prefers-reduced-motion:reduce){.roll{animation:none}}:global(html[data-reduce-motion='on']) .roll{animation:none}
  /* grid, card and lift (global: the cards belong to the shared grid) */
  :global(.cg .grid){grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;max-width:none}
  @media(min-width:1500px){:global(.cg .grid){grid-template-columns:repeat(4,1fr)}}@media(max-width:640px){:global(.cg .grid){grid-template-columns:1fr;gap:16px}:global(.cg.gallery){padding-left:16px;padding-right:16px}}
  :global(.cg .card){display:flex;flex-direction:column;gap:12px;padding:0 0 20px;border-radius:12px;position:relative;transition:opacity .2s,border-color .2s;animation:rise 280ms cubic-bezier(.2,.7,.2,1) both}
  :global(.cg .card:hover){border-color:color-mix(in srgb,var(--accent) 35%,transparent)}
  :global(.cg .card h2){margin:6px 20px 0;font:400 13px/1.45 var(--font-text);color:var(--ink-mute)}
  :global(.cg .grid:has(.card.selected) .card:not(.selected)){opacity:.45}
  :global(.cg .card.selected){z-index:5;border-color:transparent;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;outline:none}
  :global(.cg .card.selected:focus-visible .lift){outline:2px solid var(--focus);outline-offset:2px}
  :global(.cg .card .rest){visibility:hidden;display:flex;flex-direction:column;gap:12px}
  :global(.cg .card .lift){position:absolute;top:-10px;left:-12px;right:-12px;display:flex;flex-direction:column;gap:12px;padding-bottom:22px;border-radius:14px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid color-mix(in srgb,var(--accent) 50%,transparent);box-shadow:0 0 40px 6px var(--glow-far),0 24px 60px color-mix(in srgb,var(--code) 80%,transparent);animation:unfold 320ms cubic-bezier(.2,.7,.2,1) both}
  :global(.cg .card .lift h2){margin:4px 22px 0;font:350 24px/1.1 var(--font-display);color:var(--ink);white-space:normal;overflow-wrap:anywhere}
  :global(.cg .card .lift .rename){display:block;width:calc(100% - 44px);margin:4px 22px 0;background:transparent;border:0;border-bottom:1px solid var(--accent);border-radius:0;color:var(--ink);caret-color:var(--accent);padding:2px 0 4px;outline:none;box-shadow:0 6px 12px -10px var(--glow-near);font:350 24px/1.1 var(--font-display)}
  :global(.cg .card .lift .rename::selection){background:color-mix(in srgb,var(--accent) 38%,transparent);color:var(--ink)}
  :global(.cg .card .lift .actions){margin:0 22px;gap:8px}
  :global(.cg .card .lift .actions button){padding:5px 13px;font:12px var(--font-small);border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink)}
  :global(.cg .card .lift .actions button:first-child){background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}:global(.cg .card .lift .actions button:first-child:hover:not(:disabled)){background:var(--focus)}
  :global(.cg .card .lift .actions button:nth-child(3):hover:not(:disabled)){border-color:var(--error);color:var(--error-ink)}
  :global(.cg .card .error){margin:0 20px}
  @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes unfold{from{clip-path:inset(0 0 100% 0);opacity:.4}to{clip-path:inset(-60px -60px -80px -60px);opacity:1}}
  @media(prefers-reduced-motion:reduce){:global(.cg .card),:global(.cg .card .lift){animation:none}}:global(html[data-reduce-motion='on'] .cg .card),:global(html[data-reduce-motion='on'] .cg .card .lift){animation:none}
</style>
