<script lang="ts">
  // DC-13, DC-21, DC-22, DC-32: one console entry: a line, and once expanded its sections or details.
  import { strings } from '../../ui/strings';
  import type { TraceEntry } from './trace.svelte';
  import { callDuration, callSummary, callTokens, estimateTokens, formatDuration, formatTime, prettyDetail, toolLine } from './console-filter';
  import ConsoleText from './ConsoleText.svelte';
  let { entry, selected, expanded, toggle }: { entry: TraceEntry; selected: boolean; expanded: boolean; toggle: (id: number) => void } = $props();
  const s = strings.debug, f = strings.debug.fields;
  const yesNo = (v: boolean) => v ? s.yes : s.no;
  const hasBody = $derived(entry.kind === 'call' || entry.detail !== undefined);
</script>
<div class="entry k-{entry.kind}" class:selected data-entry-id={entry.id} data-kind={entry.kind}>
  <button class="line" aria-expanded={hasBody ? expanded : undefined} aria-pressed={selected} onclick={() => toggle(entry.id)}>
    <span class="chev" aria-hidden="true">{hasBody ? (expanded ? '▾' : '▸') : ' '}</span>
    <span class="time">{formatTime(entry.at)}</span>
    <span class="tag">{s.kinds[entry.kind]}</span>
    <span class="origin">{entry.origin}</span>
    {#if entry.kind === 'call'}
      {@const tokens = callTokens(entry)}{@const duration = callDuration(entry)}
      <span class="summary">{callSummary(entry)}</span>
      {#if entry.web}<span class="badge">{s.web}</span>{/if}
      <span class="status st-{entry.status}">{s.status[entry.status]}</span>
      {#if entry.missingLayers.length}<span class="warnmark" title={s.missingLayers(entry.missingLayers.join(', '))}>⚠</span>{/if}
      {#if entry.status !== 'running' && tokens}<span class="meta">{tokens}</span>{/if}
      {#if entry.status !== 'running' && duration !== null}<span class="meta">{formatDuration(duration)}</span>{/if}
    {:else}
      <span class="summary">{entry.summary}</span>
    {/if}
  </button>
  {#if expanded && hasBody}
    <div class="body">
      {#if entry.kind === 'call'}
        {@const c = entry.completion}
        {#if entry.missingLayers.length}<p class="warning" role="note">⚠ {s.missingLayers(entry.missingLayers.join(', '))}</p>{/if}
        <details open><summary>{s.sections.origin}</summary>
          <dl><dt>{f.origin}</dt><dd>{entry.origin}</dd>
            {#if entry.tag?.subjectId}<dt>{f.subject}</dt><dd>{entry.tag.subjectId}</dd>{/if}
            {#if entry.tag?.nodeId}<dt>{f.node}</dt><dd>{entry.tag.nodeId}</dd>{/if}</dl>
        </details>
        <details open><summary>{s.sections.request}</summary>
          <dl><dt>{f.requested}</dt><dd>{entry.requestedModel || strings.defaultLabel}</dd>
            {#if c && entry.model && entry.model !== entry.requestedModel}<dt>{f.resolved}</dt><dd>{entry.model}</dd>{/if}
            {#if c?.servedModel}<dt>{f.served}</dt><dd>{c.servedModel}</dd>{/if}
            <dt>{f.effort}</dt><dd>{entry.effort || strings.defaultLabel}</dd>
            {#if c?.resolvedEffort && c.resolvedEffort !== entry.effort}<dt>{f.resolvedEffort}</dt><dd>{c.resolvedEffort}</dd>{/if}
            <dt>{f.web}</dt><dd>{yesNo(entry.web)}</dd>
            <dt>{f.requestId}</dt><dd>{entry.requestId}</dd>
            {#if entry.tag?.promptVersion}<dt>{f.promptVersion}</dt><dd>{entry.tag.promptVersion}</dd>{/if}</dl>
        </details>
        <details open><summary>{s.sections.system} <span class="dim">{s.chars(entry.system.length)} · {s.tokens(estimateTokens(entry.system.length))}</span></summary><ConsoleText text={entry.system} /></details>
        {#if entry.tag?.layers?.length || entry.tag?.stats}
          <details open><summary>{s.sections.context}</summary>
            {#each entry.tag?.layers ?? [] as layer, i (i)}
              <details class="layer" class:missing={entry.missingLayers.includes(layer.name)}><summary><b>{layer.name}</b> <span class="dim">{s.chars(layer.text.length)} · {s.tokens(estimateTokens(layer.text.length))}</span>{#if entry.missingLayers.includes(layer.name)} <span class="warnmark">⚠</span>{/if}</summary><ConsoleText text={layer.text} /></details>
            {/each}
            {#if entry.tag?.stats}<div class="stats"><span class="dim">{f.stats}</span><ConsoleText text={prettyDetail(entry.tag.stats)} /></div>{/if}
          </details>
        {/if}
        <details open><summary>{s.sections.prompt} <span class="dim">{s.chars(entry.prompt.length)} · {s.tokens(estimateTokens(entry.prompt.length))}</span></summary><ConsoleText text={entry.prompt} /></details>
        <details open><summary>{s.sections.stream}{#if entry.status === 'running'} <span class="status st-running">{s.status.running}</span>{/if}</summary>
          {#if !entry.stream.length}<p class="dim">{s.noReply}</p>{/if}
          {#each entry.stream as part, i (i)}
            {#if part.kind === 'text'}<ConsoleText text={part.text} />{:else}<div class="tool">{toolLine(part.name, part.detail)} <span class="dim">{formatTime(part.at)}</span></div>{/if}
          {/each}
        </details>
        {#if entry.parsed}<details open><summary>{s.sections.parsed}</summary><ConsoleText text={prettyDetail(entry.parsed)} /></details>{/if}
        {#if entry.status !== 'running'}
          {@const duration = callDuration(entry)}
          <details open><summary>{s.sections.result}</summary>
            <dl><dt>{f.outcome}</dt><dd class="st-{entry.status}">{s.status[entry.status]}</dd>
              {#if entry.error}<dt>{f.errorKind}</dt><dd class="st-error">{entry.error.kind}</dd>{/if}
              {#if c}
                <dt>{f.input}</dt><dd>{c.usage.input}</dd><dt>{f.output}</dt><dd>{c.usage.output}</dd><dt>{f.thinking}</dt><dd>{c.usage.thinking}</dd>
                <dt>{f.cacheRead}</dt><dd>{c.usage.cacheRead}</dd><dt>{f.cacheWrite}</dt><dd>{c.usage.cacheWrite}</dd>
                {#if c.usageEstimated}<dt>{f.estimated}</dt><dd>{s.yes}</dd>{/if}
                {#if c.costUsd !== undefined}<dt>{f.cost}</dt><dd>${c.costUsd.toFixed(4)}</dd>{/if}
                {#if c.toolCalls && Object.keys(c.toolCalls).length}<dt>{f.toolCalls}</dt><dd>{Object.entries(c.toolCalls).map(([k, v]) => `${k} ×${v}`).join(', ')}</dd>{/if}
              {/if}
              {#if duration !== null}<dt>{f.duration}</dt><dd>{formatDuration(duration)}</dd>{/if}</dl>
            {#if entry.error?.details}<span class="dim">{f.errorDetails}</span><ConsoleText text={entry.error.details} />{/if}
          </details>
        {/if}
      {:else}
        <ConsoleText text={prettyDetail(entry.detail)} />
      {/if}
    </div>
  {/if}
</div>
<style>
  .entry { border-left:2px solid transparent; }
  .entry.selected { background:var(--dc-select); border-left-color:var(--dc-link); }
  .line { display:flex; align-items:baseline; gap:8px; width:100%; padding:1px 8px 1px 4px; border:0; border-radius:0; background:none; color:var(--dc-ink); font:inherit; text-align:left; cursor:pointer; white-space:nowrap; min-width:0; }
  .line:hover { background:var(--dc-hover); }
  .line:focus-visible { outline:1px solid var(--dc-link); outline-offset:-1px; }
  .chev { width:1ch; color:var(--dc-mute); flex:none; }
  .time { color:var(--dc-mute); flex:none; }
  .tag { flex:none; min-width:6ch; font-weight:600; }
  .origin { flex:none; color:var(--dc-origin); }
  .summary { overflow:hidden; text-overflow:ellipsis; min-width:0; }
  .meta { flex:none; color:var(--dc-mute); }
  .badge { flex:none; padding:0 4px; border:1px solid var(--dc-link); border-radius:3px; color:var(--dc-link); font-size:.9em; }
  .status { flex:none; }
  .k-call .tag { color:var(--dc-call); } .k-action .tag { color:var(--dc-action); } .k-event .tag { color:var(--dc-event); }
  .k-warn .tag, .k-warn .summary { color:var(--dc-warn); } .k-error .tag, .k-error .summary { color:var(--dc-error); }
  .st-running { color:var(--dc-running); } .st-ok { color:var(--dc-ok); } .st-cancelled { color:var(--dc-mute); } .st-error { color:var(--dc-error); }
  .warnmark, .warning { color:var(--dc-warn); }
  .warning { margin:4px 0; }
  .body { padding:4px 12px 8px 30px; display:grid; gap:4px; white-space:normal; }
  details > summary { cursor:pointer; color:var(--dc-head); font-weight:600; padding:1px 0; }
  details > :not(summary) { margin-left:14px; }
  details.layer > summary { font-weight:400; color:var(--dc-ink); }
  details.layer.missing > summary b { color:var(--dc-warn); }
  .dim { color:var(--dc-mute); font-weight:400; }
  dl { display:grid; grid-template-columns:max-content 1fr; gap:0 12px; margin:2px 0 4px 14px; }
  dt { color:var(--dc-mute); } dd { margin:0; overflow-wrap:anywhere; }
  .tool { color:var(--dc-tool); padding:2px 0; }
  .stats { display:grid; gap:2px; margin-top:4px; }
  p { margin:2px 0; }
</style>
