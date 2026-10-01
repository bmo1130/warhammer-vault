# Bounded 9.0.2 CCO preparation refresh

Installed `Warhammer3.exe` ProductVersion and FileVersion were both **9.0.2.0** on 2026-10-01. RPFM 5.1.0 MCP directly reopened the current CA Release `db.pack` and `local_en.pack`, decoded their rows with processed WH3 schema references, and hashed the actual files. No game execution, full import, diagnostic DB pack or production writes occurred.

| Identity | SHA256 |
| --- | --- |
| Static snapshot ID | `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5` |
| Schema (format 5, existing JSON fingerprint method) | `5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4` |
| db.pack (8,663,017 bytes) | `d0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723` |
| local_en.pack (33,435,496 bytes) | `f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a` |

The schema fingerprint is unchanged. Both pack fingerprints changed from 9.0.1.0. Whole-pack equality is **not** claimed. Within the inspected P0 scope, structure is identical; only snapshot/version provenance changed.

## Evidence and preserved scope

New ignored outputs:

- `generated/wh3/refresh-9.0.2/pilot`: original 24-name scope, CLEAN/PARTIAL/BLOCKED **1/14/9**.
- `generated/wh3/refresh-9.0.2/blocker-review`: refreshed nine ambiguity groups, 19 exact-key decisions with existing guards and counterexample audit.
- `generated/wh3/refresh-9.0.2/context-materialization/2026-10-01T10-25-28.824Z`: 19 MATERIALIZED/PARTIAL, validation failures 0, productionEligible false.
- `generated/wh3/refresh-9.0.2/entity-semantics/2026-10-01T10-25-44.152Z`: existing 25-source bounded review.
- `generated/wh3/refresh-9.0.2/missile-semantics/2026-10-01T10-25-54.550Z`: existing 24-source bounded review.
- `generated/wh3/runtime-evidence/evening-9.0.2`: upstream runtime preparation, 27 subjects, 35 pending jobs, 182 slots, actual observations 0.
- `generated/wh3/runtime-evidence/cco-p0-9.0.2`: four P0 sources, eight pending Medium/Ultra jobs, incomplete chains 0.

`evening-final-v2` and `cco-p0-v2` remain untouched 9.0.1.0 evidence. All their files, the five original user changes, units.json and factions.json passed before/after SHA256 preservation checks (22 files). Normalized 19-context values differ only in gameVersion; field provenance, omissions and unmapped IDs are unchanged. DIRECT/GENERATED/CURATED remains **497/19/80**; productionEligible remains false.

Before enabling preparation, a fail-closed preflight extracted 15 uniquely discovered traces without admitting normalization and collected nine identity evidence graphs. Their raw rows, processed schemas and relationship edges matched the preserved baseline exactly. After refresh, the full P0 entity/missile contracts, raw owner/component/projectile rows, path IDs, ammo flags, supplemental extra-engine evidence and schema edges also matched. Comparison excludes only snapshot provenance and artifact metadata, not raw DB values or relationship pointers.

| Subject | Exact main = land key | Entity paths | Missile paths |
| --- | --- | ---: | ---: |
| Black Coach | `wh_main_vmp_veh_black_coach` | 5 | 0 |
| Skeleton Chariots | `wh2_dlc09_tmb_veh_skeleton_chariot_0` | 6 | 0 |
| Dread Saurian | `wh2_dlc13_lzd_mon_dread_saurian_1` | 14 | 12 |
| Necrofex Colossus | `wh2_dlc11_cst_mon_necrofex_colossus_0` | 7 | 6 |

All four have zero extra-engine junction rows, confirmed by bounded queries with available table coverage. Totals **32 entity / 18 missile paths**; no changed source/path/record was found. Detailed local comparisons: `refresh-9.0.2/preflight-comparison.json`, `p0-graph-comparison.json`, `context-comparison.json`.

The two existing version gates required a minimal update: `reviewed-snapshots.mjs` admits the exact 9.0.2.0 schema and two unique named-pack hashes at normalization/catalog review. Historical 9.0.1 behavior remains available. Other versions or changed/missing/duplicate/extra packs on the hotfix reject. No mapping, semantic status, runtime formula or CCO probe code changed. This is preparation approval for the existing bounded workflow, not full-import admission.

## Verification

- Relevant unit regressions: **171/171**, including four new hotfix gate tests; test TypeScript compilation passed.
- New saved-CA blocker/catalog/context/entity/missile/runtime/CCO regressions: **41/41**, no skips.
- Historical 9.0.1 runtime/CCO replay: **9/9**.
- Existing installer read the actual executable, installed into a repository-local temporary exec directory with `-SkipLogging`, recorded the new snapshot/version, and removed only its owned files. It accepted the new bundle and rejected the old bundle with `Installed game version changed; regenerate static evidence first.` Actual game installation files were not written.
- Empty-log CCO ingest: NO_PROBE_EVENTS, observations 0, validation VALIDATED; no runtime success inferred.
- End-of-run direct source reopen reproduced the same snapshot fingerprint.

Tests used the newly extracted CA artifacts, not relabelled old indexes. The generated review replay layout retained the existing integration tests' baseline/pilot directory structure. No unrelated build/UI work was performed.

## Install and observe at home

From repository-root PowerShell, before game launch:

```powershell
Set-Location C:\codex\totalwar
./tools/wh3-importer/runtime-evidence/cco-probe/install.ps1 -BundleDirectory ./generated/wh3/runtime-evidence/cco-p0-9.0.2 -UnitSize MEDIUM
```

The ignored importer config supplies the game path; use `-GamePath 'actual game directory'` only if that config is unavailable. No Lua editing is required. Enable Execute External Lua File(Modding Tool), set actual Unit Size Medium, enter Custom Battle, select a P0 unit and press F9. Hover each visible component and press F9 again. For Dread/Necrofex, order ranged fire, run the battle, press F10 and wait about five seconds. Preserve the script log. Repeat with a fresh session and actual Ultra setting:

```powershell
./tools/wh3-importer/runtime-evidence/cco-probe/install.ps1 -BundleDirectory ./generated/wh3/runtime-evidence/cco-p0-9.0.2 -UnitSize ULTRA
```

Use the actual saved log paths in the only placeholders below:

```powershell
node tools/wh3-importer/runtime-evidence/cco-probe/cli.mjs ingest --bundle-dir generated/wh3/runtime-evidence/cco-p0-9.0.2 --logs 'C:/path/medium_script_log.txt|C:/path/ultra_script_log.txt'
```

Default ingest output is a new timestamped ignored directory. Raw logs, candidate comparison, runtime evidence, validation and held resolutions remain separate. Use this **new** bundle for 9.0.2 observations; do not ingest them against 9.0.1. All previous runtime unknowns, CCO limitations and production/full-import gates remain in force.
