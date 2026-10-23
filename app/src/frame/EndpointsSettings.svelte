<script lang="ts">
  import { invoke } from './ipc';
  import { backend } from './host';
  import type { Settings } from './settings';
  import { type EndpointConfig, type EndpointModel, type Preset, PRESETS, PRESET_CAPS, PRESET_URLS, endpointsOf, initialContextSize, isCloudEndpoint, isHttps, keyHost, mergeModels, needsLanConfirmation, newEndpoint, wireEndpoint } from './endpoints';
  import { type KeyAdmin, type KeyStatus, desktopKeyAdmin, fakeKeys } from './endpoint-keys';
  import { type FakeEndpointOptions, fakeEndpointAdmin } from './fake-endpoint';
  import { type Completion, type ErrorKind, type InferenceProvider, ProviderError } from './provider';
  import { strings } from '../ui/strings';
  import { errorMessage } from '../ui/error-message';
  /** CE-20 to CE-24, CE-30, CE-52, CE-70 to CE-81: the Endpoints list under Claude Code's section. Nothing calls a server until a button is pressed (IP-41). */
  let { settings, changed, provider, health = {}, fakeOptions = {}, disabled = false, keys }: {
    settings: Settings; changed: () => void; provider: InferenceProvider; health?: Record<string, Completion | ProviderError>; fakeOptions?: FakeEndpointOptions; disabled?: boolean; keys?: KeyAdmin
  } = $props();
  // NW-21: key changes stay on the desktop window; a paired device can still read whether a key is set.
  const desktop = backend;
  const keyAdmin = $derived(keys ?? (desktop ? desktopKeyAdmin : fakeKeys));
  const list = $derived(endpointsOf(settings.provider));
  let addPreset = $state<Preset>('ollama'), removing = $state(''), busy = $state(''), chosen = $state<Record<string, string>>({});
  let notes = $state<Record<string, { status: string; details: string; kind?: ErrorKind }>>({});
  /** CE-71: only `{ set, last4, host }` ever reaches the webview; the key is read from its field once, at *Save key*. */
  let keyStatus = $state<Record<string, KeyStatus>>({}), keyAsk = $state<Record<string, 'replace' | 'remove' | 'entry' | undefined>>({}), keyNote = $state<Record<string, string>>({});
  /** CE-81, CE-72: a cloud endpoint to add, or an address change that sends subject text to a new host or drops the key, waits for *Add* / *Use this address*. */
  let pending = $state<{ preset: Preset } | { id: string; url: string; input: HTMLInputElement; consent: boolean; dropsKey: string } | null>(null);
  let filters = $state<Record<string, string>>({});
  const asked = new Set<string>();
  const keyed = (e: EndpointConfig) => PRESET_CAPS[e.preset].key !== 'no';
  $effect(() => { for (const e of list) if (keyed(e) && !asked.has(e.id)) { asked.add(e.id); void refreshKey(e.id); } });
  async function refreshKey(id: string) { try { const s = await keyAdmin.status(id); keyStatus = { ...keyStatus, [id]: s }; } catch { /* Unknown: the field stays offered. */ } }
  function save(next: EndpointConfig[]) { settings.provider.endpoints = next; changed(); }
  const update = (id: string, change: (e: EndpointConfig) => EndpointConfig) => save(list.map(e => e.id === id ? change(e) : e));
  const setModel = (id: string, model: string, change: Partial<EndpointModel>) => update(id, e => ({ ...e, models: e.models.map(m => m.id === model ? { ...m, ...change } : m) }));
  const note = (id: string, status: string, details = '', kind?: ErrorKind) => { notes = { ...notes, [id]: { status, details, kind } }; };
  // The endpoint's id tags the error, so a listing or info failure is worded for that server, not for Claude Code.
  const failed = (id: string, e: unknown) => { const kind = (e as ProviderError)?.kind; const err = e as ProviderError;
    note(id, kind && kind in strings.errorKinds ? errorMessage({ kind, details: err.details, model: err.model?.includes(':') ? err.model : `${id}:${err.model ?? ''}` }) : String(e), (e as ProviderError)?.details ?? '', kind); };
  function add() { if (isCloudEndpoint({ preset: addPreset, baseUrl: PRESET_URLS[addPreset] })) pending = { preset: addPreset }; else addNow(addPreset); }
  function addNow(preset: Preset) { const e = newEndpoint(preset, list, strings.presetNames[preset]); save([...list, e]); pending = null; }
  /** CE-75: removing an endpoint removes its key. */
  function removeEndpoint(e: EndpointConfig) { save(list.filter(x => x.id !== e.id)); removing = '';
    if (keyed(e) || keyStatus[e.id]?.set) void keyAdmin.remove(e.id).catch(() => {}); const { [e.id]: _, ...rest } = keyStatus; keyStatus = rest; asked.delete(e.id); }
  function setUrl(e: EndpointConfig, input: HTMLInputElement) {
    const url = input.value.trim(), k = keyStatus[e.id];
    const consent = isCloudEndpoint({ preset: e.preset, baseUrl: url }) && (!isCloudEndpoint(e) || keyHost(url) !== keyHost(e.baseUrl));
    const dropsKey = k?.set && keyHost(url) !== k.host ? k.host ?? '' : '';
    if (consent || dropsKey) { pending = { id: e.id, url, input, consent, dropsKey }; return; }
    update(e.id, x => ({ ...x, baseUrl: url, lanConfirmed: false }));
  }
  async function applyUrl(p: { id: string; url: string; dropsKey: string }) {
    update(p.id, x => ({ ...x, baseUrl: p.url, lanConfirmed: false })); pending = null;
    // CE-72: a new host removes the key; Rust would refuse to send it there anyway.
    if (p.dropsKey) { try { await keyAdmin.remove(p.id); } catch { /* Rust still refuses the old key for the new host. */ } keyStatus = { ...keyStatus, [p.id]: { set: false } }; }
  }
  function cancelPending() { if (pending && 'input' in pending) { const id = pending.id; pending.input.value = list.find(x => x.id === id)?.baseUrl ?? ''; } pending = null; }
  /** CE-70: the key goes from the field straight to Rust, and the field is cleared at once, before the answer. */
  async function saveKey(e: EndpointConfig, form: HTMLFormElement) {
    const field = form.elements.namedItem('key') as HTMLInputElement, key = field.value; field.value = '';
    if (!key.trim()) return;
    try { const s = await keyAdmin.set(e.id, e.baseUrl, key); keyStatus = { ...keyStatus, [e.id]: s }; keyAsk = { ...keyAsk, [e.id]: undefined }; keyNote = { ...keyNote, [e.id]: '' };
      // A rejection of the old key no longer applies.
      if (shown(e)?.kind === 'key-rejected') note(e.id, strings.keySaved); }
    catch (err) { keyNote = { ...keyNote, [e.id]: String((err as { details?: string })?.details ?? err) }; }
  }
  async function removeKey(e: EndpointConfig) {
    try { await keyAdmin.remove(e.id); keyStatus = { ...keyStatus, [e.id]: { set: false } }; keyAsk = { ...keyAsk, [e.id]: undefined }; keyNote = { ...keyNote, [e.id]: '' }; }
    catch (err) { keyNote = { ...keyNote, [e.id]: String(err) }; }
  }
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
  /** CE-21, cloud slice 3: NVIDIA lists over a hundred models, so a long list gains a filter. */
  const visible = (e: EndpointConfig) => { const f = (filters[e.id] ?? '').trim().toLowerCase(); return f ? e.models.filter(m => m.id.toLowerCase().includes(f)) : e.models; };
  /** CE-27: *Test* and the row warn when the server answered with another model name. */
  const served = (status: string, r: Completion) => r.servedModel ? `${status} · ${strings.servedAs(r.servedModel)}` : status;
  const shown = (e: EndpointConfig) => notes[e.id] ?? (health[e.id] ? health[e.id] instanceof ProviderError
    ? { status: errorMessage(health[e.id] as ProviderError), details: (health[e.id] as ProviderError).details, kind: (health[e.id] as ProviderError).kind }
    : { status: served(strings.endpointReady(`${e.name} · ${(health[e.id] as Completion).model.slice(e.id.length + 1)}`, Math.round((health[e.id] as Completion).durationMs / 1000)), health[e.id] as Completion), details: '', kind: undefined } : null);
</script>
<h3>{strings.endpoints}</h3>
<p>{strings.endpointsHint}</p>
{#each list as e (e.id)}
  {@const n = shown(e)}
  {@const k = keyStatus[e.id]}
  {@const p = pending && 'id' in pending && pending.id === e.id ? pending : null}
  <div class="endpoint" data-testid="endpoint" data-endpoint={e.id}>
    <div class="row">
      <label class="grow">{strings.endpointName}<input value={e.name} maxlength="40" {disabled} onchange={ev => { const v = ev.currentTarget.value.trim(); if (v) update(e.id, x => ({ ...x, name: v })); }} /></label>
      <span class="preset">{strings.presetNames[e.preset]}</span>
      {#if removing === e.id}<button {disabled} onclick={() => removeEndpoint(e)}>{strings.confirmRemoveEndpoint}</button><button onclick={() => removing = ''}>{strings.cancel}</button>
      {:else}<button {disabled} onclick={() => removing = e.id}>{strings.removeEndpoint}</button>{/if}
    </div>
    <label>{strings.serverUrl}<input value={e.baseUrl} spellcheck="false" placeholder="http://localhost:8000/v1" disabled={disabled || !!p} onchange={ev => setUrl(e, ev.currentTarget)} /></label>
    {#if p}
      <div class="confirm" role="alert" data-testid="endpoint-confirm">
        {#if p.consent}<p>{strings.cloudConsent(e.name, keyHost(p.url))}</p>{/if}
        {#if p.dropsKey}<p>{strings.keyDropped(p.dropsKey)}</p>{/if}
        <div class="actions"><button onclick={() => applyUrl(p)}>{strings.useAddress}</button><button onclick={cancelPending}>{strings.cancel}</button></div>
      </div>
    {/if}
    {#if needsLanConfirmation(e.baseUrl)}
      <label class="check"><input type="checkbox" checked={e.lanConfirmed} {disabled} onchange={ev => update(e.id, x => ({ ...x, lanConfirmed: ev.currentTarget.checked }))} />{strings.lanConfirm}</label><p>{strings.lanHint}</p>
    {/if}
    {#if keyed(e)}
      <div class="key" data-testid="endpoint-key">
        {#if k?.set && keyAsk[e.id] !== 'entry'}
          <div class="actions"><span data-testid="key-status">{strings.keySet(k.last4)}</span>
            {#if keyAsk[e.id] === 'remove'}<button {disabled} onclick={() => removeKey(e)}>{strings.confirmRemoveKey}</button><button onclick={() => keyAsk = { ...keyAsk, [e.id]: undefined }}>{strings.cancel}</button>
            {:else if keyAsk[e.id] === 'replace'}<button {disabled} onclick={() => keyAsk = { ...keyAsk, [e.id]: 'entry' }}>{strings.confirmReplaceKey}</button><button onclick={() => keyAsk = { ...keyAsk, [e.id]: undefined }}>{strings.cancel}</button>
            {:else}<button {disabled} onclick={() => keyAsk = { ...keyAsk, [e.id]: 'replace' }}>{strings.replaceKey}</button><button {disabled} onclick={() => keyAsk = { ...keyAsk, [e.id]: 'remove' }}>{strings.removeKey}</button>{/if}
          </div>
          {#if k.host}<p>{strings.keyHint(k.host)}</p>{/if}
        {:else if !isHttps(e.baseUrl)}{#if e.baseUrl}<p>{strings.keyNeedsHttps}</p>{/if}
        {:else}
          <form class="actions" onsubmit={ev => { ev.preventDefault(); void saveKey(e, ev.currentTarget); }}>
            <label class="inline">{strings.apiKey}<input name="key" type="password" autocomplete="off" spellcheck="false" {disabled} /></label>
            <button type="submit" {disabled}>{strings.saveKey}</button>
            {#if k?.set}<button type="button" onclick={() => keyAsk = { ...keyAsk, [e.id]: undefined }}>{strings.cancel}</button>{/if}
          </form>
          <p>{keyAsk[e.id] === 'entry' ? strings.replaceKeyHint : PRESET_CAPS[e.preset].key === 'optional' ? strings.keyOptional : strings.keyHint(keyHost(e.baseUrl))}</p>
        {/if}
        {#if keyNote[e.id]}<p role="status" data-testid="key-note">{keyNote[e.id]}</p>{/if}
      </div>
    {/if}
    <div class="actions"><button disabled={disabled || !!busy || !e.baseUrl} onclick={() => fetchModels(e)}>{strings.fetchModels}</button></div>
    {#if e.models.length}
      {#if e.models.length > 20}
        <div class="actions"><input type="search" aria-label={`${strings.filterModels} ${e.name}`} placeholder={strings.filterModels} value={filters[e.id] ?? ''} oninput={ev => filters = { ...filters, [e.id]: ev.currentTarget.value }} />
          <span class="preset">{strings.modelsShown(visible(e).length, e.models.length)}</span></div>
      {/if}
      <table><thead><tr><th>{strings.pinned}</th><th>{strings.model}</th><th>{strings.contextSize}</th><th>{strings.thinking}</th></tr></thead><tbody>
        {#each visible(e) as m (m.id)}<tr>
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
    {#if n}<p role="status" data-testid="endpoint-status">{n.status}</p>
      <!-- CE-40: a rejected key offers *Replace key* right there. -->
      {#if n.kind === 'key-rejected' && keyed(e) && k?.set && !keyAsk[e.id]}<div class="actions" data-testid="key-rejected"><button {disabled} onclick={() => keyAsk = { ...keyAsk, [e.id]: 'entry' }}>{strings.replaceKey}</button></div>{/if}
      {#if n.details}<details><summary>{strings.details}</summary><pre>{n.details}</pre></details>{/if}{/if}
  </div>
{/each}
{#if pending && 'preset' in pending}
  {@const preset = pending.preset}
  <div class="confirm" role="alert" data-testid="endpoint-confirm">
    <p>{strings.cloudConsent(strings.presetNames[preset], keyHost(PRESET_URLS[preset]))}</p>
    <div class="actions"><button onclick={() => addNow(preset)}>{strings.addCloud}</button><button onclick={() => pending = null}>{strings.cancel}</button></div>
  </div>
{/if}
<div class="actions"><select aria-label={strings.addEndpoint} bind:value={addPreset} disabled={disabled || !!pending}>{#each PRESETS as p}<option value={p}>{strings.presetNames[p]}</option>{/each}</select><button disabled={disabled || !!pending} onclick={add}>{strings.addEndpoint}</button></div>
<style>
  h3 { font-size: 15px; margin-top: 8px; } .endpoint { display: grid; gap: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
  .row { display: flex; gap: 8px; align-items: end; } .grow { flex: 1; } .preset { color: var(--ink-mute); font-size: 13px; padding-bottom: 6px; }
  label { display: grid; gap: 6px; } .check { display: flex; gap: 8px; align-items: center; } .inline { display: flex; gap: 8px; align-items: center; }
  table { border-collapse: collapse; font-size: 13px; } th { text-align: left; color: var(--ink-mute); font-weight: normal; padding: 2px 8px 2px 0; } td { padding: 2px 8px 2px 0; }
  td input[type='number'] { width: 9ch; } p { color: var(--ink-mute); font-size: 13px; margin: 0; } pre { white-space: pre-wrap; } .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .key { display: grid; gap: 6px; } .confirm { display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
  .confirm p { color: var(--ink); }
</style>
