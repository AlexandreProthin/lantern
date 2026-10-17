<script lang="ts">
  /** CO-22, GV-73: *What can I do here?* for one space. Lines mark button names as *Name*; they render as emphasis, never as HTML. */
  let { lines }: { lines: readonly string[] } = $props();
  const parts = (line: string) => line.split(/\*([^*]+)\*/).map((text, i) => ({ text, em: i % 2 === 1 }));
</script>
<ul class="guide">{#each lines as line}<li>{#each parts(line) as part}{#if part.em}<em>{part.text}</em>{:else}{part.text}{/if}{/each}</li>{/each}</ul>
<style>
  .guide { margin:0; padding-left:18px; display:grid; gap:4px; } em { font-style:normal; color:var(--ink); font-weight:600; }
</style>
