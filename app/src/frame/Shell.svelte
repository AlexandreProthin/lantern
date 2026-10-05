<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { strings } from '../ui/strings';
  import { providerMode } from './provider-mode';
  import { DesktopProvider, ObservedProvider, ProviderError } from './provider';
  import type { Completion, ErrorKind } from './provider';
  import { FakeProvider } from '../rooms/learn/fake-provider';
  import { learnRoom } from '../rooms/learn/definition';
  import type { RoomSession } from './room';
  import { desktopStorage, SubjectPersistence } from './persistence';
  import type { Loaded } from './persistence';
  import { browserStorage, browserSummaries, browserLibraryState, browserRecordOpen, browserDelete } from './browser-storage';
  import { Catalogue } from './catalogue';
  import type { SubjectSummary, LibraryState } from './catalogue';
  import { thumbnailGraph } from './library-spaces';
  import type { LibrarySpaces, ThumbnailGraph } from './library-spaces';
  import { checkedTitle, checkedDirection, DIRECTION_LIMIT } from '../core/model';
  import type { Tone } from '../core/model';
  import { defaultSettings, validateSettings } from './settings';
  import { DebouncedWriter } from './debounced-writer';
  import SettingsPanel from './SettingsPanel.svelte';
  import ModelPicker from '../ui/ModelPicker.svelte';
  import { isValidModel } from '../core/models';
  const desktop = '__TAURI_INTERNALS__' in window;
  const fake = providerMode(desktop, import.meta.env.VITE_PROVIDER) === 'fake';
  let health = $state<Completion | ProviderError | null>(null);
  const fakeError=new URLSearchParams(location.search).get('error');
  const room = learnRoom, provider = new ObservedProvider(fake ? new FakeProvider(Number(new URLSearchParams(location.search).get('delay') ?? 12),import.meta.env.DEV&&fakeError&&Object.hasOwn(strings.errorKinds,fakeError)?fakeError as ErrorKind:undefined) : new DesktopProvider(), value => health=value);
  const storage = desktop ? desktopStorage : browserStorage;
  let settings = $state(defaultSettings());
  let defaults = $state(defaultSettings());
  let switchingLibrary = $state(false);
  let windowMemory: Awaited<ReturnType<typeof import('./window-memory').rememberWindow>>|undefined;
  let revision = $state(0), space = $state('welcome'), session = $state<RoomSession | null>(null);
  let settingsOpen = $state(false), shortcutsOpen = $state(false), subjectMenu = $state(false);
  let settingsSection=$state('general'),checkingReady=$state(false),directionDraft=$state('');
  let readyController:AbortController|undefined,readyPending:Promise<Completion>|undefined;
  let loading = $state(true), banner = $state(''), toast = $state(''), saveError = $state(''), conflictPath = $state('');
  let readonlyFile = $state<unknown>(null), settingsReadOnly = $state(false);
  let subjectCount = $state(0), recentIds: string[] = [], library = '';
  let libraryAvailable = $state(true);
  const catalogue = new Catalogue(() => revision++);
  const thumbnailCache = new Map<string, {stamp:string;value:Promise<ThumbnailGraph>}>();
  const deleting = new Set<string>();
  const owned = new Map<string, { session: RoomSession; persistence: SubjectPersistence }>();
  const writer = new DebouncedWriter(async value => {
    if (desktop) await invoke('save_settings',{ document:value }); else localStorage.setItem('lantern.settings',JSON.stringify(value));
  }, error => saveError = String(error));
  const summary = $derived.by(() => { revision; return session ? room.statsSummary(session.subject) : null; });
  const running = $derived.by(() => { revision; return session?.running ? {...session.running} : null; });
  /** RS-19: the open subject's direction, as stored. */
  const savedDirection = $derived.by(() => { revision; return session?.subject.rooms[room.id].direction ?? ''; });
  const anyRunning = $derived.by(() => { revision; return [...owned.values()].some(entry => !!entry.session.running); });
  const unavailable=$derived(health instanceof ProviderError&&['not-installed','not-logged-in'].includes(health.kind)?health:null);
  async function checkReady(){if(anyRunning||checkingReady)return;checkingReady=true;readyController=new AbortController();
    try{if(desktop)await invoke('provider_status');readyPending=provider.stream({requestId:crypto.randomUUID(),system:'Be terse.',prompt:'Say only: ready.',model:'haiku',effort:'low',cancel:readyController.signal},()=>{});await readyPending;}
    catch(e){if(!(e instanceof ProviderError))banner=String(e);}finally{checkingReady=false;readyPending=undefined;}
  }
  function preferencesChanged() {
    if (settingsReadOnly) return;
    settings = validateSettings(settings,defaults);
    writer.schedule(settings);
    document.documentElement.dataset.reduceMotion = settings.appearance.reduceMotion === 'on' ? 'on' : 'system';
    for (const entry of owned.values()) { entry.session.displayName = settings.user.displayName; entry.session.budgetTokens = settings.learn.contextBudget; }
  }
  async function navigate(next: string) {
    if (next === room.defaultSpace && !session && recentIds[0]) await open(recentIds[0]);
    if (next === room.defaultSpace && !session) return;
    space = next; subjectMenu = false;
    if (next !== room.defaultSpace) { readonlyFile=null; await refreshCatalogue(); }
  }
  async function open(id: string) {
    if (deleting.has(id)) return;
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
      else { recentIds=browserRecordOpen(id,at).recents; }
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
  async function createSubject(title: string, tone: Tone, model: string, direction = '') {
    if (!libraryAvailable || unavailable) throw new Error(strings.cliNotReady);
    if (!isValidModel(model)) throw new Error(strings.invalidModel);
    const subject=room.newSubject(checkedTitle(title),tone,settings);
    subject.rooms[room.id].model=model;
    const given=checkedDirection(direction); if(given) subject.rooms[room.id].direction=given;
    const saved=await storage.save(library,subject,null,true);
    if(saved.kind !== 'saved') throw new Error('Subject id collision');
    const entry=own({subject,stamp:saved.stamp,readOnly:false}); owned.set(subject.id,entry); subjectCount++;
    await open(subject.id); void entry.session.initialize();
  }
  async function refreshCatalogue() {
    for (const [id, entry] of owned) if (!deleting.has(id)) {
      try {await entry.persistence.flush();} catch(e) {saveError=String(e);}
    }
    try {
      const summaries = desktop ? await invoke<SubjectSummary[]>('list_subjects',{library}) : browserSummaries();
      const state = desktop ? await invoke<LibraryState>('read_state') : browserLibraryState();
      catalogue.replace(summaries,state); subjectCount=summaries.length;
      recentIds=catalogue.recent.map(s=>s.id); libraryAvailable=true;
    } catch(e) {libraryAvailable=false;catalogue.replace([],{recents:[],lastOpenedAt:{}});subjectCount=0;banner=strings.libraryUnavailable+' '+String(e);}
  }
  async function renameSubject(id: string, title: string) {
    title=checkedTitle(title); if(deleting.has(id))return;
    let entry=owned.get(id);
    if (!entry) { const loaded=await storage.load(library,id); if(loaded.readOnly)throw new Error(strings.readOnly); entry=own(loaded);owned.set(id,entry); }
    await entry.persistence.refresh();
    entry.session.subject.title=title; entry.session.touch(); await entry.persistence.flush(); await refreshCatalogue();
  }
  async function removeSubject(id: string) {
    if(deleting.has(id))return;deleting.add(id);
    const entry=owned.get(id);
    try {
      entry?.session.cancel();
      while(entry?.session.running)await new Promise(resolve=>setTimeout(resolve,10));
      await entry?.persistence.flush();
      if(desktop)await invoke('delete_subject',{library,id});else browserDelete(id);
      await entry?.persistence.close();owned.delete(id);
      if(session?.subject.id===id)session=null;
      readonlyFile=null;revision++;await refreshCatalogue();
    } finally {deleting.delete(id);}
  }
  const librarySpaces: LibrarySpaces = {
    catalogue,provider,get available(){return libraryAvailable;},get providerReady(){return !unavailable;},
    create:createSubject,open,rename:renameSubject,remove:removeSubject,
    async reveal(id){if(desktop)await invoke('reveal_subject',{library,id});else {await storage.load(library,id);throw new Error(strings.explorerDesktop);}},
    async filePath(id){if(desktop)return invoke<string>('subject_file',{library,id});throw new Error(strings.explorerDesktop);},
    thumbnail(summary){
      const stamp=JSON.stringify([summary.modifiedNs,summary.size]);
      let cached=thumbnailCache.get(summary.path);
      if(cached?.stamp!==stamp){
        const value=desktop?invoke<ThumbnailGraph>('subject_thumbnail',{library,id:summary.id}):storage.load(library,summary.id).then(({subject})=>thumbnailGraph(subject.rooms[room.id].rootId,subject.rooms[room.id].nodes));
        cached={stamp,value};
        if(thumbnailCache.size>=100)thumbnailCache.delete(thumbnailCache.keys().next().value!);
        thumbnailCache.set(summary.path,cached);
        value.catch(()=>{if(thumbnailCache.get(summary.path)?.value===value)thumbnailCache.delete(summary.path);});
      }
      return cached!.value;
    },
    isRunning:id=>!!owned.get(id)?.session.running,
    settings(){settingsSection='provider';settingsOpen=true;},refresh:refreshCatalogue
  };
  async function retrySaves() {
    try { for(const entry of owned.values()) await entry.persistence.flush(); await writer.flush(); saveError=''; } catch(e) {saveError=String(e);}
  }
  async function switchLibrary(destination: string, mode: string) {
    if (anyRunning) throw new Error(strings.finishGeneration);
    switchingLibrary=true;
    try {
      for (const entry of owned.values()) await entry.persistence.flush(); await writer.flush();
      const result=await invoke<{path:string;collisions:{oldId:string;newId:string}[]}>('switch_library',{old:library,destination,mode,document:settings});
      for (const entry of owned.values()) await entry.persistence.close();
      owned.clear(); session=null; readonlyFile=null; recentIds=[]; library=result.path; settings.library.path=result.path;
      space='welcome'; banner='';thumbnailCache.clear();await refreshCatalogue();
      toast=strings.libraryChanged(result.path)+(result.collisions.length ? ' '+strings.collisionsRenamed(result.collisions.length) : '');
      revision++;
    } finally {switchingLibrary=false;}
  }
  async function flushClose(): Promise<void> {
    readyController?.abort();if(readyPending)await readyPending.catch(()=>{});
    for(const entry of owned.values()) entry.session.cancel();
    while([...owned.values()].some(entry=>entry.session.running)) await new Promise(resolve=>setTimeout(resolve,10));
    for(const entry of owned.values()) await entry.persistence.close(); await writer.flush(); await windowMemory?.flush();
  }
  // RS-15: a press anywhere outside the menu (graph, read view, header) closes it; capture
  // phase, because d3-zoom stops propagation inside the graph.
  function outside(e: PointerEvent) {
    if(subjectMenu && e.target instanceof Element && !e.target.closest('.subject-menu, header .subject')) subjectMenu=false;
  }
  function key(e: KeyboardEvent) {
    if(e.ctrlKey && ['1','2','3'].includes(e.key)) {e.preventDefault(); void navigate(room.spaces[Number(e.key)-1].id);}
    else if(e.ctrlKey && e.key===',') {e.preventDefault(); settingsSection='general';settingsOpen=true;}
    else if(e.key==='Escape') {
      if(document.querySelector('dialog[open]')) return;
      if(settingsOpen) settingsOpen=false; else if(shortcutsOpen) shortcutsOpen=false; else if(subjectMenu) subjectMenu=false; else if(space===room.defaultSpace)session?.cancel();
    } else if(e.key==='?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) shortcutsOpen=!shortcutsOpen;
  }
  onMount(()=> {
    let unlisten: (()=>void) | undefined, refresh: ReturnType<typeof setInterval> | undefined;
    void (async()=> {
      try {
        if(desktop) {
          const loaded=await invoke<{document:unknown;readOnly:boolean;recovered:boolean;transferRecovered?:boolean;defaultLibrary:string;defaultName:string}>('load_settings');
          defaults=defaultSettings(loaded.defaultLibrary,loaded.defaultName);
          settings=validateSettings(loaded.document,defaults); settingsReadOnly=loaded.readOnly;
          if(loaded.recovered) toast=strings.settingsRecovered; if(loaded.readOnly) banner=strings.readOnly;
          if(loaded.transferRecovered)toast=strings.transferRecovered;
          library=settings.library.path;
          if(!loaded.readOnly && !(loaded.document as {library?:{path?:string}})?.library?.path) {
            try {library=await invoke<string>('validate_library',{path:library});settings.library.path=library;}catch(e){banner=strings.libraryUnavailable+' '+String(e);}
          }
          await invoke('import_poc',{library});
          try {const state=await invoke<{recents:string[];window?:unknown}>('read_state');recentIds=state.recents;
            windowMemory=await (await import('./window-memory')).rememberWindow(state.window,e=>saveError=String(e));
          } catch(e) {toast=String(e);}
          const {getCurrentWindow}=await import('@tauri-apps/api/window'); const window=getCurrentWindow();
          unlisten=await window.onCloseRequested(async e=> {e.preventDefault();try {await flushClose();await window.destroy();}catch(error){saveError=String(error);}});
        } else {
          defaults=defaultSettings('browser','Learner');
          try {settings=validateSettings(JSON.parse(localStorage.getItem('lantern.settings')??'{}'),defaultSettings('browser','Learner'));}catch{settings=defaultSettings('browser','Learner');}
          library='browser';
          try {recentIds=JSON.parse(localStorage.getItem('lantern.recents')??'[]');}catch{recentIds=[];}
        }
        await refreshCatalogue();
        if(desktop){const status=await invoke<{kind:string}>('provider_status');if(status.kind==='not-installed')health=new ProviderError('not-installed','');}
        preferencesChanged();
        const query=new URLSearchParams(location.search);
        // Retained deterministic Study harness for focused graph/panel tests.
        if(import.meta.env.DEV && query.has('study')) {
          if(query.has('resume') && recentIds[0]) await open(recentIds[0]); else await createSubject(query.get('subject')||'Ocean tides',settings.learn.defaultTone,settings.provider.defaultModel);
        }
        refresh=setInterval(()=> { if(!switchingLibrary) for(const [id,entry] of owned) if(!deleting.has(id)&&!entry.session.running) entry.persistence.refresh().catch(e=>saveError=String(e)); },1000);
      }catch(e){banner=String(e);}finally{loading=false;}
    })();
    const beforeUnload=()=> { for(const entry of owned.values()) {entry.session.cancel();void entry.persistence.flush();}void writer.flush(); };
    window.addEventListener('beforeunload',beforeUnload);
    return ()=>{catalogue.dispose();unlisten?.();windowMemory?.dispose();clearInterval(refresh);window.removeEventListener('beforeunload',beforeUnload);};
  });
</script>
<svelte:window onkeydown={key} onpointerdowncapture={outside} />
<header>
  <button class="mark" onclick={()=>navigate('welcome')} title={strings.welcome} aria-label={strings.welcome}>◈</button><span class="room">{room.name}</span>
  <nav>{#each room.spaces as item}<button aria-label={item.label} title={`${item.label} · Ctrl+${item.shortcutIndex}`} aria-current={space===item.id?'page':undefined} disabled={item.id!=='welcome' && !subjectCount} onclick={()=>navigate(item.id)}>{item.icon}</button>{/each}</nav>
  {#if session && space!=='welcome'}<button class="subject" onclick={()=>subjectMenu=!subjectMenu} title={session.subject.title}>{session.subject.title}{#if running}<span class="busy-dot">·</span>{/if}</button>{/if}
  {#if summary && space!=='welcome'}<small title={settings.appearance.showTokenStats?summary.tooltip:undefined}>{summary.text}</small>{/if}
  <button class="gear" aria-label={strings.settings} title={strings.settings} onclick={()=>{settingsSection='general';settingsOpen=true;}}>⚙</button>
</header>
{#if banner}<div class="banner" role="alert">{banner}<button onclick={()=>banner=''}>{strings.close}</button></div>{/if}
{#if unavailable}<div class="banner provider-notice" role="alert"><div><strong>{strings.errorKinds[unavailable.kind]}</strong><p>{unavailable.kind==='not-installed'?strings.installInstructions:strings.signinInstructions}</p></div><button onclick={()=>{settingsSection='provider';settingsOpen=true;}}>{strings.settings}</button><button disabled={anyRunning||checkingReady} onclick={checkReady}>{strings.checkAgain}</button>{#if checkingReady}<button onclick={()=>readyController?.abort()}>{strings.cancel}</button>{/if}</div>{/if}
{#if saveError}<div class="banner error" role="alert">{strings.saveFailed}<details><summary>{strings.details}</summary>{saveError}</details><button onclick={retrySaves}>{strings.retry}</button></div>{/if}
{#if toast}<div class="toast" role="status">{toast}<button onclick={()=>toast=''}>{strings.close}</button></div>{/if}
{#if subjectMenu && session}<div class="subject-menu">
  <input aria-label={strings.title} value={session.subject.title} maxlength="120" onkeydown={e=>{if(e.key==='Enter' && e.currentTarget.value.trim()){session!.subject.title=e.currentTarget.value.trim();session!.touch();subjectMenu=false;}}} />
  <label>{strings.tone}<select value={typeof session.subject.rooms[room.id].tone==='string'?session.subject.rooms[room.id].tone:'custom'} onchange={e=>{session!.subject.rooms[room.id].tone=e.currentTarget.value==='custom'?{custom:''}:e.currentTarget.value as any;session!.touch();toast=strings.appliesNext;}}>{#each ['eli5','curious','student','engineer','expert','custom'] as tone}<option>{tone}</option>{/each}</select></label>
  {#if typeof session.subject.rooms[room.id].tone==='object'}<textarea aria-label={strings.customTone} maxlength="300" value={(session.subject.rooms[room.id].tone as {custom:string}).custom} onblur={e=>{session!.subject.rooms[room.id].tone={custom:e.currentTarget.value};session!.touch();}}></textarea>{/if}
  <label>{strings.direction}<textarea class="direction" rows="3" placeholder={strings.directionPlaceholder} value={savedDirection}
    oninput={e=>directionDraft=e.currentTarget.value} onfocus={e=>directionDraft=e.currentTarget.value}
    onblur={e=>{const value=e.currentTarget.value;if([...value].length>DIRECTION_LIMIT)return;const next=checkedDirection(value);if(next===savedDirection)return;if(next)session!.subject.rooms[room.id].direction=next;else delete session!.subject.rooms[room.id].direction;session!.touch();toast=strings.appliesNext;}}></textarea></label>
  {#if [...directionDraft].length>=400}<small class="direction-count" class:over={[...directionDraft].length>DIRECTION_LIMIT} role="status">{[...directionDraft].length} / {DIRECTION_LIMIT}{[...directionDraft].length>DIRECTION_LIMIT?' · '+strings.directionOver([...directionDraft].length-DIRECTION_LIMIT,DIRECTION_LIMIT):''}</small>{/if}
  <div class="field"><label for="subject-model">{strings.defaultModel}</label><ModelPicker id="subject-model" value={session.subject.rooms[room.id].model} label={strings.defaultModel} commit={model=>{session!.subject.rooms[room.id].model=model;session!.touch();toast=strings.appliesNext;}} /></div>
  <label>{strings.defaultEffort}<select value={session.subject.rooms[room.id].effort} onchange={e=>{session!.subject.rooms[room.id].effort=e.currentTarget.value as any;session!.touch();toast=strings.appliesNext;}}>{#each ['low','medium','high','xhigh','max'] as effort}<option>{effort}</option>{/each}</select></label>
</div>{/if}
<div class="spaces">{#if loading}<p>{strings.loading}</p>{:else if readonlyFile}<pre>{JSON.stringify(readonlyFile,null,2)}</pre>{:else}{#each room.spaces as item}{@const Component=item.component}<Component {session} {revision} visible={space===item.id} {settings} {navigate} {preferencesChanged} library={librarySpaces} />{/each}{/if}</div>
{#if settingsOpen}<SettingsPanel {settings} {defaults} {room} {health} {switchLibrary} initialSection={settingsSection} generating={anyRunning} provider={provider} changed={preferencesChanged} close={()=>settingsOpen=false} readonly={settingsReadOnly} />{/if}
{#if shortcutsOpen}<div class="shortcuts" role="dialog" aria-label={strings.shortcuts}><h2>{strings.shortcuts}</h2><pre>{strings.shortcutTable}</pre><button onclick={()=>shortcutsOpen=false}>{strings.close}</button></div>{/if}
<style>
  :global(html),:global(body),:global(#app) { height:100%; overflow:hidden; } header { height:56px; display:flex; align-items:center; gap:12px; padding:0 16px; border-bottom:1px solid var(--line); background:var(--surface); }
  :global(#app) {display:flex;flex-direction:column;} header {flex-shrink:0;} .banner {flex-shrink:0;}
  header button { background:none; padding:5px 9px; min-width:32px; }.mark { color:var(--accent); font-size:24px; }.room { color:var(--accent); font-size:13px; } nav { display:flex; gap:4px; } [aria-current='page'] { border-color:var(--accent); color:var(--accent); }
  .subject { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:35vw; border:0; } header small { color:var(--ink-mute); font-size:13px; margin-left:auto; }.gear { margin-left:auto; }
  .spaces { flex:1; min-height:0; overflow:hidden; }.banner { display:flex; align-items:center; gap:12px; background:var(--surface-2); padding:8px 16px; }.banner.error { color:var(--error-ink); }
  .toast { position:fixed; right:18px; top:70px; max-width:520px; padding:12px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; z-index:8; }
  .subject-menu { position:fixed; left:230px; top:52px; z-index:12; display:grid; gap:12px; padding:20px; background:var(--surface); border:1px solid var(--line); border-radius:8px; }.subject-menu label,.subject-menu .field { display:grid; gap:5px; }.subject-menu .direction { width:min(360px,70vw); resize:vertical; }.direction-count { color:var(--ink-mute); font-size:12px; }.direction-count.over { color:var(--error-ink); }
  .busy-dot { font-size:24px; color:var(--accent); animation:pulse 1.8s ease-in-out infinite; }.shortcuts { position:fixed; inset:15% 20%; z-index:20; padding:24px; background:var(--surface); border:1px solid var(--line); border-radius:12px; }.shortcuts pre { white-space:pre-wrap; }
  @keyframes pulse { 50% {opacity:.4;} } @media(max-width:1100px) { header small {display:none;} }
  @media(prefers-reduced-motion:reduce) { .busy-dot {animation:none;} }
</style>
