"use strict";
/* Lantern spec workshop. No dependencies. Answers live only in data/answers.json;
   localStorage holds UI preferences and a crash-recovery draft, nothing else. */

/* ===================== safe markdown ===================== */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function safeHref(u) {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u);
  if (scheme && !/^(https?|mailto)$/i.test(scheme[1])) return null;
  return u.startsWith("//") ? null : u;
}

function emph(s) {
  return s
    .replace(/\*\*([^*]+?)\*\*|__([^_]+?)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
    .replace(/(^|[^*\w])\*([^*\s](?:[^*]*?[^*\s])?)\*(?!\*)/g, (_, p, a) => `${p}<em>${a}</em>`)
    .replace(/(^|[^\w])_([^_\s](?:[^_]*?[^_\s])?)_(?!\w)/g, (_, p, a) => `${p}<em>${a}</em>`);
}

function inline(src) {
  const stash = [];
  const keep = (html) => "\u0000" + (stash.push(html) - 1) + "\u0001";
  let s = esc(String(src).replace(/[\u0000\u0001]/g, ""));
  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${c}</code>`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*?&quot;)?\)/g, (m, text, url) => {
    const href = safeHref(url);
    if (href === null) return m;
    const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
    return keep(`<a href="${href}"${ext}>${emph(text)}</a>`);
  });
  s = emph(s);
  for (let i = 0; i < 3; i++) s = s.replace(/\u0000(\d+)\u0001/g, (_, n) => stash[+n]);
  return s;
}

const RE = {
  fence: /^\s*(`{3,}|~{3,})\s*[\w+-]*\s*$/,
  heading: /^(#{1,6})\s+(.*?)\s*#*\s*$/,
  hr: /^\s*([-*_])(\s*\1){2,}\s*$/,
  quote: /^\s*>/,
  item: /^(\s*)([-*+]|\d+[.)])\s+(.*)$/,
  sep: /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,
};
const indentOf = (l) => /^\s*/.exec(l)[0].replace(/\t/g, "    ").length;
const splitRow = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));

function blocks(lines) {
  const out = [];
  let i = 0;
  const startsBlock = (l, next) => RE.fence.test(l) || RE.heading.test(l) || RE.hr.test(l) || RE.quote.test(l) || RE.item.test(l) ||
    (l.includes("|") && next !== undefined && RE.sep.test(next) && next.includes("-"));
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = RE.fence.exec(line))) {
      const mark = m[1][0], len = m[1].length, code = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${mark}{${len},}\\s*$`).test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    } else if ((m = RE.heading.exec(line))) {
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      i++;
    } else if (RE.hr.test(line)) {
      out.push("<hr>");
      i++;
    } else if (RE.quote.test(line)) {
      const inner = [];
      while (i < lines.length && RE.quote.test(lines[i])) inner.push(lines[i++].replace(/^\s*> ?/, ""));
      out.push(`<blockquote>${blocks(inner)}</blockquote>`);
    } else if ((m = RE.item.exec(line))) {
      const base = indentOf(line), ordered = /\d/.test(m[2][0]);
      const items = [];
      while (i < lines.length) {
        const cur = lines[i], im = RE.item.exec(cur);
        if (im && indentOf(cur) === base) {
          items.push({ first: im[3], rest: [] });
          i++;
        } else if (items.length && cur.trim() && indentOf(cur) > base) {
          items[items.length - 1].rest.push(cur.slice(Math.min(indentOf(cur), base + 2)));
          i++;
        } else if (!cur.trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && (indentOf(lines[j]) > base || (RE.item.test(lines[j]) && indentOf(lines[j]) === base))) i = j;
          else break;
        } else break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>` + items.map((it) => {
        const extra = it.rest.length ? blocks(it.rest) : "";
        return `<li>${inline(it.first)}${extra}</li>`;
      }).join("") + `</${tag}>`);
    } else if (line.includes("|") && i + 1 < lines.length && RE.sep.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : ""));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) rows.push(splitRow(lines[i++]));
      const cell = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ""}>${inline(c)}</${tag}>`;
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c, k) => cell("th", c, k)).join("")}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${head.map((_, k) => cell("td", r[k] || "", k)).join("")}</tr>`).join("") + "</tbody></table></div>");
    } else {
      const para = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join("\n"))}</p>`);
    }
  }
  return out.join("");
}

const md = (src) => blocks(String(src ?? "").replace(/\r\n?/g, "\n").split("\n"));

function frontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const l of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l);
    if (kv) meta[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return { meta, body: text.slice(m[0].length) };
}

/* ===================== helpers ===================== */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "md") { el.className = ((el.className || "") + " md").trim(); el.innerHTML = md(v); } // md() escapes everything
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "data") for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else el.setAttribute(k, v === true ? "" : v);
  }
  const add = (kid) => {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(add);
    else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  };
  kids.forEach(add);
  return el;
}

const nowIso = () => new Date().toISOString();
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* optional */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* optional */ } };
const UI_KEY = "lantern-specs-ui", DRAFT_KEY = "lantern-specs-draft";

const isEmptyVal = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
function meaningful(a) {
  return Object.entries(a || {}).filter(([k, v]) => k !== "updated_at" && !isEmptyVal(v));
}
function canon(answers) {
  const out = {};
  for (const qid of Object.keys(answers).sort()) {
    const m = meaningful(answers[qid]);
    if (!m.length) continue;
    out[qid] = Object.fromEntries(m.sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v]));
  }
  return JSON.stringify(out);
}
function cleanForSave(answers) {
  const out = {};
  for (const [qid, a] of Object.entries(answers)) if (meaningful(a).length) out[qid] = a;
  return out;
}

/* ===================== state ===================== */
const S = {
  data: null, answers: {}, rev: 0, savedAt: null, savedCanon: "{}",
  tab: "questions", filter: "all", area: "all", round: "latest",
  takeOpen: {}, previewOpen: {}, specSel: null, specDoc: null,
  menu: null, drag: null, status: { kind: "", text: "" }, saving: false, banner: null, loadError: null,
};
const root = document.getElementById("app");
const ui = lsGet(UI_KEY) || {};
for (const k of ["tab", "filter", "area", "round", "takeOpen", "previewOpen"]) if (ui[k] != null) S[k] = ui[k];
if (!["questions", "specs", "sketches"].includes(S.tab)) S.tab = "questions";
if (!["all", "unanswered", "flagged", "settled"].includes(S.filter)) S.filter = "all";
if (typeof S.takeOpen !== "object" || !S.takeOpen) S.takeOpen = {};
if (typeof S.previewOpen !== "object" || !S.previewOpen) S.previewOpen = {};
const saveUi = () => lsSet(UI_KEY, { tab: S.tab, filter: S.filter, area: S.area, round: S.round, takeOpen: S.takeOpen, previewOpen: S.previewOpen });

const Q = () => (S.data ? S.data.questions.questions || [] : []);
const SPECS = () => (S.data ? S.data.specs.specs || [] : []);
const getA = (qid) => S.answers[qid] || {};
const isDirty = () => canon(S.answers) !== S.savedCanon;

function answered(q) {
  const a = getA(q.id);
  if (a.flag === "discuss") return true;
  const choice = a.choice || [];
  switch (q.kind) {
    case "single": case "multi":
      return choice.some((c) => c !== "other") || !!(a.other || "").trim();
    case "text": return !!(a.notes || "").trim();
    case "scope": {
      const items = q.items || [], buckets = new Set((q.buckets || []).map((b) => b.id));
      return items.length > 0 && items.every((it) => buckets.has((a.placement || {})[it.id]));
    }
    case "rank": return (a.order || []).length > 0;
    default: return false;
  }
}

function setA(qid, patch) {
  const next = { ...getA(qid), ...patch, updated_at: nowIso() };
  S.answers[qid] = next;
  persistDraft();
}

let draftTimer = null;
function persistDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    if (isDirty()) lsSet(DRAFT_KEY, { base_revision: S.rev, answers: S.answers });
    else lsDel(DRAFT_KEY);
  }, 300);
}

/* ===================== loading & saving ===================== */
async function api(path, opts) {
  const res = await fetch(path, opts);
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error((body && body.error) || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return body;
}

async function load(keepStatus) {
  try {
    const data = await api("/api/state");
    S.data = data;
    S.answers = JSON.parse(JSON.stringify(data.answers.answers || {}));
    S.rev = data.answers.revision || 0;
    S.savedAt = data.answers.saved_at || null;
    S.savedCanon = canon(S.answers);
    S.loadError = null;
    if (!keepStatus) S.status = S.rev ? { kind: "", text: `Loaded revision ${S.rev}` } : { kind: "", text: "No answers saved yet" };
    const draft = lsGet(DRAFT_KEY);
    S.banner = null;
    if (draft && draft.base_revision === S.rev && draft.answers && typeof draft.answers === "object" && canon(draft.answers) !== S.savedCanon) {
      S.banner = { kind: "draft", draft };
    } else if (draft) lsDel(DRAFT_KEY);
  } catch (e) {
    S.loadError = e.message;
  }
  render();
}

async function save() {
  if (S.saving || !S.data) return;
  S.saving = true;
  S.status = { kind: "", text: "Saving…" };
  renderTop();
  try {
    const doc = await api("/api/answers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_revision: S.rev, answers: cleanForSave(S.answers) }),
    });
    S.rev = doc.revision;
    S.savedAt = doc.saved_at;
    S.savedCanon = canon(S.answers);
    S.status = { kind: "ok", text: `Saved revision ${doc.revision}` };
    lsDel(DRAFT_KEY);
    S.banner = null;
  } catch (e) {
    S.status = e.status === 409
      ? { kind: "err", text: "Not saved: answers.json changed on disk since you loaded this page. Your edits are still here. Copy anything you need, then use Reload (it discards unsaved edits)." }
      : { kind: "err", text: `Not saved: ${e.message}` };
  }
  S.saving = false;
  renderTop();
  renderBanner();
}

function reload() {
  if (isDirty() && !confirm("Reload from disk and discard your unsaved edits?")) return;
  lsDel(DRAFT_KEY);
  load();
}

/* ===================== rendering ===================== */
function counts() {
  const qs = Q();
  const done = qs.filter(answered).length;
  const specs = SPECS();
  return { done, total: qs.length, agreed: specs.filter((s) => s.status === "agreed").length, specTotal: specs.length };
}

function meter(label, n, total, ok) {
  return h("div", { class: "meter" }, h("span", {}, label + " ", h("b", {}, `${n}/${total}`)),
    h("div", { class: "bar" + (ok ? " ok" : "") }, h("i", { style: `width:${total ? Math.round((n / total) * 100) : 0}%` })));
}

function renderTop() {
  const host = root.querySelector(".topbar");
  if (!host) return;
  const c = counts(), dirty = isDirty();
  host.replaceChildren(
    h("div", { class: "brand" }, "Lantern ", h("span", {}, "·"), " spec workshop"),
    h("div", { class: "meters" }, meter("Answered", c.done, c.total, false), meter("Specs agreed", c.agreed, c.specTotal, true)),
    h("div", { class: "spacer" }),
    h("span", { class: "dirty", role: "status" }, dirty ? "● Unsaved changes" : ""),
    h("span", { class: "status " + S.status.kind, role: "status", "aria-live": "polite" }, S.status.text),
    h("button", { class: "btn ghost", onclick: reload, title: "Re-read all files from disk" }, "Reload"),
    h("button", { class: "btn primary", disabled: S.saving || !dirty, onclick: save, title: "Ctrl+S" }, "Save answers"),
  );
}

function renderBanner() {
  const host = root.querySelector(".banner-host");
  if (!host) return;
  if (!S.banner) { host.replaceChildren(); return; }
  host.replaceChildren(h("div", { class: "banner" },
    h("span", {}, "Restore unsaved draft? A draft from a previous session was found for this revision."),
    h("button", { class: "btn small primary", onclick: () => { S.answers = JSON.parse(JSON.stringify(S.banner.draft.answers)); S.banner = null; render(); } }, "Restore"),
    h("button", { class: "btn small", onclick: () => { lsDel(DRAFT_KEY); S.banner = null; renderBanner(); } }, "Discard")));
}

function render() {
  if (S.loadError || !S.data) {
    root.replaceChildren(h("div", { class: "banner err" }, h("span", {}, `Could not load workshop data: ${S.loadError || "no data"}. Is serve.py running?`),
      h("button", { class: "btn small", onclick: () => load() }, "Retry")));
    return;
  }
  const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
  const sel = document.activeElement && "selectionStart" in document.activeElement ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  const tabs = [["questions", "Questions"], ["specs", "Specs"], ["sketches", "Sketches"]];
  root.replaceChildren(
    h("div", { class: "topbar" }),
    h("div", { class: "banner-host" }),
    h("div", { class: "tabs", role: "tablist" }, tabs.map(([id, label]) =>
      h("button", { class: "tab", role: "tab", "aria-selected": String(S.tab === id), onclick: () => setTab(id) }, label))),
    h("div", { id: "body" }),
  );
  renderTop();
  renderBanner();
  renderBody();
  if (focus) {
    const el = root.querySelector(`[data-fid="${CSS.escape(focus)}"]`);
    if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch { /* ignore */ } }
  }
}

function renderBody() {
  const body = root.querySelector("#body");
  if (!body) return;
  const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
  body.replaceChildren(S.tab === "questions" ? questionsView() : S.tab === "specs" ? specsView() : sketchesView());
  if (focus) { const el = body.querySelector(`[data-fid="${CSS.escape(focus)}"]`); if (el) el.focus({ preventScroll: true }); }
}

function setTab(id) {
  S.tab = id; saveUi(); render();
  if (id === "specs") ensureSpecLoaded();
}

/* ---------- questions view ---------- */
function latestRound() {
  const rs = (S.data.questions.rounds || []).map((r) => r.number);
  return rs.length ? Math.max(...rs) : Math.max(1, ...Q().map((q) => q.round || 1));
}
function activeRound() { return S.round === "all" ? "all" : S.round === "latest" ? latestRound() : Number(S.round); }

function questionsView() {
  const qs = Q();
  const areas = S.data.questions.areas || [];
  const rounds = (S.data.questions.rounds || []).map((r) => r.number).sort((a, b) => b - a);
  const ar = activeRound();
  const inRound = (q) => ar === "all" || q.round === ar;
  const visible = qs.filter((q) => inRound(q) && (S.area === "all" || q.area === S.area) && ({
    all: () => true, unanswered: () => !answered(q), flagged: () => getA(q.id).flag === "discuss", settled: () => !!q.settled,
  })[S.filter]());

  const rail = buildRail();

  const main = h("div", { class: "main", id: "qmain" });
  const roundsShown = ar === "all" ? rounds : [ar];
  let any = false;
  for (const n of roundsShown) {
    const inThis = visible.filter((q) => q.round === n);
    const info = (S.data.questions.rounds || []).find((r) => r.number === n);
    if (info && info.intro && (inThis.length || ar !== "all")) {
      main.append(h("section", { class: "round-intro" }, h("h2", {}, `Round ${n}`), h("div", { md: info.intro })));
    }
    inThis.forEach((q) => { any = true; main.append(card(q)); });
  }
  if (!any) main.append(h("p", { class: "empty" }, qs.length ? "No questions match these filters." : "No questions yet. The agent writes data/questions.json."));
  return h("div", { class: "qlayout" }, rail, main);
}

function buildRail() {
  const qs = Q();
  const areas = S.data.questions.areas || [];
  const rounds = (S.data.questions.rounds || []).map((r) => r.number).sort((a, b) => b - a);
  const ar = activeRound();
  const inRound = (q) => ar === "all" || q.round === ar;
  return h("aside", { class: "rail", "aria-label": "Filters" },
    h("div", {}, h("h2", {}, "Round"),
      h("select", { "aria-label": "Round", "data-fid": "round", onchange: (e) => { S.round = e.target.value; saveUi(); renderBody(); } },
        h("option", { value: "latest", selected: S.round === "latest" }, `Latest (${latestRound()})`),
        rounds.map((n) => h("option", { value: String(n), selected: String(S.round) === String(n) }, `Round ${n}`)),
        h("option", { value: "all", selected: S.round === "all" }, "All rounds"))),
    h("div", {}, h("h2", {}, "Show"),
      h("div", { class: "seg" }, [["all", "All"], ["unanswered", "Unanswered"], ["flagged", "Flagged"], ["settled", "Settled"]].map(([id, label]) =>
        h("button", { "aria-pressed": String(S.filter === id), "data-fid": "f-" + id, onclick: () => { S.filter = id; saveUi(); renderBody(); } }, label)))),
    h("div", { class: "arealist" }, h("h2", {}, "Areas"),
      areaButton("all", "All areas", "", qs.filter(inRound)),
      areas.map((a) => areaButton(a.id, a.title, a.blurb, qs.filter((q) => inRound(q) && q.area === a.id)))),
  );

}

function areaButton(id, title, blurb, qs) {
  const done = qs.filter(answered).length, flagged = qs.some((q) => getA(q.id).flag === "discuss");
  return h("button", { class: "area-btn", "aria-current": String(S.area === id), "data-fid": "area-" + id, onclick: () => { S.area = id; saveUi(); renderBody(); } },
    h("span", {}, title, flagged ? h("span", { class: "dot", title: "Has flagged questions", "aria-label": "has flagged questions" }) : null),
    h("span", { class: "count" }, `${done}/${qs.length}`),
    blurb ? h("small", {}, blurb) : null);
}

function safeRel(p) {
  return typeof p === "string" && p && !/^[a-z][a-z0-9+.-]*:/i.test(p) && !p.startsWith("//") && !p.startsWith("/") && !p.includes("..") && !p.includes("\\");
}

function card(q) {
  const a = getA(q.id), area = (S.data.questions.areas || []).find((x) => x.id === q.area);
  const takeOpen = !!S.takeOpen[q.id], previewOpen = !!S.previewOpen[q.id];
  const el = h("article", { class: "card" + (answered(q) ? " answered" : ""), id: "card-" + q.id },
    h("div", { class: "card-head" },
      h("span", { class: "chip" }, area ? area.title : q.area),
      h("span", { class: "qid" }, q.id),
      q.round ? h("span", { class: "qid" }, `· round ${q.round}`) : null,
      q.settled ? h("span", { class: "badge-ok" }, "Settled") : null,
      a.flag === "discuss" ? h("span", { class: "badge-flag" }, "Flagged") : null),
    h("h3", {}, q.title),
    q.context ? h("div", { md: q.context }) : null,
    q.illustration && safeRel(q.illustration) ? h("div", { class: "row" },
      h("a", { class: "btn small", href: q.illustration, target: "_blank", rel: "noopener" }, "Open sketch"),
      h("button", { class: "btn small ghost", "data-fid": "pv-" + q.id, "aria-expanded": String(previewOpen),
        onclick: () => { S.previewOpen[q.id] = !previewOpen; saveUi(); renderBody(); } }, previewOpen ? "Hide preview" : "Preview")) : null,
    q.illustration && safeRel(q.illustration) && previewOpen ? h("iframe", { class: "preview", src: q.illustration, title: "Sketch for " + q.title, sandbox: "allow-scripts allow-forms", loading: "lazy" }) : null,
    input(q, takeOpen),
    q.take ? h("div", { class: "take" },
      h("button", { "aria-expanded": String(takeOpen), "data-fid": "take-" + q.id, onclick: () => { S.takeOpen[q.id] = !takeOpen; saveUi(); renderBody(); } },
        (takeOpen ? "▾ " : "▸ ") + "Claude's take"),
      takeOpen ? h("div", { md: q.take }) : null) : null,
    q.kind !== "text" ? h("label", { class: "field" }, "Notes / nuance — anything goes",
      h("textarea", { class: "notes", rows: 2, "data-fid": "notes-" + q.id, placeholder: "Optional", oninput: (e) => onText(q, "notes", e.target.value) }, a.notes || "")) : null,
    h("label", { class: "flag" },
      h("input", { type: "checkbox", checked: a.flag === "discuss", "data-fid": "flag-" + q.id,
        onchange: (e) => { setA(q.id, { flag: e.target.checked ? "discuss" : null }); renderTop(); renderBody(); } }),
      "Flag for discussion"),
    q.settled ? h("div", { class: "settled" }, h("strong", {}, "Settled: "), h("div", { md: q.settled.summary || "" }), " ",
      q.settled.spec ? h("button", { class: "btn small", onclick: () => openSpecByFile(q.settled.spec) }, "Open spec") : null) : null,
  );
  // checked is a property for checkboxes; set after creation so the attribute logic above cannot misfire.
  const cb = el.querySelector(`input[data-fid="flag-${CSS.escape(q.id)}"]`);
  if (cb) cb.checked = a.flag === "discuss";
  return el;
}

function onText(q, field, value) {
  setA(q.id, { [field]: value });
  renderTop();
  const rail = root.querySelector(".rail");
  if (rail) { const sc = rail.scrollTop; rail.replaceWith(buildRail()); const r2 = root.querySelector(".rail"); if (r2) r2.scrollTop = sc; }
  const c = document.getElementById("card-" + q.id);
  if (c) c.classList.toggle("answered", answered(q));
}
/* ---------- inputs per kind ---------- */
function input(q, takeOpen) {
  const a = getA(q.id);
  if (q.kind === "single" || q.kind === "multi") return optionsInput(q, a, takeOpen);
  if (q.kind === "text") return h("textarea", { class: "big", "data-fid": "text-" + q.id, "aria-label": q.title, placeholder: "Your answer — anything goes",
    oninput: (e) => onText(q, "notes", e.target.value) }, a.notes || "");
  if (q.kind === "scope") return scopeInput(q, a);
  if (q.kind === "rank") return rankInput(q, a);
  return h("p", { class: "muted" }, `Unknown question kind: ${q.kind}`);
}

function optionsInput(q, a, takeOpen) {
  const multi = q.kind === "multi", choice = a.choice || [];
  const toggle = (id) => {
    let next;
    if (multi) next = choice.includes(id) ? choice.filter((c) => c !== id) : [...choice, id];
    else next = choice.includes(id) && choice.length === 1 ? [] : [id];
    setA(q.id, { choice: next });
    renderTop(); renderBody();
  };
  const box = h("div", { class: "options", role: multi ? "group" : "radiogroup", "aria-label": q.title });
  for (const o of q.options || []) {
    const on = choice.includes(o.id);
    box.append(h("button", { class: "opt" + (multi ? " multi" : ""), role: multi ? "checkbox" : "radio", "aria-checked": String(on), "data-fid": `opt-${q.id}-${o.id}`, onclick: () => toggle(o.id) },
      h("span", { class: "mark" }),
      h("span", { class: "opt-label" }, o.label, o.recommended && takeOpen ? h("span", { class: "rec-tag" }, "Claude recommends") : null),
      o.detail ? h("div", { class: "opt-detail", md: o.detail }) : null));
  }
  if (q.allow_other) {
    const on = choice.includes("other");
    box.append(h("button", { class: "opt" + (multi ? " multi" : ""), role: multi ? "checkbox" : "radio", "aria-checked": String(on), "data-fid": `opt-${q.id}-other`, onclick: () => toggle("other") },
      h("span", { class: "mark" }), h("span", { class: "opt-label" }, "Other…")));
    if (on) box.append(h("input", { class: "other-input", type: "text", "data-fid": "other-" + q.id, "aria-label": "Other answer", placeholder: "Describe your option",
      value: a.other || "", oninput: (e) => onText(q, "other", e.target.value) }));
  }
  return box;
}

/* scope board */
function scopeInput(q, a) {
  const placement = a.placement || {}, buckets = q.buckets || [], items = q.items || [];
  const place = (itemId, bucketId) => {
    const next = { ...placement };
    if (bucketId) next[itemId] = bucketId; else delete next[itemId];
    setA(q.id, { placement: next });
    S.menu = null; renderTop(); renderBody();
  };
  const colFor = (id, label) => {
    const list = items.filter((it) => (id === "" ? !buckets.some((b) => b.id === placement[it.id]) : placement[it.id] === id));
    const col = h("div", { class: "col", role: "group", "aria-label": label,
      ondragover: (e) => { if (S.drag && S.drag.qid === q.id) { e.preventDefault(); col.classList.add("over"); } },
      ondragleave: () => col.classList.remove("over"),
      ondrop: (e) => { e.preventDefault(); col.classList.remove("over"); if (S.drag && S.drag.qid === q.id) { const it = S.drag.id; S.drag = null; place(it, id); } } },
      h("h4", {}, h("span", {}, label), h("span", {}, String(list.length))),
      list.map((it) => chip(q, it, placement, buckets, place)));
    return col;
  };
  return h("div", { class: "board" }, colFor("", "Unplaced"), buckets.map((b) => colFor(b.id, b.label)));
}

function chip(q, it, placement, buckets, place) {
  const open = S.menu && S.menu.qid === q.id && S.menu.item === it.id;
  const wrap = h("div", { class: "item-wrap" });
  const toggleMenu = (e) => { e.stopPropagation(); S.menu = open ? null : { qid: q.id, item: it.id }; renderBody(); };
  const el = h("span", { class: "item", role: "button", tabindex: "0", draggable: "true", title: it.detail || it.label, "aria-haspopup": "menu", "aria-expanded": String(!!open),
    "data-fid": `chip-${q.id}-${it.id}`, onclick: toggleMenu,
    onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleMenu(e); } else if (e.key === "Escape" && open) { S.menu = null; renderBody(); } },
    ondragstart: (e) => { S.drag = { qid: q.id, id: it.id }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); el.classList.add("dragging"); },
    ondragend: () => { S.drag = null; el.classList.remove("dragging"); } }, it.label);
  wrap.append(el);
  if (open) {
    const cur = placement[it.id];
    const menu = h("div", { class: "chip-menu", role: "menu", onclick: (e) => e.stopPropagation() },
      it.detail ? h("div", { class: "detail" }, it.detail) : null,
      [["", "Unplaced"], ...buckets.map((b) => [b.id, b.label])].map(([id, label]) =>
        h("button", { role: "menuitem", "aria-current": String((cur || "") === id), "data-fid": `menu-${q.id}-${it.id}-${id || "none"}`, onclick: () => place(it.id, id),
          onkeydown: (e) => { if (e.key === "Escape") { S.menu = null; renderBody(); } } }, "Move to " + label)));
    wrap.append(menu);
    setTimeout(() => { const first = menu.querySelector("button"); if (first && document.body.contains(first)) first.focus({ preventScroll: true }); }, 0);
  }
  return wrap;
}

/* rank list */
function rankInput(q, a) {
  const items = q.items || [], byId = Object.fromEntries(items.map((i) => [i.id, i]));
  let order = (a.order || []).filter((id) => byId[id]);
  order = [...order, ...items.map((i) => i.id).filter((id) => !order.includes(id))];
  const commit = (next) => { setA(q.id, { order: next }); renderTop(); renderBody(); };
  const move = (from, to) => { if (to < 0 || to >= order.length || from === to) return; const next = [...order]; const [x] = next.splice(from, 1); next.splice(to, 0, x); commit(next); };
  const list = h("ol", { class: "rank", "aria-label": q.title });
  order.forEach((id, idx) => {
    const it = byId[id];
    const li = h("li", { draggable: "true", title: it.detail || "",
      ondragstart: (e) => { S.drag = { qid: q.id, id }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); li.classList.add("dragging"); },
      ondragend: () => { S.drag = null; li.classList.remove("dragging"); },
      ondragover: (e) => { if (S.drag && S.drag.qid === q.id) { e.preventDefault(); li.classList.add("over"); } },
      ondragleave: () => li.classList.remove("over"),
      ondrop: (e) => { e.preventDefault(); li.classList.remove("over"); if (S.drag && S.drag.qid === q.id) { const from = order.indexOf(S.drag.id); S.drag = null; move(from, idx); } } },
      h("span", { class: "grip", "aria-hidden": "true" }, "⠿"),
      h("span", { class: "n" }, String(idx + 1)),
      h("span", {}, h("strong", {}, it.label), it.detail ? h("span", { class: "muted" }, " — " + it.detail.replace(/[*_`]/g, "")) : null),
      h("span", { class: "btns" },
        h("button", { class: "btn small", "aria-label": `Move ${it.label} up`, disabled: idx === 0, "data-fid": `up-${q.id}-${id}`, onclick: () => move(idx, idx - 1) }, "↑"),
        h("button", { class: "btn small", "aria-label": `Move ${it.label} down`, disabled: idx === order.length - 1, "data-fid": `dn-${q.id}-${id}`, onclick: () => move(idx, idx + 1) }, "↓")));
    list.append(li);
  });
  const wrap = h("div", {}, list);
  if (!(a.order || []).length) wrap.append(h("div", { class: "row", style: "margin-top:.5rem" },
    h("span", { class: "muted" }, "Not ranked yet. Move an item, or"),
    h("button", { class: "btn small", onclick: () => commit(order) }, "keep this order")));
  return wrap;
}

/* ---------- specs view ---------- */
function specFor(file) { return SPECS().find((s) => s.file === file); }

function openSpecByFile(file) {
  const s = specFor(file);
  S.specSel = s ? s.id : "file:" + file;
  S.tab = "specs"; saveUi(); render();
  ensureSpecLoaded();
}

function jumpToQuestion(qid) {
  const q = Q().find((x) => x.id === qid);
  S.tab = "questions"; S.filter = "all"; S.area = "all"; S.round = "all";
  if (q && q.round === latestRound()) S.round = "latest";
  saveUi(); render();
  const el = document.getElementById("card-" + qid);
  if (el) {
    el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.classList.add("flashed");
    setTimeout(() => el.classList.remove("flashed"), 1700);
  }
}

function specsView() {
  const specs = SPECS();
  const list = h("div", { class: "speclist" }, specs.length ? specs.map((s) =>
    h("div", { class: "spec", role: "button", tabindex: "0", "aria-current": String(S.specSel === s.id), "data-fid": "spec-" + s.id,
      onclick: () => { S.specSel = s.id; renderBody(); ensureSpecLoaded(); },
      onkeydown: (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); S.specSel = s.id; renderBody(); ensureSpecLoaded(); } } },
      h("div", { class: "t" }, h("span", {}, s.title || s.id), h("span", { class: "pill " + (s.status || "todo") }, s.status || "todo")),
      s.summary ? h("div", { class: "muted" }, s.summary) : null,
      (s.questions || []).length ? h("div", { class: "qlinks" }, s.questions.map((qid) =>
        h("button", { class: "qlink", title: "Jump to question", onclick: (e) => { e.stopPropagation(); jumpToQuestion(qid); } }, qid))) : null,
      h("div", { class: "qid" }, s.file || ""))) : h("p", { class: "empty" }, "No specs yet. The agent writes data/specs.json."));
  const reader = h("div", { class: "reader", id: "reader", "aria-live": "polite" });
  fillReader(reader);
  return h("div", { class: "slayout" }, list, reader);
}

function fillReader(host) {
  const d = S.specDoc;
  if (!S.specSel) { host.append(h("p", { class: "muted" }, "Choose a spec to read it here.")); return; }
  const spec = SPECS().find((s) => s.id === S.specSel);
  const file = spec ? spec.file : String(S.specSel).replace(/^file:/, "");
  if (!d || d.file !== file) { host.append(h("p", { class: "muted" }, "Loading…")); return; }
  const title = (d.meta && d.meta.title) || (spec && spec.title) || file;
  const status = (d.meta && d.meta.status) || (spec && spec.status);
  host.append(h("div", { class: "reader-head" }, h("h2", {}, title), status ? h("span", { class: "pill " + status }, status) : null, h("span", { class: "qid" }, file)));
  if (d.missing) host.append(h("p", { class: "muted" }, `Not written yet. ${file} does not exist in agent_wiki/.`));
  else if (d.error) host.append(h("p", { class: "muted" }, `Could not load: ${d.error}`));
  else host.append(h("div", { md: d.body }));
}

async function ensureSpecLoaded() {
  if (!S.specSel) return;
  const spec = SPECS().find((s) => s.id === S.specSel);
  const file = spec ? spec.file : String(S.specSel).replace(/^file:/, "");
  if (!file) return;
  const sel = S.specSel;
  let doc;
  try {
    const res = await fetch("/wiki/" + file.split("/").map(encodeURIComponent).join("/"));
    if (res.status === 404) doc = { file, missing: true, meta: {} };
    else if (!res.ok) doc = { file, error: `HTTP ${res.status}`, meta: {} };
    else { const fm = frontmatter(await res.text()); doc = { file, meta: fm.meta, body: fm.body }; }
  } catch (e) { doc = { file, error: e.message, meta: {} }; }
  if (S.specSel !== sel) return;
  S.specDoc = doc;
  const host = root.querySelector("#reader");
  if (host && S.tab === "specs") { host.replaceChildren(); fillReader(host); }
}

/* ---------- sketches view ---------- */
function sketchesView() {
  const map = new Map();
  for (const q of Q()) if (q.illustration && safeRel(q.illustration)) { (map.get(q.illustration) || map.set(q.illustration, []).get(q.illustration)).push(q); }
  const wrap = h("div", { class: "sketches" });
  if (!map.size) wrap.append(h("p", { class: "empty" }, "No sketches referenced yet. Questions point to one with their illustration field."));
  for (const [path, qs] of map) {
    const key = "sk:" + path, open = !!S.previewOpen[key];
    wrap.append(h("section", { class: "card" },
      h("div", { class: "card-head" }, h("strong", {}, path.split("/").pop()), h("span", { class: "qid" }, path)),
      h("div", { class: "qlinks row" }, h("span", { class: "muted" }, "Used by"), qs.map((q) => h("button", { class: "qlink", title: q.title, onclick: () => jumpToQuestion(q.id) }, q.id))),
      h("div", { class: "row" },
        h("a", { class: "btn small", href: path, target: "_blank", rel: "noopener" }, "Open"),
        h("button", { class: "btn small ghost", "aria-expanded": String(open), "data-fid": "pv-" + key, onclick: () => { S.previewOpen[key] = !open; saveUi(); renderBody(); } }, open ? "Hide preview" : "Preview")),
      open ? h("iframe", { class: "preview", src: path, title: "Sketch " + path, sandbox: "allow-scripts allow-forms", loading: "lazy" }) : null));
  }
  return wrap;
}

/* ===================== global events ===================== */
document.addEventListener("click", () => { if (S.menu) { S.menu = null; if (S.tab === "questions") renderBody(); } });
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
  else if (e.key === "Escape" && S.menu) { S.menu = null; renderBody(); }
});
window.addEventListener("beforeunload", (e) => { if (S.data && isDirty()) { e.preventDefault(); e.returnValue = ""; } });

load().then(() => { if (S.tab === "specs") ensureSpecLoaded(); });
