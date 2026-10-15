<script lang="ts">
  /** A source's kind tag, or *yours* (CR-42, CR-51). */
  import type { SourceKind } from '../rules';
  import { strings } from './strings';
  let { kind }: { kind: SourceKind | 'user' } = $props();
</script>
<span class="k" data-k={kind}>{kind === 'user' ? strings.yours : strings.kinds[kind]}</span>
<style>
  .k { display: inline-block; font: 600 11px/15px var(--font-small, 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; white-space: nowrap; color: var(--ink-mute); flex: none; }
  .k[data-k='measured'] { border-color: var(--ink-mute); color: var(--ink); }
  .k[data-k='opinion'] { border-style: dashed; font-style: italic; }
  .k[data-k='model'] { border-style: dotted; }
  .k[data-k='sponsored'] { text-decoration: line-through; color: var(--ink-faint); }
  .k[data-k='user'] { background: var(--focus); color: var(--accent-ink); border-color: var(--focus); }
</style>
