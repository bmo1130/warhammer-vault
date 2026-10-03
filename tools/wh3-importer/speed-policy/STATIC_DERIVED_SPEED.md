# Explicit static Speed admission

Production Speed is now **81 / 101 populated**, with **20 / 101 blank**.
The initial 74 exact identities from commit
`d4964f47365e1ea11106af7f17e3c37b83fec648` retain all their values and admission
records unchanged. This extension adds only the seven mounted DIRECT candidates
already validated in `e4c9b5aa8a4aa5dc2b1271b87b0e110d991736c5`.
HP remains 13 populated (10 direct ULTRA runtime / 3 static-derived), with 88 absent.

| Validated profile | Count | Selected source |
| --- | ---: | --- |
| NONFLYING_SINGLE_MAN_RUN | 70 | exact nonflying man `battle_entities_tables.run_speed` |
| EXACT_MOUNTED_YEOMEN_CHAIN | 2 | exact validated mount endpoint |
| EXACT_FIELD_TREBUCHETS_CHAIN | 2 | exact validated engine endpoint |
| EXACT_KNIGHTS_OF_THE_REALM_CHAIN | 3 | exact validated mount endpoint |
| EXACT_COLD_ONE_RIDERS_CHAIN | 2 | exact validated mount endpoint |
| EXACT_GRAIL_KNIGHTS_CHAIN | 2 | exact validated mount endpoint |

Mounted Yeomen and Mounted Yeomen Archers each have Speed 92. Field Trebuchets
and Blessed Field Trebuchets each have Speed 20. The derivation is
`selected run_speed * 10`, with no rounding or inferred flight conversion.
No cavalry/artillery category grants admission. The remaining 20 AMBIGUOUS
identities stay blank: mounted 10, engine/vehicle 5, flying 3 and articulated 2.
No new research, measurement or remaining-unit reclassification is performed.

## Provenance and fail-closed checks

`manifest.json` preserves the initial 74 subjects and appends only the seven
approved identities, expected values and pre-Speed Unit hashes. Its mounted
follow-up pins the existing research report/manual evidence from the research
commit; static snapshot, schema/pack proof and source rows remain unchanged. `admission.mjs` reuses existing source materialization,
typed joins, profile signatures and existing manual validation anchors. The
mounted anchors total four: Mounted Yeomen, Knights of the Realm, Cold One Riders
and Grail Knights. The seven additions require exact validated profiles, not a
cavalry category or a generic mounted rule.
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

## The seven explicit additions

| Exact main key | Exact land key | Speed | Validated profile |
| --- | --- | ---: | --- |
| wh_main_brt_cav_grail_knights | wh_main_brt_cav_grail_knights | 84 | Grail Knights |
| wh_main_brt_cav_knights_of_the_realm | wh_main_brt_cav_knights_of_the_realm | 84 | Knights of the Realm |
| wh_dlc07_brt_cav_questing_knights_0 | wh_dlc07_brt_cav_questing_knights_0 | 84 | Knights of the Realm |
| wh_dlc07_brt_cav_knights_errant_0 | wh_dlc07_brt_cav_knights_errant_0 | 84 | Knights of the Realm |
| wh_dlc07_brt_cav_grail_guardians_0 | wh_dlc07_brt_cav_grail_guardians_0 | 84 | Grail Knights |
| wh2_main_lzd_cav_cold_ones_1 | wh2_main_lzd_cav_cold_ones_1 | 66 | Cold One Riders |
| wh2_main_lzd_cav_cold_one_spearmen_1 | wh2_main_lzd_cav_cold_one_spearriders_1 | 66 | Cold One Riders |

The separate Cold One Spear-Riders land identity is preserved. No additional
measurement was needed to admit these already validated candidates. All seven
use the same `admitSpeed` gates and `STATIC_DERIVED_SPEED` convention as the
initial 74; selected mount raw speeds are 8.4 or 6.6, multiplied by ten without
rounding. Manual anchors remain separately identified as MANUAL_CARD_VALIDATION.
Exact field provenance references the pinned mounted report's sourceTraces/mount.
Only admitted identities are materialized by the admission replay. It never
calls the remaining 20-unit classifier.

The historical mounted report is not rewritten. A bounded overlay projection
removes only these seven approved Speed values, takes the preserved first 74
admission records, and projects the manifest's initial 74 section. All three
must reproduce their original byte hashes from the follow-up pins. This keeps
the immutable research replay and original admission hash chain verifiable
without copying the older artifacts or creating a second admission system.

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

The eight Speed admission tests cover all 81 values, initial 74 admission byte
preservation, exact seven source/identity/provenance checks, untouched 20, HP13,
non-Speed values, ordering/Sample and fail-closed mutations. Production, Sample,
HP and diagnostic/runtime evidence are preserved except the seven Speed fields.

Full workspace tests pass 370/370 and `npm run build` passes. Speed, HP and the
six historical Production promotion replays pass 8/8. A clean source snapshot
without generated captures also passes all eight replays and tests: 368 pass,
two optional stored-capture tests skipped, zero failures.

Changed files are the existing manifest/admission/overlay, promotion script,
Production units and Speed sidecar, Speed admission and historical mounted tests,
the historical mounted replay input projection, this policy document and README.
