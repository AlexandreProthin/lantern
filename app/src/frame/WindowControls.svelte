<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { strings } from '../ui/strings';
  // The window has no system frame (decorations: false), so the header carries its controls.
  // Close goes through window.close() so the frame's onCloseRequested flush still runs.
  const window = getCurrentWindow();
  let maximized = $state(false);
  onMount(() => {
    let unlisten: (() => void) | undefined, disposed = false;
    const sync = async () => { maximized = await window.isMaximized(); };
    void sync();
    void window.onResized(() => void sync()).then(off => { if (disposed) off(); else unlisten = off; });
    return () => { disposed = true; unlisten?.(); };
  });
</script>
<div class="controls">
  <button aria-label={strings.minimize} title={strings.minimize} onclick={() => window.minimize()}><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5.5h10" /></svg></button>
  <button aria-label={maximized ? strings.unmaximize : strings.maximize} title={maximized ? strings.unmaximize : strings.maximize} onclick={() => window.toggleMaximize()}>
    {#if maximized}<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 2.5V.5h7v7h-2M.5 2.5h7v7h-7z" /></svg>{:else}<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M.5 .5h9v9h-9z" /></svg>{/if}
  </button>
  <button class="close" aria-label={strings.closeWindow} title={strings.closeWindow} onclick={() => window.close()}><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0l10 10M10 0L0 10" /></svg></button>
</div>
<style>
  .controls { display:flex; align-self:stretch; margin-right:-16px; }
  button { width:46px; min-width:46px; height:100%; padding:0; border:0; border-radius:0; background:none; color:var(--ink-mute); display:grid; place-items:center; }
  button:hover { background:var(--surface-2); color:var(--ink); }
  .close:hover { background:#c42b1c; color:#fff; }
  svg { width:10px; height:10px; fill:none; stroke:currentColor; stroke-width:1; }
</style>
