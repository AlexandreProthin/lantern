<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { strings } from '../ui/strings';
  import { providerMode } from './provider-mode';
  import { DesktopProvider } from './provider';
  import { FakeProvider } from '../rooms/learn/fake-provider';
  import { learnRoom } from '../rooms/learn/definition';
  import type { RoomSession } from './room';
  import { desktopStorage, SubjectPersistence } from './persistence';
  import type { Loaded } from './persistence';
  import { browserStorage, browserSubjects } from './browser-storage';
  import { defaultSettings, validateSettings } from './settings';
  import { DebouncedWriter } from './debounced-writer';
  import SettingsPanel from './SettingsPanel.svelte';
  const desktop = '__TAURI_INTERNALS__' in window;
  const fake = providerMode(desktop, import.meta.env.VITE_PROVIDER) === 'fake';
  const room = learnRoom, provider = fake ? new FakeProvider(Number(new URLSearchParams(location.search).get('delay') ?? 12)) : new DesktopProvider();
  const storage = desktop ? desktopStorage : browserStorage;
  let settings = $state(defaultSettings());
  let revision = $state(0), space = $state('welcome'), session = $state<RoomSession | null>(null);
  let settingsOpen = $state(false), shortcutsOpen = $state(false), subjectMenu = $state(false);
  let loading = $state(true), banner = $state(''), toast = $state(''), saveError = $state(''), conflictPath = $state('');
  let readonlyFile = $state<unknown>(null), settingsReadOnly = $state(false);
  let subjectCount = $state(0), recentIds: string[] = [], library = '';
  const owned = new Map<string, { session: RoomSession; persistence: SubjectPersistence }>();
  const writer = new DebouncedWriter(async value => {
    if (desktop) await invoke('save_settings',{ document:value }); else localStorage.setItem('lantern.settings',JSON.stringify(value));
  }, error => saveError = String(error));
  const summary = $derived.by(() => { revision; return session ? room.statsSummary(session.subject) : null; });
  const running = $derived.by(() => { revision; return session?.running ? {...session.running} : null; });
  function preferencesChanged() {
    if (settingsReadOnly) return;
    settings = validateSettings(settings,defaultSettings(library,settings.user.displayName));
    writer.schedule(settings);
    document.documentElement.dataset.reduceMotion = settings.appearance.reduceMotion === 'on' ? 'on' : 'system';
    for (const entry of owned.values()) { entry.session.displayName = settings.user.displayName; entry.session.budgetTokens = settings.learn.contextBudget; }
  }
  async function navigate(next: string) {
    if (next === room.defaultSpace && !session && recentIds[0]) await open(recentIds[0]);
    if (next === room.defaultSpace && !session) return;
    space = next; subjectMenu = false;
  }
  async function open(id: string) {
    try {
      let entry = owned.get(id);
      if (!entry) {
        const loaded = await storage.load(library,id);
        if (loaded.readOnly) { readonlyFile = loaded.subject; banner = strings.readOnly; space=room.defaultSpace; return; }
        entry = own(loaded); owned.set(id,entry);
      }
      session = entry.session; readonlyFile = null; revision++; space=room.defaultSpace;
      const at = new Date().toISOString();
      if (desktop) { const state = await invoke<{ recents:string[] }>('record_open',{id,at}); recentIds=state.recents; }
      else { recentIds=[id,...recentIds.filter(s=>s!==id)]; localStorage.setItem('lantern.recents',JSON.stringify(recentIds)); }
    } catch (e) { banner=String(e); }
  }
  function own(loaded: Loaded) {
    let controller: RoomSession;
    const persistence = new SubjectPersistence(storage,library,loaded,result => {
      if (result.kind !== 'saved') {
        const recovered = $state(result.loaded.subject);
        controller.subject=recovered;
        if (result.kind === 'conflict') { toast=strings.conflict; conflictPath=result.conflictPath; } else toast=strings.diskReloaded;
        revision++;
      }
      saveError='';
    }, error=>saveError=String(error));
    const reactiveSubject = $state(loaded.subject);
    controller=room.prompts.createSession(reactiveSubject,provider,()=> { persistence.schedule(controller.subject); revision++; },()=>revision++,settings);
    return {session:controller,persistence};
  }
  async function createStudyFixture(title: string) {
    const subject=room.newSubject(title,settings.learn.defaultTone,settings);
    const saved=await storage.save(library,subject,null,true);
    if(saved.kind !== 'saved') throw new Error('Fixture id collision');
    const entry=own({subject,stamp:saved.stamp,readOnly:false}); owned.set(subject.id,entry); subjectCount++;
    await open(subject.id); void entry.session.initialize();
  }
  async function retrySaves() {
    try { for(const entry of owned.values()) await entry.persistence.flush(); await writer.flush(); saveError=''; } catch(e) {saveError=String(e);}
  }
  async function flushClose(): Promise<void> {
    for(const entry of owned.values()) entry.session.cancel();
    while([...owned.values()].some(entry=>entry.session.running)) await new Promise(resolve=>setTimeout(resolve,10));
    for(const entry of owned.values()) await entry.persistence.close(); await writer.flush();
  }
  function key(e: KeyboardEvent) {
    if(e.ctrlKey && ['1','2','3'].includes(e.key)) {e.preventDefault(); void navigate(room.spaces[Number(e.key)-1].id);}
    else if(e.ctrlKey && e.key===',') {e.preventDefault(); settingsOpen=true;}
    else if(e.key==='Escape') {
      if(document.querySelector('dialog[open]')) return;
      if(settingsOpen) settingsOpen=false; else if(shortcutsOpen) shortcutsOpen=false; else if(subjectMenu) subjectMenu=false; else session?.cancel();
    } else if(e.key==='?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) shortcutsOpen=!shortcutsOpen;
  }
  onMount(()=> {
    let unlisten: (()=>void) | undefined, refresh: ReturnType<typeof setInterval> | undefined;
    void (async()=> {
      try {
        if(desktop) {
          const loaded=await invoke<{document:unknown;readOnly:boolean;recovered:boolean;defaultLibrary:string;defaultName:string}>('load_settings');
          settings=validateSettings(loaded.document,defaultSettings(loaded.defaultLibrary,loaded.defaultName)); settingsReadOnly=loaded.readOnly;
          if(loaded.recovered) toast=strings.settingsRecovered; if(loaded.readOnly) banner=strings.readOnly;
          library=settings.library.path;
          await invoke('import_poc',{library});
          try {const subjects=await invoke<unknown[]>('list_subjects',{library});subjectCount=subjects.length;} catch(e) {banner=strings.libraryUnavailable+' '+library;}
          try {recentIds=(await invoke<{recents:string[]}>('read_state')).recents;} catch(e) {toast=String(e);}
          const {getCurrentWindow}=await import('@tauri-apps/api/window'); const window=getCurrentWindow();
          unlisten=await window.onCloseRequested(async e=> {e.preventDefault();try {await flushClose();await window.destroy();}catch(error){saveError=String(error);}});
        } else {
          try {settings=validateSettings(JSON.parse(localStorage.getItem('lantern.settings')??'{}'),defaultSettings('browser','Learner'));}catch{settings=defaultSettings('browser','Learner');}
          library='browser'; subjectCount=browserSubjects().length;
          try {recentIds=JSON.parse(localStorage.getItem('lantern.recents')??'[]');}catch{recentIds=[];}
        }
        preferencesChanged();
        const query=new URLSearchParams(location.search);
        // M3 development harness: no Welcome UI is built before the D1 recipe.
        if(import.meta.env.DEV && query.has('study')) {
          if(query.has('resume') && recentIds[0]) await open(recentIds[0]); else await createStudyFixture(query.get('subject')||'Ocean tides');
        }
        refresh=setInterval(()=> { for(const entry of owned.values()) entry.persistence.refresh().catch(e=>saveError=String(e)); },1000);
      }catch(e){banner=String(e);}finally{loading=false;}
    })();
    const beforeUnload=()=> { for(const entry of owned.values()) {entry.session.cancel();void entry.persistence.flush();}void writer.flush(); };
    window.addEventListener('beforeunload',beforeUnload);
    return ()=>{unlisten?.();clearInterval(refresh);window.removeEventListener('beforeunload',beforeUnload);};
  });
</script>
<svelte:window onkeydown={key} />
<header>
  <button class="mark" onclick={()=>navigate('welcome')} title={strings.welcome} aria-label={strings.welcome}>◈</button><span class="room">{room.name}</span>
  <nav>{#each room.spaces as item}<button aria-label={item.label} title={`${item.label} · Ctrl+${item.shortcutIndex}`} aria-current={space===item.id?'page':undefined} disabled={item.id!=='welcome' && !subjectCount} onclick={()=>navigate(item.id)}>{item.icon}</button>{/each}</nav>
  {#if session}<button class="subject" onclick={()=>subjectMenu=!subjectMenu} title={session.subject.title}>{session.subject.title}{#if running}<span class="busy-dot">·</span>{/if}</button>{/if}
  {#if summary}<small title={settings.appearance.showTokenStats?summary.tooltip:undefined}>{summary.text}</small>{/if}
  <button class="gear" aria-label={strings.settings} title={strings.settings} onclick={()=>settingsOpen=true}>⚙</button>
</header>
{#if banner}<div class="banner" role="alert">{banner}<button onclick={()=>banner=''}>{strings.close}</button></div>{/if}
{#if saveError}<div class="banner error" role="alert">{strings.saveFailed}<details><summary>{strings.details}</summary>{saveError}</details><button onclick={retrySaves}>{strings.retry}</button></div>{/if}
{#if toast}<div class="toast" role="status">{toast}<button onclick={()=>toast=''}>{strings.close}</button></div>{/if}
{#if subjectMenu && session}<div class="subject-menu">
  <input aria-label={strings.title} value={session.subject.title} maxlength="120" onkeydown={e=>{if(e.key==='Enter' && e.currentTarget.value.trim()){session!.subject.title=e.currentTarget.value.trim();session!.touch();subjectMenu=false;}}} />
  <label>{strings.tone}<select value={typeof session.subject.rooms[room.id].tone==='string'?session.subject.rooms[room.id].tone:'custom'} onchange={e=>{session!.subject.rooms[room.id].tone=e.currentTarget.value==='custom'?{custom:''}:e.currentTarget.value as any;session!.touch();toast=strings.appliesNext;}}>{#each ['eli5','curious','student','engineer','expert','custom'] as tone}<option>{tone}</option>{/each}</select></label>
  {#if typeof session.subject.rooms[room.id].tone==='object'}<textarea aria-label={strings.customTone} maxlength="300" value={(session.subject.rooms[room.id].tone as {custom:string}).custom} onblur={e=>{session!.subject.rooms[room.id].tone={custom:e.currentTarget.value};session!.touch();}}></textarea>{/if}
  <label>{strings.defaultModel}<input list="subject-models" value={session.subject.rooms[room.id].model} onblur={e=>{if(/^[A-Za-z0-9._:-]{1,100}$/.test(e.currentTarget.value)){session!.subject.rooms[room.id].model=e.currentTarget.value;session!.touch();toast=strings.appliesNext;}}} /></label><datalist id="subject-models"><option>opus</option><option>sonnet</option><option>haiku</option></datalist>
  <label>{strings.defaultEffort}<select value={session.subject.rooms[room.id].effort} onchange={e=>{session!.subject.rooms[room.id].effort=e.currentTarget.value as any;session!.touch();toast=strings.appliesNext;}}>{#each ['low','medium','high','xhigh','max'] as effort}<option>{effort}</option>{/each}</select></label>
</div>{/if}
<div class="spaces">{#if loading}<p>{strings.loading}</p>{:else if readonlyFile}<pre>{JSON.stringify(readonlyFile,null,2)}</pre>{:else}{#each room.spaces as item}{@const Component=item.component}<Component {session} {revision} visible={space===item.id} {settings} {navigate} {preferencesChanged} />{/each}{/if}</div>
{#if settingsOpen}<SettingsPanel {settings} {room} provider={provider} changed={preferencesChanged} close={()=>settingsOpen=false} readonly={settingsReadOnly} />{/if}
{#if shortcutsOpen}<div class="shortcuts" role="dialog" aria-label={strings.shortcuts}><h2>{strings.shortcuts}</h2><pre>{strings.shortcutTable}</pre><button onclick={()=>shortcutsOpen=false}>{strings.close}</button></div>{/if}
<style>
  :global(html),:global(body),:global(#app) { height:100%; overflow:hidden; } header { height:56px; display:flex; align-items:center; gap:12px; padding:0 16px; border-bottom:1px solid var(--line); background:var(--surface); }
  header button { background:none; padding:5px 9px; min-width:32px; }.mark { color:var(--accent); font-size:24px; }.room { color:var(--accent); font-size:13px; } nav { display:flex; gap:4px; } [aria-current='page'] { border-color:var(--accent); color:var(--accent); }
  .subject { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:35vw; border:0; } header small { color:var(--ink-mute); font-size:13px; margin-left:auto; }.gear { margin-left:auto; }
  .spaces { height:calc(100% - 57px); }.banner { display:flex; align-items:center; gap:12px; background:var(--surface-2); padding:8px 16px; }.banner.error { color:var(--error-ink); }
  .toast { position:fixed; right:18px; top:70px; max-width:520px; padding:12px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; z-index:8; }
  .subject-menu { position:fixed; left:230px; top:52px; z-index:12; display:grid; gap:12px; padding:20px; background:var(--surface); border:1px solid var(--line); border-radius:8px; }.subject-menu label { display:grid; gap:5px; }
  .busy-dot { font-size:24px; color:var(--accent); animation:pulse 1.8s ease-in-out infinite; }.shortcuts { position:fixed; inset:15% 20%; z-index:20; padding:24px; background:var(--surface); border:1px solid var(--line); border-radius:12px; }.shortcuts pre { white-space:pre-wrap; }
  @keyframes pulse { 50% {opacity:.4;} } @media(max-width:1100px) { header small {display:none;} }
  @media(prefers-reduced-motion:reduce) { .busy-dot {animation:none;} }
</style>
