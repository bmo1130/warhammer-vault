# Bretonnia research batch 01 · bounded generalization review

Baseline local/remote `main`: `943f7706e6163f114af02e0c76a6715958b83ada`.
Eight intentionally varied technologies were inspected, including the existing
Regular Tournaments anchor. No other technology is imported or admitted.

## Candidate and admission results

All keys below have the prefix `wh_dlc07_tech_brt_economy_`. Names come from exact
`technologies_onscreen_name_<key>` entries in `local_en.pack`.

| Name / key suffix | Technology classification | Observed effects | App targets |
| --- | --- | --- | ---: |
| Regular Tournaments / `industry_tournaments` | DIRECT_SUPPORTED | attack +5, defence +5 | original Grail Knights context only: 1 |
| Blinker Hoods / `farm_hoods` | DIRECT_SUPPORTED | charge +10%, leadership +5 | 7 explicitly reviewed Knight main records |
| Master Swordsmiths / `industry_swords` | DIRECT_SUPPORTED | weapon strength +12%, separate base/AP bonus rows | 7 Knight + 4 sword-infantry main records: 11 |
| Encourage Fanaticism / `other_fanaticism` | SUPPORTED_WITH_LIMITATION | attack +5, defence +5; two target sets overlap on Grail Reliquae | DIRECT effects on exact Battle Pilgrims: 1 |
| Subsidised Tools / `other_3` | SUPPORTED_WITH_LIMITATION | Peasant Mob attack +10 / recruitment cost −10%; infrastructure cost −5% | DIRECT unit effects on exact Peasant Mob: 1 |
| Seamstresses / `industry_4` | AMBIGUOUS | industry income +10%; all-land recruitment cost −10% | 0 |
| Irrigation Ditches / `farm_3` | SUPPORTED_WITH_LIMITATION | farm income +3%; infantry upkeep −5% | 0 |
| Siege Engineering / `other_siege` | UNSUPPORTED | missile strength +10%; reload-time reduction +15%; siege/encircling leadership +5 | 0 |

**Admission is effect-and-exact-target level**, not an assertion that every
effect of a mixed technology is supported. Only DIRECT_SUPPORTED effects enter
the projection. The 2 mixed technologies expose their supported numeric subset;
Subsidised Tools explicitly lists its excluded NON_UNIT_STAT effect in the UI.
Encourage Fanaticism admits Battle Pilgrims only; overlapping Grail Reliquae
membership is outside the Production catalog and is not silently deduplicated
or double-applied. Its broader classification remains limited.

The 17 effect occurrences classify as **9 DIRECT_SUPPORTED / 2
SUPPORTED_WITH_LIMITATION / 2 AMBIGUOUS / 1 UNSUPPORTED / 3 NON_UNIT_STAT**.
The app receives **5 research names / 21 exact research-unit contexts / 42
Modifiers**, across 12 existing Production units. Regular Tournaments retains
its original source/review hashes, exact Modifier IDs, values and Grail target.

## Exact trace and applicability observations

All selected nodes point to `technology_node_sets_tables.key=brt_mil`, which
references `cultures_tables.key=wh_main_brt_bretonnia`. No node/node-set
campaign/faction restriction is present in this snapshot. Selection declares a
completed research for the owning Bretonnian faction; no unlock/save resolver
is implemented.

Repeated numeric chain:

```text
technology_nodes → technologies
technology_effects_junctions.technology → technologies.key
technology_effects_junctions.effect → effects.effect
technology_effects_junctions.effect_scope → campaign_effect_scopes.key
effect_bonus_value_ids_unit_sets.effect → effects.effect
effect_bonus_value_ids_unit_sets.unit_set → unit_sets.key
unit_set_to_unit_junctions.unit_record → main_units.unit
main_units.land_unit → land_units.key
```

Each relationship is checked against processed schema references and stored
relationship IDs. Unit-set membership is **main**, not land identity. Peasant
Mob proves why these cannot be conflated:

- main: `wh_dlc07_brt_peasant_mob_0`
- land: `wh_dlc07_brt_inf_peasant_mob_0`

Seven target sets were inspected in full: `brt_knights`, `brt_sword_inf`,
`brt_reliquae`, `dlc07_brt_inf_battle_pilgrims`, `wh_dlc07_peasant_mob`,
`brt_trebuchets`, `infantry_units`. `review.json` records complete membership
row references, explicit Production intersections, and selectors separately.
Only the **explicit selected target lists in policy.json** can be projected.
Replays never expand a set or discover new eligible units.

Observed boundaries:

- Explicit records can support a bounded exact Unit mapping when exclude is
  false, caste/category/class selectors are empty and experience/special-category
  restrictions are disabled.
- One main record may belong to several sets. Grail Reliquae belongs to both
  `brt_reliquae` and `dlc07_brt_inf_battle_pilgrims`, with the same bonus IDs.
  Selected targets matching more than one same-bonus set are rejected.
- Include and exclude rows exist. The retained reverse Grail query includes
  `all_units_excluding_immune_to_psychology` with `exclude=true`; this witness
  is not used as an admitted target set.
- `infantry_units` mixes three caste predicates with explicit records. The
  batch does not implement their selector/union precedence.
- Scope and target set are independent. The owning faction's forces do not
  imply that every Unit is a member of the effect's target set.
- A technology can mix different targets: Subsidised Tools has a unit-set
  force effect and a region infrastructure effect; Seamstresses mixes region
  income and a force basic bonus. Master Swordsmiths has two sets and separate
  base/AP bonus IDs. Thus one research cannot be mapped as one scalar effect.

Positive Grail cases: Regular Tournaments, Blinker Hoods, Master Swordsmiths.
Negative exact-set cases: Encourage Fanaticism and Subsidised Tools do not
include Grail Knights. Other withheld technologies are **not admitted**, rather
than claimed universally inapplicable.

## Operations and scope

| Actual CA semantics / source bonus ID | Existing Modifier mapping |
| --- | --- |
| attack +5/+10 / `melee_attack_mod` | `melee.meleeAttack`, add 5/10 |
| defence +5 / `melee_defence_mod` | `defense.meleeDefense`, add 5 |
| leadership +5 / `morale` | `defense.leadership`, add 5 |
| charge +10% / `charge_bonus` | `melee.chargeBonus`, multiply 10 |
| weapon strength +12% / `melee_damage_mod_mult`, `melee_damage_ap_mod_mult` | base/AP paths separately, multiply 12 each |
| Peasant Mob recruitment cost −10% / `cost_mod` | `campaign.recruitmentCost`, multiply −10 |
| infantry upkeep −5% / `upkeep_mod` | percent meaning observed; no admitted Modifier because applicability selectors are unresolved |

These mappings are frozen for this batch's actual bonus IDs. Exact CA
descriptions distinguish `%+n` numeric substitution from `%+n%` with a literal
percent suffix. No rounding/clamping, SET mapping, generic effect-name parser or
new UnitStatPath is invented. Weapon strength uses the two distinct source bonus
rows; it does not modify bonus-vs-large/infantry or a stored derived total.

Admitted numeric scope is `faction_to_force_own_unseen`: location=factionwide,
ownership=yours, source=faction, target=force, territory=any. Income/building
effects use `faction_to_region_own_unseen`, with target=region. That region
scope is not turned into a unit effect. The available engine bonus enumerations
remain referenced IDs, not decoded runtime arithmetic proof. Exact descriptions
and specific bonus rows are reviewed; they do not authorize arbitrary mappings.

## Why effects were withheld

- **Seamstresses**: basic junction `recruitment_mod_cost_land_all` is traced, but
  no exact unit-set applicability is proved. No all-units fallback is used.
- **Irrigation Ditches**: numeric upkeep percentage is clear; caste-selector
  evaluation and broader mixed target semantics are not admitted.
- **Siege Engineering missile strength**: a displayed aggregate is not proved
  equivalent to multiplying raw projectile fields. Unsupported.
- **Reload-time reduction**: positive 15 does not prove the sign/formula on raw
  reload baseTime. Ambiguous; no reciprocal or negative multiplier is inferred.
- **Siege leadership**: numeric +5 is conditional on siege/encircling. The
  current calculator cannot assume that condition. Limited and withheld.
- Farm/industry income and infrastructure construction are NON_UNIT_STAT.
  No schema/path expansion is required or performed.

## Source, replay and fail-closed boundary

WH3 **9.0.2.0**, RPFM **5.1.0**, schema format **5**, same static snapshot as
the first slice. `admission.json` pins source/policy bytes, original extraction,
Production bytes, baseline identity and snapshot. `source.json` retains the
bounded selected raw rows, shared processed field/reference metadata,
relationships, complete query coverage and pack/schema hashes. Raw extraction
is ignored staging; only reviewed evidence is committed.

- Original extraction SHA256:
  `4d5049c492464e158780dcd0a371bae60731cdb4d89b032af98376ddf87236ca`
- Committed source SHA256:
  `bf658783ef8fd44abad4a25109535ee7acc380baad28c12c4d5d0ad867b5b297`
- Snapshot:
  `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`

The existing replay now checks both batches and emits one array in the existing
`src/data/caResearchEffect.json`. Its first entry is the original projection
unchanged; no second app repository or effect engine exists. New entries retain
per-target exact main/land, source/review/snapshot and existing full Modifier
metadata. Review hash is SHA256 of `JSON.stringify(review)`; source/policy hashes
are their exact UTF-8/LF file bytes. `--write` never updates source/admission pins.

```powershell
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

No game installation/RPFM/generated data is needed by replay or the app. Local
source re-inspection uses the existing inspector and committed `queries.json`;
it is bounded to these eight keys and observed target/static records.

## Calculator and validation

Grail's three research selections produce attack **43**, defence **39**,
leadership **85**, charge **82.5**, damage base/AP **20.16 / 31.36**, total
**51.52**. Adding Manual attack +8 produces **51**; deselecting Regular Tournaments
returns **46**. Deselecting Blinker Hoods restores charge **75**; deselecting
Master Swordsmiths restores weapon total **46**. Peasant Mob recruitment is
**100 → 90**, while its custom-battle cost is unchanged.

The current internal engine sums percentages. Manual charge +15% and Blinker
Hoods +10% produce **93.75**, not sequential compounding. These samples do not
prove universal WH3 stacking or provide two actual selected technologies with
the same stat. The existing engine contract is preserved and this limit is
explicit. Research selection remains ephemeral; Profile saves contain only
manual rows. Source labels and mixed-research omissions are visible.

Tests **399/399**, build/replay **PASS**. Tests cover classification determinism,
DIRECT-effect-only admission, exact positive/negative targets, flat/percent/cost,
multi-effect/research/manual stacking, deselection, unknown, immutability, and
source/policy/snapshot/schema/pack/membership/exclude/operation drift. Even
repinned bytes cannot bypass excluded membership or wrong stat/operation guards.
Existing Regular Tournaments, Manual CRUD/backup/comparison, HP/Speed and runtime
regressions pass. Browser cases A–E, other-unit cost and main/land distinction
pass; 320px viewport has no page overflow. Clean snapshot replay/build pass;
tests **397 passed / 2 skipped**, because existing optional local diagnostic
source/saved speed-trace inputs are intentionally absent without generated material.

Production **101**, Sample **5**, Speed **81**, HP **13**, Unit/admission hashes,
diagnostic/shared identities and runtime/MEDIUM evidence are unchanged. No game,
runtime probe or Unit admission was run. No push.

## Generalization conclusion: B · only some patterns generalize

Reusable: exact source/junction/schema proof, explicit non-excluded record
membership, owning-force scope, and reviewed flat/percentage numeric mappings
for existing UnitStatPaths. The eight-source sample supports a future reviewed
allowlist importer for that subset, not automatic admission from names or values.

Not ready: caste/category/class predicates, include/exclude selector precedence,
overlapping same-bonus sets, basic all-land/campaign applicability, battle
conditions, effective missile/reload semantics, and mixed research completeness.
These are separate follow-ups, not implemented here. A general Bretonnia
technology importer should not yet admit every effect or expand every unit set.
