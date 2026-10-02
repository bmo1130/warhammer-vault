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

## Compact storage refactor validation

2026-10-02; baseline HEAD `7dd54664d57e60ba5cc47feb63b44e2f808f1a72`. The extraction/admission history above is preserved. This change adds no Unit and resolves no blocked identity. See [COMPACT_FORMAT.md](COMPACT_FORMAT.md) for the pre-implementation duplication inventory, representation and source hash chain.

- Sources: 3,099,986 bytes / 78,916 lines → 1,411,340 bytes / 18,602 lines. Review: 843,729 bytes / 22,077 lines → 115,284 bytes / 3,494 lines. Combined reduction **61.29% bytes / 78.12% lines**. Equal-whitespace comparison independently confirms **50.19% structural byte reduction**. Lossless row/metadata/edge references and shared omission/reason definitions replace duplication; source proof is retained.
- Exact old decoded source and regenerated verbose review hashes pass. Original extraction result byte SHA256 list, all 24 discoveries, 14 admissions, 10 blocked entries/reasons, raw unknown IDs and omission/withdrawal meanings match their baseline fingerprints.
- All 29 Production and five Sample records have exact value/order equality; `src/data/units.json` file bytes unchanged. Production value SHA256 `117cebac549c9ea985809079a57830d6c7990fff9350c93ace705eed0dabc78e`; Sample value SHA256 `892b95c759ff9a69d82fb8c5db2914e00701cc989d59d39c6e34a0cf2d56f856`. Diagnostic/shared identity/faction/historical pilot and review byte hashes unchanged. Catalog remains 29 / 5 / 5 / 0 / 34.
- `npm test`: **289/289**, no failures/skips (eight added compact tests). Checks canonical deterministic decode/re-encode/review, duplicate and missing row refs, conflicting same-ID payloads, changed row contents, schema corruption, reason/edge corruption, unused dictionary entries, extraction hash preservation and complete baseline equality. Existing admission/UI/catalog/backup boundary tests remain passing.
- `npm run build`: passed. All five production replay commands (first, partial, deferred, evidence-linked, expansion) and both partial/expansion review commands pass. Expansion admission adds zero. Original local staging projection check passes; verbose output recreation matches the old review exactly.
- Isolated clean source snapshot contains only tracked/current source files and a junction to installed dependencies; no `.local` config or `generated` evidence is present. All seven review/production replay commands pass there. `npm test` succeeds with **288 pass / one existing local-artifact-only diagnostic test skipped** (`unit-diagnostics.test.cjs`); the complete working checkout also verified that test in the 289/289 run. Clean `npm run build` passes; its first sandboxed attempt hit Windows junction write restrictions, then the same command passed with approved escalation. No evidence was copied in to satisfy replay/tests.
- Actual static integration **3/3**, no failures/skips: same live pack/schema snapshot, all 24 discoveries and all 14 row/provenance/normalization/unknown/omission results after compact decoding. Existing stored context **7/7** and stored runtime/CCO **9/9** pass; their code/artifacts are unchanged. No new runtime probe or game execution.
- Browser smoke on a new localhost `127.0.0.1:4175` tab: `/units` displays 34 entries; Foot Squires shows Production, melee 28/26, armor 70, cost 750/188 and unknown HP/speed; Black Coach shows Production + Evidence and retained expanded runtime/CCO statuses, logical entity count 1 and diagnostic-only HP 5980; Ratling Guns keeps static range 145, damage 2/6 and raw volley count 18; Zombies retains Sample/unfilled stats. No personal article/bookmark actions, deletion, backup actions, or existing temporary browser records were touched. The smoke tab was closed afterwards.
- Linear future source/review estimates: 100 candidates **6.36 MB**, 500 **31.80 MB**, 1,000 **63.61 MB**, uncompressed, before fixed code/docs and Git history. Including current admission/human-summary ratio: 6.60 / 32.99 / 65.97 MB.
- No Unit schema, UI, production/sample values, faction records, diagnostic architecture, ability mapping, runtime/precedence evidence or personal backup schema changed. Commit only; no push.
