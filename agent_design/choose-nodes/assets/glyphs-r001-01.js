/* The node structure of r001-01 "Kind inside, state around", frozen for the later phases: Learn's 44 px disc (54 px
   for the subject), the kind pictogram inside, the four looks on the ring, the exact state in a 20 px rim badge,
   title beside the disc. Geometry only; every colour comes from the page (tokens). Exposes window.GLYPHS. */
(function () {
  const css = `
.nd{display:flex;align-items:flex-start;gap:12px;width:210px}
.anchor{position:relative;flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid}
.anchor svg.k{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.anchor svg.k .f{fill:currentColor;stroke:none}
.t{font-size:13px;line-height:1.5;font-weight:400;padding-top:11px;overflow-wrap:anywhere}
.subject .anchor{width:54px;height:54px}.subject .t{padding-top:15px;font-weight:600}
.look-open .anchor,.look-faded .anchor{border-style:dotted}
.look-faded{opacity:.45}.look-faded .anchor{border-style:dashed}
.chosen .anchor::before{content:"";position:absolute;inset:-6px;border:1px solid;border-radius:50%}
.kit-node[aria-pressed="true"] .chosen .anchor{outline-offset:10px}
.badge{position:absolute;right:-7px;top:-7px;width:20px;height:20px;border-radius:50%;border:1px solid;display:grid;place-items:center}
.badge svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.badge svg .f{fill:currentColor;stroke:none}
.dismissed .t{text-decoration:line-through}
.bare .anchor{margin:6px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.prepend(st);

  const KIND_ICON = {
    subject: '<circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="2.3"/>',
    concept: '<circle class="f" cx="9" cy="4.2" r="1.2"/><path d="M7.3 7.6H9v6.6M7 14.2h4"/>',
    need: '<path d="M6.3 6.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6"/><circle class="f" cx="9" cy="14" r="1"/>',
    criterion: '<path d="M9 3v11.5M5.5 14.5h7M3.5 5.5h11M3.5 5.5 1.8 10h3.4zM14.5 5.5 12.8 10h3.4z"/>',
    family: '<circle cx="5.8" cy="6.5" r="2.6"/><circle cx="12.2" cy="6.5" r="2.6"/><circle cx="9" cy="12.2" r="2.6"/>',
    product: '<path d="M9 2.5 15 5.5v7l-6 3-6-3v-7zM3 5.5l6 3 6-3M9 8.5v7"/>',
    own: '<path d="M3 15l.9-3.8L11.6 3.5l2.9 2.9-7.7 7.7zM10.2 5l2.8 2.8"/>',
  };
  const BADGE = {
    answered: '<path d="M2 5.3 4.2 7.5 8.2 2.8"/>',
    must: '<path d="M5 1.6v4.2"/><circle class="f" cx="5" cy="8.3" r="1"/>',
    nice: '<path d="M5 2v6M2 5h6"/>',
    irrelevant: '<path d="M2 5h6"/>',
    shortlisted: '<path class="f" d="M2.8 1.5h4.4v7L5 6.8 2.8 8.5z"/>',
    chosen: '<path class="f" d="M5 .9 6.2 3.6l2.9.3-2.2 1.9.7 2.9L5 7.2 2.4 8.7l.7-2.9L.9 3.9l2.9-.3z"/>',
    rejected: '<path d="M2.3 2.3l5.4 5.4M7.7 2.3 2.3 7.7"/>',
    exploring: '<circle class="f" cx="2" cy="5" r=".9"/><circle class="f" cx="5" cy="5" r=".9"/><circle class="f" cx="8" cy="5" r=".9"/>',
    decided: '<path d="M2 5.3 4.2 7.5 8.2 2.8"/>',
    bought: '<path d="M2.2 3.8h5.6l-.6 4.9H2.8zM3.6 3.8V3a1.4 1.4 0 0 1 2.8 0v.8"/>',
  };
  const LOOK = { open: 'open', candidate: 'open', lit: 'lit', answered: 'settled', must: 'settled', nice: 'settled', shortlisted: 'settled', chosen: 'settled',
    irrelevant: 'quiet', rejected: 'faded', dismissed: 'faded', exploring: 'lit', decided: 'lit', bought: 'settled' };

  function renderNode(n, o) {
    const { esc, stateOf } = NodeKit, s = stateOf(n);
    const badge = BADGE[s] ? `<span class="badge"><svg viewBox="0 0 10 10">${BADGE[s]}</svg></span>` : '';
    const disc = `<span class="anchor"><svg class="k" viewBox="0 0 18 18" aria-hidden="true">${KIND_ICON[n.kind]}</svg>${badge}</span>`;
    const cls = `nd ${n.kind} ${s} look-${LOOK[s]}${o.bare ? ' bare' : ''}`;
    return o.bare ? `<span class="${cls}" style="width:auto">${disc}</span>` : `<span class="${cls}">${disc}<span class="t">${esc(n.title)}</span></span>`;
  }

  const legend = [
    { heading: 'Kinds: the pictogram inside', rows: [
      { node: { kind: 'subject', status: 'exploring' }, name: 'Subject', text: 'What is being chosen; the root, a larger disc' },
      { node: { kind: 'concept', state: 'lit' }, name: 'Concept', text: 'Something to understand to choose well' },
      { node: { kind: 'need', state: 'lit' }, name: 'Need', text: 'A question to you' },
      { node: { kind: 'criterion', state: 'lit' }, name: 'Criterion', text: 'Something to compare on' },
      { node: { kind: 'family', state: 'lit' }, name: 'Family', text: 'A group of similar products' },
      { node: { kind: 'product', state: 'lit' }, name: 'Product', text: 'A real model' },
      { node: { kind: 'own', state: 'lit' }, name: 'Your own', text: 'Added by you' },
    ] },
    { heading: 'States: the ring and the rim badge', rows: [
      { node: { kind: 'concept', state: 'open' }, name: 'Open / candidate', text: 'Dotted ring, no badge: not looked at yet' },
      { node: { kind: 'concept', state: 'lit' }, name: 'Lit', text: 'Glowing: explained' },
      { node: { kind: 'need', state: 'answered' }, name: 'Answered', text: 'Settled, check badge: your answer is on the board' },
      { node: { kind: 'criterion', state: 'must' }, name: 'Must', text: 'Settled, ! badge' },
      { node: { kind: 'criterion', state: 'nice' }, name: 'Nice to have', text: 'Settled, + badge' },
      { node: { kind: 'criterion', state: 'irrelevant' }, name: 'Irrelevant', text: 'Quiet ring, – badge: decided, ignored when comparing' },
      { node: { kind: 'product', state: 'shortlisted' }, name: 'Shortlisted', text: 'Settled, bookmark badge' },
      { node: { kind: 'product', state: 'chosen' }, name: 'Chosen', text: 'Settled, second ring, star badge: one per subject' },
      { node: { kind: 'product', state: 'rejected' }, name: 'Rejected', text: 'Faded, × badge; the reason is in the panel' },
      { node: { kind: 'concept', state: 'dismissed' }, name: 'Dismissed', text: 'Faded, title struck; restore it from the parent' },
      { node: { kind: 'subject', status: 'decided' }, name: 'Decided / bought', text: 'Subject badge: … exploring, check decided, bag bought' },
    ] },
  ];

  window.GLYPHS = { renderNode, legend, LOOK };
})();
