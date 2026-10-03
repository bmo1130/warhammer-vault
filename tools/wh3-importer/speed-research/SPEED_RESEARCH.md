# Speed source inspection — 101 Production units

This commit is research only. Production/Sample data, HP inputs/reviews/policies,
normalization, runtime probe, missile and UI are unchanged. No speed admission or
projection is implemented. No game, new measurements or external data were used.

## Findings and actual source chains

Production has no `movement.speed`, `groundSpeed` or `chargeSpeed` values. The
normalizer explicitly withholds those fields: `normalization/policy.mjs` rejects
unconfirmed display conversion. `observations/entity.mjs`, `base.mjs` and
`missile.mjs` observe raw speed, while `hypotheses.mjs` calculates only the
unresolved `rawSpeed * 10` hypothesis. `report.mjs` lists raw comparison sources;
its array order is presentation code, not verified component precedence.
`src/pages/UnitPage.tsx` displays `unit.movement.speed` directly without conversion.

These are the actual processed-schema forward joins found in committed traces:

| Role | Exact chain ending in a `battle_entities_tables.key` record |
| --- | --- |
| man | `main_units_tables.land_unit → land_units_tables.key → man_entity → battle_entities_tables.key` |
| mount | main→land, then `land_units_tables.mount → mounts_tables.key → entity → battle_entities_tables.key` |
| engine | main→land, then `land_units_tables.engine → battlefield_engines_tables.key → battle_entity → battle_entities_tables.key` |
| articulation | main→land, then `land_units_tables.articulated_record → land_unit_articulated_vehicles_tables.key → articulated_entity → battle_entities_tables.key` |

Actual movement fields are `battle_entities_tables.run_speed`, `walk_speed`,
`charge_speed`, `fly_speed`, `flying_charge_speed` (F32, table version 39), and
`locomotion_constants` (reference to `battle_entity_locomotion_constants.key`).
Other discovered fields such as turn/strafe/collision speeds are enumerated in
`report.json`; they are not substituted for base movement. No direct speed field
was found on the inspected main/land/mount/engine owner records. The land field
`sync_locomotion` is a Boolean; it is not a documented component selector.
The schema also has `main_units_tables.mount → campaign_mounts.model`, distinct
from the observed battle chain `land_units_tables.mount → mounts.key → entity`.
The existing observation code uses the latter; matching field names are not
permission to substitute the campaign relation.

The existing committed articulation source supplies the exact missing
articulated-record/entity joins for Skeleton Chariots and Black Coach. This is
read-only reuse of raw source rows, not further entity or HP research. All 101
chains have the reviewed 9.0.2.0 schema/pack snapshot
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

## Ten existing sample identities

Numbers after the arrow are the existing unconfirmed ×10 hypothesis, **not
expected readings or admitted values**. Raw `run_speed` is shown for every role;
there is no preferred role. Full exact keys, join row IDs, field provenance,
source/extraction hashes and walk/charge/flight values are in `report.json`.

| Existing sample | Raw run speeds → unconfirmed display candidates | Source topology |
| --- | --- | --- |
| Swordsmen | man 3 → 30 | MAN_ONLY |
| Mounted Yeomen | man 3.3 → 33; mount 9.2 → 92 | MOUNTED |
| Dragon Ogres | man 6.4 → 64 | MAN_ONLY |
| Dread Saurian | man 3.3 → 33; mount 6 → 60 | MOUNTED |
| Skeleton Chariots | man 2.8 → 28; mount/engine/articulation 7.4 → 74 | ARTICULATED |
| Field Trebuchets | man 3 → 30; engine 2 → 20 | ENGINE |
| Screaming Skull Catapults | man 2.8 → 28; engine 2 → 20 | ENGINE |
| Plagueclaw Catapults | man 4.2 → 42; engine 2 → 20 | ENGINE |
| Doom-Flayers | man 4.2 → 42; engine 7.2 → 72 | ENGINE |
| Black Coach | man 3 → 30; mount/engine/articulation 7.8 → 78 | ARTICULATED |

The ten subjects reuse their exact existing identities, not their HP observations
as speed validation. Existing raw HP captures contain no independent displayed
speed readings. Mounted and engine routes expose multiple different candidate
values. Equal mount/engine/articulation values cannot reveal source precedence.
Artillery engine walk/run speeds coincide at 2 in the three listed samples;
this also cannot distinguish walk from run interpretation. An engine speed of
7.2 in Doom-Flayers is an exact different source, not an exception to be forced
into an artillery rule. Category labels were not used to select any component.

## Conversion, exceptions and modifiers

`semantics-findings.json` labels ×10 STRONGLY SUPPORTED, `safeToNormalize: NO`.
Its supporting manual comparisons are explicitly user-provided wiki references;
they are not CA display ground truth and are not used to establish this report's
confidence. Raw run-speed values are not independently proven display units.
There is no verified factor, rounding, integer conversion or executable UI
mapping in the inspected repo sources. Hypothesis arithmetic applies no rounding.

The saved `generated/wh3/research/stat-inspection.json` contains
`ui_unit_stats_tables.key = scalar_speed` with a Speed icon/localisation, min 0 and max
140, plus `unit_stat_localisations_tables.stat_key`. These are presentation
definitions, with no exact run-speed→display conversion or component-selection
join. The historical schema's `fly_speed` description distinguishes movement
in air from ground movement; it does not supply a display formula.

Actual flight paths occur in Vargheists (man run 6.5 / fly 9.2), Pegasus Knights
and Royal Pegasus Knights (mount run 8.2 / fly 10.5). The older observation module
only surfaces man flight fields; the raw mount record already contains its own
flight fields. This inspection retains those fields without changing that model
or silently treating a flying mount's rider as the movement source.

91 traces also retain schema-joined `ground_type_to_stat_effects_tables` rows:
`affected_stat = scalar_speed`, `affected_group`, `ground_type`, `multiplier`,
linked to `land_units_tables.ground_stat_effect_group`. Examples include 0.8
terrain multipliers. These prove conditional effects exist, not that the neutral
base card needs a terrain multiplier. They are never folded into raw/base speed.
Locomotion references and bounded skipped references do not prove final runtime
speed or all modifier application order. No new modifier calculation was made.

## Availability and safe automation boundary

| Classification | Count | Meaning |
| --- | ---: | --- |
| SPEED_DIRECT_STATIC | 0 | Display-ready value, conversion and selection fully evidenced |
| SPEED_AMBIGUOUS | 101 | Raw exact source available; display interpretation unproven |
| SPEED_UNAVAILABLE | 0 | Required identity, join, record or run-speed field unavailable |

Exact topologies: MAN_ONLY 71, MOUNTED 21, ENGINE 7, ARTICULATED 2. Of these,
70 are single-ground-source MAN_ONLY traces with explicit zero fly speed,
45 distinct endpoint records, no competing component speed and repeated exact
main→land→man joins. Raw source availability is confident in that subset;
display-speed semantics are not. One other MAN_ONLY trace flies. 83 distinct
battle-entity records occur across all profiles. The complete 101-unit inventory
and separate ambiguity reasons are in `report.json`.

Safe Production automation **now: 0 units**. A future DIRECT interpretation must
retain exact identity, reviewed game/schema/pack snapshot, raw source hash and
row/key/field/schema/forward joins; prove the display transformation and any
rounding for that exact structural profile; exclude competing sources and
context-dependent adjustments to the intended base card. A single raw field
or a similar category is insufficient. No such admission rule is implemented.

## Need for validation

Static source availability is sufficient; static-only Production display-speed
interpretation is not. Independent neutral-context game card/runtime evidence
or an exact CA conversion/selection implementation is still needed. This report
does not request measurements or implement a probe. A minimal possible later
comparison set is:

1. Swordsmen: distinguish raw run 3 vs ×10=30, walk 1.5 vs 15, charge 3.8 vs 38.
2. Mounted Yeomen: distinguish rider 33 vs mount 92 under the existing hypothesis.
3. Field Trebuchets: distinguish crew 30 vs engine 20 under the same hypothesis.

One reading can test the unmounted conversion example; three cover the basic
man/mount/engine competing interpretations. They would not prove all 101 units,
flying selection or articulated precedence. No additional candidates are chosen.

## Reproduction and saved-trace cross-check

```powershell
node tools/wh3-importer/speed-research/research.mjs --check
node --test tests/wh3-speed-research.test.cjs
# Optional read-only audit of existing ignored captures; no game or extraction:
node tools/wh3-importer/speed-research/research.mjs --check-generated
```

The deterministic report reads existing committed compact source bundles and
the stored exact source-pointer index. It does not invoke any HP research or
runtime admission function. Schema/row dictionaries are decoded in memory;
no generated input is needed for the 101-unit replay. Sample traces retain one
exact speed-record source chain rather than copying entire raw source bundles.

Read-only generated audit: 40 saved traces inspected, 17 exact Production-unit
matches, 7 shared-entity-only comparisons, 16 without a Production entity match.
The latter are inspected source structures, not validated Production matches.
Inputs include historical pilot traces and the 19 materialized 9.0.2 contexts at
`generated/wh3/refresh-9.0.2/context-materialization/2026-10-01T10-25-28.824Z/`.
Different units sharing an entity record retain separate identities; historical
9.0.1 snapshots retain their own snapshot IDs. Shared-key/raw-value equality
supports field availability, never display conversion. The audit records each
original file SHA256 in ignored `speed-stored-trace-audit-2026-10-03.log`.

Changed files are this document, `research.mjs`, `report.json`, and
`tests/wh3-speed-research.test.cjs`. Existing tracked files remain byte-identical.

Validation: Speed tests 7/7; regression selection including Speed and excluding
HP research/admission tests 308/308; build PASS. No HP research replay/generation
command was run. All 304 preceding tracked files retain their original byte
hashes, including Production/Sample, HP, MEDIUM evidence and policies. Clean
source-only replay PASS; Speed tests there pass 6 with the optional ignored-trace
audit skipped. No existing artifact is regenerated or rewritten.
