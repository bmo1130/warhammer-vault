# Resistance slice validation

Baseline: `5f001a2` (completed Speed slice). CA WH3 `9.0.2.0`, snapshot `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

Five independent base resistance fields are now stored for all 1,110 Production Units: 0 → 1,110 each; UNKNOWN 1,110 → 0 each. Newly promoted 1,110 Units / 5,550 fields. Resistance-only status: COMPLETE 1,110 / PARTIAL 0 / UNKNOWN 0. All 4,952 zero fields are explicitly decoded CA zeros; none is inferred from a missing row or field. Nonzero resistance/weakness occurs on 502 Units: 500 have a positive resistance, and two have only negative fire. All-zero base records: 608.

| Kind | Explicit zero | Nonzero | Positive | Negative |
| --- | ---: | ---: | ---: | ---: |
| Physical | 911 | 199 | 199 | 0 |
| Missile | 907 | 203 | 203 | 0 |
| Spell | 984 | 126 | 126 | 0 |
| Fire | 1,041 | 69 | 54 | 15 |
| Ward | 1,109 | 1 | 1 | 0 |

Structures newly promoted: MAN_ONLY 773; MOUNTED 217; ENGINE 57; ARTICULATED 63. Source owner is the exact land row in each structure. Body/mount/vehicle HP or movement references are not aggregated into resistance. No Unit-name exceptions select the rule.

## Executed checks

- Focused new resistance suite: **12/12 PASS**. Covers all 5,550 raw values, explicit zero vs missing field, independent partial states, broken/ambiguous joins and identities, wrong schema/table, invalid I32 values, signed fire, no scaling/rounding/clamping/aggregation, independent reextraction, historical references, conditional effect exclusion, exact overlay inversion, source drift, UI and preserved data.
- Full `npm test`: **762/762 PASS**, current app **139/139**, isolated historical evidence **623/623**, command exit 0. The unchanged Windows installer backup/restore test passes with the game closed. It is not skipped or bypassed.
- Final schema inventory records observed processed versions (including main_units 7, land_units 54, battle_entities 39, mounts 10 and battlefield_engines 24), separately marking undisplayed discovery-only definitions. Its metadata correction leaves all 1,110 admissions and 5,550 numbers unchanged. Full `npm test` was rerun on the final evidence and again passed **762/762**.
- First `npm run check`: **PASS**, TypeScript, current admissions and all 17 protected historical replays.
- `npm run build`: **PASS**, 123 modules. JS 5,626.00 kB / gzip 490.47 kB. Vite retains the existing large-chunk warning; this task does not change bundling policy.
- Second `npm run check`: **PASS**, TypeScript, current admissions and all 17 protected historical replays; command exit 0.
- `git diff --check`: **PASS** before final staging.

Historical verification protects 559 prior evidence files. The new resistance tests compare every preexisting `src/data` file and the entire prior `resistance-research` folder against the Speed commit. Original units.json and previous admissions are not rewritten. Every effective Unit is compared against the previous localisation → attributes → passives → HP/count → Speed pipeline after removing only an exact resistance admission. Modified resistance values cannot be stripped through the shared identity guard.

Preserved effective coverage: HP 986, count 1,071, Speed 908, Korean Unit names 1,110, attributes 1,107, passive abilities 1,105 and 23 COMPLETE rosters. Existing Character canonical/alias routing, Korean/English search, IME handling, articles, bookmarks and recent-view compatibility retain their original checks and datasets.

## Independent evidence and confidence

Fresh bounded extraction: 84 rows, 15 exact main roots. Eleven Production roots independently reproduce **55/55 resistance values** with matching current pack/schema snapshot. Four additional character ground/mount roots are audit-only and do not modify Character data. Pack reextraction verifies extraction, not live-game card readings.

Existing user-provided wiki comparison: Bloodthirster Physical **20 expected / 20 raw / 20 Production**, Spell **35 / 35 / 35**. Observation date, game version and modifiers were not recorded. Raw percentage points matches both, while ×100, 100−raw and raw/100 fail both nonzero samples. CA's official historical Empire Spearmen example agrees with five zero base fields; its older publication is not a current-version UI measurement.

Current local_en UI definitions verify that legacy `magic` is labelled **Spell Resistance**, and `all` uses the ward-save icon with **Damage Resistance**. Schema verifies I32 percentage point semantics and default 0; actual stored zeros are still required to be present in decoded fields. Fire -25 remains signed in data and displays as weakness 25%. Actual game-card readings collected in this task: **0**. The promotion is explicit CA base-field provenance, not a measurement claim.

Passive phase effects such as Duck and Weave physical +10, Attuned to Magic ward +10 and Regeneration weakness -20, plus active Flesh to Stone physical +60, are retained as raw references and excluded from base values. Even a phase that activates at battle start is not silently folded into base resistance. Existing campaign magic-resistance effect/operation admission remains blocked. No dynamic effect or final damage engine is added.

## Actual built Production UI

The in-app browser read the final built preview on localhost:

- Spearmen: all five base fields visibly **0%**.
- Hexwraiths (Tomb Kings exact variant): physical **55%**, missile **0%**, spell **15%**, fire **0%**, ward **8%**. Source section shows the current CA field provenance and report SHA256 `b87d5686486d7f5e8b5dc0d44edc8972940631ab4f6c4eb0d79bd560c0daadcd`. Existing HP 7,440 / count 60 / Speed 94 remain visible.
- Yhetees: fire raw **-25** displays as **화염 취약성 25%**, other base fields 0%.
- Current Production has no unknown base resistance. Server-rendered Production missing-data and partial fixtures independently verify **미확인**, known **0%**, known **35%** and fire weakness; no unresolved record is manufactured in Production. Existing five Samples remain unadmitted.

Screenshot: `generated/wh3/resistance/ui-resistances.jpg` (local ignored artifact). Test/check/build logs and the effective audit are in the same ignored folder. The test-only browser tab and preview server were closed. No article or bookmark was edited.

## Changed files

- `src/data/unitResistanceAdmissions.json`: independent checked base-resistance projection; explicit CA percentage points, identity, version, snapshot, report hash and per-unit report pointer.
- `src/repositories/unitResistances.ts`: apply/read/exactly restore only this overlay; identity/value drift stays visible.
- `src/repositories/gameRepository.ts`, `unitSharedIdentity.ts`: Production integration and exact identity restoration.
- `src/components/UnitResistanceDetails.tsx`, `UnitProductionDetails.tsx`: five independent displays, confirmed zero, unknown and signed fire semantics, base-only explanation and provenance.
- `src/domain/unit.ts`, `unitValidation.ts`: reuse the optional resistance schema; document signed fire/zero/unknown and validate finite values without a combat cap.
- `scripts/promote-unit-resistances.mjs`: deterministic offline review/projection/docs replay.
- `scripts/test.mjs`, `check-data.mjs`, `audit-unit-data.mjs`: replay gate and independent per-type zero/nonzero/unknown coverage.
- `tests/unit-resistances.test.cjs`: 12 focused tests.
- `tests/unit-attributes.test.cjs`, `unit-passives.test.cjs`, `unit-localisation.test.cjs`, `unit-entities.test.cjs`, `unit-speed-rules.test.cjs`: remove only the exact new overlay in existing unrelated-field preservation assertions.
- `tools/wh3-importer/resistance-rules/manifest.json`, `ground-truth.json`, `schema-inventory.json`, `semantics.source.json`: frozen evidence, honest measurement/reference provenance and input pins.
- `tools/wh3-importer/resistance-rules/rules.mjs`, `report.mjs`, `report.json`, `RULES.md`, `AUDIT.md`, `VALIDATION.md`: policy, every raw fact/reference, comparisons, coverage, confidence limits and deferred audit.

Base Unit resistance holds: **0**. Live-game card-wide validation, effective passive/active/campaign resistance and separate Character mount data remain explicitly outside this slice; follow-up reasons are in AUDIT.md. Commit locally after final verification; no push.
