# Bretonnia Character Skill batch-01

Baseline local main: `183b425497ed9db2c82b57297321090699f704f9`.
Remote main was read-only verified at `2284181f3542fed28111e2a0b86758c343c3ad34`;
the prior local Skill commit had not been pushed. No fetch/reset/push was performed.

Seven actual selected skills, including the original regression anchor. Preliminary
selection used node metadata for generic Bretonnian Lord/Paladin and the prior
bounded legendary-Lord discovery. Only these seven skills' effect chains were
extracted. Reverse references revealed shared owners; this is not a full faction
skill scan or owner-roster admission. [selection.json](selection.json) fixes the scope.

## Inventory and classification

| Skill | Exact key | Owner pattern/count | Max source rank | Skill classification |
| --- | --- | --- | --- | --- |
| Champions of Bordeleaux | `wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux` | Alberic / 1 | 1 | DIRECT_SUPPORTED; original projection preserved |
| Aspiring Knights | `wh_dlc07_skill_brt_alberic_battle_aspiring_knights` | Alberic / 1 | 1 | DIRECT_SUPPORTED; only new admission |
| Low-Born Militia | `wh2_dlc11_skill_brt_army_buff_low_born_militia` | shared generic/legendary Lords / 8 | 3 | REVIEW_REQUIRED |
| Basic Training | `wh_main_skill_brt_lord_battle_basic_training` | same eight Lords | 1 | UNSUPPORTED |
| Lady’s Mantle | `wh_main_skill_brt_all_unique_ladys_mantle` | shared Lord/Hero subtypes / 14 | 1 | REVIEW_REQUIRED |
| Pegasus | `wh_main_skill_brt_champion_unique_paladin_pegasus` | generic Paladin / 1 | 1 | NON_UNIT_STAT |
| Fount of Honour | `wh2_dlc07_skill_brt_louen_special_0` | Louen / 1 | 1 | SUPPORTED_WITH_LIMITATION; deferred |

Skill counts: DIRECT 2 / limited 1 / REVIEW 2 / UNSUPPORTED 1 / NON_UNIT_STAT 1.
Classification per rank/effect row: DIRECT 6 / REVIEW 6 / UNSUPPORTED 1 /
NON_UNIT_STAT 2 (15 rows, 12 distinct effect keys). Fount's mixed effects are not
collapsed into one effect status. These are reviewed exact identities, not a
generic prefix/category classifier.

## Owner trace is separate from effect target

For every selected skill: `character_skill_nodes.character_skill_key` → skill;
node → `character_skill_node_set_items.item` → `.set` → node set →
`agent_subtype_key` and `agent_key`. Then subtype's `associated_unit_override` →
main → exact land → owner display Loc. Membership enable/visible state and
campaign/faction/subculture selectors remain explicit. Reverse selected-skill node
queries and node-item queries retain complete coverage. Owner is not inferred from
the skill's display name or prefix. `auto_generate`, `recruitment_category` and
associated main's `caste` distinguish generic Lords/Heroes from specific subtypes.

Alberic `wh_dlc07_brt_alberic` is a legendary Lord with `general` agent type.
Paladin `wh_main_brt_paladin` is auto-generated, agent `champion`, main caste `hero`.
Louen `wh_main_brt_louen_leoncouer` is a specific legendary Lord. Low-Born Militia
and Basic Training share these eight exact subtype owners:

- `wh_main_brt_lord`
- `wh_main_brt_louen_leoncouer`
- `wh_dlc07_brt_alberic`
- `wh_dlc07_brt_fay_enchantress`
- `wh2_dlc14_brt_repanse`
- `wh_dlc07_brt_prophetess_beasts`
- `wh_dlc07_brt_prophetess_heavens`
- `wh_dlc07_brt_prophetess_life`

Lady's Mantle has fourteen enabled owner chains: all above except the Fay
Enchantress, plus `wh_main_brt_paladin`, `wh_main_brt_damsel_heavens`,
`wh_dlc07_brt_damsel_beasts`, `wh_dlc07_brt_damsel_life`,
`wh2_dlc14_brt_henri_le_massif`, `wh2_dlc11_cst_ghost_paladin` and
`wh2_dlc13_emp_hunter_rodrik_l_anguille`. The latter shared records demonstrate
that a Bretonnia-associated skill name does not establish faction exclusivity.
They are source reverse references only; no character database/selector is added.
All exact owner/main/land/node/set keys and joins are in [review.json](review.json).

## Multi-rank: raw storage proven, application still UNKNOWN

Low-Born Militia has five exact `character_skill_level_to_effects_junctions_tables`
rows (no level-detail override for this skill). It changes the effect set:

| CA level | Leadership raw | Melee defence raw | Replacement hypothesis | Incremental hypothesis |
| --- | --- | --- | --- | --- |
| 1 | 4 | absent | +4 / absent | +4 / absent |
| 2 | 4 | 4 | +4 / +4 | +8 / +4 |
| 3 | 6 | 6 | +6 / +6 | +14 / +10 |

Exact effect keys:
`wh2_dlc11_effect_force_stat_leadership_peasant_mob_men_at_arms_spear_at_arms` and
`wh2_dlc11_effect_force_stat_melee_defence_brt_peasant_mob_men_at_arms_spear_at_arms`.
Both join exact scope, effects, typed bonus IDs and the same explicit unit set.

The two right columns are alternative calculations, not approved game behavior.
Neither processed schema's level/value descriptions nor selected level-detail rows
specify whether lower levels stay active. No trusted engine/runtime application
proof was found in the current selected evidence. Mixed raw effect sets do not
prove mixed application or incremental stacking. All five rows remain REVIEW;
no rank 2/3 UI or Modifier is generated. Source max rank 3 means maximum observed
CA effect level, not an inferred engine maximum from a name or tree tier.

All other sampled skills have only level 1 and use that value once. Level-details
for Lady's Mantle/Pegasus (model unlock rank 7) and Fount (9) are recorded separately
from skill rank. No visual tree tier is converted into an unlock requirement.

## Scopes, targets and effect mapping

| Exact scope | Exact record meaning | Rank/effect occurrences | Current boundary |
| --- | --- | --- | --- |
| `general_to_force_own` | source character; target force; location forcewide_when_commanding; ownership yours; territory any | 13 | exact commander + explicit membership only |
| `character_to_character_own` | source/target character; location character; ownership yours; territory any | 2 | separate self context, no ordinary Unit projection |

`general_to_force_own` matches the first Skill record independently of Research.
The self scope is not treated as factionwide, force-wide or interchangeable.
Each selected effect was queried through all 57 schema-discovered present
`effect_bonus_value_*` tables; target alternatives and zero matches are preserved.

| Skill/effect | Actual target relation | Numeric interpretation / decision |
| --- | --- | --- |
| Champions: BvL, leadership | `effect_bonus_value_ids_unit_sets` → `dlc07_brt_knights_realm` → two explicit main members | existing +15 / +5; original admission unchanged |
| Aspiring: leadership, melee attack, weapon strength | same relation table → `dlc07_brt_foot_squires` → two explicit main members | `morale` add 5; `melee_attack_mod` add 8; exact base/AP mult bonus IDs each +12% |
| Low-Born: leadership, melee defence | `wh2_dlc11_brt_peasant_mob_men_at_arms_spear_at_arms` → six explicit main members | supported stat-path candidates, but rank application unknown |
| Basic Training: vigour loss reduction -15 | `unit_fatigue_resistance_mod` → `all_units` → eighteen class selectors | no existing vigour path; selector not expanded |
| Lady's Mantle: missile resistance 10 | `unit_damage_resistance_missile_mod` → same class-selector set, combined with self scope | not projected to the chosen Production Unit merely because a resistance path exists |
| Pegasus: value 1 | no target route in the 57 inspected typed effect-bonus tables; self scope; exact Loc says Mount: Pegasus | nonnumeric mount unlock; downstream typed application route unresolved, not inferred |
| Fount: recruit rank 2 | `unit_xp_mod` → Knights Realm and Questing unit sets | NON_UNIT_STAT, no recruit-rank Unit path |
| Fount: upkeep -25 | `upkeep_mod` → same two explicit sets | reviewed `campaign.upkeep` multiply -25 candidate; mixed skill not admitted |

`all_units` is a key, not proof of all Unit membership: its actual eighteen class
selectors are preserved without roster inference. Scope and membership are always
separate. None of this evidence authorizes a generic all-army target.

New exact Aspiring mappings reuse existing bonus/path/operation semantics from
Research. Actual CA Loc says leadership/melee attack `%+n`, weapon strength
`%+n%`; typed bonus relations split weapon strength into base and AP percentages.
No effect-family naming heuristic or broad whitelist expansion was added.
The processed schema references the bonus-ID domain, but this snapshot does not
provide that domain as a separate DB table. Mapping proof uses actual junction IDs,
Loc and prior reviewed bonus semantics; no missing definition row is fabricated.

## Admission and model assessment: B

Only Aspiring Knights is newly approved: rank 1, Alberic's exact enabled node/set,
three effect keys → four Modifiers, scope exact commanding own force.
Its target definition disables experience filtering and has no special category,
selectors or exclusions. Explicit members:

- `wh_dlc07_brt_inf_foot_squires_0` → same land; Production
  `ca_unit_wh_dlc07_brt_inf_foot_squires_0`.
- `wh_pro04_brt_inf_foot_squires_ror_0` → same land; preserved omission
  `TARGET_NOT_IN_PRODUCTION`.

Champions remains its separate byte-identical original projection. Low-Born,
Basic Training, Lady's Mantle, Pegasus and Fount stay evidence/review only. Even
Fount's supported upkeep effect does not silently create a partial app admission.

The current projection already has ranks/effects arrays, enough to store raw rank
structure, but the old adapter only accepted one exact owner and rank 1. There is
no verified accumulation policy, shared-owner selection, partial-effect admission
or multi-scope resolver. Minimal implemented change: a registry of the two
separately approved single-rank projections; exact applicability and rank checks
use each projection. Rank options derive from admitted ranks; multi-rank sources
remain unselectable. All admitted entries still have one legendary Lord owner.

Conclusion **B: some patterns repeat**. Single-level exact owner + explicit main
membership + own-force scope + established numeric bonuses are repeatable.
Multi-rank, shared-owner, self and class-selector interpretation require separate
proof/policy before a classifier can safely approve them. No generic importer,
owner roster, owner selector or skill tree was implemented.

Both currently admitted skills have disjoint target Units, so multiple-skill
stacking has no real applicable case. No synthetic overlap fixture or simultaneous
different-commanders assumption was introduced.

## Calculator regression

Foot Squires base leadership 70, melee attack 28, base/AP damage 9/26:

| Selection | Leadership | Melee attack | Base/AP damage |
| --- | --- | --- | --- |
| Off | 70 | 28 | 9 / 26 |
| Aspiring rank 1 | 75 | 36 | 10.08 / 29.12 |
| Master Swordsmiths + Aspiring | 75 | 36 | 11.16 / 32.24 |
| Above + Manual base damage +8 | 75 | 36 | 21.08 / 32.24 |
| Skill off, Research + Manual kept | 70 | 28 | 19.04 / 29.12 |

The existing engine sums percentages to 24%; flat +8 applies before percentages.
These are the established Calculator rules, not newly asserted game stacking.
Rank off/on restores deterministic values. Breakdown separates CA_RESEARCH,
CA_SKILL and MANUAL. Percent labels now show `%` for the new multiply effects.
Research and Skill selection remain transient; only manual rows enter Profiles.

Negative cases: Aspiring is absent on Knights of the Realm and Peasant Mob; wrong
owner/skill/rank/version is rejected. Champions on Knights remains leadership
75→80 and BvL 12→27. Unknown stays unknown, and numeric zero is still modified.

## Provenance, replay and preservation

Actual ignored extraction: `generated/wh3/skill-batch-01/raw.json`, SHA256
`95b0d7ddff4b89e6cbb67602ddd8d3249bc95cab115c235c803c970bf913fe21`.
Committed source (294 unique rows, 77 schemas):
`10deb6dc2af0dde5de24d92716ffec4cf3ce880c0cac93ffd17fe507410d8e4e`.
Processed schemas:
`2656907c264b9d5a43ad959100ac3f16990adc674eb7daad0ab78c8721906f1a`.
Static snapshot:
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
WH3 9.0.2.0 / RPFM 5.1.0 / schema format 5 and exact schema/db.pack/local_en.pack
hashes are carried through committed source and app projection. The game was not run.

`CA source → review.json (inventory, owner/rank/scope/target/mapping/classification)
→ manifest-pinned admission.json → src/data/caSkillBatch01.json → existing engine`.
Raw rows are not interpreted in the browser. Replay pins source/original/schema/
snapshot/Units and all three output hashes; mutation requires explicit new review.

```sh
# Local actual CA-pack extraction only (requires configured RPFM/game pack access)
node scripts/extract-skill-batch-01.mjs
# Clean replay, no game/RPFM/generated required
node scripts/review-skill-batch-01.mjs
node scripts/review-skill-slice-01.mjs
node scripts/admit-bretonnia-research.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/scan-bretonnia-research.mjs
node scripts/review-research-mappings.mjs
node scripts/review-research-scopes.mjs
npm test
npm run build
```

`projectExtraction` is deterministic for identical extraction bytes; the original
timestamp/hash remain part of capture identity. A new extraction does not replace
reviewed source automatically. Replay's `--write` writes only the three pinned
Skill outputs after admission succeeds.

44 prior data/source/engine/repository contract files are byte-pinned in the new
manifest; old Skill and Research artifacts are untouched. Existing protected-file
checks extend their explicit Calculator/mapping replay before→after chain through
a new batch helper, without rewriting old manifests. Research classifier/policy/
scan/admission and 10/15/96 projection remain unchanged. Production 101 / Sample 5 /
HP 13 / Speed 81, Unit order, diagnostic/runtime evidence, comparison, IndexedDB
schema and backup format remain unchanged. No Personal Profile is written in smoke tests.

## Final validation and changed files

- Local actual extraction → committed source equality and original extraction SHA:
  PASS (the optional local integration test).
- Skill batch review/admission/projection, original Skill slice, existing Research
  admission/classifier/full scan/mapping/scope/historical projection replays: PASS.
- `npm test`: 483/483 PASS; `npm run build`: PASS (existing bundle-size warning).
- Fresh clean source snapshot with no `.git`, `generated`, game config or RPFM:
  all eight replay commands PASS, 480 tests PASS / 3 local-only extraction tests
  skipped, TypeScript and Vite builds PASS. Only installed dependencies were linked.
- Browser: new Skill off/on, Research+Skill+Manual base damage
  21.08→19.04→21.08, three source labels, old Champions leadership80/BvL27,
  Peasant Skill absence and 320px PASS. Body/root width305px at viewport320px.
  Ignored screenshots: `generated/wh3/skill-batch-01/mobile.png`, `stacking.png`.
  No saved Profile or personal data changes; test tab closed and viewport reset.
- Fail-closed mutation tests cover admitted skill/owner/rank/level/effect/raw/scope/
  target/membership/schema/pack/snapshot/source hashes and output/subset drift.
  Unsupported, self, mixed deferred and multi-rank inputs stay out of app data.

Changed files: this directory's selection/source/review/admission/manifest,
`review.mjs`, `protected.mjs` and this report; `scripts/extract-skill-batch-01.mjs`,
`scripts/review-skill-batch-01.mjs`, `src/data/caSkillBatch01.json`,
`src/domain/caSkillEffect.ts`, `src/pages/CalculatorPage.tsx`,
`tests/ca-skill-batch.test.cjs`, README. Existing Research mapping/scope replay
scripts and classifier/scan/mapping/scope tests change only their protected-file
verifier import; the historical Skill and Research source artifacts remain untouched.
