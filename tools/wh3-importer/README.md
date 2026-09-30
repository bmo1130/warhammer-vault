# WH3 Grail Knights raw extractor

This is a development tool, separate from React. It reads **one Grail Knights root** from directly opened CA packs through an installed RPFM server. It does not parse the Pack binary format, normalize into Vault `Unit`, modify `src/data/units.json`, merge mods, apply modifiers, or change UI.

## Verified interface and local investigation

The implementation was verified with the installed **RPFM 5.1.0** Windows release and its actual `tools/list` capability schemas, not an assumed CLI/API. The server exposes MCP Streamable HTTP at `http://127.0.0.1:45127/mcp`. Used tools:

- `set_game_selected({game_name: 'warhammer_3', rebuild_dependencies: false})`
- `is_schema_loaded`, `get_schema`
- `open_packfiles({paths: [...]})`, `open_pack_info({pack_key})`
- `decode_packed_file({pack_key, path, source: 'PackFile'})`
- `fields_processed({definition: JSON.stringify(definition)})`

`/version` reports the RPFM binary version. The MCP `serverInfo.version` in this release reports the MCP library version (`3.1.0`), so it is recorded separately and never mistaken for RPFM's version. Tool names and argument requirements are discovered before use; unsupported releases fail with a clear message.

Official references: [RPFM server](https://github.com/Frodo45127/rpfm/blob/v5.1.0/rpfm_server/README.md), [MCP source](https://github.com/Frodo45127/rpfm/blob/v5.1.0/rpfm_server/src/server_mcp.rs), [schema documentation](https://frodo45127.github.io/rpfm/manual/reference/schemas.html). During investigation the matching release source and local WH3 schema were inspected as well.

Initially, RPFM was not running and its schema folder was empty. The installed server was started and official schemas installed using its discovered `update_schemas` tool. The actual schema is `schema_wh3.ron`; schema **format** version is 5, not a WH3 patch number.

Important local finding: `data.pack` was successfully opened as CA `Release`, but contained **zero DB tables**. This installation's vanilla DB is in **`db.pack`**, which exposes 1601 DB table files. English unit names are in **`local_en.pack`**. The dependency-cache listing did not expose the vanilla DB rows required here. No dependency-cache rows are used by the extractor. Pack inventories are metadata, not a whole DB dump; only tables needed for this single-unit trace are decoded, and only connected rows are persisted.

The current profile is verified against those pack filenames and `text/db/land_units__.loc`. A version with different file names/layouts must be inspected before changing the profile; this tool does not silently guess a replacement.

## Windows setup and execution

Use a supported Node version with built-in `fetch` and `node:test` (verified locally with Node 24.19.0), the project's existing npm dependencies, RPFM 5.1.0, and a WH3 installation. No new npm dependency is required.

1. Download/extract RPFM from its [official releases](https://github.com/Frodo45127/rpfm/releases), if not installed. Install/update official schemas through RPFM's About/update workflow. The extractor does not download schemas automatically or invent a Pack parser when they are missing.
2. Start the bundled server, if it is not already running. The path is supplied by the developer, never embedded in code:

```powershell
$env:RPFM_SERVER_PATH = 'YOUR_RPFM_DIRECTORY\rpfm_server.exe'
Start-Process -FilePath $env:RPFM_SERVER_PATH -WorkingDirectory (Split-Path $env:RPFM_SERVER_PATH) -WindowStyle Hidden

$env:WH3_GAME_PATH = 'YOUR_WH3_INSTALLATION_ROOT'
npm run extract:grail-knights
```

Or pass the path explicitly:

```powershell
npm run extract:grail-knights -- --game-path 'YOUR_WH3_INSTALLATION_ROOT'
npm run extract:grail-knights -- --game-path 'YOUR_WH3_INSTALLATION_ROOT' --output-dir '.\generated\wh3'
```

Optional flags: `--rpfm-url`, `--output-dir`, `--config`. `RPFM_MCP_URL` is also supported. Endpoints must use loopback. The default is the installed server's verified `/mcp` address.

An ignored local config may be placed at `tools/wh3-importer/.local/config.json`:

```json
{
  "gamePath": "YOUR_WH3_INSTALLATION_ROOT",
  "rpfmUrl": "http://127.0.0.1:45127/mcp"
}
```

For game path and endpoint, precedence is CLI > environment > local config > default endpoint. The game path has no hardcoded default. The CLI checks for `data/db.pack` and `data/local_en.pack`; absent or incorrect paths fail clearly. No script writes to the game installation. It opens a dedicated MCP session and closes only that session, without saving or closing the user's UI packs.

## Artifacts and provenance

Default outputs (ignored by Git):

- `generated/wh3/grail-knights.raw.json`
- `generated/wh3/grail-knights.summary.md`

JSON contains `sourceKind: "ca-pack"`, the discovered canonical key, extraction time, executable ProductVersion (or `unknown`), RPFM version, schema format/hash, table versions, source pack metadata and SHA-256 hashes. The Windows game version is read from `Warhammer3.exe`'s version resource; it is not inferred from a wiki or Steam build number.

`schemas` holds processed field metadata; `rows` holds the **original CA field names and values**, key fields, in-pack path and source pack; `relationships` holds from/to row IDs, source/target fields, raw join value and schema evidence. `observations` merely points to selected raw fields for the summary. It is not a Vault data model. Other references are retained under `skippedReferences`, and unknown semantics under `unresolved`.

RPFM's transport serializes cells as arrays of typed values. The adapter pairs them with the **actual `fields_processed` names**, checks row width and duplicate names, then creates named records. No semantic lookup or join uses hardcoded column offsets. Raw types/keys, sentinel values, empty strings, false, zero and float values are retained; no rounding or unknown-to-zero conversion is applied.

The canonical key is discovered by exact English `Grail Knights` localisation, the verified `land_units_onscreen_name_<key>` convention plus schema `localised_fields`, and the actual `main_units.land_unit → land_units.key` reference. Missing/ambiguous roots fail; there is no hardcoded CA unit key in extraction logic.

Forward joins follow processed `is_reference` metadata. Bounded reverse joins trace only this unit's recruitment, ability membership, attribute-group membership, ground effects, and special-ability flags. In particular, a shared building does **not** pull other recruitable units into the artifact. Mod/Movie pack types are refused, no pack precedence is inferred, and the traversal fails above 250 rows rather than broadening into a DB dump.

## Confirmed local extraction

Verified game executable ProductVersion: **9.0.1.0**. Discovered CA key: **`wh_main_brt_cav_grail_knights`**. The CLI successfully persisted **52 rows**, **20 DB tables + 1 Loc table**, with source packs `db.pack` and `local_en.pack`.

DB tables actually read for this root:

```text
main_units_tables
land_units_tables
mounts_tables
battle_entities_tables
battle_entities_size_enums_tables
melee_weapons_tables
unit_armour_types_tables
unit_shield_types_tables
unit_category_tables
unit_class_tables
building_units_allowed_tables
building_levels_tables
land_units_to_unit_abilites_junctions_tables
unit_abilities_tables
unit_special_abilities_tables
unit_attributes_groups_tables
unit_attributes_to_groups_junctions_tables
unit_attributes_tables
ground_type_stat_effect_groups_tables
ground_type_to_stat_effects_tables
```

Localisation path: `local_en.pack/text/db/land_units__.loc` (decoded table name `Loc`). The generated summary lists exact table versions, row keys and all joins. Major chains:

```text
main_units.land_unit → land_units.key
land_units.primary_melee_weapon → melee_weapons.key
land_units.armour → unit_armour_types.key
land_units.shield → unit_shield_types.key
land_units.man_entity → battle_entities.key
land_units.mount → mounts.key → mounts.entity → battle_entities.key
building_units_allowed.unit → main_units.unit
building_units_allowed.building → building_levels.level_name
land_units_to_unit_abilites_junctions.land_unit → land_units.key
land_units_to_unit_abilites_junctions.ability → unit_abilities.key
unit_special_abilities.key → unit_abilities.key
land_units.attribute_group → unit_attributes_groups.group_name
unit_attributes_to_groups_junctions.attribute_group → unit_attributes_groups.group_name
unit_attributes_to_groups_junctions.attribute → unit_attributes.key
land_units.ground_stat_effect_group → ground_type_stat_effect_groups.group_name
ground_type_to_stat_effects.affected_group → ground_type_stat_effect_groups.group_name
```

Selected **actual raw values**, not the older schema fixtures:

| Field | CA raw | User manual reference |
| --- | --- | --- |
| `main_units.tier` / `num_men` | 4 / 48 | 4 / 48 |
| `multiplayer_cost` | 1850 | 1850 |
| `recruitment_cost` | **1850** | 1700 |
| `upkeep_cost` / `create_time` | 462 / 2 | 462 / 2 |
| `armour_value` / `missile_block_chance` | 120 / 35 | 120 / 35 |
| `morale` / `melee_attack` / `melee_defence` | 80 / 38 / 34 | 80 / 38 / 34 |
| `charge_bonus` | **75** | 78 |
| `damage` / `ap_damage` | **18 / 28** | 18 / 30 |
| `bonus_v_large` / `bonus_v_infantry` | 18 / 0 | 18 / not supplied |
| `melee_attack_interval` / `weapon_length` | **5.1 / 2** | 5.1 / 1 |
| `splash_attack_max_attacks` / `splash_attack_target_size` | **2 / small** | 2 / 중간 |
| Mount `mass` / `size` / penetration resistance | 1200 / medium / 2 | 1200 / 중간 / 2 |
| Mount `run_speed` / `charge_speed` | 8.4 / 10.8 | displayed speed 84; raw conversion unverified |

`is_magical` is true. Attribute IDs are `fatigue_immune`, `hide_forest`, `immune_to_psychology`, `knight`. Abilities are `wh_dlc07_unit_formation_lance` (`source_type=active`, special-ability `passive=false`) and `wh_main_lord_passive_the_blessing_of_the_lady` (`source_type=passive`, `passive=true`). Forest speed/attack effects have raw multiplier `0.8`; the tool does not normalize them to Vault percentages.

Unknowns remain explicit:

- Total health: raw `bonus_hit_points=136`, rider `hit_points=8`, mount `hit_points=8` are preserved, but no unverified aggregation formula is applied to force 7296.
- Display speed and troop-scale classification: mount speeds, both rider/mount sizes and terrain group `large` are separate values, not automatically transformed into UI speed/scale.
- Recruitment: raw stables rows exist (`wh_main_brt_stables_4`, `_5`), with `enabled=false`; raw building `level` values are 3 and 4. Effective eligibility, unlock conditions and displayed tier are not inferred from names or incremented to match the wiki.
- Active/passive membership is traced; detailed ability effects, runtime/campaign balance overrides and localisation of every child row are not applied.
- Why reference values differ requires version/semantics investigation. CA raw values are retained regardless of reference values.

`manual-reference.json` is explicitly **manual comparison input**. Report code cannot overwrite raw rows with those numbers. Raw extraction logic does not import that file.

## Tests

```powershell
npm test
npm run build
```

The original 11 app tests remain intact. Ten extractor unit tests cover named-field adaptation, synthetic root discovery, schema-backed forward/reverse joins, source provenance, shared-building isolation, missing/ambiguous rows, unknowns, manual-data isolation, path configuration and rejected non-CA packs. These tests need no game, RPFM executable or network.

The fixture dataset is in `fixtures/tables.mjs` with **synthetic keys/numbers and schema version 99**. It is not a real Pack reader and is never an extraction CLI fallback. Existing `tests/fixtures/units.ts` also remains a separate, manually supplied Unit-schema fixture.

Opt-in real-Pack integration test:

```powershell
$env:WH3_GAME_PATH = 'YOUR_WH3_INSTALLATION_ROOT'
npm run test:wh3-integration

# Alternatively use an ignored local config:
$env:WH3_INTEGRATION_CONFIG = 'tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
```

Without either variable the integration test clearly **skips**. With one configured, absence of the game/server/schema fails honestly; it never substitutes fixtures. Its output is isolated under `.local/integration/` and asserts one actual CA root, source pack types and persisted provenance. The local opt-in integration test passed against the actual installation.

## Next step

Before adding Helstorm/Bloodthirster, discover their actual localisation and root keys, extend the bounded profile only after checking this schema's missile/projectile/explosion/reload/flight/entity relations, and add synthetic join fixtures plus real opt-in integration coverage. Health/scale, speed display units, building eligibility, artillery entity/crew counts and reload/penetration meanings still require source investigation. Full data import and Vault normalization remain separate future work.
