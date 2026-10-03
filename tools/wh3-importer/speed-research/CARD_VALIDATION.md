# Three manual Speed card anchors — candidate reassessment

This is research only. No Production Speed is written, no admission/projection
is implemented and no normalizer policy is changed. HP, missile, UI, runtime
probe, existing static evidence and original Speed inventory remain unchanged.

## Manual evidence and conversion

`manual-card-evidence.json` records the user's direct in-game readings with
`MANUAL_CARD_VALIDATION` provenance, source `user manual in-game card reading`,
reported ULTRA / normal card. It is neither CA extraction nor runtime probe
evidence. Observation timestamp and game version were not supplied and remain
null; modifier context is NOT_REPORTED. The associated **static** 9.0.2.0 snapshot
and original report hash are explicit and are not claimed as observed metadata.

| Exact main / land key (identical) | Observed card | Exact matching static component / entity | Raw ×10 | Other component candidate |
| --- | ---: | --- | ---: | --- |
| `wh_main_emp_inf_swordsmen` | 30 | man / `wh_main_infantry_standard_blood_dismembers` | 3×10=30 | none |
| `wh_main_brt_cav_mounted_yeomen_0` | 92 | mount / `wh_main_brt_mnt_cavalry_fast_blood` | 9.2×10=92 | rider `wh_main_cavalry_rider_standard_blood`: 33 |
| `wh_main_brt_art_field_trebuchet` | 20 | engine / `wh_main_brt_art_trebuchet` | 2×10=20 | crew `wh2_dlc16_infantry_standard_crew_blood_dismembers`: 30 |

All three are unique component matches after replaying exact committed source
rows and processed joins. `selected battle_entities_tables.run_speed × 10` is
validated for these three observations; it is not declared universal. No new
formula fitting, flying inference or rounding rule is introduced. Candidates
whose product is not a positive safe integer remain ambiguous without rounding.
Field Trebuchets' engine walk/run/charge values all equal 2: the card resolves
engine versus crew, but cannot independently distinguish those engine gaits.
The inspected `run_speed` candidate is the supported scoped formula, not proof
of an executable game-wide gait-selection algorithm.

## Exact structural profile definition

Every candidate keeps its own exact main/land identity, entity key, raw field,
source file/pointer, schema/pack snapshot, row ID and processed join provenance.
The associated snapshot is
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
Profile equality deliberately means the declared **speed-chain structure**, not
identity of an entire Unit or any shared category/faction label.

All profiles require known empty/occupied component references, exact forward
joins and schema versions, `battle_entities.run_speed` F32, no extra joined speed
entity, explicit zero fly/flying-charge fields, `sync_locomotion=false` and
`mounted_draughts=false`. Missing source or unknown movement flags cannot inherit.

- **NONFLYING_SINGLE_MAN_RUN:** exactly main→land→man, one speed-bearing entity,
  no mount/engine/articulation. The field type, processed table/field join shape
  and structural flags must equal Swordsmen. Endpoint keys, run/walk/charge
  values and locomotion record keys may differ: they are individually sourced
  inputs of the same typed single-source chain, not a component precedence
  decision. This is bounded structural transfer of the validated ×10 candidate,
  not 70 independent card measurements.
- **EXACT_MOUNTED_YEOMEN_CHAIN:** main→land→man plus mount→entity, no engine or
  articulation. **Both** endpoint keys and all retained movement values
  (walk/run/charge/fly/flying-charge/locomotion) must match Mounted Yeomen, plus
  the same exact processed joins and structural flags. Only then is mount
  precedence inherited.
- **EXACT_FIELD_TREBUCHETS_CHAIN:** main→land→man plus engine→battle_entity, no
  mount or articulation. Both endpoint keys and all movement values must match
  Field Trebuchets; engine type and rider/draught attachment flags must also
  match. Only then is engine precedence inherited. Blessed's intermediary engine
  owner key differs, but its exact join reaches the same speed-bearing endpoint
  and all movement structure/values match; owner names and weapons are not
  used as movement rules.

Terrain effect group and conditional terrain multipliers are not part of a
neutral static card input. They remain distinct source evidence and are never
applied to candidate speed. Single-man locomotion constants are retained in the
original inventory; this research does not derive acceleration, turn rate or
effective runtime movement from them. No claim of final buffed/terrain/campaign
speed is made. Only three identities have direct manual validation; inherited
candidates remain a research confidence scope until separately admitted.

## Result

| Classification | Count |
| --- | ---: |
| SPEED_DIRECT_STATIC candidate | 74 |
| SPEED_AMBIGUOUS | 27 |
| SPEED_UNAVAILABLE | 0 |

DIRECT profiles: single-man 70/70 (45 individually traced entity endpoints),
Mounted Yeomen profile 2, Field Trebuchets profile 2. Thus 3 are directly read
manual anchors and 71 inherit a declared exact structural profile. DIRECT here
means a resolvable **research candidate**, not an admitted Production value;
every report record still has `productionEligible=false`.

The mounted candidates are Mounted Yeomen and Mounted Yeomen Archers, each 92.
The engine candidates are Field Trebuchets and Blessed Field Trebuchets, each 20.
Other cavalry/artillery labels and equal engine run-speed values confer no
validation. Existing Production Speed remains absent for all 101 units.

The report enumerates every DIRECT candidate's exact key, selected component,
selected entity, raw speed, calculated speed, profile hash, validation anchor,
direct-manual versus inherited basis and source trace.

## Ambiguity and minimal possible later readings

Buckets are mutually exclusive and sum to 27:

| Bucket | Count | Examples |
| --- | ---: | --- |
| MOUNTED_PROFILE_NOT_VALIDATED | 17 | Dread Saurian, Necrofex Colossus, other cavalry endpoints |
| ENGINE_VEHICLE_PRECEDENCE_UNRESOLVED | 5 | Doom-Flayers, Plagueclaw/Screaming Skull, Warp Lightning Cannons, Carronades |
| FLYING_SEMANTICS_UNRESOLVED | 3 | Vargheists, Pegasus Knights, Royal Pegasus Knights |
| ARTICULATED_COMPONENT_AMBIGUITY | 2 | Skeleton Chariots, Black Coach |

No current candidate needs rounding; that guard remains tested for future edge
cases. If coverage beyond the 74 candidates is desired, the largest ambiguity
bucket can be narrowed by the following **optional future** normal-card readings:

| Exact candidate | Card value to record | Competing ×10 candidates | Possible exact-profile coverage |
| --- | --- | --- | ---: |
| Knights of the Realm — `wh_main_brt_cav_knights_of_the_realm` | actual Speed, no assumed result | rider 33 / mount 84 | 3 |
| Cold One Riders — `wh2_main_lzd_cav_cold_ones_1` | actual Speed, no assumed result | rider 33 / mount 66 | 2 |
| Grail Knights — `wh_main_brt_cav_grail_knights` | actual Speed, no assumed result | rider 33 / mount 84 | 2 |

One reading addresses the largest unvalidated exact profile (3 units); these
three could cover at most 7 units conditionally, not all 17 mounted units.
No winner is selected and no measurement/probe is performed in this task.
Legacy wiki references are not reused as card evidence. These measurements are
not needed merely to retain the existing 74 candidate predictions.

## Replay and boundaries

```powershell
node tools/wh3-importer/speed-research/card-validation.mjs --check
node --test tests/wh3-speed-card-validation.test.cjs
```

The old static-only report stays byte-identical with its original 0/101/0 result.
The new command replays that source inventory, materializes only existing source
rows in memory, validates the separate manual observations and writes/checks
`card-validation.json` only. No HP research/admission function is invoked.
Missing/broken joins, snapshot drift, changed profiles, wrong manual association,
multiple component matches, competing anchors and unsupported numeric results
fail closed. No game, ignored generated capture or external site is needed.

Changed files: `manual-card-evidence.json`, `card-validation.mjs`,
`card-validation.json`, this document, `tests/wh3-speed-card-validation.test.cjs`,
and a current-assessment link in the original Speed document.

## Validation

The new card validation tests pass 8/8, and the non-HP regression selection passes
316/316. HP research test files were excluded to honor the instruction not to
rerun HP research. The build passes. A clean source snapshot without generated
artifacts reproduces the candidate report and passes the new tests 8/8.

A baseline byte audit covers all 308 previously tracked files: only the original
Speed document's assessment link changed; the other 307 files remain identical.
This includes Production/Sample data, HP artifacts and policy, MEDIUM evidence,
normalization semantics and runtime probes. No Production Speed is populated.
