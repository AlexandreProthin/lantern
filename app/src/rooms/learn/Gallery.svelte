<script lang="ts">
  // Learn's Gallery: the shared grid (ui/GalleryGrid) with Learn's thumbnail, figures and details.
  import type { SpaceProps } from '../../frame/room';
  import type { SubjectSummary } from '../../frame/catalogue';
  import type { CardDetail } from '../../ui/gallery-types';
  import { tokens, modelName, exactDate, relativeDate } from '../../frame/library-format';
  import { strings } from '../../ui/strings';
  import GalleryGrid from '../../ui/GalleryGrid.svelte';
  import Thumbnail from './Thumbnail.svelte';
  let { visible, settings, library, revision, navigate }: SpaceProps = $props();
</script>
{#snippet visual(summary: SubjectSummary)}<Thumbnail {summary} {library}/>{/snippet}
{#snippet figures(summary: SubjectSummary, detail: CardDetail)}
  <div class="progress" aria-label={`${strings.progress}: ${Math.round(detail.progress*100)}%`}><span style={`width:${detail.progress*100}%`}></span></div>
  <dl><div><dt>{strings.nodes}</dt><dd>{detail.total??0}</dd></div><div><dt>{strings.lit}</dt><dd>{detail.lit??0}</dd></div>
    <div><dt>{strings.understoodCount}</dt><dd>{strings.understoodSplit(detail.understood??0,detail.demonstrated??0,detail.self??0)}</dd></div>
    {#if settings.appearance.showTokenStats}<div><dt>{strings.tokensSpent}</dt><dd>{tokens(summary.tokens)}</dd></div>{/if}
  </dl>
  <p class="span" title={exactDate(detail.lastOpenedAt)}>{strings.created} {summary.createdAt?new Date(summary.createdAt).toLocaleDateString():strings.noneYet} → {relativeDate(detail.lastOpenedAt)}</p>
  <p class="model">{modelName(summary.mainModel)}</p>
{/snippet}
{#snippet details(summary: SubjectSummary, detail: CardDetail)}
  <dl class="details">
    <div><dt>{strings.dark}</dt><dd>{detail.dark??0}</dd></div>
    {#if settings.appearance.showTokenStats}<div><dt>{strings.tokensSpent}</dt><dd>{strings.inOut(tokens(detail.input),tokens(detail.output))}</dd></div>{/if}
    <div><dt>{strings.created}</dt><dd>{exactDate(detail.createdAt)}</dd></div><div><dt>{strings.lastOpened}</dt><dd>{exactDate(detail.lastOpenedAt)}</dd></div>
    <div><dt>{strings.tone}</dt><dd>{typeof detail.tone==='object'?detail.tone.custom:detail.tone?strings.tones[detail.tone]:strings.noneYet}</dd></div>
    <div><dt>{strings.modelsUsed}</dt><dd>{#each detail.models as model,j}{j?' · ':''}{modelName(model.model)}{#if 'share' in model&&model.share!==null}{` ${model.share}%`}{/if}{:else}{strings.noneYet}{/each}</dd></div>
    <div><dt>{strings.generations}</dt><dd>{detail.generations??0}</dd></div>
  </dl>
{/snippet}
<GalleryGrid {visible} {settings} {library} {revision} {navigate} {visual} {figures} {details} />
<style>
  .progress{height:2px;background:var(--line);margin-bottom:16px}.progress span{display:block;height:100%;background:var(--node-understood)}dl{display:grid;gap:7px;margin:0;font-size:12px}dl>div{display:flex;justify-content:space-between;gap:12px}dt{color:var(--ink-mute)}dd{margin:0;text-align:right;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.span,.model{font-size:12px;color:var(--ink-mute);margin:12px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.details{border-top:1px solid var(--line);padding-top:14px;margin-top:16px}
</style>
