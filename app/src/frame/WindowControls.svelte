<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from './ipc';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { strings } from '../ui/strings';
  // The window has no system frame (decorations: false), so the header carries its controls.
  // Close goes through window.close() so the frame's onCloseRequested flush still runs.
  const window = getCurrentWindow();
  let maximized = $state(false), focused = $state(true);
  // Windows 11 opens Snap Layouts after a short hover on the maximize button; only for this
  // window when it is in front, since Win+Z acts on the foreground window.
  let snapTimer: ReturnType<typeof setTimeout> | undefined;
  const snapHover = () => { clearTimeout(snapTimer); if (focused) snapTimer = setTimeout(() => void invoke('snap_layouts'), 600); };
  const snapLeave = () => clearTimeout(snapTimer);
  onMount(() => {
    const offs: (() => void)[] = []; let disposed = false;
    const keep = (off: () => void) => { if (disposed) off(); else offs.push(off); };
    const sync = async () => { maximized = await window.isMaximized(); };
    void sync(); void window.isFocused().then(f => focused = f);
    void window.onResized(() => void sync()).then(keep);
    void window.onFocusChanged(({ payload }) => { focused = payload; if (!payload) snapLeave(); }).then(keep);
    return () => { disposed = true; snapLeave(); offs.forEach(off => off()); };
  });
</script>
<div class="controls" class:blurred={!focused}>
  <button aria-label={strings.minimize} title={strings.minimize} onclick={() => window.minimize()}><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5.5h10" /></svg></button>
  <button aria-label={maximized ? strings.unmaximize : strings.maximize} title={maximized ? strings.unmaximize : strings.maximize} onpointerenter={snapHover} onpointerleave={snapLeave} onpointerdown={snapLeave} onclick={() => window.toggleMaximize()}>
    {#if maximized}<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 2.5V.5h7v7h-2M.5 2.5h7v7h-7z" /></svg>{:else}<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M.5 .5h9v9h-9z" /></svg>{/if}
  </button>
  <button class="close" aria-label={strings.closeWindow} title={strings.closeWindow} onclick={() => window.close()}><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0l10 10M10 0L0 10" /></svg></button>
</div>
<style>
  .controls { display:flex; align-self:stretch; margin-right:-16px; }
  button { width:46px; min-width:46px; height:100%; padding:0; border:0; border-radius:0; background:none; color:var(--ink-mute); display:grid; place-items:center; transition:color .15s, background-color .15s; }
  button:hover { background:var(--surface-2); color:var(--ink); }
  button:focus-visible { outline:1px solid var(--accent); outline-offset:-3px; }
  .close:hover { background:#c42b1c; color:#fff; }
  /* Native caption buttons fade when the window is in the background. */
  .blurred button:not(:hover) { opacity:.45; }
  svg { width:10px; height:10px; fill:none; stroke:currentColor; stroke-width:1; }
</style>
