# Bretonnia Skill batch-02

Baseline local main: `bf61a1212ca454db3f971b473c4f83c23e61cf81`.
Twelve additional actual skills; one new admission. Conclusion **B**: the existing
single-rank/exact-owner/own-force/explicit-membership pattern repeats, but missing
operation proof, shared owners, selectors and unsupported paths limit expansion.
No game execution, runtime probe, whole-faction effect scan or external wiki data.

## Selection and exact inventory

Bounded node metadata was inspected for Alberic, Fay Enchantress, Louen and Repanse.
The prior Alberic target overlap was searched first: selected Alberic special skills
are self/campaign effects; the own-force candidate touching Knights belongs to
Louen and has unsupported replenishment. Different commanders are not assumed to
apply own-force skills simultaneously. Two exact Fay skills share Battle Pilgrims,
but only one has previously reviewed operation semantics. This is a source overlap,
not an admitted multi-Skill combination. Selection is fixed in [selection.json](selection.json).

| Skill | Exact key | Exact owner subtype(s) | Max source rank | Classification |
| --- | --- | --- | --- | --- |
| Lead from the Front | `wh2_dlc07_skill_brt_alberic_special_0` | `wh_dlc07_brt_alberic` | 1 | SUPPORTED_WITH_LIMITATION |
| Coastal Expansion | `wh2_dlc07_skill_brt_alberic_special_1` | `wh_dlc07_brt_alberic` | 1 | NON_UNIT_STAT |
| Shipping Lanes | `wh2_dlc07_skill_brt_alberic_special_2` | `wh_dlc07_brt_alberic` | 1 | NON_UNIT_STAT |
| Appoint Reeves | `wh2_dlc07_skill_brt_alberic_special_3` | `wh_dlc07_brt_alberic` | 1 | NON_UNIT_STAT |
| Blessed Water | `wh_dlc07_skill_brt_fay_battle_blessed_water` | `wh_dlc07_brt_fay_enchantress` | 1 | DIRECT_SUPPORTED |
| Secrets of the Grail | `wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail` | `wh_dlc07_brt_fay_enchantress` | 1 | REVIEW_REQUIRED |
| The Army of the King | `wh_main_skill_brt_lord_unique_louen_the_army_of_the_king` | `wh_main_brt_louen_leoncouer` | 1 | UNSUPPORTED |
| Beloved Son of Bretonnia | `wh_main_skill_brt_lord_unique_louen_beloved_son_of_bretonnia` | `wh_main_brt_louen_leoncouer` | 1 | NON_UNIT_STAT |
| The People's Hero | `wh2_dlc14_skill_brt_repanse_the_peoples_hero` | `wh2_dlc14_brt_repanse` | 1 | SUPPORTED_WITH_LIMITATION |
| Eternal Errantry War | `wh2_dlc14_skill_brt_repanse_eternal_errantry_war` | `wh2_dlc14_brt_repanse` | 1 | NON_UNIT_STAT |
| Lionhearted | `wh_main_skill_brt_lord_battle_lionhearted` | eight shared subtype chains below | 1 | REVIEW_REQUIRED |
| Virtue of Empathy | `wh_main_skill_brt_lord_battle_virtue_of_empathy` | same eight shared subtype chains | 1 | REVIEW_REQUIRED |

Shared exact subtypes: `wh2_dlc14_brt_repanse`, `wh_dlc07_brt_alberic`,
`wh_dlc07_brt_fay_enchantress`, `wh_dlc07_brt_prophetess_beasts`,
`wh_dlc07_brt_prophetess_heavens`, `wh_dlc07_brt_prophetess_life`,
`wh_main_brt_lord`, `wh_main_brt_louen_leoncouer`. These remain evidence-only.
Ten exact-owner candidates have a legendary Lord subtype; the shared candidates
mix generic/legendary Lords. No generic subtype permission is inferred.

Skill counts: DIRECT 1 / LIMITED 2 / REVIEW 3 / UNSUPPORTED 1 / NON_UNIT_STAT 5.
Effect-row counts: DIRECT 1 / REVIEW 6 / UNSUPPORTED 1 / NON_UNIT_STAT 14 (22 rows).
Mixed effects remain separate in [review.json](review.json); LIMITED is not an app
admission status. All selected source ranks are 1. No multi-rank arithmetic or
Low-Born investigation was performed; the prior UNKNOWN rank policy is preserved.

Owner proof follows skill node → node-set item → node set → exact agent subtype /
agent → associated main → land → Loc. Owner and effect target are separate chains.
Each owner records exact node/set keys, enable state, restrictions and seven schema
joins. Display names come from actual Loc and never select identities.

## Scope and target inventory

| Exact scope | Exact source → target / location | Effect rows | App decision |
| --- | --- | --- | --- |
| `general_to_force_own` | character → force / forcewide_when_commanding | 7 | only exact reviewed membership/effects |
| `character_to_character_own` | character → character / character | 7 | no ordinary Unit projection |
| `character_to_faction` | character → faction / factionwide | 1 | evidence-only campaign effect |
| `faction_to_province_own` | faction → province / factionwide | 3 | evidence-only campaign effects |
| `faction_to_region_own_unseen` | faction → region / factionwide | 4 | evidence-only building effects |

All scope rows have ownership `yours`, territory `any`; their exact row payloads,
Loc, typed relations, selectors and main/land membership are preserved in review.
All 57 present schema-discovered effect-bonus tables were queried for the selected
effect identities; competing routes and empty matches are retained.

- Fay skills: exact `dlc07_brt_inf_battle_pilgrims` explicit set, three members,
  no experience filtering, category, class/caste selector or exclusion.
- Army of the King: `brt_knights`; `replenishment_percentage_bonus` has no current
  UnitStatPath, despite an own-force source and explicit members.
- People's Hero: `infantry_units` class selectors for AP damage +3 and melee attack
  +5, plus a basic replenishment route +5. Class names do not authorize membership.
- Alberic aura / Virtue: `all_units` class selectors combined with character-self.
  Neither aura effect becomes ordinary Unit leadership or a force-wide modifier.
- Other actual typed routes: unit abilities/attributes, basic bonuses, building
  sets and provincial initiative effect records. Their exact link rows and effect
  joins are recorded, but downstream application is not implemented or fabricated.

## Only new admission: Blessed Water

Exact skill `wh_dlc07_skill_brt_fay_battle_blessed_water` → node
`wh_dlc07_skill_node_brt_fay_enchantress_unique_09` → set
`wh_dlc07_skill_node_set_brt_fay_enchantress` → owner
`wh_dlc07_brt_fay_enchantress`. One enabled owner chain, no selectors, only source
level 1, no level-detail override/ancillary/dilemma/automatic-level criteria rows.

Exact effect `wh_dlc07_effect_force_stat_charge_bonus_pct_battle_pilgrims`:
raw 30, `general_to_force_own`, typed `effect_bonus_value_ids_unit_sets_tables`
bonus `charge_bonus`. Actual Loc:
`Charge bonus: %+n% for Battle Pilgrim and Grail Reliquae units`.
This repeats the existing reviewed charge-percent bonus in Research policy:
`charge_bonus` → `melee.chargeBonus` → `multiply` (percentage points).
No new stat path, mapping family or Skill arithmetic is added.

Exact explicit members (main and land are identical for each):

| Main key | Decision |
| --- | --- |
| `wh_dlc07_brt_inf_battle_pilgrims_0` | Production `ca_unit_wh_dlc07_brt_inf_battle_pilgrims_0`, admitted |
| `wh_dlc07_brt_inf_grail_reliquae_0` | TARGET_NOT_IN_PRODUCTION |
| `wh_pro04_brt_inf_battle_pilgrims_ror_0` | TARGET_NOT_IN_PRODUCTION |

Grail Reliquae and RoR are not substituted by similarly named Units.
Projection retains CA_SKILL provenance, exact effect/junction/target row IDs,
owner/main/land/node/set, source/original hashes and the unchanged static snapshot.

## Deferred overlap and other blockers

**NO VERIFIED MULTI-SKILL TARGET.** Secrets of the Grail has the same exact Fay
owner, scope and explicit members, raw 20, typed bonus
`unit_damage_resistance_magic_mod`, Loc `Spell resistance: %n% ...` and an existing
`defense.resistances.spell` path. These prove the target and percentage label, but
the current reviewed numeric operation policy does not establish add/set/multiply
semantics for this bonus. The batch does not invent resistance arithmetic to meet
the stacking goal. Its mappingCandidates are empty and it remains REVIEW_REQUIRED.
The Production Battle Pilgrims spell base is also absent; it is not defaulted to 0.

Lead from the Front combines a passive ability, self leadership aura and bodyguard
health modifier; none is an ordinary Unit modifier. Coastal Expansion, Shipping
Lanes and Appoint Reeves are campaign/building/edict effects. Beloved Son and
Eternal Errantry War enable abilities/attributes. Army of the King lacks a
replenishment path. People's Hero mixes class selectors and unsupported
replenishment. Shared Lionhearted/Virtue remain unadmitted self effects.
No shared-owner, multi-rank, self or class semantics were newly generalized.

## Calculator and model

The old schema, exact owner/rank adapter, transient selection and Modifier engine
are sufficient for the one new admission. Only the third independent projection
is registered. Calculator UI and its per-Unit single-Skill restriction are unchanged.
All three admitted Skills have disjoint Production targets; no overlapping fixture
or simultaneous different-commanders interpretation is introduced.

| Battle Pilgrims selection | Charge | MA / MD | Base / AP damage |
| --- | --- | --- | --- |
| Base | 18 | 32 / 33 | 25 / 6 |
| Blessed Water rank 1 | 23.4 | 32 / 33 | 25 / 6 |
| + Master Swordsmiths + Encourage Fanaticism | 23.4 | 37 / 38 | 28 / 6.72 |
| + Manual flat charge +2 | 26 | 37 / 38 | 28 / 6.72 |
| Skill off, Research + Manual retained | 20 | 37 / 38 | 28 / 6.72 |
| Research/Skill off, Manual retained | 20 | 32 / 33 | 25 / 6 |

Charge `(18 + 2) × 1.30 = 26` uses the existing flat-before-percent contract,
not a newly claimed game stacking rule. On/off restores 26→20→26. Breakdown labels
remain CA_RESEARCH, CA_SKILL, MANUAL. Unknown stays unknown and numeric zero stays
numeric. Only Manual rows enter Profiles/backups; browser smoke does not save them.
Negative owner/rank/effect/scope/identity/version and non-Production membership
changes are rejected. Peasant/Knights/Foot Squires do not receive Blessed Water.
Existing Alberic/Research regressions continue through the original projections.

## Source chain, reproducibility and preservation

Actual ignored extraction: `generated/wh3/skill-batch-02/raw.json`, SHA256
`a86ce636f8232f085d44e3e5482c8984cfa4c3bb4e3bbce9266f3acf08b85085`.
Committed source SHA256:
`b4829eb640ef94deef53f105fdd1da47697b41ebacabb4954b80b609d9ade0de`.
Processed schema hash:
`2656907c264b9d5a43ad959100ac3f16990adc674eb7daad0ab78c8721906f1a`.
Static snapshot:
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
WH3 9.0.2.0 / RPFM 5.1.0 / schema format 5; same CA schema/db.pack/local_en.pack
hashes as the previous batches. 313 unique DB/Loc rows and 77 processed schemas.
Game version came from the executable version resource; executable was not run.

`Actual extraction → source → deterministic review → explicit admission → separate
caSkillBatch02.json → fixed registry → existing Calculator engine`.
No raw source parsing in the browser. Batch 01/02 independently replay their own
immutable source/output pins. Registry order fixes app composition. `--write`
writes only this batch's already pinned review/admission/projection outputs;
new extraction does not replace approved evidence automatically.

```powershell
# Optional local actual pack extraction, writes ignored output only
node scripts/extract-skill-batch-02.mjs
# Clean checkout, no game/RPFM/generated required
node scripts/review-skill-batch-02.mjs
node scripts/review-skill-batch-01.mjs
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

Old Skill source/review/admission/manifests and app projections are byte-preserved.
The historical batch test forwards only the reviewed adapter registry hash through
a new explicit before→after helper; old manifest hashes are never refreshed.
Production 101 / Sample 5 / HP 13 / Speed 81, values/order/identity, Research
10 technologies / 15 effects / 96 candidates, diagnostic/runtime data, manual
Profiles, IndexedDB schema, backup format, comparison and engine remain unchanged.
The new manifest pins the prior data/contracts and batch artifacts.

## Validation

- Actual ignored extraction → committed source equality and original extraction
  hash: PASS. Duplicate/conflicting payload/reference/schema and admission identity,
  owner/rank/level/effect/raw/scope/target/membership/pack/snapshot/digest drift tests:
  PASS. Unsupported/deferred Skills never enter the app projection.
- Skill batch 02, batch 01, original Skill slice and all six Research
  admission/classifier/scan/mapping/scope/historical projection replays: PASS.
- `npm test`: **490/490 PASS**. `npm run build`: PASS (existing chunk-size warning).
- Fresh clean source snapshot, no game configuration/RPFM/generated/`.git`, only
  installed dependencies linked: nine replays PASS, **486 tests PASS / 4 local-only
  extraction tests SKIP**, TypeScript and Vite builds PASS.
- Browser: Blessed Water exact owner/rank/percentage, Research + Skill + Manual
  charge26, base damage28, melee attack37, off/on charge26→20→26, three source
  labels and Peasant Skill absence: PASS. 320px viewport body/root widths305px,
  source key/hash wrapping: PASS. Ignored proof images `mobile.png`, `stacking.png`
  under `generated/wh3/skill-batch-02/`. No browser Profile save/delete, backup
  restore or personal-data edits; test tab closed and viewport override reset.
- No Production/HP/Speed/Research/old Skill artifact changes. Comparison, manual
  profile/IndexedDB/backup, runtime/CCO and historical production regressions remain
  in the passing full suite.

Changed files (15): this directory's eight selection/source/review/admission/
manifest/report/review.mjs/protected.mjs files, extraction and replay scripts,
`src/data/caSkillBatch02.json`, the two-line registry addition in
`src/domain/caSkillEffect.ts`, new `tests/ca-skill-batch-02.test.cjs`, the old batch
test's explicit adapter-hash forwarding import and README. Calculator/Unit schema,
engine, old data/evidence and Research code/artifacts are unchanged.
