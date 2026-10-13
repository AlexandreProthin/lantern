<script lang="ts">
  import type { SpaceProps } from '../../frame/room';
  let { visible, library, revision }: SpaceProps = $props();
  const titles = $derived.by(() => { revision; return library.catalogue.visible.map(s => s.title); });
</script>
{#if visible}<main class="sample"><h1>Sample room</h1><ul aria-label="Sample subjects">{#each titles as title}<li>{title}</li>{/each}</ul></main>{/if}
<style>.sample { padding:10vh 10vw; } h1 { color:var(--accent); }</style>
