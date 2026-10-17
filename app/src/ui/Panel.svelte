<script lang="ts">
  import { tick, untrack } from 'svelte';
  // The rooms' shared reading panel (PS-5): breadcrumb, labels, explanation, children, dialogue and composer.
  // The room supplies its vocabulary, rules, actions and three snippets (panel-types.ts).
  import Markdown from './Markdown.svelte';
  import { askAmber } from './ask-amber';
  import { strings } from './strings';
  import { modelLabel,durationLabel } from './format';
  import { isEndpointModel } from '../core/models';
  import { endpointNameOf } from './model-choices.svelte';
  import { childrenOf, pathTo, deleteSubtree, editLabel, revertText, subtreeIds } from '../core/graph';
  import type { GraphNode, Turn } from '../core/model';
  import type { PanelRequest, PanelRoomView, PanelSession, PanelSnippets } from './panel-types';
  let { session, room, placeholder, notice: noticeBody, footer, body, after, revision, showTokens = true, request = null, preview }: PanelSnippets & { session: PanelSession; room: PanelRoomView; revision: number; showTokens?: boolean; request?: PanelRequest | null; preview?: (id: string | null) => void } = $props();
  const visit = $derived.by(() => { revision; return session.visit; });
  const node = $derived(visit.nodes[visit.focusId]);
  const path = $derived(pathTo(visit, node.id));
  const kids = $derived(childrenOf(visit, node.id));
  const running = $derived.by(() => { revision; return session.running ? { ...session.running } : null; });
  const notice = $derived.by(() => { revision; return session.notice?.nodeId === node.id ? session.notice : null; });
  const busy = $derived(running?.nodeId === node.id);
  const readOnly = $derived(room.frozen(node, busy));
  const lit = $derived(room.conversable(node));
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
    // IP-3, CE-52: an endpoint model ignores effort, so the line does not show one.
    return [modelLabel(author.model), isEndpointModel(author.model) ? '' : generation?.effort, ...(showTokens && generation ? [`${compact(generation.usage.input)} in / ${compact(generation.usage.output)} out`, durationLabel(generation.durationMs)] : []), target.edited ? strings.editedBy(target.edited.by) : ''].filter(Boolean).join(' · ');
  }
  function perform(fn: () => void) { try { fn(); localError = ''; session.touch(); } catch (e) { localError = String(e); } }
  function beginEdit(field: string, target: GraphNode | Turn = node) {
    if (readOnly) return;
    editors[node.id] = field;
    editDrafts[node.id] = { title: node.title, hook: node.hook, text: 'text' in target ? target.text : target.content };
  }
  function saveEdit() {
    const field = editors[node.id], draft = editDrafts[node.id];
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
    perform(() => { room.addChild(visit, node.id, { title: ownTitle, hook: ownHook, by: session.displayName }); adding = false; ownTitle = ownHook = ''; });
  }
  async function remove() {
    if (!deleting) return;
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
    untrack(() => { if (r.kind === 'delete') deleting = r.nodeId; else { adding = true; tick().then(() => scroller?.querySelector<HTMLInputElement>('form input')?.focus()); } });
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
    <nav class="crumbs">{#each path.slice(0,-1) as parent (parent.id)}<button onclick={() => session.setFocus(parent.id)}>{parent.title}</button><span>›</span>{/each}</nav>
    <div class="meta">{room.kindLabel(node.kind)} · <span class="state-chip" data-state={node.state}>{room.stateLabel(node)}</span>{node.content ? ` · ${provenance(node)}` : ''}</div>
    {#if editors[node.id] === 'labels'}
      <input aria-label={strings.title} data-field="title" bind:value={editDrafts[node.id].title} onkeydown={editKey} maxlength="120" />
      <textarea aria-label={strings.hook} bind:value={editDrafts[node.id].hook} onkeydown={editKey} maxlength="200"></textarea>
      <button onclick={saveEdit}>{strings.save}</button><button onclick={() => delete editors[node.id]}>{strings.cancel}</button>
    {:else}
      <h1>{node.title || room.untitled}</h1>{#if node.hook}<p class="hook">{node.hook}</p>{/if}
      {#if !readOnly}<button class="quiet" onclick={() => beginEdit('labels')}>{strings.editLabels}</button>{/if}
    {/if}
    {#if busy && room.tasks.stream.includes(running!.task)}
      <!-- CE-41: a local model can take a minute before its first words. -->
      {#if !running!.text && endpointNameOf(visit.model)}<p class="loading-model" role="status">{strings.loadingModel(endpointNameOf(visit.model)!)}</p>
      {:else}<Markdown text={running!.text || '…'} {visit} streaming={true} focus={id => session.setFocus(id)} {preview} />{/if}
      <button onclick={() => session.cancel()}>{strings.cancel}</button>
    {:else if room.dormant(node)}
      {@render placeholder(node, { running, perform })}
    {:else if editors[node.id] === 'content'}
      <textarea class="markdown-edit" aria-label={strings.editExplanation} bind:value={editDrafts[node.id].text} onkeydown={editKey} rows="12"></textarea>
      <button onclick={saveEdit}>{strings.save}</button><button onclick={() => delete editors[node.id]}>{strings.cancel}</button>
    {:else}
      <Markdown text={node.content} {visit} focus={id => session.setFocus(id)} {preview} />
      <button class="quiet" disabled={readOnly} onclick={() => beginEdit('content')}>{strings.editExplanation}</button>
      {#if node.edited}<small>{strings.editedBy(node.edited.by)}</small>{/if}
      {#if node.previous !== undefined}<button class="quiet" onclick={() => compare = node}>{strings.previousVersion}</button>{/if}
    {/if}
    {#if body}{@render body(node, { running, busy, perform })}{/if}
    {#if kids.some(n => !room.setAside(n))}
      <section><h2>{room.nextHeading(node, visit)}</h2>
        {#each kids.filter(n => !room.setAside(n)) as child (child.id)}<button class="option" onclick={() => session.setFocus(child.id)}><strong>{child.title}</strong><span>{child.hook}</span><small>{room.optionTag(child)}</small></button>{/each}
      </section>
    {/if}
    {#if busy && room.tasks.spawn.includes(running!.task)}<div class="skeletons" aria-hidden="true"><div></div><div></div><div></div></div>{/if}
    {#if kids.some(n => room.setAside(n))}
      <details><summary>{strings.dismissedCount(kids.filter(n => room.setAside(n)).length)}</summary>
        {#each kids.filter(n => room.setAside(n)) as child (child.id)}<div><button onclick={() => session.setFocus(child.id)}>{child.title}</button><button disabled={busy} onclick={() => perform(() => room.restore(visit,child.id))}>{strings.restore}</button></div>{/each}
      </details>
    {/if}
    <div class="actions">
      <!-- The room's inline actions (Learn: Light it up, Restore) are shown with its placeholder above. -->
      {#each room.actions(visit, node, running).filter(a => !room.inlineActions?.includes(a.id)) as action (action.id)}<button disabled={action.disabled} onclick={() => act(action.id)}>{action.label}</button>{/each}
    </div>
    {#if adding}<form onsubmit={e => { e.preventDefault(); addOwn(); }}><input aria-label={strings.title} bind:value={ownTitle} placeholder={strings.title} maxlength="120" required /><input aria-label={strings.hook} bind:value={ownHook} placeholder={strings.hook} maxlength="200" /><button type="submit">{strings.add}</button><button type="button" onclick={() => adding = false}>{strings.cancel}</button></form>{/if}
    {#if localError}<p class="error" role="alert">{localError}</p>{/if}
    {#if notice}
      <div class="notice" role="status">{@render noticeBody(notice, { running })}</div>
    {/if}
    {#if lit && (node.dialogue.length || (busy && room.tasks.dialogue.includes(running!.task)))}
      <section><h2>{strings.dialogue}</h2>{#each node.dialogue as turn, i (i)}
        <div class="turn {turn.role}" title={provenance(turn)}>
          {#if editors[node.id] === `turn:${i}`}<textarea class="markdown-edit" aria-label={strings.edit} bind:value={editDrafts[node.id].text} onkeydown={editKey}></textarea><button onclick={saveEdit}>{strings.save}</button><button onclick={() => delete editors[node.id]}>{strings.cancel}</button>
          {:else}<Markdown text={turn.text} {visit} focus={id => session.setFocus(id)} {preview} />{#if turn.role === 'model'}<button class="quiet" disabled={busy} onclick={() => beginEdit(`turn:${i}`,turn)}>{strings.edit}</button>{/if}{#if turn.edited}<small>{strings.editedBy(turn.edited.by)}</small>{/if}{#if turn.previous !== undefined}<button class="quiet" onclick={() => compare = turn}>{strings.previousVersion}</button>{/if}{/if}
        </div>{/each}
        {#if busy && room.tasks.dialogue.includes(running!.task)}<div class="turn model"><Markdown text={running!.text || '…'} {visit} streaming={true} focus={id => session.setFocus(id)} {preview} /></div>{/if}
      </section>
    {/if}
    {#if after}{@render after(node, { running, busy, perform })}{/if}
  </div>
  {#if busy&&!nearBottom}<button class="jump-latest" onclick={()=>{scroller.scrollTop=scroller.scrollHeight;nearBottom=true;}}>{strings.jumpLatest}</button>{/if}
  {#if lit}<footer><textarea bind:this={composer} aria-label={strings.composer} value={drafts[node.id] ?? ''} oninput={e => drafts[node.id] = e.currentTarget.value} placeholder={strings.composer} rows="2" disabled={busy} onkeydown={e => { if(e.ctrlKey && e.key === 'Enter') { e.preventDefault(); send(); } }}></textarea>
    <div class="actions">{#if busy}<button onclick={() => session.cancel()}>{strings.cancel}</button>{:else}<button class="primary" disabled={!!running || !drafts[node.id]?.trim()} onclick={send}>{strings.send}</button>{/if}
    {@render footer(node, { running, busy, perform })}</div>
  </footer>{/if}
</aside>
{#if selection}<div class="selection" style:left={`${selectionX}px`} style:top={`${selectionY}px`}><button disabled={!!running} title="Alt+A" onclick={() => askSelection()}>{strings.askSelection}</button><button disabled={busy || !lit} title="Alt+N" onclick={makeSelection}>{strings.nodeSelection}</button><button title="Alt+D" onclick={amberSelection}>{strings.askAmber}</button></div>{/if}
<dialog bind:this={deleteDialog} oncancel={() => deleting = null}><h2>{strings.deleteNode}</h2>{#if deleting}<p>{strings.deleteDescription(visit.nodes[deleting].title,deleteIds.length)}</p>{#if room.deleteNote?.(visit, deleteIds)}<p>{room.deleteNote(visit, deleteIds)}</p>{/if}{#if running && deleteIds.includes(running.nodeId)}<p>{strings.generationCancelled}</p>{/if}{/if}<p>{strings.deleteHistory}</p><button onclick={() => { deleting = null; deleteDialog.close(); }}>{strings.cancel}</button><button onclick={remove}>{strings.delete}</button></dialog>
<dialog bind:this={compareDialog} oncancel={() => compare = null}><div class="compare">{#if compare}<section><h2>{strings.previous}</h2><Markdown text={compare.previous!} {visit} focus={id => session.setFocus(id)} {preview} /></section><section><h2>{strings.current}</h2><Markdown text={'text' in compare ? compare.text : compare.content} {visit} focus={id => session.setFocus(id)} {preview} /></section>{/if}</div><button disabled={busy} onclick={() => { perform(() => revertText(compare!)); compare = null; compareDialog.close(); }}>{strings.revert}</button><button onclick={() => { compare = null; compareDialog.close(); }}>{strings.keepCurrent}</button></dialog>
<style>
  .panel { display:flex; flex-direction:column; height:100%; min-width:0; background:var(--glass); backdrop-filter:var(--glass-blur); overflow:hidden; }
  .state-chip { border:1px solid var(--line);border-radius:8px;padding:2px 6px; }
  .scroll { padding:20px 28px 32px; flex:1; overflow:auto; }
  .crumbs { display:flex; flex-wrap:wrap; align-items:center; gap:5px; min-height:20px; }.crumbs button { font-size:12px; border:0; background:none; padding:2px; }
  .meta { font-size:11px; color:var(--ink-mute); margin-top:12px; } .loading-model { color:var(--ink-mute); font-style:italic; } h1 { font-size:24px; font-weight:600; margin:12px 0; } h2 { font-size:13px; color:var(--ink-mute); font-weight:500; margin:20px 0 10px; }
  .hook { font-style:italic; color:var(--ink-mute); }.quiet { font-size:11px; background:none; border:0; padding:4px 6px; color:var(--ink-mute); }
  .option { display:grid; text-align:left; width:100%; margin:8px 0; gap:5px; }.option strong { font-weight:500; }.option span,.option small { color:var(--ink-mute); font-size:12px; }
  .actions { display:flex; gap:6px; flex-wrap:wrap; margin:16px 0; }.actions :global(button) { font-size:12px; }
  .turn { padding:10px 14px; margin:10px 0; }.turn.model { border-left:2px solid var(--accent); }.turn.user { margin-left:30px; background:var(--surface-2); border-radius:8px; }
  footer { padding:12px 20px; border-top:1px solid var(--line); } footer textarea { width:100%; box-sizing:border-box; resize:vertical; max-height:180px; } footer .actions { margin:8px 0 0; }
  .markdown-edit { width:100%; box-sizing:border-box; font-family:monospace; max-height:50vh; } .error { color:var(--error-ink); }.notice { padding:12px; border:1px solid var(--line); border-radius:8px; }
  dialog { color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:10px; max-width:min(800px,85vw); } dialog::backdrop { background:var(--code); opacity:.75; }.compare { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  form { display:grid; gap:8px; }.selection { position:fixed; z-index:10; background:var(--surface-2); border:1px solid var(--line); padding:4px; border-radius:8px; }
  .skeletons div { margin:8px 0; height:40px; background:var(--surface-2); border-radius:6px; opacity:.6; }
  @media(max-width:520px) { .compare { grid-template-columns:1fr; } }
</style>
