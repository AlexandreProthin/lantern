<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { Settings } from './settings';
  import { type EndpointConfig, type EndpointModel, type Preset, PRESETS, PRESET_CAPS, endpointsOf, initialContextSize, mergeModels, needsLanConfirmation, newEndpoint, wireEndpoint } from './endpoints';
  import { type FakeEndpointOptions, fakeEndpointAdmin } from './fake-endpoint';
  import { type Completion, type InferenceProvider, ProviderError } from './provider';
  import { strings } from '../ui/strings';
  import { errorMessage } from '../ui/error-message';
  /** CE-20 to CE-24, CE-30, CE-52, CE-80: the Endpoints list under Claude Code's section. Nothing calls a server until a button is pressed (IP-41). */
  let { settings, changed, provider, health = {}, fakeOptions = {}, disabled = false }: {
    settings: Settings; changed: () => void; provider: InferenceProvider; health?: Record<string, Completion | ProviderError>; fakeOptions?: FakeEndpointOptions; disabled?: boolean
  } = $props();
  const desktop = '__TAURI_INTERNALS__' in window;
  const list = $derived(endpointsOf(settings.provider));
  let addPreset = $state<Preset>('ollama'), removing = $state(''), busy = $state(''), chosen = $state<Record<string, string>>({});
  let notes = $state<Record<string, { status: string; details: string }>>({});
  function save(next: EndpointConfig[]) { settings.provider.endpoints = next; changed(); }
  const update = (id: string, change: (e: EndpointConfig) => EndpointConfig) => save(list.map(e => e.id === id ? change(e) : e));
  const setModel = (id: string, model: string, change: Partial<EndpointModel>) => update(id, e => ({ ...e, models: e.models.map(m => m.id === model ? { ...m, ...change } : m) }));
  const note = (id: string, status: string, details = '') => { notes = { ...notes, [id]: { status, details } }; };
  // The endpoint's id tags the error, so a listing or info failure is worded for that server, not for Claude Code.
  const failed = (id: string, e: unknown) => { const kind = (e as ProviderError)?.kind; const err = e as ProviderError;
    note(id, kind && kind in strings.errorKinds ? errorMessage({ kind, details: err.details, model: err.model?.includes(':') ? err.model : `${id}:${err.model ?? ''}` }) : String(e), (e as ProviderError)?.details ?? ''); };
  function add() { const e = newEndpoint(addPreset, list, strings.presetNames[addPreset]); save([...list, e]); }
  async function admin<T>(command: string, args: Record<string, unknown>, fake: () => Promise<T>): Promise<T> {
    if (!desktop) return fake();
    try { return await invoke<T>(command, args); } catch (e) { const err = e as { kind?: ProviderError['kind']; details?: string }; throw new ProviderError(err.kind ?? 'protocol', err.details ?? String(e)); }
  }
  async function fetchModels(e: EndpointConfig) {
    busy = e.id; note(e.id, strings.fetchingModels);
    try {
      const fetched = await admin<string[]>('endpoint_models', { endpoint: wireEndpoint(e, '') }, () => fakeEndpointAdmin.models(fakeOptions));
      let models = mergeModels(e.models, fetched, e.preset);
      // CE-30: each pinned model's context size, from the server where it says.
      for (const m of models.filter(m => m.pinned && !m.contextSize)) {
        try { const info = await admin<{ contextSize?: number }>('endpoint_model_info', { endpoint: wireEndpoint(e, m.id), model: m.id }, () => fakeEndpointAdmin.info());
          if (info.contextSize) { const contextSize = initialContextSize(e.preset, info.contextSize); models = models.map(x => x.id === m.id ? { ...x, contextSize } : x); } } catch { /* The size stays editable. */ }
      }
      update(e.id, x => ({ ...x, models })); note(e.id, strings.modelsFetched(fetched.length));
    } catch (err) { failed(e.id, err); } finally { busy = ''; }
  }
  /** CE-24: one tiny call on one chosen model, through the normal provider path. */
  async function test(e: EndpointConfig) {
    const model = chosen[e.id] ?? e.models.find(m => m.pinned)?.id; if (!model) return;
    busy = e.id; note(e.id, strings.testing);
    try { const r = await provider.stream({ requestId: crypto.randomUUID(), system: 'Be terse.', prompt: 'Say only: ready.', model: `${e.id}:${model}`, effort: 'low', cancel: new AbortController().signal }, () => {});
      note(e.id, served(strings.endpointReady(`${e.name} · ${model}`, Math.round(r.durationMs / 1000)), r));
    } catch (err) { failed(e.id, err); } finally { busy = ''; }
  }
  function size(e: EndpointConfig, model: string, value: string) {
    const n = Number(value); setModel(e.id, model, Number.isInteger(n) && n >= 512 && n <= 1_048_576 ? { contextSize: n } : { contextSize: undefined });
  }
  /** CE-27: *Test* and the row warn when the server answered with another model name. */
  const served = (status: string, r: Completion) => r.servedModel ? `${status} · ${strings.servedAs(r.servedModel)}` : status;
  const shown = (e: EndpointConfig) => notes[e.id] ?? (health[e.id] ? health[e.id] instanceof ProviderError
    ? { status: errorMessage(health[e.id] as ProviderError), details: (health[e.id] as ProviderError).details }
    : { status: served(strings.endpointReady(`${e.name} · ${(health[e.id] as Completion).model.slice(e.id.length + 1)}`, Math.round((health[e.id] as Completion).durationMs / 1000)), health[e.id] as Completion), details: '' } : null);
</script>
<h3>{strings.endpoints}</h3>
<p>{strings.endpointsHint}</p>
{#each list as e (e.id)}
  {@const n = shown(e)}
  <div class="endpoint" data-testid="endpoint" data-endpoint={e.id}>
    <div class="row">
      <label class="grow">{strings.endpointName}<input value={e.name} maxlength="40" {disabled} onchange={ev => { const v = ev.currentTarget.value.trim(); if (v) update(e.id, x => ({ ...x, name: v })); }} /></label>
      <span class="preset">{strings.presetNames[e.preset]}</span>
      {#if removing === e.id}<button {disabled} onclick={() => { save(list.filter(x => x.id !== e.id)); removing = ''; }}>{strings.confirmRemoveEndpoint}</button><button onclick={() => removing = ''}>{strings.cancel}</button>
      {:else}<button {disabled} onclick={() => removing = e.id}>{strings.removeEndpoint}</button>{/if}
    </div>
    <label>{strings.serverUrl}<input value={e.baseUrl} spellcheck="false" placeholder="http://localhost:8000/v1" {disabled} onchange={ev => { const v = ev.currentTarget.value.trim(); update(e.id, x => ({ ...x, baseUrl: v, lanConfirmed: false })); }} /></label>
    {#if needsLanConfirmation(e.baseUrl)}
      <label class="check"><input type="checkbox" checked={e.lanConfirmed} {disabled} onchange={ev => update(e.id, x => ({ ...x, lanConfirmed: ev.currentTarget.checked }))} />{strings.lanConfirm}</label><p>{strings.lanHint}</p>
    {/if}
    <div class="actions"><button disabled={disabled || !!busy || !e.baseUrl} onclick={() => fetchModels(e)}>{strings.fetchModels}</button></div>
    {#if e.models.length}
      <table><thead><tr><th>{strings.pinned}</th><th>{strings.model}</th><th>{strings.contextSize}</th><th>{strings.thinking}</th></tr></thead><tbody>
        {#each e.models as m (m.id)}<tr>
          <td><input type="checkbox" aria-label={`${strings.pinned} ${m.id}`} checked={m.pinned} {disabled} onchange={ev => setModel(e.id, m.id, { pinned: ev.currentTarget.checked })} /></td>
          <td><code>{m.id}</code></td>
          <td><input type="number" min="512" step="1024" aria-label={`${strings.contextSize} ${m.id}`} value={m.contextSize ?? ''} {disabled} onchange={ev => size(e, m.id, ev.currentTarget.value)} /></td>
          <td><select aria-label={`${strings.thinking} ${m.id}`} value={m.thinking} {disabled} onchange={ev => setModel(e.id, m.id, { thinking: ev.currentTarget.value as EndpointModel['thinking'] })}>{#each PRESET_CAPS[e.preset].thinking as t}<option value={t}>{strings.thinkingNames[t]}</option>{/each}</select></td>
        </tr>{/each}
      </tbody></table>
      <p>{strings.contextHint} {PRESET_CAPS[e.preset].thinking.length > 1 ? strings.thinkingHint : strings.thinkingFixed(e.name)}</p>
      {#if e.models.some(m => m.pinned)}
        <div class="actions"><label class="inline">{strings.testModel}<select value={chosen[e.id] ?? e.models.find(m => m.pinned)?.id} onchange={ev => chosen = { ...chosen, [e.id]: ev.currentTarget.value }}>{#each e.models.filter(m => m.pinned) as m}<option>{m.id}</option>{/each}</select></label>
          <button disabled={disabled || !!busy} onclick={() => test(e)}>{strings.testProvider}</button></div>
      {/if}
    {:else}<p>{strings.noModels}</p>{/if}
    {#if n}<p role="status" data-testid="endpoint-status">{n.status}</p>{#if n.details}<details><summary>{strings.details}</summary><pre>{n.details}</pre></details>{/if}{/if}
  </div>
{/each}
<div class="actions"><select aria-label={strings.addEndpoint} bind:value={addPreset} {disabled}>{#each PRESETS as p}<option value={p}>{strings.presetNames[p]}</option>{/each}</select><button {disabled} onclick={add}>{strings.addEndpoint}</button></div>
<style>
  h3 { font-size: 15px; margin-top: 8px; } .endpoint { display: grid; gap: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: end; } .grow { flex: 1; } .preset { color: var(--ink-mute); font-size: 13px; padding-bottom: 6px; }
  label { display: grid; gap: 6px; } .check { display: flex; gap: 8px; align-items: center; } .inline { display: flex; gap: 8px; align-items: center; }
  table { border-collapse: collapse; font-size: 13px; } th { text-align: left; color: var(--ink-mute); font-weight: normal; padding: 2px 8px 2px 0; } td { padding: 2px 8px 2px 0; }
  td input[type='number'] { width: 9ch; } p { color: var(--ink-mute); font-size: 13px; margin: 0; } pre { white-space: pre-wrap; } .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
</style>
