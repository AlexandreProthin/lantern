<script lang="ts">
  // WG-80..86: what a search inside every subject of the library found (both rooms), grouped by subject, each
  // result its node, the line it was found in and the words marked. A result opens its subject on that node.
  // The field is the caller's: Welcome's own, the Gallery's filter.
  import { groupHits, marks, SEARCH_LIMIT } from '../frame/library-search';
  import type { FoundHit, LibrarySpaces } from '../frame/library-spaces';
  import { strings } from './strings';
  let { library, query, active = true, heading = '', exit }: {
    library: LibrarySpaces; query: string; active?: boolean; heading?: string;
    /** Up from the first result: back to the field. */ exit?: () => void;
  } = $props();
  /** WG-81: one letter finds too much to read; two start a search. */
  const MIN = 2, WAIT = 180;
  let hits = $state<FoundHit[]>([]), done = $state(''), error = $state(''), list = $state<HTMLElement>();
  let sequence = 0;
  const wanted = $derived(active && query.trim().length >= MIN ? query.trim() : '');
  // Debounced; an answer that comes back after a newer query is dropped.
  $effect(() => {
    const q = wanted, n = ++sequence;
    if (!q) { hits = []; done = ''; error = ''; return; }
    const timer = setTimeout(() => {
      library.search(q).then(found => { if (n === sequence) { hits = found; done = q; error = ''; } },
        e => { if (n === sequence) { hits = []; done = q; error = String(e); } });
    }, WAIT);
    return () => clearTimeout(timer);
  });
  const groups = $derived(groupHits(hits));
  const pending = $derived(done !== wanted);
  export function focusFirst(): boolean { const first = list?.querySelector<HTMLElement>('.hit'); first?.focus(); return !!first; }
  function key(e: KeyboardEvent) {
    const all = [...(list?.querySelectorAll<HTMLElement>('.hit') ?? [])], i = all.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); all[Math.min(i + 1, all.length - 1)].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) all[i - 1].focus(); else exit?.(); }
    else if (e.key === 'Escape' && exit) { e.preventDefault(); e.stopPropagation(); exit(); }
  }
</script>
{#snippet marked(text: string)}{#each marks(text, done) as part, i (i)}{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}{/snippet}
{#if wanted}
  <section class="library-search" aria-label={heading || strings.insideSubjects} aria-busy={pending}>
    {#if heading}<h2>{heading}</h2>{/if}
    <span class="sr-only" role="status">{pending ? '' : strings.searchResults(hits.length)}</span>
    {#if error}<p class="note" role="alert">{error}</p>
    {:else if !hits.length}<p class="note">{pending ? strings.searching : strings.searchNothing(wanted)}</p>
    {:else}
      <div class="groups" class:stale={pending} bind:this={list} onkeydown={key} role="presentation">
        {#each groups as group (group.key)}
          <div class="group" data-subject={group.subjectId} data-room={group.room}>
            <h3>{group.subjectTitle}{#if !group.hits[0].here}<span class="room">{strings.searchInRoom(group.hits[0].roomName)}</span>{/if}</h3>
            <ul>
              {#each group.hits as hit (hit.nodeId)}
                <li><button class="hit" data-node={hit.nodeId} data-field={hit.field} onclick={() => void library.openAt(hit)}>
                  <span class="node">{@render marked(hit.nodeTitle)}</span>
                  {#if hit.snippet}<span class="line">{@render marked(hit.snippet)}</span>{/if}
                </button></li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
      {#if hits.length >= SEARCH_LIMIT}<p class="note">{strings.searchCapped(SEARCH_LIMIT)}</p>{/if}
    {/if}
  </section>
{/if}
<style>
  .library-search{display:flex;flex-direction:column;gap:14px;text-align:left}
  h2{margin:0;font-size:calc(11px * var(--text-scale));font-weight:600;color:var(--ink-faint)}
  .note{margin:0;font-size:calc(13px * var(--text-scale));color:var(--ink-mute)}
  .groups{display:flex;flex-direction:column;gap:18px;transition:opacity 120ms ease-out}.groups.stale{opacity:.6}
  h3{margin:0 0 6px;font-size:calc(14px * var(--text-scale));font-weight:600;color:var(--ink);overflow-wrap:anywhere}
  .room{margin-left:8px;font-weight:400;font-size:calc(12px * var(--text-scale));color:var(--ink-faint)}
  ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;border-left:1px solid var(--line)}
  .hit{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;padding:7px 12px;border:0;border-radius:var(--radius-surface,8px);background:transparent;color:var(--ink)}
  .hit:hover,.hit:focus-visible{background:var(--surface-2)}
  .hit:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}
  .node{font-size:calc(14px * var(--text-scale));overflow-wrap:anywhere}
  .line{font-size:calc(12px * var(--text-scale));line-height:1.45;color:var(--ink-mute);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  mark{background:color-mix(in srgb,var(--accent) 24%,transparent);color:inherit;border-radius:2px}
  .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
</style>
