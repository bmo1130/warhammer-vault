# Multi-rank Skill semantics research

Baseline: `83566932318795ab73430a27b88a57a4a3b50069` (WH3 9.0.2.0).
**Final verdict D: UNKNOWN. No admission, rank arithmetic, schema/model or application change.**

## Source and repeatable findings

`source.json` is a bounded actual CA `db.pack` / `local_en.pack` extraction through RPFM 5.1.0, using the existing Skill row/schema/reference representation. It contains 353 unique rows, 20 rank-effect junctions, 8 effects, 4 target sets, complete filtered-query coverage and exact owner chains. The original ignored extraction SHA256, schema hash, pack hashes and static snapshot identity are preserved in `manifest.json` / `source.json`. `report.json` references these rows; it is not an admitted projection. `runtime-audit.json` records a read-only audit of existing captures, not a new measurement.

| Skill (exact key) | Rank 1 raw rows | Rank 2 raw rows | Rank 3 raw rows | Owner evidence |
| --- | --- | --- | --- | --- |
| Low-Born Militia (`wh2_dlc11_skill_brt_army_buff_low_born_militia`) | leadership 4 | leadership 4; melee defence 4 | leadership 6; melee defence 6 | 8 exact Bretonnia subtypes, including `wh_main_brt_lord` |
| Peasant Proficiency (`wh2_dlc11_skill_brt_army_buff_proficiency_of_peasants`) | ammunition 10 | ammunition 15; reload 4 | ammunition 20; reload 8 | Same 8 exact Bretonnia subtypes |
| Worshippers of the Grail (`wh2_dlc11_skill_brt_army_buff_worshippers_of_the_grail`) | armour 6 | armour 9; melee attack 4 | armour 12; melee attack 6 | Same 8 exact Bretonnia subtypes |
| Emperor's Finest (`wh2_dlc11_skill_emp_army_buff_emperors_finest`) | melee defence 4 | melee defence 4; melee attack 4 | melee defence 6; melee attack 6 | 11 exact Empire subtypes, including `wh_main_emp_lord` |

Names/stat labels above describe the exact effect routes and localisation. Values are raw junction values, **not calculated effective unit deltas**. Percent interpretation, rounding and stacking for the comparison samples are not newly admitted. Every row uses `general_to_force_own`, whose source is character, target force, ownership yours, location forcewide_when_commanding. All samples have independent rank row counts 1 / 2 / 2; the first effect key is reused at 1/2/3 and the second at 2/3. This repeats across different owners/factions but proves only the DB structure.

Exact chain:

`character_skill_nodes.character_skill_key → character_skills.key`

`character_skill_node_set_items.item → character_skill_nodes.key`, `set → character_skill_node_sets.key`, `agent_subtype_key → agent_subtypes.key`

`character_skill_level_to_effects_junctions.character_skill_key → character_skills.key`, `effect_key → effects.effect`, `effect_scope → campaign_effect_scopes.key`

`effect_bonus_value_ids_unit_sets.effect → effects.effect`, `unit_set → unit_sets.key`

`unit_set_to_unit_junctions.unit_set → unit_sets.key`, `unit_record → main_units.unit`, `main_units.land_unit → land_units.key`

Every join is checked against the processed schema reference and a stored relationship. Owner chains retain campaign/faction/subculture selectors and enabled state; an owner key alone is not permission to apply a Skill. The four target sets retain exact members/exclusions, including the Peasant Mob's distinct main/land identity.

## Low-Born exact effect identities

| Effect key | Typed bonus route | Target set | Display priority |
| --- | --- | --- | --- |
| `wh2_dlc11_effect_force_stat_leadership_peasant_mob_men_at_arms_spear_at_arms` | `morale` | `wh2_dlc11_brt_peasant_mob_men_at_arms_spear_at_arms` | 411 |
| `wh2_dlc11_effect_force_stat_melee_defence_brt_peasant_mob_men_at_arms_spear_at_arms` | `melee_defence_mod` | Same exact set | 451 |

The exact five junction row IDs, scope, values and joins are under the first Skill in `report.json`. Their composite source key is **(character_skill_key, effect_key, level)**. They are separate records, not duplicate rows to discard. Source maximum observed effect level is 3; this does not independently prove a runtime maximum or activation rule.

## What the static evidence does and does not say

The actual processed `character_skill_level_to_effects_junctions_tables` v1 has precisely `character_skill_key`, `effect_key`, `effect_scope`, `level`, `value`. It has no bundle key, application priority, accumulate flag, previous-rank removal reference or replacement flag. Descriptions for these five fields are empty. RPFM `ca_order` records column ordering; it supplies no rank execution rule.

The processed `effects_tables.priority` description explicitly says: “Higher number will be displayed lower down the list. Set to 0 to hide the effect entirely.” `category` is also described as UI display metadata. These are not evidence that the higher-rank effect overrides a lower-rank effect. `character_skills.unlocked_at_rank` describes the **character's unlock level**, including a zero-based model offset, not learned Skill level activation.

For all four exact skills, complete queries found zero rows in `character_skill_level_details`, `character_skill_level_to_ancillaries_junctions`, `character_skill_level_to_dilemmas_junctions` and `character_skills_to_level_reached_criterias`. A reverse query for all eight exact effects found **zero** `effect_bundles_to_effects_junctions` rows. That separate table has an explicit bundle key and optional advancement stage; there is no such direct reference in the inspected Skill level junction. No rank→bundle identity can be invented from a Skill name.

The source also preserves metadata for all 21 Skill/bundle table families, including node links, skill locks, utilization hints, level-reached criteria and bundle advancement stages. Node/prerequisite/lock metadata is not evidence of active lower-rank rows being removed. This is a bounded schema/row finding, **not a proof that the executable has no implicit bundle or rank activation rule**. RPFM schema descriptions are tooling metadata, not an independently captured game-engine execution trace.

Both “activate only selected-level rows” and “activate all rows up to selected level” remain compatible with the observed source structure. A different effect-specific activation rule also remains possible. No numerical pattern or tooltip resolves this.

## Existing runtime evidence

Read-only audit: **134 existing .txt/.log paths, 50 distinct file hashes, 5,976 parsed probe records, 0 malformed probe lines**. File paths, sizes and SHA256s are in `runtime-audit.json`; identical file copies are counted once. No record contains the exact Low-Born Skill key. Queried/observed fields cover identity, HP, entity lists, ammo and reload, but not effective leadership, melee defence or learned Skill rank. Thus there is **no qualifying controlled rank trial in the audited files**. This does not claim that no other external capture exists.

The current canonical battle probe reads `UnitRecordContext.Key` / `UnitRecordContext.UnitLandRecordContext.Key` and other existing fields, but cannot currently attest those two effective stats or campaign Skill rank. Existing custom-battle HP/entity captures do not carry a learned campaign Skill through ranks. They remain unchanged and retain their original meaning, including MEDIUM evidence.

| Learned Low-Born rank | Actual leadership | Actual melee defence | Observation status |
| --- | --- | --- | --- |
| 0 | — | — | NOT_OBSERVED |
| 1 | — | — | NOT_OBSERVED |
| 2 | — | — | NOT_OBSERVED |
| 3 | — | — | NOT_OBSERVED |

## Controlled verification design (not executed)

1. Use the exact supported generic Bretonnia Lord subtype `wh_main_brt_lord` and Skill node `wh_main_skill_node_brt_lord_battle_02` in a campaign whose node/set selectors are applicable. Use one individually identified unit with exact main/land `wh_main_brt_inf_men_at_arms`, an explicit Low-Born target. Identify a separate non-target control unit by source membership before using it.
2. Prepare a single save with enough unspent points and all required common prerequisites already active. Keep the Lord's **character level** constant; prerequisites belong to every baseline and must not be removed between branches. Fork that same save into rank 0, 1, 2 and 3 branches. Change only Low-Born allocation. Do not advance a turn, level up, recruit, merge units, transfer the Lord or respec unrelated skills.
3. Record the save/capture hashes, build/static snapshot, mods/load order, owner instance/subtype, exact node/skill identity and actual learned rank. Record Unit Size explicitly (ULTRA for this trial), exact main/land keys and persistent individual unit identity. Rank must be read/attested, not inferred from a tooltip or number of spent points.
4. Keep difficulty, unit experience, research, Lord/hero skills, traits, ancillaries, faction/army/location effects, equipment and wounds identical. Remove optional effects where possible; record any fixed prerequisites or unavoidable bonuses in baseline. Reject trials with untracked differences. Record effective campaign/prebattle stats on the same stat channel; if also reading battle stats, control lord aura range, abilities, enemies, fear/terror, combat state, fatigue, damage and morale state identically. A situational morale value is not automatically the leadership stat.
5. After each allocation let the same UI/context refresh, record leadership and melee defence with source context/query and VALUE status. Repeat from baseline to exclude stale caching. Keep rank-down/off restoration as a separate observation if the game supports a controlled reset without changing other inputs. Otherwise reload the baseline save; do not assume a reset removes effects correctly.
6. Capture rank-specific Skill tooltip and unit card separately with the exact selected/hovered rank. Label them `MANUAL_CARD_VALIDATION` / supplementary tooltip observations, not CCO or CA static evidence. Do not interpret hovered next-rank text as applied current-rank totals. Compare tooltip values/differences with independently attested effective stats before deciding whether the tooltip shows current, next, or cumulative effects.

For discrimination only, with observed baseline `(L0,D0)`, the hypotheses predict:

| Rank | Selected-level hypothesis Δ(leadership, defence) | All-lower-level hypothesis Δ(leadership, defence) |
| --- | --- | --- |
| 0 | (0, 0) | (0, 0) |
| 1 | (4, 0) | (4, 0) |
| 2 | (4, 4) | (8, 4) |
| 3 | (6, 6) | (14, 10) |

These are alternative experimental predictions supplied by the problem, not measured results or a calculator implementation. A different result must remain separate evidence, not be forced into either model. Low-Born's rank 2 distinguishes the hypotheses; rank 3 and repeated restoration test consistency. To generalize beyond Low-Born, reproduce comparable rank-series observations on the other three exact source chains, including the Empire owner, and check effect-specific semantics. One successful Low-Born trial cannot admit every multi-rank Skill.

### Minimal future probe design

First discover and verify, through available CCO metadata/API documentation, a read-only owning-character/learned-Skill-level context and read-only effective unit leadership/defence queries. **The exact query names and contexts are currently UNKNOWN; no guessed expressions are added to the probe.** Verify whether campaign bonuses persist into the measured battle context. Compare the candidate stat queries against rank-0 unit card readings and test cache refresh, VALUE/NULL/UNSUPPORTED handling before using them as semantic evidence.

Only after that discovery, the smallest extension would add those two verified unit-stat reads and an exact character/Skill/rank attestation to the existing identity/metadata/value-status capture. Preserve declared Unit Size and snapshot checks, link owner/unit/rank/save within one capture, and quarantine unsupported, missing, mixed-snapshot, wrong-owner or stale-rank readings. This is a design checklist, not a new logging schema or implemented probe. If no reliable read API exists, retain separately labelled controlled manual observations and their limitation; do not claim raw runtime proof from UI text.

## Decision and preservation

Generalizable today: exact composite source structure, repeated effect-key use, explicit target routes and display-order metadata. **Not generalizable today: cumulative/replacement activation, rank-specific bundle construction, lower-rank removal or effect-specific stacking.** Tooltip rank meaning and actual rank 0/1/2/3 stats are UNKNOWN. No projection-model extension is justified yet.

Production 101 / Sample 5, HP 13 / Speed 81, Research 10 technologies / 15 effects / 96 candidates, three admitted Skills, existing batch 01/02 artifacts, Modifier arithmetic, UI, comparison, IndexedDB/backup and runtime diagnostics are preserved. Existing files are pinned in the manifest. No game launched, probe installed, source snapshot replaced or old artifact rewritten.

## Replay and validation

Clean checkout (no game, RPFM, generated capture or staging required):

```powershell
node scripts/review-skill-rank-research.mjs
node scripts/review-skill-batch-01.mjs
node scripts/review-skill-batch-02.mjs
node scripts/review-skill-slice-01.mjs
node scripts/admit-bretonnia-research.mjs
npm test
npm run build
```

Optional local read-only comparison against the original ignored extraction and existing capture hashes:

```powershell
node scripts/review-skill-rank-research.mjs --check-raw
```

Actual bounded extraction can be repeated with `node scripts/extract-skill-rank-research.mjs` (requires the configured existing RPFM/static game files; does not launch the game). Capture timestamps can differ; projection and review from the **same input bytes** are deterministic. A later extraction does not silently replace committed source pins.

Regression tests cover exact 20 rows / keys / targets / owners, schema references and display-priority meaning, UNKNOWN/non-admission preservation, corrupted row/schema/reference/snapshot/coverage rejection, original extraction projection, raw log hashes and all protected application/data/evidence files.

Validation completed: local **498/498 tests PASS**, `npm run build` PASS, original CA extraction projection and all recorded raw runtime log hashes PASS. New research replay, Skill slice / batch 01 / batch 02, Research admission / classifier / full scan / mapping / scope / historical replay all PASS. A fresh source-only snapshot without `.git`, game/RPFM configuration or generated files also passed all ten replays, **493 tests PASS / 5 local-artifact checks SKIP / 0 failures**, TypeScript and Vite build. No browser smoke is required for this research-only change; application/UI code is unchanged.
