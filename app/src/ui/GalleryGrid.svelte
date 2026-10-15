<script lang="ts">
  // The rooms' shared Gallery (PS-5, WG-*): toolbar, grid, selection, rename, delete, keyboard. The room
  // draws the card's visual, its figures and its details (gallery-types.ts).
  import { tick, untrack } from 'svelte';
  import type { SpaceProps } from '../frame/room';
  import type { SubjectSummary, CatalogueSort } from '../frame/catalogue';
  import { cardDetails } from '../frame/catalogue';
  import { tokens } from '../frame/library-format';
  import { strings } from './strings';
  import type { GallerySnippets } from './gallery-types';
  let { visible, settings, library, revision, navigate, visual, figures, details: detailRows }: Pick<SpaceProps, 'visible' | 'settings' | 'library' | 'revision' | 'navigate'> & GallerySnippets = $props();
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
          {@render visual(summary)}
          {#if renameId===summary.id}<input class="rename" aria-label={strings.rename} bind:value={renameTitle} maxlength="120" onkeydown={e=>{e.stopPropagation();if(e.key==='Enter')void saveRename(summary.id);if(e.key==='Escape')renameId=null;}}/>
          {:else}<h2 title={selected===summary.id?undefined:summary.title}>{summary.title}</h2>{/if}
          {@render figures(summary, detail)}
          {#if selected===summary.id}<div class="actions">
            <button disabled={working} onclick={()=>action(summary.id,()=>library.open(summary.id))}>{strings.openSubject}</button>
            <button disabled={working||summary.readOnly||summary.unreadable} onclick={()=>startRename(summary)}>{strings.rename}</button>
            <button disabled={working} onclick={()=>confirmDelete(summary)}>{strings.delete}</button>
            <button disabled={working} onclick={()=>action(summary.id,()=>library.reveal(summary.id))}>{strings.revealSubject}</button>
          </div>{@render detailRows(summary, detail)}{/if}
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
  .hidden{display:none}.gallery{height:100%;box-sizing:border-box;overflow:auto;padding:32px clamp(24px,4vw,64px) 64px}h1{margin:0;font-size:24px;font-weight:350}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:28px}.toolbar>span{color:var(--ink-mute);font-size:12px;margin-right:auto}.toolbar label{display:flex;align-items:center;gap:8px;font-size:12px}.toolbar input{min-width:190px}.toolbar select,.toolbar input,.toolbar button{background:var(--glass);backdrop-filter:var(--glass-blur)}.toolbar option{background:var(--surface)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px;max-width:1600px;align-items:start}.card{padding:18px;border:1px solid var(--glass-line);border-radius:12px;background:var(--glass);backdrop-filter:var(--glass-blur);min-width:0;cursor:pointer}.card.selected{outline:2px solid var(--focus);outline-offset:2px}.card:hover :global(.thumbnail){filter:drop-shadow(0 0 8px var(--glow-far))}h2{font-size:16px;margin:14px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card.selected h2{white-space:normal;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.actions button{font-size:12px;padding:6px 9px}.error{font-size:12px;color:var(--error-ink);overflow-wrap:anywhere}.rename{width:100%;margin:10px 0}.empty{text-align:center;padding:18vh 0}.empty button{margin-top:20px}dialog{max-width:500px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);padding:28px}dialog::backdrop{background:#0009}dialog p{font-size:14px;line-height:1.5}
  @media(min-width:1024px){.grid{grid-template-columns:repeat(3,minmax(260px,1fr))}}@media(min-width:1400px){.grid{grid-template-columns:repeat(4,minmax(260px,1fr))}}@media(min-width:1800px){.grid{grid-template-columns:repeat(5,minmax(260px,1fr))}}
</style>
