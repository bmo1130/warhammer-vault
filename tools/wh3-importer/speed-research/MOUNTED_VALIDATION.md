# Mounted Speed follow-up — bounded 17-unit research

This report adds three user manual in-game card observations as
`MANUAL_CARD_VALIDATION`. It retains the earlier manual file and the 74-unit
admission source unchanged. New observations live in
`mounted-manual-card-evidence.json`; their timestamp, game version and Unit Size
were not supplied and remain null. They are neither CA extraction nor runtime
probe evidence. Static snapshot association is explicit, separate from observed
metadata. Existing Mounted Yeomen retains its original ULTRA/normal-card metadata.

## Four mounted anchors

| Anchor | Rider run_speed ×10 | Mount run_speed ×10 | Observed card | Selection |
| --- | ---: | ---: | ---: | --- |
| Mounted Yeomen (existing) | 3.3×10 = 33 | 9.2×10 = 92 | 92 | mount |
| Knights of the Realm | 3.3×10 = 33 | 8.4×10 = 84 | 84 | mount |
| Cold One Riders | 3.3×10 = 33 | 6.6×10 = 66 | 66 | mount |
| Grail Knights | 3.3×10 = 33 | 8.4×10 = 84 | 84 | mount |

All four uniquely match the mount candidate and reject the rider candidate.
This validates the existing ×10 conversion and component choice in these exact
chains. It does not establish all mounted units or all cavalry as a common
precedence class. Rounding, flight conversion and unseen endpoint records are
not inferred.

## Scope and result

Only the previous `MOUNTED_PROFILE_NOT_VALIDATED` 17 identities are reclassified:
**7 DIRECT / 10 AMBIGUOUS / 0 UNAVAILABLE**. Materialization touches those 17
plus the existing Mounted Yeomen anchor (18 named traces). It does not rerun
single-man 70, admitted artillery 2, engine/vehicle 5, flying 3 or articulated 2
source inspections. Hash-reading their shared source files is provenance
verification, not a new classification of those units.

The existing typed mounted profile implementation is reused. Inheritance
requires the same rider/mount endpoint keys, every retained movement field,
processed schema/forward join shape, snapshot and movement flags as an anchor.
Each candidate keeps its own exact main/land join and source pointer. A single
exact mount record and two distinct entity record endpoints are required, with
no additional reachable speed source, engine/articulation reference or flight
speed. These are static record checks, not assertions of physical component
counts. Sync/draught movement flags must be false. Conditional terrain effects
stay separate from the base card comparison; no absence of all campaign/mod
movement overrides is claimed beyond the reviewed base static trace.

| Exact main key | Rider raw / ×10 | Selected mount entity | Mount raw / calculated card | Validation anchor |
| --- | --- | --- | --- | --- |
| `wh_main_brt_cav_grail_knights` | 3.3 / 33 | `wh_main_brt_mnt_cavalry_knights_heavy_blood` | 8.4 / **84** | wh_main_brt_cav_grail_knights |
| `wh_main_brt_cav_knights_of_the_realm` | 3.3 / 33 | `wh_main_brt_mnt_cavalry_knights_blood` | 8.4 / **84** | wh_main_brt_cav_knights_of_the_realm |
| `wh_dlc07_brt_cav_questing_knights_0` | 3.3 / 33 | `wh_main_brt_mnt_cavalry_knights_blood` | 8.4 / **84** | wh_main_brt_cav_knights_of_the_realm |
| `wh_dlc07_brt_cav_knights_errant_0` | 3.3 / 33 | `wh_main_brt_mnt_cavalry_knights_blood` | 8.4 / **84** | wh_main_brt_cav_knights_of_the_realm |
| `wh_dlc07_brt_cav_grail_guardians_0` | 3.3 / 33 | `wh_main_brt_mnt_cavalry_knights_heavy_blood` | 8.4 / **84** | wh_main_brt_cav_grail_knights |
| `wh2_main_lzd_cav_cold_ones_1` | 3.3 / 33 | `wh2_main_lzd_cavalry_cold_one_blood` | 6.6 / **66** | wh2_main_lzd_cav_cold_ones_1 |
| `wh2_main_lzd_cav_cold_one_spearmen_1` | 3.3 / 33 | `wh2_main_lzd_cavalry_cold_one_blood` | 6.6 / **66** | wh2_main_lzd_cav_cold_ones_1 |

The man endpoint of these seven is
`wh_main_cavalry_rider_standard_blood`. All seven have identical main/land keys
except Cold One Spear-Riders: main
`wh2_main_lzd_cav_cold_one_spearmen_1` joins land
`wh2_main_lzd_cav_cold_one_spearriders_1` exactly. No name-based identity rewrite
is applied. The three new anchor groups cover 3 / 2 / 2 candidates respectively
(Knights of the Realm / Cold One Riders / Grail Knights).

## Remaining mounted ambiguity

Nine units have exact static sources but no exact validated endpoint/profile.
One unit has aliased rider/mount source records and a card reading alone would
not distinguish those sources. No missing source was discovered.

| Unit | Main key | Reason | Rider / mount ×10 candidates (unselected) |
| --- | --- | --- | --- |
| The Royal Altdorf Gryphites (Demigryph Knights) | `wh_dlc04_emp_cav_royal_altdorf_gryphites_0` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 75 |
| Necrofex Colossus | `wh2_dlc11_cst_mon_necrofex_colossus_0` | RIDER_MOUNT_SOURCE_NOT_DISTINGUISHABLE | 45 / 45 |
| Dread Saurian | `wh2_dlc13_lzd_mon_dread_saurian_1` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 60 |
| Black Knights (Lances & Barding) | `wh_main_vmp_cav_black_knights_3` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 72 |
| Chaos Knights (Lances) | `wh_main_chs_cav_chaos_knights_1` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 70 |
| Outriders | `wh_main_emp_cav_outriders_0` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 84 |
| Knights of the Black Rose | `wh3_dlc25_emp_cav_knights_of_the_black_rose` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 78 |
| Skeleton Horsemen | `wh2_dlc09_tmb_cav_skeleton_horsemen_0` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 28 / 76 |
| Black Knights | `wh_main_vmp_cav_black_knights_0` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 78 |
| Blood Knights | `wh3_main_vmp_blood_knights_sword_shield` | EXACT_MOUNTED_PROFILE_NOT_VALIDATED | 33 / 70 |

Outriders also has a mount candidate of 84, but its endpoint is different from
both measured knight profiles, so it stays ambiguous. Necrofex Colossus exposes
the same entity record in the man and mount roles (45 / 45); this does not
independently establish mount precedence. Dread Saurian's differing rider/body
profile remains unvalidated; no HP/entity interpretation is imported here.

The whole 101-unit **candidate** classification would be **81 DIRECT / 20
AMBIGUOUS / 0 UNAVAILABLE**, calculated by carrying forward the old 74 and the
untouched 5 engine/vehicle, 3 flying and 2 articulated cases. Those 10 cases have
not been reanalyzed. Actual Production stays **74 Speed populated / 27 blank**,
with HP 13 populated / 88 blank and Sample 5 unchanged. This report and all its
anchors/cases remain `productionEligible: false`.

No additional measurement is needed for these seven candidate conclusions.
Coverage of the remaining nine distinct unvalidated profiles needs its own
independent anchor; the aliased Necrofex man/mount case cannot be resolved by a
numerically identical card observation alone. No measurement is requested or
performed and no probe is changed in this task.

## Replay and safeguards

`mounted-validation.json` stores the bounded candidate results, raw rider/mount
values, exact source joins, static snapshot, anchor/profile definitions and
hashes, and input pins. It is separate from the already admitted 74-unit report.
The old manifest, Speed sidecar, manual evidence, Production JSON and all HP /
MEDIUM evidence remain byte-identical. No admission or projection code changes.
Only the existing trace loader gains an optional named scope, keeping its
unscoped behavior unchanged.

```powershell
node tools/wh3-importer/speed-research/mounted-validation.mjs --check
node --test tests/wh3-mounted-speed.test.cjs
```

The seven regression tests check manual provenance/unique matching, deterministic
replay, exact 17+1 materialization scope, exact seven candidates including the
different Cold One Spear-Riders land key, held reasons, fail-closed mutations and
all existing admission/data/evidence pins. Source/schema/join drift, extra
mount/entity sources, movement flags, hybrids, flight, unsupported values,
competing anchors and identity mismatch cannot become new DIRECT candidates.

Validation: new tests 7/7 PASS; related regression selection 308/308 PASS; build
PASS. The selection intentionally excludes HP research and the old whole-catalog
Speed research/admission tests so the forbidden single-man/artillery/other-bucket
source investigations are not rerun. A clean snapshot with no generated data
replays this bounded report and passes the seven new tests.

A byte audit of all 321 preexisting tracked files finds only the trace loader
changed; all other 320 files, including Production/Sample, every old JSON report,
Speed/HP admission and evidence/probe files, remain identical. The build asset
hash/name stays unchanged as well.

Changed files:

- `tools/wh3-importer/speed-research/card-validation.mjs` — optional scoped loader.
- `tools/wh3-importer/speed-research/mounted-manual-card-evidence.json` — new readings.
- `tools/wh3-importer/speed-research/mounted-validation.mjs` — bounded research replay.
- `tools/wh3-importer/speed-research/mounted-validation.json` — 17-case candidate report.
- `tools/wh3-importer/speed-research/MOUNTED_VALIDATION.md` — this explanation.
- `tests/wh3-mounted-speed.test.cjs` — scoped deterministic/fail-closed regressions.
