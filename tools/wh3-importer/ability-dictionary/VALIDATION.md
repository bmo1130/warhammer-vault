# 공통 능력 사전 구현 및 검증

검증일: 2026-10-09. 기준 commit `e9b1f2e`. CA 9.0.2.0 원본 자료를 연결한 Production 공통 사전이며, 게임 전투 카드의 직접 실측은 수행하지 않았다.

## 결과

| 분류 | canonical | 공식 한국어 설명 | 수치 효과 | 구조화 조건 |
|---|---:|---:|---:|---:|
| Attribute | 50 | 50 | 0 | 0 |
| Passive | 252 | 252 | 219 | 174 |
| Active | 93 | 93 | 40 | 44 |
| Toggle | 10 | 10 | 10 | 0 |
| Bound | 41 | 41 | 21 | 17 |
| 합계 | 446 | 446 | 290 | 235 |

공식 영어 설명만 확보한 능력 0, 이름만 확보한 능력 0. 클릭 대상 446, 독립 상세 문서 대상 446. Attribute의 발동 조건은 공식 설명 본문에 포함되지만 구조화 flag 수에 포함하지 않았다. 수치 효과는 비영 원본 phase 효과가 확인된 능력 수이며 최종 전투 스탯의 계산 완료 수가 아니다. 공식 툴팁에 배경 문구만 있는 경우에도 별도의 phase 수치와 조건을 제공한다.

기존 identity 및 admission을 재사용한다. 이름이 같은 서로 다른 identity를 합치지 않는다. 기존 registry의 culture-only active `wh3_dlc29_unit_abilities_stormfiend_seismic_snare`는 Production 기본 보유 유닛이 없어 446종에 포함하지 않았다.

전체 전투 메커니즘은 PARTIAL, 현재 발동 상태는 NOT_EVALUATED. 설명을 모두 연결한 뒤에도 319개 canonical / 320개 raw key에 342개 보류 사유가 남았다. 원본 stat 보정의 최종 표시 단위·부호, intensity 계산, behaviour·formation·bombardment·spawned unit·vortex·projectile 등 외부 참조를 계산하지 않는다. Guardian의 기존 alias에 다른 공식 툴팁이 존재하는 경우 identity를 변경하지 않고 원문 차이를 보류로 기록했다. 정확한 raw key별 사유는 [AUDIT.md](AUDIT.md)에 전부 열거했다.

## 원본과 교차검증

`db.pack`, `local_kr.pack`, `local_en.pack` metadata와 기존 세 ability source snapshot이 일치하는지 확인했다. 추가 수집 자료는 96 DB rows / 3,153 Loc rows. 원본 evidenceHash SHA256: `b9ac104e16a8977a35ba536a0e524152d54f7ab8fee42443c1cd9d8d3e04e24d`.

우선 검증한 4개 특성 및 3개 지속 능력의 16개 DB records를 별도로 재조회하여 기존 자료와 exact 비교했다. 공포 유발, 돌격 방어 전문가, 은신(숲), 언데드의 공식 한국어 설명 및 text replacement를 연결했다. 재생의 `heal_amount=0.001`은 최대 HP 0.1% / 1초, 부활 false. 붕괴의 피해는 개체당 28 HP / 1초 / 최대 1개체, 분해는 개체당 133 HP / 0.2초 / 최대 5개체이며 각각 별도의 자동 해제 flag를 보존한다. 총 피해 또는 DPS를 합산하지 않는다. raw → expected/actual 세부표는 [AUDIT.md](AUDIT.md)에 있다.

회복 비율 해석은 [CA 생성 CCO API 문서의 커뮤니티 미러](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html#CcoSpecialAbilityPhaseRecord)와 교차 확인했다. 문서 버전이 9.0.2로 고정되지 않았으므로 설치 raw 검증과 구분한다. 같은 source를 다른 경로로 재조회한 검증이며, 독립적인 실제 게임 UI 측정 표본을 확보했다고 주장하지 않는다.

## 실제 Production UI

Vite Production build의 preview를 CUA in-app browser에서 검사했다. 데스크톱 1280×720, 모바일 390×844 및 320×740에서 능력 선택 → 설명 표시 → ESC/닫기 → 포커스 복귀 → 다음 능력 선택을 검증했다. 우선 표본 7종과 Active/Toggle/Bound 표본을 포함한 38개 flow records 모두 PASS. Enter 열기, Tab의 native modal 내부 포커스 유지, 한 개의 열린 dialog, 화면·dialog의 가로 넘침 없음, viewport 안의 panel 크기, 독립 문서 이동 후 modal 제거 및 동일 효과 표시를 확인했다. 마지막 build에서 데스크톱 및 390px의 우선 7종을 재확인했다. 브라우저 console error 0.

추가 분류 표본: 천상의 유성(전쟁 나침반, Bound), 랜스(성배 기사, Toggle), 태양룡 숨결(태양룡, Active). 공식 설명·사용 조건·단계와 외부 효과 보류 상태를 확인했다. 사용자 개인 저장 영역에는 입력하거나 변경하지 않았다. 검증용 탭을 닫고 viewport override를 원복했다.

재현 흐름: [ui-check.mjs](ui-check.mjs). 결과 및 화면은 ignored `generated/wh3/ability-dictionary/ui-results.json`, `desktop-regeneration.png`, `mobile-regeneration.png`에 보관했다. CUA에서 동일 검증 코드를 직접 실행했으며 별도의 브라우저 자동화 드라이버를 사용하지 않았다.

## 테스트 및 빌드

- 능력 사전·기존 active 관련 테스트: 29 PASS.
- 최종 `npm test`: 819 PASS (현재 코드 196 + historical 회귀 623), 실패·skip 0. 전체 실행에서도 Windows 설치 검사 PASS.
- 기존 Windows 임시 설치 테스트: 게임 종료 후 1 PASS. 실제 게임 파일 변경 없음.
- `npm run check`: 2회 PASS. 각 회차의 현재 data gate 및 17개 historical replay PASS.
- `npm run build`: PASS, 138 modules. 기존 대형 bundle에 대한 Vite chunk-size 경고는 남아 있다.
- Pages 배포 경로: 8개 route/query/hash roundtrip PASS, 독립 능력 문서 포함.
- 최종 schema FK assertion 및 source/사전 replay: PASS.
- `git diff --check`: PASS.

## 회귀 보존

`manifest.json`의 SHA256(UTF-8 CRLF→LF 정규화)으로 기존 모든 src/data JSON과 세 ability source/admission을 고정했다. 유닛 1,110개, 한국어명, Attribute/Passive/Active/Bound 보유와 identity, HP 986, 개체 수 1,071, Speed 908, 저항·사격·모집 출처, 23종족 roster, Character canonical/alias를 변경하지 않았다. 검색·IME, 개인 문서·즐겨찾기·최근 기록의 코드 및 저장 contract를 변경하지 않았다. 새 sidecar에만 공통 상세 설명을 저장한다.

## 변경 파일과 provenance

- `src/data/abilityDictionary.json`: 446개 공통 상세 데이터, canonical ID/raw keys/Loc row IDs/phase row IDs/source 및 pack SHA256. 유닛별 설명 복제 없음.
- `tools/wh3-importer/ability-dictionary/{collect.mjs,source.json,manifest.json,reference.json,rules.mjs}`: 추가 raw 조회, schema/reference 확인, 보호된 입력, 일반 추출·변환 규칙.
- `tools/wh3-importer/ability-dictionary/{AUDIT.md,RULES.md,VALIDATION.md,ui-check.mjs}`: 전체 설명 coverage, 우선 expected/actual, held raw keys, 의미·제한, UI 검증.
- `scripts/promote-ability-dictionary.mjs`: deterministic projection/audit replay 및 보호된 데이터 검증.
- `src/domain/ability.ts`, `src/repositories/abilityDictionary.ts`: 안정적인 identity와 공유 조회/문서 경로.
- `src/components/{AbilityButton.tsx,AbilityDetails.tsx}`: native dialog와 공통 상세 renderer, 공식 설명·수치·조건·시간·대상·출처·검증 상태.
- `src/pages/AbilityPage.tsx`, `src/App.tsx`: 동일 데이터의 독립 문서 `/abilities/:id`.
- `src/components/{UnitProductionDetails.tsx,UnitActiveDetails.tsx}`, `src/style.css`: 공통 클릭 항목, 모바일 상세 패널, 접근성 및 간결한 목록.
- `tests/ability-dictionary.test.cjs`: 14개 검증, 1,110개 유닛 SSR 목록 및 description/source/alias/phase/condition/schema/회귀 보존.
- `tests/unit-actives.test.cjs`: 조건 설명의 공통 상세 이동 검증, 새 sidecar만 기존 데이터 guard의 허용 범위에 추가.
- `scripts/{test.mjs,check-data.mjs,check-pages.mjs}`: 기존 검증을 유지하며 사전 replay 및 상세 문서 경로 추가.
