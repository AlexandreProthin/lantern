# Demo subjects

Hand-written subjects and prepared tutor answers, for the web demo, the README images and manual
checks. The subjects are valid `lantern/2` files, checked with the app's own validation when built.
The wiki has the full picture: `agent_wiki/components/web-demo/`.

| File | Room | What it is |
|---|---|---|
| `learn-tcp.ts` → `subjects/how-tcp-congestion-control-works-demo.json` | Learn | 16 nodes over 3 levels in every state (open, lit, understood shown and declared, dismissed), formulas, node links and two check dialogues; focus on *AIMD*. Its `tcpScript` lets the web demo light every open node and test every node. |
| `learn-blender.ts` | Learn | `blenderScript`: the web demo's live new subject, *Blender 3D*: intro, 3 axes and their 9 children, with checks. |
| `choose-keyboard.ts` → `subjects/quiet-mechanical-keyboard-demo.json` | Choose | answered needs, ranked criteria, a 3-product shortlist and a filled Compare board (maker, measured, shop, opinion and sponsored sources, a disagreement, a user-edited price, a missing value, a rejected product). README only. |

The Choose products, shops and reviewers are generic on purpose (*Silent 65% board*,
*Online shop*): no real brand appears.

## Use them

- **Web demo**: `npm run dev:demo` (port 1432), or `npm run build:demo` then `npm run test:demo`.
- **Desktop app**: copy a `.json` file into your library folder and it appears in the Gallery.
- **README images**: `capture.ts` (below).

## Change them

Edit the `.ts` sources, never the JSON. From `app/`:

```powershell
npx tsx demo/build.ts      # rewrites subjects/*.json after validating them
npm test                   # src/demo/tutor.test.ts checks the scripts against the subject
npm run dev                # in another terminal: the capture needs the dev server
npx tsx demo/capture.ts    # rewrites ../docs/images/learn-study.png, choose-compare.png, learn-flow.gif
```

The capture also needs `ffmpeg` on PATH. For the GIF it swaps in a scripted tutor (the
*Fast retransmit* text of `tcpScript`) by patching the fake provider as the dev server serves it;
no app code changes. If `fake-provider.ts` changes shape, the capture stops with a message
saying so.
