# Three pending ULTRA HP captures: source search

Baseline: `f73671ab2a9fe23028a03d0d4e3c250d5eebe8d4`.

No matching original capture was found for any of these exact identities:

| Main and land key | Requested ULTRA initial entities / HealthMax | Admission |
| --- | --- | --- |
| `wh_main_emp_inf_swordsmen` | 120 / 8280 | WITHHELD: NO_MATCHING_ULTRA_RECORD |
| `wh_main_brt_cav_mounted_yeomen_0` | 60 / 5520 | WITHHELD: NO_MATCHING_ULTRA_RECORD |
| `wh_dlc01_chs_mon_dragon_ogre` | 16 / 9856 | WITHHELD: NO_MATCHING_ULTRA_RECORD |

## Search performed

- Searched repo `tools/` and `generated/` raw text/log/JSON files for the original
  `WH3_RUNTIME_PROBE|` prefix, including ignored runtime-evidence archives and
  existing clean-snapshot copies. The broader repo prefix search found no other
  actual capture outside these files; a saved code patch is not runtime evidence.
- Also inspected original game-directory `script_log_*.txt` files from the
  existing importer config and `C:/Users/lsh12/OneDrive/Desktop/script_log_*.txt`.
  This included the newer game logs `script_log_021026_2002.txt`,
  `script_log_021026_2013.txt`, and `script_log_021026_2040.txt`; they contained no
  `WH3_RUNTIME_PROBE|` records. No game process was started or altered.
- Examined 91 file paths; 44 contained the probe prefix, representing 13 unique
  original capture byte hashes after accounting for archived/snapshot copies.
  Used the existing parser and run reconstruction to check exact unit identities.
  None contained a frame for any of the three requested main keys, at any size.
- Independently traversed 31 stored raw-probe-events/comparison/runtime-evidence/
  validated-evidence JSON files under `generated/wh3/runtime-evidence`. Examined
  15,600 stored probe records and 2,528 observation instances, including repeated
  archives. No matching probe record or observation for the three identities
  was present. Numeric matches inside hashes/IDs/static files are not HP captures.
- Existing `cco-p0-ultra-9.0.2` bundle contains static preparation files, not
  additional captured runtime observations.

This finding is limited to the inspected repository/archives and known original
log locations. It does not assert that the user never measured these units or
that no copy exists elsewhere. Missing evidence is an original, exact-main/land,
completed ULTRA / DECLARED_SETUP capture with VALUE HealthMax and
NumEntitiesInitial and the matching game/static snapshot. A user report or the
existing USER_REPORTED semantic fixture cannot replace those records.

## Result

No source was fabricated, converted from MEDIUM, or reconstructed from a fixture.
No source copies were added. No manifest approval or HP policy was changed.
Production remains 101, HP populated 2: Dread Saurian 15088 and Skeleton Chariots
7032. The requested three remain empty; the other 96 empty HP fields also remain
empty. `healthPerEntity`, speed, missile/entity semantics and importer structure
are unchanged.

The Production JSON byte SHA256 remains
`077fc0ca25e6926817ed57d5e7e9e0c37ea1abbef31ec5b38c8445b2e1eb5bfa`.
Manifest/review and existing raw HP inputs remain unchanged.

Added a regression asserting the three reference totals stay outside admission
without raw records, forced approval fails, and the existing two HP values plus
the entire Production file remain exact.

## Verification

- Full tests: 309/309 PASS; HP policy tests: 8/8 PASS.
- `npm run build`: PASS; output bundle identical to the preceding HP commit.
- Stored context/runtime/CCO regression: 16/16 PASS.
- Existing HP source → review → admission → projection → Production replay: PASS.
- Historical runtime comparison/evidence/validation/resolution output equality:
  PASS (5,200 events, 51 captures, 316 observations). All 51 original archived
  files remained byte-identical; their stored provenance was not rewritten.
- Only this search report and `tests/wh3-hp-policy.test.cjs` change. HP policy,
  manifest, review, projections, semantic fixtures, raw inputs, Production data,
  diagnostic/shared identity files and every other importer policy are untouched.
- No game execution, new measurement request, raw-log reconstruction or push.
