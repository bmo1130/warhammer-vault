# Ultra HP/count second slice

Baseline 533df13; Production 9.0.2.0; snapshot c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5. Original rules, admissions and raw Units are immutable. New values are provided by a second overlay.

| Measure | Before | After |
| --- | --- | --- |
| Count | 1071 | 1097 |
| Total HP | 986 | 1026 |
| COMPLETE | 986 | 1026 |
| PARTIAL | 85 | 71 |
| UNKNOWN | 39 | 13 |

## Verified scope

N = main_units.num_men; U = land_units.num_mounts; G = land_units.num_engines; B = bonus_hit_points. M/H/E/A are exact man/mount/engine/articulation battle_entities.hit_points.

- Preserve all original MAN, RIDER_MOUNT and other verified recipes. No existing 986 total HP or 1,071 count changes.
- ARTILLERY: unmounted warmachine/artillery, engine entity type artillery, Generic_2/3/5_Crew, M=8, exact positive E and integer component counts. Total = (B+M)*N+(B+E)*G; card count G. All crew and guns get bonus B. The prior Generic_3_Crew restriction is extended only to independently verified 2/5 crew structures.
- ENGINE_CREW: unmounted chariot/war_machine, Generic_No_Crew_Rotate, engine entity type chariot, M=E=8, integer N/G. Total = B*G+M*N+E*G; card count G. This reproduces the original Doom-Flayers at N=G and four newly corroborated Pump Wagon structures at N=2*G. Applying bonus B to every rider incorrectly doubles the bonus in the latter cohort.
- ARTICULATED_N: reuse B*G+M*N+H*U*G+(E+A)*G only inside the original verified chariot shape with M=H=E=A=8 and all exact original rows. One newly recovered Skeleton Archer Chariot chain qualifies. The Black Coach ground truth continues to reject replacing N by U*G.
- Count can be independent of HP: exact native engine reference plus explicit positive G and known Generic engine type selects G for the independently validated engine card branch. Missing engine HP or articulation HP does not remove this known count. 22 new count-only cards stay PARTIAL; no missing HP is treated as zero.
- Mounted nonintegral N/U remains withheld. Two independent references use incompatible N versus U cardinalities and bonus ownership on the same raw fields. No name/key exception or averaging is permitted.
- Ultra only; require safe positive count/HP and nonnegative integer raw contributions. No Small/Medium/Large scaling or rounding rule is introduced. Composite total/count is not healthPerEntity; that field remains UNKNOWN for all 1,110.

| Recipe | Units | New count | New HP |
| --- | --- | --- | --- |
| ARTILLERY | 34 | 0 | 34 |
| NATIVE_ENGINE_CARD_G | 22 | 22 | 0 |
| ENGINE_CREW | 5 | 4 | 5 |
| ARTICULATED_N | 1 | 0 | 1 |

## Sources and limits

Production values come only from stored exact CA 9.0.2 rows. The prior Speed pooling method recovers already extracted rows across pinned sources; 53/124 full chains now exist. No new original-version pack extraction is claimed. Both archived original captures add zero further rows. 40 full HP chains are newly completed relative to the old HP audit: 34 artillery chains plus the same six vehicle/articulation chains completed in the Speed slice. Compare report.json catalog.originalMissing and missing.

Fresh CA 9.0.3.0: 627 bounded rows, separate snapshot, comparison only. Independent Shazbot fixed-commit export is 9.0.0. All selected original count/HP/reference/type fields are compared; version differences are not copied. TW Database 9.0.2 supplies key-matched derived cards, but its stated upstream commit returns HTTP 422. Its data is not sufficient alone for an admission. TWW Stats public count/HP implementation supplies the second recipe comparison and observed website cards. These are derived cards, not new direct game measurements.

No new direct game UI measurement. Historical training is 10 direct Ultra CCO captures + 3 dependent exact-profile baselines. Existing MEDIUM Necrofex/Free Company numerical checks are corroboration only.
