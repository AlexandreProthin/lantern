<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import type { SpaceProps } from '../../frame/room';
  import type { Tone } from '../../core/model';
  import { cloneJson } from '../../core/model';
  import { strings } from '../../ui/strings';
  import { exactDate, relativeDate } from '../../frame/library-format';
  import { isValidModel } from '../../core/models';
  import ModelPicker from '../../ui/ModelPicker.svelte';
  import { SubjectSuggestions } from './suggestions';
  import { WelcomeEmbers } from './embers';
  import Thumbnail from './Thumbnail.svelte';
  let { visible, settings, library, revision, navigate }: SpaceProps = $props();
  let arriving=$state(true);
  let title=$state(''),tone=$state<Tone>('curious'),model=$state('opus'),busy=$state(false),error=$state('');
  let suggestionRevision=$state(0),field:HTMLInputElement,button:HTMLButtonElement,suggestButton:HTMLButtonElement,canvas:HTMLCanvasElement;
  let motion:WelcomeEmbers|undefined,arrived=false,osReduced=$state(false);
  const suggestions=new SubjectSuggestions(untrack(()=>library.provider),()=>suggestionRevision++);
  const thinking=$derived.by(()=>{suggestionRevision;return suggestions.running;});
  const options=$derived.by(()=>{suggestionRevision;return suggestions.options;});
  const suggestError=$derived.by(()=>{suggestionRevision;return suggestions.error;});
  const recent=$derived.by(()=>{revision;return library.catalogue.recent;});
  const total=$derived.by(()=>{revision;return library.catalogue.summaries.length;});
  const available=$derived.by(()=>{revision;return library.available;});
  const ready=$derived.by(()=>{revision;return library.providerReady;});
  const validModel=$derived(isValidModel(model));
  const reduced=$derived(osReduced||settings.appearance.reduceMotion==='on');
  $effect(()=>{
    if(visible){untrack(()=>{tone=cloneJson(settings.learn.defaultTone);model=settings.provider.defaultModel;});
      void tick().then(()=>{field?.focus();if(!arrived){motion?.arrival(field);arrived=true;}});
    }else{suggestions.cancel();motion?.clear();}
  });
  $effect(()=>{if(reduced){motion?.clear();arriving=false;}});
  $effect(()=>{motion?.busy(suggestButton,thinking&&visible&&!reduced);});
  $effect(()=>{if(options.length&&visible)void tick().then(()=>{const first=document.querySelector('.welcome .chipbtn');if(first)motion?.fan(motion.center(first),10);});});
  onMount(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>osReduced=media.matches;update();media.addEventListener('change',update);
    motion=new WelcomeEmbers(canvas,()=>visible&&!reduced&&!document.hidden);
    if(visible&&!arrived){motion.arrival(field);arrived=true;}
    return()=>{media.removeEventListener('change',update);suggestions.dispose();motion?.dispose();};
  });
  async function submit(e:SubmitEvent){e.preventDefault();if(busy||!ready||!available||!title.trim()||!validModel)return;
    busy=true;error='';const snapshot={title:title.trim(),tone:cloneJson(tone),model};
    try{await motion?.handoff(field,button);await library.create(snapshot.title,snapshot.tone,snapshot.model);title='';}catch(e){error=String(e);}finally{busy=false;}
  }
  async function suggest(){if(!ready||!available)return;await suggestions.suggest(title,tone,{...settings,provider:{...settings.provider,defaultModel:model}},library.catalogue.summaries.map(s=>s.title));}
  function hover(event:MouseEvent){const el=event.currentTarget as HTMLElement,circles=[...el.querySelectorAll('circle')];if(circles.length>1)motion?.travel(motion.center(circles[0]),motion.center(circles.at(-1)!));}
</script>
<canvas class="embers" bind:this={canvas} aria-hidden="true" hidden={!visible||reduced}></canvas>
<main class="welcome" class:hidden={!visible}>
  <div class="wrap" class:first={!recent.length}>
    {#if !recent.length&&available}<p class="lede">{strings.firstWelcome}</p>{/if}
    <form class="ask" onsubmit={submit}>
      <div class="question" class:arriving onanimationend={()=>arriving=false}><input bind:this={field} bind:value={title} aria-label={strings.subjectQuestion} placeholder={strings.subjectQuestion} maxlength="120" disabled={!available||busy}
        onkeydown={e=>{if(e.key==='Escape'){title='';e.stopPropagation();}}} /></div>
      <button class="primary" bind:this={button} disabled={!title.trim()||!validModel||!ready||!available||busy}>{strings.carryIn}</button>
    </form>
    <p class="example">{strings.subjectExample}</p>
    <div class="row">
      <div class="pickers">
        <fieldset class="tones"><legend class="sr-only">{strings.tone}</legend>
          {#each Object.entries(strings.tones) as [value,label]}<label><input type="radio" name="welcome-tone" value={value} checked={(typeof tone==='string'?tone:'custom')===value}
            onchange={()=>tone=value==='custom'?{custom:''}:value as Tone} />{label}</label>{/each}
        </fieldset>
        <div class="model"><label for="welcome-model">{strings.newSubjectModel}</label><ModelPicker id="welcome-model" value={model} commit={next=>model=next} label={strings.newSubjectModel} live defaultModel={settings.provider.defaultModel} title={strings.thisSubjectOnly} /></div>
      </div>
      {#if typeof tone==='object'}<textarea aria-label={strings.customTone} maxlength="300" bind:value={tone.custom}></textarea>{/if}
      <button class="suggest" bind:this={suggestButton} disabled={thinking||!ready||!available||!validModel||busy} onclick={suggest}>{thinking?strings.thinkingSubjects:strings.suggestSubjects}</button>
    </div>
    {#if options.length}<div class="chips">{#each options as option,i}<button class="chipbtn" style={`--delay:${i*50}ms`} onclick={()=>{title=option.title;field.focus();}}><b>{option.title}</b><span>{option.hook}</span></button>{/each}</div>{/if}
    {#if suggestError}<div class="inline-msg" role="alert">{strings.errorKinds[suggestError.kind]}<button onclick={suggest}>{strings.retry}</button></div>{/if}
    {#if error}<p class="inline-msg" role="alert">{error}</p>{/if}
    {#if !ready}<div class="inline-msg">{strings.cliNotReady} <button onclick={library.settings}>{strings.settings}</button></div>{/if}
    {#if !available}<p class="libmsg">{strings.libraryUnavailable}</p>
    {:else if recent.length}<section class="shelf" aria-label={strings.recentSubjects}>
      <h2>{strings.recentSubjects}</h2><div class="cards">
        {#each recent as summary (summary.id)}<button class="card" onmouseenter={hover} onclick={()=>library.open(summary.id)}>
          <Thumbnail {summary} {library}/><h3>{summary.title}</h3><div class="meta"><b>{summary.understood??0} / {summary.total??0}</b><span title={exactDate(library.catalogue.state.lastOpenedAt[summary.id])}>{relativeDate(library.catalogue.state.lastOpenedAt[summary.id])}</span></div><span class="cont">{strings.continueSubject}</span>
        </button>{/each}
      </div><button class="browse" onclick={()=>navigate('gallery')}>{strings.browseAll(total)}</button>
    </section>{/if}
  </div>
</main>
<style>
  .hidden{display:none}.welcome{height:100%;overflow:auto;--ink-faint:color-mix(in srgb,var(--ink-mute) 62%,var(--bg));font-family:'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif}
  .wrap{max-width:760px;margin:0 auto;padding:18vh 24px 96px;display:flex;flex-direction:column;gap:20px}.wrap.first{padding-top:24vh}.lede{font-size:16px;line-height:1.7;color:var(--ink-mute);text-align:center;margin:0 0 12px}
  .ask{position:relative;display:flex;flex-direction:column;gap:20px}.ask:before{content:'';position:absolute;width:min(560px,100%);height:240px;top:-100px;left:50%;transform:translateX(-50%);background:radial-gradient(ellipse,var(--glow-far),transparent 70%);pointer-events:none}
  .ask input{position:relative;width:100%;border:0;border-bottom:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:0;background:transparent;font-family:'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;font-size:38px;font-weight:350;letter-spacing:-.01em;line-height:1.25;padding:6px 0 14px;text-align:center;caret-color:var(--accent);}
  .question{position:relative}.question.arriving:after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--accent);transform-origin:left;animation:underline 650ms ease-out}
  .ask input:focus{outline:none;border-bottom-color:var(--accent);box-shadow:0 6px 15px -10px var(--glow-near)}.ask input::placeholder{color:var(--ink-faint)}
  .primary{align-self:center;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;background:var(--accent);color:var(--accent-ink);border:1px solid var(--accent);box-shadow:0 0 26px var(--glow-far)}.primary:hover:not(:disabled){background:var(--focus)}.primary:disabled{background:var(--surface-2);color:var(--ink-faint);border-color:var(--line);box-shadow:none;opacity:1}
  .example{margin:-8px 0 0;text-align:center;font-size:12px;color:var(--ink-faint);font-family:'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif}.row{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:6px}.pickers{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px}.tones{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:0}.tones label{position:relative;padding:5px 10px;font-size:12px;color:var(--ink-mute);border-radius:999px;cursor:pointer}.tones input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.tones label:has(input:checked){background:var(--surface-2);color:var(--node-lit)}.tones label:has(input:focus-visible){outline:2px solid var(--focus)}
  .model{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;font-size:11px;color:var(--ink-mute)}.model :global(select){border:0;background:transparent;color:var(--ink-mute);font-size:12px;padding:5px 6px}.model :global(option){background:var(--surface)}textarea{width:min(400px,100%)}.suggest,.browse{border:0;background:transparent;font-size:12px;color:var(--ink-mute);padding:2px}.suggest{text-decoration:underline;text-underline-offset:3px}.suggest:hover:not(:disabled),.browse:hover{color:var(--accent)}
  .chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.chipbtn{text-align:left;display:flex;flex-direction:column;gap:3px;max-width:220px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);animation:appear 200ms both;animation-delay:var(--delay)}.chipbtn b{font-size:14px;font-weight:600}.chipbtn span{font-size:12px;color:var(--ink-mute);line-height:1.4}.inline-msg{text-align:center;font-size:12px;color:var(--ink-mute)}.inline-msg button{margin-left:8px;font-size:12px}.libmsg{padding:24px;text-align:center;border:1px dashed var(--line);color:var(--ink-mute)}
  .shelf{margin-top:15vh;display:flex;flex-direction:column;gap:18px}.shelf h2{margin:0;text-align:center;font-size:11px;font-weight:600;color:var(--ink-faint)}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.card{display:flex;flex-direction:column;gap:10px;padding:0;border:0;background:transparent;text-align:left;opacity:.7}.card:hover,.card:focus-visible{opacity:1}.card:hover :global(.thumbnail){filter:drop-shadow(0 0 12px var(--glow-far))}.card h3{font-size:16px;font-weight:600;margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.meta{display:flex;justify-content:space-between;gap:8px;width:100%;font-size:12px;color:var(--ink-faint);font-variant-numeric:tabular-nums}.meta b{font-weight:400;color:var(--ink-mute)}.cont{font-size:12px;color:var(--ink-mute);text-decoration:underline;text-underline-offset:3px}.browse{align-self:center;padding:6px}
  button,input{transition:color 180ms ease-out,opacity 180ms ease-out,box-shadow 180ms ease-out,background 180ms ease-out}.embers{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  @keyframes underline{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes appear{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  @media(max-width:760px){.ask input{font-size:26px}.cards{grid-template-columns:1fr}.wrap,.wrap.first{padding-top:10vh}}
  @media(prefers-reduced-motion:reduce){*,*:before{animation:none!important;transition:none!important}.embers{display:none}}
  :global(html[data-reduce-motion='on']) *{animation:none!important;transition:none!important}
</style>
