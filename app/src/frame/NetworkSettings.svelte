<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from './ipc';
  import { strings } from '../ui/strings';
  /** NW-1..14: Settings → Network, in the desktop window only. Nothing listens on the network until the box is ticked. */
  type Device = { id: string; created: number; lastSeen: number; agent: string };
  type Status = { enabled: boolean; running: boolean; port: number; address: string; url: string | null; fingerprint: string | null; error: string | null; devices: Device[] };
  type Pairing = { code: string; url: string; qr: string; expiresInMs: number };
  let status = $state<Status | null>(null), port = $state(''), busy = $state(false), error = $state('');
  let pairing = $state<Pairing | null>(null), forgetting = $state(false);
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const qr = $derived(pairing?.qr.replace(/^<\?xml[^>]*>\s*/, '') ?? '');
  async function run(task: () => Promise<Status>) {
    busy = true; error = '';
    try { status = await task(); port = String(status.port); if (!status.running) pairing = null; } catch (e) { error = String(e); } finally { busy = false; }
  }
  const set = (enabled: boolean) => run(() => invoke<Status>('network_set', { enabled, port: Number(port) || status?.port || 4317 }));
  async function pair() {
    error = '';
    try { pairing = await invoke<Pairing>('network_pair'); clearTimeout(expiry); expiry = setTimeout(() => pairing = null, pairing.expiresInMs); } catch (e) { error = String(e); }
  }
  /** A device's browser, from its user agent: enough to tell a phone from a PC. */
  function deviceName(agent: string): string {
    const os = /iPhone|iPad|Android|Windows|Mac OS X|Linux/.exec(agent)?.[0].replace('Mac OS X', 'macOS') ?? '';
    const browser = /Edg|Firefox|Chrome|Safari/.exec(agent)?.[0].replace('Edg', 'Edge') ?? '';
    return [browser, os].filter(Boolean).join(' · ') || agent.slice(0, 40) || '—';
  }
  const when = (ms: number) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  onMount(() => {
    void run(() => invoke<Status>('network_status'));
    // Devices pair while this section is open: their list follows.
    const poll = setInterval(() => { if (!busy) invoke<Status>('network_status').then(s => { if (status) status = { ...s, port: status.port }; }).catch(() => {}); }, 3000);
    return () => { clearInterval(poll); clearTimeout(expiry); };
  });
</script>
{#if status}
  <label><input type="checkbox" checked={status.enabled} disabled={busy} onchange={e => set(e.currentTarget.checked)} />{strings.networkServe}</label>
  <p>{strings.networkHint}</p>
  <div class="row">
    <label>{strings.networkPort}<input inputmode="numeric" bind:value={port} disabled={busy} maxlength="5" onkeydown={e => { if (e.key === 'Enter' && status) void set(status.enabled); }} /></label>
    <button disabled={busy || !status.enabled || port === String(status.port)} onclick={() => status && set(status.enabled)}>{strings.networkApplyPort}</button>
  </div>
  <p role="status" data-testid="network-status">{#if busy}{strings.networkStarting}{:else if status.running && status.url}{strings.networkRunning} <a href={status.url} target="_blank" rel="noopener noreferrer" onclick={e => { e.preventDefault(); void invoke('open_external', { url: status!.url }); }}>{status.url}</a>{:else}{strings.networkOff}{/if}</p>
  {#if status.error}<p class="invalid" role="alert">{status.error}</p>{/if}
  {#if status.running && status.fingerprint}
    <div class="field"><span>{strings.networkFingerprint}</span><code data-testid="network-fingerprint">{status.fingerprint}</code></div>
    <p>{strings.networkCertificateHint}</p>
    <p>{strings.networkFirewallHint}</p>
    <h3>{strings.networkPair}</h3>
    {#if pairing}
      <div class="pairing">
        <!-- Inline: the desktop window's CSP has no data: images. The SVG is made by Rust from our own URL. -->
        <div class="qr" role="img" aria-label={pairing.url} data-testid="network-qr">{@html qr}</div>
        <div><span>{strings.networkCode}</span><code class="code" data-testid="network-code">{pairing.code.slice(0, 4)} {pairing.code.slice(4)}</code><p>{strings.networkPairHint}</p></div>
      </div>
    {:else}<button onclick={pair}>{strings.networkPair}</button>{/if}
  {/if}
  <h3>{strings.networkDevices}</h3>
  {#if status.devices.length}
    <ul>{#each status.devices as device (device.id)}<li>{deviceName(device.agent)} <span>· {strings.networkLastSeen(when(device.lastSeen))}</span></li>{/each}</ul>
    {#if forgetting}<p>{strings.networkForgetConfirm}</p><div class="row"><button onclick={() => { forgetting = false; void run(() => invoke<Status>('network_forget_devices')); }}>{strings.networkForget}</button><button onclick={() => forgetting = false}>{strings.cancel}</button></div>
    {:else}<div class="row"><button onclick={() => forgetting = true}>{strings.networkForget}</button></div>{/if}
  {:else}<p>{strings.networkNoDevices}</p>{/if}
{/if}
{#if error}<p class="invalid" role="alert">{error}</p>{/if}
<style>
  p { color:var(--ink-mute); font-size:13px; margin:0; } h3 { font-size:15px; margin:8px 0 0; } a { color:var(--accent); } label { display:grid; gap:8px; } .invalid { color:var(--focus); }
  label:has(input[type='checkbox']) { display:flex; gap:8px; align-items:center; }
  .row { display:flex; gap:8px; align-items:end; flex-wrap:wrap; } .row label { width:120px; } .row input { width:100%; box-sizing:border-box; }
  .row button { min-height:38px; }
  .field { display:grid; gap:8px; } code { font-size:12px; word-break:break-all; color:var(--ink); }
  .pairing { display:flex; gap:16px; align-items:center; flex-wrap:wrap; } .qr { width:220px; height:220px; background:#fff; border-radius:8px; overflow:hidden; } .qr :global(svg) { display:block; width:100%; height:100%; }
  .pairing div { display:grid; gap:8px; } .code { font-size:28px; letter-spacing:.12em; color:var(--accent); }
  ul { margin:0; padding-left:18px; color:var(--ink); font-size:13px; } li span { color:var(--ink-mute); }
</style>
