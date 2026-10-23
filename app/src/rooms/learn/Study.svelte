<script lang="ts">
  import type { SpaceProps } from '../../frame/room';
  import type { LearnSession } from './session';
  import StudySplit from '../../ui/StudySplit.svelte';
  import Graph from './Graph.svelte';
  import Panel from './Panel.svelte';
  import type { PanelRequest } from './actions';
  let { session, revision, visible, settings, navigate, preferencesChanged, library }: SpaceProps = $props();
  const learn = $derived(session as LearnSession | null);
  let panelRequest = $state<PanelRequest | null>(null), linkPreview = $state<string | null>(null);
  /** GV-55: the node menu hands *Rewrite explanation*, *Add my own node* and *Delete* to the panel. */
  function openInPanel(kind: PanelRequest['kind'], nodeId: string) {
    if (settings.ui.studyCollapsed === 'panel') { settings.ui.studyCollapsed = 'none'; preferencesChanged(); }
    panelRequest = { kind, nodeId, seq: (panelRequest?.seq ?? 0) + 1 };
  }
</script>
<StudySplit {settings} {preferencesChanged} {visible} ready={!!learn} panelBusy={!!learn?.running}>
  {#snippet graph(shown)}<Graph session={learn!} {revision} {navigate} {settings} {preferencesChanged} {openInPanel} {library} {linkPreview} visible={shown} />{/snippet}
  {#snippet panel()}<Panel session={learn!} {revision} showTokens={settings.appearance.showTokenStats} request={panelRequest} preview={id => linkPreview = id} />{/snippet}
</StudySplit>
