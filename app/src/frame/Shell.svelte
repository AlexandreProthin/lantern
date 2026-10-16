<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { strings } from '../ui/strings';
  // RS-53: header mark is the ember favicon of the accepted identity release; only its flame takes the room accent (see style).
  // Inlined as markup: an image URL would be a data: URI, which the app CSP blocks.
  import lanternMark from '../assets/identity/ember-on-dark-32.svg?raw';
  import { providerMode } from './provider-mode';
  import { DesktopProvider, ObservedProvider, ProviderError } from './provider';
  import type { Completion, ErrorKind } from './provider';
  import { rooms as baseRooms, roomsWithDevSample } from '../rooms';
  import type { RoomDefinition, RoomSession } from './room';
  import { desktopStorage, SubjectPersistence } from './persistence';
  import type { Loaded } from './persistence';
  import { browserStorage, browserSummaries, browserLibraryState, browserRecordOpen, browserDelete } from './browser-storage';
  import { Catalogue } from './catalogue';
  import type { SubjectSummary, LibraryState } from './catalogue';
  import { thumbnailGraph } from './library-spaces';
  import type { LibrarySpaces, ThumbnailGraph } from './library-spaces';
  import { checkedTitle, checkedDirection } from '../core/model';
  import type { Subject, Tone } from '../core/model';
  import { defaultSettings, validateSettings } from './settings';
  import { DebouncedWriter } from './debounced-writer';
  import { UpdateController } from './updates.svelte';
  import { shouldCheckAtLaunch, shouldShowNotice } from './updates';
  import SettingsPanel from './SettingsPanel.svelte';
  import Backdrop from './Backdrop.svelte';
  import WindowControls from './WindowControls.svelte';
  import { applyRoomChrome, windowTitle } from './window-chrome';
  import ModelPicker from '../ui/ModelPicker.svelte';
  import { isValidModel } from '../core/models';
  const desktop = '__TAURI_INTERNALS__' in window;
  const fake = providerMode(desktop, import.meta.env.VITE_PROVIDER) === 'fake';
  let health = $state<Completion | ProviderError | null>(null);
  const fakeError=new URLSearchParams(location.search).get('error');
  /** RS-4: the registered rooms; RS-10: the current one (settings.ui.lastRoom). */
  let rooms = $state<readonly RoomDefinition[]>(baseRooms), roomId = $state(baseRooms[0].id);
  const room = $derived(rooms.find(r => r.id === roomId) ?? rooms[0]);
  $effect(() => { document.title = windowTitle(room); if (desktop) void applyRoomChrome(room, lanternMark).catch(e => console.warn('window chrome', e)); });
  const fakeDelay = Number(new URLSearchParams(location.search).get('delay') ?? 12);
  const fakeKind = import.meta.env.DEV&&fakeError&&Object.hasOwn(strings.errorKinds,fakeError)?fakeError as ErrorKind:undefined;
  const desktopProvider = fake ? null : new ObservedProvider(new DesktopProvider(), value => health=value);
  const fakeProviders = new Map<string, ObservedProvider>();
  /** One CLI provider for every room; in the browser build each room brings its own fake (IP-71). */
  function providerFor(r: RoomDefinition): ObservedProvider {
    if (desktopProvider) return desktopProvider;
    let p = fakeProviders.get(r.id); if (!p) { p = new ObservedProvider(r.fakeProvider(fakeDelay, fakeKind), value => health=value); fakeProviders.set(r.id, p); }
    return p;
  }
  const provider = $derived(providerFor(room));
  const storage = desktop ? desktopStorage : browserStorage;
  let settings = $state(defaultSettings('', '', baseRooms));
  let defaults = $state(defaultSettings('', '', baseRooms));
  let switchingLibrary = $state(false);
  let windowMemory: Awaited<ReturnType<typeof import('./window-memory').rememberWindow>>|undefined;
  let revision = $state(0), space = $state('welcome'), session = $state<RoomSession | null>(null);
  let settingsOpen = $state(false), shortcutsOpen = $state(false), subjectMenu = $state(false), roomMenu = $state(false);
  let settingsSection=$state('general'),checkingReady=$state(false);
  let readyController:AbortController|undefined,readyPending:Promise<Completion>|undefined;
  let loading = $state(true), banner = $state(''), toast = $state(''), saveError = $state(''), conflictPath = $state('');
  let readonlyFile = $state<unknown>(null), settingsReadOnly = $state(false);
  let subjectCount = $state(0), recentIds: string[] = [], library = '';
  let libraryAvailable = $state(true);
  const catalogue = new Catalogue(() => revision++);
  const thumbnailCache = new Map<string, {stamp:string;value:Promise<ThumbnailGraph>}>();
  const deleting = new Set<string>();
  const owned = new Map<string, { session: RoomSession; persistence: SubjectPersistence; room: string }>();
  /** RS-12: each room keeps its own open subject for the session. */
  const openByRoom: Record<string, string | null> = {};
  const writer = new DebouncedWriter(async value => {
    if (desktop) await invoke('save_settings',{ document:value }); else localStorage.setItem('lantern.settings',JSON.stringify(value));
  }, error => saveError = String(error));
  const summary = $derived.by(() => { revision; return session ? room.statsSummary(session.subject) : null; });
  const running = $derived.by(() => { revision; return session?.running ? {...session.running} : null; });
  const anyRunning = $derived.by(() => { revision; return [...owned.values()].some(entry => !!entry.session.running); });
  const unavailable=$derived(health instanceof ProviderError&&['not-installed','not-logged-in'].includes(health.kind)?health:null);
  const updater=new UpdateController();
  const showUpdateNotice=$derived(updater.fromLaunch&&['available','downloading','installing'].includes(updater.phase)&&shouldShowNotice(settings,updater.version,anyRunning&&updater.phase==='available'));
  /** UP-1, UP-21: a check the server answered counts, however it was started. */
  async function checkUpdates(launch:boolean){if(await updater.check(launch,settings.developer.updateFolder)){settings.ui.lastUpdateCheck=Date.now();preferencesChanged();}}
  /** UP-31: every pending save lands before the installer closes the app. */
  async function installUpdate(){if(anyRunning)return;await updater.install(async()=>{for(const entry of owned.values())await entry.persistence.flush();await writer.flush();await windowMemory?.flush();});}
  function dismissUpdate(){settings.ui.dismissedUpdate=updater.version;void updater.release();preferencesChanged();}
  async function checkReady(){if(anyRunning||checkingReady)return;checkingReady=true;readyController=new AbortController();
    try{if(desktop)await invoke('provider_status');readyPending=provider.stream({requestId:crypto.randomUUID(),system:'Be terse.',prompt:'Say only: ready.',model:'opus',effort:'low',cancel:readyController.signal},()=>{});await readyPending;}
    catch(e){if(!(e instanceof ProviderError))banner=String(e);}finally{checkingReady=false;readyPending=undefined;}
  }
  function preferencesChanged() {
    if (settingsReadOnly) return;
    settings = validateSettings(settings,defaults,rooms);
    writer.schedule(settings);
    document.documentElement.dataset.reduceMotion = settings.appearance.reduceMotion === 'on' ? 'on' : 'system';
    document.documentElement.dataset.backdrop = settings.appearance.backdrop ? 'on' : 'off';
    for (const entry of owned.values()) rooms.find(r => r.id === entry.room)?.applySettings(entry.session, settings);
    document.documentElement.dataset.room = room.id;
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
      const recents = desktop ? (await invoke<{ recents:string[] }>('record_open',{id,at})).recents : browserRecordOpen(id,at).recents;
      // ST-6: the stored list is shared; each room uses its own subjects from it.
      recentIds=recents.filter(r => r===id || catalogue.summaries.some(s => s.id===r));
    } catch (e) { banner=String(e); }
  }
  /** DM-66: each known room checks its own values; a visit to an unknown room is kept as it is. */
  const validateRooms = (subject: Subject) => { for (const r of rooms) if (subject.rooms[r.id]) r.validate(subject.rooms[r.id]); };
  function own(loaded: Loaded) {
    validateRooms(loaded.subject);
    let controller: RoomSession;
    const persistence = new SubjectPersistence(storage,library,loaded,result => {
      if (result.kind !== 'saved') {
        const recovered = $state(result.loaded.subject);
        controller.subject=recovered;
        if (result.kind === 'conflict') { toast=strings.conflict; conflictPath=result.conflictPath; } else toast=strings.diskReloaded;
        revision++;
      }
      saveError='';
    }, error=>saveError=String(error), 300, validateRooms);
    const reactiveSubject = $state(loaded.subject);
    const owner = room;
    controller=owner.prompts.createSession(reactiveSubject,providerFor(owner),()=> { persistence.schedule(controller.subject); revision++; },()=>revision++,settings);
    return {session:controller,persistence,room:owner.id};
  }
  async function createSubject(title: string, tone: Tone, model: string, direction = '') {
    if (!libraryAvailable || unavailable) throw new Error(strings.cliNotReady);
    if (!isValidModel(model)) throw new Error(strings.invalidModel);
    const subject=room.newSubject(checkedTitle(title),tone,settings,checkedDirection(direction));
    subject.rooms[room.id].model=model;
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
      const raw = desktop ? await invoke<SubjectSummary[]>('list_subjects',{library}) : browserSummaries();
      // ST-7: the room reads its own part of each summary; unreadable files have no room part.
      const summaries = raw.filter(s => !s.rooms || s.rooms[room.id]).map(s => s.rooms?.[room.id] ? {...s,...room.summarize(s.rooms[room.id])} : s);
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
      for (const r in openByRoom) if (openByRoom[r]===id) openByRoom[r]=null;
      readonlyFile=null;revision++;await refreshCatalogue();
    } finally {deleting.delete(id);}
  }
  const librarySpaces: LibrarySpaces = {
    catalogue,get provider(){return provider;},get available(){return libraryAvailable;},get providerReady(){return !unavailable;},
    create:createSubject,open,rename:renameSubject,remove:removeSubject,
    async reveal(id){if(desktop)await invoke('reveal_subject',{library,id});else {await storage.load(library,id);throw new Error(strings.explorerDesktop);}},
    async filePath(id){if(desktop)return invoke<string>('subject_file',{library,id});throw new Error(strings.explorerDesktop);},
    thumbnail(summary){
      const stamp=JSON.stringify([summary.modifiedNs,summary.size]);
      const cacheKey=`${room.id}:${summary.path}`;
      let cached=thumbnailCache.get(cacheKey);
      if(cached?.stamp!==stamp){
        const value=desktop?invoke<ThumbnailGraph>('subject_thumbnail',{library,id:summary.id,room:room.id}):storage.load(library,summary.id).then(({subject})=>thumbnailGraph(subject.rooms[room.id].rootId,subject.rooms[room.id].nodes));
        cached={stamp,value};
        if(thumbnailCache.size>=100)thumbnailCache.delete(thumbnailCache.keys().next().value!);
        thumbnailCache.set(cacheKey,cached);
        value.catch(()=>{if(thumbnailCache.get(cacheKey)?.value===value)thumbnailCache.delete(cacheKey);});
      }
      return cached!.value;
    },
    isRunning:id=>!!owned.get(id)?.session.running,
    settings(section='provider'){settingsSection=section;settingsOpen=true;},refresh:refreshCatalogue
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
      owned.clear(); for (const r in openByRoom) openByRoom[r]=null; session=null; readonlyFile=null; recentIds=[]; library=result.path; settings.library.path=result.path;
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
  /** RS-12/RS-23: open a room on its Welcome; its own open subject comes back. */
  async function switchRoom(id: string) {
    roomMenu=false;
    if (id===room.id || !rooms.some(r => r.id===id)) return;
    openByRoom[room.id]=session?.subject.id ?? null;
    document.documentElement.dataset.roomFade='on';
    roomId=id; settings.ui.lastRoom=id; preferencesChanged();
    const keep=openByRoom[id]; session=(keep && owned.get(keep)?.session) || null;
    space='welcome'; readonlyFile=null; subjectMenu=false; revision++;
    await refreshCatalogue();
  }
  // RS-15: a press anywhere outside the menu (graph, read view, header) closes it; capture
  // phase, because d3-zoom stops propagation inside the graph.
  function outside(e: PointerEvent) {
    if(subjectMenu && e.target instanceof Element && !e.target.closest('.subject-menu, header .subject')) subjectMenu=false;
    if(roomMenu && e.target instanceof Element && !e.target.closest('.room-chip')) roomMenu=false;
  }
  function key(e: KeyboardEvent) {
    if(e.ctrlKey && e.shiftKey && /^Digit[1-9]$/.test(e.code) && rooms.length>1) {const target=rooms[Number(e.code.slice(5))-1]; if(target){e.preventDefault(); void switchRoom(target.id);}}
    else if(e.ctrlKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {const target=room.spaces.find(item=>item.shortcutIndex===Number(e.key)); if(target){e.preventDefault(); void navigate(target.id);}}
    else if(e.ctrlKey && e.key===',') {e.preventDefault(); settingsSection='general';settingsOpen=true;}
    else if(e.key==='Escape') {
      if(document.querySelector('dialog[open]')) return;
      if(settingsOpen) settingsOpen=false; else if(shortcutsOpen) shortcutsOpen=false; else if(roomMenu) roomMenu=false; else if(subjectMenu) subjectMenu=false; else if(space===room.defaultSpace)session?.cancel();
    } else if(e.key==='?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) shortcutsOpen=!shortcutsOpen;
  }
  onMount(()=> {
    let unlisten: (()=>void) | undefined, refresh: ReturnType<typeof setInterval> | undefined;
    void (async()=> {
      try {
        rooms=await roomsWithDevSample();
        if(desktop) {
          const loaded=await invoke<{document:unknown;readOnly:boolean;recovered:boolean;transferRecovered?:boolean;defaultLibrary:string;defaultName:string}>('load_settings');
          defaults=defaultSettings(loaded.defaultLibrary,loaded.defaultName,rooms);
          settings=validateSettings(loaded.document,defaults,rooms); settingsReadOnly=loaded.readOnly;
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
          defaults=defaultSettings('browser','Learner',rooms);
          try {settings=validateSettings(JSON.parse(localStorage.getItem('lantern.settings')??'{}'),defaults,rooms);}catch{settings=defaultSettings('browser','Learner',rooms);}
          library='browser';
          try {recentIds=JSON.parse(localStorage.getItem('lantern.recents')??'[]');}catch{recentIds=[];}
        }
        roomId=settings.ui.lastRoom;
        await refreshCatalogue();
        if(desktop){const status=await invoke<{kind:string}>('provider_status');if(status.kind==='not-installed')health=new ProviderError('not-installed','');}
        preferencesChanged();
        if(shouldCheckAtLaunch(settings,Date.now(),desktop&&!settingsReadOnly))void checkUpdates(true);
        const query=new URLSearchParams(location.search);
        // Retained deterministic Study harness for focused graph/panel tests.
        if(import.meta.env.DEV && query.has('study')) {
          if(query.has('resume') && recentIds[0]) await open(recentIds[0]); else await createSubject(query.get('subject')||'Ocean tides',room.defaultTone(settings),settings.provider.defaultModel);
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
{#if !loading && settings.appearance.backdrop}<Backdrop {space} room={room.id} reduceSetting={settings.appearance.reduceMotion} />{/if}
<header data-tauri-drag-region>
  <button class="mark" onclick={()=>navigate('welcome')} title={strings.welcome} aria-label={strings.welcome}><span class="mark-art" aria-hidden="true">{@html lanternMark}</span></button>{#if rooms.length>1}<span class="room-chip" data-tauri-drag-region><button class="room" aria-haspopup="menu" aria-expanded={roomMenu} title={strings.rooms} onclick={()=>roomMenu=!roomMenu}>{room.name}</button>{#if roomMenu}<div class="room-menu" role="menu" aria-label={strings.rooms}>{#each rooms as r, i (r.id)}<button role="menuitemradio" aria-checked={r.id===room.id} title={`Ctrl+Shift+${i+1}`} onclick={()=>switchRoom(r.id)}><span class="swatch" style:background={r.accent['--accent']}></span>{r.name}</button>{/each}</div>{/if}</span>{:else}<span class="room">{room.name}</span>{/if}
  <nav data-tauri-drag-region>{#each room.spaces as item}<button aria-label={item.label} title={`${item.label} · Ctrl+${item.shortcutIndex}`} aria-current={space===item.id?'page':undefined} disabled={item.id!=='welcome' && !subjectCount} onclick={()=>navigate(item.id)}>{item.icon}</button>{/each}</nav>
  {#if session && space!=='welcome'}<button class="subject" onclick={()=>subjectMenu=!subjectMenu} title={session.subject.title}>{session.subject.title}{#if running}<span class="busy-dot">·</span>{/if}</button>{/if}
  {#if summary && space!=='welcome'}<small data-tauri-drag-region title={settings.appearance.showTokenStats?summary.tooltip:undefined}>{summary.text}</small>{/if}
  <button class="gear" aria-label={strings.settings} title={strings.settings} onclick={()=>{settingsSection='general';settingsOpen=true;}}>⚙</button>
  {#if desktop}<WindowControls />{/if}
</header>
{#if banner}<div class="banner" role="alert">{banner}<button onclick={()=>banner=''}>{strings.close}</button></div>{/if}
{#if unavailable}<div class="banner provider-notice" role="alert"><div><strong>{strings.errorKinds[unavailable.kind]}</strong><p>{unavailable.kind==='not-installed'?strings.installInstructions:strings.signinInstructions}</p></div><button onclick={()=>{settingsSection='provider';settingsOpen=true;}}>{strings.settings}</button><button disabled={anyRunning||checkingReady} onclick={checkReady}>{strings.checkAgain}</button>{#if checkingReady}<button onclick={()=>readyController?.abort()}>{strings.cancel}</button>{/if}</div>{/if}
{#if saveError}<div class="banner error" role="alert">{strings.saveFailed}<details><summary>{strings.details}</summary>{saveError}</details><button onclick={retrySaves}>{strings.retry}</button></div>{/if}
{#if toast}<div class="toast" role="status">{toast}<button onclick={()=>toast=''}>{strings.close}</button></div>{/if}
{#if showUpdateNotice}<div class="toast update-notice" role="status">{updater.phase==='downloading'?strings.updateDownloading(updater.percent):updater.phase==='installing'?strings.updateInstalling:strings.updateAvailable(updater.version)}
  {#if updater.phase==='available'}<button disabled={anyRunning} title={anyRunning?strings.finishGeneration:undefined} onclick={installUpdate}>{strings.installUpdate}</button><button onclick={dismissUpdate}>{strings.updateLater}</button>{/if}</div>{/if}
{#if subjectMenu && session}<div class="subject-menu">
  <input aria-label={strings.title} value={session.subject.title} maxlength="120" onkeydown={e=>{if(e.key==='Enter' && e.currentTarget.value.trim()){session!.subject.title=e.currentTarget.value.trim();session!.touch();subjectMenu=false;}}} />
  <room.subjectMenu visit={session.subject.rooms[room.id]} {revision} changed={appliesNext=>{session!.touch();if(appliesNext)toast=strings.appliesNext;}} />
  <div class="field"><label for="subject-model">{strings.defaultModel}</label><ModelPicker id="subject-model" value={session.subject.rooms[room.id].model} label={strings.defaultModel} commit={model=>{session!.subject.rooms[room.id].model=model;session!.touch();toast=strings.appliesNext;}} /></div>
  <label>{strings.defaultEffort}<select value={session.subject.rooms[room.id].effort} onchange={e=>{session!.subject.rooms[room.id].effort=e.currentTarget.value as any;session!.touch();toast=strings.appliesNext;}}>{#each ['low','medium','high','xhigh','max'] as effort}<option>{effort}</option>{/each}</select></label>
</div>{/if}
<div class="spaces">{#if loading}<p>{strings.loading}</p>{:else if readonlyFile}<pre>{JSON.stringify(readonlyFile,null,2)}</pre>{:else}{#key room.id}{#each room.spaces as item (item.id)}{@const Component=item.component}<Component {session} {revision} visible={space===item.id} {settings} {navigate} {preferencesChanged} library={librarySpaces} />{/each}{/key}{/if}</div>
{#if settingsOpen}<SettingsPanel {settings} {defaults} {rooms} {health} {switchLibrary} {updater} checkUpdates={()=>checkUpdates(false)} {installUpdate} initialSection={settingsSection} generating={anyRunning} provider={provider} changed={preferencesChanged} close={()=>settingsOpen=false} readonly={settingsReadOnly} />{/if}
{#if shortcutsOpen}<div class="shortcuts" role="dialog" aria-label={strings.shortcuts}><h2>{strings.shortcuts}</h2><pre>{strings.shortcutTable}{rooms.length>1?'\n'+strings.roomShortcuts(rooms.map(r=>r.name)):''}</pre><button onclick={()=>shortcutsOpen=false}>{strings.close}</button></div>{/if}
<style>
  :global(html),:global(body),:global(#app) { height:100%; overflow:hidden; } header { height:56px; display:flex; align-items:center; gap:12px; padding:0 16px; border-bottom:1px solid var(--glass-line); background:var(--glass); backdrop-filter:var(--glass-blur); }
  :global(#app) {display:flex;flex-direction:column;} header {flex-shrink:0;} .banner {flex-shrink:0;}
  /* RS-34: the frame's layers sit above the backdrop (z-index 0). */
  header, .banner, .spaces { position:relative; z-index:1; }
  /* The room menu opens from the header, so the header sits above the spaces. */
  header { z-index:2; }
  header button { background:none; padding:5px 9px; min-width:32px; }.mark { display:flex; align-items:center; padding:4px 6px; }.mark-art, .mark-art :global(svg) { display:block; width:28px; height:28px; }
  /* The flame is the mark's only path with its own fill; it takes the room's accent. */
  .mark-art :global(path[fill]) { fill:var(--accent); transition:fill .4s ease; }
  .room { color:var(--accent); font-size:13px; } nav { display:flex; gap:4px; } [aria-current='page'] { border-color:var(--accent); color:var(--accent); }
  .subject { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:35vw; border:0; } header small { color:var(--ink-mute); font-size:13px; margin-left:auto; }.gear { margin-left:auto; }
  .spaces { flex:1; min-height:0; overflow:hidden; }.banner { display:flex; align-items:center; gap:12px; background:var(--surface-2); padding:8px 16px; }.banner.error { color:var(--error-ink); }
  .toast.update-notice { top:auto; bottom:18px; display:flex; align-items:center; gap:8px; }
  .toast { position:fixed; right:18px; top:70px; max-width:520px; padding:12px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; z-index:8; }
  .subject-menu { position:fixed; left:230px; top:52px; z-index:12; display:grid; gap:12px; padding:20px; background:var(--surface); border:1px solid var(--line); border-radius:8px; }.subject-menu label,.subject-menu .field { display:grid; gap:5px; }
  .room-chip { position:relative; }.room-chip .room { border:0; padding:4px 6px; }.room-menu { position:absolute; left:0; top:36px; z-index:13; display:grid; gap:4px; min-width:160px; padding:8px; background:var(--surface); border:1px solid var(--line); border-radius:8px; }
  .room-menu button { display:flex; align-items:center; gap:8px; text-align:left; }.room-menu [aria-checked='true'] { border-color:var(--accent); }.swatch { width:10px; height:10px; border-radius:50%; box-shadow:0 0 8px currentColor; }
  .busy-dot { font-size:24px; color:var(--accent); animation:pulse 1.8s ease-in-out infinite; }.shortcuts { position:fixed; inset:15% 20%; z-index:20; padding:24px; background:var(--surface); border:1px solid var(--line); border-radius:12px; }.shortcuts pre { white-space:pre-wrap; }
  @keyframes pulse { 50% {opacity:.4;} } @media(max-width:1100px) { header small {display:none;} }
  @media(prefers-reduced-motion:reduce) { .busy-dot {animation:none;} }
</style>
