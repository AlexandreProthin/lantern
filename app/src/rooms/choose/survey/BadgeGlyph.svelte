<script lang="ts">
  // CR-21: the 10 px glyph of the rim badge (choose-nodes recipe), stroke 1.5.
  let { badge }: { badge: string } = $props();
</script>
<svg viewBox="0 0 10 10" aria-hidden="true">
  {#if badge === 'answered' || badge === 'decided'}<path d="M2 5.3 4.2 7.5 8.2 2.8" />
  {:else if badge === 'must'}<path d="M5 1.6v4.2" /><circle class="f" cx="5" cy="8.3" r="1" />
  {:else if badge === 'nice'}<path d="M5 2v6M2 5h6" />
  {:else if badge === 'irrelevant'}<path d="M2 5h6" />
  {:else if badge === 'shortlisted'}<path class="f" d="M2.8 1.5h4.4v7L5 6.8 2.8 8.5z" />
  {:else if badge === 'chosen'}<path class="f" d="M5 .9 6.2 3.6l2.9.3-2.2 1.9.7 2.9L5 7.2 2.4 8.7l.7-2.9L.9 3.9l2.9-.3z" />
  {:else if badge === 'rejected'}<path d="M2.3 2.3l5.4 5.4M7.7 2.3 2.3 7.7" />
  {:else if badge === 'exploring'}<circle class="f" cx="2" cy="5" r=".9" /><circle class="f" cx="5" cy="5" r=".9" /><circle class="f" cx="8" cy="5" r=".9" />
  {:else if badge === 'bought'}<path d="M2.2 3.8h5.6l-.6 4.9H2.8zM3.6 3.8V3a1.4 1.4 0 0 1 2.8 0v.8" />{/if}
</svg>
<style>
  svg { width:10px; height:10px; fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; display:block; }
  svg .f { fill:currentColor; stroke:none; }
</style>
