# Bretonnia full Skill production review

Verdict **B**: the first full source → scan → classifier → reviewed gate → Calculator projection pipeline is reproducible. Current proved semantics allow the existing three complete Skills; **new admission is zero**. This is a production admission boundary, not a claim that the remaining Skills have no useful game effects.

Baseline: `c07d38699e2d07e02f428a4cb4a8ffdb0454ce91`. Game `9.0.2.0`, RPFM `5.1.0`, processed schema format `5`, exact CA `db.pack` and English localisation snapshot. No wiki, name prefix, faction wildcard or inferred inheritance participates in discovery or admission. Runtime availability/effect application remains `NOT_OBSERVED` for this full scan.

## Universe and provenance

The discovery root is `cultures_tables.key=wh_main_brt_bretonnia`. Exact references reach `wh_main_sc_brt_bretonnia`, 23 faction records and their permitted subtypes, including disabled, background, quest-battle and special-character contexts. From the resulting 14 subtype keys, inverse node-set coverage reaches 14 trees, exact set items, nodes, 226 distinct Skill keys and every effect-level junction. Affiliation-only faction/subculture node sets were queried separately and returned none; a future unresolved affiliation-only tree fails closed.

The 14 owners are:

| Group | Exact subtype keys |
| --- | --- |
| Legendary Lords (4) | `wh_main_brt_louen_leoncouer`, `wh_dlc07_brt_alberic`, `wh_dlc07_brt_fay_enchantress`, `wh2_dlc14_brt_repanse` |
| Generic Lords / Prophetesses (4) | `wh_main_brt_lord`, `wh_dlc07_brt_prophetess_beasts`, `wh_dlc07_brt_prophetess_heavens`, `wh_dlc07_brt_prophetess_life` |
| Heroes / Damsels / Paladin (4) | `wh_main_brt_paladin`, `wh_main_brt_damsel_heavens`, `wh_dlc07_brt_damsel_beasts`, `wh_dlc07_brt_damsel_life` |
| Associated special Heroes (2) | `wh2_dlc14_brt_henri_le_massif`, `wh_dlc07_brt_green_knight` |

Reverse Skill → node → item → set references also preserve 554 foreign subtype identities, in a separate relation dictionary. Their faction permission universe is outside this Bretonnia scan. They cannot enter an admission owner list. Static ownership distribution is 111 `EXACT_SINGLE_OWNER` and 115 `EXACT_OWNER_SET` Skills; this counts unique subtype keys, not duplicate node chains.

Safe static owner lists additionally check exact enabled Bretonnia faction permission, agent, node visibility, set membership, subtype UI/XP flags, restriction/override rows, locks and parent-node membership in the same tree. Special availability, hidden/background application, unresolved locks and conditional grants remain blockers. Ordinary tree prerequisites and character-level unlock values are retained as static facts; they do not certify that a player currently owns or has selected a Skill. Calculator selection retains its existing commanding-own-force assumption.

Extraction includes complete bounded predicates and matched counts, schemas, source-pack metadata, primary keys and reference edges. It enumerates all 57 present schema-recognized `effect_bonus_value_*` tables with an effect reference, not just the numeric route family. There are 27,849 source rows and 46,249 edges. The extraction hard limit is 40,000 unique rows; exceeding it aborts instead of truncating.

| Pin | SHA-256 |
| --- | --- |
| Original extraction | `85df96c1b66385b552c778a5692eb6e1097b882a02c6a537f340d28d6ecca2fd` |
| Committed compact source | `479991adfb88fccece9f7040268e05a888e603f5dc767dc0a196d50b77697409` |
| Expanded exact source | `ad4b2b427c78ba101796f4bb771971aeed2636f2c2378304d58a03124af8b3d7` |
| Processed source schemas | `26236b2a14eeeeaa6e8d7ce98b0407d907f2b55956569ab33a574b0669d0f423` |

`manifest.json` also pins selection, reviewed candidates, policy/verification code, derived outputs and all 475 baseline tracked files. Replay verifies payload-derived row IDs, primary-key uniqueness, query coverage, schema references, pack/snapshot identity and canonical dictionary reconstruction. An unused dictionary entry, duplicate delta/index, identity collision, changed schema, route or source byte fails closed.

## Coverage and classification

Counts use source junctions rather than multiplying an effect by owner or target. One junction may have multiple typed numeric routes: Aspiring Knights has three junctions and four Modifier mappings.

| Measure | Count |
| --- | ---: |
| Skills | 226 |
| Distinct Skill/rank pairs represented by effect rows | 434 |
| Effect junctions / distinct effect keys | 840 / 310 |
| Complete source rank `[1]` Skills | 140 |
| Multi-rank Skills | 80 |
| Skills without an effect-junction rank | 6 |
| `general_to_force_own` junctions | 87 |
| Character-self junctions | 596 |

The six junctionless records are vows, preserved in inventory with `rankLevels=[]` and `maxRank=null`. They receive `NO_SOURCE_RANK`/`NO_EFFECT_JUNCTION`; they are not counted as multi-rank Skills and their campaign activation is not inferred.

| Classification | Skills | Effect junctions |
| --- | ---: | ---: |
| DIRECT | 3 | 10 |
| LIMITED | 3 | 2 |
| REVIEW_REQUIRED | 31 | 82 |
| UNSUPPORTED | 4 | 7 |
| NON_UNIT_STAT | 185 | 739 |

Skill and effect categories are independent. The three LIMITED Skills contain four DIRECT junctions together with unadmitted effects. A numeric character-self effect is `NON_UNIT_STAT` in the ordinary Unit projection domain, even when its bonus ID has a known numeric operation. Unsupported typed routes retain their raw bonus identity; unrecognized basic bonuses are not guessed from English names. Category precedence preserves all blockers, so category counts and blocker counts are not interchangeable.

The numeric classifier reuses previously reviewed bonus/path/operation pairs and checks the typed unit-set family, exact scope structure and flat/percentage localisation. The independent gate pins every exact DIRECT candidate, owner list, junction, raw value, typed route, stat, operation and main/land/Production target. A classifier label alone cannot create a projection. Mapping rules cover the previous leadership, melee attack/defence, armour, BvL, percentage charge/base/AP damage, upkeep, recruitment cost and range operations; no new operation or UnitStatPath is approved.

## Selector materialization

There are 27 selectors: 19 explicit unit sets, one land-class selector, two main-caste selectors, one mixed positive union and four conditional experience selectors. Twenty-three have static exact membership; four remain unresolved. Static membership does not claim observed runtime applicability or eliminate a selector's additional experience condition.

| Selector | Source main members | Production | Non-Production | Notes |
| --- | ---: | ---: | ---: | --- |
| `all_units` | 2,802 | 101 | 2,701 | 18 positive land classes; 176 main/land aliases, 4 land-only and 1 naval omission |
| `infantry_units` | 695 | 66 | 629 | Three main castes + four explicit main records; four branch overlaps deduplicated by main identity |
| `characters` | 1,406 | 0 | 1,406 | Character selector cannot project to ordinary Production Units |
| `lords` | 839 | 0 | 839 | Same domain restriction |
| `dlc07_brt_inf_battle_pilgrims` | 3 | 1 | 2 | Base, RoR and spawn contexts preserve separate identities |
| `dlc07_brt_knights_realm` | 2 | 1 | 1 | No RoR-to-base substitution |
| `dlc07_brt_foot_squires` | 2 | 1 | 1 | Exact Production intersection |

`membership.json` contains counts and exact dictionaries for all 27 selectors. Duplicate and ambiguous resolved identities are zero; raw identity collisions abort rather than become duplicate admissions. For unresolved selectors, `unresolved` counts unresolved applicability branches, not missing main/land identities. The four experience sets preserve 4, 5, 6 and 9 identifiable explicit source records in `sourceIdentityCandidates`; their conditional applicability remains unknown, so `exactMembers` and admitted Production lists stay empty. Separate candidate Production/non-Production counts prevent confusing identifiable records with verified effect membership. Their three companion RoR sets have 3, 1 and 2 exact members, all outside Production. Unconditional RoR branches do not authorize dropping the conditional branch of the same effect.

## Review of every DIRECT candidate

All ten DIRECT junctions were inspected; none is silently ignored by the gate. `review.json` records their full exact evidence, and replay requires equality of that complete candidate set.

| Skill / exact key | DIRECT junctions and operations | Decision |
| --- | --- | --- |
| Champions of Bordeleaux — `wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux` | `wh_dlc07_effect_force_stat_leadership_kotr`: +5 leadership; `wh_dlc07_effect_force_stat_bonus_vs_large_kotr`: +15 BvL | Existing complete admission, exact Alberic / Knights of the Realm |
| Aspiring Knights — `wh_dlc07_skill_brt_alberic_battle_aspiring_knights` | `wh_dlc07_effect_force_stat_leadership_foot_squires`: +5 leadership; `wh_dlc07_effect_force_stat_melee_attack_foot_squires`: +8 MA; `wh_dlc07_effect_force_stat_weapon_strength_increase_foot_squires`: +12% base and AP damage | Existing complete admission, exact Alberic / Foot Squires |
| Blessed Water — `wh_dlc07_skill_brt_fay_battle_blessed_water` | `wh_dlc07_effect_force_stat_charge_bonus_pct_battle_pilgrims`: +30% charge | Existing complete admission, exact Fay / Battle Pilgrims |
| Sacred Duty — `wh2_dlc07_skill_brt_fay_enchantress_special_1` | `wh2_main_effect_force_stat_melee_attack_grail_knights_guardians`: +5 MA; `wh2_main_effect_force_stat_melee_defence_brt_grail_knights_guardians`: +5 MD | HOLD_PARTIAL: recruit-rank junction +2 omitted-effect independence is unproved |
| Fount of Honour — `wh2_dlc07_skill_brt_louen_special_0` | `wh2_main_effect_skill_upkeep_cost_reduction_brt_knights_realm_questing_knights`: −25% upkeep | HOLD_PARTIAL: recruit-rank junction +2 omitted-effect independence is unproved |
| The People's Hero — `wh2_dlc14_skill_brt_repanse_the_peoples_hero` | `wh2_dlc14_effect_force_army_battle_all_infantry_attack`: +5 MA, exact infantry union | HOLD_PARTIAL: flat AP +3 operation, replenishment +5 path and omitted-effect independence are unproved |

Existing complete output: **3 Skills, 6 effect junctions, 7 Modifiers, 3 exact Skill/Unit targets and 3 unique Production Units**. New output: **0 Skills / 0 effects / 0 Modifiers / 0 Units**. No admitted class-derived or shared-owner Skill is added. The class-derived People's Hero DIRECT row is preserved but not projected.

`projection.json` is the exact full-source aggregate contract for the current Calculator registry. Replay compares all effects and Modifiers against the three actual app JSON imports, including raw values and the historical row pointers. It regenerates Modifier IDs and verifies exact main/land identities. The registry, UI, Modifier engine and transient selection code remain unchanged because no new admission passed. This preserves existing provenance rather than rewriting historical batches.

Automatic same-owner + same-Production-Unit pair intersection returns **NO VERIFIED MULTI-SKILL TARGET**. Thus there is no eligible new A+B stacking regression. Existing Research + Skill + Manual/on/off regression tests remain in the full suite. Cross-owner coincidence would not establish a valid shared army context.

## Partial admission decision

**Do not introduce partial Skill admission in this layer.** Distinct database junctions demonstrate separate storage, not a general engine contract that omitted effects cannot affect application or arithmetic. The prior Research partial-admission contract is not imported into Skills by analogy.

| Required condition | Finding |
| --- | --- |
| Separate exact effect junctions | Verified; identities and raw rows retained |
| No combined/prerequisite arithmetic dependency | Not established by the extracted DB references; runtime/engine independence proof absent |
| Omission cannot change DIRECT applicability or meaning | Not established, including recruit-rank state and People's Hero's other numeric effects |
| Explicit “verified effects only” UI | Implementable, but not introduced after the semantic gate failed |
| Exact omitted identities/reasons retained | Verified in `admission.json.heldDirectCandidates` |
| Replay checks exact omissions | Verified through full source, classification and output hashes |
| User cannot mistake subset for whole Skill | No partial selection is exposed; a future partial UI still needs separate review |

Exposure is three held Skills/four DIRECT junctions. A future policy change requires all seven conditions and a new reviewed integration. `coverage.json` reports this exposure separately from removal of one semantic blocker under the current whole-Skill policy; it is not a promised partial expansion.

## Blockers and next priority

The largest junction-level blockers are character-self scope 596, non-unit mechanic 590, multi-rank 546, owner/runtime availability 288, conditional level/grant 133, non-unit scope 122 and background availability 107. Counts overlap; summing them would overstate the universe. Operation/path examples include flat charge 15, resistance 10, replenishment 6, flat AP 1 and vigour 1. Every row retains additional blockers, not only a dominant reason.

`coverage.json.blockerRelief` removes exactly one blocker while keeping the whole-Skill policy and every other mapping, target, scope and owner requirement. It includes Skill-only blockers such as partial policy and missing junction rank. Known numeric mappings/targets remain prerequisites. This conservative counterfactual identifies reviewable candidates; it does not automatically approve new semantics or assume all 546 multi-rank junctions become usable.

The leading blocker is **MULTI_RANK_UNKNOWN**: 80 Skills / 546 junctions affected; solving only it opens **2 complete Skill candidates and 12 junction candidates (5 distinct effect keys)**. Ten junctions are within Low-Born Militia and Worshippers of the Grail, while two weapon-strength junctions in Glorfinial's Progeny still cannot admit that whole Skill because its flat-charge operation is unreviewed. See `NEXT_BLOCKERS.md` for risk and exact keys. Other single removals open zero complete Skills and zero already-mapped numeric junctions under this policy.

Unknowns remain: incremental vs replacement ranks, previous-rank deactivation, character-self projection, complex/exclusion/experience selector applicability, special/runtime availability and grants, partial independence, flat AP/charge, resistance/reload/ammunition/speed/missile-strength/recruit-time operations, vigour/replenishment/miscast paths, mounts and non-unit campaign/character mechanics. These are inventory findings, not new model fields.

## Storage and replay

The original extraction is 47,795,126 bytes. The lossless expanded source is 37,148,387 minified bytes; committed compact source is 11,450,140 bytes (about 69% smaller than the expanded payload). Source uses modal table defaults, field-index deltas, metadata/evidence dictionaries and row-index edges; decoding reconstructs the full exact payload/schema/provenance and requires canonical re-encoding.

Derived reports avoid repeated raw rows and join edges: inventory uses exact source pointers and foreign relation tuples; membership stores shared main identities once; classification stores exact targets once. Their expanded views are regenerated from source; inventory/classification expanded hashes are retained. Main and land keys, RoR status, branch proof identities and omitted contexts remain available. This is a bounded layer above existing artifacts; no historical artifact is recompressed or rewritten.

Core artifact sizes are in `manifest.json.artifactBytes` (approximately 18.6 MB total): source 11.45 MB, inventory 3.24 MB, classification 1.33 MB and membership 2.53 MB; admission/review/coverage/projection together about 75 KB. Scripts never load ignored generated files for ordinary replay. `--check-raw` is an optional local extraction verification only.

From an LF clean checkout with dependencies installed from the existing lockfile:

```powershell
node scripts/review-skill-production-bretonnia.mjs
node scripts/verify-skill-production-bretonnia.mjs
```

The second command runs the full production replay; Skill slice, batches 01/02, rank, owner and class-selector replays; all six Research replay commands; `npm test`; and `npm run build`. Existing historical byte contracts are retained; for a new Windows clone use `git -c core.autocrlf=false clone ...` so non-artifact historical files also keep their LF bytes.

## Verification and preservation

Local validation: **13 replay commands PASS; 533 tests PASS (517 previous + 16 new), no skips/failures; production build PASS**. Optional raw extraction verification passes. Build retains the existing Vite chunk-size warning. Negative tests cover fabricated DIRECT labels, unreviewed mapping/operation changes, source/schema/dictionary drift, collisions, multi-rank, conditional selectors, RoR substitution, exact owner/Unit/rank, unsupported paths, non-unit exclusions and baseline preservation.

An isolated clean snapshot copies only baseline tracked files plus this layer; it has no game/RPFM requirement, ignored extraction or prior generated/test-build output. Dependencies use the existing installed lockfile versions. All 13 replay commands and build pass there; tests have 526 passes and 7 existing optional ignored-input checks skipped, with no failures. Browser smoke is omitted under the requested zero-new-admission exception.

All 475 baseline files remain hash-protected, including **Production 101, Sample 5, HP 13, Speed 81, Research 10 technologies / 15 effects / 96 Modifier candidates**, the three admitted Skills and all batches/research/runtime evidence. No Unit model, backup schema, IndexedDB, comparison, engine or Calculator UI change. One local commit is produced; no push.
