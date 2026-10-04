# Bretonnia full technology-tree classifier benchmark

Current replay includes mapping review 01, bounded to eight mapping-unresolved
occurrences from `5d0e1ea6a0283c3cbd086c8f65f1d468b2729884`. Six exact keys were
approved; missile strength and ward save remain REVIEW_REQUIRED. Source bytes,
discovery, scope, membership, selector and classifier body are unchanged.

| Metric | Original benchmark | After mapping review 01 |
| --- | ---: | ---: |
| Technologies / effects | 68 / 179 | 68 / 179 |
| DIRECT | 9 | 15 |
| REVIEW_REQUIRED | 157 | 151 |
| UNSUPPORTED / NON_UNIT_STAT | 1 / 12 | 1 / 12 |
| Modifier candidates | 54 | 96 |
| Target Production Units | 12 | 22 |
| Technologies with DIRECT | 5 | 10 |

`report.json`, `summary.json`, rejections and representatives now describe the
AFTER state. [`../research-mapping-review-01/REVIEW.md`](../research-mapping-review-01/REVIEW.md)
contains the exact inventory, evidence, BEFORE projection and per-mapping
coverage delta. The old bounded report differs only in its whitelist metadata
digest; original classifications/candidates are byte-reconstructible by
restoring that digest. No app/Calculator/Research admission was added.

The sections below document the **original benchmark**, including its original
counts and unchanged-policy premise; they are retained as the BEFORE context.

Baseline: `031666d408d8c92aa144c84b959410314859e099`. This is a scan and
candidate benchmark, **not admission**. No effect/scope/selector/operation
whitelist was expanded; no app/Calculator/Production projection was written.

## Source discovery and snapshot

The installed RPFM 5.1.0 reader opened actual CA db.pack/local_en.pack, with
game version **9.0.2.0**, schema format 5 and the existing schema/pack hashes.
Extraction checks the existing static snapshot ID before querying rows:
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

Discovery starts from exact culture `wh_main_brt_bretonnia`, its schema-linked
subculture `wh_main_sc_brt_bretonnia` and 23 descendant faction records, then
queries technology node sets by each exact affiliation arm. The result is one
set, **brt_mil**. Every node→set→culture and node→technology relationship is
preserved. No technology prefix, Loc string or hand-written technology list
determines membership. For example `tech_dlc14_brt_code_of_conduct` is discovered
normally despite its different prefix. Other factions' technology trees were
not scanned. Diplomacy target IDs outside Bretonnia remain source references;
they were not expanded into foreign trees or interpreted as Unit modifiers.

The tree has **75 nodes, 68 unique technologies, 179 technology/effect junctions
and 132 unique effect keys**. All 68 have effects; none are silently omitted.
Repeated technologies in different node positions are materialized once with
every node affiliation proof retained. Technology links are also preserved.

Effect materialization queries all 57 actual present `effect_bonus_value_*`
tables whose schema references effects.effect, including zero-result queries.
It retains scopes, exact Loc rows, bonus/typed-target rows, 20 unit sets,
75 membership/selector rows and 37 exact main/land chains. Full selected row
payloads, row IDs, schema references, query coverage and pack provenance remain
in `source.json`; no full CA DB dump is committed. Unmaterialized non-Unit
typed targets are kept as raw identities and schema references, not guessed.
`NO_BONUS_RELATION` means no matching row in these inspected 57 tables, not
proof of no engine/scripted effect.

Original ignored extraction SHA256:
`33fe9eeea3341c3d98af03a880b0decdf8692ab67d494d84f0dd79683c9f733b`.
Committed source SHA256:
`72dc47e15caa9df8a6a79ccdbe21bdf6b71d3afda9ea0a6da8e895ee881146a8`.
`manifest.json` pins the source, processed schema projection, original
extraction, original classifier/whitelist, and deterministic output digests.

## Existing classifier integration

The **only classifier change is exporting its already-existing pure
`classifyResearchEffect` function**. Its body and every other classifier byte
must match the baseline after removing that export keyword; the unchanged
policy file is separately pinned. Code hashes normalize LF/CRLF to allow clean
Windows checkouts. Neither predicate semantics nor the original bounded batch
entry point changed. The old report remains byte-identical.

The scan adapter verifies its own new source envelope against the same
game/schema/pack/snapshot and the same Production registry, proves discovery,
then calls that existing effect classifier and candidate builder. A source
conflict produces REVIEW_REQUIRED without choosing a majority. Unhandled input
shapes/extra target relations on otherwise DIRECT effects would be separately
UNCLASSIFIABLE_INPUT. **None occurred in this source.**

## Coverage

| Effect state | Occurrences | Share |
| --- | ---: | ---: |
| DIRECT_CANDIDATE | 9 | 5.03% |
| REVIEW_REQUIRED | 157 | 87.71% |
| UNSUPPORTED | 1 | 0.56% |
| NON_UNIT_STAT | 12 | 6.70% |
| UNCLASSIFIABLE_INPUT | 0 | 0% |

Five technologies contain DIRECT effects; **63 contain none**, and **nine**
technologies mix effect states. All counts refer to technology/effect
occurrences, not just unique effect keys. A known economy effect may occur in
multiple technologies and remains separately classified.

The **54 candidates cover 12 exact Production Units and seven stat paths**:

| Path | Candidates | Operation |
| --- | ---: | --- |
| melee.meleeAttack | 9 | add |
| defense.meleeDefense | 8 | add |
| defense.leadership | 7 | add |
| melee.chargeBonus | 7 | multiply |
| melee.damage.base | 11 | multiply |
| melee.damage.armorPiercing | 11 | multiply |
| campaign.recruitmentCost | 1 | multiply |

Totals: **add 24, multiply 30, SET 0**. Per-effect/technology/Unit counts are in
`summary.json`. Every candidate has exact main/land, set/member/Loc/source row
references, numeric value and existing rule IDs. Common provenance points to
this scan's source, not batch-01's source hash. Peasant Mob's distinct main
`wh_dlc07_brt_peasant_mob_0` and land `wh_dlc07_brt_inf_peasant_mob_0` remain
distinct. No exact candidate duplicates, semantic candidate overlaps or
source conflicts occurred. Synthetic tests cover all three cases, retaining
different technologies' same-stat modifiers and quarantining conflicting
value/land/target/provenance under the same candidate identity.

### Scope inventory

| Exact key | Effects | Technologies | DIRECT |
| --- | ---: | ---: | ---: |
| faction_to_character_own_unseen | 5 | 3 | 0 |
| faction_to_faction_own_unseen | 79 | 44 | 0 |
| faction_to_force_own | 2 | 2 | 0 |
| faction_to_force_own_unseen | 62 | 33 | 9 |
| faction_to_province_own | 3 | 3 | 0 |
| faction_to_province_own_unseen | 7 | 6 | 0 |
| faction_to_region_own_unseen | 21 | 16 | 0 |

Only the exact existing unseen own-force record is approved: **62/179 (34.64%)**
of occurrences. Approved scope alone yields only **9/62 (14.52%)** DIRECT.
Even the similar visible `faction_to_force_own` stays unapproved. Full record
fields, classification counts and representative effects are in `report.json`.

### Target/selector inventory

| Source shape | Effects | DIRECT |
| --- | ---: | ---: |
| Explicit unit set / main chain | 22 | 9 |
| Selector unit set | 10 | 0 |
| Basic bonus | 30 | 0 |
| Other typed relation | 67 | 0 |
| No matching inspected bonus relation | 50 | 0 |

Explicit main chains are resolvable for **22/179 (12.29%)**; selectors occur in
**10/179 (5.59%)**. Actual selectors are caste: hero/lord, melee/missile/
monstrous cavalry and melee/missile/monstrous infantry. No category/class or
unknown selector was found. This inventory does **not** resolve caste
applicability or expand every selector into a roster.

### Semantics inventory

Labels describe exact existing bonus IDs/typed relation tables, never a new
effect-to-operation mapping. Groups overlap (weapon strength has base and AP).

| Group | Effects | DIRECT |
| --- | ---: | ---: |
| Melee attack / defense | 5 / 3 | 3 / 2 |
| Leadership / charge | 3 / 1 | 1 / 1 |
| Base / AP weapon damage | 3 / 3 | 1 / 1 |
| Recruitment / upkeep | 3 / 2 | 1 / 0 |
| Reload / missile strength | 1 / 2 | 0 / 0 |
| Income / building / conditional | 18 / 7 / 1 | 0 / 0 / 0 |
| Other exact bonus/target semantics | 130 | 0 |

### Rejection frequency

Top reasons are `SCOPE_NOT_VERIFIED_OWN_FORCE` **105**,
`EFFECT_MAPPING_UNVERIFIED` **48**, `REGION_SCOPE_NOT_UNIT_APPLICABLE` **12**,
`NON_UNIT_ECONOMY_EFFECT` **10**, `NON_UNIT_BUILDING_EFFECT` **2**.
All-land, caste upkeep, reload, missile-strength, siege condition and unapproved
upkeep mapping each occur once as specific classifier reasons. Reason totals
are not exclusive: an effect can retain more than one reason. The existing
classifier reports its first failed gate; independent shape inventories expose
selectors and typed targets even when scope/mapping failed first.

## Representative follow-up cases (not resolved)

Exact technology/effect identities, names, Loc text, values, scopes, set keys,
source row IDs and frequency bounds are in `representatives.json`.

| Pattern | Exact representative effect | Exact-key occurrences | Pattern occurrences |
| --- | --- | ---: | ---: |
| Unknown own-force mapping | wh_main_effect_force_all_campaign_replenishment_rate | 5 | 48 |
| Unapproved scope | wh_dlc07_effect_chivalry_dummy | 20 | 105 |
| Explicit targets, missing mapping | wh2_dlc09_effect_force_stat_armour_brt_knights | 1 | 8 |
| Selector target | wh2_dlc14_effect_reputation_mors_lords_and_heroes | 1 | 10 |
| Reload | wh2_main_effect_force_stat_reload_time_reduction_brt_trebuchet | 1 | 1 |
| Missile strength | wh2_main_effect_force_stat_missile_damage_brt_bowmen_yeomen | 1 | 2 |
| All-land | wh_main_effect_force_all_campaign_recruitment_cost_all | 1 | 1 |
| Siege conditional | wh_main_effect_force_stat_leadership_siege_attack | 1 | 1 |
| Building targets | wh_main_effect_building_construction_cost_mod_infrastructure | 2 | 6 |
| Upkeep selectors | wh_main_effect_force_army_campaign_upkeep_cost_infantry | 1 | 1 |

Pattern counts are overlapping **upper bounds on review workload**, not promised
new DIRECT coverage. Reviewing one exact key does not approve its entire
pattern. Scope-only changes would add **zero** candidates for already approved
effect keys here: all nine already have the approved scope. Building/economy/
chivalry work may clarify exclusion without adding any numerical Unit modifier.

Assessment: **LOW COVERAGE; readiness B**. Current policy handles only 5.03% of
all occurrences and 40.91% of explicit-chain occurrences; no new DIRECT
technology appears outside the old batch. All normal inputs reached the existing
classifier (zero unclassifiable), so this benchmark does not justify an
architecture redesign. The existing candidates may enter a separate reviewed
admission batch, but a broader automatic workflow should first review a few
representative unsupported patterns.

Priority: the **eight own-force occurrences with exact explicit main chains but
unapproved effect mappings**. Review exact effect/Loc/bonus semantics (starting
with the armour-knights example) one key at a time. Eight is the ceiling if all
their remaining gates were proven, not a forecast. Selector/campaign/ranged/
conditional patterns remain separate later reviews. No such review or whitelist
extension was performed in this commit.

## Artifacts and replay

Committed: `manifest.json`, lossless selected-row `source.json`, `report.json`,
`summary.json`, `rejections.json`, `representatives.json`, this document and the
small pure `source.mjs` / `scan.mjs` layers. Original raw evidence remains ignored.
Source/report sizes are **2,231,367 / 1,027,882 bytes**; additional inventories
are small. Rows and shared schemas are stored once in source; report traces use
source references. This is selected Research evidence, not a raw pack dump.

```powershell
# Optional local integration; never part of clean replay:
node scripts/extract-bretonnia-research-scan.mjs
node scripts/materialize-bretonnia-research-scan.mjs
node scripts/scan-bretonnia-research.mjs --write

# Clean checkout, without game/RPFM/generated evidence:
node scripts/scan-bretonnia-research.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

`--write` affects only scan artifacts/digests; it performs no actual admission.
Batch-01 retains exact eight identities, 17 effects and **9/4/1/3** states,
including exact candidate values/joins/Loc traces. App Research, Calculator,
Manual Profile, Production 101/Sample 5, HP/Speed admissions, diagnostic/shared
identity and runtime/MEDIUM evidence remain unchanged. No game was executed.

Validation: full scan/classifier/original slice-and-batch replay **PASS**;
**433/433 tests**, build **PASS**. Scan-specific tests cover deterministic
discovery, exact affiliation, effectless discovery, every effect, all inventories,
batch equality, duplicate/overlap/conflict handling, extra typed relations,
incomplete joins, source/snapshot/whitelist drift, CRLF checkout code validation
and unchanged app/Production/HP/Speed hashes. The original Research tests are
unchanged. Local extraction through actual RPFM packs also completed successfully.

A clean tracked-file snapshot excludes `.git`, `generated` and importer `.local`.
Dependencies were reused through a node_modules junction. Full scan, original
classifier and batch replays plus build pass without game/RPFM/private evidence;
tests are **431 passed / 2 skipped**. Those two are the existing optional private
diagnostic/saved-speed-trace checks, not scan failures. No actual admission,
Calculator/compare/Profile/IndexedDB/backup change or push was performed.
