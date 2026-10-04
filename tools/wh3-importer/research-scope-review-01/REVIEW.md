# Bretonnia exact faction scope review 01

Baseline local `main`: `aef2d61bc59c507c0aad21ea01e4183538bba2c4`.
The initial tree was clean. Remote `main` was still the earlier full-scan
commit `5d0e1ea6a0283c3cbd086c8f65f1d468b2729884`; the newer local mapping
review was retained. No fetch/reset, push, game execution or new extraction.

**Conclusion C: no scope whitelist expansion is justified by this evidence.**
The actual scope-only selection is **empty**. The premise that approved
effect mappings currently occur under an unapproved faction target does not
hold in this committed scan. An empty inventory is a result, not a missing
source to replace with guessed or synthetic observations.

## Inventory first

| Selection gate / actual source | Occurrences |
| --- | ---: |
| Entire Bretonnia tree | 179 |
| Exact `faction_to_faction_own_unseen` | 79 |
| Of those: approved exact effect mapping | 0 |
| Of those: explicit, selector-free main/land chain | 1 |
| Of those: all requested gates, only scope unresolved | **0** |
| Approved mappings in the entire tree | 15 |
| Approved mappings outside existing own-force scope (including any other scope) | **0** |

`selected.json` is `[]`. There is no qualifying technology/effect/value/path/
Unit target to put in the selected inventory table. `inventory.json` instead
audits all 79 excluded faction-target occurrences: exact technology key/name,
effect key/Loc/raw value, source row ID, exact scope row ID, classifier reason,
mapping permission/result, target relation/set, Production main/land pairs and
exclusion reasons. Snapshot/source proof is shared through the source trace.
All 79 have `EFFECT_MAPPING_NOT_APPROVED`; 78 also have no explicit-main chain
and no exact Production target. These exclusion counts overlap. No category,
effect-name or bonus-name similarity confers an exact mapping permission.

The public classifier returns `SCOPE_NOT_VERIFIED_OWN_FORCE` for these 79
because its scope gate runs **before** its mapping gate. That first reason
does not mean mapping would otherwise pass. The independent inventory checks
the actual central exact-key whitelist rather than assuming a sole blocker.

## Exact source comparison

| Field | Observed unapproved scope | Existing approved scope |
| --- | --- | --- |
| key | `faction_to_faction_own_unseen` | `faction_to_force_own_unseen` |
| location | `factionwide` | `factionwide` |
| ownership | `yours` | `yours` |
| source | `faction` | `faction` |
| target | **`faction`** | **`force`** |
| territory | `any` | `any` |
| row ID | `campaign_effect_scopes_tables:1ca04f0f7c52adc87823` | `campaign_effect_scopes_tables:2e4f4fabacc3df6a871f` |

Both full records come from actual `db.pack`,
`db/campaign_effect_scopes_tables/data__`, table version **2**. The technology
junction's `effect_scope` StringU8 references
`campaign_effect_scopes.key`; exact relationships are committed. The scope
schema references `campaign_effect_scope_locations.key` for location,
`campaign_effect_scope_ownerships.key` for ownership,
`campaign_effect_scope_objects.key` for source/target and
`campaign_effect_scope_territories.key` for territory. These referenced
definition records/schemas and scope `localised_text` are **not materialized
in this committed source projection**. No unseen/display semantics or engine
enum behavior is inferred from the key suffix.

The bare exact key `faction` is not a scope record in this scan. All seven
observed scopes have `source=faction`, including the approved own-force and
excluded character/province/region scopes. Thus `source=faction` or a string
containing faction is not an additional permission. Inventory uses the actual
source/target fields to identify the one observed faction-target record.

Game **9.0.2.0**, RPFM **5.1.0**, schema format **5**. Static snapshot:
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
Committed full source SHA256:
`72dc47e15caa9df8a6a79ccdbe21bdf6b71d3afda9ea0a6da8e895ee881146a8`.
Original extraction SHA256:
`33fe9eeea3341c3d98af03a880b0decdf8692ab67d494d84f0dd79683c9f733b`.
Schema and both pack hashes are preserved in `scope-source-trace.json`.
The existing source/report/whitelist are referenced and hashed, not replaced.

## Positive controls and negative contrasts

There is **no positive faction-scope candidate** meeting the task conditions.
The following real existing controls demonstrate the already approved
own-force mapping/target gates; they do not validate faction propagation:

| Technology | Exact effect | Existing operation / raw | Target Units |
| --- | --- | --- | ---: |
| Regular Tournaments | `wh2_main_effect_force_stat_melee_attack_brt_knights` | add / 5 | 7 |
| Blinker Hoods | `wh2_main_effect_force_stat_charge_bonus_pct_brt_knights` | multiply / 10 | 7 |
| Registered Draft | `wh_dlc07_peasant_upkeep_penalty` | multiply / -5 | 15 |

All use exact `faction_to_force_own_unseen`. These cover combat flat, combat
percent and campaign numeric semantics without creating new mapping rules.

| Technology | Exact faction-target effect | CA Loc / relation evidence | Why not scope-only |
| --- | --- | --- | --- |
| Bretonnian Diplomacy (`tech_dlc14_brt_bretonnian_diplomacy`) | `wh_dlc05_faction_political_diplomacy_mod_technology_bretonnia` | Diplomatic relations with Bretonnia; subculture junction / `diplomatic_mod_tech` | Unapproved effect; foreign-subculture relation, no explicit Unit set |
| Code of Conduct (`tech_dlc14_brt_code_of_conduct`) | `wh_dlc07_effect_chivalry_dummy` | Chivalry +100; no matching bonus row in the inspected 57 tables | Unapproved mechanic, no explicit Unit chain; not proof of engine absence |
| The Southern Guard (`tech_dlc14_brt_chivalry_tomb_kings_2`) | `wh_dlc07_effect_increased_chivalry_tomb_kings` | Chivalry per victory against Tomb Kings; scripted junction / `value` | Unapproved scripted mechanic, no explicit Unit set |
| Improved Trade Vessels (`wh_dlc07_tech_brt_economy_trade_1`) | `wh_main_effect_economy_trade_tariff_mod` | Income from trade tariffs; basic bonus / `trade_income_mod` | Unapproved faction economy, no explicit Unit set |
| Rally the Peasants (`tech_dlc14_brt_rally_the_peasants`) | `wh2_main_effect_building_recruitment_cost_reduction_brt_resource_iron` | Recruitment cost -15%; exact `cost_mod` rows for `brt_sword_inf` and `wh_dlc07_peasant_mob` | **Explicit five Production main/land targets, but exact effect mapping is not approved** |

The last case is the closest excluded case, not a new mapping review. Its
explicit target resolver returns five targets with existing include/exclude/
schema/coverage gates. Peasant Mob retains main
`wh_dlc07_brt_peasant_mob_0` and land `wh_dlc07_brt_inf_peasant_mob_0`. Sharing
`cost_mod` or a recruitment-cost description with an approved effect does not
authorize this distinct exact key. No operation or admission is added for it.
Source/Loc IDs, bonus rows and exact target pairs are in `cases.json` and the
inventory. These contrasts do not change current classifier states to NON_UNIT.

## Answers to the seven semantic questions

1. **Whole own faction after research completion?** The record explicitly says
   factionwide/yours and source/target faction. That supports its recorded
   ownership/location only; installation after completion and persistence are
   not independently proved by this source.
2. **All exact eligible Unit members receive the stat?** Unproved: there are
   zero already-approved Unit mappings under this scope. Membership alone does
   not prove propagation from a faction-targeted effect to Units.
3. **Independent of a particular army/lord?** No army/lord selector is present
   in the record, and its target is faction. Runtime propagation/conditional
   routing is not established by the absence of such columns.
4. **Current Calculator model can represent it?** Not established for a
   qualifying faction-scope Unit effect; no actual admission is justified.
5. **Same Unit calculation as own-force?** Not established. Different exact
   target objects must not be equated or rewritten as the approved record.
6. **Separate provenance/rule if later approved?** Yes; the distinct scope
   identity and target must remain distinct. No new rule is added now.
7. **Same scope, different effect-relation semantics?** Observed: 44 typed
   relations, 28 with no inspected bonus relation, 6 basic bonus and 1 explicit
   Unit-set occurrence. The faction scope itself does not define a Unit stat.

Accordingly choose **C**, not A or B. Neither whole-scope nor
faction-plus-explicit-set permission is granted. The latter still lacks a
qualifying already-approved effect and independent Unit propagation proof.
Only the existing exact own-force rule remains allowed. Region, province,
character, the other force scope, unknown/similar keys, selectors, all-land and
conditional semantics remain blocked; all existing mapping/membership gates
stay mandatory. No new runtime or in-game measurement is requested: an empty
scope-only inventory is not a reason to execute the game or build a probe.

## Actual remeasurement

| Metric | BEFORE | AFTER |
| --- | ---: | ---: |
| Technologies / effect occurrences | 68 / 179 | 68 / 179 |
| DIRECT / REVIEW_REQUIRED | 15 / 151 | 15 / 151 |
| UNSUPPORTED / NON_UNIT_STAT / UNCLASSIFIABLE | 1 / 12 / 0 | 1 / 12 / 0 |
| Modifier candidates / target Units | 96 / 22 | 96 / 22 |
| DIRECT technologies | 10 | 10 |
| Scope / mapping rejection frequency | 105 / 42 | 105 / 42 |

Scope rules added: **none**. Actual gain: **0 DIRECT effects / 0 candidates /
0 new target Units / 0 new DIRECT technologies**. New-DIRECT effect and
technology-summary lists are empty, not estimated. Every existing scan output,
all 15 own-force effects/96 candidates, the 8/17/9/4/1/3 bounded batch contract,
mapping review 01 and all original admission/app bytes remain unchanged.
Full BEFORE and AFTER report hashes are identical:
`97166548e93f0144c29ddc0b412f17719f450fbd90625b78d66ab6a1756d0aa3`.

No next pattern is implemented. Retain the verified own-force rule; the 96
existing candidates can undergo separate human admission review. Any future
faction-scope work first needs an explicitly authorized exact mapping/case and
Unit propagation/persistence proof, not a blanket factionwide heuristic.

## Replay and regression

```powershell
node scripts/review-research-scopes.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/scan-bretonnia-research.mjs
node scripts/review-research-mappings.mjs
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

All evidence needed by replay is already committed. No game, RPFM, generated
capture or private staging is required. The optional scope-review `--write`
writes only these diagnostic review outputs/digests, never policy or app data.
Forty prior Research files are hash-protected by this manifest; the unchanged
mapping-review manifest additionally protects 103 app/HP/Speed/runtime files.

The nine new tests verify the empty scoped inventory, all 79 exclusions, exact
scope/source/schema comparison and limitations, actual controls and contrasts,
deterministic zero delta, scope substitutions, mapping/membership/selector/
exclude failures, pinned source/schema/snapshot drift, conflicting scopes
without majority selection, and existing Research/Production/evidence bytes.
Synthetic lower-layer substitutions are tests, never new observed evidence.

Validation complete: scope, classifier, full scan, mapping-review-01 and
original slice/batch replays PASS; **458/458 tests**, build PASS. A fresh
tracked/new-file snapshot with no `.git`, `generated` or importer `.local`
passes all five replays, type/build checks and **456 tests / 2 existing optional
local checks skipped**. Only node_modules is reused through a junction; no
private extraction/runtime capture, game or RPFM is accessed. The existing
Vite large-chunk warning is unchanged. All tracked changes are confined to
this new review, its replay script and its tests.
