<script lang="ts">
  // CR-12, choose-gallery recipe: the status band (status, opened <relative>; the exact time in the tooltip).
  import type { SubjectSummary } from '../../../frame/catalogue';
  import { exactDate, relativeDate } from '../../../frame/library-format';
  import { chooseOf } from '../summary';
  import { text } from './strings';
  let { summary, openedAt, lifted = false }: { summary: SubjectSummary; openedAt?: string; lifted?: boolean } = $props();
  const card = $derived(chooseOf(summary));
  const status = $derived(card?.status ?? 'exploring');
</script>
<div class="top" data-s={status} class:ready={card?.ready} class:lifted><span class="st">{text.status[status]}</span><span class="when" title={exactDate(openedAt)}>{openedAt ? text.opened(relativeDate(openedAt)) : 'not opened yet'}</span></div>
<style>
  .top{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 20px;border-radius:12px 12px 0 0;font:11px/1.45 var(--font-small,'Segoe UI Variable Small','Segoe UI',system-ui,sans-serif);color:var(--accent);border-bottom:1px solid color-mix(in srgb,var(--accent) 35%,transparent)}
  .lifted{padding:10px 22px;border-radius:14px 14px 0 0}
  .st{display:inline-flex;align-items:center;gap:6px;font-weight:600}.st:before{content:'';width:7px;height:7px;border-radius:50%;box-sizing:border-box;border:1px dashed var(--accent)}
  .when{color:var(--ink-faint);white-space:nowrap}
  .ready{background:color-mix(in srgb,var(--accent) 18%,transparent)}
  [data-s=decided]{background:var(--surface-2);color:var(--focus);border-bottom-color:transparent}[data-s=decided] .st:before{border:1.5px solid var(--focus)}[data-s=decided] .when{color:color-mix(in srgb,var(--focus) 70%,transparent)}
  [data-s=bought]{background:var(--accent);color:var(--accent-ink);border-bottom-color:transparent}[data-s=bought] .st:before{background:var(--accent-ink);border:0}[data-s=bought] .when{color:color-mix(in srgb,var(--accent-ink) 75%,transparent)}
</style>
