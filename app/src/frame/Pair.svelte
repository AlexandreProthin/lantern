<script lang="ts">
  import { onMount } from 'svelte';
  import { pair } from './ipc';
  import { strings } from '../ui/strings';
  /** NW-10, NW-11, NW-32: a device that is not paired sees only this. A link from the QR code carries the code in its fragment. */
  let { paired }: { paired: () => void } = $props();
  let code = $state(''), working = $state(false), error = $state('');
  async function submit(value = code) {
    if (!value.trim() || working) return;
    working = true; error = '';
    try { const refused = await pair(value); if (refused === null) paired(); else error = refused; }
    catch { error = strings.pairUnreachable; }
    finally { working = false; }
  }
  onMount(() => {
    const match = /(?:^#|&)pair=([^&]+)/.exec(location.hash);
    // The code leaves the address bar and the history at once, whatever happens next.
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (match) { code = decodeURIComponent(match[1]); void submit(code); }
  });
</script>
<main class="pair">
  <form onsubmit={e => { e.preventDefault(); void submit(); }}>
    <h1>{strings.pairTitle}</h1>
    <p>{strings.pairHint}</p>
    <label>{strings.pairCode}<input bind:value={code} autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="12" disabled={working} /></label>
    <button type="submit" disabled={working || !code.trim()}>{working ? strings.pairWorking : strings.pairSubmit}</button>
    {#if error}<p class="invalid" role="alert">{error}</p>{/if}
  </form>
</main>
<style>
  .pair { min-height:100dvh; display:grid; place-items:center; padding:16px; box-sizing:border-box; color:var(--ink); }
  form { display:grid; gap:16px; width:min(380px,100%); background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:24px; box-sizing:border-box; }
  h1 { font-size:20px; margin:0; } p { color:var(--ink-mute); font-size:14px; margin:0; } label { display:grid; gap:8px; }
  input { font-size:24px; letter-spacing:.12em; text-transform:uppercase; padding:10px 12px; }
  button { font-size:16px; padding:10px; } .invalid { color:var(--focus); }
</style>
