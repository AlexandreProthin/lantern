<script lang="ts">
  import type { Settings } from '../../frame/settings';
  import { strings } from '../../ui/strings';
  let { settings, changed }: { settings: Settings; changed: () => void } = $props();
</script>
<label>{strings.tone}<select value={typeof settings.learn.defaultTone === 'string' ? settings.learn.defaultTone : 'custom'} onchange={e => { settings.learn.defaultTone = e.currentTarget.value === 'custom' ? { custom: '' } : e.currentTarget.value as typeof settings.learn.defaultTone; changed(); }}>{#each ['eli5','curious','student','engineer','expert','custom'] as tone}<option value={tone}>{tone}</option>{/each}</select></label>
{#if typeof settings.learn.defaultTone === 'object'}<textarea maxlength="300" aria-label={strings.customTone} bind:value={settings.learn.defaultTone.custom} onblur={changed}></textarea>{/if}
<p>{strings.newSubjectsHint}</p>
<details><summary>{strings.advanced}</summary><label>{strings.contextBudget}<input type="number" min="2000" max="100000" step="1" bind:value={settings.learn.contextBudget} onchange={changed} /></label><p>{strings.contextBudgetHint}</p></details>
