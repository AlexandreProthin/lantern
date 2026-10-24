<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import type { Settings } from './settings';
  import type { FakeEndpointOptions } from './fake-endpoint';
  import { type Completion, type InferenceProvider, ProviderError } from './provider';
  import { strings } from '../ui/strings';
  import { errorMessage } from '../ui/error-message';
  import { displayModel } from '../core/models';
  import { trace } from './debug/trace.svelte';
  /**
   * CE-58: the Codex entry under Claude Code's, as SE-40 to SE-47 are for Claude Code: turned on here, then found or not,
   * its version, signed in or not, and *Test* on Codex's default model. Nothing runs until Codex is turned on (IP-41).
   */
  let { settings, changed, provider, health, fakeOptions = {}, disabled = false }: {
    settings: Settings; changed: () => void; provider: InferenceProvider; health?: Completion | ProviderError; fakeOptions?: FakeEndpointOptions; disabled?: boolean
  } = $props();
  const desktop = '__TAURI_INTERNALS__' in window;
  type Status = { kind: 'not-installed' | 'not-logged-in' | 'signed-in'; path?: string; version?: string };
  let found = $state<Status | null>(null), status = $state(strings.notTested), details = $state(''), kind = $state(''), testing = $state(false);
  let abort: AbortController | undefined;
  const on = $derived(settings.provider.codex === true);
  $effect(() => {
    if (!health) return;
    if (health instanceof ProviderError) { kind = health.kind; status = errorMessage(health); details = health.details; }
    else { kind = ''; status = strings.endpointReady(displayModel(health.model), Math.round(health.durationMs / 1000)); details = ''; }
  });
  async function detect() {
    found = desktop ? await invoke<Status>('codex_status')
      : fakeOptions.codexError === 'not-installed' || fakeOptions.codexError === 'not-logged-in' ? { kind: fakeOptions.codexError } : { kind: 'signed-in', version: 'codex-cli (fake)' };
    if (found.kind !== 'signed-in') { kind = found.kind; status = strings.codex.errors[found.kind]; } else if (kind === 'not-installed' || kind === 'not-logged-in') { kind = ''; status = strings.notTested; }
  }
  $effect(() => { if (on && found === null) void detect().catch(e => details = String(e)); });
  $effect(() => () => abort?.abort());
  function toggle(e: Event) { trace.action('frame', 'Setting changed', { setting: 'provider.codex' }); settings.provider.codex = (e.currentTarget as HTMLInputElement).checked; changed(); }
  async function test() {
    if (testing) return; testing = true; details = ''; abort = new AbortController();
    trace.action('frame', 'Test Codex', { model: 'codex:default' });
    try {
      await detect(); if (found?.kind === 'not-installed') return;
      const result = await provider.stream({ requestId: crypto.randomUUID(), system: 'Be terse.', prompt: 'Say only: ready.', model: 'codex:default', effort: 'low', cancel: abort.signal, trace: { origin: 'frame·test' } }, () => {});
      kind = ''; status = strings.endpointReady(displayModel(result.model), Math.round(result.durationMs / 1000));
    } catch (e) { if (e instanceof ProviderError) { if (e.kind !== 'cancelled') { kind = e.kind; status = errorMessage(e); details = e.details; } } else details = String(e); }
    finally { testing = false; }
  }
  async function install(e: MouseEvent) { if (desktop) { e.preventDefault(); try { await invoke('open_external', { url: strings.codex.installUrl }); } catch (error) { details = String(error); } } }
</script>
<section class="codex" aria-labelledby="codex-title">
  <h3 id="codex-title">{strings.codex.title}</h3>
  <label><input type="checkbox" checked={on} onchange={toggle} />{strings.codex.use}</label>
  <p>{strings.codex.hint}</p>
  {#if on}
    {#if found && found.kind !== 'not-installed'}<p>{strings.found}{found.path ? ` · ${found.path}` : ''}{found.version ? ` · ${found.version}` : ''}{found.kind === 'signed-in' ? ` · ${strings.signedIn}` : ''}</p>{/if}
    <p role="status">{status}</p><button disabled={testing || disabled} onclick={test}>{strings.testProvider}</button>
    {#if kind === 'not-installed'}<p>{strings.codex.installInstructions}</p><a href={strings.codex.installUrl} target="_blank" rel="noopener noreferrer" onclick={install}>{strings.codex.install}</a><button disabled={testing || disabled} onclick={test}>{strings.checkAgain}</button>{/if}
    {#if kind === 'not-logged-in'}<p>{strings.codex.signinInstructions}</p><button disabled={testing || disabled} onclick={test}>{strings.checkAgain}</button>{/if}
    {#if details}<details><summary>{strings.details}</summary><pre>{details}</pre><button onclick={() => navigator.clipboard.writeText(details)}>{strings.copyDetails}</button></details>{/if}
  {/if}
</section>
