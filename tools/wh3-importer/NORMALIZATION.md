# Conservative raw → Unit normalization

The subsequent [24-name representative pilot](PILOT.md) exercises the same normalizer with schema-discovered scopes and explicit staging affiliation aliases. Its CLEAN/PARTIAL/BLOCKED wrapper is required when interpreting generic results. It does not authorize whole-WH3 import.

Provenance now distinguishes **DIRECT** (raw value copied), **GENERATED** (deterministic internal unit ID), and **CURATED** (explicit faction/ability/attribute/state alias). Existing Unit values, omission policy, rawValue and source pointers are unchanged. The historical DIRECT totals below counted all aliases together; the core breakdowns are now Grail 22/1/8, Helstorm 35/1/3, Bloodthirster 25/1/10 in DIRECT/GENERATED/CURATED order. No derived formula was approved.

The subsequent [24-name representative pilot](PILOT.md) exercises the same normalizer with schema-discovered scopes and explicit staging affiliation aliases. Its CLEAN/PARTIAL/BLOCKED wrapper is required when interpreting generic results. It does not authorize whole-WH3 import.

Provenance now distinguishes **DIRECT** (raw value copied), **GENERATED** (deterministic internal unit ID), and **CURATED** (explicit faction/ability/attribute/state alias). Existing Unit values, omission policy, rawValue and source pointers are unchanged. The historical DIRECT totals below counted all aliases together; the core breakdowns are now Grail 22/1/8, Helstorm 35/1/3, Bloodthirster 25/1/10 in DIRECT/GENERATED/CURATED order. No derived formula was approved.

The first normalizer maps only reviewed direct facts for Grail Knights, Helstorm Rocket Battery and Bloodthirster. It is an offline staging pipeline, separate from React and the production catalog. `src/data/units.json` is unchanged; generated artifacts remain Git-ignored. No HP/speed/ammo calculator, mod merging, save parsing or whole-unit import is implemented.

## Architecture and files

```text
CA raw trace + matching bounded military-permission inspection
  → observations/context.mjs: shared row/forward-reference selectors
  → observations/facts.mjs: named schema fields + validated reference paths
  → normalization/policy.mjs: direct allowlist + conservative semantics gate
  → normalization/normalizer.mjs: pure normalizeUnit(raw, context)
  → NormalizedUnitResult
      ├─ unit
      ├─ provenance + original facts
      ├─ omitted
      ├─ warnings
      └─ unmapped
  → normalization/validation.mjs: the existing validateUnits
  → normalization/report.mjs: downstream manual comparison and summary
  → normalize-cli.mjs: write ignored staging artifacts
```

`normalization/normalizer.d.mts` supplies the typed result/context contract; `tests/fixtures/normalization-contract.ts` checks its `Unit` compatibility. The implementation follows the existing importer's `.mjs` format. `normalization/ids.mjs` owns explicit CA → internal ability/attribute aliases; `normalization/catalog.mjs` owns the three editorial primary catalog affiliations. `fixtures/normalization.mjs` uses synthetic keys/numbers/schema 99, separate from actual artifacts and manual schema fixtures.

`facts.mjs` shares `traceSelectors` with observations instead of copying raw exploration logic. A mapped source requires a named processed field, a consistent row key and a path from the selected root. Reference edges are checked against `is_reference`, actual endpoint values and recorded evidence; ambiguous forward joins remain unknown. The original observations and summary snapshots remain unchanged.

## Reproduction

Use the existing game/server/config setup in [README.md](README.md). Extraction must precede normalization:

```powershell
npm run extract:wh3-unit -- grail-knights
npm run extract:wh3-unit -- helstorm
npm run extract:wh3-unit -- bloodthirster
npm run inspect:wh3 -- --queries tools/wh3-importer/research-queries/normalization-identity.json --output generated/wh3/research/normalization-identity.json
npm run normalize:wh3-unit -- grail-knights
npm run normalize:wh3-unit -- helstorm
npm run normalize:wh3-unit -- bloodthirster
```

The checked-in permission query contains only the three previously discovered main keys, not discovery shortcuts. It selects 3 main rows and 14 permission rows in the verified local installation. The CLI reads the selected saved CA trace, checks its profile and writes `generated/wh3/normalized/<profile>.result.json` plus `<profile>.summary.md`. `--raw-dir DIR` and `--identity-evidence FILE` support other staging locations; output under `src/` is rejected. It accepts only the three core profiles and never loops over all WH3 units or falls back to fixtures.

## Identity and provenance

Internal IDs use `ca_unit_<exact main unit key>`. Provenance separately records `internalId`, `caMainUnitKey` and `caLandUnitKey`. Name comes from the exact schema-traced CA `land_units_onscreen_name` localisation; profile/manual names cannot fill it. Category copies the joined CA DB category. Bloodthirster's actual category is **Melee Infantry**; it is not rewritten as an inferred monster role. Unavailable description localisation leaves required `summary` empty with an omission reason. `tags` remains an explicitly documented empty display container, not a claim that attributes are absent.

Primary `factionId` aliases are Bretonnia/Empire/Khorne, chosen explicitly in the staging catalog and verified against each selected unit's `units_to_groupings_military_permissions` relation. CA evidence exposes multiple groups: 5 for Grail, 5 for Helstorm, 4 for Bloodthirster. All candidate groups are retained. The chosen faction is a **primary catalog classification**, not exclusive ownership or effective recruitability. A missing/ambiguous selected permission fails normalization. Actual unit and permission artifacts must have the same game version, schema hash and pack hashes.

Every mapped `provenance.fields` entry includes:

```text
field + value + kind=DIRECT + rawValue + explanatory note
source: rowId, table, rowKey, field, sourcePack, sourcePackPath,
        in-pack path, schemaVersion, validated joins with traversal direction
evidence: additional raw facts (e.g. agreeing active/passive flags)
```

`provenance.rawTrace` and `affiliationEvidence` retain environment/pack hashes. `facts` preserves original values and source pointers, including prohibited formula inputs. No serialized observations, hypotheses or manual values are trusted as normalization input. Generated metadata (`gameVersion`, source descriptions, empty tags) has explicit origins instead of fabricated CA field pointers. The required empty structures/text have omission reasons.

## Actual current results

Verified with RPFM **5.1.0**, WH3 executable ProductVersion **9.0.1.0**, schema format **5**, directly opened CA packs. Counts include identity, explicit ID aliases and individual list items; they are not counts of complete UI stats.

| Result | DIRECT fields | Omitted | Unmapped IDs | Selected base costs: battle / recruit / upkeep / turns |
| --- | ---: | ---: | ---: | --- |
| Grail Knights | 31 | 39 | 0 | 1850 / 1850 / 462 / 2 |
| Helstorm Rocket Battery | 39 | 25 | 0 | 1050 / 1050 / 263 / 2 |
| Bloodthirster | 36 | 35 | 0 | 2000 / 2000 / 500 / 3 |

- Grail: tier 4; armor 120, defense 34, leadership 80, block 35; melee 38, charge 75, damage 18/AP28/large18/infantry0, interval 5.1, length 2, splash 2/small, magical attack. Lance and Blessing of the Lady plus four reviewed generic attributes. Rider/mount representation remains ambiguous; entity fields stay empty.
- Helstorm: tier 4; armor 20, defense 6, leadership 50, block **0**; melee 10, charge 5, damage 21/AP3/bonuses0, interval 4.3, length **0**, splash maximum 1. Missile range 480, direct 30/AP70, bonuses0, shots 3; explosion 22/AP51/radius6; calibration distance300/area220, base reload17, penetration budget2/cap small. Can-run **false** and can-skirmish **false** remain structured states; siege attacker remains a generic attribute. Empty raw melee splash size is omitted. Crew/engine count, mass and size are not selected.
- Bloodthirster: tier 5; armor70, defense44, leadership80, block **0**; melee60, charge55, damage160/AP380/large35/infantry0, interval4, length9, splash5/large, magical attack. Verified man-only mass4000, size very_large, penetration resistance5; flying true; Wounds, Daemonic Instability and Banished! are passives. Fear/terror/daemon/siege attacker remain generic attributes.

All three have `movement.canSkirmish=false` from the named raw field. No count, HP, displayed speed, ammo, final accuracy, current reload or effective recruitment is generated. Missile source absence in Grail/Bloodthirster is not proof that every possible state lacks a missile attack. Reports retain missing-field reasons alongside policy omissions.

## Mapping and uncertainty policies

- **DIRECT**: allowlisted named raw values or verified joins; explicit internal identity/ability aliases are documented aliases, not arithmetic. Numbers must be finite and fit the target type. Actual **0** and **false** survive; missing/null/malformed fields are absent with reasons. Damage base/AP/bonuses and projectile/explosion stay separate. Existing `getTotalDamage()` supplies any UI total; no total is stored.
- **DERIVED_CONFIRMED**: `allowsDerived(topic, formulaId)` requires both topic `CONFIRMED` and a reviewed formula in `confirmedDerivations`. The registry is **empty**. No derived field is emitted. Confirmed existence of override paths or a current resistance label does not authorize runtime calculations.
- **UNRESOLVED**: omitted entries carry reason and scoped findings status. Speed ×10 is only STRONGLY SUPPORTED. HP, ammo/display count, effective recruitment/building tier, current reload/strength and final accuracy remain unresolved. Resistances are omitted in conservative mode; `damage_mod_magic` is not silently converted to spell resistance. Numeric ignition is retained as a fact, without a guessed flaming flag. Penetration budget is not converted to a pierced-entity count.

`policy.mjs` reads topic statuses and reviewed game version from [semantics-findings.json](semantics-findings.json). Unknown/unreviewed actual game versions fail instead of reusing the reviewed policy. The raw observation/research pipeline remains separate and cannot authorize output through saved hypotheses.

Movement state has one source of truth: `canFly`, `canRun`, `canSkirmish` belong in `movement`, never duplicated as `can_fly`/`cannot_run` attributes. Missing flying/run attributes do not establish false/true. Existing validation rejects those generic state IDs; manual schema fixtures were adjusted. Legacy display labels remain for read compatibility, but the normalizer never emits the duplicates.

Abilities use a reviewed alias map: Lance → `lance`, Blessing → `blessing_of_the_lady`, Wounds → `wounds`, Daemonic Instability → `daemonic_instability`, **Banished! → `banished`** (distinct from `banishment`). Ability membership must be scoped to the selected land unit; raw `source_type` and special-ability `passive` must agree. Unknown IDs or conflicting flags go to `unmapped` with the original CA key/source and a warning. Phase effects are not applied. Generic attribute aliases likewise require selected-group membership.

`source` describes the entity-wide CA base/fallback origin. `sources.publicStats`, `.hiddenStats`, `.campaign` describe their respective raw groups. Precise field-level proof stays outside `Unit`. Mapped cost/stat numbers are **current CA base DB values**, not effective costs/stats after campaign, rank, difficulty, technology, building, lord, ability or multiplayer-session effects.

Manual references enter only the summary renderer **after** normalization and validation. Cost/AP/charge/weapon-length discrepancies are reported without modifying raw facts or filling unknowns. Changing manual or serialized hypothesis values is covered by isolation tests.

## Validation and tests

```powershell
npm test
npm run build
$env:WH3_INTEGRATION_CONFIG = 'tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
```

All three generated results passed the existing `validateUnits` using the explicit **staging** faction catalog. The CLI compiles and loads the actual app validator with the installed TypeScript dependency; it does not duplicate its rules or require a prior test run. Failure prevents output writes. These factions are not added to the production sample catalog.

Results: **62 default tests passed (43 existing + 19 normalizer tests)**; **4 actual CA integration tests passed without skips**, including live extraction, permission lookup and normalization for all three core units plus the existing current-label/experience probe; `npm run build` passed. Default tests cover zero/false, omissions, exact field provenance, direct damage/values, manual isolation, unknown aliases, duplicate state, invalid joins, identity and reviewed-version/hash gates. Existing streaming hash, profile discovery, candidate isolation and observation/summary digest regressions remain intact.

## Before whole-WH3 normalization

Resolve entity role/count/HP/scale policies and displayed speed/ammo/reload/accuracy formulas with independent current evidence. Define catalog affiliation and effective recruitment semantics for multi-group/variant units, including missing production factions and localisation coverage. Extend reviewed ability/attribute aliases and schema/pack-version coverage. Determine whether faction-specific cost overrides and other runtime layers are applicable before exposing effective values. Add batch identity/collision/coverage checks only when whole-unit import is authorized. No formulas or modifiers are implemented by this stage.
