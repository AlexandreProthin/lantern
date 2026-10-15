<script lang="ts">
  // CR-41, CR-42: every product fact shows its source (kind tag, name) and the date it was read; a price is an indication at that date.
  import { invoke } from '@tauri-apps/api/core';
  import type { GraphNode } from '../../../core/model';
  import { facts } from '../rules';
  import type { Fact, Source } from '../rules';
  import { sourceNames, t } from './strings';
  let { node }: { node: GraphNode } = $props();
  const list = $derived(facts(node));
  const isPrice = (f: Fact) => f.label.trim().toLowerCase() === 'price';
  const when = (s: Source) => s.kind === 'model' ? t.readIn(s.read) : t.readOn(s.read);
  function open(e: MouseEvent, url: string) { if ('__TAURI_INTERNALS__' in window) { e.preventDefault(); void invoke('open_external', { url }); } }
</script>
<section class="facts" aria-label={t.facts}>
  <h2>{t.facts}</h2>
  {#if !list.length}<p class="none">{t.noFacts}</p>{/if}
  <dl>
    {#each list as fact, n (n)}
      <div class="fact">
        <dt>{fact.label}</dt>
        <dd>
          <span class="value">{fact.value}</span>
          {#each fact.sources as s, i (i)}
            <span class="src" data-kind={s.kind}>
              <b class="tag">{sourceNames[s.kind]}</b>
              {#if s.url}<a href={s.url} target="_blank" rel="noopener noreferrer" onclick={e => open(e, s.url!)}>{s.name}</a>{:else}<span>{s.name}</span>{/if}
              <span class="date">{when(s)}</span>{#if s.kind === 'sponsored'}<em>{t.notUsed}</em>{/if}
            </span>
          {/each}
          {#if isPrice(fact) && fact.sources[0]}<small class="price-note">{t.priceNote(fact.sources[0].read)}</small>{/if}
        </dd>
      </div>
    {/each}
  </dl>
</section>
<style>
  h2 { font-size:13px; color:var(--ink-mute); font-weight:500; margin:20px 0 10px; }
  dl { margin:0; display:grid; gap:12px; } .fact { display:grid; gap:4px; }
  dt { font-size:11px; color:var(--ink-mute); } dd { margin:0; display:grid; gap:3px; }
  .value { font-size:15px; }
  .src { font-size:11px; color:var(--ink-mute); display:flex; gap:6px; flex-wrap:wrap; align-items:baseline; }
  .tag { font-weight:500; font-size:10px; border:1px solid var(--line); border-radius:6px; padding:0 5px; color:var(--ink); }
  .src[data-kind='opinion'] .tag, .src[data-kind='model'] .tag { color:var(--ink-mute); }
  .src[data-kind='sponsored'] { text-decoration:line-through; } .src[data-kind='sponsored'] em { text-decoration:none; font-style:normal; }
  .src a { color:var(--accent); } .date { color:var(--ink-mute); }
  .price-note { font-size:11px; color:var(--ink-mute); font-style:italic; }
  .none { color:var(--ink-mute); font-size:12px; margin:0; }
</style>
