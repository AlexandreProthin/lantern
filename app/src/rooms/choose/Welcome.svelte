<script lang="ts">
  // Choose's Welcome (CR-12, CR-13, PS-28): the shared Welcome with the needs field and its starters, the locale line
  // and Gallery's resting card with a Continue link; no subject suggestions.
  import type { SpaceProps } from '../../frame/room';
  import type { SubjectSummary } from '../../frame/catalogue';
  import type { WelcomeCardTools, WelcomeRoomView, WelcomeStarter } from '../../ui/welcome-types';
  import Welcome from '../../ui/Welcome.svelte';
  import { chooseSettings } from './settings';
  import Band from './library/Band.svelte';
  import Steps from './library/Steps.svelte';
  import PickLine from './library/PickLine.svelte';
  import { localeNames } from './library/format';
  import { text } from './library/strings';
  import { chooseOf } from './summary';
  let { visible, settings, library, revision, navigate }: SpaceProps = $props();
  const choose = $derived(chooseSettings(settings));
  const names = $derived(localeNames(choose.country, choose.currency));
  const starters = (s: typeof settings): WelcomeStarter[] => {
    const symbol = localeNames(chooseSettings(s).country, chooseSettings(s).currency).symbol;
    return [{ label: `Budget (${symbol})`, insert: `budget about  ${symbol}`, caretBack: symbol.length + 1 }, { label: 'Who it’s for', insert: 'it’s for ' },
      { label: 'What for', insert: 'I want to use it to ' }, { label: 'Where it goes', insert: 'it will be in ' }, { label: 'Already have', insert: 'I already have ' },
      { label: 'Must avoid', insert: 'I don’t want ' }];
  };
  const room: WelcomeRoomView = {
    defaultTone: s => chooseSettings(s).defaultTone, starters, shelfWidth: 920,
    labels: { lede: text.lede, question: text.question, example: text.example, addsDirection: text.addsNeeds, directionPlaceholder: text.needsPlaceholder,
      directionLabel: text.needsLabel, directionAlone: text.needsAlone, directionOver: text.needsOver, startersLabel: text.startersLabel,
      recent: text.continueChoice, continue: text.continue, libraryUnavailable: text.libraryUnavailable },
  };
  const opened = (s: SubjectSummary) => { revision; return library.catalogue.state.lastOpenedAt[s.id]; };
  const running = (s: SubjectSummary) => { revision; return library.isRunning(s.id); };
  // CR-12 motion: once per entry a light runs along the steps bar, to the end of the last filled bar; none on an empty bar.
  function hover(e: MouseEvent, tools: WelcomeCardTools) {
    const bars = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.step i')];
    const filled = bars.map(i => ({ i, b: i.firstElementChild as HTMLElement })).filter(x => parseFloat(x.b.style.width) > 0);
    if (!bars.length || !filled.length) return;
    const first = bars[0].getBoundingClientRect(), last = filled.at(-1)!.b.getBoundingClientRect(), y = first.top + first.height / 2;
    tools.light({ x: first.left, y }, { x: last.right, y });
  }
  function openSettings() {
    library.settings('room:choose');
  }
</script>
{#snippet extra()}
  <p class="locale">{text.localePrices(names.name, names.symbol)} · {choose.useWeb ? text.researchWeb : text.webOff} · <button type="button" onclick={openSettings}>{text.change}</button></p>
{/snippet}
{#snippet card(summary: SubjectSummary, tools: WelcomeCardTools)}
  {@const c = chooseOf(summary)}
  <button class="card" data-s={c?.status ?? 'exploring'} title={summary.title} onclick={tools.open} onmouseenter={e => hover(e, tools)}>
    <Band {summary} openedAt={opened(summary)} />
    <span class="ttl">{summary.title}</span>
    <div class="mid"><Steps {summary} /></div>
    <div class="mid"><PickLine {summary} running={running(summary)} /></div>
    <span class="foot"><span class="stats">{c ? `${text.needsN(c.stats.needs)} · ${text.criteriaN(c.stats.criteria)} · ${text.shortlistedN(c.stats.shortlisted)}` : ''}</span><span class="cont">{text.continue}</span></span>
  </button>
{/snippet}
<Welcome {visible} {settings} {library} {revision} {navigate} {room} {extra} {card} />
<style>
  .locale{margin:0;text-align:center;font:11px var(--font-small,'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif);color:var(--ink-faint)}
  .locale button{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;text-underline-offset:3px}.locale button:hover{color:var(--accent)}
  .card{position:relative;display:flex;flex-direction:column;gap:12px;padding:0 0 16px;border-radius:12px;min-width:0;text-align:left;color:inherit;font-family:var(--font-text,'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif);background:var(--glass);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-line);opacity:.7;transition:opacity .2s,border-color .2s}
  .card:hover,.card:focus-visible{opacity:1;border-color:color-mix(in srgb,var(--accent) 35%,transparent)}
  .ttl{margin:6px 20px 0;font:400 13px/1.45 var(--font-text,'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif);color:var(--ink-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mid{margin:0 20px;min-width:0}
  .foot{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:0 20px;border-top:1px solid var(--glass-line);padding-top:10px;font:11px/1.45 var(--font-small,'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif);color:var(--ink-faint)}
  .stats{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cont{flex:0 0 auto;font-size:12px;color:var(--ink-mute);text-decoration:underline;text-underline-offset:3px}
</style>
