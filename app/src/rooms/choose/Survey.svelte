<script lang="ts">
  // CR-11, CR-14: Survey, the graph and reading panel as Study, with the counter rail in place of the divider and the decision board in place of the graph.
  import { untrack } from 'svelte';
  import type { SpaceProps } from '../../frame/room';
  import StudySplit from '../../ui/StudySplit.svelte';
  import type { ChooseSession } from './session';
  import SurveyGraph from './survey/SurveyGraph.svelte';
  import SurveyPanel from './survey/SurveyPanel.svelte';
  import Rail from './survey/Rail.svelte';
  import Board from './survey/Board.svelte';
  import { mayMove } from './survey/motion';

  let { session, revision, visible, settings, preferencesChanged, library }: SpaceProps = $props();
  const choose = $derived(session as ChooseSession | null);
  const busy = $derived.by(() => { revision; return !!choose?.running || !!choose?.research; });
  type PanelRequest = { kind: 'own' | 'delete'; nodeId: string; seq: number };
  let panelRequest = $state<PanelRequest | null>(null), linkPreview = $state<string | null>(null), rejecting = $state<string | null>(null);
  let board = $state<'closed' | 'open' | 'closing'>('closed');
  /** GV-55: the node menu hands *Add my own node* and *Delete* to the panel. */
  function openInPanel(kind: PanelRequest['kind'], nodeId: string) {
    if (settings.ui.studyCollapsed === 'panel') { settings.ui.studyCollapsed = 'none'; preferencesChanged(); }
    panelRequest = { kind, nodeId, seq: (panelRequest?.seq ?? 0) + 1 };
  }
  /** *Reject* from the node menu or the panel row: focus the node and open the panel's reason form. */
  function askReject(nodeId: string) {
    if (settings.ui.studyCollapsed === 'panel') { settings.ui.studyCollapsed = 'none'; preferencesChanged(); }
    choose?.setFocus(nodeId); rejecting = nodeId;
  }
  const closeBoard = () => { if (board === 'open') board = mayMove(settings) ? 'closing' : 'closed'; };
  const toggle = () => { if (board === 'closed') board = 'open'; else closeBoard(); };
  /** CR-61: the answer appears in the reading panel, on the subject. */
  function recommend() {
    if (!choose || choose.running) return;
    choose.setFocus(choose.visit.rootId);
    if (settings.ui.studyCollapsed === 'panel') { settings.ui.studyCollapsed = 'none'; preferencesChanged(); }
    void choose.run('recommend', choose.visit.rootId).catch(e => console.warn(String(e)));
  }
  // Esc closes the board before anything else reads it.
  function key(e: KeyboardEvent) {
    if (e.key !== 'Escape' || board !== 'open' || !visible || e.defaultPrevented) return;
    if (document.querySelector('dialog[open], .node-menu')) return;
    e.preventDefault(); e.stopPropagation(); closeBoard();
  }
  $effect(() => { if (!visible) untrack(() => { if (board !== 'closed') board = 'closed'; }); });
  $effect(() => { window.addEventListener('keydown', key, true); return () => window.removeEventListener('keydown', key, true); });
</script>
<StudySplit {settings} {preferencesChanged} {visible} ready={!!choose} panelBusy={busy}>
  {#snippet graph(shown)}
    <div class="survey-side">
      <div class="graph-kept" class:gone={board !== 'closed'}><SurveyGraph session={choose!} {revision} {settings} {preferencesChanged} {library} {linkPreview} {openInPanel} reject={askReject} visible={shown && board === 'closed'} /></div>
      {#if board !== 'closed'}<Board session={choose!} {revision} {settings} closing={board === 'closing'} onclose={closeBoard} onclosed={() => board = 'closed'} {recommend} />{/if}
    </div>
  {/snippet}
  {#snippet divider()}<Rail session={choose!} {revision} {settings} open={board === 'open'} {toggle} {recommend} />{/snippet}
  {#snippet panel()}<SurveyPanel session={choose!} {revision} showTokens={settings.appearance.showTokenStats} request={panelRequest} preview={id => linkPreview = id} {rejecting} setRejecting={id => rejecting = id} />{/snippet}
</StudySplit>
<style>
  .survey-side { position:relative; height:100%; min-width:0; }
  .graph-kept { height:100%; } .gone { display:none; }
</style>
