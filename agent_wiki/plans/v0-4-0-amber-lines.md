---
type: Plan
title: v0.4.0 Amber lines, draft for review
description: Draft of Amber's predefined words for the user to review - the tip pool, What can I do here? for every space of Learn and Choose, the greeting lines and the waiting lines - before they move into strings.ts and the room definitions.
tags: [plan, v0.4.0, companion, amber, strings]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-10-17T12:30:00Z }
---

Slice 0 of the [v0.4.0 plan](/plans/v0-4-0.md). Everything here is predefined text (CO-40); none of it
comes from a model. Once agreed it moves, word for word, into `app/src/ui/strings.ts` (frame lines) and
each room's `companion` member (RS-3, CO-23). Edit anything in place, cross out what you don't want.

Voice: Amber's own, short and calm, sentence case, no exclamation marks, no "I'm just a little lantern"
cuteness. A line is one or two sentences and fits the bubble without scrolling. Keys are written as the
shortcut table writes them (GV-76).

# Tips (CO-21)

Shown one per opening, unseen first. *Frame* tips go in every room; room tips only in their room.

**Frame (every room)**
1. Press Ctrl+J anywhere to ask me something. I know the app, your subject, and a bit of everything else.
2. Select a few words in the panel and press Alt+D: I'll tell you what they mean.
3. Press ? to see every shortcut, and what you can do in this space.
4. You can drag me somewhere else. Let go near the top and I hang; near the bottom and I land.
5. Right-click me, or press Shift+F10, to move me or hide me.
6. Ctrl+1, Ctrl+2, Ctrl+3 jump between the spaces of a room.
7. Ctrl+Shift+1 and Ctrl+Shift+2 switch rooms; each room keeps its own open subject.
8. Esc closes what's open first, then cancels an edit, then a running generation.
9. Settings are one press away: Ctrl+,
10. Ctrl+K opens the subject's settings and lets you jump to another subject.

**Learn**
1. Arrow keys walk the graph: left to the parent, right to a child, up and down between siblings.
2. Press Enter on a dark node to light it up.
3. *Test me* asks you a question about the node. *I get it* marks it understood on your word.
4. Select a passage and press Alt+N: it becomes a node of its own.
5. Shift+Enter in the Welcome field adds a direction: where to start, or where to head.
6. Dismiss a direction you don't want; it won't be proposed again, and *Restore* brings it back.
7. Ctrl+F in Study searches every node of the subject.
8. Drag the divider to give the graph or the panel more room; double-click it to reset.

**Choose**
1. Tell me your needs early: the Welcome field takes a budget, a use, a limit.
2. Rank each criterion *Must*, *Nice to have* or *Irrelevant*; the recommendation follows your ranks.
3. *Shortlist* a product and it becomes a column in Compare, filled with sourced values.
4. Click a value in Compare to see where it came from.
5. *Recommend* works at any time: it says what's still missing and how sure it is.
6. *Check this* asks for a second look at a product or a value.
7. The board beside the graph counts your needs, criteria and shortlist at a glance.
8. Turn off *Use the web* in Settings → Choose room for answers from the model's knowledge only.

# What can I do here? (CO-22, GV-73)

One list per space; each line an action and its key. Shown in Amber's bubble and in the `?` overlay.

**Learn → Welcome**
- Bring a subject: type it and press Enter.
- Add a direction: Shift+Enter in the field.
- No idea yet? *Suggest 3 subjects*.
- Pick up a recent subject: click its card, or Ctrl+2 for the latest.

**Learn → Study**
- Walk the graph: arrow keys; Home goes back to the root.
- Light a dark node: Enter, or *Light it up*.
- Ask the tutor or answer it: type in the panel, Ctrl+Enter sends.
- Check yourself: *Test me*, or *I get it*.
- Turn a selection into a question or a node: Alt+A, Alt+N; ask me about it: Alt+D.
- Find a node: Ctrl+F.

**Learn → Gallery**
- Move through your subjects: arrow keys; Enter opens one.
- Sort and filter: the controls above the grid.
- Rename: *Rename*, then Enter to save.
- Delete: the Delete key, then confirm.

**Choose → Welcome**
- Say what you want to buy: type it and press Enter.
- Add what you already know (budget, use, limits): Shift+Enter in the field.
- Pick up a recent decision: click its card, or Ctrl+2 for the latest.

**Choose → Survey**
- Walk the graph: arrow keys; Home goes back to the root.
- Answer a need, rank a criterion: in the panel, *Answer*, *Must*, *Nice to have*, *Irrelevant*.
- Find candidates: *Find products*.
- Keep or drop a product: *Shortlist*, *Reject*.
- Ask for a verdict: *Recommend*, at any time.
- Open the board: the counter rail beside the graph.

**Choose → Compare**
- See where a value comes from: click it, or Enter on it.
- Fill the empty cells: *Fill Compare*.
- Correct a value: open its card and edit it.
- Decide: *Choose* a product, then *Mark as bought*.

**Choose → Gallery**
- Move through your decisions: arrow keys; Enter opens one.
- Filter by name or status: the controls above the grid.
- Delete: the Delete key, then confirm.

# Greetings (CO-30, CO-31)

**Every launch** (one at random, never the same twice in a row; fades after about 6 s):
1. Hello again.
2. Welcome back. Where were we?
3. Good to see you.
4. The light's still on.
5. Ready when you are.
6. Back at it.

**First launch after a fresh install:**
> Hello, I'm Amber. Click me for tips, or press Ctrl+J to ask me anything.

**First launch after an update** (followed by the release notes, cut and expandable, then the link):
> Lantern {version} is here. What's new:
> … *the notes* …
> *Full release notes ›* (the release page)

# Waiting lines (CO-35)

Shown while a generation the user started waits for its first words; `{title}` is the node or subject
title, clipped to about 32 characters.

**Learn**
| Task | Line |
|---|---|
| Light the subject (intro) | Lighting up {title}… |
| Light a node | Lighting up {title}… |
| More options | Looking for more directions… |
| Reply in the dialogue | The tutor is thinking… |
| Test me | Preparing a question… |
| Check an answer | Reading your answer… |
| Suggest 3 subjects | Thinking of subjects… |

**Choose**
| Task | Line |
|---|---|
| Light the subject (intro) | Sizing up {title}… |
| Light or *Explain* a node | Lighting up {title}… |
| Reply in the dialogue | Thinking it over… |
| Find products | Looking for products… |
| Fill Compare | Filling in Compare… |
| Check this | Checking {title}… |
| Recommend | Weighing your options… |

# Questions for you

1. **Ctrl+K tip** (frame tip 10) only holds once the top bar ships; keep it, and it goes in with the bar?
2. Learn's *Reply* line says *The tutor*, Choose's says nothing about who: same wording in both rooms
   (*Thinking it over…*), or keep the tutor in Learn?
3. Should Amber speak in the first person (*ask me*, *I'll tell you*) as drafted, or stay impersonal
   (*Ask Amber…*)?
