<script lang="ts">
  // CR-20: the pictogram inside the disc names the kind (choose-nodes recipe, glyphs of r001-01), 18 px, stroke 1.4.
  let { kind }: { kind: string } = $props();
</script>
<svg class="k" viewBox="0 0 18 18" aria-hidden="true">
  {#if kind === 'subject'}<circle cx="9" cy="9" r="6.5" /><circle cx="9" cy="9" r="2.3" />
  {:else if kind === 'concept'}<circle class="f" cx="9" cy="4.2" r="1.2" /><path d="M7.3 7.6H9v6.6M7 14.2h4" />
  {:else if kind === 'need'}<path d="M6.3 6.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6" /><circle class="f" cx="9" cy="14" r="1" />
  {:else if kind === 'criterion'}<path d="M9 3v11.5M5.5 14.5h7M3.5 5.5h11M3.5 5.5 1.8 10h3.4zM14.5 5.5 12.8 10h3.4z" />
  {:else if kind === 'family'}<circle cx="5.8" cy="6.5" r="2.6" /><circle cx="12.2" cy="6.5" r="2.6" /><circle cx="9" cy="12.2" r="2.6" />
  {:else if kind === 'product'}<path d="M9 2.5 15 5.5v7l-6 3-6-3v-7zM3 5.5l6 3 6-3M9 8.5v7" />
  {:else}<path d="M3 15l.9-3.8L11.6 3.5l2.9 2.9-7.7 7.7zM10.2 5l2.8 2.8" />{/if}
</svg>
<style>
  .k { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.4; stroke-linecap:round; stroke-linejoin:round; display:block; }
  .k .f { fill:currentColor; stroke:none; }
</style>
