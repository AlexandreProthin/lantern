<script lang="ts">
  // Choose-gallery recipe, the pick line: the largest text on the card (CR-24, CR-61).
  import type { SubjectSummary } from '../../../frame/catalogue';
  import { chooseOf } from '../summary';
  import { hoursAgo } from './format';
  import { text } from './strings';
  let { summary, running = false }: { summary: SubjectSummary; running?: boolean } = $props();
  const card = $derived(chooseOf(summary));
  const unchosenAt = $derived(card ? [...card.history].reverse().find(h => h.unchosen)?.at ?? card.pick?.at : undefined);
</script>
{#if card?.pick && !card.unchosen}
  <div class="pick" title={card.pick.title}><span class="verb">{card.status === 'bought' ? text.bought : text.chose}</span> <b>{card.pick.title}</b>{#if card.pick.price}{' '}<span class="price">· {card.pick.price}</span>{/if}{#if running}<span class="run">{text.generating}</span>{/if}</div>
{:else if card?.pick}
  <div class="pick back"><span class="verb">{text.noPick}</span> <b>{card.pick.title}</b> <span class="price">{text.unchosenAgo(hoursAgo(unchosenAt))}</span>{#if running}<span class="run">{text.generating}</span>{/if}</div>
{:else if card?.missing.length}
  <div class="pick" title={card.missing.join(' · ')}><span class="verb">{text.noPickYet}</span> <b>{text.missingCount(card.missing.length)}</b>{#if running}<span class="run">{text.generating}</span>{/if}</div>
{:else}
  <div class="pick ready"><span class="verb">{text.noPickYet}</span> <b>{text.ready}</b> <span class="price">· {text.readyNote}</span>{#if running}<span class="run">{text.generating}</span>{/if}</div>
{/if}
<style>
  .pick{font:600 18px/1.25 var(--font-display,'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif);color:var(--ink-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  b{font-weight:600;color:var(--ink)}.verb{display:block;font:400 11px/1.45 var(--font-small,'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif);color:var(--ink-faint)}
  .price{font:400 13px var(--font-text,'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif);color:var(--ink-mute)}.run{font:400 12px var(--font-small,'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif);color:var(--ink-mute)}.run:before{content:' · '}
  .ready b{color:var(--accent)}.ready b:before{content:'◆ ';font-size:.8em}.back b{text-decoration:line-through;text-decoration-thickness:1px;color:var(--ink-mute);font-weight:350}
</style>
