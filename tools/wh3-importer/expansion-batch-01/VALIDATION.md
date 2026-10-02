# Expansion batch 01 validation

2026-10-02; baseline HEAD `d0648e4a0dc044b781c3c499cecd8fe6f6b4c86a`.

- Static extraction: 24 exact display localisation queries, 16 unique roots traced. 6 ambiguous roots remain unselected; 2 exact names have no root. The two Tomb Guard roots conflict between recognized Tomb Kings and Vampire Counts primary aliases. No guess, paid-recruitment heuristic or alias replacement.
- This independent batch: CLEAN 0 / PARTIAL 14 / BLOCKED 10; 14 explicit core admissions. Historical representative pilot remains CLEAN 1 / PARTIAL 14 / BLOCKED 9. All 24 roots/blockers and every admitted main/land/internal ID, field subset, omission and raw unknown ID are in [EXPANSION_BATCH_01.md](EXPANSION_BATCH_01.md) and `review.json`.
- Final catalog: Production 29 / Sample 5 / evidence 5 / diagnostic-only 0 / unique 34. No duplicate shared entries. Existing 15 Production and 5 Sample records retain exact values and order; canonical baseline SHA256 `75e7c3ea866b774c6d8856079e438f151a9183b55b84cb65ab411984d1fa949d`.
- Portable source value SHA256: `e10f3727bf00af27f69a0a623247275db62f4137137f1f416baf39fd7754b4e1`.
- Committed review value SHA256: `2a1f6203c07bba010ae3cbe862dbd01c0eb1597ac04333f7281a2e7fe47919b0`.
- Diagnostic bytes SHA256 unchanged: `1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f`.
- Shared identity bytes SHA256 unchanged: `3e256bf5c850df65e70a539062a5109a36c75757f8f3a34bc75d8b492aa9d13e`.
- Factions unchanged; no additions. Unit schema, UI, global/scoped ability or attribute mapping, shared identity policy and personal backup v1 unchanged. No game execution, runtime probe or CCO capture. Original static extraction remains ignored staging.

## Passed checks

- `npm test`: **281/281**, no skip/failure. Includes 9 new expansion tests: bounded key-free catalog, exact-name/root preservation, affiliation conflicts, review replay, unknown/full-group withdrawal, mounted/count/HP/speed/missile omission, preservation, gate rejection/idempotence, UI and personal backup v1.
- `npm run build`: passed.
- All five previous checks passed: `review-partial-units.mjs`, `promote-first-unit.mjs`, `promote-partial-units.mjs`, `promote-deferred-units.mjs`, `promote-evidence-linked-units.mjs`, each with `--check`.
- New `review-expansion-batch-01.mjs --check`, `promote-expansion-batch-01.mjs --check`, and local ignored staging `project-expansion-batch-01.mjs --check`: passed. Admission repeat added 0, retained exact records.
- Actual static pack integration: **3/3**, no skips. `WH3_RUN_INTEGRATION=1 node --test tools/wh3-importer/expansion-batch-01/static.integration.test.mjs`. Verified the 9.0.2.0 schema/two pack hashes, all 24 actual discovery results/permissions/structures, and all 14 live traces/normalizations against committed raw rows, provenance, unknown IDs and omissions. Local RPFM reader only.
- Stored context integration: **7/7**, no skips, using `WH3_CONTEXT_MATERIALIZATION_DIR=generated/wh3/refresh-9.0.2/context-materialization/2026-10-01T10-25-28.824Z` and `catalog-identity/materialize.integration.test.mjs`.
- Stored runtime/CCO regression: **9/9**, no skips, using `WH3_RUNTIME_BUNDLE_DIR=generated/wh3/runtime-evidence/evening-9.0.2` and `WH3_CCO_BUNDLE_DIR=generated/wh3/runtime-evidence/cco-p0-9.0.2` with their existing integration test files. Reads saved evidence and temporary test fixtures; no game/probe.

## Actual browser checks

New in-app browser tab, localhost test origin. The previously abandoned deletion-confirm tab was never manipulated. Existing deletion/confirm code and local personal data were not cleared or changed.

- `/units`: 34 entries; evidence filter 5; diagnostic-only 0. Foot Squires search returned one result and opened the exact production route. Shared entries remained single Production · Evidence entries.
- Infantry **Foot Squires**: Production; melee attack/defense 28/26, armor/leadership 70/70, recruitment/upkeep 750/188; HP/speed remain 미입력. Bretonnia link worked.
- Mounted **Questing Knights**: Production; 40/39 attack/defense, armor 90, 1100/275 cost; HP/speed unknown and no selected rider/mount entity in data.
- Monstrous infantry **Vargheists**: Production; 40/25 attack/defense, armor 10, 1000/250 cost; HP/speed unknown. Classification remains actual CA category, not inferred monster text.
- **Ratling Guns**: previous Production/static missile panel unchanged, including range 145, damage 2/6, raw shots-per-volley 18 and the remaining stored fields; no DPS/reload inference.
- Shared **Black Coach**: Production 29/25 attack/defense, armor 60; HP 미입력. Collapsed evidence summary and expanded details retain OBSERVED_RUNTIME, OBSERVED_ONCE, UNVERIFIED, INCONCLUSIVE, logical NumEntities 1 and diagnostic-only 5980 HP. Existing bookmarked `Shared identity 브라우저 검증용 임시 기록` is still visible on the same route.
- Sample **Zombies**: Sample badge and unfilled stats unchanged.
- Viewport **375 × 812**: screenshots inspected for catalog and all six representative detail routes; measured document content width 360 with 375 viewport (scrollbar), no horizontal overflow. Temporary viewport override reset afterwards.
- Foot Squires bookmark and `Expansion batch 01 브라우저 검증용 임시 기록` article saved and verified after reload. The original Black Coach test record/bookmark and this new Foot Squires test record/bookmark remain in browser test personal storage. No deletion was attempted; these are not repository artifacts. Actual personal backup v1 round trips are also covered by the automated unchanged-schema tests.

Commit only; no push requested for this batch.
