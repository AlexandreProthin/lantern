<script lang="ts">
  import { tick } from 'svelte';
  import { MODELS, isListedModel, isValidModel } from '../core/models';
  import { strings } from './strings';
  import { endpointGroups } from './model-choices.svelte';
  /** SE-48: one picker for Settings, Welcome and the subject menu. `live` commits every keystroke (the caller validates). */
  let { id, value, commit, label, live = false, defaultModel, title }:
    { id: string; value: string; commit: (model: string) => void; label: string; live?: boolean; defaultModel?: string; title?: string } = $props();
  let other = $state(false), draft = $state(''), input = $state<HTMLInputElement>();
  // CE-22: each endpoint's pinned models after Claude Code's list; with no endpoint the picker is as it was.
  const groups = $derived(endpointGroups());
  const listed = (id: string) => isListedModel(id) || groups.some(g => g.models.some(m => m.id === id));
  const invalid = $derived(other && draft.trim() !== '' && !isValidModel(draft.trim()));
  // Only an outside change of `value` resyncs; reading `other` here would undo choosing "Other".
  $effect.pre(() => { const current = value, unlisted = !listed(current); other = unlisted; if (unlisted) draft = current; });
  async function choose(next: string) {
    if (next !== 'other') { other = false; commit(next); return; }
    other = true; draft = ''; if (live) commit('');
    await tick(); input?.focus();
  }
  // The field's removal fires blur after a list choice; it must not re-apply the old draft.
  function apply() { const next = draft.trim(); if (other && isValidModel(next) && next !== value) commit(next); }
</script>
<select {id} {title} value={other ? 'other' : value} onchange={e => choose(e.currentTarget.value)}>
  {#if groups.length}
    <optgroup label={strings.claudeCode}>{#each MODELS as model}<option value={model.id}>{model.label}{defaultModel === model.id ? ` (${strings.defaultLabel})` : ''}</option>{/each}</optgroup>
    {#each groups as group (group.id)}<optgroup label={group.name}>{#each group.models as model}<option value={model.id}>{model.label} · {strings.notEvaluated}{defaultModel === model.id ? ` (${strings.defaultLabel})` : ''}</option>{/each}</optgroup>{/each}
  {:else}
  {#each MODELS as model}<option value={model.id}>{model.label}{defaultModel === model.id ? ` (${strings.defaultLabel})` : ''}</option>{/each}
  {/if}
  <option value="other">{strings.otherModel}</option>
</select>
{#if other}<input class="custom-model" bind:this={input} aria-label={label} bind:value={draft} maxlength="100" spellcheck="false" placeholder="claude-…"
  oninput={() => { if (live) commit(draft.trim()); }} onblur={() => { if (!live) apply(); }}
  onkeydown={e => { if (e.key === 'Enter' && !live) { e.preventDefault(); apply(); } }} />
  {#if invalid}<p class="invalid-model" role="alert">{strings.invalidModel}</p>{/if}{/if}
<style>
  .custom-model { width:min(400px,100%); }
  .invalid-model { margin:0; font-size:12px; color:var(--focus); }
</style>
