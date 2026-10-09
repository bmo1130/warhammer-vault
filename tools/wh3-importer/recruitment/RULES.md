# 모집 조건 및 출처 — CA 9.0.2.0

Baseline: ef6b1748888f8d60e3c167ce11b5997dfc4d4b6f. Snapshot: c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5.

## Production 승격

| 항목 | before | after | UNKNOWN after |
|---|---:|---:|---:|
| 직접 건물 모집 조건 | 0 | 758 | 352 |
| 직접/특수 출처 기록 | 0 | 1107 | 3 |
| 확정 실효 출처 | 0 | 0 | 1110 (PARTIAL 포함) |

전체 모집 경로: COMPLETE 0 / PARTIAL 1107 / UNKNOWN 3 / N/A 0. 직접 건물 참조 경로만 COMPLETE 758; 이는 전체 모집 완료나 캠페인 건설 가능성을 의미하지 않는다. 특수 구조 분류 627, 복수 건물 698, 복수 체인 587, 추가 해금 참조 369.

## 확정 경로와 적용 규칙

- main_units.unit ← building_units_allowed.unit; building_units_allowed.building → building_levels.level_name → building_levels.chain → building_chains.key. 실제 processed schema 및 기록된 edge가 있어야 승격한다.
- building_units_allowed.unit 설명은 각 상위 단계에도 별도 연결을 넣도록 명시한다. 실제 행에 없는 상위 단계는 추정하지 않는다. building key와 진영을 보존하며 중복 건물/체인을 모두 저장한다.
- building_levels.level은 체인 내 0-based 단계이며 Tier가 아니다. primary_slot_building_building_level_requirement는 별도 원본 값으로 저장한다. 값에 +1을 하거나 buildingTier에 대입하지 않는다. 최소 단계는 동일 체인/진영/조건의 명시적 행 안에서만 min(level)이다.
- building_units_allowed.faction이 빈 기본 행의 enabled=false는 모집 차단으로 보지 않는다. 진영 행의 enabled=true는 해당 진영 연결이다. existing pair의 진영 false는 제외 참조로 보존하고 standalone false/conflict는 보류한다. 조건 코드 0을 그대로 기록하며 미해석 코드가 나타나면 보류한다. 이름별 예외 없음.
- unit → units_to_groupings_military_permissions.military_group ← factions.military_group → factions.subculture → cultures_subcultures.culture; units_to_exclusive_faction_permissions.key/faction/allowed도 별도 보존한다. permission은 실제 모집 가능 진영의 확정 목록으로 오인하지 않는다.
- building_culture_variants의 culture/subculture/faction/disables, chain availability sets → availability rules (culture/sub_culture/faction/campaign), required buildings, resources, capital/unique/UI flags, settlement-type 조건, content pack 조건을 building registry에 보존한다. 비활성 variant를 임의로 덮어쓰거나 absent availability rule을 everyone으로 추정하지 않는다.
- main_units.is_renown=true만 유명연대를 분류한다. unit → mercenary_unit_groups.unit_record → mercenary_pool_to_groups_junctions.group → mercenary_pools.key/recruitment_source, unit_recruitment_source_overrides.source, ritual_payload_spawn_mercenaries.spawnable_unit/payload, unit_to_unit_group_junctions.unit_group → unit_upgrade_to_unit_groups.target_unit_group 및 tech/building/rank/resource 참조를 독립 PARTIAL 출처로 보존한다.
- ritual_payload_change_unit_capacities는 출처가 아니라 capacity 해금 참조다. mercenary character level restrictions 및 main additional building/resource/campaign_cap도 raw 조건으로 보존한다. cap의 0/-1 의미는 해석하지 않는다. 의례의 풀 추가는 확인하지만 능력 소환/임무/군주 독점/지역·전역 모집을 추정하지 않는다.

## 실효 출처 검증 범위

Direct building permission and special source identity. Campaign construction, startpos, scripts, implicit availability sets, faction permission precedence, local/global eligibility and live unlocks are not a closed proof. Effective sources remain PARTIAL_SOURCE until that proof exists.

확정 실효 출처는 이번 순회에서 0이다. 1,107개 출처 기록을 PARTIAL_SOURCE로 제공하며 직접 연결은 버리지 않는다. 모든 출처가 완결됐다는 COMPLETE와 캠페인에서 실제 모집 가능한 VERIFIED_EFFECTIVE_SOURCE를 부풀리지 않는다.

## 구조별 승격

| 구조 | 유닛 | 출처 행 |
|---|---:|---:|
| BUILDING | 758 | 6779 |
| CORE_MERCENARY_PERMISSION | 6 | 6 |
| MERCENARY_GROUP | 31 | 31 |
| MERCENARY_POOL | 561 | 1010 |
| RECRUITMENT_SOURCE_OVERRIDE | 114 | 151 |
| REGIMENT_OF_RENOWN | 256 | 256 |
| RITUAL_MERCENARY_SPAWN | 36 | 49 |
| UNIT_UPGRADE | 88 | 191 |

유닛은 여러 구조에 포함될 수 있어 합계는 중복된다. 신규 출처 기록 유닛 1107.

## 종족별 coverage

Roster membership 기준이며 공유 병종은 여러 종족에 포함된다. 모집 가능 진영 판정이 아니다.

| 종족 ID | 전체 | 건물 조건 | 특수 분류 | PARTIAL | UNKNOWN |
|---|---:|---:|---:|---:|---:|
| empire | 75 | 39 | 42 | 75 | 0 |
| vampire_counts | 43 | 31 | 43 | 43 | 0 |
| greenskins | 70 | 46 | 26 | 70 | 0 |
| bretonnia | 30 | 24 | 6 | 30 | 0 |
| tomb_kings | 45 | 34 | 36 | 45 | 0 |
| vampire_coast | 36 | 27 | 34 | 36 | 0 |
| skaven | 67 | 45 | 23 | 67 | 0 |
| lizardmen | 71 | 36 | 38 | 71 | 0 |
| kislev | 36 | 29 | 14 | 36 | 0 |
| ogre_kingdoms | 36 | 29 | 14 | 36 | 0 |
| khorne | 43 | 33 | 38 | 43 | 0 |
| chaos_dwarfs | 42 | 32 | 14 | 41 | 1 |
| tzeentch | 39 | 29 | 35 | 39 | 0 |
| slaanesh | 43 | 33 | 32 | 43 | 0 |
| beastmen | 48 | 36 | 12 | 48 | 0 |
| dark_elves | 51 | 36 | 28 | 51 | 0 |
| wood_elves | 46 | 34 | 18 | 44 | 2 |
| dwarfs | 54 | 31 | 25 | 54 | 0 |
| nurgle | 62 | 23 | 62 | 62 | 0 |
| norsca | 55 | 42 | 22 | 55 | 0 |
| high_elves | 64 | 45 | 28 | 64 | 0 |
| cathay | 36 | 29 | 19 | 36 | 0 |
| daemons_of_chaos | 65 | 45 | 53 | 65 | 0 |
| warriors_of_chaos | 173 | 122 | 168 | 173 | 0 |

## 독립 검증

Existing trace implementation plus separate exact-key probes, same CA snapshot. No independent live campaign or building browser measurement. No Legendary Lord exclusivity asserted from a faction permission.

| 범주 | CA unit key | expected / actual 직접 행 | 단계 비교 |
|---|---|---|---|
| BASIC_INFANTRY | wh_main_emp_inf_spearmen_0 | 51 / 51 | 51 일치 |
| ELITE_INFANTRY | wh_main_emp_inf_greatswords | 9 / 9 | 9 일치 |
| CAVALRY | wh_main_brt_cav_grail_knights | 10 / 10 | 10 일치 |
| MONSTER | wh3_main_kho_mon_bloodthirster_0 | 10 / 10 | 10 일치 |
| ARTILLERY | wh_main_emp_art_helstorm_rocket_battery | 10 / 10 | 10 일치 |
| REGIMENT_OF_RENOWN | wh_dlc04_vmp_inf_sternsmen_0 | 0 / 0 | 0 일치 |
| FACTION_PERMISSION_CONTEXT | wh2_dlc11_cst_mon_animated_hulks_0 | 26 / 26 | 26 일치 |
| MULTIPLE_BUILDING_CHAINS | wh_main_emp_inf_swordsmen | 13 / 13 | 13 일치 |
| RITUAL_PAYLOAD | wh3_dlc25_emp_art_helstorm_rocket_battery_morr | 0 / 0 | 0 일치 |
| UNIT_UPGRADE | wh_main_chs_inf_chosen_0 | 9 / 9 | 9 일치 |
| TECHNOLOGY_UPGRADE_CONDITION | wh_main_chs_inf_chosen_0 | 9 / 9 | 9 일치 |
| UNKNOWN | wh3_dlc23_chd_veh_iron_daemon_3payload_qb | 0 / 0 | 0 일치 |

별도 기존 trace 구현과 exact-key probe 12개 모두 일치. game UI 실측 0. CA localisation은 건물 표시명에만 사용한다. 진영 permission을 전설군주 독점이라고 분류하지 않았다. [독립 모딩 실험](https://tw-modding.com/wiki/Building_units_allowed_tables)은 baseline false 및 faction disable 의미 검토에 사용했으며 9.0.2 실측과 구분한다.

## 시험한 후보 규칙

- enabled=true globally: REJECTED: would discard all 6745 empty-faction baseline rows
- level equals Tier: REJECTED by processed building_levels.level description
- infer later chain levels: REJECTED by building_units_allowed.unit description; only explicit rows retained
- unit military permission proves campaign recruitment: REJECTED: buildability/source/unlocks independently required
- no source implies N/A: REJECTED: three units remain UNKNOWN

## provenance와 재현

원본 pack, schema, game version/hash, bounded selection coverage, 각 raw row key 및 edge를 catalog.source.json에 lossless gzip으로 보존한다. sourceKind ca-pack; gameExecuted false. report.json /catalog 및 /held는 유닛별 근거와 정확한 보류 키를 보존한다. projection은 report hash, snapshot, original campaign을 검증한다.

기존 src/data JSON과 이전 admission은 수정하지 않았다. runtime에서 모집 필드 세 개만 추가하며 정확히 일치하는 admission만 inverse로 제거한다. 개인 문서/검색/캐릭터/23 roster 및 다른 slice를 재작성하지 않는다.

검증 명령: node scripts/promote-unit-recruitment.mjs --check; npm test; npm run check:data; npm run build; npm run check:pages. 실제 실행 결과와 UI 점검은 VALIDATION.md에 기록한다.
