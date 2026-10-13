<script lang="ts">
  import type { Settings } from '../../frame/settings';
  let { settings, changed }: { settings: Settings; changed: () => void } = $props();
  const sample = $derived(settings.sample as { note: string });
</script>
<label>Note<input aria-label="Sample note" bind:value={sample.note} onblur={changed} /></label>
