# Exact Research mapping review 01

Baseline `5d0e1ea6a0283c3cbd086c8f65f1d468b2729884`. The eight-occurrence inventory was recorded **before** policy changes. Eight distinct effect keys meet the existing exact own-force scope and selector-free explicit-main membership gates. This is mapping research and candidate remeasurement, not Research admission.

## Exact inventory and decisions

| Technology name / exact key | Exact effect | Raw | CA English Loc | Scope / sets | Final classification / mapping |
| --- | --- | ---: | --- | --- | --- |
| Steel Furnaces<br>`wh_dlc07_tech_brt_economy_industry_steel` | `wh2_dlc09_effect_force_stat_armour_brt_knights` | 8 | Armour: %+n for Knight units | `faction_to_force_own_unseen`<br>brt_knights | DIRECT_CANDIDATE<br>defense.armor / add |
| Almshouses<br>`wh_dlc07_tech_brt_economy_other_1` | `wh_dlc07_effect_force_stat_leadership_peasant_mob` | 5 | Leadership: %+n for Peasant Mob units | `faction_to_force_own_unseen`<br>wh_dlc07_peasant_mob | DIRECT_CANDIDATE<br>defense.leadership / add |
| Registered Draft<br>`wh_dlc07_tech_brt_economy_other_draft` | `wh_dlc07_peasant_upkeep_penalty` | -5 | Upkeep: %+n% for non-Knight units | `faction_to_force_own_unseen`<br>wh_dlc07_peasant_economy_unit_set | DIRECT_CANDIDATE<br>campaign.upkeep / multiply |
| Professional Fletchers<br>`wh_dlc07_tech_brt_economy_other_fletchers` | `wh2_main_effect_force_stat_missile_damage_brt_bowmen_yeomen` | 10 | Missile strength: %+n% for Peasant Bowmen and Mounted Yeomen Archers units | `faction_to_force_own_unseen`<br>brt_bow_cav, brt_bow_inf | REVIEW_REQUIRED<br>MISSILE_STRENGTH_RESEARCH_OUT_OF_SCOPE |
| Professional Fletchers<br>`wh_dlc07_tech_brt_economy_other_fletchers` | `wh2_main_effect_force_stat_range_brt_bowmen_yeomen` | 5 | Range: %+n% for Peasant Bowmen and Mounted Yeomen Archers units | `faction_to_force_own_unseen`<br>brt_bow_cav, brt_bow_inf | DIRECT_CANDIDATE<br>missile.range / multiply |
| Longer Spears<br>`wh_dlc07_tech_brt_economy_other_spears` | `wh2_main_effect_force_stat_weapon_strength_brt_spearmen_polemen_yeomen` | 10 | Weapon strength: %+n% for Spearmen-at-Arms, Men-at-Arms (Polearms) and Mounted Yeomen units | `faction_to_force_own_unseen`<br>brt_polearms, brt_spear_inf, brt_squires_yeomen | DIRECT_CANDIDATE<br>melee.damage.base / multiply; melee.damage.armorPiercing / multiply |
| Longer Spears<br>`wh_dlc07_tech_brt_economy_other_spears` | `wh2_main_effect_force_stat_melee_attack_brt_spearmen_polemen_yeomen` | 5 | Melee attack: %+n for Spearmen-at-Arms, Men-at-Arms (Polearms) and Mounted Yeomen units | `faction_to_force_own_unseen`<br>brt_polearms, brt_spear_inf, brt_squires_yeomen | DIRECT_CANDIDATE<br>melee.meleeAttack / add |
| Temple Tithes<br>`wh_dlc07_tech_brt_economy_other_tithes` | `wh2_main_effect_force_stat_ward_save_paladins` | 10 | Ward save: %+n% for Grail Knight and Grail Guardian units and embedded Paladin [[img:icon_hero]][[/img]]Heroes | `faction_to_force_own_unseen`<br>dlc07_brt_grail_knights_guardians, dlc07_brt_paladins | REVIEW_REQUIRED<br>WARD_PERCENTAGE_POINT_OPERATION_UNVERIFIED |

All eight initially had `REVIEW_REQUIRED / EFFECT_MAPPING_UNVERIFIED`. No replenishment effect was in this exact selection. Six new exact effect entries (seven bonus/path mappings) were approved; no other key is inherited by spelling or bonus family.

## Exact Production target identities

These are explicit schema-proved set members, not name/category matches. Non-Production members and their omissions stay in the review JSON and original full source.

| Unit set | Exact Production main → land |
| --- | --- |
| `brt_knights` | `wh_main_brt_cav_knights_of_the_realm` → `wh_main_brt_cav_knights_of_the_realm`<br>`wh_main_brt_cav_pegasus_knights` → `wh_main_brt_cav_pegasus_knights`<br>`wh_dlc07_brt_cav_royal_pegasus_knights_0` → `wh_dlc07_brt_cav_royal_pegasus_knights_0`<br>`wh_main_brt_cav_grail_knights` → `wh_main_brt_cav_grail_knights`<br>`wh_dlc07_brt_cav_questing_knights_0` → `wh_dlc07_brt_cav_questing_knights_0`<br>`wh_dlc07_brt_cav_knights_errant_0` → `wh_dlc07_brt_cav_knights_errant_0`<br>`wh_dlc07_brt_cav_grail_guardians_0` → `wh_dlc07_brt_cav_grail_guardians_0` |
| `wh_dlc07_peasant_mob` | `wh_dlc07_brt_peasant_mob_0` → `wh_dlc07_brt_inf_peasant_mob_0` |
| `wh_dlc07_peasant_economy_unit_set` | `wh_main_brt_cav_mounted_yeomen_0` → `wh_main_brt_cav_mounted_yeomen_0`<br>`wh_dlc07_brt_inf_foot_squires_0` → `wh_dlc07_brt_inf_foot_squires_0`<br>`wh_dlc07_brt_inf_peasant_bowmen_1` → `wh_dlc07_brt_inf_peasant_bowmen_1`<br>`wh_dlc07_brt_inf_men_at_arms_2` → `wh_dlc07_brt_inf_men_at_arms_2`<br>`wh_main_brt_inf_men_at_arms` → `wh_main_brt_inf_men_at_arms`<br>`wh_dlc07_brt_inf_spearmen_at_arms_1` → `wh_dlc07_brt_inf_spearmen_at_arms_1`<br>`wh_main_brt_cav_mounted_yeomen_1` → `wh_main_brt_cav_mounted_yeomen_1`<br>`wh_main_brt_art_field_trebuchet` → `wh_main_brt_art_field_trebuchet`<br>`wh_dlc07_brt_art_blessed_field_trebuchet_0` → `wh_dlc07_brt_art_blessed_field_trebuchet_0`<br>`wh_main_brt_inf_peasant_bowmen` → `wh_main_brt_inf_peasant_bowmen`<br>`wh_dlc07_brt_peasant_mob_0` → `wh_dlc07_brt_inf_peasant_mob_0`<br>`wh_main_brt_inf_spearmen_at_arms` → `wh_main_brt_inf_spearmen_at_arms`<br>`wh_dlc07_brt_inf_battle_pilgrims_0` → `wh_dlc07_brt_inf_battle_pilgrims_0`<br>`wh_dlc07_brt_inf_men_at_arms_1` → `wh_dlc07_brt_inf_men_at_arms_1`<br>`wh_dlc07_brt_inf_peasant_bowmen_2` → `wh_dlc07_brt_inf_peasant_bowmen_2` |
| `brt_bow_cav` | `wh_main_brt_cav_mounted_yeomen_1` → `wh_main_brt_cav_mounted_yeomen_1` |
| `brt_bow_inf` | `wh_main_brt_inf_peasant_bowmen` → `wh_main_brt_inf_peasant_bowmen`<br>`wh_dlc07_brt_inf_peasant_bowmen_1` → `wh_dlc07_brt_inf_peasant_bowmen_1`<br>`wh_dlc07_brt_inf_peasant_bowmen_2` → `wh_dlc07_brt_inf_peasant_bowmen_2` |
| `brt_polearms` | `wh_main_brt_inf_men_at_arms` → `wh_main_brt_inf_men_at_arms` |
| `brt_spear_inf` | `wh_dlc07_brt_inf_spearmen_at_arms_1` → `wh_dlc07_brt_inf_spearmen_at_arms_1`<br>`wh_main_brt_inf_spearmen_at_arms` → `wh_main_brt_inf_spearmen_at_arms` |
| `brt_squires_yeomen` | `wh_main_brt_cav_mounted_yeomen_0` → `wh_main_brt_cav_mounted_yeomen_0`<br>`wh_main_brt_cav_mounted_yeomen_1` → `wh_main_brt_cav_mounted_yeomen_1` |
| `dlc07_brt_grail_knights_guardians` | `wh_dlc07_brt_cav_grail_guardians_0` → `wh_dlc07_brt_cav_grail_guardians_0`<br>`wh_main_brt_cav_grail_knights` → `wh_main_brt_cav_grail_knights` |
| `dlc07_brt_paladins` |  |

## CA semantics and operation proof

- **wh2_dlc09_effect_force_stat_armour_brt_knights**: Exact CA Armour: %+n (no percent suffix), armour_mod unit-set bonus; existing numeric armor points path. Flat raw points.
- **wh_dlc07_effect_force_stat_leadership_peasant_mob**: Exact CA Leadership: %+n and morale bonus, identical operation/bonus semantics to the existing Knight leadership mapping; explicit Peasant Mob set reviewed separately.
- **wh_dlc07_peasant_upkeep_penalty**: Exact CA Upkeep: %+n% and upkeep_mod bonus. Unit campaign upkeep is a numeric cost; raw -5 is a signed -5% change under the existing multiply percentage contract, not an inverted penalty.
- **wh2_main_effect_force_stat_missile_damage_brt_bowmen_yeomen**: Card missile strength versus raw projectile/AP/explosion values is not an approved mapping. This task explicitly excludes missile-strength research.
- **wh2_main_effect_force_stat_range_brt_bowmen_yeomen**: Exact CA Range: %+n% and range_mod bonus. Existing numeric missile.range expresses range; percentage change is directly representable without card-strength decomposition or reload conversion.
- **wh2_main_effect_force_stat_weapon_strength_brt_spearmen_polemen_yeomen**: Exact CA Weapon strength: %+n% with separate base and AP melee bonus rows, same two bonus/operation meanings as the existing reviewed weapon-strength mapping; all three explicit target sets independently verified.
- **wh2_main_effect_force_stat_melee_attack_brt_spearmen_polemen_yeomen**: Exact CA Melee attack: %+n (no percent suffix) and melee_attack_mod bonus; same flat meaning as existing melee attack mapping, with this exact effect and three sets reviewed separately.
- **wh2_main_effect_force_stat_ward_save_paladins**: Unit ward is percentage points, but CA Ward save: %+n% and unit_damage_resistance_all_mod do not independently prove additive points versus a relative increase. The schema records references/types, not that operation; neither add nor multiply is approved.

The processed schema proves junction `value` is F32 and exact references to technology/effect/scope; the unit-set bonus schema proves exact effect and set references. It does **not** by itself describe engine arithmetic. The reviewed exact CA Loc (`%+n` versus `%+n%`), bonus composition, existing numeric Unit fields and existing Modifier contract together establish each approved interpretation. No magnitude/name heuristic, new numeric path, zero default, sign inversion or SET operation is used.

`multiply` consumes signed percentage change (the existing engine uses `base × (1 + value / 100)`), not a raw factor. Thus Registered Draft raw `-5` is a -5% upkeep candidate. Armour +8 is flat points. Weapon strength +10% has **both** exact melee base and AP bonus rows. Range +5% maps only to the already existing `missile.range`; missile-strength card decomposition/reload are not researched.

Ward save is held because a percentage-point field cannot safely inherit relative `multiply` merely from `%` in Loc, and the committed schema/bonus evidence does not prove `add` either. Missile strength is held under the explicit task restriction and unverified raw-field/card semantics. Both remain REVIEW_REQUIRED with no candidates; neither is added to rejectedEffects or the whitelist.

## Source and review provenance

`selected.json` records exact occurrence/junction, Loc, scope, sets, every membership and main/land trace. `source-trace.json` points losslessly into the existing committed full source with row payload hashes, schema definitions/indices and exact relationships; it does not duplicate full main/land payloads. `review.json` stores human decisions, raw semantics, path/operation/rule, Loc identity/hash, bonus row references, first verified technology, static snapshot and schema/pack provenance. Each added central whitelist entry has a `reviewRef`. The classifier consumes source plus whitelist, never this human classification oracle.

Snapshot: `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`. Original extraction SHA: `33fe9eeea3341c3d98af03a880b0decdf8692ab67d494d84f0dd79683c9f733b`. Committed full source SHA: `72dc47e15caa9df8a6a79ccdbe21bdf6b71d3afda9ea0a6da8e895ee881146a8`. No game/RPFM or generated raw extraction is needed for replay.

## Measured coverage

| Metric | BEFORE | AFTER |
| --- | ---: | ---: |
| Technologies / effect occurrences | 68 / 179 | 68 / 179 |
| DIRECT | 9 | 15 |
| REVIEW_REQUIRED | 157 | 151 |
| UNSUPPORTED / NON_UNIT_STAT / UNCLASSIFIABLE | 1 / 12 / 0 | 1 / 12 / 0 |
| Modifier candidates | 54 | 96 |
| Distinct Production targets | 12 | 22 |
| Technologies with DIRECT | 5 | 10 |
| Effect mapping unverified occurrences | 48 | 42 |
| Scope not verified occurrences | 105 | 105 |

| New exact mapping | Newly DIRECT effects | New candidates | New Units versus BEFORE |
| --- | ---: | ---: | ---: |
| `wh2_dlc09_effect_force_stat_armour_brt_knights` | 1 | 7 | 0 |
| `wh_dlc07_effect_force_stat_leadership_peasant_mob` | 1 | 1 | 0 |
| `wh_dlc07_peasant_upkeep_penalty` | 1 | 15 | 10 |
| `wh2_main_effect_force_stat_range_brt_bowmen_yeomen` | 1 | 4 | 4 |
| `wh2_main_effect_force_stat_weapon_strength_brt_spearmen_polemen_yeomen` | 1 | 10 | 5 |
| `wh2_main_effect_force_stat_melee_attack_brt_spearmen_polemen_yeomen` | 1 | 5 | 5 |

Total gain: **6 DIRECT effects, 42 candidates, 10 distinct new target Units**. Per-mapping new Unit counts overlap against the same BEFORE set and must not be summed. No actual duplicate or semantic-overlap group was introduced in this source; synthetic tests preserve different technology/effect overlaps and dedupe only identical candidate identities/payloads. Source conflicts never select a winner.

## Regression and replay

The six exact mappings and three associated path/operation whitelist entries are the only classifier policy extension. Existing nine effect entries, source pins, full own-force record, rejected effects, membership fields, selector restrictions and every classifier body byte are unchanged. The old batch-01 report reconstructs to its original byte hash by restoring only `whitelistSha256`: **8 technologies / 17 effects / 9 DIRECT / 4 REVIEW / 1 UNSUPPORTED / 3 NON_UNIT, 54 candidates**.

`before.json` is a pinned compact classification/candidate projection of the original full report (whose original SHA is retained). Replay inversely removes only the six reviewed mapping permissions and compares all 179 original effect states/reasons/values/identities and all 54 original candidates. `baseline-policy.json` preserves all original policy values; removing only the exact additions from the new policy must match it. Scan still pins current policy bytes and the original classifier body. `after.json` references the deterministic full AFTER report, without a second full copy. Manifest hashes pin inputs/outputs and 103 protected app/HP/Speed/runtime files.

```powershell
node scripts/review-research-mappings.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/scan-bretonnia-research.mjs
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

Optional review/scan `--write` writes only diagnostic review/candidate artifacts and digests. It cannot write app projections or Production. The regression suite covers each new effect key with similar-key, Loc/source, raw-value-unit, path, operation, scope, target membership and snapshot mutations; signed zero/negative/fraction values; and exact duplicate versus semantic-overlap handling.

App Research/Calculator/admission, Production 101/Sample 5, HP 13/88, Speed 81/20, diagnostic/shared/runtime/MEDIUM evidence and probe remain unchanged. No new source snapshot, generated evidence, runtime/game execution, extraction, scope/selector support or app admission was introduced.

Validation completed: mapping review, bounded classifier, full scan and original
slice/batch replays PASS; **449/449 tests**, build PASS. A fresh tracked/new-file
snapshot excludes `.git`, `generated` and importer `.local`; all four replays,
type/build checks PASS and **447 passed / 2 existing optional local checks
skipped**. Its only reused dependency is a node_modules junction; no game/RPFM
or private extraction/capture is accessed. The 50 focused classifier/scan/review
tests also pass. The existing Vite large-chunk warning remains unchanged.
