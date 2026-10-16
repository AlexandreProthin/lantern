"use strict";
const app = document.getElementById("app");
const phases = ["wireframe", "form", "type", "color", "motion", "draft"];
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
const phaseOptions = phases.map(p => `<option value="${p}">${p[0].toUpperCase() + p.slice(1)}</option>`).join("");
const pageFormats = {
  landscape: {label: "16:9 · 1600 × 900", width: 1600, height: 900},
  portrait: {label: "9:16 · 900 × 1600", width: 900, height: 1600},
  mobile: {label: "Mobile · 390 × 844", width: 390, height: 844}
};
const formatOptions = Object.entries(pageFormats).map(([key, format]) => `<option value="${key}">${format.label}</option>`).join("");
let dirty = false;
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {cache: "no-store"} : {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}
function status(message, error = false) {
  const node = document.getElementById("status");
  node.textContent = message;
  node.classList.toggle("error", error);
}
window.addEventListener("beforeunload", event => {
  if (dirty) { event.preventDefault(); event.returnValue = ""; }
});

async function hub() {
  document.title = "Lantern · Design workspace";
  app.innerHTML = `<main class="hub"><header><div class="eyebrow">Lantern / design lab</div><h1>A space to explore, three ideas at a time.</h1><p>Choose a component. Pick directions, write the next brief, and save.</p></header>
    <form class="create" id="create"><h2>Start a component</h2><div class="settings">
      <label>Component name<input name="slug" required pattern="[a-z][a-z0-9-]{0,59}" placeholder="e.g. graph-panel" maxlength="60"></label>
      <label>First round type<select name="phase">${phaseOptions}</select></label>
      <label>First round prompt<input name="prompt" placeholder="What should we explore?" maxlength="20000" required></label>
      <button class="primary">Create component</button></div><div class="status" id="status" role="status" aria-live="polite">Creates a saved brief for your agent.</div></form>
    <div class="grid" id="components"></div></main>`;
  const items = await api("/api/components");
  document.getElementById("components").innerHTML = items.length ? items.map(c => `<a class="card component" href="/${encodeURIComponent(c.slug)}/index.html"><div class="eyebrow">Component</div><h2>${esc(c.slug)}</h2><p>${c.rounds} round${c.rounds === 1 ? "" : "s"} · ${c.pending ? "Brief ready for agent" : "Ready for your picks"}</p><span>Open exploration →</span></a>`).join("") : `<div class="empty"><h2>Your first component starts here.</h2><p>Create one above to save a brief, then ask the agent for its first round.</p></div>`;
  document.getElementById("create").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      await api("/api/components", values);
      location.href = `/${encodeURIComponent(values.slug)}/index.html`;
    } catch (error) { status(error.message, true); button.disabled = false; }
  });
}

async function component(slug) {
  let data = await api(`/api/${encodeURIComponent(slug)}`);
  let selection = data.selection;
  const ledger = data.lineage;
  const selected = new Set(selection.selected_ids);
  const latest = ledger.rounds.length ? ledger.rounds[ledger.rounds.length - 1].number : 0;
  document.title = `${slug} · Design exploration`;
  app.innerHTML = `<div class="shell"><header class="toolbar">
    <div class="topline"><div><a class="eyebrow" href="/index.html">← All components</a><h1>${esc(slug)}</h1></div>
      <div class="actions"><span class="meta" id="count"></span><button id="clear">Clear picks</button><button class="primary" id="save">Save next round</button></div></div>
    <div class="settings"><label>Next round type<select id="phase">${phaseOptions}</select></label>
      <label>Use selected designs<select id="mode"><option value="combine">Combine picks · ${ledger.per_round || 3} proposals</option><option value="branch">Branch each pick · 3 per pick</option><option value="fresh">Fresh start · ${ledger.per_round || 3} proposals</option></select></label>
      <label class="prompt">Next round prompt<textarea id="prompt" maxlength="20000" placeholder="What should stay? What should change?"></textarea></label></div>
    <div class="status" id="status" role="status" aria-live="polite"></div></header>
    <div class="preview-tools"><label>Page format<select id="page-format">${formatOptions}</select></label><span class="meta">Scaled to fit · Double-click a page to preview</span></div>
    <main class="gallery" aria-label="Design rounds" id="rounds"></main></div>
    <dialog class="preview-dialog" id="preview-dialog" aria-labelledby="preview-title" aria-describedby="preview-help">
      <div class="preview-header"><div class="preview-heading"><div class="eyebrow" id="preview-position"></div><h2 id="preview-title"></h2></div>
        <label>Page format<select id="preview-format">${formatOptions}</select></label><button id="preview-close" autofocus>Close · Esc</button></div>
      <div class="preview-stage" id="preview-stage"><iframe id="preview-frame" title="Proposition preview" sandbox="allow-scripts" tabindex="-1" inert></iframe></div>
      <div class="preview-footer"><div class="preview-navigation"><button id="preview-previous" aria-label="Previous proposition">← Previous</button><button id="preview-next" aria-label="Next proposition">Next →</button></div>
        <span class="meta" id="preview-help">← / → to cycle · Open full size to interact</span><a id="preview-original" target="_blank" rel="noopener">Open full size ↗</a></div>
      <div class="sr-only" id="preview-announcement" aria-live="polite"></div>
    </dialog>`;
  document.getElementById("phase").value = selection.next.phase;
  document.getElementById("mode").value = selection.next.mode;
  document.getElementById("prompt").value = selection.next.prompt;
  const updateCount = () => { document.getElementById("count").textContent = `${selected.size} selected`; };
  const markDirty = () => { dirty = true; status("Unsaved changes — save to send this brief to the agent."); updateCount(); };
  updateCount();
  status(data.pending ? `Saved request ${selection.revision} is ready. Tell the agent “next ${slug}”.` : "This request has been completed. Choose designs and save your next brief.");
  const nodes = new Map(ledger.nodes.map(n => [n.id, n]));
  document.getElementById("rounds").innerHTML = ledger.rounds.length ? [...ledger.rounds].reverse().map(round => {
    const request = round.request;
    return `<section class="round"><div class="round-heading"><h2>Round ${round.number} <span class="meta">/ ${esc(request.next.phase)} / ${esc(request.next.mode)}</span></h2><span class="meta">${esc(new Date(round.created_at).toLocaleDateString())}</span></div>
      <p class="round-note">${esc(request.next.prompt || "Open exploration")}</p><div class="grid">${round.node_ids.map(id => {
        const node = nodes.get(id);
        const url = node.file.split("/").map(encodeURIComponent).join("/");
        return `<article class="card${selected.has(id) ? " selected" : ""}" data-id="${esc(id)}"><div class="card-head"><label class="pick"><input type="checkbox" value="${esc(id)}" ${selected.has(id) ? "checked" : ""}>${esc(id)}</label><button class="preview-open" data-preview="${esc(id)}">Preview ↗</button></div>
          <div class="preview-stage thumbnail"><iframe src="${url}" title="${esc(node.title)}" loading="lazy" sandbox="allow-scripts" tabindex="-1" inert></iframe><button class="preview-launch" data-preview="${esc(id)}" aria-label="Preview ${esc(id)}: ${esc(node.title)}" title="Double-click to preview; Enter or Space also opens"></button></div>
          <div class="card-body"><h3>${esc(node.title)}</h3><p>${esc(node.direction)}</p><div class="meta">${node.parents.length ? `From ${node.parents.map(esc).join(" + ")}` : "Starting direction"} · <a href="${url}" target="_blank" rel="noopener">Open full size ↗</a></div></div></article>`;
      }).join("")}</div></section>`;
  }).join("") : `<div class="empty"><div class="eyebrow">Round 01 / waiting for ideas</div><h2>Your brief is ready.</h2><p>Adjust the round type and prompt above, then save. Tell the agent <strong>“next ${esc(slug)}”</strong> to create three proposals here.</p><p>Saving writes <code>${esc(slug)}/selections.json</code>. The agent reads that file; saving does not start generation automatically.</p></div>`;
  setupPreviews([...ledger.rounds].reverse().flatMap(round => round.node_ids.map(id => nodes.get(id))));
  document.querySelectorAll(".pick input").forEach(input => input.addEventListener("change", () => {
    input.checked ? selected.add(input.value) : selected.delete(input.value);
    input.closest(".card").classList.toggle("selected", input.checked);
    markDirty();
  }));
  for (const id of ["phase", "mode", "prompt"]) document.getElementById(id).addEventListener("input", markDirty);
  document.getElementById("clear").addEventListener("click", () => {
    selected.clear();
    document.querySelectorAll(".pick input").forEach(i => { i.checked = false; i.closest(".card").classList.remove("selected"); });
    markDirty();
  });
  document.getElementById("save").addEventListener("click", async () => {
    const controls = [...document.querySelectorAll("input, select, textarea, button")];
    controls.forEach(c => { c.disabled = true; });
    status("Saving…");
    try {
      selection = await api(`/api/${encodeURIComponent(slug)}/selections`, {
        revision: selection.revision, based_on_round: latest, selected_ids: [...selected],
        next: {phase: document.getElementById("phase").value, mode: document.getElementById("mode").value, prompt: document.getElementById("prompt").value}
      });
      dirty = false;
      status(`Saved to ${slug}/selections.json · request ${selection.revision}. Tell the agent “next ${slug}”.`);
    } catch (error) { status(error.message, true); }
    finally { controls.forEach(c => { c.disabled = false; }); }
  });
}

function setupPreviews(proposals) {
  const dialog = document.getElementById("preview-dialog");
  const frame = document.getElementById("preview-frame");
  const formatSelects = [document.getElementById("page-format"), document.getElementById("preview-format")];
  const stages = [...document.querySelectorAll(".preview-stage")];
  let formatKey = "landscape";
  try { const saved = localStorage.getItem("lantern-preview-format"); if (Object.hasOwn(pageFormats, saved)) formatKey = saved; } catch { /* Storage can be unavailable. */ }
  let current = 0;
  let opener;
  function fit(stage) {
    const {width, height} = pageFormats[formatKey];
    const scale = Math.min(stage.clientWidth / width, stage.clientHeight / height);
    const page = stage.querySelector("iframe");
    page.style.width = `${width}px`;
    page.style.height = `${height}px`;
    page.style.transform = `scale(${scale})`;
    page.style.left = `${(stage.clientWidth - width * scale) / 2}px`;
    page.style.top = `${(stage.clientHeight - height * scale) / 2}px`;
  }
  function setFormat(value) {
    formatKey = value;
    formatSelects.forEach(select => { select.value = value; });
    stages.forEach(fit);
    try { localStorage.setItem("lantern-preview-format", value); } catch { /* Viewing still works without storage. */ }
  }
  const observer = new ResizeObserver(entries => entries.forEach(entry => fit(entry.target)));
  stages.forEach(stage => observer.observe(stage));
  formatSelects.forEach(select => select.addEventListener("change", () => setFormat(select.value)));
  setFormat(formatKey);
  function show(index) {
    current = (index + proposals.length) % proposals.length;
    const node = proposals[current];
    const url = node.file.split("/").map(encodeURIComponent).join("/");
    document.getElementById("preview-title").textContent = `${node.id} · ${node.title}`;
    const position = `${current + 1} / ${proposals.length} propositions`;
    document.getElementById("preview-position").textContent = position;
    document.getElementById("preview-announcement").textContent = `${position}: ${node.title}`;
    document.getElementById("preview-original").href = url;
    frame.title = node.title;
    frame.src = url;
    document.getElementById("preview-previous").disabled = proposals.length < 2;
    document.getElementById("preview-next").disabled = proposals.length < 2;
  }
  function open(button) {
    const index = proposals.findIndex(node => node.id === button.dataset.preview);
    if (index < 0) return;
    opener = button;
    show(index);
    dialog.showModal();
    fit(document.getElementById("preview-stage"));
  }
  document.querySelectorAll(".preview-open").forEach(button => button.addEventListener("click", () => open(button)));
  document.querySelectorAll(".preview-launch").forEach(button => {
    button.addEventListener("dblclick", () => open(button));
    // Keyboard and assistive-technology activation use a synthetic single click.
    button.addEventListener("click", event => { if (event.detail === 0) open(button); });
  });
  document.getElementById("preview-close").addEventListener("click", () => dialog.close());
  document.getElementById("preview-previous").addEventListener("click", () => show(current - 1));
  document.getElementById("preview-next").addEventListener("click", () => show(current + 1));
  dialog.addEventListener("keydown", event => {
    // Preserve the native arrow controls when the format selector has focus.
    if (event.target.closest("select, input, textarea, [contenteditable]")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(current + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  dialog.addEventListener("close", () => {
    frame.removeAttribute("src");
    opener?.focus({preventScroll: true});
  });
}

async function start() {
  if (location.protocol === "file:") {
    app.innerHTML = `<main class="hub"><h1>Start the design workspace</h1><p>Saving choices needs the local server. From the repository root, run:</p><pre>python design/tool/workflow.py serve</pre><p>Then open <a href="http://127.0.0.1:8765/index.html">the design workspace</a>.</p></main>`;
    return;
  }
  const parts = location.pathname.split("/").filter(Boolean);
  if (!parts.length || parts[0] === "index.html") await hub();
  else await component(decodeURIComponent(parts[0]));
}
start().catch(error => {
  app.replaceChildren();
  const message = document.createElement("p");
  message.className = "empty error";
  message.textContent = `Could not load the workspace: ${error.message}. Check the server and reload.`;
  app.append(message);
});
