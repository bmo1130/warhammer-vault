# Reviewed Bretonnia Research admission 01

Baseline: `fa163c22b1ea85eb7ec01c48399075bde27aed26` (local main).
This batch admits existing classifier results. No mapping, scope, membership,
Unit, HP, Speed, runtime observation or source snapshot was changed.

## Decision and bounded coverage

| Stage | Result |
|---|---:|
| Input DIRECT effects | 15 |
| Input Modifier candidates | 96 |
| Admitted technologies | 10 |
| Admitted effects | 15 |
| Admitted candidates | 96 |
| Exact Production targets | 22 |
| UnitStatPaths | 10 |
| Add / multiply | 37 / 59 |
| Partial technologies | 5 |
| Rejected DIRECT candidates / collisions | 0 / 0 |
| Skipped non-DIRECT effects | 164 |
| Historical contexts / Modifier semantics preserved | 21 / 42 |

Skipped effects retain their existing status/reason: 151 REVIEW_REQUIRED,
1 UNSUPPORTED, 12 NON_UNIT_STAT. None enters the app Modifier list.
Non-Production and ambiguous membership target omissions stay in the unchanged
scan report, referenced by exact technology/effect/source row. The app stores an
omitted-target count rather than duplicating the raw membership traces.

Partial technologies are **Almshouses, Professional Fletchers, Registered Draft,
Steel Furnaces and Subsidised Tools**. Their omitted effect identity,
classification and reason are available in the Calculator detail. Blinker Hoods,
Encourage Fanaticism, Longer Spears, Master Swordsmiths and Regular Tournaments
have all their scanned effects admitted for the applicable Production targets;
this does not expand coverage to omitted non-Production targets.

## Source → reviewed admission → application

1. Replay committed `research-scan-bretonnia/source.json` through the unchanged
   classifier/policy. Check the exact committed report bytes and digest.
2. Compare `reviewed-input.json` to replayed DIRECT identities and full candidate
   digests. These digests include raw value, stat/op/value, rule IDs, exact
   membership, main/land joins, source rows and provenance. Technology/effect
   identities, approved own-force scope/mapping, include/exclude and schema/pack
   proofs are revalidated by the existing scan/source validators.
3. Verify the manifest's baseline, snapshot, classifier/policy, source, report,
   Production, reviewed-input and historical projection pins. Every target
   must exist exactly once in the same Production game version.
4. Normalize admitted technology metadata (10), effect occurrences (15), exact
   Unit identities (22) and generated Modifier records (96). Generated IDs
   include exact technology, effect, main identity and path. Ordering is exact
   byte comparison of display name/key for technologies and source identity for
   effects/targets/Modifiers; localisation never determines identity.
5. Verify all 96 technology/effect/main/land/path/op/value tuples against the
   source candidates. Exact duplicate input candidates dedupe deterministically;
   differing value, identity, source, membership or extra ID payload at the same
   technology/effect/main/path fails closed. No arbitrary conflict winner.
6. `src/data/caResearchEffect.json` is the sole app input. The existing adapter
   materializes applicable technology/Unit contexts once at module load. It
   returns existing `Modifier[]` to the existing engine, never raw scan data.

`admission.json` holds explicit decisions, source pointers, skipped effects and
historical provenance links. `summary.json` holds coverage and projection hash.
The manifest also identifies the replay command. No game, RPFM or ignored
generated file is required.

### Pinned chain

- Original ignored extraction SHA256:
  `33fe9eeea3341c3d98af03a880b0decdf8692ab67d494d84f0dd79683c9f733b`
- Committed source SHA256:
  `72dc47e15caa9df8a6a79ccdbe21bdf6b71d3afda9ea0a6da8e895ee881146a8`
- Classifier report SHA256:
  `97166548e93f0144c29ddc0b412f17719f450fbd90625b78d66ab6a1756d0aa3`
- App projection SHA256:
  `cbec05a6ab8a4b6b901fa8daa9343363092f691d485d0fb446648b695e6a74ff`
- Snapshot: `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`

Schema/pack/game provenance and original extraction identity are preserved in
the projection's shared provenance, backed by the original committed source.

### Historical research preservation

`legacy-projection.json` preserves the original application bytes/hash
`8faa8083057cd69360486563aff4c9c7633e2cf4d2df39e1e109adc3804d99b0`.
Original slice/batch replay still reproduces those exact 21 contexts. All 42
Modifier semantic tuples must have exactly one matching new Modifier; each
admission link retains historical context index, Modifier ID, source hash and
review hash. The existing IDs now acquire exact target/path components; old IDs
remain provenance links, never duplicate live modifiers.

Historical mapping/scope manifests and reports are unchanged. Their protected
file checks still use all original pins. Only the six authorized app/replay
integration files have explicit before/after hashes in this admission manifest;
every other protected file must retain its original hash. Tests and current
admission replay additionally prove the projection's deterministic source and
the complete legacy semantic subset. This is a bounded forward integration,
not a new historical artifact regeneration.

## Calculator behavior and numerical regression

One exact technology checkbox applies its admitted effects for the selected
Unit. The list is deterministically sorted by display name then exact key.
Partial technologies say “검증된 효과만 적용”; details show CA_RESEARCH, effect
identity, stat, operation/value, omissions, snapshot and source hash. Unrelated
Units have no checkbox for that technology.

- Grail Knights: Regular Tournaments + Blinker Hoods + Master Swordsmiths retain
  attack 43, defense 39, leadership 85, charge 82.5, base/AP 20.16/31.36.
  Manual attack +8 gives 51; deselecting Tournaments gives 46. Steel Furnaces
  raises armor 120 → 128; deselection restores 120.
- Peasant Mob: exact main `wh_dlc07_brt_peasant_mob_0` remains distinct from land
  `wh_dlc07_brt_inf_peasant_mob_0`. Registered Draft upkeep 25 → 23.75 (-5%).
  Subsidised Tools + manual attack +8 gives 18 → 36; deselecting restores the
  manual-only 26. Grail Knights receive neither Peasant-only effect.
- Peasant Bowmen: Professional Fletchers admits only range +5%, not its held
  missile damage/ammunition. Base 160 + manual flat 10 then +5% = 178.5;
  deselection restores 170. Unrelated cavalry get no range modifier.
- Battle Pilgrims alone receive Encourage Fanaticism; other infantry cannot
  inherit it. Longer Spears applies its three approved attack/base/AP modifiers
  together for each exact target. Existing total weapon damage helper sums the
  modified components.

SET → flat sum → percent sum is unchanged. No same-stat multi-technology overlap
exists in this 96-candidate batch; existing engine tests cover that contract.
Manual + Research same-stat effects use the existing additive-percent model.
Unknown stays unknown; actual zero and negative upkeep remain numeric.
Research selection is transient and never saved in Manual Profiles or backups.
IndexedDB/backup versions and the comparison calculator are unchanged.

## Replay and validation

```powershell
node scripts/admit-bretonnia-research.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/scan-bretonnia-research.mjs
node scripts/review-research-mappings.mjs
node scripts/review-research-scopes.mjs
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

`--write` on the admission command writes only its deterministic admission,
summary and app projection. The reviewed input/manifest are explicit reviewed
inputs, not silently refreshed. Historical batch `--write` preserves its
historical outputs and then regenerates the current admitted projection.

Local tests: **467/467 PASS**. Build PASS (existing large-chunk advisory remains).
Browser smoke PASS for Grail Knights, Peasant Mob and Peasant Bowmen: exact lists,
multiple selections, Manual stacking and deselection restoration. At 320px with
expanded source detail, body/document widths 305px, no horizontal page overflow;
Research labels fit and the 640px result table scrolls inside its 275px container.
No personal records were created, deleted or restored in the user's browser.

Clean snapshot: all six Research replays PASS, **465 PASS / 2 optional local-only
checks SKIP / 0 FAIL**, TypeScript and Vite build PASS. It contains no game/RPFM,
`.local`, `.git` or generated source inputs (only dependency junction reused).

Production 101 / Sample 5, HP 13, Speed 81, all other Unit values/order/bytes,
diagnostic/shared/runtime/MEDIUM evidence, classifier policy and full scan report
remain protected by their original hashes.

## Changed files

- `README.md`
- `scripts/admit-bretonnia-research.mjs`
- `scripts/review-bretonnia-research.mjs`
- `scripts/review-research-mappings.mjs`
- `scripts/review-research-scopes.mjs`
- `src/data/caResearchEffect.json`
- `src/domain/caResearchEffect.ts`
- `src/pages/CalculatorPage.tsx`
- `src/style.css`
- `tests/ca-research.test.cjs`
- `tests/ca-research-batch.test.cjs`
- `tests/wh3-research-admission.test.cjs`
- `tests/wh3-research-classifier.test.cjs`
- `tests/wh3-research-scan.test.cjs`
- `tests/wh3-research-mapping-review.test.cjs`
- `tests/wh3-research-scope-review.test.cjs`
- `tools/wh3-importer/research-admission-batch-01/admit.mjs`
- `tools/wh3-importer/research-admission-batch-01/protected.mjs`
- `tools/wh3-importer/research-admission-batch-01/manifest.json`
- `tools/wh3-importer/research-admission-batch-01/reviewed-input.json`
- `tools/wh3-importer/research-admission-batch-01/admission.json`
- `tools/wh3-importer/research-admission-batch-01/summary.json`
- `tools/wh3-importer/research-admission-batch-01/legacy-projection.json`
- `tools/wh3-importer/research-admission-batch-01/REVIEW.md`
