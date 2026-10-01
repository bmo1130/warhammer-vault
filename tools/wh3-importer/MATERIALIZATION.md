# Explicit source/context diagnostic materialization

`CATALOG_PLAN_READY` means an exact source/context has a reviewed catalog decision.
It is not a traced Unit, complete battle profile, production registration, or
effective recruitment/runtime fact. This adapter connects that plan to a bounded
trace, conservative normalization and the existing Unit validator. It emits only
ignored diagnostic artifacts. No UI, production faction or unit data is written.

The [catalog identity policy](CATALOG-IDENTITY.md), exact-key registry and existing
counterexample audit are retained. Name-based representative discovery still
reports CLEAN 1 / PARTIAL 14 / BLOCKED 9; no canonical root is selected by name.

## Request and execution contract

`materializeCatalogRequest(source, review, { mainKey, contextId }, validate, options)`:

1. Re-evaluate the selected persisted review against the trusted exact-key registry,
   then call `resolveCatalogRequest`. Serialized READY flags/presentations/faction
   overrides are not authorization. No name-only or partial request can start CA
   reading. Explicit test registries are dependency injection for synthetic tests;
   the actual CLI always uses the committed reviewed registry.
2. Require identical source kind, game version, schema SHA256 and named pack hashes.
   Retain the input plan, candidate, checked decision, original evidence and snapshot.
3. Select the exact main key and require one main row, its declared key, processed
   `land_unit -> land_units.key` reference, one expected land row and the expected
   onscreen-name Loc key/text/schema convention. Verify Loc pack/path too. No display
   name search, paid/free filtering, suffix parsing or context-to-main guessing.
4. Re-read current DB decision guards in a bounded single-source evidence probe.
   Re-evaluate this fresh candidate against the same registry; changed permissions,
   supply/spawn guards or presentation context cannot silently reuse an old plan.
5. Discover trace scopes only from verified selected-root references/memberships.
   `traceUnitByMainKey` uses the existing tracer traversal/allowlist/row budget with
   an exact seed. Existing unique/paid core profiles are unchanged. Verify traced
   main/land/Loc identities and row/schema/pack pointers against the approved plan.
   Inspection and tracer artifact row IDs have different hash formats; compare
   stable table/key/pack/path/schema pointers, not those incidental IDs.
6. `normalizeUnit` receives the fresh reviewed catalog context and revalidates it.
   All existing stat selectors, mappings, omissions, aliases and semantics gates
   are reused. A main-specific missile probe preserves default/alternate chains
   separately, without merging weapons or applying overrides.
7. Run the actual app validator with the explicit diagnostic faction registry.
   Separately record validation against the actual production registry. Check
   presentation-ID collisions against supplied IDs and earlier successful results.
8. Retain success as MATERIALIZED with a separate quality. Every failure is a result
   with the request, stage/reason and available evidence. Rejected normalization is
   kept separately; `unit` and successful `normalized` remain null.

The input `plan.unitMaterialized=false` remains unchanged: it describes the plan.
The result's MATERIALIZED status and validated Unit describe execution. The adapter
never modifies the input review or rewrites name-based pilot outcomes.

| Result status | Meaning |
| --- | --- |
| MATERIALIZED | Exact source/context traced and Unit passed diagnostic validation and collision checks. |
| BLOCKED_POLICY | Missing/unresolved/unregistered exact source/context or invalid registry/evidence. |
| BLOCKED_SOURCE_DRIFT | Main/land/Loc, schema/pack/game/source-kind, stable pointer or current decision guard drift. |
| BLOCKED_TRACE | Other tracer failure, such as exceeding the bounded row budget. |
| BLOCKED_NORMALIZATION | Raw shape/normalizer/missile inspection exception; no successful Unit. |
| BLOCKED_VALIDATION | Diagnostic validator rejection or exception; rejected data retained separately. |
| BLOCKED_ID_COLLISION | Output ID already exists in the supplied catalog/run set; no overwrite. |

Successful quality is PARTIAL whenever normalized omissions, unmapped IDs or
omission exceptions remain, including expected semantics omissions. This quality
is intentionally separate from the pilot's CLEAN convention, which allows expected
semantics gates. A valid identity can therefore produce a MATERIALIZED/PARTIAL Unit.
No exception or unknown missile chain is removed to improve an outcome.

## Unit identity and provenance

| Value | Role |
| --- | --- |
| `sourceMainKey` | Exact CA campaign/recruitment root, never the presentation ID. |
| `sourceLandKey` | Verified land/stat reference, never grounds for merging main roots. |
| `contextId` | Reviewed editorial faction/variant presentation context. |
| `Unit.id` | `catalogEntryId(mainKey, contextId)` lossless tuple; independent of name and shared land. |

Existing `pathFor` URI-encodes IDs; repository lookup, search records and persistent
references use the exact ID, not the display label. The existing validator allows
these IDs and duplicate labels with distinct IDs. Existing production IDs are not
rewritten. Diagnostic Units are not inserted into repository data or UI routes.

There is no normalized-Unit cache or dedupe by land key. Each request traces its
own main-specific rows and creates a separate Unit object. Different contexts for
one main likewise require distinct tuple IDs and an explicit registered context.

Unit field kinds retain their meanings: raw copies DIRECT, generated ID GENERATED,
explicit faction/ability/attribute mapping CURATED. In the new path only the identity
mapping changes: ID is the source/context tuple; factionId is an exact reviewed
presentation decision rather than a primary military-group alias. The legacy
normalization path is unchanged.

`provenance.identity` retains main/land keys and candidate military groups; its
primaryCatalogGroup is null for this path because no universal group is selected.
`provenance.catalog` separately retains sourceMainKey, sourceLandKey, contextId,
presentationId, factionId, classification, defaultVisible, CURATED context kind,
GENERATED ID kind, source facts and checked decision guards. This metadata does
not create extra `provenance.fields` entries or inflate Unit field coverage.

Thus `Unit.id -> contextId -> exact main -> land -> raw rows` can be followed through
the result's plan, tracedIdentity, original planEvidence, fresh discovery, dump and
field provenance. Same land is not complete battle-profile equivalence, especially
when main-specific overrides differ.

## Faction and production boundary

The production dataset still registers only `vampire_counts`. The adapter's explicit
diagnostic-only registry lists empire, khorne, vampire_counts, tomb_kings, beastmen,
warriors_of_chaos and tzeentch; Arkhan is a context of tomb_kings. It supplies the
existing validator's faction-ID input, without cloning validation logic, skipping
membership checks or creating production factions. An unknown diagnostic faction
is rejected.

Both validations are stored. Production faction rejection is not hidden and is not
a diagnostic Unit rejection. Supply, summoned and nonstandard contexts preserve
defaultVisible=false even when the Unit validates.

`productionEligible` is **false for all results** in this diagnostic-only adapter,
including roster contexts whose factions exist in production. Recorded reasons
include diagnostic-only pipeline, context-only presentation, production validator
rejection and incomplete Unit coverage. Default-visible is editorial scope, not
production admission. No production admission option is implemented here.

## Actual bounded CA result: 19/19 requests

Source: WH3 9.0.1.0, RPFM 5.1.0, schema format 5, unchanged source snapshot.
Every row below is MATERIALIZED / PARTIAL with diagnostic validation passed,
productionEligible=false and its own saved JSON result. R = default roster;
C = retained context-only. Structural counts are non-semantic OMISSION exception
events, including unmapped IDs/enums; semantic counts are applicable SEMANTICS_BLOCKED
events. Raw omitted-field totals are separate and can include inapplicable fields.

| Exact main key | Context | Scope | Structural / semantic events |
| --- | --- | --- | ---: |
| `wh_main_emp_art_helstorm_rocket_battery` | empire_roster | R | 3 / 19 |
| `wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply` | empire_imperial_supply | C | 2 / 19 |
| `wh3_main_kho_mon_bloodthirster_0` | khorne_roster | R | 0 / 12 |
| `wh3_main_kho_mon_bloodthirster_summoned_0` | khorne_ability_spawn | C | 1 / 12 |
| `wh_main_emp_inf_handgunners` | empire_roster | R | 3 / 19 |
| `wh2_dlc13_emp_inf_handgunners_imperial_supply` | empire_imperial_supply | C | 2 / 19 |
| `wh_main_vmp_mon_crypt_horrors` | vampire_counts_roster | R | 4 / 12 |
| `wh_main_vmp_mon_crypt_horrors_summoned` | vampire_counts_ability_spawn | C | 4 / 12 |
| `wh2_dlc09_tmb_mon_crypt_horrors` | tomb_kings_arkhan_roster | R | 7 / 12 |
| `wh_main_emp_veh_steam_tank` | empire_roster | R | 6 / 19 |
| `wh2_dlc13_emp_veh_steam_tank_imperial_supply` | empire_imperial_supply | C | 5 / 19 |
| `wh_dlc03_bst_inf_chaos_warhounds_0` | beastmen_roster | R | 3 / 12 |
| `wh_main_chs_mon_chaos_warhounds_0` | warriors_of_chaos_roster | R | 3 / 12 |
| `wh_main_vmp_cav_hexwraiths` | vampire_counts_roster | R | 7 / 12 |
| `wh2_dlc09_tmb_cav_hexwraiths` | tomb_kings_arkhan_roster | R | 10 / 12 |
| `wh3_main_pro_tze_mon_flamers_0` | tzeentch_nonstandard | C | 3 / 19 |
| `wh3_main_tze_mon_flamers_0` | tzeentch_roster | R | 3 / 19 |
| `wh_main_vmp_inf_zombie` | vampire_counts_roster | R | 4 / 12 |
| `wh_main_vmp_inf_zombie_summoned` | vampire_counts_ability_spawn | C | 5 / 12 |

| Metric | Before adapter | After adapter |
| --- | ---: | ---: |
| Catalog-classified samples / candidates | 9 / 19 | 9 / 19 |
| Plans available / explicit requests attempted | 19 / 0 | 19 / 19 |
| Traced / normalized / diagnostically validated | 0 / 0 / 0 | 19 / 19 / 19 |
| Materialized / PARTIAL / BLOCKED requests | 0 / 0 / 0 | 19 / 19 / 0 |
| Default-visible / context-only materialized | 0 / 0 | 12 / 7 |
| Diagnostic validation failures / issue events | 0 / 0 | 0 / 0 |
| Production-registry validation rejections | not run | 14 |
| Production-eligible | 0 | 0 |
| New context Unit field DIRECT / GENERATED / CURATED | not emitted | 543 / 19 / 80 |
| Context structural / semantics omission events | not inspected | 75 / 284 |
| Context raw omitted-field events | not emitted | 612 |

The new counts concern **19 new context Units**, not the 15 legacy normalized pilot
Units. Name-based pilot metrics remain 1/14/9, ambiguity 9, validation failure 0 and
field provenance 374/15/52. Reviewed structural/missile events remain 78/19
(unmodified pilot 76/17); no old Unit values, omissions, unmapped IDs or field
provenance changed. The existing core three regressions and counterexample audit
remain valid. The 12 roster outputs additionally match legacy stat normalization
on the same exact traces, apart from the intended presentation identity mapping.

Newly inspectable issues include multiple missile weapons on the ordinary main
roots: Helstorm's `wh_main_emp_rocket_battery_upgraded`, Handgunners'
`wh_main_emp_rifle_upgraded`, Steam Tank's
`wh3_dlc25_emp_steam_tank_cannon_ball_exploding` with raw
`wh3_dlc25_emp_veh_steam_tank_cannon` stats override. Activation/precedence is not
established. These main-specific junctions are not copied to the shared-land supply
roots. Entity-role ambiguity, unknown IDs/enums and all semantics gates remain
omissions; no aliases, entity arithmetic, derived formula or override application
was added. Existing Dread/Necrofex/Free Company/composite review policy is unchanged.

## Reproduction and checks

Code is committed; actual CA packs, the installed RPFM server, local config and
baseline/review artifacts are environment dependencies. See
[BASELINE-DEPENDENCIES.md](BASELINE-DEPENDENCIES.md) to create the baseline first.
The game process is never needed. Select an actual COMPLETE review explicitly:

```powershell
npm test
npm run build
node tools/wh3-importer/blocker-review/cli.mjs
# Use the COMPLETE directory printed above; no latest-directory fallback.
node tools/wh3-importer/catalog-identity/materialize-cli.mjs --review-dir '<COMPLETE_REVIEW_DIRECTORY>'
$env:WH3_INTEGRATION_CONFIG='tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
$env:WH3_BLOCKER_REVIEW_DIR='<COMPLETE_REVIEW_DIRECTORY>'
$env:WH3_CONTEXT_MATERIALIZATION_DIR='<COMPLETE_MATERIALIZATION_DIRECTORY>'
node --test tools/wh3-importer/blocker-review/integration.test.mjs tools/wh3-importer/catalog-identity/integration.test.mjs tools/wh3-importer/catalog-identity/materialize.integration.test.mjs
```

Output stays under ignored generated/wh3 in a new timestamp directory. Every request
has its own JSON; a COMPLETE run means all bounded attempts were saved, not that
all materializations succeeded. Manifest/summary counters distinguish those cases.
Limits are 30 requests, 250 trace rows, 200 exact-evidence rows/30 probe steps and
concurrency 1. Unknown/unresolved candidate contexts abort request generation
explicitly rather than being silently skipped. Persistence failures fail the run.

Validation: 122/122 basic tests (16 new materialization tests plus existing identity,
pilot/blocker regressions), actual CA integration 5/5, saved actual integration
16/16 (4 blocker + 5 catalog + 7 materialization), build passed. Tests cover request
guards, source drift, cross-faction/name preservation, shared-land independence,
context-only retention, unknown diagnostic factions, ordering, collision/validator
failures and unchanged legacy values/field provenance.

## Runtime and full-import boundary

Full import remains **not approved**. Production faction/catalog admission and
context presentation review, composite/multiweapon representation, active override
conditions and existing unresolved semantics require further work. Diagnostic
validation does not certify those semantics or effective campaign/battle values.

[RUNTIME-CHECKLIST.md](blocker-review/RUNTIME-CHECKLIST.md) retains availability,
ability-spawn main/land/duration, nonstandard Flamers scenario, composite count,
Dread/Necrofex ammunition and Free Company precedence checks, and adds the three
ordinary Empire alternate-weapon observations. Runtime results remain separate
from editorial context identity; they never authorize a name-based root selector.
