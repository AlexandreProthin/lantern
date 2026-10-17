# Demo subjects

Hand-written subjects for screenshots, demos and manual checks. They are valid `lantern/2`
files, checked with the app's own validation when built.

| File | Room | What it shows |
|---|---|---|
| `subjects/how-tcp-congestion-control-works-demo.json` | Learn | 16 nodes over 3 levels in every state (open, lit, understood shown and declared, dismissed), formulas, node links and two check dialogues; focus on *AIMD* |
| `subjects/quiet-mechanical-keyboard-demo.json` | Choose | answered needs, ranked criteria, a 3-product shortlist and a filled Compare board (maker, measured, shop, opinion and sponsored sources, a disagreement, a user-edited price, a missing value, a rejected product) |

The Choose products, shops and reviewers are generic on purpose (*Silent 65% board*,
*Online shop*): no real brand appears.

## Use them

- **Desktop app**: copy a `.json` file into your library folder and it appears in the Gallery.
- **Web build** (`npm run dev`): the README images are made from them by `capture.ts`, which shows how to seed one into browser storage.

## Change them

The sources are `learn-tcp.ts` and `choose-keyboard.ts`; edit those, never the JSON. From `app/`:

```powershell
npx tsx demo/build.ts      # rewrites subjects/*.json after validating them
npm run dev                # in another terminal: the capture needs the dev server
npx tsx demo/capture.ts    # rewrites ../docs/images/learn-study.png, choose-compare.png, learn-flow.gif
```

The capture also needs `ffmpeg` on PATH. For the GIF it swaps in a scripted tutor (the
*Fast retransmit* text in `learn-tcp.ts`) by patching the fake provider as the dev server serves it;
no app code changes. If `fake-provider.ts` changes shape, the capture stops with a message
saying so.
