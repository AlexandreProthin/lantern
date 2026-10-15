<script lang="ts">
  // CR-90: Settings → Choose room: country, currency (the country's by default), default tone, Use the web.
  import type { Settings } from '../../frame/settings';
  import type { Tone } from '../../core/model';
  import { strings } from '../../ui/strings';
  import { chooseSettings, currencyOf } from './settings';
  import { countryOptions, currencyOptions } from './library/countries';
  import { text } from './library/strings';
  let { settings, changed }: { settings: Settings; changed: () => void } = $props();
  const choose = $derived(chooseSettings(settings));
  const countries = $derived(countryOptions(choose.country)), currencies = $derived(currencyOptions(choose.currency));
  // The currency follows the country while it is still the previous country's own; a currency picked by hand stays.
  function country(code: string) {
    const follows = choose.currency === currencyOf(choose.country);
    choose.country = code; if (follows) choose.currency = currencyOf(code); changed();
  }
  const tones = ['eli5', 'curious', 'student', 'engineer', 'expert', 'custom'];
</script>
<label>{text.country}<select value={choose.country} onchange={e => country(e.currentTarget.value)}>{#each countries as c}<option value={c.code}>{c.name}</option>{/each}</select></label>
<label>{text.currency}<select value={choose.currency} onchange={e => { choose.currency = e.currentTarget.value; changed(); }}>{#each currencies as c}<option value={c}>{c}</option>{/each}</select></label>
<p>{text.settingsHint}</p>
<label>{text.defaultTone}<select value={typeof choose.defaultTone === 'string' ? choose.defaultTone : 'custom'} onchange={e => { choose.defaultTone = e.currentTarget.value === 'custom' ? { custom: '' } : e.currentTarget.value as Tone; changed(); }}>{#each tones as tone}<option value={tone}>{tone}</option>{/each}</select></label>
{#if typeof choose.defaultTone === 'object'}<textarea maxlength="300" aria-label={strings.customTone} bind:value={choose.defaultTone.custom} onblur={changed}></textarea>{/if}
<p>{text.newSubjectsHint}</p>
<label class="web"><input type="checkbox" checked={choose.useWeb} onchange={e => { choose.useWeb = e.currentTarget.checked; changed(); }} />{text.useWeb}</label>
<p>{text.useWebHint}</p>
<style>.web{display:flex;align-items:center;gap:8px}</style>
