<script lang="ts">
  // Web demo only: says what this is, and offers a reset and the real app.
  import { strings } from '../ui/strings';
  import { resetDemo } from './start';
</script>
<aside class="demo" aria-label={strings.demoBadge}>
  <span class="badge" title={strings.demoBadgeTitle}>{strings.demoBadge}</span>
  <button title={strings.demoResetTitle} onclick={resetDemo}>{strings.demoReset}</button>
  <a href={strings.demoAppUrl} target="_blank" rel="noopener">{strings.demoGetApp} ↗</a>
</aside>
<style>
  .demo{position:fixed;top:66px;left:16px;z-index:40;display:flex;align-items:center;gap:2px;padding:3px 4px 3px 3px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:999px;
    background:color-mix(in srgb,var(--surface,#151a26) 82%,transparent);backdrop-filter:blur(6px);font-size:12px;color:var(--ink-mute)}
  .badge{padding:3px 9px;border-radius:999px;background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent);font-weight:600;cursor:help}
  button,a{border:0;background:transparent;color:var(--ink-mute);font:inherit;padding:3px 8px;border-radius:999px;text-decoration:none;cursor:pointer}
  button:hover,a:hover{color:var(--accent)}
</style>
