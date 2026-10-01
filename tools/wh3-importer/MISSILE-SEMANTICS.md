# Missile source existence and runtime semantics

Display name is not identity. This layer consumes one exact traced CA main root;
it neither selects a canonical root nor revises the reviewed catalog policy.
`Unit.id` remains the catalog source/context tuple where applicable. Land sharing
does not share main junctions or entire normalized Units. No production data/UI,
game process, full importer, composite count/HP/mass formula or faction registration
was changed by this work.

## Existing gap

The legacy trace/observation selector follows engine missile weapon first, then
land primary, then default projectile. The pilot extras inspect main junctions
and alternate projectiles. Blocker review separately inspects rider personalities
and effect-conditioned overrides. A default projectile can therefore exist while
the single `Unit.missile` block cannot describe the whole source. A missing legacy
primary chain is likewise not proof of missile absence (Dread Saurian).

The new module reuses `EvidenceProbe` and a small shared `collectEffectConditions`
traversal. It preserves the old blocker contracts and name-based pilot behavior;
it does not refactor the core trace/discovery into an unrestricted crawler.

## Contract and bounded traversal

`inspectMissileSources(source, dump)` returns `{ evidence, contract }`.
`missileSourceContract(evidence, { mainKey, landKey })` replays schema joins into
`warhammer-vault-missile-sources-v1`. Every inspection is limited to one exact
main, 400 retained rows, 100 probe steps and 100 explicit values per selection.
A run accepts at most 30 selected saved sources. No reverse path from a shared
weapon/entity to unrelated mains is traversed.

| Role | Schema path |
| --- | --- |
| LAND_PRIMARY | main.land_unit -> land.primary_missile_weapon -> weapon |
| ENGINE | main -> land.engine -> battlefield_engines.missile_weapon -> weapon |
| RIDER | main -> land <- attachment.land_unit; attachment.battle_personality -> personality.battle_entity_stats -> stats.primary_missile_weapon -> weapon |
| MAIN_SPECIFIC_JUNCTION | main <- unit_missile_weapon_junctions.unit; junction.missile_weapon -> weapon |
| JUNCTION_STATS_OVERRIDE | exact-main junction.battle_entity_stats_override -> stats.primary_missile_weapon -> weapon |

Engine/personality battle-entity owners and attachment slots are retained. Weapon
default projectile and each alternate projectile junction are separate nested
paths with edges. Explosion and penetration references are followed, not folded
into direct projectile damage. A default and alternate reference to the same key
still remain different paths.

The effect plan follows junction <- effect-bonus -> effect <- skill/bundle/
technology/building/frontend membership. It follows verified skill/node/set/
agent-subtype, bundle/scope and bundle <- ritual payload -> ritual branches,
plus technology/building/context owners when present. Frontend reference fields
are identified from processed schema metadata. There is no Lua/script/session
search or unbounded condition enumeration. Exposed zero-match selections and
unavailable sources are distinguishable; a bounded zero match is not global
absence of an enabler.

Each path preserves main/land keys, origin raw row, weapon/projectile row IDs,
schema relationship edges, owner/entity/stats, attachment facts, weapon flags,
conditional junction/effect/source rows and DIRECT existence provenance.
`source` also retains main/land raw key facts and the main-to-land edge.
`conditionEvidence` points into the full retained row/schema/coverage graph.
Path IDs encode exact main, role, origin and edge sequence; they are lossless
identities within the source snapshot, not cross-version gameplay IDs. Never
dedupe these by weapon key, land key, display name or attachment count.

## Existence, activation and ammo

| Facet | Meaning |
| --- | --- |
| STATIC_PRIMARY | Weapon placed in the land primary DB field. |
| STATIC_COMPONENT | Weapon placed in an engine/personality stats path. |
| CONDITIONAL | Main junction has a verified effect-bonus linkage. |
| RUNTIME_UNRESOLVED | Main junction exists without a verified enabling effect in scope. |
| active=UNKNOWN | No active battle profile was observed, including static placements. |
| precedence/combination=UNRESOLVED | No replacement, priority, stacking or coexistence policy inferred. |

STATIC never means ALWAYS_ACTIVE. A conditional effect row is a linkage, not proof
of current activation. Row order, values, priority, key spelling and suffixes cannot
select/apply an override. `enablingEffects` retains the compatible blocker-review
name, raw bonus values and source conditions without asserting effective scope.

Raw land `primary_ammo`, `secondary_ammo`, `infinite_secondary_ammo`, weapon
`use_secondary_ammo_pool`, `hide_secondary_range_ammo_statistics_ui`, `precursor`,
attachment slot/type and personality `autonomous_rider_can_shoot_in_melee` remain
facts. Full owner/weapon rows remain in evidence, including any stored counts.
`ammoSemantics` explicitly marks display conversion, consumption and pool sharing
UNRESOLVED, and attachment scaling NOT_AUTHORIZED.
`rawCounts` counts DB attachment rows and reference paths only. None is displayed
ammo/entity count, volley size, damage/DPS or a multiplication factor. Pool sharing,
display conversion, loss/disablement and actual melee firing remain unresolved.

## Completeness and presentation

| completeness | Meaning |
| --- | --- |
| COMPLETE_STATIC_SINGLE | One complete land/engine path and one projectile in the bounded graph. Existing raw base-field mapping may continue. |
| STRUCTURE_KNOWN_RUNTIME_UNRESOLVED | Complete source graph with multiple/component/conditional/projectile paths; runtime activation or single-profile presentation unresolved. |
| INCOMPLETE_DB_CHAIN | Missing/ambiguous named field, processed reference, owner/projectile edge, target or bounded scope. Known rows/paths survive. |
| NO_MISSILE_PATH | All relevant bounded root/land path scopes closed, no path and explicit finite nonnegative primary/secondary ammo both zero. Not a global runtime-absence claim. |
| UNKNOWN_APPLICABILITY | No found path but ammo is positive/unknown; never converted to NOT_APPLICABLE. |

`structure`, `staticMultiplicity`, runtimeRequired and single-block presentation
are independent facets. Multi-source graphs here remain runtime-unresolved even
when every DB edge is present; a future runtime-confirmed combination policy is
not implemented. Incomplete traversal preserves the last complete query selection
and issues, then continues independent branches. Matching strings cannot restore
an edge. Source identity failure throws rather than inventing a source.

`verifyMissileInspection` checks game/schema/pack/source-kind, recomputes the contract
and compares exact main/land and overlapping trace raw rows/schema/pack/path
pointers. Serialized `singleBlockSafe` flags cannot authorize mapping. Missing
nonidentity rows in an incomplete inspection do not erase known nonmissile Unit
values; missile mapping stays withheld. Actual conflicting raw rows fail closed.

Diagnostic context materialization always supplies the sidecar to `normalizeUnit`.
For complete static single sources it retains the existing DIRECT missile base
fields. All existing ammo/reload/DPS/accuracy formula gates still apply. For
complex or incomplete sources it copies no representative missile fields into
`Unit.missile`. Valid former base fields remain in
`normalized.missilePresentation.withheldFields` with value, DIRECT kind and source;
omissions remain explicit. No weapon is replaced and no sidecar metadata inflates
`provenance.fields` counters. Nonmissile mappings/omissions/provenance are unchanged.

Coverage distinguishes single-profile presentation omission from incomplete DB
graph, and uses known sidecar paths before considering NOT_APPLICABLE. It retains
legacy MULTIPLE_MISSILE_WEAPONS/UNKNOWN_MISSILE_CHAIN and invalid raw/enum findings;
it adds MISSILE_PRESENTATION_UNRESOLVED/INCOMPLETE_MISSILE_SOURCE_GRAPH as needed.
The legacy name-based path is unchanged for comparison, including its narrower
default-chain findings. Its historical primary fields are not promoted as a
complete active missile profile by the new sidecar.

The bounded review CLI also normalizes all selected context/comparison traces with
this gate and validates them through the actual Unit validator. Comparison faction
IDs use existing explicit pilot permission aliases; the diagnostic registry is
the union of those aliases and the context registry. Validator rejection is stored
separately, with no successful normalized Unit. Every result has productionEligible
false; context classification never grants production eligibility.

## Actual CA results (2026-10-01)

CA game 9.0.1.0, RPFM 5.1.0, schema format 5. Source schema SHA256
`5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4`;
db.pack SHA256 `397effc6551e866de89674a97abb75f8cea5028460ba578441ceeb50ed89d744`.
The complete manifest retains local_en.pack hash and physical row provenance too.

| Source/context | Paths | Findings |
| --- | ---: | --- |
| Helstorm ordinary Empire | 2 | Engine `wh_main_emp_rocket_battery`; main-only `wh_main_emp_rocket_battery_upgraded`. |
| Helstorm Imperial Supply | 1 | Shared engine path only; no inherited junction. |
| Handgunners ordinary Empire | 2 | Land `wh_main_emp_rifle`; main-only `wh_main_emp_rifle_upgraded`. |
| Handgunners Imperial Supply | 1 | Shared land primary only. |
| Steam Tank ordinary Empire | 6 | Land cannon + 3 attachment paths + exploding-cannon main junction + stats-override weapon reference. |
| Steam Tank Imperial Supply | 4 | Shared land cannon + same 3 attachments; no ordinary-only junction/stats override. |
| Free Company Militia | 3 | Base pistol plus two independently effect-linked main junctions. |
| Dread Saurian | 12 | 2 blowpipe and 10 javelin attachment paths, no fabricated primary chain. |
| Necrofex Colossus | 6 | Land cannon plus 5 rider-rifle paths. |
| Ratling Guns | 1 | Complete static single land primary. |
| Swordsmen | 0 | Explicit zero ammo and closed bounded scopes: NO_MISSILE_PATH. |
| Both Flamers contexts | 1 each | Independent complete static primary sources. |
| Other 11 of the 19 reviewed context candidates | 0 each | Both Bloodthirsters, three Crypt Horrors, both faction Warhounds, both faction Hexwraiths and both Zombies retained; NO_MISSILE_PATH. |

Steam Tank attachment weapons are `wh_main_emp_steam_tank_cannon_ball`,
`wh_main_emp_steam_tank_steam_gun`, and
`wh3_dlc25_emp_steam_tank_engineer_commander_pistol`. Cannon, land primary and
`wh3_dlc25_emp_veh_steam_tank_cannon` override stats reference the same base cannon
weapon through three distinct paths on ordinary main. The main junction separately
references `wh3_dlc25_emp_steam_tank_cannon_ball_exploding`. Neither simultaneous
cannons nor override precedence follows from these references.

Helstorm's junction links
`wh3_dlc25_effect_ritual_gunnery_school_helstorm_rocket_split`; no enabling
skill/bundle/ritual/technology/building row was found in the bounded scope. Its
trigger remains unresolved. Handgunners' exploding-bullet effect has a verified
bundle/payload/ritual chain `wh3_dlc25_ritual_emp_don_inf_guns_3`. Steam Tank's
corresponding chain is `wh3_dlc25_ritual_emp_don_steam_tank_2`. These are DB
relationships, not evidence of effective runtime conditions or availability.

Free Company base is `wh_dlc04_emp_free_company_pistol`. Its blessed weapon
`wh2_dlc17_emp_free_company_pistol_blessed` connects through
`wh2_dlc17_projectile_replacement_free_company_ap_bullet` to Volkmar's
`wh2_dlc17_skill_emp_volkmar_unique_mere_mortal_men` (general_to_force_own,
level/value 1), including skill-node/set/agent-subtype evidence. Its upgraded weapon
`wh_dlc04_emp_free_company_pistol_upgraded` links the same exploding-bullet ritual
chain as Handgunners (faction_to_force_own_unseen, raw start_turn_completed).
Neither key names nor these raw scopes/stages prove replacement or transition timing.

Dread's blowpipes use `wh2_main_lzd_mon_stegadon_blowpipe` with secondary-pool=false;
javelins use `wh2_main_lzd_javelin_rider` with secondary-pool=true. Raw ammo is
80 primary / 180 secondary, preserved without arithmetic. All 12 personality paths have the raw melee-fire
flag true. Necrofex cannon `wh2_cst_necrofex_colossus_cannon` and five
`wh2_dlc11_cst_rifle_rider` paths remain distinct; rider pool/melee flags are true.
Necrofex raw ammo is 22 primary / 70 secondary. These do not establish actual ammo
consumption, simultaneous firing or rider count.

Across 19 contexts plus 5 saved comparisons: **24 inspected, 40 weapon reference
paths, 17 distinct weapon keys, 17 distinct projectile keys**. Role counts:
LAND_PRIMARY 9, ENGINE 2, RIDER 23, MAIN_SPECIFIC_JUNCTION 5,
JUNCTION_STATS_OVERRIDE 1. There are 5 static-single, 7 static-multi/runtime-unresolved,
12 bounded no-path sources; 4 units have effect-linked conditional paths; incomplete
DB chains 0. Seven complete sidecars cannot fit a safe single profile and require
runtime checks. Five permit existing base-field copies, but **0 fully populated
Unit.missile profiles**: displayed ammo/DPS and other semantics gates remain.
All 24 diagnostic normalizations validate, blocked/validation failure 0. Six Units
withhold 68 formerly copied missile fields (Dread already lacked a primary block).

## Before/after and retained artifacts

| Metric | Before | After |
| --- | ---: | ---: |
| Name-based CLEAN/PARTIAL/BLOCKED | 1/14/9 | 1/14/9 |
| Name-based identity ambiguity / validation failure | 9/0 | 9/0 |
| Name-based DIRECT/GENERATED/CURATED | 374/15/52 | 374/15/52 |
| Context attempted/materialized/PARTIAL/BLOCKED | 19/19/19/0 | 19/19/19/0 |
| Context default-visible/context-only | 12/7 | 12/7 |
| Context validation failure / production eligible | 0/0 | 0/0 |
| Context structural omission events | 75 | 79 |
| Context semantics omission events | 284 | 284 |
| Context omitted field events | 612 | 658 |
| Context UNKNOWN_MISSILE_CHAIN | 0 | 0 |
| Context MULTIPLE_MISSILE_WEAPONS | 3 | 3 |
| Context missile presentation omission | 0 | 4 |
| Context DIRECT/GENERATED/CURATED | 543/19/80 | 497/19/80 |

Context graph metrics now independently report 19 inspections, 18 paths, 9 weapon/
projectile keys, 4 static singles, 4 runtime-unresolved multis and 11 no-path sources.
Four intentional Unit changes: ordinary Helstorm 14, ordinary Handgunners 10,
ordinary Steam Tank 11 and Supply Steam Tank 11 direct missile fields withheld.
All 46 values and source pointers remain diagnostic facts; no nonmissile value or
field kind changes. Supply Helstorm/Handgunners and both Flamers retain their single
base mappings. Invalid enum and other former omission findings are retained, not
deleted. Sidecar metadata is not counted as Unit field provenance.

Artifacts are intentionally ignored, version-bound diagnostics, not production
data committed to Git:

- Previous context baseline: `generated/wh3/context-materialization/2026-10-01T03-24-00.287Z`.
- Rerun pilot/blocker review: `generated/wh3/blocker-review/2026-10-01T03-57-26.822Z`.
- Sidecar-equipped 19 contexts: `generated/wh3/context-materialization/2026-10-01T04-15-59.284Z`.
- Bounded 24-source missile review: `generated/wh3/missile-semantics/2026-10-01T04-16-16.219Z`.

Verification: basic suite **137/137** (15 new missile contract tests); saved actual
CA blocker/catalog/context/missile suites **24/24**; live CA integration **5/5**
(including the original three profile regressions); `npm run build` passed.

## Reproduce and boundaries

With the existing local ignored CA install/RPFM configuration:

```powershell
node tools/wh3-importer/blocker-review/cli.mjs
node tools/wh3-importer/catalog-identity/materialize-cli.mjs --review-dir COMPLETE_REVIEW_DIR
node tools/wh3-importer/missile-semantics/cli.mjs --context-dir COMPLETE_CONTEXT_DIR --pilot-dir COMPLETE_REVIEW_DIR/pilot
npm test
npm run build
$env:WH3_INTEGRATION_CONFIG = 'tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
$env:WH3_BLOCKER_REVIEW_DIR = 'COMPLETE_REVIEW_DIR'
$env:WH3_CONTEXT_MATERIALIZATION_DIR = 'COMPLETE_CONTEXT_DIR'
$env:WH3_MISSILE_REVIEW_DIR = 'COMPLETE_MISSILE_REVIEW_DIR'
node --test tools/wh3-importer/blocker-review/integration.test.mjs tools/wh3-importer/catalog-identity/integration.test.mjs tools/wh3-importer/catalog-identity/materialize.integration.test.mjs tools/wh3-importer/missile-semantics/integration.test.mjs
```

The missile CLI has no newest-directory or source-name discovery fallback. Saved
comparison labels select already-traced requests, whose exact main/land and pack
snapshot are reverified. It does not modify the saved pilot/context run. It emits
each result and full schema evidence; COMPLETE means bounded results were saved,
not that every weapon is active or every Unit production-ready.

See [the practical runtime checklist](blocker-review/RUNTIME-CHECKLIST.md). **Full
import is still not approved**: activation/precedence/combination/ammo behavior is
unverified for complex sources; name-only ambiguities still block; composite entity
display policy, other semantics/alias omissions and production faction/catalog
registration remain separate work. This contract establishes weapon-source facts,
not displayed combat profiles or an effective campaign simulator.

Implementation files: `missile-semantics/{collect,contract,cli}.mjs`, contract types
and saved-CA integration tests; context materializer/types/integration; normalizer/
types; pilot analysis; shared blocker override traversal. Documentation changes
are this file, MATERIALIZATION.md and blocker-review/RUNTIME-CHECKLIST.md. Synthetic
tests live in `tests/wh3-missile-semantics.test.cjs`. The five pre-existing user
changes, production units/factions and UI stay outside this commit.
