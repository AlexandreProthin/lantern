# Choose palette — final design

Selected on 2026-10-14. Saved request revision 2 picks r001-01 with an empty prompt, and the user said in chat
"choose-palette-col-r001-01.html is the one next".

- Winner: **r001-01 — Same night, teal lantern**.
- Final snapshot: [choose-palette-fin-r001-01.html](final/choose-palette-fin-r001-01.html), a byte-exact copy of
  [choose-palette-col-r001-01.html](color/choose-palette-col-r001-01.html). Its experiment header stays as provenance.
- Shared files: [choose-palette-data.js](choose-palette-data.js), [assets/replica.js](assets/replica.js) (the Choose
  replica: Welcome, Survey, Gallery and the token sheet) and [assets/backdrop.js](assets/backdrop.js) (the final
  backdrop with every colour read from the tokens, as `app/src/frame/backdrop.ts` does). They load as `../…`, which
  resolves the same from `final/` as from `color/`. The top pill (screens, *Learn ⇄ Choose*, *Light a node*,
  *Preview ×8*) and the corner tag are prototype controls, not part of the design.
- What it is: Learn's house with a teal lamp. Background, surfaces, lines, text, open nodes, code and error stay
  exactly Learn's; the accent, the lit light, the glows, focus, paths and `--surface-2` turn teal.

## Decisions and ancestry

One round, color phase, no parents.

| Design | Parents | Outcome |
| --- | --- | --- |
| r001-01 — Same night, teal lantern | none | **Final.** Only the lantern's colours change. |
| r001-02 — Deep lagoon | none | Not chosen: the whole room tinted blue-green. |
| r001-03 — Teal room, warm flame | none | Not chosen: teal accent with the lit light kept warm cream. |

## Verbatim input

Round 1 (revision 1, written by the agent from the user's chat brief, mode combine, no picks):

```text
Choose room palette: teal lantern (CR-70), the full RS-31 token set under data-room="choose" (plus --error), in the same calm family as Learn's Amber lantern. The backdrop (RS-34) re-tints from the tokens. Show it on Welcome, Survey and Gallery with the backdrop and glass, plus a token sheet.
```

Read as a **direction** (teal lantern, same calm family as Learn), not a precise scheme. Revision 2: pick r001-01, empty prompt.

## Final tokens (`:root[data-room='choose']`)

| Token | Choose | Learn | |
| --- | --- | --- | --- |
| `--bg` | `#101827` | `#101827` | same |
| `--surface` | `#172132` | `#172132` | same |
| `--surface-2` | `#1f3034` | `#302b2a` | teal-grey instead of warm brown |
| `--ink` | `#f3e9dc` | `#f3e9dc` | same |
| `--ink-mute` | `#aeb3bf` | `#aeb3bf` | same |
| `--line` | `#3b4558` | `#3b4558` | same |
| `--accent` | `#5cc6bd` | `#e8b66e` | |
| `--accent-ink` | `#0d211f` | `#211b14` | |
| `--focus` | `#b6efe6` | `#ffe0ab` | |
| `--node-open` | `#969ca7` | `#969ca7` | same |
| `--node-lit` | `#c8f3ea` | `#ffe1aa` | |
| `--node-understood` | `#5cc6bd` | `#e8b66e` | = accent, as in Learn |
| `--glow-near` | `rgba(118, 222, 206, 0.32)` | `rgba(255, 199, 118, 0.34)` | |
| `--glow-far` | `rgba(84, 204, 188, 0.15)` | `rgba(255, 182, 88, 0.15)` | |
| `--path-muted` | `#3e625d` | `#6f5c42` | |
| `--code` | `#0c1320` | `#0c1320` | same |
| `--error` | `#d86a5a` | `#d86a5a` | same (RS-32) |
| `--error-ink` | `#f0a598` | `#f0a598` | same |

`color-scheme: dark`. The room menu's swatch (`room.ts` accent) is `#5cc6bd`.

Contrast (WCAG, glass surface = `--surface` at 55% over `--bg`): ink on bg 14.81, ink on glass 14.08, ink-mute on
glass 8.05, ink on surface-2 11.43, accent-ink on accent 8.18, accent on bg 8.69, accent on glass 8.26, node-lit on
surface-2 11.41, focus on bg 13.94, path-muted on bg 2.63 (decorative). Every text pair is ≥ 4.5 and every outline ≥ 3.

## Backdrop

No new values: the backdrop reads the tokens exactly as the app already does (RS-34). With this palette the main orbit
light is `--accent` teal, the near light and the warm motes `--node-lit` pale aqua, the wide light and pointer pool
`--glow-far` teal, the slow brown light becomes `--path-muted` deep teal, the widest light stays `--line` navy, cool
motes `--ink-mute`, vignette from `--code`. The app needs no backdrop change.

## Open, for the implementation

- **Syntax colours.** Learn also defines `--code-keyword … --code-comment` (`app/src/ui/app.css`), not part of RS-31
  and not designed here. Proposal: Choose reuses Learn's set, with `--code-keyword` = `#5cc6bd` (Learn's is its
  amber accent). To confirm with the user.
- **Choose's node states.** The sheet shows only four colour looks (open, lit, settled, faded) from the RS-31 node
  tokens; the glyphs and the per-state treatment are the `choose-glyphs` design. If that design needs a colour beyond
  these tokens, it is added there and to this table.
- **Spec.** On acceptance, [choose-room](../../agent_wiki/specs/choose-room.md) CR-70 records these values (as RS-31
  does for Learn).
