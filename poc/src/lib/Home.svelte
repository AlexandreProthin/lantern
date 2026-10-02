<script lang="ts">
  import { onMount } from 'svelte';
  import { deleteSubject, infer, listSubjects, subjectsFolder } from './backend';
  import { LEARN_SYSTEM, parseOptions, suggestPrompt, type Option } from './prompts';
  import { stats, type Subject } from './subject';

  let { onOpen, onCreate }: { onOpen: (s: Subject) => void; onCreate: (title: string) => void } =
    $props();

  let subjects = $state<Subject[]>([]);
  let title = $state('');
  let folder = $state('');
  let suggestions = $state<Option[]>([]);
  let suggesting = $state(false);
  let error = $state('');

  onMount(async () => {
    subjects = await listSubjects();
    folder = await subjectsFolder();
  });

  function start() {
    if (title.trim()) onCreate(title.trim());
  }

  async function suggest() {
    suggesting = true;
    error = '';
    try {
      suggestions = parseOptions(await infer(LEARN_SYSTEM, suggestPrompt(), () => {}));
    } catch (e) {
      error = String(e);
    } finally {
      suggesting = false;
    }
  }

  async function remove(s: Subject) {
    if (!confirm(`Delete "${s.title}"?`)) return;
    await deleteSubject(s.id);
    subjects = subjects.filter((x) => x.id !== s.id);
  }
</script>

<main class="home">
  <div class="brand">
    <svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">
      <circle cx="20" cy="22" r="17" fill="url(#hg)" />
      <defs>
        <radialGradient id="hg"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".7" /><stop offset="100%" stop-color="var(--accent)" stop-opacity="0" /></radialGradient>
      </defs>
      <path d="M15 8h10M17 8v-3h6v3M13 11h14l-2 20H15z" fill="none" stroke="var(--node-lit)" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M20 17c2 3 2 6 0 8-2-2-2-5 0-8z" fill="var(--accent)" />
    </svg>
    <div>
      <h1>Lantern</h1>
      <p>Light up what you're working through.</p>
    </div>
  </div>

  <section class="room">
    <span class="room-name">Learn room</span>
    <p>Bring a subject. The tutor lights it one node at a time; you choose where to go next.</p>
    <form onsubmit={(e) => (e.preventDefault(), start())}>
      <input bind:value={title} placeholder="What do you want to learn?  e.g. How TCP congestion control works" />
      <button class="primary" disabled={!title.trim()}>Carry the lantern in</button>
    </form>
    <div class="suggest">
      <button class="link" onclick={suggest} disabled={suggesting}>
        {suggesting ? 'Thinking of subjects…' : 'No idea? Suggest 3 subjects'}
      </button>
      {#each suggestions as s (s.title)}
        <button class="chip" onclick={() => onCreate(s.title)} title={s.hook}>
          <strong>{s.title}</strong><span>{s.hook}</span>
        </button>
      {/each}
      {#if error}<p class="err">{error}</p>{/if}
    </div>
  </section>

  {#if subjects.length}
    <section class="list">
      <h2>Your subjects</h2>
      {#each subjects as s (s.id)}
        {@const st = stats(s)}
        <div class="card">
          <button class="open" onclick={() => onOpen(s)}>
            <strong>{s.title}</strong>
            <span>{st.lit} lit · {st.understood} understood · {st.total - st.lit} still dark</span>
          </button>
          <span class="date">{new Date(s.updatedAt).toLocaleDateString()}</span>
          <button class="del" onclick={() => remove(s)} title="Delete">×</button>
        </div>
      {/each}
    </section>
  {/if}

  <p class="folder">Saved in {folder}</p>
</main>

<style>
  .home {
    max-width: 720px;
    margin: 0 auto;
    padding: 56px 24px;
  }
  .brand {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .brand h1 {
    margin: 0;
    font-size: 30px;
  }
  .brand p {
    margin: 2px 0 0;
    color: var(--ink-mute);
  }
  .room {
    margin-top: 40px;
    padding: 24px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
  }
  .room-name {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
  }
  .room p {
    color: var(--ink-mute);
    margin: 6px 0 16px;
  }
  form {
    display: flex;
    gap: 8px;
  }
  input {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--ink);
    padding: 10px 12px;
    font: inherit;
  }
  input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .suggest {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
  .link {
    all: unset;
    cursor: pointer;
    color: var(--ink-mute);
    font-size: 13px;
    text-decoration: underline dotted;
  }
  .link:hover {
    color: var(--ink);
  }
  .chip {
    all: unset;
    cursor: pointer;
    padding: 7px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .chip:hover {
    border-color: var(--accent);
  }
  .chip span {
    color: var(--ink-mute);
    font-size: 13px;
  }
  .err {
    color: #f0a598;
    font-size: 13px;
  }
  .list h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-mute);
    margin: 36px 0 10px;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    margin-bottom: 8px;
    padding-right: 10px;
  }
  .card:hover {
    border-color: var(--accent);
  }
  .open {
    all: unset;
    flex: 1;
    cursor: pointer;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .open span,
  .date {
    color: var(--ink-mute);
    font-size: 13px;
  }
  .del {
    all: unset;
    cursor: pointer;
    color: var(--ink-mute);
    font-size: 18px;
    padding: 0 6px;
  }
  .del:hover {
    color: #f0a598;
  }
  .folder {
    margin-top: 40px;
    font-size: 12px;
    color: var(--ink-mute);
  }
</style>
