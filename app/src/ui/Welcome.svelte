<script lang="ts">
  // The rooms' shared Welcome (PS-5, WG-*, D1): the capsule with the subject and its direction, the tone and
  // model pickers, suggestions and the recent shelf. The room supplies the default tone, its wording,
  // its suggestions and the recent card's picture and figure (welcome-types.ts).
  import { onMount, tick, untrack } from 'svelte';
  import type { SpaceProps } from '../frame/room';
  import type { Tone } from '../core/model';
  import { cloneJson, DIRECTION_LIMIT } from '../core/model';
  import { Capsule, type Shape } from './capsule';
  import { strings } from './strings';
  import { exactDate, relativeDate } from '../frame/library-format';
  import { isValidModel } from '../core/models';
  import ModelPicker from './ModelPicker.svelte';
  import TonePicker from './TonePicker.svelte';
  import { WelcomeEmbers } from './embers';
  import type { WelcomeRoomView, WelcomeSnippets, WelcomeStarter } from './welcome-types';
  let { visible, settings, library, revision, navigate, room, visual, figure, card, extra }: Pick<SpaceProps, 'visible' | 'settings' | 'library' | 'revision' | 'navigate'> & WelcomeSnippets & { room: WelcomeRoomView } = $props();
  const labels = $derived({ lede: strings.firstWelcome, question: strings.subjectQuestion, example: strings.subjectExample, directionPlaceholder: strings.directionPlaceholder, carryIn: strings.carryIn, recent: strings.recentSubjects, continue: strings.continueSubject,
    addsDirection: strings.addsDirection, directionLabel: strings.directionLabel, directionAlone: strings.directionAlone, directionOver: strings.directionOver,
    startersLabel: '', cliNotReady: strings.cliNotReady, libraryUnavailable: strings.libraryUnavailable, ...room.labels });
  const starters=$derived<WelcomeStarter[]>(room.starters?.(settings)??[]);
  let arriving=$state(true);
  let title=$state(''),tone=$state<Tone>('curious'),model=$state('opus'),busy=$state(false),error=$state('');
  let suggestionRevision=$state(0),field:HTMLInputElement,button:HTMLButtonElement,suggestButton=$state<HTMLButtonElement>(),canvas:HTMLCanvasElement;
  let motion:WelcomeEmbers|undefined,arrived=false,osReduced=$state(false);
  // WG-9/10: the direction lives in the same capsule as the subject.
  let direction=$state(''),open=$state(false),focused=$state(false),capsule:Capsule|undefined;
  let ask:HTMLFormElement,cap:HTMLDivElement,top:HTMLDivElement,dock:HTMLSpanElement,lower:HTMLDivElement,hair:HTMLDivElement,dirField:HTMLTextAreaElement,wrap:HTMLDivElement,hint:HTMLSpanElement;
  const suggestions=untrack(()=>room.suggestions?.(library.provider,()=>suggestionRevision++));
  const thinking=$derived.by(()=>{suggestionRevision;return suggestions?.running??false;});
  const options=$derived.by(()=>{suggestionRevision;return suggestions?.options??[];});
  const suggestError=$derived.by(()=>{suggestionRevision;return suggestions?.error??null;});
  const recent=$derived.by(()=>{revision;return library.catalogue.recent;});
  const total=$derived.by(()=>{revision;return library.catalogue.summaries.length;});
  const available=$derived.by(()=>{revision;return library.available;});
  const ready=$derived.by(()=>{revision;return library.providerReady;});
  const validModel=$derived(isValidModel(model));
  const reduced=$derived(osReduced||settings.appearance.reduceMotion==='on');
  const directionLength=$derived([...direction].length),over=$derived(Math.max(0,directionLength-DIRECTION_LIMIT));
  const why=$derived(!title.trim()&&direction.trim()?labels.directionAlone:over?labels.directionOver(over,DIRECTION_LIMIT):'');
  const canSubmit=$derived(!!title.trim()&&!over&&validModel&&ready&&available&&!busy);
  const shape=$derived<Shape>(open?'two':focused||title.trim()?'cap':'rest');
  $effect(()=>{const next=shape,show=focused;untrack(()=>capsule?.apply(next,show));});
  $effect(()=>{
    if(visible){untrack(()=>{tone=cloneJson(room.defaultTone(settings));model=settings.provider.defaultModel;});
      void tick().then(()=>{capsule?.measure();capsule?.reposition();field?.focus();if(!arrived){motion?.arrival(field);arrived=true;}});
    }else{suggestions?.cancel();motion?.clear();}
  });
  $effect(()=>{if(reduced){motion?.clear();arriving=false;}});
  $effect(()=>{if(suggestButton)motion?.busy(suggestButton,thinking&&visible&&!reduced);});
  $effect(()=>{if(options.length&&visible)void tick().then(()=>{const first=document.querySelector('.welcome .chipbtn');if(first)motion?.fan(motion.center(first),10);});});
  onMount(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>osReduced=media.matches;update();media.addEventListener('change',update);
    motion=new WelcomeEmbers(canvas,()=>visible&&!reduced&&!document.hidden);
    if(visible&&!arrived){motion.arrival(field);arrived=true;}
    capsule=new Capsule({ask,cap,top,subj:field,dir:dirField,dock,lower,hair,btn:button,wrap,hint},()=>reduced);
    capsule.apply(untrack(()=>shape),untrack(()=>focused),true);
    const resize=()=>capsule?.reposition();addEventListener('resize',resize);
    return()=>{media.removeEventListener('change',update);removeEventListener('resize',resize);suggestions?.dispose();motion?.dispose();capsule?.dispose();};
  });
  async function submit(e?:Event){e?.preventDefault();if(!canSubmit)return;
    busy=true;error='';const snapshot={title:title.trim(),tone:cloneJson(tone),model,direction:direction.trim()};
    try{await motion?.handoff(field,button);await library.create(snapshot.title,snapshot.tone,snapshot.model,snapshot.direction);title='';direction='';open=false;}catch(e){error=String(e);}finally{busy=false;}
  }
  const inField=(el:EventTarget|null)=>el===field||el===dirField||el===button||(el instanceof Element&&!!el.closest('.starters'));
  function focusIn(e:FocusEvent){if(inField(e.target))focused=true;}
  function focusOut(e:FocusEvent){
    if(!inField(e.target))return;
    // Moving between the subject, the direction and the button keeps the capsule focused.
    setTimeout(()=>{if(inField(document.activeElement))return;focused=false;if(!direction.trim()){open=false;direction='';}},0);
  }
  async function openDirection(){open=true;await tick();dirField.focus();}
  function closeDirection(){
    direction='';
    const done=()=>{open=false;void tick().then(()=>{field.focus();field.setSelectionRange(field.value.length,field.value.length);});};
    if(capsule)capsule.fadeLower(done);else done();
  }
  // CR-13: a starter adds only its words at the cursor, after ', ' when text precedes it; the user writes the answer.
  function addStarter(s:WelcomeStarter){
    const text=direction,at=Math.min(dirField.selectionStart??text.length,text.length),sep=at&&!/[\s,]$/.test(text.slice(0,at))?', ':'';
    direction=text.slice(0,at)+sep+s.insert+text.slice(at);const caret=at+sep.length+s.insert.length-(s.caretBack??0);
    void tick().then(()=>{dirField.focus();dirField.setSelectionRange(caret,caret);capsule?.resized();});
  }
  function subjectKey(e:KeyboardEvent){
    if(e.key==='Escape'){title='';e.stopPropagation();}
    else if(e.key==='Enter'&&e.shiftKey){e.preventDefault();void openDirection();}
    else if(e.key==='Enter'){e.preventDefault();void submit();}
    else if(e.key==='ArrowDown'&&open){e.preventDefault();dirField.focus();}
  }
  function directionKey(e:KeyboardEvent){
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submit();}
    else if(e.key==='Escape'||(e.key==='Backspace'&&!dirField.value)){e.preventDefault();e.stopPropagation();closeDirection();}
    else if(e.key==='ArrowUp'&&dirField.selectionStart===0&&dirField.selectionEnd===0){e.preventDefault();field.focus();}
  }
  async function suggest(){if(!suggestions||!ready||!available)return;await suggestions.suggest(title,tone,{...settings,provider:{...settings.provider,defaultModel:model}},library.catalogue.summaries.map(s=>s.title));}
  function hover(event:MouseEvent){const el=event.currentTarget as HTMLElement,circles=[...el.querySelectorAll('circle')];if(circles.length>1)motion?.travel(motion.center(circles[0]),motion.center(circles.at(-1)!));}
</script>
<canvas class="embers" bind:this={canvas} aria-hidden="true" hidden={!visible||reduced}></canvas>
<main class="welcome" class:hidden={!visible}>
  <div class="wrap" class:first={!recent.length} bind:this={wrap}>
    {#if !recent.length&&available}<p class="lede">{labels.lede}</p>{/if}
    <form class="ask" bind:this={ask} onsubmit={submit} onfocusin={focusIn} onfocusout={focusOut}>
      <div class="cap" bind:this={cap}>
        <div class="top" bind:this={top}>
          <div class="question" class:arriving onanimationend={()=>arriving=false}><input class="subj" bind:this={field} bind:value={title} aria-label={labels.question} placeholder={labels.question} maxlength="120" disabled={!available||busy} onkeydown={subjectKey} /></div>
          <span class="dock" bind:this={dock}></span>
        </div>
        <div class="lower" bind:this={lower}>
          <div class="hair" bind:this={hair}></div>
          <!-- Limited by validation, not maxlength, so a pasted text over the limit stays visible and editable. -->
          <textarea class="dir" bind:this={dirField} bind:value={direction} rows="1" placeholder={labels.directionPlaceholder} aria-label={labels.directionLabel} disabled={!available||busy}
            onkeydown={directionKey} oninput={()=>void tick().then(()=>capsule?.resized())}></textarea>
          {#if starters.length}<div class="starters" role="group" aria-label={labels.startersLabel||undefined}>{#if labels.startersLabel}<span class="shint">{labels.startersLabel}</span>{/if}{#each starters as s,i}<button type="button" class="starter" style={`--delay:${125+i*50}ms`} onclick={()=>addStarter(s)}>{s.label}</button>{/each}</div>{/if}
          <div class="tail"><div class="dmeta">{#if directionLength>=400}<span class:over={over>0}>{directionLength} / {DIRECTION_LIMIT}</span>{/if}</div><span class="slot"></span></div>
        </div>
      </div>
      <button class="primary" bind:this={button} disabled={!canSubmit}>{labels.carryIn}</button>
    </form>
    <p class="example"><span class="hint" bind:this={hint}>{labels.example} <kbd>Shift+Enter</kbd> {labels.addsDirection}</span></p>
    {#if why}<p class="why" role="status">{why}</p>{/if}
    <div class="row">
      <div class="pickers">
        <TonePicker bind:tone name="welcome-tone" />
        <div class="model"><label for="welcome-model">{strings.newSubjectModel}</label><ModelPicker id="welcome-model" value={model} commit={next=>model=next} label={strings.newSubjectModel} live defaultModel={settings.provider.defaultModel} title={strings.thisSubjectOnly} /></div>
      </div>
      {#if typeof tone==='object'}<textarea aria-label={strings.customTone} maxlength="300" bind:value={tone.custom}></textarea>{/if}
      {#if suggestions}<button class="suggest" bind:this={suggestButton} disabled={thinking||!ready||!available||!validModel||busy} onclick={suggest}>{thinking?strings.thinkingSubjects:strings.suggestSubjects}</button>{/if}
    </div>
    {#if extra}{@render extra()}{/if}
    {#if options.length}<div class="chips">{#each options as option,i}<button class="chipbtn" style={`--delay:${i*50}ms`} onclick={()=>{title=option.title;field.focus();}}><b>{option.title}</b><span>{option.hook}</span></button>{/each}</div>{/if}
    {#if suggestError}<div class="inline-msg" role="alert">{strings.errorKinds[suggestError.kind]}<button onclick={suggest}>{strings.retry}</button></div>{/if}
    {#if error}<p class="inline-msg" role="alert">{error}</p>{/if}
    {#if !ready}<div class="inline-msg">{labels.cliNotReady} <button onclick={() => library.settings()}>{strings.settings}</button></div>{/if}
    {#if !available}<p class="libmsg">{labels.libraryUnavailable}</p>
    {:else if recent.length}<section class="shelf" class:wide={!!room.shelfWidth} style={room.shelfWidth?`--shelf:${room.shelfWidth}px`:undefined} aria-label={labels.recent}>
      <h2>{labels.recent}</h2><div class="cards">
        {#each recent as summary (summary.id)}{#if card}{@render card(summary,{open:()=>void library.open(summary.id),light:(a,b)=>void motion?.travel(a,b)})}{:else}<button class="card" onmouseenter={hover} onclick={()=>library.open(summary.id)}>
          {@render visual?.(summary)}<h3>{summary.title}</h3><div class="meta"><b>{@render figure?.(summary)}</b><span title={exactDate(library.catalogue.state.lastOpenedAt[summary.id])}>{relativeDate(library.catalogue.state.lastOpenedAt[summary.id])}</span></div><span class="cont">{labels.continue}</span>
        </button>{/if}{/each}
      </div><button class="browse" onclick={()=>navigate('gallery')}>{strings.browseAll(total)}</button>
    </section>{/if}
  </div>
</main>
<style>
  .hidden{display:none}.welcome{height:100%;overflow:auto;--ink-faint:color-mix(in srgb,var(--ink-mute) 62%,var(--bg));font-family:'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif}
  .wrap{max-width:760px;margin:0 auto;padding:18vh 24px 96px;display:flex;flex-direction:column;gap:20px}.wrap.first{padding-top:24vh}.lede{font-size:16px;line-height:1.7;color:var(--ink-mute);text-align:center;margin:0 0 12px}
  .ask{position:relative;display:flex;flex-direction:column}.ask:before{content:'';position:absolute;width:min(560px,100%);height:240px;top:-100px;left:50%;transform:translateX(-50%);background:radial-gradient(ellipse,var(--glow-far),transparent 70%);pointer-events:none}
  /* WG-9/10, welcome-context recipe: rest = the v0.1.0 field; capsule (.on); two-part card (.two). The classes are set by capsule.ts. */
  .cap{position:relative;display:flex;flex-direction:column;border:1px solid transparent;border-bottom-color:color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:0;background:transparent;padding:0}
  .cap:global(.anim){overflow:hidden}.top{display:flex;align-items:center}.dock{flex:0 0 auto;width:0;height:1px}.lower{display:none}
  .subj{position:relative;width:100%;box-sizing:border-box;border:0;border-radius:0;background:transparent;font-family:'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;font-size:38px;font-weight:350;letter-spacing:-.01em;line-height:1.25;padding:6px 0 14px;text-align:center;caret-color:var(--accent)}
  .cap:global(.on){border-color:color-mix(in srgb,var(--accent) 60%,var(--line));border-radius:32px;background:color-mix(in srgb,var(--bg) 70%,transparent);padding:4px 6px 4px 28px}
  .cap:global(.on) .subj{text-align:left;font-size:22px;font-weight:400;padding:8px 0}
  .cap:global(.on.focused) .dock{width:calc(var(--bw) + 10px)}
  .cap:global(.two){border-radius:24px;padding:8px 8px 8px 24px}.cap:global(.two) .dock{width:0}.cap:global(.two) .lower{display:block}
  .hair{height:1px;background:var(--line);transform-origin:left center;margin-right:16px}
  .dir{display:block;width:100%;box-sizing:border-box;resize:none;overflow:hidden;border:0;border-radius:0;background:transparent;font-size:15px;line-height:1.5;color:var(--ink);caret-color:var(--accent);padding:10px 16px 6px 0;text-align:left}
  .tail{display:flex;align-items:center;justify-content:space-between;gap:12px}.dmeta{font-size:11px;color:var(--ink-faint);min-height:14px;font-variant-numeric:tabular-nums}.over{color:var(--error-ink)}
  .slot{width:0;height:0}.cap:global(.focused) .slot{width:var(--bw);height:var(--bh)}
  .question{position:relative;flex:1;min-width:0}.question.arriving:after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--accent);transform-origin:left;animation:underline 650ms ease-out}
  /* B6: no focus box-shadow; its blurred rectangle showed the field's edges over the glow. */
  .subj:focus,.dir:focus{outline:none}.subj::placeholder,.dir::placeholder{color:var(--ink-faint)}
  .primary{position:absolute;left:0;top:0;margin:0;white-space:nowrap;overflow:hidden;z-index:3;visibility:hidden;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;background:var(--accent);color:var(--accent-ink);border:1px solid var(--accent)}.primary:global(.show){visibility:visible}.primary:hover:not(:disabled){background:var(--focus)}.primary:disabled{background:var(--surface-2);color:var(--ink-faint);border-color:var(--line);box-shadow:none;opacity:1}
  .example{margin:-8px 0 0;text-align:center;font-size:12px;color:var(--ink-faint);font-family:'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif}.example kbd{font:inherit;color:var(--ink-mute)}.hint{display:inline-block;transform-origin:0 0}
  .wrap:global(.capsule) .example{text-align:left;font-size:11px;padding-left:29px}.wrap:global(.capsule.two) .example{padding-left:25px}.why{margin:-6px 0 0;text-align:center;font-size:12px;color:var(--ink-mute)}.row{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:6px}.pickers{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px}
  .model{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;font-size:11px;color:var(--ink-mute)}.model :global(select){border:0;background:transparent;color:var(--ink-mute);font-size:12px;padding:5px 6px}.model :global(option){background:var(--surface)}textarea{width:min(400px,100%)}.suggest,.browse{border:0;background:transparent;font-size:12px;color:var(--ink-mute);padding:2px}.suggest{text-decoration:underline;text-underline-offset:3px}.suggest:hover:not(:disabled),.browse:hover{color:var(--accent)}
  .chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.chipbtn{text-align:left;display:flex;flex-direction:column;gap:3px;max-width:220px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);animation:appear 200ms both;animation-delay:var(--delay)}.chipbtn b{font-size:14px;font-weight:600}.chipbtn span{font-size:12px;color:var(--ink-mute);line-height:1.4}.inline-msg{text-align:center;font-size:12px;color:var(--ink-mute)}.inline-msg button{margin-left:8px;font-size:12px}.libmsg{padding:24px;text-align:center;border:1px dashed var(--line);color:var(--ink-mute)}
  .shelf.wide{width:min(var(--shelf),calc(100vw - 32px));align-self:center}.shelf{margin-top:15vh;display:flex;flex-direction:column;gap:18px}.shelf h2{margin:0;text-align:center;font-size:11px;font-weight:600;color:var(--ink-faint)}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.card{display:flex;flex-direction:column;gap:10px;padding:0;border:0;background:transparent;text-align:left;opacity:.7}.card:hover,.card:focus-visible{opacity:1}.card:hover :global(.thumbnail){filter:drop-shadow(0 0 12px var(--glow-far))}.card h3{font-size:16px;font-weight:600;margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.meta{display:flex;justify-content:space-between;gap:8px;width:100%;font-size:12px;color:var(--ink-faint);font-variant-numeric:tabular-nums}.meta b{font-weight:400;color:var(--ink-mute)}.cont{font-size:12px;color:var(--ink-mute);text-decoration:underline;text-underline-offset:3px}.browse{align-self:center;padding:6px}
  .starters{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 16px 6px 0}.shint{font-size:11px;color:var(--ink-faint);margin-right:2px}.starter{border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink-mute);padding:3px 10px;font-size:12px;animation:appear 200ms both;animation-delay:var(--delay)}.starter:hover{border-color:var(--accent);color:var(--accent)}
  button,input{transition:color 180ms ease-out,opacity 180ms ease-out,box-shadow 180ms ease-out,background 180ms ease-out}.embers{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8}
  @keyframes underline{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes appear{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  @media(max-width:760px){.subj{font-size:26px}.cap:global(.on) .subj{font-size:20px}.cards{grid-template-columns:1fr}.wrap,.wrap.first{padding-top:10vh}}
  @media(prefers-reduced-motion:reduce){*,*:before{animation:none!important;transition:none!important}.embers{display:none}}
  :global(html[data-reduce-motion='on']) *{animation:none!important;transition:none!important}
</style>
