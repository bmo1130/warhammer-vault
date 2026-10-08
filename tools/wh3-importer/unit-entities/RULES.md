# Ultra unit HP / entity count: empirical category admission

2026-10-08 · baseline `129f55f` · WH3 `9.0.2.0` · Ultra custom battle 기본값.

관측 기준 13개를 고정하고 원본 구조별 공식을 검증했다. 개체 수는 13 → 1,071, 표시 총 HP는 13 → 986이다. 새 identity 1,058개를 승격했다. 기존 13개 원본 HP admission과 이전 audit는 보존하고 새 Production projection에서 계산값을 제공한다.

## 1. 고정 ground truth와 원본 필드

13개 모두 수치 검증에 사용한다. 증거의 독립성은 구분한다: 10개는 직접 CCO runtime capture, 3개(Spearmen, Battle Pilgrims, Blessed Trebuchets)는 기존 exact-profile 승격값이며 독립 측정 세 건으로 중복 집계하지 않는다. 각 capture reference와 원본 provenance는 `rules-report.json`의 training / catalog.sourceFields에 보존했다.

| Unit | count | total HP | 관측 HP/count | N | U | G | B | M | H | E | A |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Swordsmen | 120 | 8280 | 69 | 120 | 0 | 0 | 61 | 8 | — | — | — |
| Mounted Yeomen | 60 | 5520 | 92 | 60 | 60 | 0 | 76 | 8 | 8 | — | — |
| Dragon Ogres | 16 | 9856 | 616 | 16 | 0 | 0 | 608 | 8 | — | — | — |
| Dread Saurian | 1 | 15088 | 15088 | 12 | 1 | 0 | 14984 | 8 | 8 | — | — |
| Skeleton Chariots | 12 | 7032 | 586 | 24 | 2 | 12 | 538 | 8 | 8 | 8 | 8 |
| Field Trebuchets | 4 | 4512 | 1128 | 44 | 0 | 4 | 45 | 8 | — | 500 | — |
| Screaming Skull Catapults | 4 | 4356 | 1089 | 44 | 0 | 4 | 48 | 8 | — | 425 | — |
| Plagueclaw Catapults | 4 | 5028 | 1257 | 56 | 0 | 4 | 43 | 8 | — | 500 | — |
| Doom-Flayers | 8 | 6128 | 766 | 8 | 0 | 8 | 750 | 8 | — | 8 | — |
| Black Coach | 1 | 5980 | 5980 | 1 | 2 | 1 | 5940 | 8 | 8 | 8 | 8 |
| Spearmen (Shields) | 120 | 8280 | 69 | 120 | 0 | 0 | 61 | 8 | — | — | — |
| Battle Pilgrims | 120 | 8280 | 69 | 120 | 0 | 0 | 61 | 8 | — | — | — |
| Blessed Field Trebuchets | 4 | 4512 | 1128 | 44 | 0 | 4 | 45 | 8 | — | 500 | — |

HP/count는 관측 비율이며 `healthPerEntity` admission이 아니다. 특히 crew/vehicle/artillery에서는 표시 개체가 복합 HP를 포함한다.

## 2. 조사한 source와 reference chain

`main_units.num_men` (N), `main_units.land_unit`, `main_units.caste`, `land_units.bonus_hit_points` (B), `land_units.num_mounts` (U), `land_units.num_engines` (G), category/class, `man_entity`, `mount`, `engine`, `articulated_record`를 조사했다. `man_entity → battle_entities.hit_points` (M), `mounts.entity → battle_entities.hit_points` (H), `battlefield_engines.battle_entity → battle_entities.hit_points` (E), `land_unit_articulated_vehicles.articulated_entity → battle_entities.hit_points` (A)를 schema-checked joins로 추출했다. `engine_type`, `mounted_draughts`, `sync_locomotion`, rider/draught attachment flags도 보존한다.

기본 trace에 없는 articulation은 기존 `articulation.source.json`에서 동일 snapshot / main / land / count / bonus 값을 검증하고 보충했다. 누락 HP를 0으로 대체하지 않는다. runtime `NumEntitiesInitial`, `HealthMax`, ManList / MountList / EngineList / EntityList 및 기존 `logicalCount`를 비교한다.

JSON의 `catalog.sourceFields`는 value와 rowId / sourceId / field / pathId를 저장한다. `sourceRows[sourceId]`에서 table / row key / schema version / pack / file path를, `joinPaths[pathId]`에서 schema-checked join 전체를 복원한다. 동일 경로의 반복 저장만 제거하며 원본 provenance 정보는 모두 유지한다.

| Unit / land identity | caste / category | man entity | mount record → entity | engine record → entity | articulation record → entity |
| --- | --- | --- | --- | --- | --- |
| wh_main_emp_inf_swordsmen / wh_main_emp_inf_swordsmen | melee_infantry / inf_melee | wh_main_infantry_standard_blood_dismembers | — → — | — → — | — → — |
| wh_main_brt_cav_mounted_yeomen_0 / wh_main_brt_cav_mounted_yeomen_0 | melee_cavalry / cavalry | wh_main_cavalry_rider_standard_blood | wh_main_brt_mnt_warhorse_fast → wh_main_brt_mnt_cavalry_fast_blood | — → — | — → — |
| wh_dlc01_chs_mon_dragon_ogre / wh_dlc01_chs_mon_dragon_ogre | monstrous_infantry / inf_melee | wh_dlc01_chs_dragon_ogre_blood | — → — | — → — | — → — |
| wh2_dlc13_lzd_mon_dread_saurian_1 / wh2_dlc13_lzd_mon_dread_saurian_1 | monster / war_beast | wh_main_infantry_rider | wh2_dlc13_lzd_mnt_dread_saurian → wh2_dlc13_lzd_mon_dread_saurian_blood | — → — | — → — |
| wh2_dlc09_tmb_veh_skeleton_chariot_0 / wh2_dlc09_tmb_veh_skeleton_chariot_0 | chariot / war_machine | wh2_dlc09_tmb_skeleton | wh2_dlc09_tmb_mnt_tomb_steed_chariot → wh2_dlc09_tmb_cav_skeletal_steed_chariot | wh2_dlc09_tmb_chariot → wh2_dlc09_tmb_vehicle_chariot | wh2_dlc09_tmb_chariot → wh2_dlc09_tmb_vehicle_chariot_horse_articulation |
| wh_main_brt_art_field_trebuchet / wh_main_brt_art_field_trebuchet | warmachine / artillery | wh2_dlc16_infantry_standard_crew_blood_dismembers | — → — | wh_main_brt_art_field_trebuchet → wh_main_brt_art_trebuchet | — → — |
| wh2_dlc09_tmb_art_screaming_skull_catapult_0 / wh2_dlc09_tmb_art_screaming_skull_catapult_0 | warmachine / artillery | wh2_dlc16_tmb_skeleton_crew | — → — | wh2_dlc09_tmb_art_screaming_skull_catapult → wh2_dlc09_tmb_art_screaming_skull_catapult | — → — |
| wh2_main_skv_art_plagueclaw_catapult / wh2_main_skv_art_plagueclaw_catapult | warmachine / artillery | wh2_dlc16_skv_infantry_crew | — → — | wh2_main_skv_art_plagueclaw_catapult → wh2_main_skv_art_plagueclaw_catapult | — → — |
| wh2_dlc12_skv_veh_doom_flayer_0 / wh2_dlc12_skv_veh_doom_flayer_0 | chariot / war_machine | wh2_main_skv_infantry | — → — | wh2_dlc12_skv_veh_doom_flayer → wh2_dlc12_skv_vehicle_doom_flayer | — → — |
| wh_main_vmp_veh_black_coach / wh_main_vmp_veh_black_coach | chariot / war_machine | wh_main_infantry_standard_blood_dismembers | wh_main_vmp_mnt_coach_nightmare → wh_main_vehicle_vmp_black_coach_chariot_nightmare_draught | wh_main_vmp_veh_black_coach → wh_main_vehicle_vmp_black_coach_chariot | wh_main_vmp_black_coach → wh_main_vehicle_vmp_black_coach_chariot_articulation |
| wh_main_emp_inf_spearmen_1 / wh_main_emp_inf_spearmen_1 | melee_infantry / inf_melee | wh_main_infantry_standard_blood_dismembers | — → — | — → — | — → — |
| wh_dlc07_brt_inf_battle_pilgrims_0 / wh_dlc07_brt_inf_battle_pilgrims_0 | melee_infantry / inf_melee | wh_main_infantry_standard_blood_dismembers | — → — | — → — | — → — |
| wh_dlc07_brt_art_blessed_field_trebuchet_0 / wh_dlc07_brt_art_blessed_field_trebuchet_0 | warmachine / artillery | wh2_dlc16_infantry_standard_crew_blood_dismembers | — → — | wh_dlc07_brt_art_field_blessed_trebuchet → wh_main_brt_art_trebuchet | — → — |

## 3. 모든 후보식의 expected / actual

공식별 actual을 표에 기록한다. expected는 첫 번째 HP 열이다. ✓는 정확히 일치, Δ는 actual − expected이다. —는 필요한 HP 원본 필드가 없어서 계산 불가이다. 11개 후보를 13개 전체에 적용했으며 class별 선택 결과는 모두 정확히 일치한다.

- `MAN`: `(B+M)*N`
- `BONUS`: `B*N`
- `MOUNT`: `(B+H)*U`
- `RIDER_MOUNT`: `B*U+M*N+H*U`

| Unit | expected HP | MAN | BONUS | MOUNT | RIDER_MOUNT |
| --- | --- | --- | --- | --- | --- |
| Swordsmen | 8280 | 8280 ✓ | 7320 (Δ -960) | — | — |
| Mounted Yeomen | 5520 | 5040 (Δ -480) | 4560 (Δ -960) | 5040 (Δ -480) | 5520 ✓ |
| Dragon Ogres | 9856 | 9856 ✓ | 9728 (Δ -128) | — | — |
| Dread Saurian | 15088 | 179904 (Δ +164816) | 179808 (Δ +164720) | 14992 (Δ -96) | 15088 ✓ |
| Skeleton Chariots | 7032 | 13104 (Δ +6072) | 12912 (Δ +5880) | 1092 (Δ -5940) | 1284 (Δ -5748) |
| Field Trebuchets | 4512 | 2332 (Δ -2180) | 1980 (Δ -2532) | — | — |
| Screaming Skull Catapults | 4356 | 2464 (Δ -1892) | 2112 (Δ -2244) | — | — |
| Plagueclaw Catapults | 5028 | 2856 (Δ -2172) | 2408 (Δ -2620) | — | — |
| Doom-Flayers | 6128 | 6064 (Δ -64) | 6000 (Δ -128) | — | — |
| Black Coach | 5980 | 5948 (Δ -32) | 5940 (Δ -40) | 11896 (Δ +5916) | 11904 (Δ +5924) |
| Spearmen (Shields) | 8280 | 8280 ✓ | 7320 (Δ -960) | — | — |
| Battle Pilgrims | 8280 | 8280 ✓ | 7320 (Δ -960) | — | — |
| Blessed Field Trebuchets | 4512 | 2332 (Δ -2180) | 1980 (Δ -2532) | — | — |

- `CREW`: `(B+M)*N`
- `ENGINE`: `(B+E)*G`
- `ENGINE_CREW`: `B*G+M*N+E*G`
- `ARTILLERY`: `(B+M)*N+(B+E)*G`
- `VEHICLE`: `B*N+M*N+E*G`

| Unit | expected HP | CREW | ENGINE | ENGINE_CREW | ARTILLERY | VEHICLE |
| --- | --- | --- | --- | --- | --- | --- |
| Swordsmen | 8280 | 8280 ✓ | — | — | — | — |
| Mounted Yeomen | 5520 | 5040 (Δ -480) | — | — | — | — |
| Dragon Ogres | 9856 | 9856 ✓ | — | — | — | — |
| Dread Saurian | 15088 | 179904 (Δ +164816) | — | — | — | — |
| Skeleton Chariots | 7032 | 13104 (Δ +6072) | 6552 (Δ -480) | 6744 (Δ -288) | 19656 (Δ +12624) | 13200 (Δ +6168) |
| Field Trebuchets | 4512 | 2332 (Δ -2180) | 2180 (Δ -2332) | 2532 (Δ -1980) | 4512 ✓ | 4332 (Δ -180) |
| Screaming Skull Catapults | 4356 | 2464 (Δ -1892) | 1892 (Δ -2464) | 2244 (Δ -2112) | 4356 ✓ | 4164 (Δ -192) |
| Plagueclaw Catapults | 5028 | 2856 (Δ -2172) | 2172 (Δ -2856) | 2620 (Δ -2408) | 5028 ✓ | 4856 (Δ -172) |
| Doom-Flayers | 6128 | 6064 (Δ -64) | 6064 (Δ -64) | 6128 ✓ | 12128 (Δ +6000) | 6128 ✓ |
| Black Coach | 5980 | 5948 (Δ -32) | 5948 (Δ -32) | 5956 (Δ -24) | 11896 (Δ +5916) | 5956 (Δ -24) |
| Spearmen (Shields) | 8280 | 8280 ✓ | — | — | — | — |
| Battle Pilgrims | 8280 | 8280 ✓ | — | — | — | — |
| Blessed Field Trebuchets | 4512 | 2332 (Δ -2180) | 2180 (Δ -2332) | 2532 (Δ -1980) | 4512 ✓ | 4332 (Δ -180) |

- `ARTICULATED_N`: `B*G+M*N+H*U*G+(E+A)*G`
- `ARTICULATED_UG`: `B*G+(M+H)*U*G+(E+A)*G`

| Unit | expected HP | ARTICULATED_N | ARTICULATED_UG |
| --- | --- | --- | --- |
| Swordsmen | 8280 | — | — |
| Mounted Yeomen | 5520 | — | — |
| Dragon Ogres | 9856 | — | — |
| Dread Saurian | 15088 | — | — |
| Skeleton Chariots | 7032 | 7032 ✓ | 7032 ✓ |
| Field Trebuchets | 4512 | — | — |
| Screaming Skull Catapults | 4356 | — | — |
| Plagueclaw Catapults | 5028 | — | — |
| Doom-Flayers | 6128 | — | — |
| Black Coach | 5980 | 5980 ✓ | 5988 (Δ +8) |
| Spearmen (Shields) | 8280 | — | — |
| Battle Pilgrims | 8280 | — | — |
| Blessed Field Trebuchets | 4512 | — | — |

## 4. Entity count: expected / actual

| Unit | expected | N | U | G | raw N+U+G | 선택한 rule |
| --- | --- | --- | --- | --- | --- | --- |
| Swordsmen | 120 | 120 ✓ | 0 (Δ -120) | 0 (Δ -120) | 120 ✓ | MAN_ONLY_N |
| Mounted Yeomen | 60 | 60 ✓ | 60 ✓ | 0 (Δ -60) | 120 (Δ +60) | MOUNTED_U |
| Dragon Ogres | 16 | 16 ✓ | 0 (Δ -16) | 0 (Δ -16) | 16 ✓ | MAN_ONLY_N |
| Dread Saurian | 1 | 12 (Δ +11) | 1 ✓ | 0 (Δ -1) | 13 (Δ +12) | MOUNTED_U |
| Skeleton Chariots | 12 | 24 (Δ +12) | 2 (Δ -10) | 12 ✓ | 38 (Δ +26) | ARTICULATED_CHARIOT_G |
| Field Trebuchets | 4 | 44 (Δ +40) | 0 (Δ -4) | 4 ✓ | 48 (Δ +44) | ARTILLERY_G |
| Screaming Skull Catapults | 4 | 44 (Δ +40) | 0 (Δ -4) | 4 ✓ | 48 (Δ +44) | ARTILLERY_G |
| Plagueclaw Catapults | 4 | 56 (Δ +52) | 0 (Δ -4) | 4 ✓ | 60 (Δ +56) | ARTILLERY_G |
| Doom-Flayers | 8 | 8 ✓ | 0 (Δ -8) | 8 ✓ | 16 (Δ +8) | ENGINE_VEHICLE_G |
| Black Coach | 1 | 1 ✓ | 2 (Δ +1) | 1 ✓ | 4 (Δ +3) | ARTICULATED_CHARIOT_G |
| Spearmen (Shields) | 120 | 120 ✓ | 0 (Δ -120) | 0 (Δ -120) | 120 ✓ | MAN_ONLY_N |
| Battle Pilgrims | 120 | 120 ✓ | 0 (Δ -120) | 0 (Δ -120) | 120 ✓ | MAN_ONLY_N |
| Blessed Field Trebuchets | 4 | 44 (Δ +40) | 0 (Δ -4) | 4 ✓ | 48 (Δ +44) | ARTILLERY_G |

N은 Ultra logical count의 전역 source가 아니다: Dread Saurian 12 → 1, Skeleton Chariots 24 → 12, Field Trebuchets 44 → 4. 일반 몸체는 N, 탑승 몸체는 U, 포병/검증된 전차 구조는 G를 사용한다. articulation에서 U는 엔진당 탈것 수라서 runtime MountList는 U×G이다. component count를 표시 개체 수에 더하지 않는다. 새로운 승격은 각 구조의 실측 Ultra 대응을 일반화하며 Small/Medium/Large 배율을 추정하지 않는다.

## 5. 확정한 category 규칙과 적용 범위

| count rule | HP formula | 기준 count / HP 일치 | direct anchors | count known | HP known |
| --- | --- | --- | --- | --- | --- |
| MAN_ONLY_N | (B+M)*N | 4 / 4 | 2 | 773 | 773 |
| ENGINE_VEHICLE_G | B*N+M*N+E*G | 1 / 1 | 1 | 4 | 1 |
| MOUNTED_U | B*U+M*N+H*U | 2 / 2 | 2 | 204 | 204 |
| ARTICULATED_CHARIOT_G | B*G+M*N+H*U*G+(E+A)*G | 2 / 2 | 2 | 50 | 2 |
| ARTILLERY_G | (B+M)*N+(B+E)*G | 4 / 4 | 3 | 40 | 6 |

- MAN_ONLY: mount/engine/articulation reference가 명시적으로 비어 있고 U=G=0, N>0, M=8, 정확한 HP chain일 때 `(B+M)*N`. infantry / monstrous infantry / single body / flying body / swarm 등 이름이 아닌 동일 source 구조에 적용한다.
- MOUNTED: engine/articulation이 없고 N/U가 양의 정수이며 M=H=8일 때 `B*U+M*N+H*U`, 표시 count U. Mounted Yeomen과 Dread Saurian의 1명 및 12명 탑승 구조를 설명한다. M/H를 교환한 식도 동일해지는 훈련 범위이므로 8/8 밖의 HP를 승격하지 않는다.
- ARTILLERY: unmounted engine, warmachine/artillery, 정수 crew/piece, `engine_type=Generic_3_Crew`, M=8 및 exact E가 있을 때 `(B+M)*N+(B+E)*G`, count G. E=425/500 및 crew 44/56의 모든 포병 기준값을 재현한다.
- ENGINE_VEHICLE: unmounted chariot/war_machine, N=G, M=E=8일 때 `B*N+M*N+E*G`, count G. Doom-Flayers의 훈련 구조 밖 crew ratio는 보류한다.
- ARTICULATED_CHARIOT: chariot/war_machine, mount/engine/articulation, 정수 N/G에서 count G. HP는 모든 exact component chain과 M=H=E=A=8이 필요하며 `B*G+M*N+H*U*G+(E+A)*G`. Black Coach는 N 대신 U×G를 쓰는 식의 5,988을 거부하여 5,980을 선택한다. E/A 교환의 물리적 소유권은 주장하지 않는다.

각 규칙은 해당 구조의 모든 ground truth를 재현한다. 다른 castes에 적용하는 근거는 동일 named fields / reference shape / component cardinality이다. 미측정 유닛의 confidence는 **EMPIRICAL_SAME_SOURCE_STRUCTURE**, 새로운 게임 실측 확정은 아니다. 완전한 CA 물리적 HP 소유권 해석 대신 UI total을 예측하는 경험적 규칙으로 범위를 제한했다. 이름·특정 unit key 하드코딩은 계산식에 없다.

## 6. Production 저장 coverage / UNKNOWN 변화

| Field | known before | known after | UNKNOWN before | UNKNOWN after | 새 저장값 |
| --- | --- | --- | --- | --- | --- |
| entities.count | 13 | 1071 | 1097 | 39 | 1058 |
| entities.totalHealth | 13 | 986 | 1097 | 124 | 973 |
| entities.healthPerEntity | 0 | 0 | 1110 | 1110 | 0 |

Combined: COMPLETE 13 → 986, PARTIAL 0 → 85, UNKNOWN 1,097 → 39. 새로운 count identity 1,058개 중 총 HP도 새로 채운 identity는 973개다. 저장은 `src/data/unitHpEntityRuleAdmissions.json`에서 수행하며 `gameRepository`와 데이터 audit가 이 검증된 projection을 동일하게 적용한다. 기존 `src/data/units.json` 및 13개 원본 admission은 바꾸지 않는다.

## 7. Category별 COMPLETE / PARTIAL / UNKNOWN

| caste | 전체 | COMPLETE | PARTIAL | UNKNOWN |
| --- | --- | --- | --- | --- |
| monstrous_infantry | 109 | 109 | 0 | 0 |
| melee_infantry | 297 | 297 | 0 | 0 |
| chariot | 67 | 9 | 51 | 7 |
| melee_cavalry | 111 | 103 | 0 | 8 |
| monstrous_cavalry | 39 | 39 | 0 | 0 |
| missile_infantry | 159 | 159 | 0 | 0 |
| monster | 184 | 184 | 0 | 0 |
| missile_cavalry | 30 | 29 | 0 | 1 |
| warmachine | 67 | 16 | 34 | 17 |
| war_beast | 45 | 41 | 0 | 4 |
| generic | 2 | 0 | 0 | 2 |

Lord / hero는 별도 Character catalog이다. 두 기존 source 표본 모두 baseline Ultra capture가 없어 UNKNOWN이며 Unit 숫자 1,110에 포함하지 않는다. canonical identity / alias / localisation을 유지한다. flying / swarm 구조 표본 결과는 아래에 따로 제시한다.

## 8. 미해결 구조의 정확한 이유

- MOUNTED 13개: N/U가 정수가 아니다 (60/48, 60/40, 24/16). 실측 1:1 또는 정수 attached-rider 구조와 다르며 어느 cardinality가 버려지는지 훈련값이 없다. Night Goblin Squig Hoppers, Wild Riders, Deck Droppers 등의 기존 row 불일치를 값이나 이름 override로 보정하지 않는다.
- ENGINE chariot 7개: N≠G (crew ratio가 Doom-Flayers의 1:1과 다름). 미검증 crew/engine 구조라 count/HP 둘 다 UNKNOWN이다.
- ENGINE warmachine/war_machine 6개와 ARTICULATED의 warmachine/generic 13개: caste/category 구조가 포병 또는 chariot anchor의 적용 범위를 벗어난다. count/HP 둘 다 UNKNOWN이다.
- count만 확인한 85개: ENGINE_VEHICLE 3개, ARTILLERY 34개, ARTICULATED_CHARIOT 48개. engine 또는 articulation HP의 exact join이 누락되거나 HP equality/engine-type 훈련 범위를 벗어난다. `catalog.reasons`와 category.unresolved에 identity별 정확한 필드명을 기록했다. count 계산에는 그 HP field가 필요하지 않으므로 count는 승격한다.
- crew / composite per-entity HP와 다른 unit size의 scaling은 1,110개 모두 UNKNOWN이다.

## 9. 추가 검증 표본과 confidence

| category | 미측정 표본 | 예측 count | 예측 total HP | 결과 |
| --- | --- | --- | --- | --- |
| ELITE_LOW_COUNT_INFANTRY | Aspiring Champions | 16 | 9856 | COMPLETE |
| FLYING_MOUNTED | Pegasus Knights | 24 | 6264 | COMPLETE |
| SWARM | Nurglings | 60 | 9300 | COMPLETE |
| WAR_MACHINE_UNMEASURED | Steam Tank | 1 | — | PARTIAL |
| INFANTRY | The Sternsmen (Grave Guard) | 120 | 9840 | COMPLETE |
| INFANTRY | Men-at-Arms (Polearms) | 120 | 7920 | COMPLETE |
| INFANTRY | Foot Squires | 120 | 8280 | COMPLETE |
| MONSTROUS_INFANTRY | Vargheists | 16 | 6320 | COMPLETE |
| MONSTROUS_INFANTRY | Ushabti (Great Bows) | 12 | 6096 | COMPLETE |
| MONSTROUS_INFANTRY | Animated Hulks | 16 | 9632 | COMPLETE |
| SINGLE_ENTITY_BODY | Feral Bastiladon | 1 | 7698 | COMPLETE |
| SINGLE_ENTITY_BODY | Feral Stegadon | 1 | 9040 | COMPLETE |
| SINGLE_ENTITY_BODY | Ancient Salamander | 1 | 6168 | COMPLETE |
| CAVALRY | Grail Knights | 48 | 7296 | COMPLETE |
| CAVALRY | The Royal Altdorf Gryphites (Demigryph Knights) | 32 | 7456 | COMPLETE |
| MOUNT_WITH_CREW | Necrofex Colossus | 1 | 9507 | COMPLETE |
| MOUNT_WITH_CREW | The Arachnarok Queen (Arachnarok Spider) | 1 | 10029 | COMPLETE |
| MOUNT_WITH_CREW | Lava Arachnarok Spider | 1 | 10029 | COMPLETE |
| ARTILLERY | Warp Lightning Cannons | 4 | 4848 | COMPLETE |
| ARTILLERY | Carronades | 4 | 4356 | COMPLETE |

위 표는 Ultra 구조 검증/예측이며 새로운 live capture 결과가 아니다. 새로운 독립 Ultra reference는 확보하지 못했다. 같은 raw field를 다시 계산하거나 기존 exact-profile 예측을 독립 실측으로 세지 않았다. 각 표본의 source pointer / raw fields / independentReference=null을 명시한다.

별도로 기존 runtime archive의 raw-probe 파일 5개에서 중복을 제거한 unit/size/count/HP tuple 5개를 검사했다. 훈련 identity 밖 두 개는 MEDIUM capture였다. 두 원본 로그를 아래 파일에 byte-identical로 보존하고 SHA256, parser 문제 0, completed runs, 동일 snapshot/main/land identity를 재검증했다.

| 독립 원본 | size | 관측 count | 관측 HP | 관측 count에 적용한 식 | 계산 HP | delta |
| --- | --- | --- | --- | --- | --- | --- |
| Necrofex Colossus | MEDIUM | 1 | 9507 | observedCount * 9507 | 9507 | 0 |
| Free Company Militia | MEDIUM | 60 | 3660 | observedCount * 61 | 3660 | 0 |

네크로펙스의 원본 rider/body 구조에서 MEDIUM 1개체·9,507과 계산값이 일치한다. 자유 민병대는 MEDIUM의 관측 count 60에 `(B+M)=61`을 곱해 3,660을 재현한다. 여기서는 관측 count를 사용했으며 Medium → Ultra 배율을 추정하지 않았다. 기존 로그의 mod/rank/effect 및 actual-game 검증 정보가 완전하지 않아 **추가 수치 일치 근거**로만 사용하고, Ultra training 또는 admission source로 사용하지 않는다. MEDIUM/LARGE/SMALL Production scaling은 계속 UNKNOWN이다.

## 10. 변경 파일과 회귀 보호

- `tools/wh3-importer/unit-entities/ground-truth.json`: 13개 고정 fixture.
- `rules-manifest.json`, `rules.mjs`, `rules-report.mjs`, `rules-report.json`, `RULES.md`: source pins, 재생 가능한 category 규칙, 모든 후보/승격/보류 감사.
- `unit-entities/review.mjs`: 기존 검증된 raw trace를 새 분석에 전달하는 optional callback; 기존 review/projection은 deep equality로 동일함을 확인.
- `src/data/unitHpEntityRuleAdmissions.json`, `src/repositories/unitEntities.ts`: Production overlay와 exact inverse 및 identity guard.
- `src/components/UnitProductionDetails.tsx`: 실측/구조 계산 및 count-only 상태 출처 설명.
- `scripts/promote-unit-hp-entity-rules.mjs`, `scripts/audit-unit-data.mjs`, `scripts/check-data.mjs`, `scripts/test.mjs`: validator와 재현 검사 연결.
- `tests/unit-hp-entity-rules.test.cjs`, `tests/unit-entities.test.cjs`: 13개 기준값, category coverage, 후보 반례, source/size/ratio/누락/overflow 거부, UI와 보호 데이터 회귀.
- `tests/archive-localisation.test.cjs`, `tests/manual-calculator.test.cjs`, `tests/unit-comparison.test.cjs`: 확대된 coverage 및 HP 계산/비교값을 반영하고 실제 UNKNOWN 표본의 동작도 유지한다.
- `tools/wh3-importer/hp-policy/inputs/independent-necrofex-medium.log`, `independent-free-company-medium.log`: 기존 archive에서 보존한 원본 byte; 추가 교차검증 전용이며 기존 HP policy를 변경하지 않는다.

속도·저항·사격·모집 조건의 데이터/규칙을 변경하지 않았다. Korean unit names 1,110, localisation, Character identity/alias, attributes 1,107, passives 1,105, 23 race COMPLETE roster 및 문서/즐겨찾기/최근 기록·영문/한국어 검색·IME 회귀는 기존 테스트에서 함께 검증한다.

## 11. 테스트

실행 결과와 commit 기록은 [VALIDATION.md](VALIDATION.md)에 기록한다. 관련 HP/entity 테스트, 전체 `npm test`, `npm run check:data`, `npm run build`, `npm run check:pages`를 실행한다. Production projection은 `--check`에서 source pins, 13개 baseline, raw trace 재생과 exact output 비교를 모두 통과해야 한다.
