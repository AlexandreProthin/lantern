# Native acceptance before v0.1.0 release

Use the unsigned per-user NSIS preview from `npm run installer:preview`.
The approved release gates are in `../agent_wiki/plans/v0-1-0.md`; automated
browser checks do not sign off these Windows and multi-day scenarios.

- [x] Install as the current user, launch, and create a real subject from Welcome.
  Confirm the selected tone/model, streaming intro and D1 visual/motion treatment (AC-1).
- [x] Learn one real subject across a dogfooding week and several app restarts.
  Confirm recents, focus, graph states, edits and notes persist (AC-2/3).
- [x] Verify abrupt termination loses no more than the last unsaved debounce window;
  test on a disposable subject/library, retaining a copy (AC-4).
- [x] Try a long generation, inspect streaming/spawn behavior, then cancel. Confirm
  the previous state remains and no CLI children survive (AC-5).
- [x] Walk through CLI missing, signed-out and ready instructions in a suitable
  test environment. Confirm ordinary use requires no terminal after setup (AC-6).
- [x] Change tone/model, use the native library picker with Move/Copy/Leave, and
  check window restoration. Confirm other subjects and Settings remain intact (AC-7).
- [x] In Gallery, reveal a file in Explorer. (User-reported 2026-10-02, installed build: works.)
- [x] In Gallery, delete a disposable subject. Confirm the actual Windows Recycle Bin contains it,
  including after cancellation. (Automated evidence only: an ignored Rust test sent a disposable subject to the Recycle Bin.)
- [x] Try 500-node native pan/zoom.
- [x] Approve the spawn/Welcome look and motion tuning. (User-reported 2026-10-02, installed build: approved.)
- [x] Import copies of the real PoC subjects, if available, and reopen identically.
  Automated evidence (2026-10-02): both real subjects were imported from temp copies, validated and
  round-tripped by `real_poc_subjects_import_validate_and_round_trip`; still tick by hand after
  trying them in the installed build.
- [x] Review tutor prose for teaching quality; the automated protocol score does
  not validate factual accuracy (see `../agent_wiki/issues/tutor-prose-quality.md`).

Record failures in the wiki and fix or explicitly defer them. Only after these
gates and the user's release approval: tag v0.1.0, publish the installer, and
retire the PoC as specified by the plan.

All gates were ticked by the user on 2026-10-04 and v0.1.0 was approved for release.
The notes below were written during that walk-through; they are not v0.1.0 blockers and
are tracked as the v0.1.1 plan in `../agent_wiki/plans/v0-1-1.md`.

## Bug found

Issue/subject json/evidence 

- Graph rendering issue: "C:\Users\alexp\Documents\Lantern\subjects\n8n-from-https-n8n-io-use-case-example-a-3a50.json"
  - screenshot: ![image-20261004152832469](C:\Users\alexp\AppData\Roaming\Typora\typora-user-images\image-20261004152832469.png)
- subject stats: all
  - "Models used Opus 5100%", model name and usage need spacing to have "Models used Opus 5 100%"
- Model picker: all
  - model picker drop down menu only offer opus, i want to be able to pick any available model (ie: opus 5.5, opus 4.8, Sonnet5.5, ...)
- escaping the menu: all
  - from the lean room when i open the subject drop down menu (top bar), clicking outside of it (in the graph or read view) do not close it. I want the menu to close when clicking outside of it.
- Math rendering issue: "C:\Users\alexp\Documents\Lantern\subjects\i-want-to-learn-blender-2f80.json"
  - $1/r^2$ is rendered as raw text ![image-20261004162514010](C:\Users\alexp\AppData\Roaming\Typora\typora-user-images\image-20261004162514010.png)

- visual bug: welcome page
  - when the cursor is active the text box edges interfere with the background gradient. Ok if no active cursor.
    ![image-20261004162855503](C:\Users\alexp\AppData\Roaming\Typora\typora-user-images\image-20261004162855503.png)

- In the Gallery: layout issue
  - i am missing some scroll space the see then end of the selected subject
  - ![image-20261004170033853](C:\Users\alexp\AppData\Roaming\Typora\typora-user-images\image-20261004170033853.png)

## Improvement

- Home and Gallery icons from the graph view (top right) are redundent with the one on the globat top bar. Only keep the Tree layout icon
- graph view bottom right icon order: Zoom out, Recenter, Zoom in
- Gallery: 
  - all the card should have the same size.
  - the title is trimmed if too long to fit in one line while the card is not selected

## Feature request

- in the graph view right clic a node offer the same 3 options as at the end of the right pannel

  - if the node is lit: More options, Add my own node, Delete
  - if the node is understoud: More options, Add my own node

  - if the node is still dark: Light it up, Dismiss, Delete

- Above the legent a reveal in (windows) file explorer button. button is "Open" and the same size as the "Legend" one. clic it: opens the folder containing the active subject.json. right clic it: copy the path to the subject.json in the clip board (provide user feedback on that).

- hovering a linked text (that point to an other node) trigger a subtle light traveling connection animation from the node i am reading content from to the node it refers to. This allow me to preview where i will land if i clic.

- code bloc sould be formated according to theire language
- Welcome page improvement: i want a way to provide more context about the graph direction/initial hook. I draft this image to represent my idea. The default behaviour is still the same but we add an option to have an extra text input. I do not know how to offer this option to be discussed and may need a dedicated design session.
  - ![image-20261004165532613](C:\Users\alexp\AppData\Roaming\Typora\typora-user-images\image-20261004165532613.png)
