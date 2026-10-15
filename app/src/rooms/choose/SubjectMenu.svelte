<script lang="ts">
  // RS-15/RS-19: Choose's part of the subject menu: tone, the needs note (CR-13) and the locale (CR-90, future calls only).
  import type { SubjectMenuProps } from '../../frame/room';
  import { checkedDirection, DIRECTION_LIMIT } from '../../core/model';
  import type { Tone } from '../../core/model';
  import { strings } from '../../ui/strings';
  import { chooseData, setLocale, setNeedsNote, setTone, toneOf } from './rules';
  import { countryOptions, currencyOptions } from './library/countries';
  import { currencyOf } from './settings';
  import { text } from './library/strings';
  let { visit, revision, changed }: SubjectMenuProps = $props();
  let draft = $state('');
  const tone = $derived.by(() => { revision; return toneOf(visit); });
  const note = $derived.by(() => { revision; return chooseData(visit).needsNote ?? ''; });
  const locale = $derived.by(() => { revision; return chooseData(visit).locale; });
  const countries = $derived(countryOptions(locale.country)), currencies = $derived(currencyOptions(locale.currency));
  const length = $derived([...draft].length);
  function country(code: string) {
    const follows = locale.currency === currencyOf(locale.country);
    setLocale(visit, { country: code, currency: follows ? currencyOf(code) : locale.currency }); changed(true);
  }
</script>
<label>{strings.tone}<select value={typeof tone === 'string' ? tone : 'custom'} onchange={e => { setTone(visit, e.currentTarget.value === 'custom' ? { custom: '' } : e.currentTarget.value as Tone); changed(true); }}>{#each ['eli5', 'curious', 'student', 'engineer', 'expert', 'custom'] as option}<option>{option}</option>{/each}</select></label>
{#if typeof tone === 'object'}<textarea aria-label={strings.customTone} maxlength="300" value={tone.custom} onblur={e => { setTone(visit, { custom: e.currentTarget.value }); changed(false); }}></textarea>{/if}
<label>{text.needsNoteLabel}<textarea class="note" rows="3" placeholder={text.needsPlaceholder} value={note}
  oninput={e => draft = e.currentTarget.value} onfocus={e => draft = e.currentTarget.value}
  onblur={e => { const value = e.currentTarget.value; if ([...value].length > DIRECTION_LIMIT) return; const next = checkedDirection(value); if (next === note) return; setNeedsNote(visit, next); changed(true); }}></textarea></label>
{#if length >= 400}<small class="count" class:over={length > DIRECTION_LIMIT} role="status">{length} / {DIRECTION_LIMIT}{length > DIRECTION_LIMIT ? ' · ' + text.needsOver(length - DIRECTION_LIMIT, DIRECTION_LIMIT) : ''}</small>{/if}
<small>{text.needsNoteHint}</small>
<label>{text.country}<select value={locale.country} onchange={e => country(e.currentTarget.value)}>{#each countries as c}<option value={c.code}>{c.name}</option>{/each}</select></label>
<label>{text.currency}<select value={locale.currency} onchange={e => { setLocale(visit, { ...locale, currency: e.currentTarget.value }); changed(true); }}>{#each currencies as c}<option value={c}>{c}</option>{/each}</select></label>
<small>{text.localeHint}</small>
<style>
  label { display:grid; gap:5px; }.note { width:min(360px,70vw); resize:vertical; }.count { color:var(--ink-mute); font-size:12px; }.count.over { color:var(--error-ink); }small { color:var(--ink-mute); font-size:12px; }
</style>
