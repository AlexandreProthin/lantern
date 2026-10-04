# Resume / handoff

1. Read AGENTS.md and explicitly choose a project.
2. Read its STATE, REQUEST, BRIEF, CONTRACT and RUBRIC.
3. Read LOG entries since the checkpoint, the active round and its request snapshot.
   Read ARTIFACTS.csv and selected parents' sources/evidence.
4. Verify revisions, consumed request, permission boundary and referenced files; look
   for newer checkpoints before assuming STATE is current.
5. Briefly state the established position, then continue its authorized next action.
   Ask only for missing inputs needed for that action. Do not guess picks or restart.
6. Checkpoint each loop step and before stopping using AGENTS.md's save order.

Recovery: inspect snapshots, log and actual files. Identify last complete checkpoint,
partial work and newer instructions; append a recovery event, register orphaned drafts
and rebuild STATE from verified evidence. Preserve conflicting user records and resolve
before dependent work. Never silently complete a partial round or alter published assets.

Handoff packet in STATE/latest snapshot: project, phase, attempt, loop step, request/state
revisions, contract/rubric versions, selected/rejected/deferred IDs, locks, invalidated
tests, completed and partial artifacts, latest event/decision IDs, open questions, exact
next action, permitted work and relative paths. Receiving agents read files themselves.
For another machine/harness copy the complete folder including sources/refs. Record
missing external references/tools; the original conversation and machine path are unnecessary.
