# Bounded Research candidate classifier

This layer answers which **effects and exact existing Production targets** can
produce numerical candidates from the committed Bretonnia batch-01 source.
It does not admit candidates, write Calculator data, or scan new technologies.
The existing human review and admission remain separate and unchanged.

Mapping review 01 also reuses this pure classifier for the committed full-tree
source. Its six exact additions produce **15 DIRECT effects / 96 candidates /
22 target Units** there. Batch-01 remains **9 / 54 / 12**. See
[`research-mapping-review-01/REVIEW.md`](../research-mapping-review-01/REVIEW.md).

`policy.mjs` centralizes the reviewed semantics whitelist and immutable source
pins. `classify.mjs` is pure; the CLI reads only batch-01 `source.json` and
`src/data/units.json`. Neither the old policy/admission nor review answers feed
the classifier. The test suite alone uses the human review as an oracle.

## Trust and DIRECT gates

The report entry point verifies exact source/Production bytes, original raw
extraction SHA, game version, RPFM/schema format, schema SHA, processed schema
definitions, both pack SHAs, source pack paths, row payload-derived IDs, and
the existing canonical static snapshot ID (using the existing snapshot helper).
It also checks exact technology identity, visible availability, node/set/culture
schema joins, Loc identities and complete effect-query coverage. Changed bytes
fail with a named validation error before producing any report/candidates;
callers cannot supply replacement trust pins.

DIRECT requires all of:

- Exact technology/effect identity, required schema joins and relationship proof.
- The full scope record below, not a similar key or category name.
- An exact whitelisted effect key, English Loc text and bonus/set composition.
- Explicit, non-excluded main-record membership and complete set-query coverage.
- No caste/class/category/unknown selector, experience range or special category.
- One unambiguous set interpretation per bonus and target; exact main→land join.
- Exactly one matching existing Production ID and the same game version.
- Finite numeric raw value and a whitelisted path/operation; preserve raw value
  including zero, negative percentages and fractions, without rounding/scaling.

Only `faction_to_force_own_unseen` is approved, with the exact record:
`location=factionwide, ownership=yours, source=faction, target=force, territory=any`.
Region/province/character/enemy/global/conditional/scripted or unknown scopes
cannot inherit this approval.

## Exact mapping whitelist

| Bonus in whitelisted effect | UnitStatPath | Operation | Rule ID |
| --- | --- | --- | --- |
| `melee_attack_mod` | `melee.meleeAttack` | add | `OP_MELEE_ATTACK_FLAT` |
| `melee_defence_mod` | `defense.meleeDefense` | add | `OP_MELEE_DEFENSE_FLAT` |
| `morale` | `defense.leadership` | add | `OP_LEADERSHIP_FLAT` |
| `charge_bonus` | `melee.chargeBonus` | multiply | `OP_CHARGE_PERCENT` |
| `melee_damage_mod_mult` | `melee.damage.base` | multiply | `OP_BASE_DAMAGE_PERCENT` |
| `melee_damage_ap_mod_mult` | `melee.damage.armorPiercing` | multiply | `OP_AP_DAMAGE_PERCENT` |
| `cost_mod` | `campaign.recruitmentCost` | multiply | `OP_RECRUITMENT_PERCENT` |
| `armour_mod` (review 01 exact effect) | `defense.armor` | add | `OP_ARMOR_FLAT` |
| `upkeep_mod` (review 01 explicit set only) | `campaign.upkeep` | multiply | `OP_UPKEEP_PERCENT` |
| `range_mod` (review 01 exact effect) | `missile.range` | multiply | `OP_RANGE_PERCENT` |

These bonus names alone never authorize a mapping. `policy.mjs` lists the fifteen
exact effect keys, reviewed Loc strings and their exact unit sets. `%+n` versus
`%+n%` is checked against that already-reviewed interpretation; there is no
generic Loc/effect-name inference and no percent inference from magnitude.
`multiply 10` means the existing engine's +10%, not a factor of ten. SET,
missile strength and reload are absent from the automatic mapping list. Upkeep
is approved only for exact `wh_dlc07_peasant_upkeep_penalty` and its reviewed
explicit set; the original caste-selector upkeep effect stays rejected. Raw
`-5` is retained as multiply `-5`. Ward save stays REVIEW_REQUIRED: its `%` Loc
does not establish additive percentage points versus relative modification.
Existing nine mappings, scope, membership and selector gates are unchanged.
New mappings carry a review reference with exact Loc/bonus proof, first
technology, snapshot/schema/pack and value/operation semantics.

## Membership and identity

The supported chain is technology→effect→bonus/unit-set→explicit membership→
main record→land record, with processed-schema references and stored joins.
Applicability uses **main**, never a guessed land/name/category identity.
Peasant Mob therefore retains main `wh_dlc07_brt_peasant_mob_0` and land
`wh_dlc07_brt_inf_peasant_mob_0` as distinct records.

Identical same-set memberships collapse deterministically, retaining sorted
source references. Conflicting payloads, include/exclude mixes and overlapping
same-bonus sets cannot select a winner. An affected Production target causes
the effect to become REVIEW_REQUIRED with no candidates. Non-Production targets
are retained as omitted targets with reasons and source row IDs, never invented
as new Units. In particular, Grail Reliquae's two-set overlap is explicitly
ambiguous and omitted; the exact Battle Pilgrims subset can still be DIRECT.
Thus DIRECT describes the generated **bounded target subset**, not every member
of a CA set or the completeness of an entire technology.

The lower-level mapping/target/builder helpers are pure validation primitives,
not source trust or admission entry points. Synthetic tests exercise them
without blessing changed source bytes. Only `classifyBatch` creates the trusted
committed report from its pinned byte envelope.

## States, reasons and report

- DIRECT_CANDIDATE: supported effect with verified existing Production targets.
- REVIEW_REQUIRED: unverified scope/selector/target/operation or missing proof.
- UNSUPPORTED: known semantics cannot safely map to the current raw Unit model.
- NON_UNIT_STAT: exact known building/economy effect outside Unit stats.

Effect states are primary. Technology summaries count states and mark mixed
technologies; they do not hide omissions behind one technology-wide approval.
For example Subsidised Tools has two DIRECT effects and one NON_UNIT_STAT.

Known rejected semantics have explicit reason IDs:
`REGION_SCOPE_NOT_UNIT_APPLICABLE`, `NON_UNIT_BUILDING_EFFECT`,
`NON_UNIT_ECONOMY_EFFECT`, `ALL_LAND_TARGET_UNRESOLVED`,
`CASTE_SELECTOR_UNSUPPORTED`, `UPKEEP_MAPPING_NOT_APPROVED`,
`RELOAD_MAPPING_UNVERIFIED`, `MISSILE_STRENGTH_MAPPING_UNVERIFIED`,
`CONDITIONAL_SIEGE_EFFECT`. Graph/semantic failures additionally use
`IDENTITY_NOT_EXACT`, `IDENTITY_JOIN_MISMATCH`, `SCHEMA_REFERENCE_MISSING`,
`SCHEMA_REFERENCE_CORRUPT`, `SOURCE_RELATIONSHIP_MISSING`,
`TARGET_COVERAGE_INCOMPLETE`, `SET_COMPOSITION_UNRESOLVED`,
`UNKNOWN_MEMBERSHIP_SELECTOR`, `SELECTOR_UNSUPPORTED`, `INCLUDE_STATE_UNKNOWN`,
`TARGET_MEMBERSHIP_CONFLICT`, `TARGET_EXCLUDED_OR_CONFLICTING`,
`TARGET_MEMBERSHIP_AMBIGUOUS`, `TARGET_NOT_IN_PRODUCTION`,
`PRODUCTION_IDENTITY_MISMATCH`, `SCOPE_NOT_VERIFIED_OWN_FORCE`,
`EFFECT_MAPPING_UNVERIFIED`, `LOCALISATION_MAPPING_MISMATCH`,
`TARGET_RELATION_NOT_APPROVED`, `TARGET_SET_OR_BONUS_MISMATCH`,
`RAW_VALUE_NOT_FINITE`, `UNKNOWN_OPERATION`, `VALUE_UNIT_UNVERIFIED`,
`RAW_VALUE_TRANSFORMATION_NOT_APPROVED`, `CANDIDATE_PROVENANCE_MISSING`,
`NO_EXACT_PRODUCTION_TARGET`. Envelope drift is a hard validation failure,
e.g. `SOURCE_HASH_DRIFT`, `PRODUCTION_HASH_DRIFT` or `SNAPSHOT_IDENTITY_DRIFT`.
No unsupported effect/target is silently dropped.

`report.json` stores shared original/source/snapshot/schema/pack provenance and
a semantics-whitelist digest. Each candidate references that source block and
effect trace, exact membership/main/land rows and relationship references;
it records exact numeric values, paths/operations and explanatory rule IDs.
The report contains technology breakdowns, per-Unit candidate counts, reason
histograms and policy rule usage. All references resolve in committed source.

## Batch-01 result and limits

| Technology | DIRECT effects | REVIEW | UNSUPPORTED | NON_UNIT |
| --- | ---: | ---: | ---: | ---: |
| Regular Tournaments | 2 | 0 | 0 | 0 |
| Blinker Hoods | 2 | 0 | 0 | 0 |
| Master Swordsmiths | 1 | 0 | 0 | 0 |
| Encourage Fanaticism | 2 | 0 | 0 | 0 |
| Subsidised Tools | 2 | 0 | 0 | 1 |
| Seamstresses | 0 | 1 | 0 | 1 |
| Irrigation Ditches | 0 | 1 | 0 | 1 |
| Siege Engineering | 0 | 2 | 1 | 0 |
| Total (17 effects) | **9** | **4** | **1** | **3** |

There are **54 effect×Unit×stat candidates across 12 existing Units**, not 54
admissions. The human app projection still has 42 modifiers in 21 contexts.
The 12 additional candidates are the two Regular Tournaments effects on six
other explicitly included knight records. They are candidates from source
membership; the original Grail-only admission is unchanged.

Generalization is limited to explicit main membership, exact owning-force
semantics and these reviewed effect mappings. New keys/snapshots require a new
review and deliberate pin/whitelist update. Caste/classes/categories, all-land
targets, overlaps, conditional siege, reload and missile interpretations remain
unresolved. No entire faction/technology-tree import or automatic admission is
justified by this eight-technology sample.

## Reproduction and validation

```powershell
node scripts/classify-bretonnia-research.mjs
node scripts/review-research-mappings.mjs
node scripts/scan-bretonnia-research.mjs
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

The classifier CLI's optional `--write` writes **only its candidate report**;
it cannot write app or Production data. No game installation, RPFM, generated
captures or runtime probe is needed. Tests cover source drift and independent
semantic/target guards, zero/fraction preservation, deterministic duplicates,
conflicts, human-oracle equality, mixed summaries and protected file hashes.
Existing calculator/manual Profile/HP/Speed/runtime regressions remain active.

Original classifier validation (before full scan/review 01): classifier replay
and original slice/batch replay PASS; **421/421**
tests and build PASS. A clean tracked-file snapshot with no `.git`, `generated`
or importer `.local` also passes both replays and build; **419 passed / 2 skipped**.
The two existing optional local diagnostic/saved-speed-trace checks skip because
their private inputs are absent. Dependencies were reused through a node_modules
junction; no game/RPFM access was needed. All existing tracked files, including
app Research, Production 101/Sample 5, HP/Speed admissions and MEDIUM/runtime
evidence, remain unchanged. No admission, projection, UI or engine change.
