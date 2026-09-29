<script lang="ts">
  import Graph from './lib/Graph.svelte';
  import Home from './lib/Home.svelte';
  import Panel from './lib/Panel.svelte';
  import { Session } from './lib/session.svelte';
  import { createSubject, stats, type Subject } from './lib/subject';

  let session = $state<Session | null>(null);

  function open(s: Subject) {
    session = new Session(s);
  }

  function create(title: string) {
    const s = new Session(createSubject(title));
    session = s;
    s.save();
    s.explore(s.subject.rootId);
  }

  const st = $derived(session ? stats(session.subject) : null);
</script>

{#if session}
  <div class="room">
    <header class="bar">
      <button class="back" onclick={() => (session = null)} title="All subjects">‹ Lantern</button>
      <span class="room-name">Learn</span>
      <strong class="title">{session.subject.title}</strong>
      {#if st}
        <span class="stats">{st.lit} lit · {st.understood} understood · {st.total - st.lit} dark</span>
      {/if}
    </header>
    <div class="split">
      <Graph {session} />
      <Panel {session} />
    </div>
  </div>
{:else}
  <Home onOpen={open} onCreate={create} />
{/if}

<style>
  .room {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
  }
  .back {
    all: unset;
    cursor: pointer;
    color: var(--muted);
  }
  .back:hover {
    color: var(--text);
  }
  .room-name {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--lantern);
    border: 1px solid var(--lantern);
    border-radius: 9px;
    padding: 1px 8px;
  }
  .title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stats {
    color: var(--muted);
    font-size: 13px;
  }
  .split {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(420px, 44%);
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }
</style>
