<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { SpaceProps } from '../../frame/room';
  import type { SubjectSummary, CatalogueSort } from '../../frame/catalogue';
  import { cardDetails } from '../../frame/catalogue';
  import { tokens, modelName, exactDate, relativeDate } from '../../frame/library-format';
  import { strings } from '../../ui/strings';
  import Thumbnail from './Thumbnail.svelte';
  let { visible, settings, library, revision, navigate }: SpaceProps = $props();
  const catalogue=untrack(()=>library.catalogue);
  const view=$derived.by(()=>{revision;return {count:catalogue.summaries.length,sort:catalogue.sort,ascending:catalogue.ascending,state:catalogue.state};});
  const cards=$derived.by(()=>{revision;return catalogue.visible;});
  const selected=$derived.by(()=>{revision;return catalogue.selectedId;});
  const filter=$derived.by(()=>{revision;return catalogue.filter;});
  const available=$derived.by(()=>{revision;return library.available;});
  let grid=$state<HTMLDivElement>(undefined!),dialog:HTMLDialogElement,renameId=$state<string|null>(null),renameTitle=$state('');
  let deleting=$state<SubjectSummary|null>(null),error=$state(''),errorId=$state(''),working=$state(false);
  async function action(id:string,fn:()=>Promise<void>){error='';errorId=id;working=true;try{await fn();return true;}catch(e){error=String(e);return false;}finally{working=false;}}
  async function startRename(s:SubjectSummary){renameId=s.id;renameTitle=s.title;await tick();grid.querySelector<HTMLInputElement>('input.rename')?.focus();}
  async function saveRename(id:string){if(await action(id,()=>library.rename(id,renameTitle)))renameId=null;}
  async function confirmDelete(s:SubjectSummary){deleting=s;error='';await tick();dialog.showModal();dialog.querySelector<HTMLButtonElement>('button')?.focus();}
  async function remove(){if(deleting&&await action(deleting.id,()=>library.remove(deleting!.id))){dialog.close();deleting=null;}}
  function select(id:string){catalogue.select(id);if(renameId!==id)renameId=null;}
  async function key(e:KeyboardEvent){
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLButtonElement)return;
    const current=cards.find(s=>s.id===selected);
    if(e.key==='Enter'&&current){e.preventDefault();await action(current.id,()=>library.open(current.id));}
    else if(e.key==='F2'&&current&&!current.readOnly&&!current.unreadable){e.preventDefault();await startRename(current);}
    else if(e.key==='Delete'&&current){e.preventDefault();await confirmDelete(current);}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Escape'].includes(e.key)){
      e.preventDefault();e.stopPropagation();const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      catalogue.move(e.key,columns);await tick();grid.querySelector<HTMLElement>(`[data-card-id="${catalogue.selectedId}"]`)?.focus();
    }
  }
</script>
<main class="gallery" class:hidden={!visible}>
  {#if visible}
  {#if !available}<p role="alert">{strings.libraryUnavailable}</p>
  {:else if !view.count}<div class="empty"><h1>{strings.noSubjects}</h1><button onclick={()=>navigate('welcome')}>{strings.startOne}</button></div>
  {:else}
    <div class="toolbar"><h1>{strings.gallery}</h1><span>{strings.subjectCount(view.count)}</span>
      <label>{strings.sort}<select aria-label={strings.sort} value={view.sort} onchange={e=>catalogue.setSort(e.currentTarget.value as CatalogueSort)}>
        <option value="lastOpened">{strings.lastOpened}</option><option value="created">{strings.created}</option><option value="progress">{strings.progress}</option>
      </select></label><button aria-label={view.ascending?strings.ascending:strings.descending} onclick={()=>catalogue.setSort(catalogue.sort,!catalogue.ascending)}>{view.ascending?'↑':'↓'}</button>
      <input aria-label={strings.filter} placeholder={strings.filter} value={filter} oninput={e=>catalogue.setFilter(e.currentTarget.value)} onkeydown={e=>{if(e.key==='Escape'){e.stopPropagation();catalogue.setFilter('');}}}/>
    </div>
    {#if !cards.length}<p>{strings.noMatches(filter)} <button onclick={()=>catalogue.setFilter('')}>{strings.clearFilter}</button></p>{/if}
    <div class="grid" bind:this={grid} role="listbox" aria-label={strings.gallery} tabindex="-1" onkeydown={e=>{if(e.target===grid)void key(e);}} onclick={e=>{if(e.target===grid)catalogue.select(null);}}>
      {#each cards as summary,i (summary.id)}{@const detail=cardDetails(summary,view.state.lastOpenedAt[summary.id],settings.appearance.showTokenStats)}
        <div class="card" data-card-id={summary.id} class:selected={selected===summary.id} role="option" aria-selected={selected===summary.id} aria-label={summary.title}
          onkeydown={key} tabindex={selected===summary.id||(!selected&&i===0)?0:-1} onclick={()=>select(summary.id)} ondblclick={e=>{if(!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement))void action(summary.id,()=>library.open(summary.id));}}>
          <Thumbnail {summary} {library}/>
          {#if renameId===summary.id}<input class="rename" aria-label={strings.rename} bind:value={renameTitle} maxlength="120" onkeydown={e=>{e.stopPropagation();if(e.key==='Enter')void saveRename(summary.id);if(e.key==='Escape')renameId=null;}}/>
          {:else}<h2 title={selected===summary.id?undefined:summary.title}>{summary.title}</h2>{/if}
          <div class="progress" aria-label={`${strings.progress}: ${Math.round(detail.progress*100)}%`}><span style={`width:${detail.progress*100}%`}></span></div>
          <dl><div><dt>{strings.nodes}</dt><dd>{detail.total??0}</dd></div><div><dt>{strings.lit}</dt><dd>{detail.lit??0}</dd></div>
            <div><dt>{strings.understoodCount}</dt><dd>{strings.understoodSplit(detail.understood??0,detail.demonstrated??0,detail.self??0)}</dd></div>
            {#if settings.appearance.showTokenStats}<div><dt>{strings.tokensSpent}</dt><dd>{tokens(summary.tokens)}</dd></div>{/if}
          </dl>
          <p class="span" title={exactDate(detail.lastOpenedAt)}>{strings.created} {summary.createdAt?new Date(summary.createdAt).toLocaleDateString():strings.noneYet} → {relativeDate(detail.lastOpenedAt)}</p>
          <p class="model">{modelName(summary.mainModel)}</p>
          {#if selected===summary.id}<div class="actions">
            <button disabled={working} onclick={()=>action(summary.id,()=>library.open(summary.id))}>{strings.openSubject}</button>
            <button disabled={working||summary.readOnly||summary.unreadable} onclick={()=>startRename(summary)}>{strings.rename}</button>
            <button disabled={working} onclick={()=>confirmDelete(summary)}>{strings.delete}</button>
            <button disabled={working} onclick={()=>action(summary.id,()=>library.reveal(summary.id))}>{strings.revealSubject}</button>
          </div><dl class="details">
            <div><dt>{strings.dark}</dt><dd>{detail.dark??0}</dd></div>
            {#if settings.appearance.showTokenStats}<div><dt>{strings.tokensSpent}</dt><dd>{strings.inOut(tokens(detail.input),tokens(detail.output))}</dd></div>{/if}
            <div><dt>{strings.created}</dt><dd>{exactDate(detail.createdAt)}</dd></div><div><dt>{strings.lastOpened}</dt><dd>{exactDate(detail.lastOpenedAt)}</dd></div>
            <div><dt>{strings.tone}</dt><dd>{typeof detail.tone==='object'?detail.tone.custom:detail.tone?strings.tones[detail.tone]:strings.noneYet}</dd></div>
            <div><dt>{strings.modelsUsed}</dt><dd>{#each detail.models as model,j}{j?' · ':''}{modelName(model.model)}{#if 'share' in model&&model.share!==null}{` ${model.share}%`}{/if}{:else}{strings.noneYet}{/each}</dd></div>
            <div><dt>{strings.generations}</dt><dd>{detail.generations??0}</dd></div>
          </dl>{/if}
          {#if summary.error}<p class="error">{summary.error}</p>{/if}
          {#if error&&errorId===summary.id}<p role="alert" class="error">{error}</p>{/if}
        </div>
      {/each}
    </div>
  {/if}
  {/if}
</main>
<dialog bind:this={dialog} aria-label={deleting?strings.deleteSubject(deleting.title):strings.delete} oncancel={()=>deleting=null}>
  {#if deleting}<h2>{strings.deleteSubject(deleting.title)}</h2><p>{strings.deleteSubjectHistory(deleting.total??0,settings.appearance.showTokenStats?tokens(deleting.tokens):null)}</p>
    {#if library.isRunning(deleting.id)}<p>{strings.generationCancelled}</p>{/if}
    {#if error}<p role="alert">{error}</p>{/if}
    <div class="actions"><button disabled={working} onclick={()=>{dialog.close();deleting=null;}}>{strings.cancel}</button><button disabled={working} onclick={remove}>{strings.delete}</button></div>
  {/if}
</dialog>
<style>
  .hidden{display:none}.gallery{height:100%;box-sizing:border-box;overflow:auto;padding:32px clamp(24px,4vw,64px) 64px}h1{margin:0;font-size:24px;font-weight:350}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:28px}.toolbar>span{color:var(--ink-mute);font-size:12px;margin-right:auto}.toolbar label{display:flex;align-items:center;gap:8px;font-size:12px}.toolbar input{min-width:190px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px;max-width:1600px;align-items:start}.card{padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);min-width:0;cursor:pointer}.card.selected{outline:2px solid var(--focus);outline-offset:2px}.card:hover :global(.thumbnail){filter:drop-shadow(0 0 8px var(--glow-far))}h2{font-size:16px;margin:14px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card.selected h2{white-space:normal;overflow-wrap:anywhere}.progress{height:2px;background:var(--line);margin-bottom:16px}.progress span{display:block;height:100%;background:var(--node-understood)}dl{display:grid;gap:7px;margin:0;font-size:12px}dl>div{display:flex;justify-content:space-between;gap:12px}dt{color:var(--ink-mute)}dd{margin:0;text-align:right;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.span,.model{font-size:12px;color:var(--ink-mute);margin:12px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.actions button{font-size:12px;padding:6px 9px}.details{border-top:1px solid var(--line);padding-top:14px;margin-top:16px}.error{font-size:12px;color:var(--error-ink);overflow-wrap:anywhere}.rename{width:100%;margin:10px 0}.empty{text-align:center;padding:18vh 0}.empty button{margin-top:20px}dialog{max-width:500px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);padding:28px}dialog::backdrop{background:#0009}dialog p{font-size:14px;line-height:1.5}
  @media(min-width:1024px){.grid{grid-template-columns:repeat(3,minmax(260px,1fr))}}@media(min-width:1400px){.grid{grid-template-columns:repeat(4,minmax(260px,1fr))}}@media(min-width:1800px){.grid{grid-template-columns:repeat(5,minmax(260px,1fr))}}
</style>
