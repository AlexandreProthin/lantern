<script lang="ts">
  // Choose-gallery recipe: four bars, Needs (answered / total), Criteria (ranked / total), Shortlist (count, full at 2), Pick.
  import type { SubjectSummary } from '../../../frame/catalogue';
  import { chooseOf } from '../summary';
  import { text } from './strings';
  let { summary }: { summary: SubjectSummary } = $props();
  const steps = $derived.by(() => {
    const s = chooseOf(summary)?.steps; if (!s) return [];
    const frac = (done: number, of: number) => of ? Math.min(1, done / of) : 0;
    return [
      { label: text.steps.needs, f: frac(s.needsAnswered, s.needsTotal), v: `${s.needsAnswered}/${s.needsTotal}` },
      { label: text.steps.criteria, f: frac(s.criteriaRanked, s.criteriaTotal), v: `${s.criteriaRanked}/${s.criteriaTotal}` },
      { label: text.steps.shortlist, f: Math.min(s.shortlisted, 2) / 2, v: String(s.shortlisted) },
      { label: text.steps.pick, f: s.pick === 'none' ? 0 : 1, v: s.pick === 'none' ? '—' : s.pick === 'bought' ? text.boughtWord : text.chosen },
    ];
  });
</script>
<div class="steps" role="img" aria-label={steps.map(s => `${s.label} ${s.v}`).join(', ')}>
  {#each steps as s, i}<div class="step" class:full={s.f >= 1}><i><b style={`width:${Math.round(s.f * 100)}%;--i:${i}`}></b></i><span>{s.label}</span><em>{s.v}</em></div>{/each}
</div>
<style>
  .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.step{display:grid;gap:2px;min-width:0}
  .step i{display:block;height:4px;border-radius:2px;position:relative;overflow:hidden;background:color-mix(in srgb,var(--ink) 6%,transparent)}
  .step i b{position:absolute;inset:0 auto 0 0;border-radius:2px;background:color-mix(in srgb,var(--accent) 55%,transparent);transform-origin:left;animation:fill 360ms cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(200ms + var(--i) * 30ms)}.step.full i b{background:var(--accent)}
  .step span,.step em{font:11px var(--font-small,'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif);font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.step span{color:var(--ink-faint)}.step em{color:var(--ink-mute);font-variant-numeric:tabular-nums}
  @keyframes fill{from{transform:scaleX(0)}to{transform:none}}
  @media(prefers-reduced-motion:reduce){.step i b{animation:none}}:global(html[data-reduce-motion='on']) .step i b{animation:none}
</style>
