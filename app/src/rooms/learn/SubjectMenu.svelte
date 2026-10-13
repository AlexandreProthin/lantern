<script lang="ts">
  import type { SubjectMenuProps } from '../../frame/room';
  import { checkedDirection, DIRECTION_LIMIT } from '../../core/model';
  import type { Tone } from '../../core/model';
  import { strings } from '../../ui/strings';
  import { directionOf, setDirection, setTone, toneOf } from './rules';
  /** RS-15/RS-19: Learn's part of the subject menu (tone and direction); the frame keeps title, model and effort. */
  let { visit, revision, changed }: SubjectMenuProps = $props();
  let directionDraft = $state('');
  const tone = $derived.by(() => { revision; return toneOf(visit); });
  const savedDirection = $derived.by(() => { revision; return directionOf(visit); });
</script>
<label>{strings.tone}<select value={typeof tone==='string'?tone:'custom'} onchange={e=>{setTone(visit,e.currentTarget.value==='custom'?{custom:''}:e.currentTarget.value as Tone);changed(true);}}>{#each ['eli5','curious','student','engineer','expert','custom'] as option}<option>{option}</option>{/each}</select></label>
{#if typeof tone==='object'}<textarea aria-label={strings.customTone} maxlength="300" value={tone.custom} onblur={e=>{setTone(visit,{custom:e.currentTarget.value});changed(false);}}></textarea>{/if}
<label>{strings.direction}<textarea class="direction" rows="3" placeholder={strings.directionPlaceholder} value={savedDirection}
  oninput={e=>directionDraft=e.currentTarget.value} onfocus={e=>directionDraft=e.currentTarget.value}
  onblur={e=>{const value=e.currentTarget.value;if([...value].length>DIRECTION_LIMIT)return;const next=checkedDirection(value);if(next===savedDirection)return;setDirection(visit,next);changed(true);}}></textarea></label>
{#if [...directionDraft].length>=400}<small class="direction-count" class:over={[...directionDraft].length>DIRECTION_LIMIT} role="status">{[...directionDraft].length} / {DIRECTION_LIMIT}{[...directionDraft].length>DIRECTION_LIMIT?' · '+strings.directionOver([...directionDraft].length-DIRECTION_LIMIT,DIRECTION_LIMIT):''}</small>{/if}
<style>
  label { display:grid; gap:5px; }.direction { width:min(360px,70vw); resize:vertical; }.direction-count { color:var(--ink-mute); font-size:12px; }.direction-count.over { color:var(--error-ink); }
</style>
