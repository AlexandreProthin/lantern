<script lang="ts">
  import { tick, untrack } from 'svelte';
  // The rooms' shared reading panel (PS-5): breadcrumb, labels, explanation, children, dialogue and composer.
  // The room supplies its vocabulary, rules, actions and three snippets (panel-types.ts).
  import Markdown from './Markdown.svelte';
  import Icon from './Icon.svelte';
  import { askAmber } from './ask-amber';
  import { strings } from './strings';
  import { phone } from './phone.svelte';
  import { withoutTitleHeading } from './markdown';
  import { modelLabel,durationLabel } from './format';
  import { isCodexModel, isEndpointModel } from '../core/models';
  import { endpointNameOf } from './model-choices.svelte';
  import { childrenOf, pathTo, deleteSubtree, editLabel, revertText, subtreeIds } from '../core/graph';
  import { shownIds } from '../core/visibility';
  import type { GraphNode, Turn } from '../core/model';
  import type { PanelRequest, PanelRoomView, PanelSession, PanelSnippets } from './panel-types';
  import { trace } from '../frame/debug/trace.svelte';
  let { session, room, placeholder, notice: noticeBody, footer, body, after, revision, showTokens = true, request = null, preview }: PanelSnippets & { session: PanelSession; room: PanelRoomView; revision: number; showTokens?: boolean; request?: PanelRequest | null; preview?: (id: string | null) => void } = $props();
  const visit = $derived.by(() => { revision; return session.visit; });
  const node = $derived(visit.nodes[visit.focusId]);
  /** The panel already shows the title: a text that opens with it as a heading is shown without that line (the stored text keeps it). */
  const shownText = (text: string) => withoutTitleHeading(text, node.title);
  const path = $derived(pathTo(visit, node.id));
  const kids = $derived(childrenOf(visit, node.id));
  const running = $derived.by(() => { revision; return session.running ? { ...session.running } : null; });
  const notice = $derived.by(() => { revision; return session.notice?.nodeId === node.id ? session.notice : null; });
  const busy = $derived(running?.nodeId === node.id);
  const readOnly = $derived(room.frozen(node, busy));
  const lit = $derived(room.conversable(node));
  // NP-71: a link to a node the learner cannot see yet is plain text (GV-120).
  const shown = $derived(room.opens ? shownIds(visit, room.opens) : null);
  const linkable = $derived(shown ? (id: string) => shown.has(id) : undefined);
  const drafts = $state<Record<string, string>>({});
  const editors = $state<Record<string, string>>({});
  const editDrafts = $state<Record<string, { title: string; hook: string; text: string }>>({});
  let compare = $state<GraphNode | Turn | null>(null);
  let adding = $state(false), ownTitle = $state(''), ownHook = $state(''), localError = $state('');
  let deleting = $state<string | null>(null), deleteDialog: HTMLDialogElement, compareDialog: HTMLDialogElement;
  let scroller: HTMLDivElement;
  let nearBottom=$state(true);
  let composer = $state<HTMLTextAreaElement>();
  let selection = $state(''), selectionX = $state(0), selectionY = $state(0), selectionRect = { left: 0, top: 0, bottom: 0 };
  const deleteIds = $derived(deleting ? subtreeIds(visit, deleting) : []);
  const compact = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
  function provenance(target: GraphNode | Turn): string {
    if (target.author?.kind === 'user') return strings.writtenBy(target.author.by);
    if (target.author?.kind !== 'model') return '';
    const author = target.author, generation = visit.log.find(g => g.id === author.generationId);
    // IP-3, CE-52: an endpoint model ignores effort, so the line does not show one; Codex keeps it (CE-58).
    // CE-27: a different name the server answered with is shown beside the model asked for.
    // DM-17a: prepared text names its model and effort but has no record, so no tokens.
    return [modelLabel(author.model), generation?.servedModel ? strings.servedAs(generation.servedModel) : '', isEndpointModel(author.model) && !isCodexModel(author.model) ? '' : generation?.effort ?? author.effort, ...(showTokens && generation ? [`${compact(generation.usage.input)} in / ${compact(generation.usage.output)} out`, durationLabel(generation.durationMs)] : []), target.edited ? strings.editedBy(target.edited.by) : ''].filter(Boolean).join(' · ');
  }
  /** DC-30: the room this panel belongs to, from its class (`learn-panel`, `choose-panel`). */
  const area = $derived(room.className.split('-')[0]);
  function perform(fn: () => void) { try { fn(); localError = ''; session.touch(); } catch (e) { localError = String(e); } }
  function beginEdit(field: string, target: GraphNode | Turn = node) {
    if (readOnly) return;
    editors[node.id] = field;
    editDrafts[node.id] = { title: node.title, hook: node.hook, text: 'text' in target ? target.text : target.content };
  }
  function saveEdit() {
    const field = editors[node.id], draft = editDrafts[node.id];
    trace.action(area, field === 'labels' ? 'Edit title and hook' : field === 'content' ? 'Edit explanation' : 'Edit reply', { nodeId: node.id, field });
    perform(() => {
      if (field === 'labels') { editLabel(node, 'title', draft.title, session.displayName); editLabel(node, 'hook', draft.hook, session.displayName); }
      else room.editText(field === 'content' ? node : node.dialogue[Number(field.split(':')[1])], draft.text, session.displayName);
      delete editors[node.id]; delete editDrafts[node.id];
    });
  }
  function editKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); delete editors[node.id]; }
    if (e.key === 'Enter' && (e.ctrlKey || (e.target as HTMLElement).dataset.field === 'title')) { e.preventDefault(); saveEdit(); }
  }
  function send() { const message = drafts[node.id]?.trim(); if (!message || running) return; drafts[node.id] = ''; void session.run('reply', node.id, message); }
  function addOwn() {
    trace.action(area, 'Add own node', { parentId: node.id });
    perform(() => { room.addChild(visit, node.id, { title: ownTitle, hook: ownHook, by: session.displayName }); adding = false; ownTitle = ownHook = ''; });
  }
  async function remove() {
    if (!deleting) return;
    trace.action(area, 'Delete node', { nodeId: deleting, nodes: deleteIds.length });
    if (running && deleteIds.includes(running.nodeId)) {
      session.cancel(); while (session.running) await new Promise(resolve => setTimeout(resolve, 10));
    }
    perform(() => deleteSubtree(visit, deleting!)); deleting = null; deleteDialog.close();
  }
  $effect(() => { if (deleting && deleteDialog) { deleteDialog.showModal(); tick().then(() => deleteDialog.querySelector<HTMLButtonElement>('button')?.focus()); } });
  $effect(() => { if (compare && compareDialog) compareDialog.showModal(); });
  $effect(() => { node.id; selection = ''; adding = false; localError = ''; if (scroller) scroller.scrollTop = 0; });
  // GV-55: the graph's node menu opens this panel's form or dialog; declared after the reset above.
  let handledRequest = 0;
  $effect(() => {
    const r = request; if (!r || r.seq <= handledRequest || r.nodeId !== node.id) return;
    handledRequest = r.seq;
    // Other kinds (Learn's rewrite) are the room's own forms.
    untrack(() => { if (r.kind === 'delete') deleting = r.nodeId; else if (r.kind === 'own') { adding = true; tick().then(() => scroller?.querySelector<HTMLInputElement>('form input')?.focus()); } });
  });
  function act(id: string) {
    if (id === 'own') adding = !adding;
    else if (id === 'delete') deleting = node.id;
    else if (room.actions(visit, node, running).find(a => a.id === id)?.task) room.runAction(id, node.id);
    else perform(() => room.runAction(id, node.id));
  }
  $effect(() => {
    running?.text;
    if (scroller && busy && nearBottom) tick().then(() => { scroller.scrollTop = scroller.scrollHeight; });
  });
  function selectText() {
    const selected = window.getSelection(); selection = '';
    if (!selected || selected.isCollapsed || readOnly || editors[node.id] || !selected.rangeCount) return;
    const range = selected.getRangeAt(0), anchor = selected.anchorNode?.parentElement;
    if (!anchor?.closest('.md') || !scroller?.contains(anchor)) return;
    const text = selected.toString().trim(); if (text.length < 2) return;
    const rect = range.getBoundingClientRect(); selection = text; selectionX = Math.min(innerWidth-360, rect.x); selectionY = Math.max(8, rect.y-42);
    selectionRect = { left: rect.left, top: rect.top, bottom: rect.bottom };
  }
  function askSelection(text = selection) {
    drafts[node.id] = (drafts[node.id] ? drafts[node.id] + '\n\n' : '') + text.split('\n').map(line => '> ' + line).join('\n') + '\n\n';
    selection = ''; composer?.focus();
  }
  /** NP-54: Ask Amber on the selection; the card's *Ask the tutor* does NP-51 for the same words. */
  function amberSelection() {
    const text = selection, nodeId = node.id; selection = '';
    askAmber({ text, rect: selectionRect, askTutor: () => { if (visit.focusId === nodeId) askSelection(text); } });
  }
  function makeSelection() {
    const text = selection.replace(/\s+/g, ' ').trim(); selection = '';
    if (text.length <= 80) { ownTitle = text; ownHook = ''; addOwn(); }
    else { ownTitle = ''; ownHook = text.slice(0, 199) + (text.length > 200 ? '…' : ''); adding = true; }
  }
  function onGlobalKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && selection) { selection = ''; e.stopPropagation(); }
    if (selection && e.altKey && e.key.toLowerCase() === 'a' && !running) { e.preventDefault(); askSelection(); }
    if (selection && e.altKey && e.key.toLowerCase() === 'n' && !busy && lit) { e.preventDefault(); makeSelection(); }
    if (selection && e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); amberSelection(); }
  }
</script>
<svelte:window onkeydown={onGlobalKey} onmouseup={selectText} />
<aside class="panel {room.className}" tabindex="-1">
  <div class="scroll" bind:this={scroller} onscroll={() => { selection = ''; nearBottom=scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<48; }}>
    <nav class="crumbs">{#each path.slice(0,-1) as parent (parent.id)}<button onclick={() => session.setFocus(parent.id)}>{parent.title}</button><Icon name="chevronRight" size={12} />{/each}</nav>
    <div class="meta">{room.kindLabel(node.kind)} · <span class="state-chip" data-state={node.state}>{room.stateLabel(node)}</span>{node.content ? ` · ${provenance(node)}` : ''}</div>
    {#if editors[node.id] === 'labels'}
      <input aria-label={strings.title} data-field="title" bind:value={editDrafts[node.id].title} onkeydown={editKey} maxlength="120" />
      <textarea aria-label={strings.hook} bind:value={editDrafts[node.id].hook} onkeydown={editKey} maxlength="200"></textarea>
      <div class="row"><button class="primary" onclick={saveEdit}>{strings.save}</button><button onclick={() => delete editors[node.id]}>{strings.cancel}</button></div>
    {:else}
      <h1>{node.title || room.untitled}</h1>{#if node.hook}<p class="hook">{node.hook}</p>{/if}
      {#if !readOnly}<button class="link" onclick={() => beginEdit('labels')}>{strings.editLabels}</button>{/if}
    {/if}
    {#if busy && room.tasks.stream.includes(running!.task)}
      <!-- CE-41: a local model can take a minute before its first words. -->
      {#if !running!.text && endpointNameOf(visit.model)}<p class="loading-model" role="status">{strings.loadingModel(endpointNameOf(visit.model)!)}</p>
      {:else if running!.replay}
        <!-- NP-64: a click on the replaying text puts the whole text in place. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="replay" onclick={() => session.cancel()}><Markdown text={shownText(running!.text) || '…'} {visit} {linkable} streaming={true} focus={id => session.setFocus(id)} {preview} /></div>
      {:else}<Markdown text={shownText(running!.text) || '…'} {visit} {linkable} streaming={true} focus={id => session.setFocus(id)} {preview} />{/if}
      <div class="row"><button onclick={() => session.cancel()}>{running!.replay ? strings.showAll : strings.cancel}</button></div>
    {:else if room.dormant(node)}
      {@render placeholder(node, { running, perform })}
    {:else if editors[node.id] === 'content'}
      <textarea class="markdown-edit" aria-label={strings.editExplanation} bind:value={editDrafts[node.id].text} onkeydown={editKey} rows="12"></textarea>
      <div class="row"><button class="primary" onclick={saveEdit}>{strings.save}</button><button onclick={() => delete editors[node.id]}>{strings.cancel}</button></div>
    {:else}
      <Markdown text={shownText(node.content)} {visit} {linkable} focus={id => session.setFocus(id)} {preview} />
      <div class="under"><button class="link" disabled={readOnly} onclick={() => beginEdit('content')}>{strings.editExplanation}</button>
      {#if node.edited}<small>{strings.editedBy(node.edited.by)}</small>{/if}
      {#if node.previous !== undefined}<button class="link" onclick={() => compare = node}>{strings.previousVersion}</button>{/if}</div>
    {/if}
    {#if body}{@render body(node, { running, busy, perform })}{/if}
    {#if kids.some(n => !room.setAside(n))}
      <section><h2>{room.nextHeading(node, visit)}</h2>
        {#each kids.filter(n => !room.setAside(n)) as child (child.id)}<button class="option" onclick={() => session.setFocus(child.id)}><strong>{child.title}</strong><span>{child.hook}</span><small>{room.optionTag(child)}</small><Icon name="chevronRight" /></button>{/each}
      </section>
    {/if}
    {#if busy && room.tasks.spawn.includes(running!.task)}<div class="skeletons" aria-hidden="true"><div></div><div></div><div></div></div>{/if}
    {#if kids.some(n => room.setAside(n))}
      <details><summary>{strings.dismissedCount(kids.filter(n => room.setAside(n)).length)}</summary>
        {#each kids.filter(n => room.setAside(n)) as child (child.id)}<div class="aside-row"><button class="link" onclick={() => session.setFocus(child.id)}>{child.title}</button><button disabled={busy} onclick={() => { trace.action(area, 'Restore', { nodeId: child.id }); perform(() => room.restore(visit,child.id)); }}>{strings.restore}</button></div>{/each}
      </details>
    {/if}
    <div class="actions">
      <!-- The room's inline actions (Learn: Light it up, Restore) are shown with its placeholder above. -->
      <!-- RS-38: the node's main action is the one filled button; the others are quiet, Delete last. -->
      {#each room.actions(visit, node, running).filter(a => !room.inlineActions?.includes(a.id)) as action, i (action.id)}<button class:primary={i === 0 && action.id !== 'delete' && !room.dormant(node)} class:danger={action.id === 'delete'} disabled={action.disabled} title={action.title} onclick={() => act(action.id)}>{action.label}</button>{/each}
    </div>
    {#if adding}<form onsubmit={e => { e.preventDefault(); addOwn(); }}><input aria-label={strings.title} bind:value={ownTitle} placeholder={strings.title} maxlength="120" required /><input aria-label={strings.hook} bind:value={ownHook} placeholder={strings.hook} maxlength="200" /><div class="row"><button type="submit" class="primary">{strings.add}</button><button type="button" onclick={() => adding = false}>{strings.cancel}</button></div></form>{/if}
    {#if localError}<p class="error" role="alert">{localError}</p>{/if}
    {#if notice}
      <div class="notice" role="status">{@render noticeBody(notice, { running })}</div>
    {/if}
    {#if lit && (node.dialogue.length || (busy && room.tasks.dialogue.includes(running!.task)))}
      <section><h2>{strings.dialogue}</h2>{#each node.dialogue as turn, i (i)}
        <div class="turn {turn.role}" title={provenance(turn)}>
          {#if editors[node.id] === `turn:${i}`}<textarea class="markdown-edit" aria-label={strings.edit} bind:value={editDrafts[node.id].text} onkeydown={editKey}></textarea><div class="row"><button class="primary" onclick={saveEdit}>{strings.save}</button><button onclick={() => delete editors[node.id]}>{strings.cancel}</button></div>
          {:else}<Markdown text={turn.text} {visit} {linkable} focus={id => session.setFocus(id)} {preview} />{#if turn.role === 'model'}<button class="link" disabled={busy} onclick={() => beginEdit(`turn:${i}`,turn)}>{strings.edit}</button>{/if}{#if turn.edited}<small>{strings.editedBy(turn.edited.by)}</small>{/if}{#if turn.previous !== undefined}<button class="link" onclick={() => compare = turn}>{strings.previousVersion}</button>{/if}{/if}
        </div>{/each}
        {#if busy && room.tasks.dialogue.includes(running!.task)}<div class="turn model"><Markdown text={running!.text || '…'} {visit} {linkable} streaming={true} focus={id => session.setFocus(id)} {preview} /></div>{/if}
      </section>
    {/if}
    {#if after}{@render after(node, { running, busy, perform })}{/if}
  </div>
  {#if busy&&!nearBottom}<button class="jump-latest" onclick={()=>{scroller.scrollTop=scroller.scrollHeight;nearBottom=true;}}>{strings.jumpLatest}<Icon name="arrowDown" size={12} /></button>{/if}
  {#if lit}<footer><textarea bind:this={composer} aria-label={phone.current ? strings.composerPhone : strings.composer} value={drafts[node.id] ?? ''} oninput={e => drafts[node.id] = e.currentTarget.value} placeholder={phone.current ? strings.composerPhone : strings.composer} rows="2" disabled={busy} onkeydown={e => { if(e.ctrlKey && e.key === 'Enter') { e.preventDefault(); send(); } }}></textarea>
    <div class="actions">{#if busy}<button onclick={() => session.cancel()}>{running!.replay ? strings.showAll : strings.cancel}</button>{:else}<button class:primary={!!drafts[node.id]?.trim()} disabled={!!running || !drafts[node.id]?.trim()} onclick={send}>{strings.send}</button>{/if}
    {@render footer(node, { running, busy, perform })}</div>
  </footer>{/if}
</aside>
{#if selection}<div class="selection menu-surface" style:left={`${selectionX}px`} style:top={`${selectionY}px`}><button disabled={!!running} title="Alt+A" onclick={() => askSelection()}>{strings.askSelection}</button><button disabled={busy || !lit} title="Alt+N" onclick={makeSelection}>{strings.nodeSelection}</button><button title="Alt+D" onclick={amberSelection}>{strings.askAmber}</button></div>{/if}
<dialog bind:this={deleteDialog} oncancel={() => deleting = null}><h2>{strings.deleteNode}</h2>{#if deleting}<p>{strings.deleteDescription(visit.nodes[deleting].title,deleteIds.length)}</p>{#if room.deleteNote?.(visit, deleteIds)}<p>{room.deleteNote(visit, deleteIds)}</p>{/if}{#if running && deleteIds.includes(running.nodeId)}<p>{strings.generationCancelled}</p>{/if}{/if}<p>{strings.deleteHistory}</p><div class="dialog-actions"><button onclick={() => { deleting = null; deleteDialog.close(); }}>{strings.cancel}</button><button class="primary danger" onclick={remove}>{strings.delete}</button></div></dialog>
<dialog bind:this={compareDialog} oncancel={() => compare = null}><div class="compare">{#if compare}<section><h2>{strings.previous}</h2><Markdown text={compare.previous!} {visit} {linkable} focus={id => session.setFocus(id)} {preview} /></section><section><h2>{strings.current}</h2><Markdown text={'text' in compare ? compare.text : compare.content} {visit} {linkable} focus={id => session.setFocus(id)} {preview} /></section>{/if}</div><div class="dialog-actions"><button onclick={() => { compare = null; compareDialog.close(); }}>{strings.keepCurrent}</button><button class="primary" disabled={busy} onclick={() => { perform(() => revertText(compare!)); compare = null; compareDialog.close(); }}>{strings.revert}</button></div></dialog>
<style>
  /* RS-34, RS-38: the reading panel is a solid surface, not glass over the moving backdrop. */
  .panel { display:flex; flex-direction:column; height:100%; min-width:0; background:var(--surface); overflow:hidden; }
  .state-chip { border:1px solid var(--line); border-radius:var(--radius-pill); padding:1px 8px; }
  .scroll { padding:20px 28px 32px; flex:1; overflow:auto; }
  /* NP-80: a reading measure near 70 characters; the column's controls keep the text's width. */
  .scroll > :global(*) { max-width:620px; }
  .scroll :global(.md) { max-width:70ch; font-family:var(--font-reading); font-size:16.5px; line-height:1.6; }
  .scroll :global(.md code), .scroll :global(.md pre), .scroll :global(.md kbd) { font-size:13.5px; }
  .crumbs { display:flex; flex-wrap:wrap; align-items:center; gap:2px; min-height:20px; color:var(--ink-mute); }.crumbs button { font-size:12px; font-weight:400; padding:2px 4px; color:var(--ink-mute); }.crumbs button:hover { color:var(--ink); }
  .meta { font-size:11px; color:var(--ink-mute); margin-top:12px; } .loading-model { color:var(--ink-mute); font-style:italic; } h1 { font-size:24px; font-weight:600; margin:12px 0 6px; } h2 { font-size:13px; color:var(--ink-mute); font-weight:500; margin:24px 0 8px; }
  .hook { font-family:var(--font-reading); font-size:16px; font-style:italic; color:var(--ink-mute); margin:0 0 4px; }
  .under { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:4px 0 0 -4px; } .under small { font-size:11px; color:var(--ink-mute); }
  .row { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0; }
  /* The next nodes: a list of rows, not boxed buttons. */
  .option { display:grid; grid-template-columns:1fr auto; column-gap:12px; text-align:left; width:100%; margin:0; padding:10px 10px; border-radius:var(--radius); border-top:1px solid var(--line); border-radius:0; }
  .option:last-child { border-bottom:1px solid var(--line); }
  .option:hover:not(:disabled) { border-radius:var(--radius); border-top-color:transparent; }
  .option:hover:not(:disabled) + :global(.option) { border-top-color:transparent; }
  .option strong { font-weight:500; grid-column:1; } .option span, .option small { grid-column:1; color:var(--ink-mute); font-size:12px; font-weight:400; } .option small { font-size:11px; margin-top:2px; }
  .option :global(.icon) { grid-column:2; grid-row:1 / span 3; align-self:center; color:var(--ink-mute); }
  .option:hover :global(.icon) { color:var(--accent); }
  .aside-row { display:flex; align-items:center; gap:4px; }
  .actions { display:flex; gap:4px; flex-wrap:wrap; align-items:center; margin:20px 0 16px -10px; }.actions :global(button) { font-size:13px; }.actions :global(button.primary) { margin-left:10px; margin-right:6px; }
  .turn { padding:10px 14px; margin:10px 0; }.turn.model { border-left:2px solid var(--accent); }.turn.user { margin-left:30px; background:var(--surface-2); border-radius:var(--radius-surface); }
  footer { padding:12px 20px; border-top:1px solid var(--line); } footer textarea { width:100%; box-sizing:border-box; resize:vertical; max-height:180px; } footer .actions { margin:8px 0 0; }
  footer .actions :global(button.primary) { margin-left:0; }
  .markdown-edit { width:100%; box-sizing:border-box; font-family:monospace; max-height:50vh; } .error { color:var(--error-ink); }.notice { padding:12px; border:1px solid var(--line); border-radius:var(--radius-surface); }
  dialog { color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-surface); max-width:min(800px,85vw); padding:20px 24px; } dialog::backdrop { background:var(--code); opacity:.75; }.compare { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  dialog h2 { color:var(--ink); font-size:16px; font-weight:600; margin:0 0 12px; } dialog :global(.md) { font-family:var(--font-reading); }
  .dialog-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
  form { display:grid; gap:8px; }.selection { position:fixed; z-index:10; flex-direction:row; min-width:0; padding:4px; gap:2px; }.selection button { font-size:13px; }
  .jump-latest { display:inline-flex; align-items:center; gap:6px; align-self:center; flex:none; margin:6px 0; padding:5px 14px; font-size:12px; background:var(--surface-2); border-color:var(--line); border-radius:var(--radius-pill); box-shadow:var(--menu-shadow); }
  .replay { cursor:pointer; }
  .skeletons div { margin:8px 0; height:40px; background:var(--surface-2); border-radius:var(--radius); opacity:.6; }
  @media(max-width:520px) { .compare { grid-template-columns:1fr; } .scroll :global(.md) { font-size:16px; } }
</style>
