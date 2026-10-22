<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { strings } from '../ui/strings';
  // RS-53: header mark is the ember favicon of the accepted identity release; only its flame takes the room accent (see style).
  // Inlined as markup: an image URL would be a data: URI, which the app CSP blocks.
  import lanternMark from '../assets/identity/ember-on-dark-32.svg?raw';
  import { providerMode } from './provider-mode';
  import { DesktopProvider, HeldProvider, ObservedProvider, ProviderError, type InferenceProvider } from './provider';
  import { RoutingProvider } from './routing';
  import { endpointsOf } from './endpoints';
  import { endpointNameOf, modelChoices } from '../ui/model-choices.svelte';
  import { FakeEndpointTransport, fakeEndpointOptions } from './fake-endpoint';
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
  import TopBar from './TopBar.svelte';
  import FieldPanel from './FieldPanel.svelte';
  import { applyRoomChrome, windowTitle } from './window-chrome';
  import { isEndpointModel, isValidModel } from '../core/models';
  import AskBox from './amber/AskBox.svelte';
  import Amber from './amber/Amber.svelte';
  import { browserAmberStore, desktopAmberStore, emptyAmberState } from './amber/state';
  import { greeting, keepNotes, releasePage } from './amber/greeting';
  import type { Greeting } from './amber/greeting';
  import type { AmberState } from './amber/state';
  import SelectionCard from './amber/SelectionCard.svelte';
  import GuideLines from './amber/GuideLines.svelte';
  import { ASK_AMBER_EVENT } from '../ui/ask-amber';
  import type { AskAmberDetail } from '../ui/ask-amber';
  import { AmberChat } from './amber/chat';
  import { AmberFakeProvider } from './amber/fake-provider';
  import { amberContext, amberHelp } from './amber/help';
  import { browserAmberLog, desktopAmberLog } from './amber/log';
  const desktop = '__TAURI_INTERNALS__' in window;
  const fake = providerMode(desktop, import.meta.env.VITE_PROVIDER) === 'fake';
  let health = $state<Completion | ProviderError | null>(null);
  const fakeError=new URLSearchParams(location.search).get('error');
  /** RS-4: the registered rooms; RS-10: the current one (settings.ui.lastRoom). */
  let rooms = $state<readonly RoomDefinition[]>(baseRooms), roomId = $state(baseRooms[0].id);
  const room = $derived(rooms.find(r => r.id === roomId) ?? rooms[0]);
  $effect(() => { document.title = windowTitle(room); if (desktop) void applyRoomChrome(room, lanternMark).catch(e => console.warn('window chrome', e)); });
  const fakeDelay = Number(new URLSearchParams(location.search).get('delay') ?? 12);
  const fakeWait = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('wait') ?? 0) : 0;
  const fakeKind = import.meta.env.DEV&&fakeError&&Object.hasOwn(strings.errorKinds,fakeError)?fakeError as ErrorKind:undefined;
  /** CE-20 to CE-24: each endpoint's last call result, apart from Claude Code's `health` (SE-42). */
  let endpointHealth = $state<Record<string, Completion | ProviderError>>({});
  const routing = () => ({ endpoints: endpointsOf(settings.provider), defaultModel: settings.provider.defaultModel });
  // CE-22: every picker and model label follows the stored endpoints.
  $effect(() => { modelChoices.endpoints = endpointsOf(settings.provider); });
  const reportEndpoint = (id: string, value: Completion | ProviderError) => { endpointHealth = { ...endpointHealth, [id]: value }; };
  const routed = (claude: InferenceProvider, transport: ConstructorParameters<typeof RoutingProvider>[1]) => new RoutingProvider(claude, transport, routing, reportEndpoint);
  const desktopBridge = fake ? null : new DesktopProvider();
  const desktopProvider = desktopBridge ? routed(new ObservedProvider(desktopBridge, value => health=value), desktopBridge) : null;
  const fakeEndpoint = fakeEndpointOptions(new URLSearchParams(location.search), import.meta.env.DEV ? strings.errorKinds : {});
  const fakeProviders = new Map<string, InferenceProvider>();
  /** One provider for every room, routing Claude Code and endpoint models (CE-23); in the browser build each room brings its own fake (IP-71). */
  function providerFor(r: RoomDefinition): InferenceProvider {
    if (desktopProvider) return desktopProvider;
    // One fake per room serves both paths, so its scenario (titles, counters) runs on across models.
    let p = fakeProviders.get(r.id); if (!p) { const inner = r.fakeProvider(fakeDelay, fakeKind); p = routed(new ObservedProvider(new HeldProvider(inner, fakeWait), value => health=value), new FakeEndpointTransport(inner, fakeEndpoint)); fakeProviders.set(r.id, p); }
    return p;
  }
  const provider = $derived(providerFor(room));
  // CO-40 to CO-49: Ask Amber, one temporary chat for the app. The browser build answers from Amber's own fake (IP-71).
  const amberErrorParam = new URLSearchParams(location.search).get('amberError');
  const amberFake = new AmberFakeProvider(fakeDelay, import.meta.env.DEV && amberErrorParam && Object.hasOwn(strings.errorKinds, amberErrorParam) ? amberErrorParam as ErrorKind : undefined);
  const amberProvider = desktopProvider ?? routed(new ObservedProvider(new HeldProvider(amberFake, fakeWait), value => health=value), new FakeEndpointTransport(amberFake, fakeEndpoint));
  let askOpen = $state(false), amberRevision = $state(0), askBox = $state<ReturnType<typeof AskBox>>();
  const amberChat = new AmberChat(amberProvider, desktop ? desktopAmberLog : browserAmberLog, () => settings.companion.model,
    () => amberHelp(rooms), () => amberContext(room, space, session), () => amberRevision++);
  function closeAsk() { amberChat.close(); askOpen = false; }
  // SE-50, CO-15, CO-21: Amber's spots and seen tips, in the app state file.
  const amberStore = desktop ? desktopAmberStore : browserAmberStore;
  let amberState = $state<AmberState>(emptyAmberState()), amber = $state<ReturnType<typeof Amber>>();
  const amberWriter = new DebouncedWriter<AmberState>(value => amberStore.save(value), e => console.warn('Amber state', e));
  function saveAmberState(next: AmberState) { amberState = next; amberWriter.schedule(next); }
  /** CO-41: Ctrl+J and the capsule's Ask open the bubble with Amber on, the box with Amber off. */
  function openAsk() { if (settings.companion.show && amber) void amber.open(true); else if (askOpen) askBox?.focus(); else askOpen = true; }
  /** CO-4: Hide turns the setting off and says where to turn it back on. */
  /** CO-4: the Ask button's menu turns Amber back on; it appears at its remembered spot. */
  function bringAmberBack() { closeAsk(); settings.companion.show = true; preferencesChanged(); if (toast === strings.amberHidden) toast = ''; }
  function hideAmber() { amberChat.close(); settings.companion.show = false; preferencesChanged(); toast = strings.amberHidden; }
  // CO-45, NP-54: each selection gets its own one-question chat, forgotten when the card closes.
  let selectionAsk = $state<{ detail: AskAmberDetail; chat: AmberChat } | null>(null), selectionRevision = $state(0);
  const amberLog = desktop ? desktopAmberLog : browserAmberLog;
  function openSelectionAsk(e: Event) {
    selectionAsk?.chat.close();
    const detail = (e as CustomEvent<AskAmberDetail>).detail;
    selectionAsk = { detail, chat: new AmberChat(amberProvider, amberLog, () => settings.companion.model, () => amberHelp(rooms), () => amberContext(room, space, session), () => selectionRevision++) };
  }
  function closeSelectionAsk() { selectionAsk?.chat.close(); selectionAsk = null; }
  // CO-42, CO-45: Amber thinks while its answer is on the way, and leans toward a selection card.
  const amberThinking = $derived.by(() => { void amberRevision; void selectionRevision; return amberChat.phase === 'thinking' || selectionAsk?.chat.phase === 'thinking'; });
  const amberLean = $derived(selectionAsk ? { x: selectionAsk.detail.rect.left, y: selectionAsk.detail.rect.bottom } : null);
  // CO-35 (v0.4.0 slice 8 wires the generation's wait); `?amberMood=working` shows the motion in development builds (CO-54).
  const amberMoodParam = import.meta.env.DEV ? new URLSearchParams(location.search).get('amberMood') : null;
  // CO-35, CO-36: while a generation of the open subject waits for its first words, Amber works and says what is happening.
  const amberWaiting = $derived.by(() => {
    void revision; const r = session?.running as { nodeId: string; task: string; text?: string } | null | undefined;
    if (!session || !r || r.text) return null;
    const line = room.companion?.waiting?.[r.task]; if (!line) return null;
    const title = session.subject.rooms[room.id]?.nodes[r.nodeId]?.title ?? session.subject.title;
    const said = line(title.length > 32 ? title.slice(0, 31) + '…' : title), local = endpointNameOf(String(session.subject.rooms[room.id]?.model ?? ''));
    // CE-41: a local model's first words can take a minute.
    return local ? `${said} ${strings.amberLocalWait(local)}` : said;
  });
  const amberWorking = $derived(!!amberWaiting || amberMoodParam === 'working');
  // CO-30 to CO-32: one greeting per launch, once Amber's state is read and no frame banner is up.
  let amberLoaded = $state(false), amberGreeted = false, amberGreeting = $state<Greeting | null>(null);
  $effect(() => {
    if (loading || !amberLoaded || amberGreeted) return;
    if (!settings.companion.show) { amberGreeted = true; return; }
    if (banner || providerNotice) return;
    amberGreeted = true;
    const said = untrack(() => greeting(amberState, __APP_VERSION__, subjectCount > 0 && !import.meta.env.VITE_DEMO /* the demo's seeded subject is no past visit */, { first: strings.amberFirstLaunch, updated: strings.amberUpdated, pool: strings.amberGreetings }));
    amberGreeting = said.greeting; saveAmberState(said.next);
  });
  /** UP-13: the release page, in the browser. */
  function openRelease(version: string) { const url = releasePage(version); if (desktop) void invoke('open_external', { url }).catch(e => toast = String(e)); else window.open(url, '_blank', 'noopener'); }
  $effect(() => { window.addEventListener(ASK_AMBER_EVENT, openSelectionAsk); return () => window.removeEventListener(ASK_AMBER_EVENT, openSelectionAsk); });
  const storage = desktop ? desktopStorage : browserStorage;
  let settings = $state(defaultSettings('', '', baseRooms));
  let defaults = $state(defaultSettings('', '', baseRooms));
  let switchingLibrary = $state(false);
  let windowMemory: Awaited<ReturnType<typeof import('./window-memory').rememberWindow>>|undefined;
  let revision = $state(0), space = $state('welcome'), session = $state<RoomSession | null>(null);
  let settingsOpen = $state(false), shortcutsOpen = $state(false), panelOpen = $state(false), roomMenu = $state(false), fieldWidth = $state(0);
  // RS-15: a panel reopened while it still folds away starts fresh (empty filter), not as the closing one.
  let panelGeneration = $state(0);
  $effect.pre(() => { if (panelOpen) untrack(() => panelGeneration++); });
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
  /** RS-15: the palette's subjects follow the catalogue, which signals through `revision`. */
  const paletteSubjects = $derived.by(() => { revision; return catalogue.opened; });
  const running = $derived.by(() => { revision; return session?.running ? {...session.running} : null; });
  const anyRunning = $derived.by(() => { revision; return [...owned.values()].some(entry => !!entry.session.running); });
  const cliProblem=$derived(health instanceof ProviderError&&['not-installed','not-logged-in'].includes(health.kind)?health:null);
  /** CE-26: with an endpoint set, Claude Code's banner shows only while a Claude Code model is in use (the open subject's, else the default). With no endpoint, nothing changes. */
  const claudeInUse=$derived.by(()=>{revision;if(!endpointsOf(settings.provider).length)return true;const model=session?.subject.rooms[room.id]?.model??settings.provider.defaultModel;return !isEndpointModel(String(model??''));});
  const unavailable=$derived(cliProblem&&claudeInUse?cliProblem:null);
  /** A not-installed banner can be closed; it stays closed for this launch. */
  let installNoticeClosed=$state(false);
  const providerNotice=$derived(unavailable&&!(unavailable.kind==='not-installed'&&installNoticeClosed)?unavailable:null);
  const updater=new UpdateController();
  const showUpdateNotice=$derived(updater.fromLaunch&&['available','downloading','installing'].includes(updater.phase)&&shouldShowNotice(settings,updater.version,anyRunning&&updater.phase==='available'));
  /** UP-1, UP-21: a check the server answered counts, however it was started. */
  async function checkUpdates(launch:boolean){if(await updater.check(launch,settings.developer.updateFolder)){settings.ui.lastUpdateCheck=Date.now();preferencesChanged();}}
  /** UP-31: every pending save lands before the installer closes the app. */
  async function installUpdate(){if(anyRunning)return;
    // CO-31: the release's notes are kept for Amber's first greeting after the update.
    saveAmberState(keepNotes(amberState,updater.version,updater.notes));
    await updater.install(async()=>{for(const entry of owned.values())await entry.persistence.flush();await writer.flush();await amberWriter.flush();await windowMemory?.flush();});}
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
    space = next; panelOpen = false;
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
    if (!libraryAvailable || (cliProblem && !isEndpointModel(model))) throw new Error(strings.cliNotReady);
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
    space='welcome'; readonlyFile=null; panelOpen=false; revision++;
    await refreshCatalogue();
  }
  // RS-15: a press anywhere outside the field's panel (graph, read view, header) closes it; the field's own
  // click toggles it. Capture phase, because d3-zoom stops propagation inside the graph.
  function outside(e: PointerEvent) {
    if(panelOpen && e.target instanceof Element && !e.target.closest('.field-panel, header .subject-field')) panelOpen=false;
    if(roomMenu && e.target instanceof Element && !e.target.closest('.room-chip')) roomMenu=false;
  }
  function key(e: KeyboardEvent) {
    if(e.ctrlKey && e.shiftKey && /^Digit[1-9]$/.test(e.code) && rooms.length>1) {const target=rooms[Number(e.code.slice(5))-1]; if(target){e.preventDefault(); void switchRoom(target.id);}}
    else if(e.ctrlKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {const target=room.spaces.find(item=>item.shortcutIndex===Number(e.key)); if(target){e.preventDefault(); void navigate(target.id);}}
    // GV-76: Ctrl+K opens or closes the field's panel from any focus, text fields included.
    else if(e.ctrlKey && !e.shiftKey && !e.altKey && e.code==='KeyK') {e.preventDefault(); roomMenu=false; panelOpen=!panelOpen;}
    else if(e.ctrlKey && e.key===',') {e.preventDefault(); settingsSection='general';settingsOpen=true;}
    // CO-41, GV-76: Ctrl+J anywhere, any focus: Amber's bubble with its field focused, or the box with Amber off.
    else if(e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase()==='j') {e.preventDefault(); openAsk();}
    else if(e.key==='Escape') {
      if(document.querySelector('dialog[open]')) return;
      if(settingsOpen) settingsOpen=false; else if(shortcutsOpen) shortcutsOpen=false; else if(roomMenu) roomMenu=false; else if(panelOpen) panelOpen=false; else if(space===room.defaultSpace)session?.cancel();
    } else if(e.key==='?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) shortcutsOpen=!shortcutsOpen;
  }
  onMount(()=> {
    let unlisten: (()=>void) | undefined, refresh: ReturnType<typeof setInterval> | undefined;
    void (async()=> {
      try {
        rooms=await roomsWithDevSample();
        void amberStore.load().then(value => amberState = value).catch(e => console.warn('Amber state', e)).finally(() => amberLoaded = true);
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
<TopBar {rooms} {room} {space} {subjectCount} title={session?.subject.title ?? null} busy={!!running} {summary} showTokenStats={settings.appearance.showTokenStats} {desktop} mark={lanternMark}
  {panelOpen} bind:roomMenu bind:fieldWidth {navigate} switchRoom={id=>void switchRoom(id)} openSettings={()=>{settingsSection='general';settingsOpen=true;}} togglePanel={()=>{roomMenu=false;panelOpen=!panelOpen;}} ask={settings.companion.show?undefined:openAsk} bringBack={settingsReadOnly?undefined:bringAmberBack} />
{#if banner}<div class="banner" role="alert">{banner}<button onclick={()=>banner=''}>{strings.close}</button></div>{/if}
{#if providerNotice}<div class="banner provider-notice" role="alert"><div><strong>{strings.errorKinds[providerNotice.kind]}</strong><p>{providerNotice.kind==='not-installed'?strings.installInstructions:strings.signinInstructions}</p></div><button onclick={()=>{settingsSection='provider';settingsOpen=true;}}>{strings.settings}</button><button disabled={anyRunning||checkingReady} onclick={checkReady}>{strings.checkAgain}</button>{#if checkingReady}<button onclick={()=>readyController?.abort()}>{strings.cancel}</button>{/if}{#if providerNotice.kind==='not-installed'}<button onclick={()=>installNoticeClosed=true}>{strings.close}</button>{/if}</div>{/if}
{#if saveError}<div class="banner error" role="alert">{strings.saveFailed}<details><summary>{strings.details}</summary>{saveError}</details><button onclick={retrySaves}>{strings.retry}</button></div>{/if}
{#if toast}<div class="toast" role="status">{toast}<button onclick={()=>toast=''}>{strings.close}</button></div>{/if}
{#if showUpdateNotice}<div class="toast update-notice" role="status">{updater.phase==='downloading'?strings.updateDownloading(updater.percent):updater.phase==='installing'?strings.updateInstalling:strings.updateAvailable(updater.version)}
  {#if updater.phase==='available'}<button onclick={()=>openRelease(updater.version)}>{strings.releaseNotes}</button><button disabled={anyRunning} title={anyRunning?strings.finishGeneration:undefined} onclick={installUpdate}>{strings.installUpdate}</button><button onclick={dismissUpdate}>{strings.updateLater}</button>{/if}</div>{/if}
{#if panelOpen}{#key panelGeneration}<FieldPanel {session} {room} {rooms} {revision} subjects={paletteSubjects} {fieldWidth}
  rename={title=>renameSubject(session!.subject.id,title)} changed={appliesNext=>{session!.touch();if(appliesNext)toast=strings.appliesNext;}}
  openSubject={id=>{panelOpen=false;void open(id);}} switchRoom={id=>{panelOpen=false;void switchRoom(id);}} openSettings={()=>{panelOpen=false;settingsSection='general';settingsOpen=true;}} />{/key}{/if}
<div class="spaces">{#if loading}<p>{strings.loading}</p>{:else if readonlyFile}<pre>{JSON.stringify(readonlyFile,null,2)}</pre>{:else}{#key room.id}{#each room.spaces as item (item.id)}{@const Component=item.component}<Component {session} {revision} visible={space===item.id} {settings} {navigate} {preferencesChanged} library={librarySpaces} />{/each}{/key}{/if}</div>
{#if !loading && settings.companion.show}<Amber bind:this={amber} {room} {space} {desktop} {amberState} saveState={saveAmberState} chat={amberChat} revision={amberRevision} thinking={amberThinking} working={amberWorking} lean={amberLean} greeting={amberGreeting} waiting={amberWaiting} greeted={()=>amberGreeting=null} {openRelease} hide={hideAmber} openSettings={()=>{settingsSection='provider';settingsOpen=true;}} />{/if}
{#if settingsOpen}<SettingsPanel {settings} {defaults} {rooms} {health} {endpointHealth} {fakeEndpoint} {switchLibrary} {updater} checkUpdates={()=>checkUpdates(false)} {installUpdate} initialSection={settingsSection} generating={anyRunning} provider={provider} changed={preferencesChanged} close={()=>settingsOpen=false} readonly={settingsReadOnly} />{/if}
{#if selectionAsk}{#key selectionAsk}<SelectionCard detail={selectionAsk.detail} chat={selectionAsk.chat} revision={selectionRevision} close={closeSelectionAsk} openSettings={()=>{closeSelectionAsk();settingsSection='provider';settingsOpen=true;}} />{/key}{/if}
{#if askOpen}<AskBox bind:this={askBox} chat={amberChat} revision={amberRevision} close={closeAsk} openSettings={()=>{settingsSection='provider';settingsOpen=true;}} />{/if}
{#if shortcutsOpen}<div class="shortcuts" role="dialog" aria-label={strings.shortcuts}>{#if room.companion?.guide[space]?.length}<h2>{strings.whatCanIDo}</h2><GuideLines lines={room.companion.guide[space]} />{/if}<h2>{strings.shortcuts}</h2><pre>{strings.shortcutTable}{rooms.length>1?'\n'+strings.roomShortcuts(rooms.map(r=>r.name)):''}</pre><button onclick={()=>shortcutsOpen=false}>{strings.close}</button></div>{/if}
<style>
  :global(html),:global(body),:global(#app) { height:100%; overflow:hidden; }
  :global(#app) {display:flex;flex-direction:column;} .banner {flex-shrink:0;}
  /* RS-34: the frame's layers sit above the backdrop (z-index 0); the top bar (TopBar) sits above them. */
  .banner, .spaces { position:relative; z-index:1; }
  .spaces { flex:1; min-height:0; overflow:hidden; }.banner { display:flex; align-items:center; gap:12px; background:var(--surface-2); padding:8px 16px; }.banner.error { color:var(--error-ink); }
  .toast.update-notice { top:auto; bottom:18px; display:flex; align-items:center; gap:8px; }
  .toast { position:fixed; right:18px; top:70px; max-width:520px; padding:12px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; z-index:8; }
  .shortcuts { position:fixed; inset:15% 20%; z-index:20; padding:24px; background:var(--surface); border:1px solid var(--line); border-radius:12px; }.shortcuts pre { white-space:pre-wrap; margin:0; }.shortcuts { overflow:auto; display:grid; align-content:start; gap:10px; }.shortcuts h2 { font-size:15px; margin:0; }.shortcuts button { justify-self:start; }
</style>
