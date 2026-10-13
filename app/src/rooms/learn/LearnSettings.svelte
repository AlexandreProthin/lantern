<script lang="ts">
  import type { Settings } from '../../frame/settings';
  import { strings } from '../../ui/strings';
  import { learnSettings } from './settings';
  let { settings, changed }: { settings: Settings; changed: () => void } = $props();
  const learn = $derived(learnSettings(settings));
  let invalid=$state(false);
  function budget(e:Event) {
    const value=Number((e.currentTarget as HTMLInputElement).value);
    invalid=!Number.isInteger(value)||value<2000||value>100000;
    if(!invalid){learn.contextBudget=value;changed();}
  }
</script>
<label>{strings.tone}<select value={typeof learn.defaultTone === 'string' ? learn.defaultTone : 'custom'} onchange={e => { learn.defaultTone = e.currentTarget.value === 'custom' ? { custom: '' } : e.currentTarget.value as typeof learn.defaultTone; changed(); }}>{#each ['eli5','curious','student','engineer','expert','custom'] as tone}<option value={tone}>{tone}</option>{/each}</select></label>
{#if typeof learn.defaultTone === 'object'}<textarea maxlength="300" aria-label={strings.customTone} bind:value={learn.defaultTone.custom} onblur={changed}></textarea>{/if}
<p>{strings.newSubjectsHint}</p>
<details><summary>{strings.advanced}</summary><label>{strings.contextBudget}<input type="number" min="2000" max="100000" step="1" value={learn.contextBudget} onblur={budget} onkeydown={e=>{if(e.key==='Enter')budget(e);}} /></label>{#if invalid}<p role="alert">{strings.invalidBudget}</p>{/if}<p>{strings.contextBudgetHint}</p></details>
