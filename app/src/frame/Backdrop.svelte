<script lang="ts">
  import { onMount } from 'svelte';
  import { Backdrop } from './backdrop';
  import { listenBackdrop } from './backdrop-signals';
  let { space, room, reduceSetting }: { space: string; room: string; reduceSetting: 'system' | 'on' } = $props();
  let haze: HTMLCanvasElement, dust: HTMLCanvasElement, backdrop: Backdrop | undefined;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => media.matches || reduceSetting === 'on';
  $effect(() => { backdrop?.setSpace(space); });
  $effect(() => { reduceSetting; backdrop?.refresh(); });
  // The frame sets data-room before this runs, so the room's tokens are already in place.
  $effect(() => { room; backdrop?.recolor(); });
  onMount(() => {
    backdrop = new Backdrop(haze, dust, reduced);
    backdrop.setSpace(space); backdrop.start(); listenBackdrop(backdrop);
    const refresh = () => backdrop?.refresh();
    media.addEventListener('change', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { listenBackdrop(null); backdrop?.dispose(); backdrop = undefined;
      media.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh); };
  });
</script>
<svelte:window onresize={() => backdrop?.resize()} onpointermove={e => backdrop?.pointer(e.clientX, e.clientY)} />
<div class="backdrop" aria-hidden="true" data-testid="backdrop">
  <canvas bind:this={haze}></canvas><canvas bind:this={dust}></canvas><div class="vignette"></div>
</div>
<style>
  .backdrop, canvas, .vignette { position:fixed; inset:0; width:100%; height:100%; pointer-events:none; }
  .backdrop { z-index:0; } canvas { display:block; }
  .vignette { background:radial-gradient(ellipse 80% 75% at 50% 45%, transparent 55%, color-mix(in srgb, var(--code) 40%, transparent) 100%); }
</style>
