# Base unit-card Speed: empirical promotion

Production Speed 81 → 908; missing values 1029 → 202; newly promoted 827. Speed-only status: COMPLETE 908, PARTIAL 125, UNKNOWN 77. PARTIAL means the raw chain is present but display semantics are unvalidated; both PARTIAL and UNKNOWN have no stored Speed.

## Evidence and confidence

6 manual cards (version/date/modifiers not recorded); 81 prior derived values are regression evidence, not 81 independent measurements. Mounted holdouts are independent of the three-case fitting set, but historical inputs, not new observations.

All 81 previous admissions are STATIC_DERIVED_SPEED. Only six of those identities also have direct user-reported card readings. The original Swordsmen, Mounted Yeomen and Field Trebuchets fit the three source-selection rules. Knights of the Realm, Cold One Riders and Grail Knights are separate historical mounted holdouts: 3/3 match. They cross-check both horse and Cold One mount entities. No new live-game observation was fabricated. Generalizing the infantry and artillery topology has only one directly measured anchor each; category samples below are structural forecasts unless a card reference is present.

## Sources and rules

Pinned CA WH3 9.0.2.0, snapshot c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5. The source pack and schema hashes in manifest/source evidence match the existing reviewed snapshot. Exact processed-schema reference joins:

- main_units.land_unit → land_units.key → man_entity → battle_entities.key
- land_units.mount → mounts.key → mounts.entity → battle_entities.key
- land_units.engine → battlefield_engines.key → battle_entity → battle_entities.key
- land_units.articulated_record → land_unit_articulated_vehicles.key → articulated_entity → battle_entities.key (audited, held)

| Rule | Formula | Stored | Previous | New |
| --- | --- | --- | --- | --- |
| GROUND_MAN_RUN | selected run_speed × 10 | 683 | 70 | 613 |
| GROUND_MOUNT_RUN | selected run_speed × 10 | 187 | 9 | 178 |
| GROUND_ARTILLERY_ENGINE_RUN | selected run_speed × 10 | 38 | 2 | 36 |

Ground MAN_ONLY selects man; ground MOUNTED selects mount, never the rider. Artillery selects engine only for Generic_3_Crew / wheeled_entity / artillery category. Every required component is nonflying, all exact joins must be present, and sync_locomotion and mounted_draughts must be false. Additional speed entities are held. Rules contain no unit-name or CA-key exceptions. Direct card readings remain manual evidence; newly stored values are EMPIRICAL_STRUCTURE_SPEED, not measurements.

Conversion is exactly raw run_speed × 10. No extra unit multiplier is supported by the six readings. The observed ×10 products are integral; rounding, floor and ceil tie on the evidence. Therefore rounding is not determined and nonintegral products are held. Positive run values were found for every admitted source. Zero fly_speed/flying_charge_speed means no positive flight movement in this chain; it does not mean a zero card Speed. No selected run_speed=0 occurs in this catalog.

walk_speed is walking movement, charge_speed/flying_charge_speed are charge movement, fly_speed is airborne movement. Acceleration/deceleration and locomotion constants affect motion behavior; they are not card Speed inputs in these validated structures. Processed schema descriptions and references are retained in schema-inventory.json. Terrain scalar_speed entries (for example small entities in shallow_water ×0.8) are conditional and are not multiplied into the basic card. Skills, items, research, rank, difficulty and active conditions are not applied. Zero and unusual movement values are retained in the audit, rather than replaced with guessed card values.

## Candidate comparison

| Candidate | Direct cards matched | Legacy values matched |
| --- | --- | --- |
| SELECTED_RUN | 0/6 | 0/81 |
| SELECTED_RUN_X10 | 6/6 | 81/81 |
| MAN_RUN_X10 | 1/6 | 70/81 |
| SELECTED_WALK_X10 | 1/6 | 2/81 |
| SELECTED_CHARGE_X10 | 1/6 | 2/81 |
| SELECTED_FLY_X10 | 0/6 | 0/81 |
| MIN_RUN_X10 | 2/6 | 72/81 |
| MAX_RUN_X10 | 5/6 | 79/81 |
| ROUND_RUN_X10 | 6/6 | 81/81 |
| FLOOR_RUN_X10 | 6/6 | 81/81 |
| CEIL_RUN_X10 | 6/6 | 81/81 |

MIN_RUN_X10 matches 2/6 direct cards and MAX_RUN_X10 matches 5/6; both fail as universal component-selection rules. The separately validated role rules restrict generalization, rather than guessing max/min on articulated or vehicle chains. Artillery walk/run/charge are equal on the measured trebuchet, so those paths are not separately identified by that card alone; engine run inherits the run-field interpretation established by the other movement structures.

| Manual card | Phase | Expected | Selected run ×10 | Man run ×10 | Walk ×10 | Charge ×10 |
| --- | --- | --- | --- | --- | --- | --- |
| Swordsmen | TRAINING | 30 | 30 | 30 | 15 | 38 |
| Mounted Yeomen | TRAINING | 92 | 92 | 33 | 20 | 110 |
| Field Trebuchets | TRAINING | 20 | 20 | 30 | 20 | 20 |
| Knights of the Realm | INDEPENDENT_MOUNTED_HOLDOUT | 84 | 84 | 33 | 20 | 108 |
| Cold One Riders | INDEPENDENT_MOUNTED_HOLDOUT | 66 | 66 | 33 | 20 | 100 |
| Grail Knights | INDEPENDENT_MOUNTED_HOLDOUT | 84 | 84 | 33 | 20 | 108 |

report.json contains the expected/actual/delta table for every candidate and all 81 legacy entries, with their original admission profile and manual anchor provenance.

## Coverage by CA category

| Category | COMPLETE | PARTIAL | UNKNOWN | New |
| --- | --- | --- | --- | --- |
| inf_melee | 507 | 84 | 0 | 465 |
| war_machine | 0 | 3 | 75 | 0 |
| cavalry | 108 | 19 | 0 | 99 |
| inf_ranged | 176 | 6 | 0 | 148 |
| war_beast | 79 | 11 | 0 | 79 |
| artillery | 38 | 2 | 2 | 36 |

## Representative structures

| Unit | Profile | Result | Speed | Reason / evidence |
| --- | --- | --- | --- | --- |
| Swordsmen | MAN_ONLY | COMPLETE | 30 | tools/wh3-importer/speed-research/manual-card-evidence.json#/samples/0 |
| Aspiring Champions | MAN_ONLY | COMPLETE | 32 | Structural forecast; no independent UI reading |
| Dragon Ogres | MAN_ONLY | COMPLETE | 64 | Structural forecast; no independent UI reading |
| Mounted Yeomen | MOUNTED | COMPLETE | 92 | tools/wh3-importer/speed-research/manual-card-evidence.json#/samples/1 |
| Cold One Riders | MOUNTED | COMPLETE | 66 | tools/wh3-importer/speed-research/mounted-manual-card-evidence.json#/samples/1 |
| Demigryph Knights | MOUNTED | COMPLETE | 75 | Structural forecast; no independent UI reading |
| Giant | MAN_ONLY | COMPLETE | 39 | Structural forecast; no independent UI reading |
| Dread Saurian | MOUNTED | COMPLETE | 60 | Structural forecast; no independent UI reading |
| Steam Tank | ARTICULATED | UNKNOWN | — | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| Field Trebuchets | ENGINE | COMPLETE | 20 | tools/wh3-importer/speed-research/manual-card-evidence.json#/samples/2 |
| Great Cannons | ENGINE | COMPLETE | 20 | Structural forecast; no independent UI reading |
| Flame Cannons | ENGINE | COMPLETE | 25 | Structural forecast; no independent UI reading |
| Black Coach | ARTICULATED | PARTIAL | — | ARTICULATION_PRECEDENCE_UNVALIDATED |
| Skeleton Chariots | ARTICULATED | PARTIAL | — | ARTICULATION_PRECEDENCE_UNVALIDATED |
| Pegasus Knights | MOUNTED | PARTIAL | — | UNVALIDATED_FLIGHT_DISPLAY |
| Doom-Flayers | ENGINE | PARTIAL | — | UNVALIDATED_ENGINE_STRUCTURE |
| Nurglings | MAN_ONLY | COMPLETE | 34 | Structural forecast; no independent UI reading |

These cover ordinary and elite infantry, cavalry, monstrous infantry/cavalry, single bodies with crew, mounted vehicles, artillery, war machines, chariots, flight and swarms. Lords/heroes have separate Character records/canonical mount contexts and remain outside the Unit Speed projection; the two preserved character audit entries are recorded in report.json.

## Holds

| Exact reason | Units |
| --- | --- |
| UNVALIDATED_ENGINE_STRUCTURE | 3 |
| UNVALIDATED_FLIGHT_DISPLAY | 117 |
| ARTICULATION_PRECEDENCE_UNVALIDATED | 2 |
| MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING | 61 |
| UNVALIDATED_SYNC_OR_DRAUGHT | 3 |
| MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | 16 |

The complete per-identity hold list is report.json#/catalog (prediction.reasons). Flight, synchronized movement, missing engine/articulation joins, articulated precedence, unsupported engines and alternative artillery crew types require later evidence. Equal mount/engine/articulation speeds do not identify which component the UI selects. No missing source is filled from a similar unit's name.

The fresh bounded artillery extraction has 40 exact roots. 34 restore absent engine chains. Every overlapping existing speed field matches and the complete pack/schema snapshot is identical. This is independent extraction corroboration, not an independent UI measurement.

## Scope and verification

Only movement.speed is overlaid. Raw units.json, old speed admissions, HP/count projections and all other source data remain unchanged. Runtime repository, audit and shared-identity restoration use the same checked projection. Existing Speed 81/81 survives; HP 986, count 1,071, Korean Unit names 1,110 and 23 complete rosters are protected by tests. See VALIDATION.md for executed checks and the local commit.
