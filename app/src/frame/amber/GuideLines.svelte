<script lang="ts">
  import Emphasis from './Emphasis.svelte';
  /** CO-22, GV-73: *What can I do here?* for one space. */
  let { lines }: { lines: readonly string[] } = $props();
</script>
<ul class="guide">{#each lines as line}<li><Emphasis text={line} /></li>{/each}</ul>
<style>
  .guide { margin:0; padding-left:18px; display:grid; gap:4px; }
</style>
