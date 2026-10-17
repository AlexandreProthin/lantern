<script lang="ts">
  /** Amber's predefined lines mark button names as *Name*: shown as emphasis, never parsed as HTML. */
  let { text }: { text: string } = $props();
  const parts = $derived(text.split(/\*([^*]+)\*/).map((part, i) => ({ part, em: i % 2 === 1 })));
</script>
{#each parts as { part, em }}{#if em}<em>{part}</em>{:else}{part}{/if}{/each}
<style>em { font-style:normal; color:var(--ink); font-weight:600; }</style>
