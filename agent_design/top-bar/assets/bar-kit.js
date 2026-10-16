// Shared wireframe kit for top-bar proposals (component exception, AGENTS.md): every proposal draws the
// same four states from top-bar-data.js on the flat app background, in white and grey hairlines only.
// A proposal calls BAR.page({ id, title, render }) where render(state, ctx) returns { bar, menu?, menuAt? }.
(function () {
  const D = window.TOP_BAR_DATA;
  const css = `
  :root{--bg:#101827;--ink:#e8eaee;--mute:#9aa1ad;--faint:#5d6574;--line:rgba(232,234,238,.32);--hair:rgba(232,234,238,.16);--hatch:rgba(232,234,238,.07);
    font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg)}
  *{box-sizing:border-box}body{margin:0;padding:28px 32px 40px;background:var(--bg)}
  h1{font:600 15px/1.3 ui-monospace,Consolas,monospace;margin:0 0 4px}.lede{color:var(--mute);margin:0 0 22px;max-width:1100px}
  .state{margin:0 0 26px}.cap{font:12px ui-monospace,Consolas,monospace;color:var(--mute);margin:0 0 6px}
  .win{position:relative;border:1px solid var(--line);border-radius:6px;overflow:hidden}
  .bar{position:relative;height:var(--barH,56px);display:flex;align-items:center;gap:12px;padding:0 0 0 16px;border-bottom:1px solid var(--line)}
  .body{height:52px;background:repeating-linear-gradient(90deg,transparent 0 22px,var(--hair) 22px 23px);opacity:.35}
  
  .drag{flex:1;align-self:stretch;min-width:12px;background:repeating-linear-gradient(135deg,transparent 0 6px,var(--hatch) 6px 7px)}
  .drag.fixed{flex:none}
  .band{position:absolute;left:0;top:3px;right:138px;z-index:0;pointer-events:none;background:repeating-linear-gradient(135deg,transparent 0 5px,var(--hair) 5px 6px);border-bottom:1px dashed var(--line)}
  .edge{position:absolute;left:0;right:0;top:0;height:3px;border-bottom:1px dotted var(--faint);z-index:0}
  .btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 8px;border-radius:4px;color:var(--ink);background:none;border:0;font:inherit;white-space:nowrap}
  .btn.box{border:1px solid var(--line)}.btn.mute{color:var(--mute)}
  .on{color:var(--ink)}.off{color:var(--mute)}
  .ul{box-shadow:inset 0 -2px 0 var(--ink)}.dot{position:relative}.dot::after{content:"";position:absolute;left:50%;bottom:-2px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--ink)}
  .sep{width:1px;height:22px;background:var(--line);flex:none}
  .title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .stats{color:var(--mute);font-size:12px;white-space:nowrap}
  .caret{font-size:10px;color:var(--mute)}
  .mid{position:absolute;left:50%;top:0;bottom:0;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:8px;max-width:30%;z-index:1;background:var(--bg);padding:0 12px;top:1px;bottom:1px}
  .two{display:flex;flex-direction:column;align-items:center;line-height:1.25;min-width:0;max-width:100%}
  .field{display:flex;align-items:center;gap:8px;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:16px;min-width:0;width:100%}
  .kbd{font:11px ui-monospace,Consolas,monospace;color:var(--faint)}
  .wc{display:flex;align-self:stretch;margin-left:auto}.wc span{width:46px;display:grid;place-items:center;color:var(--mute)}
  .wc svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:1}
  .g{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;flex:none}
  .mark{width:26px;height:26px;flex:none}
  .menu{position:absolute;z-index:3;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:6px;min-width:200px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  .menu .row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;white-space:nowrap}.menu .row.cur{outline:1px solid var(--line)}
  .menu .head{font:11px ui-monospace,Consolas,monospace;color:var(--faint);padding:6px 8px 2px;text-transform:uppercase;letter-spacing:.06em}
  .menu hr{border:0;border-top:1px solid var(--hair);margin:6px 2px}
  .note{position:absolute;font:11px ui-monospace,Consolas,monospace;color:var(--faint);white-space:nowrap}
  body.clean .drag,body.clean .band,body.clean .edge{background:none;border:0}body.clean .legend{display:none}
  body.clean .body{background:radial-gradient(60% 140% at 30% 0%,var(--glow,transparent),transparent 70%),var(--bg);opacity:1}
  .legend{display:flex;gap:18px;color:var(--mute);font-size:12px;margin:0 0 18px}.legend i{display:inline-block;width:22px;height:12px;vertical-align:-2px;margin-right:6px;border:1px solid var(--hair);background:repeating-linear-gradient(135deg,transparent 0 6px,var(--hair) 6px 7px)}`;

  const glyphs = {
    welcome: '<path d="M2.5 7.5 8 3l5.5 4.5V13h-11z"/><path d="M6.5 13V9.5h3V13"/>',
    study: '<circle cx="4" cy="4" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="7" cy="12" r="1.6"/><path d="M5.4 4.3 10.4 4.8M4.7 5.4 6.3 10.6M11.2 6.4 7.9 10.7"/>',
    gallery: '<rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><rect x="9" y="9" width="4.5" height="4.5"/>',
    survey: '<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>',
    compare: '<path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11M6 2v12M10 2v12"/>',
    settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4"/>',
    menu: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
    search: '<circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/>',
  };
  const glyph = name => `<svg class="g" viewBox="0 0 16 16" aria-hidden="true">${glyphs[name] || glyphs.gallery}</svg>`;
  // The accepted mark's geometry (ember-on-dark-32.svg), drawn as a wireframe: frame filled, flame outlined.
  const mark = () => `<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><g fill="#cfd3da"><path d="M 47 21 C 35 32 14 46 15 65 C 15 78 20 88 25 93 L 29 92 C 22 84 22 76 23 66 C 24 50 37 34 49 23 Z"/><path d="M 51 21 C 64 34 85 49 85 65 C 85 78 80 88 75 93 L 71 92 C 78 83 78 75 77 66 C 76 50 63 34 51 23 Z"/><path d="M 49 30 C 38 35 53 41 46 51 C 43 56 31 67 32 78 C 32 88 40 91 50 91 C 64 91 71 83 64 73 C 56 62 64 56 60 47 C 57 41 47 40 49 30 Z" fill="none" stroke="#cfd3da" stroke-width="4"/><path fill-rule="evenodd" d="M42 14 a8 10 0 1 0 16 0 a8 10 0 1 0 -16 0 M45 13 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0"/><rect x="24" y="90" width="52" height="8" rx="4"/></g></svg>`;
  const windowControls = () => '<div class="wc"><span><svg viewBox="0 0 10 10"><path d="M0 5.5h10"/></svg></span><span><svg viewBox="0 0 10 10"><path d="M.5 .5h9v9h-9z"/></svg></span><span><svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10"/></svg></span></div>';
  const drag = (fixed) => `<div class="drag${fixed ? ' fixed' : ''}" title="empty space drags the window"${fixed ? ` style="width:${fixed}px"` : ''}></div>`;

  function ctx(s) {
    const room = D.rooms.find(r => r.id === s.room), space = room.spaces.find(x => x.id === s.space);
    const subject = s.subject ? D.subjects[s.subject] : null;
    return { D, s, room, space, subject, narrow: s.width < 1200, glyph, mark, drag, windowControls,
      others: D.rooms.filter(r => r.id !== room.id) };
  }

  function page({ id, title, lede, render, clean }) {
    document.title = `top-bar ${id} · ${title}`;
    const style = document.createElement('style'); style.textContent = css; document.head.prepend(style); if (clean) document.body.classList.add('clean');
    const states = D.states.map(s => {
      const c = ctx(s), out = render(s, c);
      const at = out.menuAt === 'center' ? `left:50%;transform:translateX(-50%);top:${out.menuTop ?? 60}px` : `left:${out.menuAt?.[0] ?? 16}px;top:${out.menuAt?.[1] ?? 60}px`;
      const menu = out.menu ? `<div class="menu" style="${at}">${out.menu}</div>` : '';
      return `<section class="state" data-room="${s.room}"><p class="cap">${s.caption}</p><div class="win${out.menu ? ' tall' : ''}" style="width:${s.width}px"><div class="bar">${out.band ? `<div class="edge" title="resize edge"></div><div class="band" style="height:${out.band}px" title="drags the window"></div>` : ''}${out.bar}</div><div class="body" style="height:${out.menu ? out.menuH || 300 : 52}px"></div>${menu}${out.notes || ''}</div></section>`;
    }).join('');
    document.body.innerHTML = `<h1>${id} · ${title}</h1><p class="lede">${lede || ''}</p><div class="legend"><span><i></i>drags the window</span><span>white = current · grey = available · no colour in wireframe</span></div>${states}`;
    // The round sheet embeds this file; it sizes the frame from this message.
    const report = () => parent !== window && parent.postMessage({ topBar: id, height: document.documentElement.scrollHeight }, '*');
    addEventListener('load', report); setTimeout(report, 50);
  }

  window.BAR = { page, glyph, mark, drag, windowControls };
})();
