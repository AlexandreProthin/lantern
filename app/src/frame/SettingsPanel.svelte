<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import type { Settings } from './settings';
  import type { RoomDefinition } from './room';
  import type { Completion, InferenceProvider } from './provider';
  import { ProviderError } from './provider';
  import { strings } from '../ui/strings';
  import ModelPicker from '../ui/ModelPicker.svelte';
  let { settings, defaults, room, provider, health=null, initialSection='general', changed, close, switchLibrary, generating=false, readonly=false }: {
    settings:Settings; defaults:Settings; room:RoomDefinition; provider:InferenceProvider; health?:Completion|ProviderError|null;
    changed:()=>void;close:()=>void;switchLibrary:(destination:string,mode:string)=>Promise<void>;initialSection?:string;generating?:boolean;readonly?:boolean
  }=$props();
  const desktop='__TAURI_INTERNALS__' in window;
  let dialog:HTMLDialogElement, section=$state('general'), testing=$state(false), status=$state(strings.notTested), details=$state(''), errorKind=$state('');
  let located=$state(''), version=$state(''), found=$state<boolean|null>(null), validation=$state(''), resetting=$state(false);
  let destination=$state(''), transferring=$state(false), typedPath=$state('');
  $effect(()=>{typedPath=settings.library.path;});
  let abort:AbortController|undefined;
  $effect(()=>{
    if(!health)return;
    if(health instanceof ProviderError){errorKind=health.kind;status=strings.errorKinds[health.kind];details=health.details;}
    else {status=`${strings.signedIn} · ${health.model} · ${Math.round(health.durationMs/1000)} s`;errorKind='';}
  });
  async function detect() {
    if(!desktop)return;
    const result=await invoke<{kind:string;path?:string;version?:string}>('provider_status');
    found=result.kind!=='not-installed';located=result.path??'';version=result.version??'';
    if(!found){errorKind='not-installed';status=strings.errorKinds['not-installed'];}
  }
  async function test() {
    if(testing)return;testing=true;details='';abort=new AbortController();
    try {await detect();const result=await provider.stream({requestId:crypto.randomUUID(),system:'Be terse.',prompt:'Say only: ready.',model:'haiku',effort:'low',cancel:abort.signal},()=>{});status=`${strings.signedIn} · ${result.model} · ${Math.round(result.durationMs/1000)} s`;errorKind='';}
    catch(e){if(e instanceof ProviderError){errorKind=e.kind;status=strings.errorKinds[e.kind];details=e.details;}else details=String(e);}finally{testing=false;}
  }
  async function choose(path?:string) {
    if(generating){validation=strings.finishGeneration;return;}
    try {const selected=path??await invoke<string|null>('pick_library',{title:strings.libraryFolder,start:settings.library.path});if(!selected)return;typedPath=selected;destination=await invoke<string>('validate_library',{path:selected});validation='';}catch(e){validation=String(e);}
  }
  async function transfer(mode:string) {transferring=true;try{await switchLibrary(destination,mode);destination='';validation='';}catch(e){validation=String(e);}finally{transferring=false;}}
  async function reset() {
    if(section==='general') {settings.user={...settings.user,...defaults.user};changed();if(desktop&&settings.library.path!==defaults.library.path)await choose(defaults.library.path);}
    else if(section==='room'){settings.learn={...settings.learn,...defaults.learn};changed();}
    else if(section==='provider'){settings.provider={...settings.provider,...defaults.provider};changed();}
    else {settings.appearance={...settings.appearance,...defaults.appearance};changed();}
    resetting=false;
  }
  function text(e:Event,field:'name') {
    const value=(e.currentTarget as HTMLInputElement).value.trim();
    if(value.length>40){validation=strings.invalidName;return;}settings.user.displayName=value||defaults.user.displayName;
    validation='';changed();
  }
  async function install(e:MouseEvent) {if(desktop){e.preventDefault();try{await invoke('open_external',{url:'https://code.claude.com/docs/en/setup'});}catch(error){details=String(error);}}}
  onMount(()=>{section=initialSection;dialog.showModal();void detect().catch(e=>details=String(e));return()=>abort?.abort();});
</script>
<dialog class="settings" bind:this={dialog} oncancel={close}>
  <header><h2>{strings.settings}</h2><button aria-label={strings.close} onclick={close}>×</button></header>
  <div class="body"><nav>{#each [{id:'general',label:strings.general},{id:'provider',label:strings.provider},{id:'room',label:room.name},{id:'appearance',label:strings.appearance}] as item}<button aria-current={section===item.id?'page':undefined} onclick={()=>{section=item.id;validation='';resetting=false;}}>{item.label}</button>{/each}</nav>
    <section><fieldset disabled={readonly||transferring}>
    {#if section==='general'}
      <label>{strings.displayName}<input value={settings.user.displayName} onblur={e=>text(e,'name')} onkeydown={e=>{if(e.key==='Enter')text(e,'name');}} /></label><p>{strings.appliesNext}</p>
      <label>{strings.libraryFolder}<input bind:value={typedPath} disabled={!desktop} spellcheck="false" onkeydown={e=>{if(e.key==='Enter'){e.preventDefault();if(typedPath.trim()&&typedPath.trim()!==settings.library.path)void choose(typedPath.trim());}}} /></label>
      <div class="actions"><button disabled={!desktop||generating||!typedPath.trim()||typedPath.trim()===settings.library.path} onclick={()=>choose(typedPath.trim())}>{strings.applyLibrary}</button><button disabled={!desktop||generating} title={generating?strings.finishGeneration:undefined} onclick={()=>choose()}>{strings.changeLibrary}</button><button disabled={!desktop} onclick={()=>invoke('reveal_library',{path:settings.library.path}).catch(e=>validation=String(e))}>{strings.revealLibrary}</button></div>
      {#if generating}<p>{strings.finishGeneration}</p>{/if}
      <p class="version">{strings.appVersion(__APP_VERSION__)}</p>
    {:else if section==='provider'}
      <div class="field"><label for="default-model">{strings.defaultModel}</label><ModelPicker id="default-model" value={settings.provider.defaultModel} label={strings.defaultModel} commit={model=>{settings.provider.defaultModel=model;validation='';changed();}} /></div>
      <label>{strings.defaultEffort}<select bind:value={settings.provider.defaultEffort} onchange={changed}>{#each ['low','medium','high','xhigh','max'] as effort}<option>{effort}</option>{/each}</select></label><p>{strings.newSubjectsHint}</p>
      {#if found!==null}<p>{found?strings.found:strings.notFound} · {located} · {version}</p>{/if}
      <p role="status">{status}</p><button disabled={testing||generating} onclick={test}>{strings.testProvider}</button>
      {#if errorKind==='not-installed'}<p>{strings.installInstructions}</p><a href="https://code.claude.com/docs/en/setup" target="_blank" rel="noopener noreferrer" onclick={install}>{strings.installClaude}</a><button disabled={testing||generating} onclick={test}>{strings.checkAgain}</button>{/if}
      {#if errorKind==='not-logged-in'}<p>{strings.signinInstructions}</p><button disabled={testing||generating} onclick={test}>{strings.checkAgain}</button>{/if}
      {#if errorKind==='model-unknown'}<button onclick={()=>document.getElementById('default-model')?.focus()}>{strings.chooseModel}</button>{/if}
      {#if details}<details><summary>{strings.details}</summary><pre>{details}</pre><button onclick={()=>navigator.clipboard.writeText(details)}>{strings.copyDetails}</button></details>{/if}
    {:else if section==='room'}{@const RoomSettings=room.settingsMenu}<RoomSettings {settings} {changed} />
    {:else}
      <label>{strings.reduceMotion}<select bind:value={settings.appearance.reduceMotion} onchange={changed}><option value="system">{strings.followSystem}</option><option value="on">{strings.alwaysReduce}</option></select></label>
      <label><input type="checkbox" bind:checked={settings.appearance.showTokenStats} onchange={changed} />{strings.showTokens}</label>
    {/if}
      {#if validation}<p class="invalid" role="alert">{validation}</p>{/if}
      {#if destination}<div class="confirmation"><h3>{strings.transferLibrary}</h3><p>{destination}</p><p>{strings.transferHint}</p><div class="actions"><button onclick={()=>transfer('move')}>{strings.moveSubjects}</button><button onclick={()=>transfer('copy')}>{strings.copySubjects}</button><button onclick={()=>transfer('leave')}>{strings.leaveSubjects}</button><button onclick={()=>destination=''}>{strings.cancel}</button></div></div>{/if}
      {#if resetting}<p>{strings.confirmReset}</p><div class="actions"><button onclick={reset}>{strings.resetDefaults}</button><button onclick={()=>resetting=false}>{strings.cancel}</button></div>{:else}<button disabled={generating&&section==='general'} onclick={()=>resetting=true}>{strings.resetDefaults}</button>{/if}
    </fieldset></section>
  </div>
</dialog>
<style>
  .settings { position:fixed; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:12px; width:min(800px,85vw); padding:0; }
  .settings::backdrop { background:var(--code); opacity:.7; } header { display:flex; justify-content:space-between; align-items:center; padding:12px 24px; border-bottom:1px solid var(--line); } h2 {font-size:18px;}
  .body { display:grid; grid-template-columns:160px 1fr; min-height:400px; } nav {display:flex;flex-direction:column;gap:8px;padding:20px;border-right:1px solid var(--line);} nav button {text-align:left;} [aria-current='page'] {color:var(--accent);border-color:var(--accent);}
  section { padding:24px; overflow:auto; max-height:65vh; } fieldset {padding:0;border:0;display:grid;gap:16px;} label,.field {display:grid;gap:8px;} p {color:var(--ink-mute);font-size:13px;} pre {white-space:pre-wrap;} a {color:var(--accent);} .actions {display:flex;gap:8px;flex-wrap:wrap;} .confirmation {border:1px solid var(--line);padding:12px;} .invalid {color:var(--focus);}
</style>
