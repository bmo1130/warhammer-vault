# Champions of Bordeleaux: first CA Skill slice

Baseline: `2284181f3542fed28111e2a0b86758c343c3ad34` (local and remote main verified equal).
One actual Bretonnia skill, two effects, two modifiers, one Production target.
This slice does not introduce a generic skill classifier, skill tree or character roster.
Candidate selection and bounded alternatives are recorded in [selection.json](selection.json).

## Exact owner, rank and scope

- Skill: `wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux`.
- Owner: Alberic de Bordeleaux, `wh_dlc07_brt_alberic`.
- `character_skill_nodes_tables.character_skill_key` → skill; node
  `wh_dlc07_skill_node_brt_alberic_unique_12` → set item →
  `wh_dlc07_skill_node_set_brt_alberic` → `agent_subtypes_tables` exact owner.
- Owner agent `general`, recruitment category `legendary_lords`, recruitable true;
  associated main/land `wh_dlc07_brt_cha_alberic_bordeleaux_0`, caste `lord`.
  Frontend faction leader joins prove Bordeleaux/Bretonnia affiliation. This is
  a particular legendary Lord, not a generic Lord/Hero permission. The static
  campaign/subtype relation includes `wh3_main_combi`; no campaign exclusivity
  or full playable-character roster is inferred.
- Complete reverse skill→node and node→set-item queries each return one row.
  Neither set nor node has a faction/subculture/campaign selector; node is visible
  and the owner set item is enabled.
- Two `character_skill_level_to_effects_junctions_tables` rows, both exact level 1.
  Complete queries find no level-detail override, ancillary, dilemma or automatic
  level-reached criteria. Max admitted rank = 1; values are used once, with no
  multi-rank stacking interpretation. UI rank 0 means absence of a selection,
  never a CA level. `unlocked_at_rank=0` is preserved; visual node tier is not
  interpreted as a character-level requirement.
- Separately reviewed `campaign_effect_scopes_tables` record:
  `general_to_force_own`, location `forcewide_when_commanding`, ownership `yours`,
  source `character`, target `force`, territory `any`.
  Calculator selection explicitly assumes this exact owner commands their own
  force. It is not character-self, local-region or factionwide. Research scope
  permissions are not inherited.

## Effects, targets and mapping

| Exact effect key | CA bonus ID | Level/raw | Existing path / operation |
| --- | --- | --- | --- |
| `wh_dlc07_effect_force_stat_bonus_vs_large_kotr` | `damage_vs_large_entities` | 1 / 15 | `melee.damage.bonusVsLarge` / add 15 |
| `wh_dlc07_effect_force_stat_leadership_kotr` | `morale` | 1 / 5 | `defense.leadership` / add 5 |

Each junction joins exact skill, effect and scope records. Each effect has exactly
one `effect_bonus_value_ids_unit_sets_tables` relation to `dlc07_brt_knights_realm`.
All 57 schema-discovered effect relation tables were queried for these two exact
effects to exclude competing target routes. Localisation is display/validation
evidence, not a join or target inference.

`unit_sets_tables` explicitly disables experience-range filtering and has no
special-category selector. Complete membership query returns exactly two positive
main-record members, without caste/category/class selectors or exclusions:

| Main key | Land key | Admission |
| --- | --- | --- |
| `wh_main_brt_cav_knights_of_the_realm` | same exact key | Production `ca_unit_wh_main_brt_cav_knights_of_the_realm` |
| `wh_pro04_brt_cav_knights_of_the_realm_ror_0` | same exact key | `TARGET_NOT_IN_PRODUCTION`; source/joins preserved |

Grail Knights and Peasant Mob are negative applicability cases. No cavalry,
faction roster or display-name generalization is used.

## Evidence and replay

`source.json` stores 32 selected DB/Loc rows, 81 processed schema definitions,
exact relationships, query completeness and CA pack provenance. The large local
discovery/extraction outputs remain ignored. No raw DB interpreter is shipped
to the app.

Hash chain (SHA256):

- Original actual extraction `generated/wh3/skill-slice-01/raw.json`:
  `40d23b49310b7fb0ac8bd105d857caaee9269aa0fad918d3bccb967d0c52b9bb`.
- Committed source:
  `11f0e4088f6d3cbe3d46e7bbd4a240f3e21bc7250c6e0b8f0894f3393c2d4f27`.
- Processed schema dictionary:
  `1780491e25d087e78c81d484354e6571619c93f62ba2eefb5d694984931d087e`.
- Static snapshot:
  `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

WH3 9.0.2.0 / RPFM 5.1.0 / schema format 5 and exact schema/db.pack/local_en.pack
hashes are preserved in source/projection provenance. Game version was read from
the executable's version resource; the game executable was not run.

`source → reviewSkill → manifest-pinned admission → src/data/caSkillEffect.json →
skillModifiers → existing Modifier engine`.

[review.json](review.json) contains owner/rank/effect/scope/target joins.
[manifest.json](manifest.json) pins source, original extraction, schema dictionary,
snapshot, unchanged Unit bytes and all deterministic review/admission/projection
outputs. [admission.json](admission.json) explicitly approves only level 1, the two
effects and the one Production identity; the RoR omission is retained.

```sh
node scripts/review-skill-slice-01.mjs
node scripts/admit-bretonnia-research.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/scan-bretonnia-research.mjs
npm test
npm run build
```

The Skill replay checks both evidence review and admission/projection bytes.
`--write` regenerates these three outputs only after pinned validation succeeds.
All production replay uses committed source; game, RPFM and ignored raw outputs
are not required. Only original extraction is a local static integration step.

## Calculator and regression contract

Character Skills is separate from WH3 Research. Exact owner and commanding-own-force
condition remain visible; rank 0/1 is transient. Read-only details expose keys,
source hashes, snapshot, scope and admitted mappings. Breakdown labels distinguish
`CA_SKILL`, `CA_RESEARCH` and `MANUAL`. App metadata uses `CA_SKILL`; the adapter uses
the existing Modifier `lord_skill` / `lord_army` contract with exact owner conditions.
The existing engine is unchanged; all sources use its SET/flat/percent rules.
This is a scenario calculator, not a resolver for live army ownership.

Knights of the Realm leadership 75 / bonus-vs-large 12:

| Scenario | Leadership | Bonus vs large |
| --- | --- | --- |
| Base / rank 0 | 75 | 12 |
| Skill rank 1 | 80 | 27 |
| Blinker Hoods + Skill | 85 | 27 |
| Blinker Hoods + Skill + Manual leadership +8 | 93 | 27 |
| Skill disabled, Research + Manual retained | 88 | 12 |

No selection returns the previous Research+Manual result unchanged. Profiles,
IndexedDB version and backup format retain manual-only data. Mutation coverage
rejects rank/skill/owner/effect/raw/scope/membership/schema/pack/snapshot/digest drift,
duplicate conflicting rank rows and rehashed semantic mutations. Unknown base
remains unknown and numeric zero remains numeric.

Existing Research 10 technologies / 15 effects / 96 candidates and projection
bytes are unchanged. The old Research protected-file manifest remains untouched:
the Skill manifest extends only Calculator and mapping replay integration hashes
through an explicit prior-before/prior-after/current-after chain. Historical test
and replay entry points use that small forward verifier; classifier/whitelist/
scan/admission source artifacts are unchanged.

Production 101 / Sample 5 / HP populated 13 / Speed populated 81 remain unchanged.
Unit JSON, comparison, engine, runtime/diagnostic evidence, personal data and backup
source files retain their prior bytes. No Unit admission or new runtime probe.

## Final validation

- Actual selected RPFM extraction → committed source: original SHA and all 32 rows,
  relationships, completeness, provenance and discovered relation tables equal.
- Skill review/admission/projection byte replay PASS.
- Existing Research admission, classifier, full scan, historical projection,
  mapping review and scope review replays PASS.
- `npm test`: 474/474 PASS. `npm run build`: PASS (existing bundle-size warning).
- Fresh clean source snapshot without `.git`, `generated`, local config or game/RPFM:
  all seven replay commands PASS; 472 tests PASS / 2 existing local-extraction tests
  skipped; TypeScript and Vite builds PASS. Only installed dependencies were linked.
- Browser: Skill off/on, Research + Skill, three-source stacking, rank 1→0→1
  leadership 93→88→93, and Peasant Mob Skill absence PASS. No Profile was saved or
  personal data changed. At 320px, body/root scroll width 305px (viewport 320px),
  with long source keys/hashes wrapping and result table scrolling internally.
  Ignored proof screenshots: `generated/wh3/skill-slice-01/mobile.png`, `stacking.png`.
