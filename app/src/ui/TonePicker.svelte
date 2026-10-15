<script lang="ts">
  // The tone choice as a row of radio pills (WG-9, SE-*); `custom` turns the tone into `{ custom }`, whose text the caller edits.
  import type { Tone } from '../core/model';
  import { strings } from './strings';
  let { tone = $bindable(), name }: { tone: Tone; name: string } = $props();
</script>
<fieldset class="tones"><legend class="sr-only">{strings.tone}</legend>
  {#each Object.entries(strings.tones) as [value,label]}<label><input type="radio" {name} value={value} checked={(typeof tone==='string'?tone:'custom')===value}
    onchange={()=>tone=value==='custom'?{custom:''}:value as Tone} />{label}</label>{/each}
</fieldset>
<style>
  .tones{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:0}.tones label{position:relative;padding:5px 10px;font-size:12px;color:var(--ink-mute);border-radius:999px;cursor:pointer}.tones input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.tones label:has(input:checked){background:var(--surface-2);color:var(--node-lit)}.tones label:has(input:focus-visible){outline:2px solid var(--focus)}
  .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
</style>
