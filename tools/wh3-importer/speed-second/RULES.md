# Base card Speed second slice

Baseline c122973; Production 9.0.2.0; snapshot c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5.

| Measure | Before | After |
| --- | --- | --- |
| Stored / COMPLETE | 908 | 1099 |
| PARTIAL | 125 | 0 |
| UNKNOWN | 77 | 11 |

| Original hold | Units | Exact chains recovered | Promoted | Held |
| --- | --- | --- | --- | --- |
| FLIGHT | 117 | 117 | 117 | 0 |
| MISSING | 77 | 6 | 66 | 11 |
| SYNC | 3 | 3 | 3 | 0 |
| ENGINE | 3 | 3 | 3 | 0 |
| ARTICULATED | 2 | 2 | 2 | 0 |

## Selection and display

- MAN_ONLY selects man_entity. MOUNTED selects mounts.entity, never the rider.
- For the verified flying man/mount cohort: selected battle_entities.fly_speed × 10. All have positive fly_speed >= run_speed. No flight multiplier or charge speed is applied.
- Independently inspected TWW Stats implementation selects mount, then engine, then man; its card uses positive fly speed, otherwise run speed. TW Database describes max(run, fly). These agree on this cohort. Positive fly below run remains held; neither site establishes that edge case.
- Engine admission is limited to exact man+engine chains, Generic_2/3/5_Crew artillery or Generic_No_Crew_Rotate with articulated_entity or large_entity locomotion. Ground card uses selected run_speed × 10.
- ARTICULATED selects the exact mount for Generic_No_Crew_Rotate/Fixed or Generic_3_Crew with native man/mount/engine/articulation references. Independently validated mount precedence applies even when non-selected engine/articulation rows are missing or have different speeds. Missing selected movement sources still block admission. Raw secondary gaps remain preserved in report.json; no min/max or equal-value tie is used.
- sync_locomotion means synchronised animation (CA schema), not a scalar speed modifier. Only single-ground-man chains are admitted in that category; mounted_draughts remains held.
- Exact integer conversion only. Rounding and zero-card semantics remain unvalidated. Zero fly_speed signifies the ground branch, not an unknown value.

## Meanings preserved

Base card Speed differs from movement in a battle. CA fly_speed describes airborne movement, run_speed ground movement, charge_speed ground charge and flying_charge_speed air charge. Acceleration, deceleration, turn_speed and locomotion constants remain independent raw evidence. Terrain, fatigue, rank, abilities, Wounds, skills and technologies are conditional; none are folded into Production basic Speed. No groundSpeed/chargeSpeed schema fields are added.

## Provenance limits

Only stored exact CA 9.0.2 rows supply admitted values. The fresh installation is now 9.0.3.0; its 819 rows are a separate comparison, never relabelled as 9.0.2. Stored-source recovery pools already pinned CA tables, preserving file and row IDs. It recovers six full raw chains. Another 60 units already have a complete selected mount chain; missing non-selected engine/articulation rows cannot invalidate that verified card source. It does not copy values between names.

TW Database 9.0.2 supplies 1,110 key-matched publisher-derived cards; its claimed upstream commit c773c6d0 currently returns HTTP 422. This limits provenance confidence; the website is not treated as direct game measurement or as a source for missing CA rows. TWW Stats 9.0.0 implementation and Shazbot's actual 9.0 commit 8a4f7e64714cf971b44988a4b59f218af6d04ff2 provide a second extraction path and observed website cards. Version differences are recorded.

New direct game UI measurements: **0**. Historical six manually reported cards and 81 static regression values remain unchanged. All original 908 admissions survive. Character Lord/Hero catalogs remain outside these 1,110 Units; no mounted character Speed is fabricated.

## Scope

Second admission overlay changes movement.speed only. Original admissions, raw Units, HP/count, missile fields, resistances, recruitment, localisation, ability dictionary and personal records are preserved. Run scripts/promote-unit-speed-second.mjs --check to replay pins, all 908 regressions, held structures and the admission projection.
