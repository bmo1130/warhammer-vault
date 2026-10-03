# Explicit static Speed admission

This batch promotes only the 74 exact `SPEED_DIRECT_STATIC` identities in the
unchanged Speed candidate report from commit
`d4964f47365e1ea11106af7f17e3c37b83fec648`. It does not classify new candidates.
Production has 74 populated Speed fields and 27 absent Speed fields. HP remains
13 populated (10 direct ULTRA runtime / 3 static-derived), with 88 absent.

| Validated profile | Count | Selected source |
| --- | ---: | --- |
| NONFLYING_SINGLE_MAN_RUN | 70 | exact nonflying man `battle_entities_tables.run_speed` |
| EXACT_MOUNTED_YEOMEN_CHAIN | 2 | exact validated mount endpoint |
| EXACT_FIELD_TREBUCHETS_CHAIN | 2 | exact validated engine endpoint |

Mounted Yeomen and Mounted Yeomen Archers each have Speed 92. Field Trebuchets
and Blessed Field Trebuchets each have Speed 20. The derivation is
`selected run_speed * 10`, with no rounding or inferred flight conversion.
No cavalry/artillery category grants admission. The original 27 AMBIGUOUS
identities remain absent, with no additional readings, research or reclassification.

## Provenance and fail-closed checks

`manifest.json` explicitly approves the previous exact 74 identities, expected
values and pre-Speed Unit hashes, and pins the candidate/manual evidence and
existing static inputs. `admission.mjs` reuses existing source materialization,
typed joins, profile signatures and the three existing manual validation anchors.
It checks identity, snapshot, exact selected component/field/joins, profile,
positive integer arithmetic, conflicts and unchanged non-Speed Unit values.
It does not invoke the research classifier or create another manual observation.

`src/data/unitSpeedAdmissions.json` is the deterministic admitted field sidecar,
with provenance kind `STATIC_DERIVED_SPEED`. Each entry preserves main/land keys,
selected component/entity, raw run speed, formula, snapshot identity, profile and
confidence. Exact field provenance references the already committed candidate
source trace instead of duplicating it. `validationAnchor.kind` remains
`MANUAL_CARD_VALIDATION`, linking the original user observation separately from
static evidence. This is a normal-card base Speed, not a terrain/buff calculation.

The overlay pins the manifest and admission sidecar hashes. It strips only exact
approved Speed values for historical replay and rejects arbitrary/conflicting
values. The pre-Speed full catalog hash is
`308f7dab9ae339d2629de18d350c07febe7af78bb7fdbc20f598f9a58b7a9511`.
This proves all non-Speed values, HP, order and Sample records reconstruct the
previous bytes. `production-overlay.cjs` composes the existing HP overlay and
this bounded Speed overlay for older promotion commands. HP policy, raw evidence
and admission sidecars stay unchanged; HP replay readers only use the verified
pre-Speed view where their historical hashes require it.

The shared-identity check strips only an explicitly admitted Speed with matching
identity, snapshot and value before comparing the original static record. It
does not permit an arbitrary movement field or change the diagnostic registry.
No Unit schema or UI layout changes are needed.

## Replay

```powershell
node scripts/promote-static-speed.mjs --check
node scripts/promote-ultra-hp.mjs --check
node --test tests/wh3-speed-admission.test.cjs
npm test
npm run build
```

Use `--write` on the Speed command only to reproduce the explicitly pinned
admissions. It never approves additional candidates. Clean checkout requires no
game, generated staging or runtime measurement.

## Validation and changed files

Full tests: 360/360 PASS. New admission tests: 5/5 PASS, including fail-closed
mutations. Build: PASS. A clean snapshot without generated captures replays
Speed, HP and six historical Production commands successfully (8/8); its full
tests pass 358 with two optional stored-capture tests skipped. The final source
guards also pass the five new tests and Speed replay in both checkouts.

All existing JSON/evidence artifacts other than the intentional Speed additions
to units.json remain byte-identical, including the manual candidate reports,
HP provenance, MEDIUM evidence and shared identity registry.

The replay import changes compose the two bounded overlays; HP tests and source
readers compare the original pre-Speed view. No HP decision rule changes.

- `README.md`
- `scripts/promote-deferred-units.mjs`
- `scripts/promote-evidence-linked-units.mjs`
- `scripts/promote-expansion-batch-01.mjs`
- `scripts/promote-first-unit.mjs`
- `scripts/promote-partial-units.mjs`
- `scripts/promote-production-growth.mjs`
- `scripts/promote-static-speed.mjs`
- `scripts/promote-ultra-hp.mjs`
- `src/data/unitSpeedAdmissions.json`
- `src/data/units.json`
- `src/repositories/unitSharedIdentity.ts`
- `tests/deferred-promotion.test.cjs`
- `tests/evidence-linked-promotion.test.cjs`
- `tests/expansion-compact.test.cjs`
- `tests/expansion-promotion.test.cjs`
- `tests/partial-promotion.test.cjs`
- `tests/production-growth.test.cjs`
- `tests/production-promotion.test.cjs`
- `tests/wh3-black-coach-hp.test.cjs`
- `tests/wh3-hp-followup.test.cjs`
- `tests/wh3-hp-policy.test.cjs`
- `tests/wh3-speed-admission.test.cjs`
- `tests/wh3-speed-card-validation.test.cjs`
- `tests/wh3-speed-research.test.cjs`
- `tests/wh3-static-hp.test.cjs`
- `tools/wh3-importer/hp-policy/static-derived.mjs`
- `tools/wh3-importer/hp-research/research.mjs`
- `tools/wh3-importer/production-overlay.cjs`
- `tools/wh3-importer/speed-policy/STATIC_DERIVED_SPEED.md`
- `tools/wh3-importer/speed-policy/admission.mjs`
- `tools/wh3-importer/speed-policy/manifest.json`
- `tools/wh3-importer/speed-policy/overlay.cjs`
- `tools/wh3-importer/speed-research/card-validation.mjs`
- `tools/wh3-importer/speed-research/research.mjs`
