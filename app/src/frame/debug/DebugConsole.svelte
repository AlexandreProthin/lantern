<script lang="ts">
  import type { Settings } from "../settings";
  let { settings, changed }: { settings: Settings; changed: () => void } = $props();
</script>
<div class="debug-console"></div>
