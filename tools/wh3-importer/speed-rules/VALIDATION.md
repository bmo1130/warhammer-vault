# Speed slice validation

Baseline: `4d41fa6`. Production has 1,110 Unit records. Speed 81 → 908, missing Speed 1,029 → 202, new values 827. Status: COMPLETE 908 / PARTIAL 125 / UNKNOWN 77. PARTIAL + UNKNOWN are the 202 records without a stored Speed.

`RULES.md` contains source chains, structure counts, expected/actual card comparisons, every candidate formula and confidence limits. `report.json` contains all 1,110 raw inspections and the full 81-value regression table. `AUDIT.md` lists all 202 held identities with exact reasons for the later UNKNOWN pass.

## Executed checks

- New targeted speed suite: 9/9 PASS. Existing 81-value regression, all six manual card readings, three mounted holdouts, topology/flight/sync/engine/fractional guards, fresh CA extraction, field isolation, repository/audit materialization and deterministic replay.
- Full `npm test`: live 127/127 PASS; historical 622/623 initially PASS. The only failure was the unchanged Windows installer safety guard detecting a running Warhammer3 process. After the user closed the game, that exact test was rerun in the same isolated historical evidence view and passed 1/1. All 750 distinct tests were therefore validated; the original full command exited 1 due to the environmental guard, and the focused rerun exited 0.
- `npm run check` before build: PASS, including TypeScript, current admissions and 17 protected historical replays.
- `npm run build`: PASS, 120 modules transformed. A restricted-shell attempt first hit Windows EPERM on Vite realpath; the same build passed outside that restriction. Vite retains its bundle-size warning (5,145.82 kB JS, 464.01 kB gzip); no unrelated bundling change was introduced.
- `npm run check` after build: PASS, including TypeScript, current admissions and all 17 protected historical replays.
- `git diff --check`: PASS.

The existing historical view checks 559 protected baseline files. The new speed test also compares every preexisting `src/data` file against the actual preceding commit, and removes only the exact approved speed overlay when comparing the effective Unit records. HP 986, entity count 1,071, Korean Unit names 1,110, 23 complete race rosters, character canonical IDs/aliases, trait/passive admissions, English/Korean search, IME handling and personal records retain their existing tests and data.

## Independent evidence and UI

The fitting set is Swordsmen 30, Mounted Yeomen 92 and Field Trebuchets 20. The separate historical mounted holdouts are Knights of the Realm 84, Cold One Riders 66 and Grail Knights 84: expected = actual in all three. These are historical user-reported card readings, with version/date/modifiers unrecorded, not fresh measurements. The other 75 legacy identities are derived admissions, not independent UI observations.

Fresh bounded CA extraction: 40 exact artillery roots, 158 rows, same pack/schema snapshot as the existing catalog. All overlapping component fields match; 34 formerly missing engine chains are recovered. This corroborates source extraction, not UI interpretation.

Actual built Production UI verified through the in-app browser at localhost preview:

- Great Cannons / 대구경 대포: visible Speed **20**. Expanded source section shows `포병 엔진 run_speed 2 × 10 = 20`, empirical inference wording and the projection hash. Its existing HP remains unknown and its Ultra count remains 4.
- Pegasus Knights: visible Speed **미입력**; existing HP 6,264 and Ultra count 24 remain visible.
- Server-rendered UnitPage tests additionally verify preserved Swordsmen Speed 30/manual-card provenance and the same known/held routes.

The development-server browser attempt initially timed out/returned an empty page; no visual pass is claimed for it. Verification above used the successfully built static preview. No personal record or bookmark was edited.

## Changed files

- `src/data/unitSpeedRuleAdmissions.json`: checked speed-only production projection, with manual references and preserved/empirical provenance separated.
- `src/repositories/unitSpeed.ts`: apply/read/restore the exact overlay; drift fails closed.
- `src/repositories/gameRepository.ts`, `unitSharedIdentity.ts`: effective Production values and identity restoration.
- `src/components/UnitProductionDetails.tsx`: Speed provenance in the existing source section; the existing UnitPage Speed display is reused.
- `scripts/promote-unit-speed-rules.mjs`: deterministic review, projection and report/audit check/write.
- `scripts/test.mjs`, `check-data.mjs`, `audit-unit-data.mjs`: integrate replay and effective speed coverage.
- `tests/unit-speed-rules.test.cjs`: nine focused behavior/regression tests.
- `tests/unit-attributes.test.cjs`, `unit-passives.test.cjs`, `unit-localisation.test.cjs`, `unit-entities.test.cjs`: remove only the approved Speed overlay in their existing unrelated-field preservation checks.
- `tools/wh3-importer/speed-rules/manifest.json`, `ground-truth.json`, `schema-inventory.json`, `artillery.source.json`: pinned source/training evidence.
- `tools/wh3-importer/speed-rules/rules.mjs`, `report.mjs`, `report.json`, `RULES.md`, `AUDIT.md`, `VALIDATION.md`: structural policy, candidate comparisons, coverage and held-identity documentation.

Raw `units.json`, the previous 81 speed admissions, HP/count projections and all other preexisting data files are unchanged. No source key or unit name selects an exception rule. No push is performed.
