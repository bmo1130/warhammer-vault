# 사격 직격 피해 2차 정밀 보완

기준 commit 6f230f09d6802a9ce00447427705da402f784a86. CA 9.0.2.0, snapshot c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5. 1차 보류 목록 222개의 exact main/land/weapon/projectile key를 재사용했다. 1차 RULES/AUDIT/VALIDATION과 원본 admission은 역사적 결과로 보존한다. 현재 결과는 이 문서와 report.json이다.

| 필드 | 저장 before → after |
| --- | --- |
| baseDamage | 155 → 328 |
| armorPiercingDamage | 149 → 327 |
| range | 333 → 333 |
| baseTime | 336 → 336 |

| 상태 | before → after |
| --- | --- |
| COMPLETE | 148 → 307 |
| PARTIAL | 190 → 38 |
| UNKNOWN | 32 → 25 |
| N/A | 740 → 740 |

신규 피해 승격 184유닛 / 351필드. COMPLETE는 기존 네 정적 필드의 저장 상태이며 전체 복합 피해나 게임 카드 계산식의 완성을 뜻하지 않는다. 사거리와 raw 기본 재장전은 이번 slice에서 변경하지 않았다.

## 직격 값과 표시의 의미

projectiles.damage/ap_damage는 1발의 기본 직격 raw 피해다. 폭발, projectile_number, shots_per_volley, burst_size, scaling_damage, spawned_vortex가 함께 있어도 해당 필드의 의미를 바꾸지 않는다. 원본 직격 피해는 독립적으로 승격하며 발사 수·폭발을 합산하지 않는다. scaling/vortex key는 미완결 구성요소로 보존한다. 이것은 modifier 적용 뒤 실제 타격 피해를 계산한 값이 아니다.

CA의 [생성된 CCO 문서 미러](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html#CcoProjectileRecord)는 DamageContext/ApDamageContext, ExplosiveDamageContext/ExplosiveApDamageContext, NumProjectiles, ShotsPerVolley, BurstSize를 별도로 노출한다. CcoUnitDetails.StatList/StatContextFromKey는 보이는 카드 stat을, CcoBattleUnit.ActiveProjectileContext는 실제 사용 중인 발사체를 조회한다. 따라서 raw 기록과 UI 집계 피해를 분리한다. 이 API 문서는 카드 실측이 아니며 문서만으로 mounted 우선순위·Missile Strength 공식·발사 간격을 확정하지 않는다.

## 검증한 선택 규칙

1. 기본 참조 경로는 land primary / engine missile_weapon / rider entity stats다. CA processed schema는 classic artillery의 engine 무기와 crewless war machine의 land primary를 구별한다. 소유자가 서로 다른 피해를 가진 경우 엔진·본체·rider 중 한쪽을 이름이나 최대값으로 고르지 않는다.
2. unit_missile_weapon_junction의 enable effect는 modifier로 활성화되는 교체 프로필이다. **modifier-free 원본 기본값**에서 이 교체를 적용하지 않고 BASE_REFERENCE 값의 불변성을 검사한다. 실제 캠페인에서 effect가 비활성이라는 주장은 아니다. 조건부 무기·effect key는 각각 보존한다. enable 경로가 없는 junction은 자동 제외하지 않으며, 값이 다르면 UNRESOLVED_JUNCTION_ACTIVATION으로 보류한다.
3. battle_entity_stats_override는 교체의 대상 entity stats다. 그 stats의 기존 무기를 새 교체 무기로 중복 계산하지 않는다. 원본 target은 REPLACEMENT_TARGET으로 보존한다.
4. missile_weapons_to_projectiles의 CA schema 설명에 따라 서로 다른 shot_type와 실제 projectile_shot_type_display row를 검증한 추가 발사체는 전환 모드다. default라는 이름만으로 한쪽 피해를 scalar에 넣지 않는다. 각 모드를 보존하고 다르면 SWITCHABLE_PROFILES_DIFFER로 scalar를 보류한다. projectile_shot_type_enum.requires_effect_enabling/supersedes_shot_type와 display rowId도 보존한다.
5. precursor는 자동 공격·카드 표시 의미를 수치에 곱하지 않는다. raw 직격 값이 불변이면 승격한다. hide_secondary_range_ammo_statistics_ui는 CA 설명상 탄약·거리·missile strength를 숨기는 플래그이며 raw 피해를 UNKNOWN/0으로 만드는 이유가 아니다. 현 보류 집합에서 hidden secondary 실제 표본은 0개다. 이 규칙은 변형 검증으로 확인했다.
6. 원본 참조가 끊어지거나 raw 필드 타입이 잘못되면 UNKNOWN이다. 명시적 0은 0으로 보존한다. 양쪽 직격이 0이고 검증된 폭발 피해만 양수면 EXPLOSION_ONLY로 별도 분류한다.

최소 추가 구조는 UnitMissileDamageAdmissions의 profiles 배열이다. 기존 UnitMissile 숫자 필드와 개인 기록 schema는 유지한다. profiles는 weapon/projectile key, 소유 경로, 활성화 조건, 각 직격·폭발 수치, launch/volley/burst, 선택/표시 상태를 담는다. 서로 다른 프로필을 합산하지 않고 UI의 펼침 영역에 각각 보여준다. scalar에 승격되는 두 피해 필드와 profiles 원본은 정확한 admission accessor에서 연결한다.

## 보류 유형별 처리

| 유형 | 처리 유닛 | 새 피해 승격 유닛 | 양쪽 피해 확인 | 피해 보류 |
| --- | --- | --- | --- | --- |
| MULTIPLE_PROFILES | 105 | 67 | 55 | 50 |
| MULTISHOT_VOLLEY | 105 | 86 | 76 | 29 |
| DIRECT_AND_EXPLOSION | 148 | 130 | 120 | 28 |
| PRECURSOR | 4 | 4 | 4 | 0 |
| HIDDEN_SECONDARY | 0 | 0 | 0 | 0 |
| ARTILLERY_WAR_MACHINE | 72 | 60 | 55 | 17 |
| MOUNT_RIDER | 79 | 51 | 49 | 30 |
| INCOMPLETE_REFERENCE | 0 | 0 | 0 | 0 |

유형은 중복 집계다. 엔진·탑승자 구조는 다른 유형과 겹친다. 원본 참조 불완전 실제 유닛 0개; activation 미확정 junction은 reference 누락과 구별한다.

## 원본·독립 검증과 게임 카드

selection.source.json의 새 exact-key 선택 739 row 중 무기·발사체 714 row는 1차 원본 전체 row와 hash/identity가 동일하다. UI shot enum/display의 별도 원본도 함께 저장했다. validation.source.json은 기존 집계 collector와 다른 traceUnitByMainKey 경로로 12개 보류 표본을 재추출한 자료다. 기존 10개 독립 trace와 17개/68개 기준값도 회귀 검증한다. 같은 CA snapshot을 사용하는 원본 재현성 검사이며 독립 게임 UI 증거와 구별한다.

실제 게임 카드 신규 실측 **0개**. 게임 프로세스는 실행 중이 아니었으며, 이번 데이터 추출은 gameExecuted=false다. 모든 새 프로필의 uiDisplayedDamage/uiSelectedProfile는 null이다. raw selection 추론을 실측값으로 쓰지 않는다. 버전·보정 상태 미기록의 과거 Helstorm wiki Strength 339/current reload 15.3은 비교 자료만 유지한다. Helstorm 직격 30/70은 이번에 저장하며 집계 339나 직격+폭발 합계로 대체하지 않는다.

| 보류 표본 | 독립 raw row 검증 | UI |
| --- | --- | --- |
| wh_dlc04_emp_inf_free_company_militia_0 | 4 row hash MATCH | 미측정 |
| wh_main_emp_art_helstorm_rocket_battery | 5 row hash MATCH | 미측정 |
| wh_main_dwf_art_cannon | 4 row hash MATCH | 미측정 |
| wh2_main_hef_art_eagle_claw_bolt_thrower | 4 row hash MATCH | 미측정 |
| wh3_main_kho_mon_soul_grinder_0 | 4 row hash MATCH | 미측정 |
| wh2_dlc11_cst_mon_necrofex_colossus_0 | 4 row hash MATCH | 미측정 |
| wh3_dlc25_dwf_veh_thunderbarge | 5 row hash MATCH | 미측정 |
| wh3_dlc25_dwf_art_goblin_hewer | 4 row hash MATCH | 미측정 |
| wh2_main_hef_cav_tiranoc_chariot | 4 row hash MATCH | 미측정 |
| wh3_dlc23_chd_veh_iron_daemon_1dreadquake | 7 row hash MATCH | 미측정 |
| wh_main_emp_inf_handgunners | 4 row hash MATCH | 미측정 |
| wh2_main_lzd_inf_skink_cohort_1 | 4 row hash MATCH | 미측정 |

| 기존 17개 표본 | expected 기본/AP/거리/reload | Production actual | 결과 |
| --- | --- | --- | --- |
| wh2_dlc12_skv_inf_ratling_gun_0 | 2 / 6 / 145 / 5 | 2 / 6 / 145 / 5 | 4/4 MATCH |
| wh_main_brt_inf_peasant_bowmen | 16 / 3 / 160 / 11 | 16 / 3 / 160 / 11 | 4/4 MATCH |
| wh_dlc07_brt_inf_peasant_bowmen_1 | 21 / 2 / 160 / 11 | 21 / 2 / 160 / 11 | 4/4 MATCH |
| wh_dlc07_brt_inf_peasant_bowmen_2 | 16 / 3 / 160 / 11 | 16 / 3 / 160 / 11 | 4/4 MATCH |
| wh_main_brt_cav_mounted_yeomen_1 | 16 / 3 / 125 / 11 | 16 / 3 / 125 / 11 | 4/4 MATCH |
| wh_main_brt_art_field_trebuchet | 40 / 145 / 440 / 20 | 40 / 145 / 440 / 20 | 4/4 MATCH |
| wh_dlc07_brt_art_blessed_field_trebuchet_0 | 70 / 270 / 440 / 20 | 70 / 270 / 440 / 20 | 4/4 MATCH |
| wh_main_emp_inf_crossbowmen | 18 / 6 / 160 / 13 | 18 / 6 / 160 / 13 | 4/4 MATCH |
| wh_main_emp_cav_outriders_0 | 2 / 6 / 115 / 13 | 2 / 6 / 115 / 13 | 4/4 MATCH |
| wh2_dlc12_skv_inf_warplock_jezzails_0 | 6 / 30 / 275 / 12 | 6 / 30 / 275 / 12 | 4/4 MATCH |
| wh2_main_skv_inf_skavenslave_slingers_0 | 7 / 1 / 120 / 9 | 7 / 1 / 120 / 9 | 4/4 MATCH |
| wh2_main_skv_art_plagueclaw_catapult | 45 / 105 / 400 / 18 | 45 / 105 / 400 / 18 | 4/4 MATCH |
| wh2_main_skv_art_warp_lightning_cannon | 80 / 260 / 430 / 21 | 80 / 260 / 430 / 21 | 4/4 MATCH |
| wh2_dlc09_tmb_mon_ushabti_1 | 18 / 104 / 255 / 11 | 18 / 104 / 255 / 11 | 4/4 MATCH |
| wh2_dlc12_lzd_mon_ancient_salamander_0 | 70 / 265 / 160 / 12 | 70 / 265 / 160 / 12 | 4/4 MATCH |
| wh2_dlc11_cst_inf_deck_gunners_0 | 8 / 39 / 245 / 11 | 8 / 39 / 245 / 11 | 4/4 MATCH |
| wh2_dlc11_cst_inf_zombie_gunnery_mob_1 | 8 / 20 / 145 / 13 | 8 / 20 / 145 / 13 | 4/4 MATCH |

report.json.comparisons는 222개 유닛의 CA 직격·폭발·발사체 수·volley/burst·선택 후보·UI null·Production 저장값을 대조한다. sourceReference/rowId/pathIndex/projectileIndex는 1차 lossless 원본에 연결된다. 새로운 수치는 integer 그대로다.

폭발 전용 프로필 3개:
| 유닛 | weapon | projectile |
| --- | --- | --- |
| wh3_dlc25_dwf_veh_thunderbarge | wh3_dlc25_dwf_thunderbarge_bomb | wh3_dlc25_dwf_thunderbarge_bomb |
| wh3_dlc25_dwf_veh_thunderbarge | wh3_dlc25_dwf_thunderbarge_bomb | wh3_dlc25_dwf_thunderbarge_bomb |
| wh3_dlc25_dwf_veh_thunderbarge_grungni_mp | wh3_dlc25_dwf_thunderbarge_bomb | wh3_dlc25_dwf_thunderbarge_bomb |

후속 보류 63개는 AUDIT.md에 모든 raw key와 필드별 원인을 기록했다. 손실 없는 profiles는 scalar 보류 유닛에도 Production에서 조회할 수 있다. 원본 재추출과 게임 UI 실측은 각각 selection/validation.source.json과 null UI 필드로 분리한다.

재현: node scripts/promote-unit-missile-damage.mjs --check. 새 pack/schema snapshot은 자동 적용하지 않고 source pins가 실패하도록 한다. 1차 admission, 전체 능력 사전 446종, 클릭 상세 패널, 개인 문서·즐겨찾기·검색·Character identity·23종족 roster는 보존한다. 최종 테스트·빌드·변경 파일은 VALIDATION.md에 기록한다.
