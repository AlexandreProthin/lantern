# Amber acceptance (v0.4.0 plan, slice 9)

The user goes through this list in an installed build, with the real CLI and Haiku 5.5. Automated checks
(unit tests, Playwright with the fake provider, the `amber-1` evals) do not sign these off. The contract is
`../agent_wiki/specs/companion.md` (CO-0 to CO-58) and the top bar of `rooms-spaces.md` (RS-12).

**Build:** the version is bumped to 0.4.0, then built and signed as in `README.md`, and installed **over
v0.3.0 through the local update folder** (not a fresh install), so that the first launch is an update launch.
Before installing, put real release notes in that `latest.json`'s `notes`, long enough to be cut (more than about
280 characters).

## First launch after the update

- [ ] Amber hangs from the top bar on the right, by its loop, on a rope (CO-10).
- [ ] The bubble names the new version and shows the release notes, cut, with *Show all* and *Full release notes ›*
  at the end. *Show all* shows the full text; the link opens the release page (CO-31).
- [ ] Hovering the bubble keeps it; once the pointer leaves, it fades on its own (CO-30, CO-31).
- [ ] The update notice is gone, and Settings → General → *Check for updates* says the app is up to date.

## Later launches

- [x] Restart: a short greeting, not the same line as last time, fading after about 6 s (CO-30).
- [x] Amber is back where you left it in each space (CO-15).

## The bubble and the menu

- [x] Click Amber (or Tab to it, then Enter): a tip, *Next tip*, *What can I do here?* and the Ask field. *Next
  tip* shows a new tip each time; a reopening goes on from the tips you have not seen yet (CO-20, CO-21).
- [x] *What can I do here?* lists actions and their keys for the space you are in; try it in every space of both
  rooms (CO-22).
- [x] Esc and a click outside close the bubble.
- [x] Right-click, the context-menu key or Shift+F10 open the menu: *Move to…* lists this space's spots and moves
  Amber there; *Hide* turns Amber off and a toast says where to turn it back on (CO-4, CO-16, CO-58).

## Moving Amber

- [x] Grab Amber in the top quarter of the window: the rope follows, extends and retracts; let go, Amber swings
  and settles within a few seconds, at one of the hanging spots, never over the window controls (CO-11, CO-12).
- [x] Drag it lower: the resting spots show; drop it away from one, and Amber flies up or falls to the nearest,
  lands, folds its feet in and sits (CO-13, CO-14).
- [x] Study and Choose's Survey: three resting spots (left and right of the graph, bottom right of the panel), each
  just above the controls in its corner.
- [x] Grab Amber while it swings or flies: you hold it where it is. Esc while holding puts it back.
- [x] Where Amber hangs or rests, every control around it still takes clicks: the graph's legend, *Open*, the zoom
  buttons, the composer, the subject field, the capsule. Popovers, the subject panel and dialogs draw above Amber
  (CO-17).

## Ask Amber

- [x] Ask from the bubble's field: an app question (*How do I test myself?*), a question on the open subject, and a
  general one. The answers fit each kind; Amber thinks until the words stream (CO-40, CO-42).
- [x] A follow-up question sees the earlier one; once closed and reopened the chat starts fresh (CO-44).
- [x] Ctrl+J from anywhere opens the bubble with the field focused (CO-41).
- [x] Select a few words in the panel: the popover offers *Ask Amber*, and Alt+D does the same. The card opens by
  the selection with a short definition, Amber leans toward it; *Ask the tutor* continues as *Ask about this*;
  Esc closes the card (CO-45).
- [x] Settings → Companion: *Amber's model* reads Haiku 5.5; the tokens spent went up with your questions, and no
  subject's token count did (CO-46, CO-47).
- [x] Turn the network off (or sign the CLI out) and ask: the usual fix-it message, in the bubble (CO-49).

## Company during a generation

- [x] Learn: light a new direction. Until the first words, Amber tends its flame and says *Lighting up …*; the
  line goes when the text streams, and the field's busy dot stays (CO-35, CO-36).
- [x] Choose: *Find products*. Amber says *Looking for products…* until the first words.
- [x] In Study, while you read, Amber is still, its flame quiet; it comes alive on hover (CO-53).

## Motion

- [x] The gestures look right: attention on hover, curiosity on a click, suspension or a few steps when Amber
  appears, eyes following the pointer up close, dangling, the swing, flights and falls (CO-50 to CO-54).
- [x] Windows *Settings → Accessibility → Visual effects → Animation effects* off (or Settings → Appearance →
  *Reduce motion: Always*): Amber stands still, no gesture, swing, flight or fall; a move goes straight to its
  spot; the bubble and everything in it still work (CO-56).
- [x] Minimise the window during a gesture and bring it back: the gesture does not replay (CO-57).

## Both rooms

- [x] Switch room: Amber keeps its warm flame and body; its halo and the light on the frame take the room's colour
  (teal in Choose) (CO-55).

## Amber off

- [x] Settings → Companion → *Show Amber* off: Amber is gone everywhere and no greeting appears at the next launch
  (CO-1, CO-30).
- [x] The capsule gains *Ask*, after settings; it opens the same Ask box, alone. Ctrl+J opens it too (CO-41).
- [x] Alt+D and the popover's *Ask Amber* on a selection still give the card (CO-45).
- [x] `?` shows *What can I do here?* for the current space above the shortcuts (CO-2, GV-73).
- [x] A generation still shows its busy state, with no waiting line.
- [x] *Show Amber* on again: Amber comes back, in its remembered spot.

## Learn and Choose unchanged

- [x] Learn and Choose look and behave as in v0.3.0 apart from the top bar and Amber: Welcome, Study and Survey,
  Compare, Gallery, a generation, the backdrop.

Record failures in the wiki (issues, or the plan's slice 9) and fix or explicitly defer them.
