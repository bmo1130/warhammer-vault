# Five deferred production admissions

2026-10-02. Baseline `bd16d934f94375167ebdefa78ce91bd3c1ea850a`.
Only sample-01, sample-08, sample-09, sample-21, sample-16 are admitted.
All are already PROMOTABLE_WITH_OMISSIONS in the committed WH3 9.0.2.0
[field review](PARTIAL_REVIEW.md). No discovery, reclassification, mapping,
normalizer/schema change, game execution, probe or runtime capture was performed.

## Exact identities and approved groups

Main and land keys are identical in every row. Production ID is exactly
`ca_unit_<key>`. The sample-NN slugs are review subjects, not Sample app records.

| Review slug / Unit | Exact main and land key | Reviewed primary catalog | Additional approved groups | Withheld groups |
| --- | --- | --- | --- | --- |
| sample-01 / Grail Knights | `wh_main_brt_cav_grail_knights` | `wh_main_group_bretonnia` → bretonnia | abilities, passiveAbilities, complete attributes | entities, missile, composition |
| sample-08 / Mounted Yeomen | `wh_main_brt_cav_mounted_yeomen_0` | `wh_main_group_bretonnia` → bretonnia | canSkirmish=false | entities, missile, abilities, passiveAbilities, attributes, composition |
| sample-09 / Pegasus Knights | `wh_main_brt_cav_pegasus_knights` | `wh_main_group_bretonnia` → bretonnia | canSkirmish=false, canFly=true | entities, missile, abilities, passiveAbilities, attributes, composition |
| sample-21 / The Royal Altdorf Gryphites (Demigryph Knights) | `wh_dlc04_emp_cav_royal_altdorf_gryphites_0` | `wh_main_group_empire` → empire | canSkirmish=false | entities, missile, abilities, passiveAbilities, attributes, composition |
| sample-16 / Ratling Guns | `wh2_dlc12_skv_inf_ratling_gun_0` | `wh2_main_skv` → skaven | MAN entitySize=small/mass=150; canSkirmish=true; primary missile subset; complete forest attribute | abilities, passiveAbilities, unresolved entity/missile fields |

Every row admits exact identity/affiliation, classification, verified movement
flags, defense, melee, campaign and customBattle subsets. Grail canSkirmish=false
is also retained. No omitted field becomes zero or a placeholder. Mounted
entities stay `{}` because Unit requires that group; no rider, mount or engine
representative is chosen. Weapon splash is a reviewed weapon field, not entity
size/count or an inferred number of hits. RoR metadata causes no schema addition.

Grail keeps lance, blessing_of_the_lady, perfect_vigour, stalk_in_forest,
immune_to_psychology and knight membership. Its remaining unknown list is empty.
Incomplete optional groups remain absent in full; raw unknown IDs stay exactly
in partial-review.json:

- Mounted Yeomen: guerrilla_deploy, peasant, wh_dlc07_unit_passive_the_peasants_duty.
- Pegasus: guerrilla_deploy, wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade.
- Gryphites: glorious_charge. Known fear/terror/forest fragments remain withheld.
- Ratling: wh2_main_unit_passive_scurry_away, wh2_main_unit_passive_strength_in_numbers.

For all five: displayed count, unitScale, totalHealth, healthPerEntity, displayed
speed, charge speed, resistance conversion, recruitment requirements/caps and
unverified formulas stay absent. The four mounted composition NEEDS_RUNTIME
statuses remain review evidence and do not block core admission.

## Ratling primary missile subset

All values come from the existing reviewed direct static primary chain, not
runtime cadence. Stored paths and UI values:

| Unit path | Value |
| --- | --- |
| missile.range | 145 |
| missile.projectile.baseDamage | 2 |
| missile.projectile.armorPiercingDamage | 6 |
| missile.projectile.bonusVsLarge | 0 |
| missile.projectile.bonusVsInfantry | 0 |
| missile.projectile.shotsPerVolley | 18 |
| missile.accuracy.calibrationDistance | 70 |
| missile.accuracy.calibrationArea | 2.7 |
| missile.reload.baseTime | 5 |
| missile.projectile.penetration.resistanceBudget | 0 |

Ammunition, displayed/current reload time, reload formula/skill, DPS/burst/volley
DPS, firing cadence, penetration entity count and unsupported `very_small` size
cap are absent. `very_small` is never converted to `tiny`. Shots per volley is
not multiplied into damage. Resistance budget is not an entity count.

UnitProductionDetails adds one optional stats section using existing styles.
Only populated stored fields render; valid zeros stay visible. Labels preserve
raw/base reload and calibration/budget semantics. No calculator or conditional
weapon selector is added. Other production, Sample and diagnostic details keep
their existing UI and personal controls.

## Source pins and admission boundary

- Canonical partial-sources.json SHA256:
  `9f4dd0f3890d6d07804ff6e075e02c346178f316b0c5d388e0e82c4e935a2b65`.
- Canonical committed partial-review.json SHA256:
  `dfec6a1bb671e3031cfaaf61786c6b78179ef53d022cde2e0fe3a87c573b49d0`.
- Diagnostic file bytes SHA256:
  `1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f`.

Original saved pilot file SHA256 pins, already retained in the committed review:

| Slug | Original source SHA256 |
| --- | --- |
| sample-01 | `57873b9a53e7bfc608aecd52da062cb67f937ecea0f297a7ce12fead245ea3a2` |
| sample-08 | `f268c6be6c35cee41d666b78ab1c3ece6101e6f50ee40dfff9fa4b809fdab681` |
| sample-09 | `34250111f164503ef1250f53d37ba7fae4fd17c05e368b8a7991865ea6a8da2f` |
| sample-21 | `91ce7d542e6089c24d1fa9db340469f9289a7ffc0d87df9c78c202e1e056b551` |
| sample-16 | `d3bbcd833812879adc9fa99f6ddce6af23741eb120c4e287b5111ae479e3ae87` |

The new batch verifies both canonical pins and equality of stored review to
source replay, then reuses the existing exact identity, reviewed pack/schema,
primary catalog, provenance, omission, whole-group withdrawal, validator,
collision and no-overwrite gates. Unknown deletion or source/review drift fails;
there is no automatic refresh. Ratling alone receives an exact 10-path missile
allowlist requiring direct provenance. Original Dragon/four-PARTIAL gates still
reject missiles. No status wildcard or other PARTIAL/BLOCKED/diagnostic admission.

Bretonnia adds one minimal reviewed primary catalog record; no complete roster,
exclusive ownership, effective campaign recruitability, lore or statistics is
claimed. Empire, Skaven and all original factions stay unchanged. Original five
production and five Sample records retain their values, ordering and metadata.
Diagnostic/runtime/precedence, UNVERIFIED/INCONCLUSIVE and personal/backup v1
schemas/data remain unchanged. No new mapping or Unit/composition schema.

## Reproduction

```powershell
node scripts/review-partial-units.mjs --check
node scripts/promote-first-unit.mjs --check
node scripts/promote-partial-units.mjs --check
node scripts/promote-deferred-units.mjs --check
npm test
npm run build
```

The new command supports --write for the explicit five additions and checks all
gates before writing. Existing records are never overwritten; failures write
nothing. It needs only committed files, not a game or ignored generated sources.
The historical review artifacts stay byte-for-byte unchanged.

## Validation results

- Unit suite: **266/266**, zero failures/skips, including seven new bounded
  admission, source/provenance, omission, missile UI and personal backup tests.
- All four replay --check commands pass; deferred/old admission checks report
  zero additions after application (idempotent).
- Production build passes: 78 modules, JS 396.26 kB / gzip 109.69 kB.
- Stored context regression: **7/7**. Stored runtime/CCO regression: **9/9**.
- Background browser on a separate localhost origin: catalog shows all 20
  entries (10 Production / 5 Sample / 5 Diagnostic-only); Ratling missile fields,
  visible zeros, raw/base labels, omitted HP/speed and unchanged personal controls
  verified. Screenshot in ignored `.test-build/deferred-ratling.png`.
- Existing production/Sample/faction prefixes match fixed baseline hashes;
  diagnostic bytes and committed partial review/source remain unchanged.
- No new runtime is required for this batch. Optional composition and unmapped
  groups remain withheld, as before. No push.
