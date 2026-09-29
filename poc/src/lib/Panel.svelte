<script lang="ts">
  import { render } from './markdown';
  import { visibleText } from './prompts';
  import type { Session } from './session.svelte';
  import { childrenOf, pathTo } from './subject';

  let { session }: { session: Session } = $props();

  const node = $derived(session.focus);
  const path = $derived(pathTo(session.subject, node.id));
  const kids = $derived(childrenOf(session.subject, node.id));
  const live = $derived(session.streaming[node.id]);
  const error = $derived(session.errors[node.id]);
  const busy = $derived(!!live);

  let draft = $state('');
  let scroller: HTMLElement;

  const kindLabel: Record<string, string> = {
    subject: 'subject',
    axis: 'axis',
    deeper: 'go deeper',
    application: 'application',
    adjacent: 'adjacent idea',
    exercise: 'exercise',
    question: 'from a question'
  };

  function send() {
    if (!draft.trim() || busy) return;
    session.ask(node.id, draft);
    draft = '';
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function go(id: string, explore: boolean) {
    session.setFocus(id);
    if (explore && session.subject.nodes[id].state === 'open') session.explore(id);
  }

  // Follow the stream while text arrives.
  $effect(() => {
    live?.raw;
    node.dialogue.length;
    if (scroller && live?.target === 'dialogue') scroller.scrollTop = scroller.scrollHeight;
  });
  $effect(() => {
    node.id;
    if (scroller) scroller.scrollTop = 0;
  });
</script>

<aside class="panel">
  <div class="scroll" bind:this={scroller}>
    <nav class="crumbs">
      {#each path.slice(0, -1) as p (p.id)}
        <button class="crumb" onclick={() => session.setFocus(p.id)}>{p.title}</button>
        <span class="sep">›</span>
      {/each}
    </nav>

    <header>
      <div class="meta">
        <span class="kind">{kindLabel[node.kind]}</span>
        <span class="state {node.state}">{node.state}</span>
      </div>
      <h1>{node.title}</h1>
      {#if node.hook}<p class="hook">{node.hook}</p>{/if}
    </header>

    {#if live?.target === 'content'}
      <article class="md streaming">{@html render(visibleText(live.raw) || '…')}</article>
    {:else if node.content}
      <article class="md">{@html render(node.content)}</article>
    {:else}
      <div class="unlit">
        <p>This node is still dark.</p>
        <button class="primary" onclick={() => session.explore(node.id)} disabled={busy}>
          Light it up
        </button>
      </div>
    {/if}

    {#if error}
      <div class="error">
        <strong>The tutor could not answer.</strong>
        <pre>{error}</pre>
      </div>
    {/if}

    {#if kids.length}
      <section class="next">
        <h2>{node.id === session.subject.rootId ? 'Axes to explore' : 'Where to go next'}</h2>
        {#each kids as k (k.id)}
          <button class="option {k.state}" onclick={() => go(k.id, true)}>
            <span class="t">{k.title}</span>
            {#if k.hook}<span class="h">{k.hook}</span>{/if}
            <span class="badge">{k.state === 'open' ? kindLabel[k.kind] : k.state}</span>
          </button>
        {/each}
      </section>
    {/if}

    {#if node.dialogue.length || live?.target === 'dialogue'}
      <section class="dialogue">
        <h2>Dialogue</h2>
        {#each node.dialogue as t, i (i)}
          <div class="turn {t.role}">{@html render(t.text)}</div>
        {/each}
        {#if live?.target === 'dialogue'}
          <div class="turn tutor streaming">{@html render(visibleText(live.raw) || '…')}</div>
        {/if}
      </section>
    {/if}
  </div>

  {#if node.state !== 'open'}
    <footer>
      <textarea
        bind:value={draft}
        onkeydown={onKey}
        rows="2"
        placeholder="Ask about this, or answer the tutor…  (Enter to send)"
        disabled={busy}
      ></textarea>
      <div class="actions">
        <button onclick={send} disabled={busy || !draft.trim()} class="primary">Send</button>
        <button onclick={() => session.check(node.id)} disabled={busy}>Test me</button>
        <button onclick={() => session.toggleUnderstood(node.id)} disabled={busy}>
          {node.state === 'understood' ? 'Not sure anymore' : 'I get it'}
        </button>
      </div>
    </footer>
  {/if}
</aside>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--panel);
    border-left: 1px solid var(--border);
    min-width: 0;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 20px 28px 32px;
  }
  .crumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
    min-height: 16px;
  }
  .crumb {
    all: unset;
    cursor: pointer;
  }
  .crumb:hover {
    color: var(--text);
    text-decoration: underline;
  }
  header {
    margin: 10px 0 18px;
  }
  .meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .kind {
    color: var(--muted);
  }
  .state {
    padding: 1px 7px;
    border-radius: 9px;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .state.lit {
    color: var(--lantern);
    border-color: var(--lantern);
  }
  .state.understood {
    color: var(--wall);
    background: var(--lantern-hot);
    border-color: var(--lantern-hot);
  }
  h1 {
    font-size: 24px;
    line-height: 1.25;
    margin: 6px 0 4px;
    font-weight: 600;
  }
  .hook {
    margin: 0;
    color: var(--muted);
    font-style: italic;
  }
  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 28px 0 10px;
    font-weight: 600;
  }
  .md {
    line-height: 1.65;
  }
  .md :global(code) {
    background: var(--code);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.92em;
  }
  .md :global(pre) {
    background: var(--code);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  .md :global(pre code) {
    background: none;
    padding: 0;
  }
  .md :global(strong) {
    color: var(--lantern-hot);
  }
  .md :global(table) {
    border-collapse: collapse;
  }
  .md :global(th),
  .md :global(td) {
    border: 1px solid var(--border);
    padding: 4px 8px;
  }
  .streaming :global(> :last-child::after) {
    content: '▍';
    color: var(--lantern);
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .unlit {
    padding: 28px;
    border: 1px dashed var(--border);
    border-radius: 10px;
    text-align: center;
    color: var(--muted);
  }
  .option {
    all: unset;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 12px;
    width: 100%;
    padding: 10px 14px;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
  }
  .option:hover {
    border-color: var(--lantern);
    background: var(--hover);
  }
  .option .t {
    font-weight: 600;
  }
  .option .h {
    grid-column: 1;
    color: var(--muted);
    font-size: 13.5px;
  }
  .option .badge {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .option.lit .badge,
  .option.understood .badge {
    color: var(--lantern);
  }
  .turn {
    padding: 2px 14px;
    border-radius: 10px;
    margin-bottom: 10px;
    line-height: 1.55;
  }
  .turn.learner {
    background: var(--hover);
    margin-left: 40px;
  }
  .turn.tutor {
    border-left: 2px solid var(--lantern);
    border-radius: 0;
  }
  .error {
    margin-top: 16px;
    padding: 10px 14px;
    border: 1px solid #d86a5a;
    border-radius: 8px;
    color: #f0a598;
  }
  .error pre {
    white-space: pre-wrap;
    font-size: 12px;
    margin: 6px 0 0;
  }
  footer {
    border-top: 1px solid var(--border);
    padding: 12px 20px 14px;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    background: var(--wall);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 11px;
    font: inherit;
  }
  textarea:focus {
    outline: none;
    border-color: var(--lantern);
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
</style>
