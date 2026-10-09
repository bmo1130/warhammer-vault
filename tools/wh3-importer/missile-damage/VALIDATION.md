# 사격 직격 피해 2차 검증 — 2026-10-09

기준 commit: `6f230f09d6802a9ce00447427705da402f784a86` (공통 능력 사전 완료 상태).
CA WH3 `9.0.2.0`; snapshot `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
Production 1,110 / 정규 사격 370 / N/A 740.

## 실제 Production 저장 결과

| 항목 | before | after | 증가 |
| --- | --- | --- | --- |
| projectile 직격 기본 피해 | 155 | 328 | 173 |
| projectile 직격 AP 피해 | 149 | 327 | 178 |
| 사거리 | 333 | 333 | 0 |
| raw 기본 재장전 | 336 | 336 | 0 |
| COMPLETE | 148 | 307 | 159 |
| PARTIAL | 190 | 38 | -152 |
| UNKNOWN | 32 | 25 | -7 |
| N/A | 740 | 740 | 0 |

신규 피해 승격 **184개 유닛 / 351개 필드**. 두 피해가 모두 확인된 유닛은 320개다. COMPLETE는 기존 네 정적 필드의 저장 상태다. 복합 피해 전체 메커니즘·UI 위력·DPS 완성을 뜻하지 않는다.

기존 `units.json`과 모든 기존 `src/data`는 직전 commit과 byte-equivalent다. 새 `unitMissileDamageAdmissions.json` overlay만 추가했고 repository에서 실제 두 직격 필드에 적용한다. 사거리/재장전 scalar, 기존 17개 missile 객체, 기존 68개 raw 필드와 provenance는 그대로다. 복합 구조라는 이유로 직격을 버리던 정책은 새 damage slice에서 해제했으며 1차 결과와 replay는 역사적 자료로 보존했다.

## 보류 유형 처리

| 유형 | 처리 유닛 | 신규 피해 승격 유닛 | 두 피해 확인 | 피해 보류 |
| --- | --- | --- | --- | --- |
| 복수 weapon/profile | 105 | 67 | 55 | 50 |
| 다중 발사체 / volley / burst | 105 | 86 | 76 | 29 |
| 직격·폭발 복합 | 148 | 130 | 120 | 28 |
| precursor | 4 | 4 | 4 | 0 |
| hidden secondary | 0 | 0 | 0 | 0 |
| 포병·전쟁 기계 engine | 72 | 60 | 55 | 17 |
| 탈것·탑승자 | 79 | 51 | 49 | 30 |
| 원본 참조 불완전 | 0 | 0 | 0 | 0 |

유형별 중복 집계다. hidden-secondary 및 참조 불완전은 실제 표본 0개이며 변형 테스트로만 검증했다. 실제 데이터에서 없는 유형의 유닛 수를 만들어내지 않았다.

기존 보류 222개의 exact key를 재사용했다. 509개 weapon/projectile/activation 프로필을 저장했으며 repeated rider owner는 경로를 보존한 채 같은 프로필로 묶었다. enable 조건 연결이 있는 유닛 80개, entity-stats override target 7개, 검증된 전환 모드를 포함하는 유닛 10개다.

## 선택 규칙 및 복합 피해

- CA engine schema는 classic artillery와 crewless war machine의 참조를 구별한다. 본체/엔진/rider가 다른 경우 최대값·이름·순서로 선택하지 않는다.
- modifier-free 기본 참조에서 enable effect로 추가된 replacement를 적용하지 않는다. conditional raw/effect key는 각각 저장하며 실제 캠페인의 effect 상태는 미측정이다. enable 연결이 없는 junction은 비활성으로 추정하지 않는다.
- `battle_entity_stats_override`는 replacement의 대상 stats다. 대상의 이전 무기를 replacement candidate로 중복 계산하지 않는다.
- 추가 projectile의 서로 다른 shot_type 및 실제 shot display reference를 검증했다. 전환 가능한 별도 공격 방식은 각각 보존하고 피해가 다르면 scalar를 보류한다. default라는 이름만으로 선택하지 않는다.
- direct damage는 한 발의 raw `damage/ap_damage` 그대로다. 폭발, launch 수, volley, burst를 합산하지 않는다. scaling/vortex가 있어도 기본 직격 raw를 승격하되 실제 추가 피해 계산은 보류한다.
- `precursor`와 숨김 플래그는 raw 피해의 존재와 UI 표시를 구분한다. UI 숨김은 raw 수치를 UNKNOWN/0으로 바꾸지 않는다.
- Thunderbarge 두 유닛에 폭발 전용 **3개 활성화별 프로필**이 존재한다. 명시적 직격 `0/0`을 보존하고 `EXPLOSION_ONLY`로 분류했다. Thunderbarge scalar는 여러 동시 무기의 값이 달라 UNKNOWN을 유지한다.

최소 추가 구조는 별도 admission의 `profiles` 배열이다. UnitMissile 숫자 필드나 개인 문서 schema는 확장하지 않았다. profile에는 무기·발사체 key, role/owner/rowId, 활성화 effect, 직격·별도 폭발, projectile_number, shots_per_volley, burst_size/delay, UI shot display와 미측정 UI 값이 있다. Production 상세 화면의 펼침 영역에서 각 프로필을 조회한다.

## 원본 재추출과 독립 검증

| 검증 | 결과 | 의미 |
| --- | --- | --- |
| 기존 17개 기준값 / 68개 raw 필드 | 68/68 MATCH | 기존 정적 admission 회귀 |
| 새 exact-key weapon/projectile 선택 | 714개 전체 row MATCH | 동일 CA snapshot의 fresh raw 재추출 |
| shot enum / shot display 선택 | 25개 row 보존 | 선택 및 UI reference 증거 |
| 새 별도 extractor 표본 | 12개 / 53개 비교 row hash MATCH | 기존 집계 collector와 다른 `traceUnitByMainKey` 경로 |
| 기존 독립 extractor 표본 | 10개 보존 및 회귀 PASS | 1차 raw 검증 보존 |
| 실제 게임 카드 신규 실측 | **0개** | 게임 프로세스 미실행, gameExecuted=false |
| 새 UI 선택 프로필 / 표시 피해 | 전부 null | 실측으로 오인할 값 없음 |

같은 CA pack을 사용하는 두 extractor는 원본 재현성 검증이며 독립 게임 카드 관측이 아니다. CA가 생성한 CCO 문서 미러에서 직격·폭발·발사 수의 별도 context, 카드 `StatList/StatContextFromKey`, 현재 `ActiveProjectileContext` API를 조사했다. 문서만으로 mounted 카드 우선순위나 집계 위력 공식을 주장하지 않았다. 참고 링크와 해석 한계는 RULES.md에 있다.

Thunderbarge trace의 능력 관련 projectile/explosion 2개 row는 정규 무기 catalog 밖의 자료다. 원본 trace에 보존하고 report.rawComparisons.outsideScope로 명시했다. 비교 가능한 row의 drift를 이 예외로 숨기지 않는다.

과거 Helstorm wiki Strength 339 / current reload 15.3은 버전·보정 상태 미기록이므로 comparison-only다. 이번 저장은 raw direct **30/70**, range **480**, raw base reload **17**이다. 기본 폭발 **22/51**과 conditional 폭발 **35/55**, volley **3**, burst **1**은 별도 프로필이다. 직격+폭발 또는 ×volley를 scalar 직격 피해로 쓰지 않는다.

## 남은 보류

**피해 보류 50개**:

- 동시 소유 무기 피해 불일치 25개: Necrofex, Dread Saurian, Steam Tank, Land Ship, Stegadon/Bastiladon, Iron Daemon+Dreadquake, Thunderbarge, Sky Junk 등. 실제 기본 카드 선택 및 동시 무기 집계 미측정.
- activation 미확정 junction 22개: 일부 Skaven runners, Huntsmen, Greenskin archers, Dwarf artillery, Reaper Bolt Thrower, Norsca javelin 계열. effect enable 연결이 없는 junction의 기본 활성 상태·script 경로 불명.
- 검증된 전환 모드 피해 불일치 3개: `wh3_dlc23_chd_veh_deathshrieker_rocket_launcher`, `wh2_main_hef_art_eagle_claw_bolt_thrower`, `wh3_dlc27_hef_veh_skycutter_bolt_thrower`.

피해가 확인되었으나 기존 range/baseTime만 보류된 유닛 **13개**를 포함해 전체 scalar 보류는 **63개**다. 정확한 모든 main/land/weapon/projectile key, 활성화 및 차단 원인은 AUDIT.md와 report.json. 남은 scaling/vortex 구성요소도 raw key별로 AUDIT.md에 기록했다.

## 변경 파일과 provenance

- `src/data/unitMissileDamageAdmissions.json`: 새 피해 저장 overlay, 222개 admission / 509개 프로필. 1차 overlay hash와 report SHA256 연결.
- `src/repositories/unitMissiles.ts`: 두 slice 적용, effective status/profiles/provenance accessor, 기존 exact inverse 및 identity guard 유지.
- `src/components/UnitMissileDetails.tsx`, `UnitProductionDetails.tsx`: 직격·폭발·발사 수·각 무기 프로필을 분리 표시; 실제 UI 미측정 안내; 긴 raw key 줄바꿈.
- `scripts/promote-unit-missile-damage.mjs`: 원본 pin / 정적 데이터 validation / deterministic report·admission·문서 replay.
- `scripts/audit-unit-data.mjs`, `check-data.mjs`, `test.mjs`: 실제 effective 저장 coverage 감사와 새 slice gate.
- `tests/unit-missile-damage.test.cjs`: 새 구조·선택·미확인/0·프로필/UI/provenance/불변성 검증 12개.
- `tests/unit-missiles.test.cjs`, `unit-recruitment.test.cjs`: 현재 Production coverage의 기대값 업데이트; 기존 1차 규칙·정적 baseline 검증은 유지.
- `tools/wh3-importer/missile-damage/collect.mjs`, `collect-validation.mjs`, `representatives.json`: 보류 key를 재사용한 fresh UI/weapon 선택과 별도 extractor 수집.
- 같은 폴더의 `predict.mjs`, `rules.mjs`, `report.mjs`: 이름별 하드코딩 없는 구조 규칙 / 엄격한 원본 hash / 재현 가능한 보고서.
- `manifest.json`, `selection.source.json`, `validation.source.json`, `report.json`, `RULES.md`, `AUDIT.md`, `VALIDATION.md`: lossless raw/schema/pack/path/key/coverage와 해석·검증 결과.

1차 lossless catalog는 재사용하며 재작성하지 않았다. 새 source는 CA db.pack/local_en.pack 및 schema snapshot과 동일성을 확인했다. `report.json.comparisons`는 222개 유닛의 raw 직격·폭발·launch/volley/burst·선택 후보·UI null·Production 저장값을 나란히 보존한다.

사격 이외 Unit 필드의 exact inverse 회귀 PASS. HP 986, entity count 1,071, speed 908, 저항 5×1,110, 한국어 이름 1,110, Attribute 1,107, Passive 1,105, roster 23 COMPLETE 유지. 능력 사전 446종, 클릭 상세 패널, 독립 문서와 기존 Character identity, 개인 문서·즐겨찾기·검색·백업 검증도 PASS. 기존 `src/data`, ability-dictionary 자료 및 docs는 기준 commit과 byte-equivalent.

## 명령·빌드·화면 검증

| 명령 / 검사 | 결과 |
| --- | --- |
| `node --test tests/unit-missile-damage.test.cjs tests/unit-missiles.test.cjs` | 26/26 PASS (최종 source 재컴파일) |
| `npm test` | 831/831 PASS: 현재 앱 208 + historical 623; fail/skip 0 |
| `npm run check:data` | PASS: 현재 모든 slice gate + 17 historical replay, 보호된 evidence 보존 |
| `npm run build` | PASS: TypeScript + Vite, 139 modules |
| `npm run check:pages` | PASS: 8 route/query/hash 왕복, bounded same-origin 및 built assets |
| `git diff --check` | PASS |
| Production 브라우저 | 4개 사격 표본 PASS, 능력 dialog/독립 문서 PASS, error log 0 |

최초 sandbox 실행에서는 Vite realpath와 기존 evidence-view junction 생성이 EPERM으로 차단되었다. 동일 명령을 로컬 권한으로 실행해 위 최종 결과를 얻었다. 전체 테스트 중 모집 테스트의 오래된 사격 coverage 기대값 1개도 현재 상태로 갱신한 뒤 전체 재실행했다.

최종 JS 18,399.38 kB / gzip 1,522.11 kB. 기존 Vite 대형 chunk 경고는 남아 있으며 build 오류는 없다. 이번 범위에서 bundle 구조를 변경하지 않았다.

브라우저는 최종 build의 로컬 preview를 사용했다. Helstorm scalar와 별도 폭발/volley, Eagle Claw 두 모드와 scalar 미확인, Thunderbarge 폭발 전용 0/0과 UNKNOWN, Empire Spearmen의 N/A를 확인했다. 공통 능력 `은신 (숲)` dialog와 독립 능력 문서도 확인했다. 이 검사는 전쟁서고 Production UI이며 실제 게임 카드 실측으로 집계하지 않는다. 임시 탭은 닫았다.

실행 로그·화면 증거: ignored `generated/wh3/missile/damage-{targeted-tests,full-tests,check-data,build,pages,replay}.log`, `damage-ui-helstorm.png`. 최종 commit만 수행하고 push하지 않는다.
