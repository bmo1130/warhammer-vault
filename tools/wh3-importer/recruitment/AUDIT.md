# 모집 출처 2차 감사

## 전체 실효 판정 보류

모든 1107개 PARTIAL 유닛은 직접/특수 출처를 제공하되 캠페인 buildability와 해금 완결을 주장하지 않는다. 이유: startpos 지역/슬롯 template 및 inherited building chain sets, campaign Lua 등록/제한, permission override 우선순위, availability set의 암묵 규칙, 문화 variant의 우선순위, 지역/전역 모집과 faction-wide exclusion, DLC/현재 소유·연구·rank·cap·pool replenishment. 실제 진영·캠페인 상태를 확인하는 별도 표본이 필요하다.

## 출처가 미확정인 유닛

- wh3_dlc23_chd_veh_iron_daemon_3payload_qb (ca_unit_wh3_dlc23_chd_veh_iron_daemon_3payload_qb): NO_CONFIRMED_SOURCE_NOT_PROOF_OF_NON_RECRUITABILITY. 이름/cost만으로 summon-only 또는 N/A를 판정하지 않음.
- wh2_dlc16_wef_mon_ceithin_har_summoned (ca_unit_wh2_dlc16_wef_mon_ceithin_har_summoned): NO_CONFIRMED_SOURCE_NOT_PROOF_OF_NON_RECRUITABILITY. 이름/cost만으로 summon-only 또는 N/A를 판정하지 않음.
- wh2_dlc16_wef_mon_gwindalor_summoned (ca_unit_wh2_dlc16_wef_mon_gwindalor_summoned): NO_CONFIRMED_SOURCE_NOT_PROOF_OF_NON_RECRUITABILITY. 이름/cost만으로 summon-only 또는 N/A를 판정하지 않음.

## 미노출 DB 테이블

- unit_required_technology_junctions_tables.unit_key: 1110 exact keys. No DB table files in installed pack; no closed-world absence claim
- building_level_required_technology_junctions_tables.building_level_key: 1633 exact keys. No DB table files in installed pack; no closed-world absence claim
- building_chain_climate_restrictions_tables.building_chain: 564 exact keys. No DB table files in installed pack; no closed-world absence claim

Schema 존재와 pack 파일 부재는 0개 조건의 증명이 아니다. technology_required_building_levels_junctions는 연구에 필요한 건물 경로이며 건물 모집의 연구 해금으로 뒤집어 사용하지 않는다. unit_conditions는 achievement 요구를 담으므로 모집 조건에서 제외했다.

## 후속 특수 구조

RoR/pool/ritual/upgrade의 분류와 raw 조건은 승격했지만 캠페인 script unlock, mission/event, blessed spawn의 실제 풀 공급, LL 단독 규칙 및 summon-only, 지역/전역 모집, non-recruitable 판정은 보류. 연구/건물 참조는 자동 효과로 적용하지 않음.

유닛별 모든 key, source table/row, faction 조건 및 이유: report.json /held. 건물별 전체 제한: report.json /buildingDefinitions. SOURCE 기록이 없다는 이유로 N/A를 늘리지 않았다.
