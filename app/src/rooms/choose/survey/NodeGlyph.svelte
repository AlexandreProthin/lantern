<script lang="ts">
  // CR-20, CR-21, choose-nodes recipe r003-02 "Fill and turn": the contents of the 44 px disc. The pictogram names the
  // kind, the ring gives the look, a 20 px badge on the rim the exact state, the chosen product a second ring and glow.
  // Motion on state changes only; instant under reduced motion (GV-100) and in a hidden window.
  import { untrack } from 'svelte';
  import Pictogram from './Pictogram.svelte';
  import BadgeGlyph from './BadgeGlyph.svelte';
  import { BADGE_OF, LOOK, RANK, hasGlow } from './kinds';
  import type { Look } from './kinds';
  /** `shown` is the exact state shown: the node's, or the subject's status. */
  let { kind, shown, pending = false, reduced }: { kind: string; shown: string; pending?: boolean; reduced: () => boolean } = $props();
  interface Layer { id: number; look: Look; role: 'base' | 'enter' | 'exit' }
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)', EASE_IN = 'cubic-bezier(.5,0,.8,.4)';
  let seq = 0;
  const look = $derived(LOOK[shown] ?? 'open'), rank = $derived(RANK[shown] ?? 1), badge = $derived(BADGE_OF[shown]);
  let layers = $state<Layer[]>([{ id: seq++, look: untrack(() => look), role: 'base' }]);
  let badgeMode = $state<'' | 'out' | 'turn'>('');
  let previous = untrack(() => ({ shown, look, rank, badge }));
  // Before the DOM updates, so the new layer and the new badge mount with their motion.
  $effect.pre(() => {
    const next = { shown, look, rank, badge };
    untrack(() => {
      if (next.shown === previous.shown) return;
      const old = previous; previous = next;
      const moving = !reduced() && !document.hidden;
      if (next.look !== old.look) {
        layers = !moving ? [{ id: seq++, look: next.look, role: 'base' }]
          : next.rank > old.rank ? [{ id: seq++, look: old.look, role: 'base' }, { id: seq++, look: next.look, role: 'enter' }]
          : [{ id: seq++, look: next.look, role: 'base' }, { id: seq++, look: old.look, role: 'exit' }];
      }
      badgeMode = moving && next.badge !== old.badge ? (next.rank !== old.rank ? 'out' : 'turn') : '';
    });
  });
  function settle(id: number) {
    const entering = layers.find(l => l.id === id && l.role === 'enter');
    layers = entering ? [{ id, look: entering.look, role: 'base' }] : layers.filter(l => l.role !== 'exit');
  }
  function layerFx(el: HTMLElement, p: { role: string; done: () => void }) {
    if (p.role === 'base') return;
    const entering = p.role === 'enter', duration = entering ? 360 : 300;
    const from = 'circle(0% at 50% 50%)', to = 'circle(110% at 50% 50%)';
    const a = el.animate({ clipPath: entering ? [from, to] : [to, from] }, { duration, easing: entering ? EASE_OUT : EASE_IN, fill: 'forwards' });
    let over = false; const finish = () => { if (over) return; over = true; a.cancel(); p.done(); };
    a.onfinish = finish; const timer = setTimeout(finish, duration + 150);
    return { destroy() { clearTimeout(timer); a.cancel(); } };
  }
  function badgeFx(el: HTMLElement, mode: string) {
    if (mode === 'out') el.animate([{ transform: 'translate(-19px, 19px) scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, delay: 200, easing: EASE_OUT, fill: 'backwards' });
    else if (mode === 'turn') el.animate([{ transform: 'perspective(60px) rotateY(90deg)' }, { transform: 'none' }], { duration: 220, easing: EASE_OUT });
  }
</script>
{#if !pending}
  <span class="glow" data-on={hasGlow(shown)} data-chosen={shown === 'chosen'}></span>
  {#each layers as l (l.id)}
    <span class="layer" data-look={l.look} data-role={l.role} use:layerFx={{ role: l.role, done: () => settle(l.id) }}><Pictogram {kind} /></span>
  {/each}
  <span class="ring2" data-on={shown === 'chosen'}></span>
  {#if badge}{#key badge}<span class="badge" data-badge={badge} data-look={LOOK[shown]} use:badgeFx={badgeMode}><BadgeGlyph {badge} /></span>{/key}{/if}
{/if}
<style>
  /* Tokens are the room's (CR-70); colours by look follow the recipe's table. */
  .layer { position:absolute; inset:-1px; border-radius:50%; border:1px solid var(--node-open); background:var(--bg); color:var(--node-open); display:grid; place-items:center; box-sizing:border-box; }
  .layer[data-look='open'] { border-style:dotted; }
  .layer[data-look='lit'] { background:var(--surface-2); border-color:var(--node-lit); color:var(--node-lit); }
  .layer[data-look='settled'] { background:var(--node-understood); border-color:var(--node-understood); color:var(--accent-ink); }
  .layer[data-look='quiet'] { border-color:var(--line); color:var(--ink-mute); }
  .layer[data-look='faded'] { border-style:dashed; }
  :global(.node.busy) .layer { border-style:dashed; }
  .glow { position:absolute; inset:-1px; border-radius:50%; box-shadow:0 0 14px 2px var(--glow-near), 0 0 38px 9px var(--glow-far); opacity:0; transition:none; }
  .glow[data-on='true'] { opacity:1; transition:opacity 480ms cubic-bezier(.2,.7,.2,1) 120ms; }
  .glow[data-on='true'][data-chosen='true'] { transition-delay:300ms; }
  .ring2 { position:absolute; inset:-7px; border:1px solid var(--focus); border-radius:50%; opacity:0; transform:scale(.8); transition:none; pointer-events:none; }
  .ring2[data-on='true'] { opacity:1; transform:none; transition:opacity 320ms cubic-bezier(.2,.7,.2,1) 300ms, transform 320ms cubic-bezier(.2,.7,.2,1) 300ms; }
  .badge { position:absolute; right:-7px; top:-7px; width:20px; height:20px; border-radius:50%; border:1px solid var(--node-lit); background:var(--bg); color:var(--node-lit); display:grid; place-items:center; box-sizing:border-box; }
  .badge[data-look='settled'] { border-color:var(--node-understood); color:var(--node-understood); }
  .badge[data-look='quiet'] { border-color:var(--line); color:var(--ink-mute); }
  .badge[data-look='faded'] { border-color:var(--node-open); color:var(--node-open); }
  .badge[data-badge='decided'], .badge[data-badge='bought'] { border-color:var(--node-lit); color:var(--node-lit); }
  .badge[data-badge='bought'] { background:var(--surface-2); }
  :global(.graph[data-reduced='true']) .glow, :global(.graph[data-reduced='true']) .ring2 { transition:none !important; }
  @media (prefers-reduced-motion: reduce) { .glow, .ring2 { transition:none !important; } }
</style>
