# HP/count second validation

## Separate evidence classes

- Original 986 HP and 1,071 counts unchanged; 13 baseline count/HP tuples reproduced (10 direct CCO + 3 dependent exact-profile).
- Existing MEDIUM numerical checks: Necrofex 1/9507 and Free Company 60/3660, all archived frames match; no size scaling inferred.
- 510 original source rows compared to independent 9.0.0 export for count/HP/type/native-reference fields. Conflicts block admissions.
- Publisher-derived 9.0.2 card expectations are compared independently for both count and total HP. Existing 986 agree; mounted reference conflicts remain held.
- Fresh CA 9.0.3.0: 627 bounded rows, separate snapshot and exe/pack hashes; comparison only. Re-extraction is not a game card measurement.
- New direct game UI measurements: 0. New website observations: five matching cards + one contradictory mounted sample. Full URLs, version and setup: browser-card-evidence.json. Queen Bess is a RoR card with no displayed Rank 0 label; base HP/count recipe does not use rank.

## New independent website samples

| Main key | Expected count / HP | Website actual count / HP | Result |
| --- | --- | --- | --- |
| wh_main_emp_art_great_cannon | 4 / 4356 | 4 / 4356 | MATCH |
| wh2_dlc11_cst_art_queen_bess | 1 / 7392 | 1 / 7392 | MATCH |
| wh2_dlc15_grn_veh_snotling_pump_wagon_0 | 12 / 5088 | 12 / 5088 | MATCH |
| wh2_dlc09_tmb_veh_skeleton_archer_chariot_0 | 12 / 7032 | 12 / 7032 | MATCH |
| wh3_dlc25_dwf_art_goblin_hewer | 4 / 6420 | 4 / 6420 | MATCH |
| wh_dlc05_wef_cav_wild_riders_0 | 60 / 6900 | 60 / 6900 | CONFIRMS_REFERENCE_CONFLICT |

## Reproduction

Run node scripts/promote-unit-entities-second.mjs --check. Source envelopes, manifest pins, all selected source snapshots, native references and independent raw/card checks must replay exactly. The old 13-case and MEDIUM evidence is unchanged. Tests cover source drift, unknown HP versus zero, count-only admission, missing contributors, bonus multiplicity, nonintegral mounted conflict, overflow and both inverse overlay drift guards.

TW Database stated commit c773c6d0 returned HTTP 422. Independent export commit 8a4f7e64714cf971b44988a4b59f218af6d04ff2 and published TWW Stats implementation are separately pinned. No reference value supplies missing original raw HP. See RESULTS.md for executed tests/build and Production UI verification.
