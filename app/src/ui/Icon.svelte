<script lang="ts">
  // One drawn icon (RS-38), decorative: the button or text beside it carries the accessible name.
  import { icons, type IconName } from './icons';
  let { name, size = 16 }: { name: IconName; size?: number } = $props();
</script>
<svg class="icon" style:width="{size}px" style:height="{size}px" viewBox="0 0 16 16" aria-hidden="true" focusable="false">{@html icons[name]}</svg>
