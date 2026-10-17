---
type: Component
title: Web demo content
description: The prepared Learn subjects in app/demo/ - TCP congestion control (seeded, every node lightable and testable) and Blender 3D (created live from the prefilled Welcome) - and how to change or add one.
tags: [web-demo, content, learn]
status: draft
resource: /app/demo/
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:30:00Z }
---

# The subjects

| Subject | Source | How the visitor meets it | Prepared |
|---|---|---|---|
| How TCP congestion control works | `app/demo/learn-tcp.ts` | already in the library, a recent project opened yesterday; engineer tone | the subject (16 nodes, every state) and `tcpScript`: a light for each of its 8 open or dismissed nodes, a check question and the answer it looks for on all 16 |
| Blender 3D | `app/demo/learn-blender.ts` | prefilled on Welcome: *what this software is, why it is so popular, what makes it special*; curious tone | `blenderScript`: the intro with 3 axes, a light for the 3 axes and their 9 children, a check and answer for all 13 |

The TCP subject's file is also what the README images are made from (`demo/capture.ts`), and the GIF
streams the same *Fast retransmit* text the demo does. The Choose subject in the same folder
(`choose-keyboard.ts`) is used for the README only; the demo is Learn alone.

# Rules for prepared text

- Written in the tutor's format: markdown, `$…$` math, links to other nodes as `[title](node:<id>)`.
- Every intro and light ends with exactly three options, made with `options(...)`; option titles are
  unique in the subject (the app refuses a duplicate title from the model).
- An answer says what a good answer covers; it never contains `<understood/>`, because the demo does not
  read what the visitor typed.
- Facts stay checkable; products and brands only where they are the subject (Blender itself).

`src/demo/tutor.test.ts` enforces the first three and that every TCP node can be lit and tested.

# Changing or adding a subject

1. Edit or add a `LearnScript` in `app/demo/`; for a seeded subject, edit its builder and run
   `npx tsx demo/build.ts`.
2. Register it in `app/src/demo/scripts.ts` (and in `start.ts` if it is seeded).
3. `npm test`, `npm run build:demo`, `npm run test:demo`.
