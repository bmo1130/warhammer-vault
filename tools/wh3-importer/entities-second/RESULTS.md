# HP 및 개체 수 2차 보완 결과

기준 커밋 `533df13`, Production 1,110개, Ultra 기준. 기존 HP 규칙을 재사용하고 PARTIAL 85개를 먼저 조사한 뒤 UNKNOWN 39개로 확장했다. 새로운 62개 identity의 HP 또는 count를 개선했다. 원본 Unit JSON, 이전 HP/Speed admission 및 자료는 보존했다.

## 1–3. Coverage와 상태

| 항목 | Before | After |
| --- | ---: | ---: |
| Entity count 저장 | 1,071 | **1,097** |
| Total HP 저장 | 986 | **1,026** |
| COMPLETE | 986 | **1,026** |
| PARTIAL | 85 | **71** |
| UNKNOWN | 39 | **13** |
| healthPerEntity 저장 | 0 | 0 |

총 HP 미확정은 124 → 84개, count 미확정은 39 → 13개다. 새로운 HP 40개와 새로운 count 26개는 일부 identity가 겹친다.

## 4–5. 기존 그룹별 해결

| 원래 그룹 | 대상 | HP/count 모두 완료 | count만 신규 확인 | 현재 PARTIAL | 현재 UNKNOWN |
| --- | ---: | ---: | ---: | ---: | ---: |
| A: count 확인, HP 미확정 | 85 | 36 | 0 | 49 | 0 |
| B: HP/count 모두 미확정 | 39 | 4 | 22 | 22 | 13 |

A의 확정 count 85개는 모두 유지했다. B의 26개는 먼저 count를 저장했으며 그중 4개에 총 HP도 저장했다. B의 나머지 13개는 서로 다른 독립 카드 구현의 count/HP 해석이 충돌하여 보류했다.

## 6. 구조별 신규 승격

| 구조 / 계산식 | 개선 identity | 신규 count | 신규 HP |
| --- | ---: | ---: | ---: |
| 포병 `ARTILLERY` | 34 | 0 | 34 |
| 비탑승 차량 `ENGINE_CREW` | 5 | 4 | 5 |
| 기존 검증 전차 `ARTICULATED_N` | 1 | 0 | 1 |
| native engine 카드 count만 | 22 | 22 | 0 |

## 7. 계산 규칙

`N=main.num_men`, `U=land.num_mounts`, `G=land.num_engines`, `B=bonus_hit_points`. `M/H/E/A`는 정확한 본체/탈것/엔진/관절 entity의 `hit_points`다.

- 포병: **`(B+M)*N + (B+E)*G`**, 표시 count는 G. 대원과 포 각각에 B를 적용한다. 기존 Generic_3_Crew 규칙을 독립적으로 검증된 Generic_2/5_Crew까지 확장했다. 본체 M=8, 엔진 entity type=artillery, 정확한 원본 HP와 정수 구성 수 등의 조건을 유지한다.
- 비탑승 차량: **`B*G + M*N + E*G`**, 표시 count는 G. Generic_No_Crew_Rotate, chariot/war_machine, M=E=8과 정수 N/G의 검증된 구조로 제한한다. Doom-Flayers의 N=G를 재현하고 펌프 웨건의 N=2G에서도 독립 카드와 일치한다. 펌프 웨건에 `B*N`을 적용하면 9,888이 되어 실제 웹 카드 5,088과 불일치한다.
- 관절 전차: **`B*G + M*N + H*U*G + (E+A)*G`**, 표시 count는 G. 기존 M=H=E=A=8 조건과 정확한 전체 체인을 유지한다. 해골 궁수 전차 1개가 새로 해당 조건을 충족했다. Black Coach의 기존 5,980은 보존하고 잘못된 N→U×G 계산의 5,988은 계속 거부한다.
- 엔진 카드 count: native engine record와 양의 G가 명확하고 검증된 Generic 엔진 유형·독립 구현이 일치하면 G를 저장한다. HP 행의 존재와 count 검증을 분리했다. HP 누락을 0으로 취급하지 않는다.

이름별 예외는 없다. 비정수 N/U, 누락된 HP contributor, 미검증 소유권, 비정수·음수·overflow는 보류한다. 비행 여부로 별도의 HP 배수를 만들지 않았다. Small/Medium/Large scaling과 복합 total/count의 개체당 HP 해석은 추가하지 않았다. 상세 조건은 [RULES.md](RULES.md)에 있다.

## 8. CA 참조 복구

Speed slice에서 사용한 동일 snapshot의 기존 추출 자료 합치기 방법을 재사용했다. 6,434개 원본 row pool에서 필요한 510개 row를 골라 파일·row ID·schema·pack·snapshot provenance를 유지했다.

`main_units → land_units → man_entity / mounts.entity / battlefield_engines.battle_entity / land_unit_articulated_vehicles.articulated_entity → battle_entities.hit_points`의 native schema reference를 검사했다. 이전 HP 감사의 전체 체인 누락 **40개**를 복구했다. 포병 34개와 Speed에서 복구했던 차량·관절 구조 6개다. 전체 체인이 있는 미완료 identity는 53개이며, 그중 탑승 구조 13개는 값 해석 충돌 때문에 승격하지 않았다.

이 복구는 원래 snapshot의 이미 저장된 raw row를 재연결한 것이다. 이름이나 수치가 비슷한 다른 유닛에서 복사하지 않았다. 추가로 검사한 기존 9.0.2 runtime archive 두 개는 새로운 row를 제공하지 않았다.

현재 설치본의 재추출 **9.0.3.0 / 627행**은 별도 snapshot과 exe/pack hash로 보존했다. 기존 9.0.2를 대체하거나 누락 HP를 이 값으로 채우지 않았다. 원래 CA 데이터 자체에 row가 없었다고 단정하지 않는다. 현재 저장된 원본 추출 자료에 row가 없다는 뜻이다.

## 9. 기존 기준값 회귀

기존 총 HP **986/986**, count **1,071/1,071**을 유지했다. 13개 Ultra 기준 tuple을 모두 재현했다. 이 13개는 직접 CCO capture 10개와 종속 exact-profile 검증값 3개로 구분한다.

기존 MEDIUM 추가 자료도 유지했다: Necrofex Colossus count 1 / HP 9,507, Free Company Militia count 60 / HP 3,660. 각 archived frame의 expected/actual이 일치한다. 관측 count를 사용한 보조 수치 검증이며 Medium→Ultra scaling 근거로 사용하지 않았다.

## 10. 추가 검증 표본

**새 직접 게임 UI 실측은 0개다.** 아래는 이번에 읽은 독립 TWW Stats 웹 카드다. Ultra, Fresh, 9.0.0에서 검증했으며 해당 원본 count/HP/참조/type 필드가 9.0.2 저장 원본과 일치한다. 일반 표본은 Rank 0, Queen Bess는 Rank 0 label을 표시하지 않는 RoR 카드다.

| 표본 | CA 계산 expected count / HP | 웹 카드 actual count / HP | 처리 |
| --- | --- | --- | --- |
| Great Cannons | 4 / 4,356 | 4 / 4,356 | HP 승격 |
| Queen Bess | 1 / 7,392 | 1 / 7,392 | HP 승격 |
| Snotling Pump Wagons | 12 / 5,088 | 12 / 5,088 | HP/count 승격 |
| Skeleton Archer Chariots | 12 / 7,032 | 12 / 7,032 | HP 승격 |
| Goblin Hewers | 4 / 6,420 | 4 / 6,420 | 2-crew HP 규칙 검증 |
| Wild Riders | N 방식 60 / 6,900; U 방식 40 / 4,760 | 60 / 6,900 | 독립 자료 충돌 확인, 보류 |

전체 URL·관찰 시각·조건은 [browser-card-evidence.json](browser-card-evidence.json)에 있다. 선택된 원본 510행의 count/HP/type/참조 필드를 [독립 9.0.0 export](https://github.com/Shazbot/WH3-Dump/tree/8a4f7e64714cf971b44988a4b59f218af6d04ff2)와 모두 비교했다. TW Database 9.0.2의 key 기반 카드 값도 비교했으나 그 사이트가 밝힌 upstream commit `c773c6d0`은 HTTP 422로 확인되지 않았다. 그 사이트만으로 확정하지 않고 TWW Stats 공개 계산 구현, 원본 체인과 교차 검증했다. 웹 카드, 외부 원본 export, CA 재추출은 게임 실측으로 집계하지 않는다.

## 11. 미해결 원인

- **71개 PARTIAL:** 정확한 9.0.2 engine 또는 articulation HP 체인이 저장된 자료에 없다. 엔진 카드 count는 알려져도 전체 contributor의 HP는 확정할 수 없다. Luminark, Steam Tank, War Wagon, Corpse Cart, 여러 전차·슬레드·기차 및 일부 전쟁 기계 등이 해당한다.
- **13개 UNKNOWN:** 비정수 N/U의 탑승 구조. Outrider 변형 2개, Squig Hopper 계열 3개, Deck Dropper 계열 4개, Wild Rider 계열 3개, Swords of Chaos 1개다. 동일 raw 필드에 대해 독립 카드가 N 또는 U와 다른 bonus multiplicity를 사용한다. 실제 Ultra 원본 카드/runtime capture 또는 동등한 증거가 필요하다.

84개 identity 각각의 main/land/참조 key, 실패 지점, 알려진 component HP, 11개 후보식과 계산 결과, 필요한 추가 원본은 [AUDIT.md](AUDIT.md) 및 [report.json](report.json)에 있다. 9.0.3에서 확인한 다음 target key는 비교로만 기록했다.

## 12. 변경 파일과 provenance

- `src/data/unitHpEntitySecondAdmissions.json`: 신규 62개 identity의 검증 overlay.
- `src/repositories/unitEntities.ts`: 원본·신규 projection 통합 및 정확한 역변환/identity guard.
- `scripts/promote-unit-entities-second.mjs`, `scripts/audit-unit-data.mjs`, `scripts/test.mjs`, `scripts/check-data.mjs`: 재현 검사와 Production 감사.
- `tests/unit-entities-second.test.cjs`: 신규 8개 검증. 기존 테스트는 live coverage 기대값을 갱신하고 원래 확인된 값의 회귀 검사를 유지했다.
- 이 폴더의 bounded collector, 저장 원본 연결 도구, source envelope 3개, manifest, 공개 구현·웹 관찰, 규칙·감사·검증 report.

Production snapshot은 `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`. 각 input과 report hash는 manifest/projection에 저장한다. `node scripts/promote-unit-entities-second.mjs --check`로 생성 문서와 projection을 재현한다.

Speed 1,099개, 저항 5종×1,110, 사격 기본/AP 328/327, 사거리 333, 재장전 336, 모집·특성/지속/액티브 능력·446종 능력 사전/패널/독립 문서·한국어 이름·Character identity/alias·23종족 roster·IME·개인 문서/즐겨찾기/최근 기록을 보존했다. 이 작업은 entities.count와 entities.totalHealth만 변경한다.

## 13. 실행 검증

관련 HP/entity 테스트: **23/23 PASS**. 기존 13개 Ultra와 MEDIUM 보조 자료, 기존 HP 986개/count 1,071개 회귀를 포함한다.

| 검사 | 결과 |
| --- | --- |
| HP/entity 관련 테스트 | **23/23 PASS** |
| 새 규칙에 기존 13개 Ultra tuple 적용 | **13/13 PASS**, Doom-Flayers의 ENGINE_CREW도 8 / 6,128 재현 |
| `npm test` 현재 앱 | **223/223 PASS** |
| `npm test` 격리 역사 증거 · 최종 재실행 | **623/623 PASS** |
| `npm test` 전체 · 최종 재실행 | **846/846 PASS**, 실패 0 / skipped 0 |
| `npm run check:data` | **PASS**, live projection 및 17개 역사 replay |
| `npm run build` | **PASS**, TypeScript + Vite, 141 modules |
| `npm run check:pages` | **PASS**, 8 route/query/hash roundtrips 및 built assets |
| `node scripts/promote-unit-entities-second.mjs --check` | **PASS** |
| `git diff --check` | **PASS** |

최초 전체 실행에서는 `tests/skill-rank-runtime-resolution.test.cjs`의 임시 폴더용 Windows installer 회귀 한 건이 실행 중인 실제 `Warhammer3` 프로세스 때문에 `Close the game before installation/removal.`로 거부되어 845/846이었다. 사용자 요청에 따라 게임 종료 상태를 확인한 뒤 해당 테스트를 단독 재실행하여 1/1 PASS, 이어서 전체 `npm test`를 다시 실행하여 **846/846 PASS**를 확인했다. 보호 조건·installer·역사 테스트를 수정하지 않았고 게임 프로세스도 종료하지 않았다. 최초 로그는 그대로 보존하고 최종 전체 재실행 로그는 `generated/wh3/entities-second/full-tests-rerun.log`에 별도 보존했다.

Production 빌드에서 다음 화면을 확인했다: Swordsmen **120 / 8,280**, Dragon Ogres **16 / 9,856**, Great Cannons **4 / 4,356**, Snotling Pump Wagons **12 / 5,088**, Black Coach **1 / 5,980**. 모두 Ultra 표기와 개체당 HP 미확인 상태를 유지한다. 브라우저 오류는 0개이며 임시 preview를 종료했다. 이는 전쟁서고 UI 확인이며 게임 자체 실측이 아니다.

빌드에 기존 큰 bundle 경고가 남아 있다. 실행 로그, 새 규칙 ground-truth 재계산 결과, 웹 카드 및 Production 화면 스크린샷은 로컬 ignored `generated/wh3/entities-second/`에 보존했다. 요청대로 로컬 커밋만 생성하고 push하지 않는다.
