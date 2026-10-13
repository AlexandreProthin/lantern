<script lang="ts">
  import type { SubjectMenuProps } from '../../frame/room';
  let { visit }: SubjectMenuProps = $props();
</script>
<p>{Object.keys(visit.nodes).length} nodes</p>
