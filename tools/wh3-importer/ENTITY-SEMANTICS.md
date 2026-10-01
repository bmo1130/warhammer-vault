# Entity structure and presentation contract

`warhammer-vault-entity-structure-v1` preserves component existence and ownership
for one exact CA main source. It is diagnostic evidence, outside the production
`Unit` schema. No game or full importer was executed. Display count, card HP,
targetability, casualty allocation and Unit Size formulas remain unresolved.

## Existing behavior and the new boundary

The raw tracer already followed `land_units.man_entity`, mount and engine owners.
`observationContext.rider` is the historic name of the man entity selector: it is
not evidence that this row is a live rider. The normalizer copied mass,
`entities.entitySize` and `defense.projectilePenetrationResistance` from that row
only when land mount/engine references were empty. It never populated
`entities.count`, `healthPerEntity`, `totalHealth` or `unitScale`: those mappings
remain behind the existing semantics gate. The old blocker review recorded
articulated and personality paths separately but could not gate normalization.

Mount/engine absence is insufficient when articulated or attachment paths exist.
The optional new gate replays the sidecar's processed schema graph, checks the
source snapshot and compares overlapping exact raw rows/pointers with the trace.
Only a complete single **MAN path**, with no other component paths, permits the
existing valid per-entity mass/size/penetration fields. This is not a claim of one
live model, nor a unit-wide aggregate. Unknown size values do not invalidate an
otherwise valid mass facet. Incomplete graph evidence permits none of these
representative properties. No largest/smallest/average/weighted role is selected.

Diagnostic context materialization always supplies this gate. Legacy name-based
pilot/normalization keeps its existing mode so before/after comparisons remain
explicit. UI, faction production registration and `src/data/units.json` are
unchanged. Every materialized result remains `productionEligible: false`.

## Bounded graph and ownership

All paths start at an exact `main_units.unit -> land_units.key` schema edge.
Roles describe DB placement, not live model semantics:

| Role | Explicit path after main/land | Cardinality source |
| --- | --- | --- |
| MAN | `land.man_entity -> battle_entities` | `main.num_men` |
| MOUNT | `land.mount -> mounts.entity -> battle_entities` | `land.num_mounts` |
| ENGINE | `land.engine -> battlefield_engines.battle_entity` | `land.num_engines` |
| ARTICULATED | `land.articulated_record -> articulated_entity` | No segment count inferred |
| AMMO_CAISSON | `land.articulated_record -> ammo_caisson_entity` | No count inferred |
| PERSONALITY_ATTACHMENT | reverse land-owned junction, then `battle_personality -> battle_entity` | Raw junction rows/slots only |

Attachment personality `battle_entity_stats` is a separate ownership edge, never
an implicit lookup by matching entity key. The reviewed CA stats schema has only
`key`, `primary_melee_weapon` and `primary_missile_weapon`; it is not a second HP
row. Exact-main missile junction `battle_entity_stats_override` ownership is
retained separately under `statsOverrides`, with activation UNKNOWN. These
weapon-only rows do not manufacture physical entity instances. Ordinary Empire
Steam Tank's override is not copied to its shared-land Imperial Supply sibling.

Each path retains main/land keys, unique `pathId`, origin/owner raw row, entity
key, stats row if present, schema edges, attachment slot/articulation index,
entity facts, health facts, locomotion-constant reference/row and provenance.
`entity.fields` includes the raw mass, size, hit_points, height, radius, shape,
collision/penetration and movement fields with individual source pointers.
Main and land raw rows are also retained. Full evidence includes every selected
row, processed schema version, relationship, query coverage and source pack.
Repeated keys are never deduplicated across roles or attachment paths.

The inspector limits each source to 400 rows and 60 explicit steps, continues
independent branches after a broken edge and records incomplete branches. It
never crawls from a shared entity back to sibling units or through weapons.
Animations/visual variants, simulation and scripts are outside this graph.
The attachment `attach` field references `battle_personalities_attach_types`,
which is not exposed in this CA schema. Its raw value/schema pointer is retained
with interpretation UNRESOLVED; its vocabulary is outside component completeness.
PERSONALITY_ATTACHMENT is classified by the owned junction placement, not by
parsing `autonomous_rider` or a key suffix.

## Raw cardinality, health and presentation

`rawCardinality.numMen/numMounts/numEngines` carry the unchanged raw fact, role,
`semanticsStatus: RAW_COUNT_ONLY`, and `cardinalityMeaning: UNRESOLVED`.
`attachmentRows`, `attachmentSlots` and `articulatedRows` are explicitly GENERATED
counts of bounded DB rows, with row IDs/slot facts. A slot count is rows with a
nonempty slot field, not a number of live riders or even unique runtime slots.
Articulation node indices are relationships, not inferred segment counts.
These metadata observations do not enter Unit field provenance counters.

Entity `hit_points` is RAW_ENTITY_HEALTH. Land `bonus_hit_points` is
RAW_LAND_BONUS_ONLY, not LAND_TOTAL_HEALTH. No verified land-total/card-health
field was found in the reviewed scope. The current Unit health fields stay
absent. No entity HP × count, mount + rider HP, engine + crew HP, or land bonus
addition is performed, even when the result looks plausible.

Structure states are COMPLETE_SINGLE_ENTITY (one MAN DB path), COMPLETE_MULTI_ROLE,
INCOMPLETE_DB_CHAIN and UNKNOWN_APPLICABILITY. COMPLETE is bounded component
coverage; it does not claim complete runtime behavior. `presentation.status`
remains DISPLAY_RELATION_UNRESOLVED independently of structure. `countSafe` and
`hpSafe` are false; `massSafe`, `sizeSafe`, `penetrationSafe` independently permit
only the existing single-MAN per-entity fields. Runtime facets keep displayed
count/health, targetable entities, casualty unit, separate component deaths and
articulated hit targets UNRESOLVED. No numeric `displayedModelCount`,
`totalEntities`, `effectiveModels`, `totalHP`, `averageMass` or `aggregateMass`
is produced.

For unsafe properties the normalizer retains an omission and, when an old valid
field would have mapped, `entityPresentation.withheldFields` preserves its field,
previous value/rawValue, complete previous DIRECT field provenance, matching
role/path edges and reason. Raw properties of every component remain in the
sidecar even when the legacy selector had already omitted the Unit field.
Non-entity values/provenance, missile sidecar/presentation and all other omissions
must remain identical. Known unresolved presentation is categorized as
ENTITY_PRESENTATION_UNRESOLVED; broken component graphs use
ENTITY_STRUCTURE_INCOMPLETE. Legacy UNKNOWN_ENTITY_ROLE remains in legacy mode.
Count/HP semantics omissions and unrelated exceptions are not deleted.

## Unit Size evidence

The separate global `unit-size-evidence.json` retains `unit_sizes` (small, medium,
large, ultra), `unit_stat_to_size_scaling_values -> unit_sizes` and its processed
`stat -> modifiable_unit_stats` edge. This snapshot has 24 scaling rows for six
damage stat keys: melee base/AP, missile base/AP and missile explosion base/AP.
It has no row proving `num_men`, mount, engine, displayed count or HP conversion.
The schema inventory also exposes `unit_size_global_scalings` for battle-type
building/siege-vehicle damage/HP fields; those are not a schema-connected formula
for these unit counts. These tables do not establish the base Unit Size setting,
component classification or runtime application. No global scalar is applied,
including damage scalars: missile semantics are outside this task.
`unitSizeScaling` and `applicationToSourceCounts` remain UNRESOLVED.

## Actual CA results (2026-10-01)

Source: game 9.0.1.0, RPFM 5.1.0, schema format 5.
Schema SHA256 `5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4`.
db.pack SHA256 `397effc6551e866de89674a97abb75f8cea5028460ba578441ceeb50ed89d744`.
local_en.pack SHA256 `09326078a25b7f1ed0c3c4c710df6fa22bdf7238fe7074fe369d8621d041a6dd`.
All raw values below are DB facts, not displayed values or verified formulas.

| Exact source | Men / mounts / engines | Component paths | Physical owners / raw mass and size |
| --- | --- | --- | --- |
| `wh2_dlc11_cst_mon_necrofex_colossus_0` | 5 / 1 / 0 | MAN + MOUNT + 5 attachments = 7 DB paths | MAN and MOUNT reuse `wh2_dlc11_cst_mon_necrofex_colossus` (5500, very_large); riders use `wh2_dlc11_infantry_zombie_blood` (90, small) |
| `wh2_dlc13_lzd_mon_dread_saurian_1` | 12 / 1 / 0 | MAN + MOUNT + 12 attachments = 14 paths | `wh_main_infantry_rider` (100, medium); `wh2_dlc13_lzd_mon_dread_saurian_blood` (12000, very_large); 2 skink-stegadon rider paths (90, very_large), 10 warbeast rider paths (100, very_large) |
| `wh_main_vmp_veh_black_coach` | 1 / 2 / 1 | MAN + MOUNT + ENGINE + ARTICULATED + 1 attachment = 5 paths | MAN (100, small), mount/engine/articulation (each 2000, large), attachment (100, medium); empty caisson reference |
| `wh2_dlc09_tmb_veh_skeleton_chariot_0` | 24 / 2 / 12 | MAN + MOUNT + ENGINE + ARTICULATED + 2 attachments = 6 paths | Skeleton MAN/attachments reuse one key (80, small); mount/engine/articulation each raw 1500, large; empty caisson reference |
| `wh_main_emp_inf_swordsmen` | 120 / 0 / 0 | 1 MAN path | 100, small: existing per-entity fields retained |
| `wh_main_brt_cav_grail_knights` | 48 / 48 / 0 | MAN + MOUNT | 100/1200, both medium: representative fields omitted |
| `wh3_main_kho_mon_bloodthirster_0` | 1 / 0 / 0 | 1 MAN path | 4000, very_large: existing per-entity fields retained |
| `wh_main_emp_art_helstorm_rocket_battery` (+ separate Supply source) | 44 / 0 / 4 | MAN + ENGINE, per exact source | Crew 100, small; engine 2000, large: representative fields omitted |

All four mandatory composites have raw entity hit_points=8 for the listed
owners; their land bonus_hit_points are respectively 9459, 14984, 5940, 538.
This is not total HP. Helstorm's crew/engine raw HP differ (8/425), with land
bonus=48. Swordsmen/Bloodthirster/Grail raw entity HP=8 and land bonuses
61/7724/136. None of these values are added or multiplied. Black Coach and
Skeleton Chariots retain distinct articulation entities and raw node indices;
no independent targetability is asserted. Necrofex retains five separate
personality/stats paths; Dread retains two and ten paths to its two stats owners.
Their previously verified cannon/rifle/blowpipe/javelin sidecars are unchanged.

### Metrics and regression

The bounded review includes all 19 exact contexts and six preserved pilot traces
(the four composites, Swordsmen, Grail Knights): 25 inspected, 70 component paths,
33 distinct battle entity keys, 6 distinct stats keys, 75 source cardinality
fields. Roles: MAN 25, MOUNT 9, ENGINE 6, ARTICULATED 4, PERSONALITY_ATTACHMENT 26,
AMMO_CAISSON 0. Fourteen complete single-MAN and eleven complete multi-role
structures; incomplete chains 0. Count-safe/HP-safe 0; mass/size/penetration-safe
14 each. All 25 remain display-count/HP unresolved, diagnostic-valid PARTIAL,
production-ineligible. Additional withheld fields and changed Unit values are
both 0: existing composites already omitted unsafe properties. New fixture
regressions exercise attachment-only and articulated-only shapes and each
withhold three formerly mapped properties with full previous provenance.

| Metric | Before | After |
| --- | --- | --- |
| Name pilot CLEAN / PARTIAL / BLOCKED | 1 / 14 / 9 | 1 / 14 / 9 |
| Name identity ambiguities / validation failures | 9 / 0 | 9 / 0 |
| Name Unit field DIRECT / GENERATED / CURATED | 374 / 15 / 52 | 374 / 15 / 52 |
| Context attempted / normalized / validated | 19 / 19 / 19 | 19 / 19 / 19 |
| Context PARTIAL / BLOCKED / validation failures | 19 / 0 / 0 | 19 / 0 / 0 |
| Default-visible / context-only / productionEligible | 12 / 7 / 0 | 12 / 7 / 0 |
| Context structural / semantics omissions | 79 / 284 | 79 / 284 |
| Context omitted fields | 658 | 658 |
| UNKNOWN_ENTITY_ROLE / ENTITY_PRESENTATION_UNRESOLVED | 6 / 0 | 0 / 6 |
| ENTITY_STRUCTURE_INCOMPLETE | 0 | 0 |
| Context Unit field DIRECT / GENERATED / CURATED | 497 / 19 / 80 | 497 / 19 / 80 |
| Context unknown missile chain / multiple weapons | 0 / 3 | 0 / 3 |
| Context missile presentation omissions | 4 | 4 |
| Changed Unit values / non-entity provenance | — | 0 / 0 |

The 19 contexts add 35 entity paths, 17 entity keys, 3 stats keys: 13 single-MAN,
6 multi-role. Every source/context is kept; no shared-land Unit object or identity
is reused. Six entity-related omissions remain, with a more accurate taxonomy.
Existing OUTSIDE_TRACE_SCOPE exceptions are retained; the auxiliary graph does
not pretend to expand the original trace allowlist.

Verification: 151 basic tests (14 new entity tests); 32 saved actual CA suites
(8 new entity suites); live CA integration 5/5, including the three original
profile regressions; build successful. Validator rejection is never stored as a
successful normalized Unit. No tests require launching the game.

Saved evidence (ignored local artifacts):

- Before context: `generated/wh3/context-materialization/2026-10-01T04-15-59.284Z`.
- After context: `generated/wh3/context-materialization/2026-10-01T04-46-47.869Z`.
- Rerun pilot/blocker: `generated/wh3/blocker-review/2026-10-01T04-46-26.963Z`.
- Entity review: `generated/wh3/entity-semantics/2026-10-01T04-47-07.674Z`.

Reproduce with the installed matching CA packs/RPFM/local config and explicit
COMPLETE input directories; no implicit latest or display-name root selection:

```powershell
node tools/wh3-importer/entity-semantics/cli.mjs --context-dir generated/wh3/context-materialization/2026-10-01T04-15-59.284Z --pilot-dir generated/wh3/blocker-review/2026-10-01T04-46-26.963Z/pilot
$env:WH3_ENTITY_REVIEW_DIR='<new COMPLETE entity review directory>'
node --test tools/wh3-importer/entity-semantics/integration.test.mjs
```

These artifacts/config/game files are environmental inputs, not hidden code
dependencies. All collector/contract/gate/tests live in the repository. The
inspector accepts exact saved traces with matching main/land/schema/pack identity;
changing snapshot or tampering with safe facets fails closed. Missing component
edges stay INCOMPLETE_DB_CHAIN, not a fabricated single-role profile.

## Runtime boundary and next step

Use the concrete two-Unit-Size procedures in
[RUNTIME-CHECKLIST.md](blocker-review/RUNTIME-CHECKLIST.md). No runtime observations
were made here. Record settings/card counts, component losses/targetability and
HP changes separately; do not infer formulas from matching numbers. Catalogue
editorial policy remains separate. Full import is still not authorized: displayed
count/HP/scaling/component death allocation, complex representative mass/size,
missile activation/pool/precedence, and wider unmapped IDs/coverage are unresolved.

## Changed repository files

- `entity-semantics/collect.mjs`, `collect.d.mts`: finite component and separate
  global Unit Size evidence collection.
- `entity-semantics/contract.mjs`, `contract.d.mts`: canonical paths, raw owners,
  completeness/facets, evidence replay and metrics.
- `entity-semantics/cli.mjs`, `integration.test.mjs`: bounded saved-source review,
  diagnostic validation and actual CA regression.
- `normalization/normalizer.mjs`, `normalizer.d.mts`: optional conservative gate
  and complete withheld field provenance.
- `catalog-identity/materialize.mjs`, `materialize.d.mts`,
  `materialize.integration.test.mjs`: diagnostic context connection and tests.
- `pilot-analysis.mjs`: explicit presentation vs graph-incomplete taxonomy/coverage.
- `../../tests/wh3-entity-semantics.test.cjs`,
  `../../tests/fixtures/entity-semantics-contract.ts`,
  `../../tests/wh3-context-materialization.test.cjs`: synthetic regressions and
  typed contract; the old incomplete fixture keeps its non-entity assertions.
- `blocker-review/RUNTIME-CHECKLIST.md` and this document: evidence, boundaries,
  measured before/after results and manual procedures.

The five pre-existing user changes (root README, importer README, NORMALIZATION,
PILOT and normalize-cli) remain byte-for-byte unchanged and excluded from staging.
