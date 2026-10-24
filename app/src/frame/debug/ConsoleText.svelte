<script lang="ts">
  // DC-13: a long text starts folded to its first lines, with "show all".
  import { strings } from '../../ui/strings';
  import { fold } from './console-filter';
  let { text }: { text: string } = $props();
  let open = $state(false);
  const folded = $derived(fold(text));
</script>
<pre class="text">{open || !folded.hidden ? text : folded.head}{#if !text}<span class="none">{strings.debug.none}</span>{/if}</pre>
{#if folded.hidden}<button class="more" onclick={() => open = !open}>{open ? strings.debug.showLess : strings.debug.showAll(folded.hidden)}</button>{/if}
<style>
  .text { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; color:var(--dc-ink); background:var(--dc-well); border-radius:4px; padding:6px 8px; }
  .none { color:var(--dc-mute); }
  .more { margin:2px 0 0; padding:0 4px; border:0; background:none; color:var(--dc-link); font:inherit; cursor:pointer; }
  .more:hover { text-decoration:underline; }
</style>
