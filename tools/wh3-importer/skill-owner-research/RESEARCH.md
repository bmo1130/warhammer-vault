# Exact shared-owner Skill research

Baseline `b5308568cea08ce28b016545c019ea3c94f71848`; static snapshot `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5` (WH3 9.0.2.0).

**Verdict B: the inspected direct, visible, enabled exact-subtype tree pattern supports an explicit owner allowlist, with separate availability/applicability requirements.** An owner array can encode this source relation. It cannot replace faction/agent permissions, unlock/prerequisite conditions, special-character acquisition, scope or effect-operation validation. No application model/schema change and **zero new admissions**: the selected shared single-rank Skills all retain other blockers.

## Samples and exact owner sets

Six exact Skills: the four requested primary samples, existing Champions of Bordeleaux as the exact-single-owner control, and Low-Born Militia for ownership topology comparison only. Its multi-rank semantics remain UNKNOWN; no arithmetic or new rank research is performed.

Define the following **explicit eight-key source set L**, not a faction/class wildcard:

```text
wh2_dlc14_brt_repanse
wh_dlc07_brt_alberic
wh_dlc07_brt_fay_enchantress
wh_dlc07_brt_prophetess_beasts
wh_dlc07_brt_prophetess_heavens
wh_dlc07_brt_prophetess_life
wh_main_brt_lord
wh_main_brt_louen_leoncouer
```

| Exact Skill key | Name | Source owners | Observed effect rank(s) | Source relation taxonomy |
| --- | --- | --- | --- | --- |
| `wh_main_skill_brt_lord_battle_lionhearted` | Lionhearted | L (8) | 1 | EXACT_OWNER_SET |
| `wh_main_skill_brt_lord_battle_virtue_of_empathy` | Virtue of Empathy | L (8) | 1 | EXACT_OWNER_SET |
| `wh_main_skill_brt_lord_battle_basic_training` | Basic Training | L (8) | 1 | EXACT_OWNER_SET |
| `wh_main_skill_brt_all_unique_ladys_mantle` | Lady’s Mantle | M (14, below) | 1 | EXACT_OWNER_SET |
| `wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux` | Champions of Bordeleaux | `wh_dlc07_brt_alberic` only | 1 | EXACT_SINGLE_OWNER |
| `wh2_dlc11_skill_brt_army_buff_low_born_militia` | Low-Born Militia | L (8) | 1/2/3, application UNKNOWN | EXACT_OWNER_SET |

Lady's Mantle **exact source set M**:

```text
wh2_dlc11_cst_ghost_paladin
wh2_dlc13_emp_hunter_rodrik_l_anguille
wh2_dlc14_brt_henri_le_massif
wh2_dlc14_brt_repanse
wh_dlc07_brt_alberic
wh_dlc07_brt_damsel_beasts
wh_dlc07_brt_damsel_life
wh_dlc07_brt_prophetess_beasts
wh_dlc07_brt_prophetess_heavens
wh_dlc07_brt_prophetess_life
wh_main_brt_damsel_heavens
wh_main_brt_lord
wh_main_brt_louen_leoncouer
wh_main_brt_paladin
```

M includes general/champion/wizard/spy agent types and exact main-unit Lord/Hero castes. It includes source permission links to Empire's `wh2_dlc13_emp_the_huntmarshals_expedition` and Vampire Coast's `wh2_dlc11_cst_the_drowned`. It **does not include** `wh_dlc07_brt_fay_enchantress`, despite that subtype being a Bretonnia Legendary Lord and being in L. This is a direct counterexample to faction/class/default-inheritance applicability. The ghost paladin's actual tree agent is `spy`; its name must not be used to replace that exact agent identity with `champion`.

## Exact node/tree ownership chain

Each of 47 owner-node assignments independently verifies:

```text
character_skill_nodes.character_skill_key -> character_skills.key
character_skill_node_set_items.item -> character_skill_nodes.key
character_skill_node_set_items.set -> character_skill_node_sets.key
character_skill_node_sets.agent_subtype_key -> agent_subtypes.key
character_skill_node_sets.agent_key -> agents.key
agent_subtypes.associated_unit_override -> main_units.unit
main_units.land_unit -> land_units.key
```

This is a direct subtype reference, not an inferred inheritance edge. Every selected Skill has complete exact-key node discovery; all reverse memberships and all trees of the 15 encountered exact subtypes were queried. The resulting 15 tree sets all have exact subtype keys. No alternate tree sets, nonempty campaign/faction/subculture node/set selectors or subtype/subculture override rows were found for these samples.

For example, the generic Lord's Lionhearted node is `wh_main_skill_node_brt_lord_unique_09` in `wh_main_skill_node_set_brt_lord`; Alberic's is `wh_dlc07_skill_node_brt_alberic_unique_09` in `wh_dlc07_skill_node_set_brt_alberic`. They are **different node/set records referencing the same exact Skill record**. All eight members of L have separate exact nodes/sets; Legendary trees are explicit assignments, not an assumed derivation from the generic tree. All source rows and joins are in `source.json` / `report.json`.

For the 47 selected assignments: node `visible_in_ui=true`, membership `mod_disabled=false`, `points_on_creation=0`, Skill `is_background_skill=false`, agent `playable=true`, subtype `can_gain_xp=true`. The source has no inspected node/Skill `AI-only` or `legendary-only` flag proving such a restriction; that absence is not proof that external scripts cannot restrict availability. Legendary/generic character labels retain the actual recruitment category, auto-generation and main-unit caste evidence. These labels never grant ownership.

## Availability is a different question

Complete ancestor/lock discovery contains **55 nodes**, **8 incoming links**, **0 skill locks** and **0 ancillary locks**. The eight links are Low-Born nodes to each same-tree `wh_main_skill_all_lord_battle_inspiring_presence` node, with source `link_type=REQUIRED`. Their `required_num_parents` raw value is **0**, not an inferred 1. The actual execution meaning of this combination is not reinterpreted here. The other five selected Skills have no incoming links in this bounded closure. Parent graph membership is checked independently of assuming how the engine unlocks a node.

Lady's Mantle has raw `character_skills.unlocked_at_rank=7` plus one global rank-1 level-detail row with raw `unlocked_at_rank=7`; all selectors on that row are empty. This is character-unlock metadata, not a multi-rank application rule. A node existing in a tree does not prove the Skill can immediately be selected by a low-level character.

`faction_agent_permitted_subtypes` provides exact **(agent, faction, subtype)** context. The extraction retains all 188 discovered rows. Of these, 148 match the actual agent/subtype tree pairs and have exact faction→subculture→culture proofs; 40 use other agent combinations and are retained as source context, not misapplied to the inspected tree. Permission proofs are stored once in `report.json`; Skills reference row IDs. Faction membership is not used to expand an owner set. Permission rows include special/rogue/quest contexts and do not by themselves prove a faction is human-selectable in a particular campaign.

`campaign_to_agent_subtypes` is retained but not used as playability proof: its schema description says it also determines what the Changeling can transform into in a given campaign. `for_army` / `for_navy` are recorded as raw flags (both false in these tree sets); they are not guessed into force-scope rules.

Four exact subtype/content-pack junctions to two content-pack records are also preserved. Their presence records a source ownership requirement; this research does not attest the player's entitlements or convert it into a general character availability rule.

The three special Lady's Mantle subtypes (ghost paladin, Rodrik, Henri) have `show_in_ui=false`, despite visible Skill nodes, enabled memberships, positive XP/playable flags and matching faction permissions. Their special-character acquisition/actual selection availability is **NOT_OBSERVED**. The flag alone is not an AI-only or unplayable verdict. Other owners have source-enabled tree evidence with context requirements, not a captured in-game selection trial. Ownership taxonomy describes the direct source relation; runtime acquisition/selection status is a separate dimension.

## Same-key meaning across owners

For each owner, analysis follows its node to the exact Skill record and then independently resolves every source rank row, effect, value, scope, typed route and downstream unit-set membership. A deterministic signature includes those source facts and the **unchanged historical operation assessment**. Each Skill has exactly one signature across its owners. This checks exact source joins and content; localisation names are not the identity rule.

| Skill | Exact effect / raw value | Scope | Existing blocker / operation boundary |
| --- | --- | --- | --- |
| Lionhearted | `wh_dlc07_effect_ability_cooldown_rally_stand_your_ground` / -50 | `character_to_character_own` | Typed ability cooldown routes, not numeric UnitStatPath projection |
| Virtue of Empathy | `wh_main_effect_character_stat_leadership_aura_size` / 25 | `character_to_character_own` | Self aura, `all_units` class selectors, no direct unit stat |
| Basic Training | `wh_main_effect_force_stat_vigour_loss_reduction` / -15 | `general_to_force_own` | Vigour path absent; class selector unresolved |
| Lady's Mantle | `wh_main_effect_character_stat_missile_resistance` / 10 | `character_to_character_own` | Character self + class selector; no new resistance operation interpretation |
| Champions control | Exact existing `...bonus_vs_large_kotr` / 15 and `...leadership_kotr` / 5 | `general_to_force_own` | Existing flat-add explicit Knights of the Realm admission retained |
| Low-Born ownership control | Existing exact leadership/defence rows and typed membership | `general_to_force_own` | Multi-rank semantics UNKNOWN, no admission |

Identical typed operation routes and identical **unsupported/unresolved** assessments across owners do not turn an unknown operation into a validated one. No new numeric formula is inferred. Lord/Hero difference does not change these stored effect rows; with self scope, the affected character/bodyguard identity is nevertheless different. It must not be projected as an own-force Unit effect simply because the owner belongs to M.

An exact same-display-name Loc discovery found only one exact key for each of the four primary samples. The Low-Born control has another key, `wh_main_skill_brt_lord_battle_low-born_militia`, with the same name but **zero node references** in the complete matching-name key query. It is retained as a separate Skill record, not merged or admitted. This is not evidence of a different subtype receiving that legacy key in the observed snapshot. Names are solely a discovery/comparison aid.

## Taxonomy and model decision

Source-relation counts: **EXACT_SINGLE_OWNER 1 / EXACT_OWNER_SET 5**. The other requested categories have zero observed samples: CHARACTER_CLASS_OWNER, NODE_SET_MEMBER_ONLY, INHERITED/INDIRECT_OWNER, AMBIGUOUS, NOT_PLAYABLE/APPLICABLE. This does not assert every encountered character is currently recruitable/ selectable in every campaign; special availability remains NOT_OBSERVED. A visible direct node/set/subtype relation with additional exact agent/faction/character evidence is stronger than node-set membership alone, while still distinct from runtime selection.

Safe prospective owner representation for this direct pattern: an explicit set of the exact keys above, no faction-wide applicability, Lord-class default, name inference, prefix wildcard or generic-to-Legendary inheritance. Owner membership is necessary; rank/effect scope, actual learned state, unit target, owner-agent/faction context, prerequisites and any conditional availability must remain separate. A context-aware relation cannot be flattened into unconditional `owners[]` application.

All four shared single-rank primary samples fail an independent current Unit admission condition. Champions is already admitted and only has one owner. Low-Born remains multi-rank UNKNOWN. Therefore **no new shared Skill admission** and **no speculative application owner-schema expansion** are justified in this batch. Existing single-owner API, Calculator and three admissions remain unchanged.

## Minimal validation design (not performed)

No runtime trial is needed to identify the direct static owner sets and common source payload in this snapshot. Actual selectable availability remains a distinct question; for the special/acquisition conditions it cannot be claimed from these tables alone. No game is launched or new probe implemented.

For the ordinary direct pattern, if selection needs independent confirmation, use the same Skill (e.g. Lionhearted) on exact `wh_main_brt_lord` and `wh_dlc07_brt_alberic` in applicable campaign/faction conditions, sufficient fixed character level and unspent points. Record exact character/subtype, tree/node key, selected Skill key/rank, save/build/mod hashes, campaign/faction and active prerequisites. Confirm the node is visible/selectable and actual learned rank changes on allocation; compare the source effect identity/scope/target, not just the tooltip title. This verifies ownership/selection, not a new numeric stat interpretation.

For Lady's Mantle, inspect generic Lord/Paladin and one available special subtype after its actual acquisition and the raw unlock threshold. Record how the special character was acquired; do not infer availability from `show_in_ui=false` or force-spawn it and claim normal acquisition. Check the outside-set Fay subtype separately as an absence control. A game card/tree observation is labelled manual evidence; CCO proof requires exact, documented context/query support for Skill/node/rank, which is not present in the existing battle probe. Browser Calculator smoke cannot establish CA game ownership; it is relevant only after an application model/admission change. **All such runtime observations here remain NOT_OBSERVED.**

## Preservation and replay

Preserved: Production 101 / Sample 5 / HP 13 / Speed 81; Research 10 technologies / 15 effects / 96 candidates; Champions, Aspiring Knights and Blessed Water; batch 01/02; multi-rank verdict D and all its artifacts; Modifier engine; comparison; IndexedDB/backup; UI; runtime and MEDIUM evidence. Manifest hashes pin all existing app/data and relevant evidence/artifact files. No old artifact is rewritten.

Clean checkout replay (no game, RPFM or generated artifacts required):

```powershell
node scripts/review-skill-owner-research.mjs
node scripts/review-skill-batch-01.mjs
node scripts/review-skill-batch-02.mjs
node scripts/review-skill-rank-research.mjs
node scripts/admit-bretonnia-research.mjs
npm test
npm run build
```

Optional local static projection comparison: `node scripts/review-skill-owner-research.mjs --check-raw`. The original ignored CA extraction SHA256 and snapshot/schema/pack provenance are retained; the same input bytes reproduce identical source/report bytes. Bounded static extraction can be repeated with `node scripts/extract-skill-owner-research.mjs`; it reads the existing pack files through configured RPFM without running the game. Its capture timestamp may differ; pins cannot silently advance.

Regression tests cover independent node/set/subtype joins, all six exact key sets, generic/Legendary separation, mixed Lord/Hero and non-Bretonnia source context, outside-set negatives, unchanged source signatures and operation blockers, prerequisite closure, duplicate-name non-merging, corrupt identity/flags/permission/schema/hash/snapshot rejection, existing admission applicability and protected file bytes.

Validation completed: **506/506 local tests PASS**, `npm run build` PASS; shared-owner, Skill slice / batch 01 / batch 02, rank research, Research admission / classifier / full scan / mapping / scope / historical replay PASS. Local original CA extraction projection PASS. A fresh source-only snapshot without `.git`, game/RPFM configuration or generated data passed all **11 replays**, **500 tests PASS / 6 local-artifact checks SKIP / 0 failures**, TypeScript and Vite build. Browser/320px smoke was not performed because application model, admission, Calculator and UI are unchanged; browser rendering cannot prove game character availability.
