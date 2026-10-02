<script lang="ts">
  import type { SpaceProps } from '../../frame/room';
  import { strings } from '../../ui/strings';
  let { visible }: SpaceProps = $props();
</script>
{#if visible}<main class="stub"><h1>{strings.appName}</h1><p>{strings.waitingDesign}</p></main>{/if}
<style>.stub { padding:12vh 10vw; } h1 { font-size:48px; color:var(--accent); }</style>
