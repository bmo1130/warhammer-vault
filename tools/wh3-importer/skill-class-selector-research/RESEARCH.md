# Skill class selector membership research

Baseline: `1b932d7cf25559238843b09f53cc378f28bfa393`, initially clean. Final verdict
**B: some selector shapes can safely materialize static exact membership**.
Seven Skills, six selectors, 5,750 actual DB/Loc rows, 76 processed schemas and
199 closed extraction queries. Six Skills exercise caste/class selectors; Blessed
Water is the unchanged explicit-record admission control. New admissions: **0**.
No application, schema, Calculator, Modifier, persistence or existing evidence edit.

## 1–2. Selection and exact selectors

| Skill | Exact skill key | Exact selector(s) | Rank | Other blockers retained |
| --- | --- | --- | --- | --- |
| The People's Hero | `wh2_dlc14_skill_brt_repanse_the_peoples_hero` | `infantry_units` | 1 | replenishment; flat AP operation not previously reviewed |
| Lead from the Front | `wh2_dlc07_skill_brt_alberic_special_0` | `all_units` | 1 | character-self, ability, bodyguard health |
| Virtue of Empathy | `wh_main_skill_brt_lord_battle_virtue_of_empathy` | `all_units` | 1 | character-self aura, shared owner runtime availability |
| Basic Training | `wh_main_skill_brt_lord_battle_basic_training` | `all_units` | 1 | vigour; shared owner runtime availability |
| Irrepressible Spirit | `wh_dlc07_skill_brt_lord_campaign_irrepressible_spirit` | `lords` | 1 | replenishment, self/campaign effects, shared availability |
| Uncompromising | `wh_dlc07_brt_skill_innate_all_uncompromising` | `characters` | 1 | alternate scope, attribute, background/shared availability |
| Blessed Water | `wh_dlc07_skill_brt_fay_battle_blessed_water` | `dlc07_brt_inf_battle_pilgrims` | 1 | already admitted; no change |

`brt_sword_inf` is an additional explicit-record comparison set, not an eighth Skill.
Selection is frozen in [selection.json](selection.json). All owner node/set/subtype
keys and every rank/effect/raw/scope/route are in [report.json](report.json).

## 3–5. Source identity and membership joins

The initial blocker label “class selector” obscured two distinct source mechanisms:
`infantry_units` is a **unit set**, not a `unit_class.key`. Its branches select
**main-unit caste**, not land class. `all_units` is a unit set selecting land classes.

Exact chain:

1. `character_skills_tables.key` ←
   `character_skill_level_to_effects_junctions_tables.character_skill_key`.
   The level row retains `level`, `value`, `effect_key`, `effect_scope`.
2. `effect_key → effects_tables.effect`; `effect_scope → campaign_effect_scopes_tables.key`.
3. `effect_bonus_value_ids_unit_sets_tables.effect → effects_tables.effect`;
   `.unit_set → unit_sets_tables.key`.
4. `unit_set_to_unit_junctions_tables.unit_set → unit_sets_tables.key`.
   Every selected branch has `exclude=false` and precisely one nonempty selector.
5. Explicit branch: `.unit_record → main_units_tables.unit`.
   Caste branch: `.unit_caste → unit_castes_tables.caste ← main_units_tables.caste`.
   Class branch: `.unit_class → unit_class_tables.key ← land_units_tables.class`;
   then inverse `main_units_tables.land_unit → land_units_tables.key`.
6. Every resolved main joins `.land_unit → land_units_tables.key`. A main key is
   never replaced by its land key, another main sharing that land, or a display name.
7. Production intersection is the exact existing ID `ca_unit_${mainKey}` at
   `9.0.2.0`; the complete registry is immutable and hash-pinned. No faction filter,
   name/category heuristic, base/RoR substitution or invented ID is used.

Relevant processed schema versions: unit sets 2; set junction 1; unit class 5;
unit castes 2; main units 7; land units 54. Each join records source row IDs, source
field, target row ID and target field; schema references and relationship edges
must agree. Reverse-query coverage includes empty results and all matching files.
The large class/caste closure is partitioned by actual primary keys, with complete
parent-query coverage; no result limit silently truncates membership.

Owner chain is separate: skill ← node → node-set item → node set → exact
agent subtype / agent → associated main → land. People's Hero has the sole subtype
`wh2_dlc14_brt_repanse`; the enabled node/set keys and exact owner proof are in report.
Static ownership does not establish runtime availability.

### Answers to the eight core questions

1. `unit_class.key`, `unit_castes.caste` and `unit_sets.key` are distinct exact DB entities.
2. Unit-set branch membership is explicit in the junction table. There is no
   separate many-to-many land-class membership table in the discovered reference
   inventory: `land_units.class` is the direct scalar membership reference.
3. Caste and explicit records select main identity; class selects land identity
   and requires the inverse main join. The source definitions never select Production.
4. Each land row has one class; each main row has one caste. A main can belong to
   many sets and match multiple branches of a set. This is not multiple land classes.
5. These selected definitions/branches have no faction/culture criterion. The
   same selector used by a Bretonnian Skill includes other factions' exact units.
   Own-force applicability still restricts context separately.
6. RoR, restricted campaign roots, ability-spawn roots and character roots are
   included only if their own source identity satisfies a selected predicate.
   Their labels are not inclusion rules. Runtime acquisition/spawn filtering is
   not established by this static membership result.
7. Membership is not complete effect applicability: scope, owner, rank, numeric
   operation, availability and battle/campaign context remain separate requirements.
8. These simple positive branches enumerate deterministically without localisation
   or UI category inference. General combined/exclusion/dynamic semantics remain unknown.

### Revised taxonomy

| Shape | Source mechanism | This research |
| --- | --- | --- |
| `EXPLICIT_UNIT_SET` | positive exact main records | supported static membership; two controls |
| `LAND_UNIT_CLASS` | positive class reference → land → inverse main | supported, `all_units` |
| `MAIN_UNIT_CASTE` | positive caste reference → main | supported, `lords`, `characters` |
| `MIXED_STATIC_UNION` | union of single-field positive branches | supported, `infantry_units` |
| `LAND_UNIT_CATEGORY` | category-only predicate | unsampled; fails closed |
| `EXPLICIT_UNIT_CLASS` / `MAIN_UNIT_CLASS` | independent membership table / main class | no such mechanism established here |
| `FACTION_SCOPED_CLASS` | faction/culture criterion | not observed in selected definitions |
| `DYNAMIC/CONDITIONAL_SELECTOR` | experience range / special category | unsupported |
| `INDIRECT_SELECTOR` / `AMBIGUOUS` | additional indirection / combined or empty selectors | unsupported |

Exclusion branches also fail closed; subtraction/precedence is not generalized.
Static union is restricted to the observed unconditioned, positive, single-field
branch structure. This taxonomy describes membership, not an application resolver.

## 6–8. Exact materialization, omissions and RoR

[membership.json](membership.json) separates derived lists from raw source.
Each selector has every exact main/land member, branch row IDs, main/land joins,
Production members, non-Production omissions, aliases and collisions. No arbitrary
sample is used as the complete membership. The final section lists all 66 primary
Production identities; all remaining exact IDs are in the membership artifact.

| Selector | Branches | Exact main | Main-backed land | Production | Non-Production main | RoR main (`is_renown`) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `infantry_units` | 7 | 695 | 648 | 66 | 629 | 134 |
| `all_units` | 18 | 2802 | 2675 | 101 | 2701 | 271 |
| `lords` | 1 | 839 | 832 | 0 | 839 | 1 |
| `characters` | 2 | 1406 | 1399 | 0 | 1406 | 1 |
| `dlc07_brt_inf_battle_pilgrims` | 3 | 3 | 3 | 1 | 2 | 1 |
| `brt_sword_inf` | 6 | 6 | 6 | 4 | 2 | 2 |

`all_units` additionally has four exact land records with **no main identity**, and
one naval record `wh_main_shp_transport` through `naval_units.class=shp_trn`. They
are separately listed as `NO_MAIN_IDENTITY` / `NAVAL_NOT_LAND_PRODUCTION`, without
substitution. Its full land predicate domain is 2679 records, including the four
unjoined records. Ambiguous main/land/Production joins: **0** in these projections.

Infantry caste branches: `melee_infantry` (365), `missile_infantry` (182),
`monstrous_infantry` (148). Four additional explicit records:
`wh_dlc04_emp_inf_flagellants_0`, `wh_dlc04_emp_inf_free_company_militia_0`,
`wh_dlc04_emp_inf_stirlands_revenge_0`, `wh_dlc04_emp_inf_tattersouls_0`.
Each already matches a caste branch: four branch collisions, **695 unique mains**.
These are legitimate overlap, not duplicate source rows. Duplicate source rows and
conflicting primary identities fail validation.

Infantry has 53 main/land aliases; `all_units` has 176. Shared land does not collapse
distinct main identities. Example `wh2_dlc13_emp_inf_greatswords_imperial_supply →
wh_main_emp_inf_greatswords` remains its own main root and is not substituted into
Production. Its campaign availability is outside this result.

RoR uses the source `main_units.is_renown` flag and each exact membership proof.
Battle Pilgrims RoR is independently included but omitted from Production; the
Production infantry intersection contains the independently sourced Sternsmen
`wh_dlc04_vmp_inf_sternsmen_0`. No base-name inheritance is used.

## 9–11. Repetition, runtime and explicit comparison

Three additional class-selector Skills repeat the **same** `all_units` structure,
with 18 actual class references. `lords` and `characters` add different caste
selectors. Infantry is reused by **19 typed bonus routes / 17 distinct effects**,
including both People's Hero effects; complete reverse coverage, exact effect and
selector joins are retained. Same predicate, different effect is not a new membership.

There is no additional membership filter in the traced selector definitions/rows.
No game execution: **NOT_OBSERVED**. Static DB membership needs no runtime test here.
This does not establish the absence of every possible engine condition outside the
traced rows, nor actual application to temporary units. The runtime field never
claims engine filtering or summon applicability was observed.

Ability-spawn examples use actual `unit_special_abilities.spawned_unit → land.key`
joins, not `_summoned` names: Crypt Horrors and Zombies satisfy infantry caste;
the exact Bloodthirster spawn does not. All three are outside Production, retain
their exact main/land roots, and have runtime applicability `NOT_OBSERVED`.
Hero/lord inclusion is similarly by exact caste (`characters`) or class (`all_units`).
No runtime execution or temporary-unit exception is inferred.

Blessed Water's explicit set is a strict subset of infantry. Both mechanisms reach
the same three exact main/land pairs: Battle Pilgrims, Grail Reliquae, Battle
Pilgrims RoR. They do **not** denote the same entire set. `brt_sword_inf` also has
fully enumerated explicit members available for identity comparison.

Class/caste selectors are source applicability primitives with referential
membership, not UI labels. Eligible future admissions can use these static
allowlists in the existing `Skill → exact Unit[]` shape. Calculator should receive
only exact admitted IDs; it gains no caste/class interpreter.

## 12–15. People's Hero and remaining blockers

Owner `wh2_dlc14_brt_repanse`; source rank 1; all three effects have exact scope
`general_to_force_own`: character → force, `forcewide_when_commanding`, ownership
`yours`, territory `any`.

| Exact effect | Raw | Typed route / selector | Operation assessment |
| --- | ---: | --- | --- |
| `wh2_dlc14_effect_force_army_battle_all_infantry_attack` | 5 | `melee_attack_mod` / `infantry_units` | existing reviewed add → `melee.meleeAttack` |
| `wh2_dlc14_effect_armour_piercing_damage_infantry` | 3 | `melee_damage_ap_mod_add` / `infantry_units` | add candidate → `melee.damage.armorPiercing`; prior flat AP proof absent, UNKNOWN retained |
| `wh_main_effect_force_all_campaign_replenishment_rate` | 5 | basic bonus `replenishment_percentage_bonus`; no unit-set route | no existing UnitStatPath; unsupported |

The class-selector blocker is **resolved for static membership**. The whole Skill
remains unadmitted because replenishment is unsupported; the add-named AP bonus
and numeric Loc are recorded without extending the reviewed operation policy.
There is no partial-effect admission. Even a later AP operation proof would not
remove the replenishment blocker. Three existing admissions remain unchanged.

UNKNOWN/not supported retained: multi-rank semantics, shared-owner runtime
availability/unlock, character-self, vigour, replenishment, resistance operation,
mount unlock, other non-unit stats, general combined/exclusion/conditional selector
rules, and engine applicability beyond static source evidence. Model/schema: **unchanged**.

Negative source cases: Knights of the Realm (same faction, outside infantry), Rogue
Idol (`land.class=inf_mel`, `main.caste=monster`, outside infantry), Grail Reliquae
(`land.class=spcl`, `main.caste=melee_infantry`, inside), Empire Swordsmen (other
faction, inside), exact RoR/non-Production roots, ability-spawn roots, main/land
aliases, overlapping branches. Names and UI categories select none of them.
Tests additionally reject source duplicates, primary-key collisions, missing
inverse coverage/reference edges, wrong class reference schema, alias mismatch,
owner/rank/value/scope/selector drift, combined fields, exclusions, category-only
predicates, range filters and Production substitution.

## 16–17. Validation and preservation

PASS: class-selector replay and actual extraction hash/projection equality; owner
research; rank research; Skill batch 01/02 and initial Skill slice; all six Research
admission/classifier/scan/mapping/scope/historical replays. **12 replays** total.
`npm test`: **517 passed, 0 failed, 0 skipped**. `npm run build`: PASS, existing
large-chunk warning. After the final selector guard/reuse-proof edit, all **11
affected research tests** and extraction/research replay passed again.

No model/admission edit, so the conditional browser/320px smoke is **NOT_RUN / not
required by this task's change condition**. The existing full-suite Calculator,
Research + Skill + Manual, wrong owner/rank/Unit, comparison, IndexedDB, backup and
runtime diagnostic regressions passed. No UI or personal-data operation occurred.

465 preexisting tracked files are hash-pinned (line-ending normalization only for
text source as in prior research); prior artifacts are never rewritten. Production
101 / Sample 5 / HP 13 / Speed 81; Research 10 technologies / 15 effects / 96
candidates; all three Skill projections; batch 01/02; owner/rank research;
Modifier, comparison, IndexedDB/backup and runtime evidence are preserved.

## 18–20. Files and commit policy

New research directory: `RESEARCH.md`, `selection.json`, `source.json`, `report.json`,
`membership.json`, `manifest.json`, `research.mjs`. New extraction and replay
scripts under `scripts/`; new `tests/ca-skill-class-selector-research.test.cjs`.
Ten new files, no edits to existing tracked files. Source extraction is local CA
9.0.2.0 / RPFM 5.1.0 / schema format 5, pinned to the same prior snapshot
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
Exact input/output hashes are in [manifest.json](manifest.json); source and derived
membership remain separate artifacts. No game executable was run.

```powershell
# Optional actual RPFM/CA-pack extraction; only ignored output
node scripts/extract-skill-class-selector-research.mjs
# Deterministic committed-evidence replay; no game, RPFM, network or generated needed
node scripts/review-skill-class-selector-research.mjs
# Optional original extraction check
node scripts/review-skill-class-selector-research.mjs --check-raw
node scripts/review-skill-owner-research.mjs
node scripts/review-skill-rank-research.mjs
node scripts/review-skill-batch-01.mjs
node scripts/review-skill-batch-02.mjs
node scripts/review-skill-slice-01.mjs
node scripts/admit-bretonnia-research.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/scan-bretonnia-research.mjs
node scripts/review-research-mappings.mjs
node scripts/review-research-scopes.mjs
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

The replay verifies immutable manifest pins before comparing reports. `--write`
can restore only already-pinned derived outputs; it never refreshes source or
manifest pins. Original raw extraction and diagnostic logs are ignored. Final
commit SHA and post-commit clean status are reported in chat; this artifact cannot
contain its own commit hash. Commit locally; **do not push**.

## Complete People's Hero Production intersection

All 66 exact main/land identities below have Production ID `ca_unit_${mainKey}`.
The prefix is the existing registry identity contract, not a replacement target.
Eleven are Bretonnian; the entire source selector is faction-independent. This
list is membership only and does not admit People's Hero or claim global scope.

| Exact main key | Exact land key |
| --- | --- |
| `wh2_dlc09_tmb_inf_nehekhara_warriors_0` | `wh2_dlc09_tmb_inf_nehekhara_warriors_0` |
| `wh2_dlc09_tmb_inf_skeleton_archers_0` | `wh2_dlc09_tmb_inf_skeleton_archers_0` |
| `wh2_dlc09_tmb_mon_ushabti_1` | `wh2_dlc09_tmb_mon_ushabti_1` |
| `wh2_dlc11_cst_inf_deck_gunners_0` | `wh2_dlc11_cst_inf_deck_gunners_0` |
| `wh2_dlc11_cst_inf_depth_guard_0` | `wh2_dlc11_cst_inf_depth_guard_0` |
| `wh2_dlc11_cst_inf_depth_guard_1` | `wh2_dlc11_cst_inf_depth_guard_1` |
| `wh2_dlc11_cst_inf_syreens` | `wh2_dlc11_cst_inf_syreens` |
| `wh2_dlc11_cst_inf_zombie_gunnery_mob_1` | `wh2_dlc11_cst_inf_zombie_gunnery_mob_1` |
| `wh2_dlc11_cst_mon_animated_hulks_0` | `wh2_dlc11_cst_mon_animated_hulks_0` |
| `wh2_dlc12_lzd_inf_skink_red_crested_0` | `wh2_dlc12_lzd_inf_skink_red_crested_0` |
| `wh2_dlc12_skv_inf_ratling_gun_0` | `wh2_dlc12_skv_inf_ratling_gun_0` |
| `wh2_dlc12_skv_inf_warplock_jezzails_0` | `wh2_dlc12_skv_inf_warplock_jezzails_0` |
| `wh2_dlc14_skv_inf_eshin_triads_0` | `wh2_dlc14_skv_inf_eshin_triads_0` |
| `wh2_dlc14_skv_inf_poison_wind_mortar_0` | `wh2_dlc14_skv_inf_poison_wind_mortar_0` |
| `wh2_dlc14_skv_inf_warp_grinder_0` | `wh2_dlc14_skv_inf_warp_grinder_0` |
| `wh2_main_lzd_inf_chameleon_skinks_0` | `wh2_main_lzd_inf_chameleon_skinks_0` |
| `wh2_main_lzd_inf_saurus_spearmen_0` | `wh2_main_lzd_inf_saurus_spearmen_0` |
| `wh2_main_lzd_inf_saurus_spearmen_1` | `wh2_main_lzd_inf_saurus_spearmen_1` |
| `wh2_main_lzd_inf_saurus_warriors_0` | `wh2_main_lzd_inf_saurus_warriors_0` |
| `wh2_main_lzd_inf_saurus_warriors_1` | `wh2_main_lzd_inf_saurus_warriors_1` |
| `wh2_main_lzd_inf_skink_cohort_0` | `wh2_main_lzd_inf_skink_cohort_0` |
| `wh2_main_lzd_inf_skink_cohort_1` | `wh2_main_lzd_inf_skink_cohort_1` |
| `wh2_main_lzd_inf_skink_skirmishers_0` | `wh2_main_lzd_inf_skink_skirmishers_0` |
| `wh2_main_skv_inf_clanrat_spearmen_0` | `wh2_main_skv_inf_clanrat_spearmen_0` |
| `wh2_main_skv_inf_clanrat_spearmen_1` | `wh2_main_skv_inf_clanrat_spearmen_1` |
| `wh2_main_skv_inf_clanrats_1` | `wh2_main_skv_inf_clanrats_1` |
| `wh2_main_skv_inf_death_globe_bombardiers` | `wh2_main_skv_inf_death_globe_bombardiers` |
| `wh2_main_skv_inf_gutter_runner_slingers_0` | `wh2_main_skv_inf_gutter_runner_slingers_0` |
| `wh2_main_skv_inf_gutter_runner_slingers_1` | `wh2_main_skv_inf_gutter_runner_slingers_1` |
| `wh2_main_skv_inf_gutter_runners_0` | `wh2_main_skv_inf_gutter_runners_0` |
| `wh2_main_skv_inf_gutter_runners_1` | `wh2_main_skv_inf_gutter_runners_1` |
| `wh2_main_skv_inf_night_runners_0` | `wh2_main_skv_inf_night_runners_0` |
| `wh2_main_skv_inf_night_runners_1` | `wh2_main_skv_inf_night_runners_1` |
| `wh2_main_skv_inf_plague_monk_censer_bearer` | `wh2_main_skv_inf_plague_monk_censer_bearer` |
| `wh2_main_skv_inf_poison_wind_globadiers` | `wh2_main_skv_inf_poison_wind_globadiers` |
| `wh2_main_skv_inf_skavenslave_slingers_0` | `wh2_main_skv_inf_skavenslave_slingers_0` |
| `wh2_main_skv_inf_warpfire_thrower` | `wh2_main_skv_inf_warpfire_thrower` |
| `wh3_dlc25_emp_inf_hochland_long_rifles` | `wh3_dlc25_emp_inf_hochland_long_rifles` |
| `wh3_dlc25_emp_inf_nuln_ironsides` | `wh3_dlc25_emp_inf_nuln_ironsides` |
| `wh3_dlc29_emp_inf_teutogen_guard` | `wh3_dlc29_emp_inf_teutogen_guard` |
| `wh3_dlc29_emp_inf_warriors_of_ulric` | `wh3_dlc29_emp_inf_warriors_of_ulric` |
| `wh3_dlc29_emp_inf_wolf_kin` | `wh3_dlc29_emp_inf_wolf_kin` |
| `wh_dlc01_chs_inf_chosen_2` | `wh_dlc01_chs_inf_chosen_2` |
| `wh_dlc01_chs_inf_forsaken_0` | `wh_dlc01_chs_inf_forsaken_0` |
| `wh_dlc01_chs_mon_dragon_ogre` | `wh_dlc01_chs_mon_dragon_ogre` |
| `wh_dlc04_emp_inf_flagellants_0` | `wh_dlc04_emp_inf_flagellants_0` |
| `wh_dlc04_emp_inf_free_company_militia_0` | `wh_dlc04_emp_inf_free_company_militia_0` |
| `wh_dlc04_vmp_inf_sternsmen_0` | `wh_dlc04_vmp_inf_sternsmen_0` |
| `wh_dlc07_brt_inf_battle_pilgrims_0` | `wh_dlc07_brt_inf_battle_pilgrims_0` |
| `wh_dlc07_brt_inf_foot_squires_0` | `wh_dlc07_brt_inf_foot_squires_0` |
| `wh_dlc07_brt_inf_men_at_arms_1` | `wh_dlc07_brt_inf_men_at_arms_1` |
| `wh_dlc07_brt_inf_men_at_arms_2` | `wh_dlc07_brt_inf_men_at_arms_2` |
| `wh_dlc07_brt_inf_peasant_bowmen_1` | `wh_dlc07_brt_inf_peasant_bowmen_1` |
| `wh_dlc07_brt_inf_peasant_bowmen_2` | `wh_dlc07_brt_inf_peasant_bowmen_2` |
| `wh_dlc07_brt_inf_spearmen_at_arms_1` | `wh_dlc07_brt_inf_spearmen_at_arms_1` |
| `wh_dlc07_brt_peasant_mob_0` | `wh_dlc07_brt_inf_peasant_mob_0` |
| `wh_main_brt_inf_men_at_arms` | `wh_main_brt_inf_men_at_arms` |
| `wh_main_brt_inf_peasant_bowmen` | `wh_main_brt_inf_peasant_bowmen` |
| `wh_main_brt_inf_spearmen_at_arms` | `wh_main_brt_inf_spearmen_at_arms` |
| `wh_main_chs_inf_chosen_0` | `wh_main_chs_inf_chosen_0` |
| `wh_main_chs_inf_chosen_1` | `wh_main_chs_inf_chosen_1` |
| `wh_main_emp_inf_crossbowmen` | `wh_main_emp_inf_crossbowmen` |
| `wh_main_emp_inf_spearmen_1` | `wh_main_emp_inf_spearmen_1` |
| `wh_main_emp_inf_swordsmen` | `wh_main_emp_inf_swordsmen` |
| `wh_main_vmp_inf_grave_guard_1` | `wh_main_vmp_inf_grave_guard_1` |
| `wh_main_vmp_mon_vargheists` | `wh_main_vmp_mon_vargheists` |
