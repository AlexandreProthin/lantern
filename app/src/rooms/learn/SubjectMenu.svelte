<script lang="ts">
  import type { SubjectMenuProps } from '../../frame/room';
  import { checkedDirection, DIRECTION_LIMIT, now } from '../../core/model';
  import type { Tone } from '../../core/model';
  import { strings } from '../../ui/strings';
  import { directionOf, opensChildren, progressSnapshot, resetProgress, restoreProgress, setDirection, setTone, toneOf } from './rules';
  import { trace } from '../../frame/debug/trace.svelte';
  /** RS-15/RS-19: Learn's part of the subject menu (tone and direction); the frame keeps title, model and effort. */
  let { visit, revision, changed, session }: SubjectMenuProps = $props();
  let directionDraft = $state('');
  const tone = $derived.by(() => { revision; return toneOf(visit); });
  const savedDirection = $derived.by(() => { revision; return directionOf(visit); });
  // LR-110..115: start again in the dark, with the progress kept to restore.
  const progress = $derived.by(() => {
    revision;
    const lit = Object.values(visit.nodes).filter(opensChildren);
    return { lit: lit.length, understood: lit.filter(n => n.state === 'understood').length, snapshot: progressSnapshot(visit), running: !!session?.running };
  });
  const savedOn = (at: string) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? at : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); };
  let confirming = $state(false), confirmBox = $state<HTMLElement>();
  function askReplay() { confirming = true; queueMicrotask(() => confirmBox?.querySelector<HTMLButtonElement>('button')?.focus()); }
  function replay() {
    confirming = false;
    if (progress.running || !progress.lit) return;
    const count = resetProgress(visit, now());
    trace.action('learn', 'Replay from the start', { nodes: count });
    changed(false);
  }
  function restore() {
    if (progress.running) return;
    const count = restoreProgress(visit);
    trace.action('learn', 'Restore progress', { nodes: count });
    changed(false);
  }
</script>
<label>{strings.tone}<select value={typeof tone==='string'?tone:'custom'} onchange={e=>{setTone(visit,e.currentTarget.value==='custom'?{custom:''}:e.currentTarget.value as Tone);changed(true);}}>{#each ['eli5','curious','student','engineer','expert','custom'] as option}<option>{option}</option>{/each}</select></label>
{#if typeof tone==='object'}<textarea aria-label={strings.customTone} maxlength="300" value={tone.custom} onblur={e=>{setTone(visit,{custom:e.currentTarget.value});changed(false);}}></textarea>{/if}
<label>{strings.direction}<textarea class="direction" rows="3" placeholder={strings.directionPlaceholder} value={savedDirection}
  oninput={e=>directionDraft=e.currentTarget.value} onfocus={e=>directionDraft=e.currentTarget.value}
  onblur={e=>{const value=e.currentTarget.value;if([...value].length>DIRECTION_LIMIT)return;const next=checkedDirection(value);if(next===savedDirection)return;setDirection(visit,next);changed(true);}}></textarea></label>
{#if [...directionDraft].length>=400}<small class="direction-count" class:over={[...directionDraft].length>DIRECTION_LIMIT} role="status">{[...directionDraft].length} / {DIRECTION_LIMIT}{[...directionDraft].length>DIRECTION_LIMIT?' · '+strings.directionOver([...directionDraft].length-DIRECTION_LIMIT,DIRECTION_LIMIT):''}</small>{/if}
<div class="progress">
  <button disabled={progress.running || !progress.lit} title={progress.running ? strings.replayBusy : !progress.lit ? strings.nothingLit : undefined} onclick={askReplay}>{strings.replayFromStart}</button>
  {#if progress.snapshot}<button disabled={progress.running} title={strings.restoreProgressHint(savedOn(progress.snapshot.at))} onclick={restore}>{strings.restoreProgress}</button>{/if}
</div>
{#if confirming}
  <div class="confirm" role="alertdialog" tabindex="-1" aria-modal="false" aria-labelledby="replay-title" bind:this={confirmBox}
    onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); confirming = false; } }}>
    <strong id="replay-title">{strings.replayConfirmTitle}</strong>
    <p>{strings.replayConfirmBody(progress.lit, progress.understood)}</p>
    {#if progress.snapshot}<p>{strings.replayReplaces(savedOn(progress.snapshot.at))}</p>{/if}
    <div><button onclick={() => confirming = false}>{strings.cancel}</button><button class="primary" disabled={progress.running} onclick={replay}>{strings.replayGo}</button></div>
  </div>
{/if}
<style>
  label { display:grid; gap:5px; }
  .progress { display:flex; flex-wrap:wrap; gap:6px; }
  .confirm { display:grid; gap:8px; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface-2); max-width:min(360px,70vw); }
  .confirm p { margin:0; color:var(--ink-mute); font-size:12px; } .confirm div { display:flex; gap:6px; justify-content:flex-end; }.direction { width:min(360px,70vw); resize:vertical; }.direction-count { color:var(--ink-mute); font-size:12px; }.direction-count.over { color:var(--error-ink); }
</style>
