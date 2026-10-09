# Speed second validation

## Separate evidence classes

- Historical original Speed regression: 908/908 preserved, including all 81 original static values and six previously reported user cards.
- Publisher-derived 9.0.2 card comparison: 1099/1110 admitted matches; held rows have candidates but no stored Speed. No new direct game UI measurement.
- Independent 9.0.0 raw export: 489 selected rows, five fixed-commit files. Their hashes and individual component comparisons are stored in independent.source.json / report.json. Differences are never silently resolved.
- Fresh CA installation: 9.0.3.0, 819 bounded rows, current exe and pack hashes. Original source is 9.0.2.0. Neither extraction is a game card observation.
- TWW Stats public source selects mount > engine > soldier; positive fly > zero-fly run fallback. Its rounding/fatigue logic is not adopted.
- TW Database's stated upstream commit could not be resolved (HTTP 422). This uncertainty remains recorded; the secondary independent implementation and preserved CA chains support the admitted topology.

## Representative expected / actual

Expected means independent publisher card, not a newly observed live-game card. Ground run and flight/charge values remain distinct.

| Main key | Role | run | fly | charge | air charge | Card expected | Production actual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| wh_main_brt_cav_pegasus_knights | mount | 8.2 | 10.5 | 10.8 | 13 | 105 | 105 |
| wh_main_vmp_mon_vargheists | man | 6.5 | 9.2 | 9.2 | 12.5 | 92 | 92 |
| wh3_main_kho_inf_chaos_furies_0 | man | 10 | 11 | 12 | 13 | 110 | 110 |
| wh_main_dwf_veh_gyrocopter_0 | man | 7 | 10 | 9 | 12 | 100 | 100 |
| wh3_main_cth_veh_sky_junk_0 | mount | 3 | 3 | 3 | 3.2 | 30 | 30 |
| wh2_main_hef_mon_phoenix_flamespyre | man | 8 | 12 | 12 | 14 | 120 | 120 |
| wh_main_vmp_veh_black_coach | mount | 7.8 | 0 | 10.5 | 0 | 78 | 78 |
| wh2_dlc12_skv_veh_doom_flayer_0 | engine | 7.2 | 0 | 9.8 | 0 | 72 | 72 |
| wh_main_vmp_inf_skeleton_warriors_0 | man | 3.1 | 0 | 4.3 | 0 | 31 | 31 |

## Reproduction and isolation

The deterministic gate verifies pinned source envelopes, exact snapshot per admitted source row, recovered joins, all overlapping historical fields, reference conflicts and original 908 values. Tests exercise unknown sources, fractional conversion, negative/NaN values, mounted riders, sync/draught flags, independently selected articulation and flight-below-run. Repository tests verify reversible identity guards and equality of every non-Speed Unit field. Existing evidence remains immutable.

## New independent website card observations

TWW Stats 9.0.0, Ultra, rank 0, Fresh, No Comparison. These are newly read website cards, not game UI measurements. All selected entities and land-unit component references agree with the stored 9.0.2 raw movement profiles. Full URL and setup: browser-card-evidence.json.

| Main key | Expected (CA 9.0.2) | Actual (website 9.0.0) | Result |
| --- | --- | --- | --- |
| wh_main_brt_cav_pegasus_knights | 105 | 105 | MATCH |
| wh2_dlc13_huntmarshall_veh_obsinite_gyrocopter_0 | 100 | 100 | MATCH |
| wh_main_vmp_mon_vargheists | 92 | 92 | MATCH |
| wh3_main_cth_veh_sky_junk_0 | 30 | 30 | MATCH |
| wh2_dlc14_def_inf_harpies_ror_0 | 82 | 82 | MATCH |
| wh_dlc04_vmp_inf_konigstein_stalkers_0 | 31 | 31 | MATCH |

All 307 available component profiles of the 191 admissions also reproduce the fixed-commit independent raw movement fields.
