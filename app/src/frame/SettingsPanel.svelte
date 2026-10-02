<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import type { Settings } from './settings';
  import type { RoomDefinition } from './room';
  import type { InferenceProvider } from './provider';
  import { ProviderError } from './provider';
  import { strings } from '../ui/strings';
  let { settings, room, provider, changed, close, readonly=false }: {settings:Settings;room:RoomDefinition;provider:InferenceProvider;changed:()=>void;close:()=>void;readonly?:boolean}=$props();
  let dialog:HTMLDialogElement, section=$state('general'), testing=$state(false), status=$state(strings.notTested), details=$state(''), errorKind=$state('');
  let abort:AbortController|undefined;
  async function test() {
    if(testing)return; testing=true; details=''; abort=new AbortController();
    try {const result=await provider.stream({requestId:crypto.randomUUID(),system:'Be terse.',prompt:'Say only: ready.',model:'haiku',effort:'low',cancel:abort.signal},()=>{});status=`${result.model} · ${Math.round(result.durationMs/1000)} s`;errorKind='';}
    catch(e){if(e instanceof ProviderError){errorKind=e.kind;status=strings.errorKinds[e.kind];details=e.details;}else details=String(e);}finally{testing=false;}
  }
  onMount(()=>{dialog.showModal(); if('__TAURI_INTERNALS__' in window) invoke<{kind:string;path?:string;version?:string}>('provider_status').then(found=>{details=[found.path,found.version].filter(Boolean).join('\n');if(found.kind==='not-installed'){errorKind=found.kind;status=strings.errorKinds['not-installed'];}});return()=>abort?.abort();});
</script>
<dialog class="settings" bind:this={dialog} oncancel={close}>
  <header><h2>{strings.settings}</h2><button aria-label={strings.close} onclick={close}>×</button></header>
  <div class="body"><nav>{#each [{id:'general',label:strings.general},{id:'provider',label:strings.provider},{id:'room',label:room.name},{id:'appearance',label:strings.appearance}] as item}<button aria-current={section===item.id?'page':undefined} onclick={()=>section=item.id}>{item.label}</button>{/each}</nav>
    <section><fieldset disabled={readonly}>
    {#if section==='general'}
      <label>{strings.displayName}<input value={settings.user.displayName} maxlength="40" onblur={e=>{settings.user.displayName=e.currentTarget.value;changed();}} /></label>
      <label>{strings.libraryFolder}<input readonly value={settings.library.path} /></label>
    {:else if section==='provider'}
      <label>{strings.defaultModel}<input list="models" value={settings.provider.defaultModel} onblur={e=>{settings.provider.defaultModel=e.currentTarget.value;changed();}} /></label><datalist id="models"><option>opus</option><option>sonnet</option><option>haiku</option></datalist>
      <label>{strings.defaultEffort}<select bind:value={settings.provider.defaultEffort} onchange={changed}>{#each ['low','medium','high','xhigh','max'] as effort}<option>{effort}</option>{/each}</select></label><p>{strings.newSubjectsHint}</p>
      <p role="status">{status}</p><button disabled={testing} onclick={test}>{strings.testProvider}</button>
      {#if errorKind==='not-installed'}<p>{strings.installInstructions}</p><a href="https://code.claude.com/docs/en/setup" target="_blank" rel="noopener noreferrer">{strings.installClaude}</a><button disabled={testing} onclick={test}>{strings.checkAgain}</button>{/if}
      {#if errorKind==='not-logged-in'}<p>{strings.signinInstructions}</p><button disabled={testing} onclick={test}>{strings.checkAgain}</button>{/if}
      {#if details}<details><summary>{strings.details}</summary><pre>{details}</pre></details>{/if}
    {:else if section==='room'}{@const RoomSettings=room.settingsMenu}<RoomSettings {settings} {changed} />
    {:else}
      <label>{strings.reduceMotion}<select bind:value={settings.appearance.reduceMotion} onchange={changed}><option value="system">{strings.followSystem}</option><option value="on">{strings.alwaysReduce}</option></select></label>
      <label><input type="checkbox" bind:checked={settings.appearance.showTokenStats} onchange={changed} />{strings.showTokens}</label>
    {/if}</fieldset></section>
  </div>
</dialog>
<style>
  .settings { position:fixed; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:12px; width:min(800px,85vw); padding:0; }
  .settings::backdrop { background:var(--code); opacity:.7; } header { display:flex; justify-content:space-between; align-items:center; padding:12px 24px; border-bottom:1px solid var(--line); } h2 {font-size:18px;}
  .body { display:grid; grid-template-columns:160px 1fr; min-height:400px; } nav {display:flex;flex-direction:column;gap:8px;padding:20px;border-right:1px solid var(--line);} nav button {text-align:left;} [aria-current='page'] {color:var(--accent);border-color:var(--accent);}
  section { padding:24px; overflow:auto; max-height:65vh; } fieldset {padding:0;border:0;display:grid;gap:16px;} label {display:grid;gap:8px;} p {color:var(--ink-mute);font-size:13px;} pre {white-space:pre-wrap;} a {color:var(--accent);}
</style>
