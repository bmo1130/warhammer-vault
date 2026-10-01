# PARTIAL field-group production review

WH3 9.0.2.0, 2026-10-02. Exact saved static source replay; no game, extraction or new probe.
PROMOTABLE = listed verified subset, **not every field in the group**. OMIT = withheld/unknown, not inability. NEEDS_MAPPING = raw IDs retained; the incomplete optional group is omitted in full. NEEDS_RUNTIME concerns an unresolved physical/activation question, never a prerequisite for verified core stats. BLOCKED 9 excluded.

Pinned source: `9f4dd0f3890d6d07804ff6e075e02c346178f316b0c5d388e0e82c4e935a2b65`. Diagnostic bytes: `1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f`.

| Unit | identity | affiliation/catalog | classification | entities | movement | defense | melee | missile | campaign | customBattle | abilities | passiveAbilities | attributes | composition/runtime structure | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grail Knights | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| Swordsmen | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | OMIT | PROMOTABLE | OMIT | PROMOTABLE_WITH_OMISSIONS |
| Spearmen (Shields) | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | OMIT | PROMOTABLE | OMIT | PROMOTABLE_WITH_OMISSIONS |
| Free Company Militia | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | NEEDS_RUNTIME | PROMOTABLE | PROMOTABLE | OMIT | OMIT | NEEDS_MAPPING | OMIT | PROMOTABLE_WITH_OMISSIONS |
| Mounted Yeomen | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| Pegasus Knights | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| Necrofex Colossus | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| Black Coach | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| Skeleton Chariots | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| Ratling Guns | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | PROMOTABLE | OMIT | PROMOTABLE_WITH_OMISSIONS |
| Doom-Flayers | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | PROMOTABLE | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| The Royal Altdorf Gryphites (Demigryph Knights) | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | OMIT | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |
| The Sternsmen (Grave Guard) | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE_WITH_OMISSIONS |
| Dread Saurian | PROMOTABLE | PROMOTABLE | PROMOTABLE | OMIT | PROMOTABLE | PROMOTABLE | PROMOTABLE | NEEDS_RUNTIME | PROMOTABLE | PROMOTABLE | OMIT | NEEDS_MAPPING | NEEDS_MAPPING | NEEDS_RUNTIME | PROMOTABLE_WITH_OMISSIONS |

No PARTIAL-wide veto exists in this review. All 14 have safe core subsets. Admission and optional enrichment are separate. Five exact diagnostic IDs require an explicit shared-page/catalog connection before actual production admission; no identity merging occurs in this batch.

<a id="sample-01"></a>
## Grail Knights
- Exact main / land: `wh_main_brt_cav_grail_knights` / `wh_main_brt_cav_grail_knights`; primary catalog `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-01.result.json); source SHA256 `57873b9a53e7bfc608aecd52da062cb67f937ecea0f297a7ce12fead245ea3a2`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: none. Scoped aliases reviewed: none.
- Remaining mapping enrichment: none. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 120, attack/defense 38/34, base/AP 18/28, recruitment/upkeep 1850/462.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-04"></a>
## Swordsmen
- Exact main / land: `wh_main_emp_inf_swordsmen` / `wh_main_emp_inf_swordsmen`; primary catalog `wh_main_group_empire` → `empire` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-04.result.json); source SHA256 `2e4c6b3145360da8b3cc0470ce1dce1bf5d0612b3a92d92b2c9fd6e287f7ee4d`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: none. Scoped aliases reviewed: none.
- Remaining mapping enrichment: none. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 30, attack/defense 32/32, base/AP 21/7, recruitment/upkeep 375/100.
- Entity/movement: No composite representative is selected. MAN-only size/mass may be retained as existing scoped per-entity fields; displayed counts/HP/speed remain unresolved.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-05"></a>
## Spearmen (Shields)
- Exact main / land: `wh_main_emp_inf_spearmen_1` / `wh_main_emp_inf_spearmen_1`; primary catalog `wh_main_group_empire` → `empire` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-05.result.json); source SHA256 `c029f22ce509ac465ab2da71bb81aa72a2486c8b09e2cceffd68454e9bb2b2c3`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `charge_defense_vs_large`, `charge_reflection`. Scoped aliases reviewed: `charge_defense_vs_large` → `charge_defense_vs_large` (Charge Defence vs. Large), `charge_reflection` → `charge_reflection` (Charge Reflection).
- Remaining mapping enrichment: none. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 30, attack/defense 20/42, base/AP 19/6, recruitment/upkeep 350/94.
- Entity/movement: No composite representative is selected. MAN-only size/mass may be retained as existing scoped per-entity fields; displayed counts/HP/speed remain unresolved.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-07"></a>
## Free Company Militia
- Exact main / land: `wh_dlc04_emp_inf_free_company_militia_0` / `wh_dlc04_emp_inf_free_company_militia_0`; primary catalog `wh_main_group_empire` → `empire` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-07.result.json); source SHA256 `cf17d2af56e298224ddfc61e53265142a35508c4a0a6513273703595782244a3`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: ca_unit_wh_dlc04_emp_inf_free_company_militia_0.
- Original unknown IDs: `guerrilla_deploy`, `mounted_fire_move`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `guerrilla_deploy`, `mounted_fire_move`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 25, attack/defense 28/25, base/AP 21/7, recruitment/upkeep 450/113.
- Entity/movement: No composite representative is selected. MAN-only size/mass may be retained as existing scoped per-entity fields; displayed counts/HP/speed remain unresolved.
- Existing scoped runtime: free-company-baseline: logical NumEntities 60, ManList 60 / MountList 0 / EngineList 0 / EntityList 60. Baseline logs identified by exact main/land and baseline projectile, matched to the human-declared no-override case. Modifier absence is a human setup declaration, not inferred runtime proof. free-company-blessed: logical NumEntities 53, ManList 53 / MountList 0 / EngineList 0 / EntityList 53. Human-declared Volkmar Mere Mortal Men!/Blessed Bullets only; Exploding Bullets not applied. free-company-exploding: logical NumEntities 48, ManList 48 / MountList 0 / EngineList 0 / EntityList 48. Human-declared Imperial Gunnery School Exploding Bullets only; Mere Mortal Men! not applied. free-company-both: logical NumEntities 60, ManList 60 / MountList 0 / EngineList 0 / EntityList 60. Human-declared both modifiers applicable in this campaign setup. Scope is Free Company Militia, WH3 9.0.2.0, this setup and these two modifiers only.
- Missile: Unit.missile omitted: override/attachment source activation remains INCONCLUSIVE. Existing scoped precedence cannot select a universal active profile. An explicit source-aware presentation is an alternative to further runtime; core admission does not need either. Storage: OMIT.
- Admission: EXACT_DIAGNOSTIC_CONNECTION_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-08"></a>
## Mounted Yeomen
- Exact main / land: `wh_main_brt_cav_mounted_yeomen_0` / `wh_main_brt_cav_mounted_yeomen_0`; primary catalog `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-08.result.json); source SHA256 `f268c6be6c35cee41d666b78ab1c3ece6101e6f50ee40dfff9fa4b809fdab681`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `guerrilla_deploy`, `peasant`, `wh_dlc07_unit_passive_the_peasants_duty`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `guerrilla_deploy`, `peasant`, `wh_dlc07_unit_passive_the_peasants_duty`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 30, attack/defense 26/26, base/AP 21/7, recruitment/upkeep 400/100.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-09"></a>
## Pegasus Knights
- Exact main / land: `wh_main_brt_cav_pegasus_knights` / `wh_main_brt_cav_pegasus_knights`; primary catalog `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-09.result.json); source SHA256 `34250111f164503ef1250f53d37ba7fae4fd17c05e368b8a7991865ea6a8da2f`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `guerrilla_deploy`, `wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `guerrilla_deploy`, `wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 80, attack/defense 36/32, base/AP 42/14, recruitment/upkeep 1100/275.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-12"></a>
## Necrofex Colossus
- Exact main / land: `wh2_dlc11_cst_mon_necrofex_colossus_0` / `wh2_dlc11_cst_mon_necrofex_colossus_0`; primary catalog `wh2_dlc11_group_vampire_coast` → `vampire_coast` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-12.result.json); source SHA256 `2fc74caa5a32a3beaf903443a61a32f42cab4f8169144092225ee7384f3621e6`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: ca_unit_wh2_dlc11_cst_mon_necrofex_colossus_0.
- Original unknown IDs: `mounted_fire_move`, `undead`, `wh2_dlc11_unit_passive_abandon_ship`, `wh2_dlc11_unit_passive_extra_powder`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `mounted_fire_move`, `undead`, `wh2_dlc11_unit_passive_abandon_ship`, `wh2_dlc11_unit_passive_extra_powder`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 75, attack/defense 42/34, base/AP 125/350, recruitment/upkeep 1800/450.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Existing scoped runtime: necrofex-colossus: logical NumEntities 1, ManList 5 / MountList 1 / EngineList 0 / EntityList 1. Human confirmed one body in MountList/EntityList context views. Some crew reload remaining times decrease between snapshots, supporting crew firing-cycle participation; list-index continuity remains UNVERIFIED. Primary/secondary ammo are below one but no decrease is observed across these three F9 snapshots.
- Missile: Listed fields are PROMOTABLE for the exact LAND_PRIMARY cannon static chain. Unit.missile storage is withheld because rider rifle candidates also exist; this is a primary-profile scope/presentation issue, independent of composite body identity. Runtime does not supply or generalize these numbers. Storage: OMIT.
- Admission: EXACT_DIAGNOSTIC_CONNECTION_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-14"></a>
## Black Coach
- Exact main / land: `wh_main_vmp_veh_black_coach` / `wh_main_vmp_veh_black_coach`; primary catalog `wh_main_group_vampire_counts` → `vampire_counts` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-14.result.json); source SHA256 `480782f497f9fb55ada0b39ffa983cfa50df9291e78ca38267acbd752b3d6ad5`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: ca_unit_wh_main_vmp_veh_black_coach.
- Original unknown IDs: `strider`, `undead`, `wh_main_unit_abilities_black_nimbus`, `wh_main_unit_abilities_black_scythes`, `wh_main_unit_abilities_unholy_vigour`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `strider`, `undead`, `wh_main_unit_abilities_black_nimbus`, `wh_main_unit_abilities_black_scythes`, `wh_main_unit_abilities_unholy_vigour`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 60, attack/defense 29/25, base/AP 80/200, recruitment/upkeep 1100/275.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Existing scoped runtime: black-coach: logical NumEntities 1, ManList 1 / MountList 2 / EngineList 1 / EntityList 1. Human visually identified rider, two horses, coach body (IsEngine=true), and a physical articulation connecting horse/coach (IsMan=false, IsEngine=false). Scope: this Black Coach capture only; no universal chariot rule.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: EXACT_DIAGNOSTIC_CONNECTION_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-15"></a>
## Skeleton Chariots
- Exact main / land: `wh2_dlc09_tmb_veh_skeleton_chariot_0` / `wh2_dlc09_tmb_veh_skeleton_chariot_0`; primary catalog `wh2_dlc09_tomb_kings` → `tomb_kings` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-15.result.json); source SHA256 `4effdbbaed9b3da4379cab517fe0fd9a5ba29f2dd67fa32a1fbc85cba1eb3e02`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: ca_unit_wh2_dlc09_tmb_veh_skeleton_chariot_0.
- Original unknown IDs: `undead`, `wh2_dlc09_faction_passive_realm_of_souls_tier_1`, `wh2_dlc09_faction_passive_realm_of_souls_tier_2`, `wh2_dlc09_faction_passive_realm_of_souls_tier_3`, `wh2_dlc09_unit_passive_unstable_mark_ii_sand`, `wh2_dlc09_unit_passive_unstable_sand`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `undead`, `wh2_dlc09_faction_passive_realm_of_souls_tier_1`, `wh2_dlc09_faction_passive_realm_of_souls_tier_2`, `wh2_dlc09_faction_passive_realm_of_souls_tier_3`, `wh2_dlc09_unit_passive_unstable_mark_ii_sand`, `wh2_dlc09_unit_passive_unstable_sand`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 80, attack/defense 22/24, base/AP 24/10, recruitment/upkeep 0/0.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Existing scoped runtime: skeleton-chariots: logical NumEntities 12, ManList 24 / MountList 24 / EngineList 12 / EntityList 12. Observed aggregate composition: body 1, articulation 1, skeleton 2, steed 2 per chariot ratio. No parent/grouping ID; individual parent mapping UNVERIFIED. Visible sword/whip crew sampled with the same skeleton key; separate identity not confirmed.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: EXACT_DIAGNOSTIC_CONNECTION_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-16"></a>
## Ratling Guns
- Exact main / land: `wh2_dlc12_skv_inf_ratling_gun_0` / `wh2_dlc12_skv_inf_ratling_gun_0`; primary catalog `wh2_main_skv` → `skaven` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-16.result.json); source SHA256 `d3bbcd833812879adc9fa99f6ddce6af23741eb120c4e287b5111ae479e3ae87`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `wh2_main_unit_passive_scurry_away`, `wh2_main_unit_passive_strength_in_numbers`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `wh2_main_unit_passive_scurry_away`, `wh2_main_unit_passive_strength_in_numbers`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 70, attack/defense 16/16, base/AP 20/6, recruitment/upkeep 800/200.
- Entity/movement: No composite representative is selected. MAN-only size/mass may be retained as existing scoped per-entity fields; displayed counts/HP/speed remain unresolved.
- Missile: Direct primary projectile values are eligible individually. shotsPerVolley is the raw stored field, never multiplied into damage/DPS/ammo. very_small penetration cap remains omitted, not converted to tiny. Storage: PROMOTABLE_SUBSET.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-17"></a>
## Doom-Flayers
- Exact main / land: `wh2_dlc12_skv_veh_doom_flayer_0` / `wh2_dlc12_skv_veh_doom_flayer_0`; primary catalog `wh2_main_skv` → `skaven` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-17.result.json); source SHA256 `a7d880bb91c7f6900c6b781cab349d98d3f22da1efed6a51e1555943feeae1f5`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `wh2_dlc12_unit_passive_the_best_defence`, `wh2_main_unit_passive_scurry_away`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `wh2_dlc12_unit_passive_the_best_defence`, `wh2_main_unit_passive_scurry_away`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 90, attack/defense 25/26, base/AP 15/45, recruitment/upkeep 1100/300.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-21"></a>
## The Royal Altdorf Gryphites (Demigryph Knights)
- Exact main / land: `wh_dlc04_emp_cav_royal_altdorf_gryphites_0` / `wh_dlc04_emp_cav_royal_altdorf_gryphites_0`; primary catalog `wh_main_group_empire` → `empire` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-21.result.json); source SHA256 `91ce7d542e6089c24d1fa9db340469f9289a7ffc0d87df9c78c202e1e056b551`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `glorious_charge`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `glorious_charge`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 125, attack/defense 43/45, base/AP 18/38, recruitment/upkeep 1850/463.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-22"></a>
## The Sternsmen (Grave Guard)
- Exact main / land: `wh_dlc04_vmp_inf_sternsmen_0` / `wh_dlc04_vmp_inf_sternsmen_0`; primary catalog `wh_main_group_vampire_counts` → `vampire_counts` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-22.result.json); source SHA256 `d09a02c146a8e4722dff08a2e78b179fafc3b2563ab40f0d29b188fbf4a4b056`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: none.
- Original unknown IDs: `charge_defense`, `undead`, `wh_main_unit_passive_regeneration`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Scoped aliases reviewed: `charge_defense` → `charge_defense` (Expert Charge Defence), `undead` → `undead` (Undead), `wh_main_unit_passive_regeneration` → `regeneration` (Regeneration), `wh_main_unit_passive_unstable` → `crumbling` (Crumbling), `wh_main_unit_passive_unstable_mark_ii` → `disintegrating` (Disintegrating).
- Remaining mapping enrichment: none. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 90, attack/defense 34/45, base/AP 28/12, recruitment/upkeep 1150/288.
- Entity/movement: No composite representative is selected. MAN-only size/mass may be retained as existing scoped per-entity fields; displayed counts/HP/speed remain unresolved.
- Missile: No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot. Storage: OMIT.
- Admission: REVIEWED_ALLOWLIST_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

<a id="sample-24"></a>
## Dread Saurian
- Exact main / land: `wh2_dlc13_lzd_mon_dread_saurian_1` / `wh2_dlc13_lzd_mon_dread_saurian_1`; primary catalog `wh2_main_lzd` → `lizardmen` (not exclusive ownership/effective recruitment).
- Evidence: [saved source](../../../generated/wh3/refresh-9.0.2/pilot/units/sample-24.result.json); source SHA256 `2f848887fff0f8caa6a3c9a53f33472c4ef9d6bf2af58429860c74e45ec45a75`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: ca_unit_wh2_dlc13_lzd_mon_dread_saurian_1.
- Original unknown IDs: `mounted_fire_move`, `wallbreaker`, `wh2_main_unit_passive_primal_instincts`, `wh3_dlc24_unit_passive_predatory_fighter`. Scoped aliases reviewed: none.
- Remaining mapping enrichment: `mounted_fire_move`, `wallbreaker`, `wh2_main_unit_passive_primal_instincts`, `wh3_dlc24_unit_passive_predatory_fighter`. Unknown optional groups are absent in productionProjection, never silently resolved.
- Core projection: armor 120, attack/defense 52/32, base/AP 220/530, recruitment/upkeep 3100/775.
- Entity/movement: Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.
- Existing scoped runtime: dread-saurian: logical NumEntities 1, ManList 12 / MountList 1 / EngineList 0 / EntityList 1. Human confirmed the MountList/EntityList body is the same physical body in two context views. Two rider record keys do not establish a special skink role. Twelve Man entries and twelve missile candidates do not establish pairing. entityIndexContinuity UNVERIFIED; simultaneousSources INCONCLUSIVE.
- Missile: Unit.missile omitted: override/attachment source activation remains INCONCLUSIVE. Existing scoped precedence cannot select a universal active profile. An explicit source-aware presentation is an alternative to further runtime; core admission does not need either. Storage: OMIT.
- Admission: EXACT_DIAGNOSTIC_CONNECTION_REQUIRED. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.

## Next actions and schema boundary

- Immediate safe core subsets: all 14, with explicit omission and allowlist review. Actual bounded batch: Swordsmen, Spearmen (Shields), The Sternsmen, Doom-Flayers.
- Additional mapping enriches optional groups for Mounted Yeomen, Pegasus Knights, Free Company, Necrofex, Black Coach, Skeleton Chariots, Ratling Guns, Doom-Flayers, Royal Altdorf Gryphites and Dread Saurian. It does not block core admission.
- Doom-Flayers needs **no runtime for core/melee/campaign**. MAN=8 / ENGINE=8 remain raw. Only physical crew/engine grouping or a representative entity would need new evidence; not attempted.
- Mounted/composite entity representation stays in diagnostics/review. No composition schema is required for any core projection.
- Necrofex cannon direct chain is eligible as a primary source profile; a source-scoped missile presentation must distinguish rider rifles before treating it as Unit-wide missile. FCM override and Dread attachment activation remain INCONCLUSIVE. Current Unit.missile is withheld for all three; no schema is added.
- Next small batch: Grail Knights and Mounted Yeomen core subsets; then Ratling Guns with reviewed primary missile subset. The five diagnostic identities need an explicit exact connection policy first.
- Grail Knights, Mounted Yeomen, Pegasus Knights, Royal Altdorf Gryphites and Ratling Guns are safe-core candidates deferred to keep this actual batch bounded, not rejected for PARTIAL or unmapped optional groups.
- Swordsmen has no unknown ID in the saved 9.0.2 pilot. Its unsupported weapon splash-size field stays omitted. Spearmen/Sternsmen use seven exact scoped labels; no source ID is guessed or globally mapped.

Reproduce: `node scripts/review-partial-units.mjs --check`. Regenerate the JSON/Markdown only: `--write`. Source stays pinned; runtime and production collections are never written by this review command.
