# 대표 표본 expected / actual

14개 별도 CA 재추출, 실제 게임 카드 UI 실측 0개. 모든 expected/actual native membership 및 raw definition 일치. 각 row의 Production label은 공식 Loc이고 미표시는 의미가 검증된 제외 또는 보류다. 전체 raw key/phase/condition/source row는 admission.json을 참조한다.

| 유형 | Unit ID | 상태 | expected / actual | 일치 |
| --- | --- | --- | --- | --- |
| ACTIVE | ca_unit_wh2_main_hef_mon_sun_dragon | COMPLETE | 2 / 2 key | PASS |
| TOGGLE | ca_unit_wh_main_brt_cav_grail_knights | COMPLETE | 2 / 2 key | PASS |
| CONDITIONAL | ca_unit_wh_dlc06_grn_inf_da_eight_peaks_loonies_0 | COMPLETE | 1 / 1 key | PASS |
| BOUND_MOUNT | ca_unit_wh3_main_cth_veh_war_compass_0 | COMPLETE | 5 / 5 key | PASS |
| MULTIPLE | ca_unit_wh_pro04_wef_inf_wardancers_ror_0 | COMPLETE | 4 / 4 key | PASS |
| EMPTY | ca_unit_wh_main_emp_inf_spearmen_0 | COMPLETE | 0 / 0 key | PASS |
| PASSIVE_ONLY | ca_unit_wh_dlc04_vmp_inf_sternsmen_0 | COMPLETE | 3 / 3 key | PASS |
| ACQUIRED_UNLOCK | ca_unit_wh3_dlc29_emp_inf_hunting_hounds_ror | COMPLETE | 1 / 1 key | PASS |
| HIDDEN_INTERNAL | ca_unit_wh2_dlc11_cst_mon_bloated_corpse_0 | COMPLETE | 5 / 5 key | PASS |
| TYPE_CONFLICT | ca_unit_wh3_dlc26_grn_mon_colossal_squig | UNKNOWN | 4 / 4 key | PASS |
| SPELL_BOUND_AMBIGUITY | ca_unit_wh3_twa08_ksl_mon_elemental_bear_0_ror | PARTIAL | 6 / 6 key | PASS |
| CULTURE_ASSIGNMENT | ca_unit_wh3_dlc29_skv_mon_stormfiend_grinderfists | UNKNOWN | 3 / 3 key | PASS |
| PERSISTENT_CONTROL | ca_unit_wh3_dlc25_dwf_veh_thunderbarge | PARTIAL | 3 / 3 key | PASS |
| MULTIPLE_BOUND | ca_unit_wh2_dlc09_tmb_mon_heirotitan_0 | COMPLETE | 6 / 6 key | PASS |

| Unit | raw key | native source / UI type | 분류 | Production 표시 | 중복 |
| --- | --- | --- | --- | --- | --- |
| ca_unit_wh2_main_hef_mon_sun_dragon | wh2_main_unit_abilities_sun_dragons_breath | active / wh_type_magic_missiles | ACTIVE | 태양룡 숨결 | 0 |
| ca_unit_wh_main_brt_cav_grail_knights | wh_dlc07_unit_formation_lance | active / wh_type_formation | TOGGLE | 랜스 | 0 |
| ca_unit_wh_dlc06_grn_inf_da_eight_peaks_loonies_0 | wh_dlc06_unit_abilities_the_loons_of_eight_peaks | active / wh_type_vortex | ACTIVE | 여덟 봉우리의 미치광이 | 0 |
| ca_unit_wh3_main_cth_veh_war_compass_0 | wh3_main_mount_bound_celestial_comet | bound / wh_type_bombardment | BOUND | 천상의 유성 | 0 |
| ca_unit_wh3_main_cth_veh_war_compass_0 | wh3_main_mount_bound_celestial_lightning | bound / wh_type_bombardment | BOUND | 천상의 벼락 | 0 |
| ca_unit_wh_pro04_wef_inf_wardancers_ror_0 | wh_dlc05_unit_abilities_storm_of_blades | active / wh_type_augment | TOGGLE | 검의 폭풍 | 0 |
| ca_unit_wh_pro04_wef_inf_wardancers_ror_0 | wh_dlc05_unit_abilities_the_shadows_coil | active / wh_type_augment | TOGGLE | 그림자 똬리 | 0 |
| ca_unit_wh_pro04_wef_inf_wardancers_ror_0 | wh_pro04_unit_abilities_loecs_shroud | active / wh_type_hiding | ACTIVE | 로엑의 장막 | 0 |
| ca_unit_wh3_dlc29_emp_inf_hunting_hounds_ror | wh3_dlc29_ability_bound_prayer_battle_howl | unit / wh_type_area_of_augments | ACQUIRED_UNLOCK | 제외/보류 | 0 |
| ca_unit_wh2_dlc11_cst_mon_bloated_corpse_0 | wh2_dlc15_unit_abilities_exploding_unit | active / wh_type_augment | HIDDEN_INTERNAL | 제외/보류 | 0 |
| ca_unit_wh3_dlc26_grn_mon_colossal_squig | wh3_dlc26_unit_abilities_blow_apart | active / wh_type_vortex | TYPE_CONFLICT | 제외/보류 | 0 |
| ca_unit_wh3_twa08_ksl_mon_elemental_bear_0_ror | wh3_main_unit_abilities_elemental_breath | active / wh_type_magic_missiles | ACTIVE | 정령의 숨결 | 0 |
| ca_unit_wh3_twa08_ksl_mon_elemental_bear_0_ror | wh3_twa08_spell_bound_heart_of_winter_elemental_bear_ror | spell / wh_type_area_of_direct_damage | SPELL_BOUND_AMBIGUITY | 제외/보류 | 0 |
| ca_unit_wh3_dlc29_skv_mon_stormfiend_grinderfists | wh3_dlc29_unit_abilities_stormfiend_seismic_snare | active / wh_type_area_of_hexes | ACTIVE | 제외/보류 | 0 |
| ca_unit_wh3_dlc25_dwf_veh_thunderbarge | wh3_dlc25_unit_abilities_spear_of_grungni | active / wh_type_magic_missile | ACTIVE | 그룽니의 창 | 0 |
| ca_unit_wh3_dlc25_dwf_veh_thunderbarge | wh3_dlc25_unit_abilities_thunderburner | active / wh_type_augment | TOGGLE_CONTROL_UNRESOLVED | 제외/보류 | 0 |
| ca_unit_wh2_dlc09_tmb_mon_heirotitan_0 | wh2_dlc09_spell_death_spirit_leech_bound | bound / wh_type_direct_damage | BOUND | 영혼 기생 | 0 |
| ca_unit_wh2_dlc09_tmb_mon_heirotitan_0 | wh_main_spell_light_shems_burning_gaze_bound | bound / wh_type_magic_missiles | BOUND | 쉠의 불타는 시선 | 0 |

일반 유닛과 passive-only의 빈 목록도 직접 membership 조회를 끝내고 모든 후보를 분류한 결과다. source_type과 활성화 플래그가 충돌하는 실제 사례를 보류하며, raw key에 passive라는 이름이 있어도 source=unit/passive=false인 Petrifying Gaze는 구조 근거로 ACTIVE 분류한다. 단일 이름/시간/횟수/AI 플래그는 분류 규칙이 아니다.
