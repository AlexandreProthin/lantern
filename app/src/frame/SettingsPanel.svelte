<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from './ipc';
  import type { Settings } from './settings';
  import type { RoomDefinition } from './room';
  import type { Completion, InferenceProvider } from './provider';
  import { ProviderError } from './provider';
  import { strings } from '../ui/strings';
  import ModelPicker from '../ui/ModelPicker.svelte';
  import EndpointsSettings from './EndpointsSettings.svelte';
  import NetworkSettings from './NetworkSettings.svelte';
  import { backend, native, remote } from './host';
  import type { FakeEndpointOptions } from './fake-endpoint';
  import type { UpdateController } from './updates.svelte';
  import { REVEAL_CLICKS, revealsDeveloper } from './updates';
  import { browserAmberLog, desktopAmberLog, type AmberTotals } from './amber/log';
  import { tokens } from './library-format';
  import { splitModels } from './token-split';
  let { settings, defaults, rooms, provider, health=null, initialSection='general', changed, close, switchLibrary, updater, checkUpdates, installUpdate, generating=false, readonly=false, endpointHealth={}, fakeEndpoint={} }: {
    settings:Settings; defaults:Settings; rooms:readonly RoomDefinition[]; provider:InferenceProvider; health?:Completion|ProviderError|null;
    updater:UpdateController; checkUpdates:()=>Promise<void>; installUpdate:()=>Promise<void>;
    changed:()=>void;close:()=>void;switchLibrary:(destination:string,mode:string)=>Promise<void>;initialSection?:string;generating?:boolean;readonly?:boolean;
    endpointHealth?:Record<string,Completion|ProviderError>;fakeEndpoint?:FakeEndpointOptions
  }=$props();
  /** SE-11/12: one submenu per registered room, after Provider, in registration order. */
  const roomOf=(id:string)=>rooms.find(r=>`room:${r.id}`===id);
  let dialog:HTMLDialogElement, section=$state('general'), testing=$state(false), status=$state(strings.notTested), details=$state(''), errorKind=$state('');
  let located=$state(''), version=$state(''), found=$state<boolean|null>(null), validation=$state(''), resetting=$state(false);
  // SE-11, CO-47: the tokens Amber has spent, read from its app-level log when the section opens.
  let amberTotals=$state<AmberTotals|null>(null);
  $effect(()=>{if(section!=='companion')return;void (backend?desktopAmberLog:browserAmberLog).totals().then(t=>amberTotals=t).catch(e=>details=String(e));});
  let destination=$state(''), transferring=$state(false), typedPath=$state('');
  $effect(()=>{typedPath=settings.library.path;});
  let abort:AbortController|undefined;
  $effect(()=>{
    if(!health)return;
    if(health instanceof ProviderError){errorKind=health.kind;status=strings.errorKinds[health.kind];details=health.details;}
    else {status=`${strings.signedIn} · ${health.model} · ${Math.round(health.durationMs/1000)} s`;errorKind='';}
  });
  async function detect() {
    if(!backend)return;
    const result=await invoke<{kind:string;path?:string;version?:string}>('provider_status');
    found=result.kind!=='not-installed';located=result.path??'';version=result.version??'';
    if(!found){errorKind='not-installed';status=strings.errorKinds['not-installed'];}
  }
  async function test() {
    if(testing)return;testing=true;details='';abort=new AbortController();
    try {await detect();const result=await provider.stream({requestId:crypto.randomUUID(),system:'Be terse.',prompt:'Say only: ready.',model:'opus',effort:'low',cancel:abort.signal},()=>{});status=`${strings.signedIn} · ${result.model} · ${Math.round(result.durationMs/1000)} s`;errorKind='';}
    catch(e){if(e instanceof ProviderError){errorKind=e.kind;status=strings.errorKinds[e.kind];details=e.details;}else details=String(e);}finally{testing=false;}
  }
  async function choose(path?:string) {
    if(generating){validation=strings.finishGeneration;return;}
    try {const selected=path??await invoke<string|null>('pick_library',{title:strings.libraryFolder,start:settings.library.path});if(!selected)return;typedPath=selected;destination=await invoke<string>('validate_library',{path:selected});validation='';}catch(e){validation=String(e);}
  }
  async function transfer(mode:string) {transferring=true;try{await switchLibrary(destination,mode);destination='';validation='';}catch(e){validation=String(e);}finally{transferring=false;}}
  async function reset() {
    if(section==='general') {settings.user={...settings.user,...defaults.user};settings.updates={...settings.updates,...defaults.updates};changed();if(native&&settings.library.path!==defaults.library.path)await choose(defaults.library.path);}
    else if(roomOf(section)){const id=roomOf(section)!.id;settings[id]={...(settings[id] as object),...(defaults[id] as object)};changed();}
    else if(section==='provider'){settings.provider={...settings.provider,...defaults.provider};changed();}
    else if(section==='developer'){settings.developer={...settings.developer,...defaults.developer};changed();}
    else if(section==='companion'){settings.companion={...settings.companion,...defaults.companion};changed();}
    else {settings.appearance={...settings.appearance,...defaults.appearance};changed();}
    resetting=false;
  }
  function text(e:Event,field:'name') {
    const value=(e.currentTarget as HTMLInputElement).value.trim();
    if(value.length>40){validation=strings.invalidName;return;}settings.user.displayName=value||defaults.user.displayName;
    validation='';changed();
  }
  // UP-60: five clicks on the version line reveal Developer; it stays while a folder is set.
  let versionClicks:number[]=[], revealed=$state(false);
  const developerShown=$derived(revealed||!!settings.developer.updateFolder);
  function versionClick() {versionClicks=[...versionClicks.slice(-(REVEAL_CLICKS-1)),Date.now()];if(revealsDeveloper(versionClicks)){revealed=true;section='developer';}}
  async function pickFolder() {
    try {const selected=await invoke<string|null>('pick_library',{title:strings.updateFolder,start:settings.developer.updateFolder||null});if(selected){settings.developer.updateFolder=selected;validation='';changed();}}catch(e){validation=String(e);}
  }
  async function install(e:MouseEvent) {if(native){e.preventDefault();try{await invoke('open_external',{url:'https://code.claude.com/docs/en/setup'});}catch(error){details=String(error);}}}
  onMount(()=>{section=initialSection;dialog.showModal();void detect().catch(e=>details=String(e));return()=>abort?.abort();});
</script>
<dialog class="settings" bind:this={dialog} oncancel={close}>
  <header><h2>{strings.settings}</h2><button aria-label={strings.close} onclick={close}>×</button></header>
  <div class="body"><nav>{#each [{id:'general',label:strings.general},{id:'provider',label:strings.provider},...rooms.map(r=>({id:`room:${r.id}`,label:r.name})),{id:'companion',label:strings.companion},{id:'appearance',label:strings.appearance},...(native?[{id:'network',label:strings.network}]:[]),...(developerShown?[{id:'developer',label:strings.developer}]:[])] as item}<button aria-current={section===item.id?'page':undefined} onclick={()=>{section=item.id;validation='';resetting=false;}}>{item.label}</button>{/each}</nav>
    <section><fieldset disabled={readonly||transferring}>
    {#if section==='general'}
      <label>{strings.displayName}<input value={settings.user.displayName} onblur={e=>text(e,'name')} onkeydown={e=>{if(e.key==='Enter')text(e,'name');}} /></label><p>{strings.appliesNext}</p>
      {#if remote}<p>{strings.libraryOnDesktop}</p>{/if}
      <label>{strings.libraryFolder}<input bind:value={typedPath} disabled={!native} spellcheck="false" onkeydown={e=>{if(e.key==='Enter'){e.preventDefault();if(typedPath.trim()&&typedPath.trim()!==settings.library.path)void choose(typedPath.trim());}}} /></label>
      <div class="actions"><button disabled={!native||generating||!typedPath.trim()||typedPath.trim()===settings.library.path} onclick={()=>choose(typedPath.trim())}>{strings.applyLibrary}</button><button disabled={!native||generating} title={generating?strings.finishGeneration:undefined} onclick={()=>choose()}>{strings.changeLibrary}</button><button disabled={!native} onclick={()=>invoke('reveal_library',{path:settings.library.path}).catch(e=>validation=String(e))}>{strings.revealLibrary}</button></div>
      {#if generating}<p>{strings.finishGeneration}</p>{/if}
      <button class="version" onclick={versionClick}>{strings.appVersion(__APP_VERSION__)}</button>
      {#if settings.developer.updateFolder}<p>{strings.updatesFromFolder}</p>{/if}
      <div class="actions"><button disabled={!native||['checking','downloading','installing'].includes(updater.phase)} onclick={()=>void checkUpdates()}>{strings.checkForUpdates}</button>
        {#if updater.phase==='available'}<button disabled={generating} title={generating?strings.finishGeneration:undefined} onclick={()=>void installUpdate()}>{strings.installUpdate}</button>{/if}</div>
      <p role="status" data-testid="update-status">{#if updater.phase==='checking'}{strings.checkingUpdates}{:else if updater.phase==='up-to-date'}{strings.upToDate}{:else if updater.phase==='available'}{strings.updateAvailable(updater.version)}{:else if updater.phase==='unconfigured'}{strings.updateUnconfigured}{:else if updater.phase==='downloading'}{strings.updateDownloading(updater.percent)}{:else if updater.phase==='installing'}{strings.updateInstalling}{:else if updater.phase==='failed'}{updater.message}{/if}</p>
      <label><input type="checkbox" bind:checked={settings.updates.checkAtLaunch} onchange={changed} />{strings.checkAtLaunch}</label>
    {:else if section==='provider'}
      <div class="field"><label for="default-model">{strings.defaultModel}</label><ModelPicker id="default-model" value={settings.provider.defaultModel} label={strings.defaultModel} commit={model=>{settings.provider.defaultModel=model;validation='';changed();}} /></div>
      <label>{strings.defaultEffort}<select bind:value={settings.provider.defaultEffort} onchange={changed}>{#each ['low','medium','high','xhigh','max'] as effort}<option>{effort}</option>{/each}</select></label><p>{strings.newSubjectsHint}</p>
      <h3>{strings.claudeCode}</h3>
      {#if found!==null}<p>{found?strings.found:strings.notFound} · {located} · {version}</p>{/if}
      <p role="status">{status}</p><button disabled={testing||generating} onclick={test}>{strings.testProvider}</button>
      {#if errorKind==='not-installed'}<p>{strings.installInstructions}</p><a href="https://code.claude.com/docs/en/setup" target="_blank" rel="noopener noreferrer" onclick={install}>{strings.installClaude}</a><button disabled={testing||generating} onclick={test}>{strings.checkAgain}</button>{/if}
      {#if errorKind==='not-logged-in'}<p>{strings.signinInstructions}</p><button disabled={testing||generating} onclick={test}>{strings.checkAgain}</button>{/if}
      {#if errorKind==='model-unknown'}<button onclick={()=>document.getElementById('default-model')?.focus()}>{strings.chooseModel}</button>{/if}
      {#if details}<details><summary>{strings.details}</summary><pre>{details}</pre><button onclick={()=>navigator.clipboard.writeText(details)}>{strings.copyDetails}</button></details>{/if}
      {#if remote}<p>{strings.endpointsOnDesktop}</p>{/if}
      <EndpointsSettings {settings} {changed} {provider} health={endpointHealth} fakeOptions={fakeEndpoint} disabled={generating||remote} />
    {:else if roomOf(section)}{@const RoomSettings=roomOf(section)!.settingsMenu}<RoomSettings {settings} {changed} />
    {:else if section==='companion'}
      <label><input type="checkbox" bind:checked={settings.companion.show} onchange={changed} />{strings.showAmber}</label>
      {#if !settings.companion.show}<p>{strings.amberHiddenHint}</p>{/if}
      <div class="field"><label for="amber-model">{strings.amberModel}</label><ModelPicker id="amber-model" value={settings.companion.model} label={strings.amberModel} commit={model=>{settings.companion.model=model;validation='';changed();}} /></div>
      <p>{strings.amberEffortHint}</p>
      {#if amberTotals}<p data-testid="amber-tokens">{#if amberTotals.calls}{@const split=splitModels(amberTotals.models)}{split?strings.amberSpentSplit(strings.inOut(tokens(split.claude.input),tokens(split.claude.output)),strings.inOut(tokens(split.local.input),tokens(split.local.output)),amberTotals.calls):strings.amberSpent(tokens(amberTotals.input+amberTotals.output),tokens(amberTotals.input),tokens(amberTotals.output),amberTotals.calls)}{:else}{strings.amberSpentNone}{/if}</p>{/if}
    {:else if section==='network'}
      <NetworkSettings />
    {:else if section==='developer'}
      <label>{strings.updateFolder}<input value={settings.developer.updateFolder} readonly spellcheck="false" /></label>
      <div class="actions"><button disabled={!native} onclick={pickFolder}>{strings.changeLibrary}</button><button disabled={!settings.developer.updateFolder} onclick={()=>{settings.developer.updateFolder='';changed();}}>{strings.clearFolder}</button></div>
      <p>{strings.updateFolderHint}</p>
    {:else}
      <label>{strings.reduceMotion}<select bind:value={settings.appearance.reduceMotion} onchange={changed}><option value="system">{strings.followSystem}</option><option value="on">{strings.alwaysReduce}</option></select></label>
      <label><input type="checkbox" bind:checked={settings.appearance.backdrop} onchange={changed} />{strings.backdrop}</label>
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
  section { padding:24px; overflow:auto; max-height:65vh; } fieldset {padding:0;border:0;display:grid;gap:16px;} label,.field {display:grid;gap:8px;} p {color:var(--ink-mute);font-size:13px;} pre {white-space:pre-wrap;} h3 {font-size:15px;} a {color:var(--accent);} .actions {display:flex;gap:8px;flex-wrap:wrap;} .confirmation {border:1px solid var(--line);padding:12px;} .invalid {color:var(--focus);}
  .version {justify-self:start;background:none;border:0;padding:0;color:var(--ink-mute);font-size:13px;cursor:default;}
</style>
