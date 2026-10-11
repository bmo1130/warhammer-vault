# 패시브 효과 정보 Production 확충

2026-10-11 · 시작 commit `4186895` · CA evidence 기준 9.0.2.0.

## 작업 전 상태와 범위

현재 브랜치는 `main`, 시작 작업 트리는 clean이었다. `origin/main...HEAD`는
0 behind / 6 ahead였다. 이 비교는 로컬 origin/main ref 기준이며 push/fetch는 수행하지 않았다.
6개 미푸시 커밋과 기존 source/admission을 보존했다. 저장소 루트·상위 경로 및
src/tools/scripts/tests/docs에서 적용할 AGENTS.md는 발견되지 않았다.
README, importer README, UNIT_DATA_AUDIT, UNIT_PASSIVE_ADMISSION,
unit-actives/RULES 및 ability-dictionary/RULES·VALIDATION을 읽었다.

기본 소유권 승격은 작업 전에 이미 완료되어 있었다. 기존 direct membership
1,110 main / 1,072 land / 2,013 junction / 416 raw abilities를 재생하여 확인했다.
기본 목록을 추가할 안전한 후보는 저장된 snapshot에 남아 있지 않았다.
이번에는 기존 목록 안의 **33개 패시브 · 246개 유닛**에서 읽을 수 없던
단계 특성 효과를 CA 공식 한국어 이름·설명 및 부여/제거 의미로 확충했다.
이 숫자는 새 보유 능력을 추가한 수가 아니다.

## 실제 전후 coverage

| 지표 | 시작 상태 | 이번 작업 후 |
|---|---:|---:|
| Production 유닛 | 1,110 | 1,110 |
| 패시브 목록 저장 | 1,105 | 1,105 |
| 하나 이상 보유 | 832 | 832 |
| 확인된 빈 목록 | 273 | 273 |
| 목록 UNKNOWN | 5 | 5 |
| 기본 목록 COMPLETE / PARTIAL | 1,046 / 64 | 1,046 / 64 |
| 보유 canonical / raw passive | 252 / 254 | 252 / 254 |
| 패시브 공식 한국어 설명 | 252 | 252 |
| 패시브 비영 수치 효과 / 구조화 조건 | 219 / 174 | 219 / 174 |
| 단계 특성 효과의 한국어 명칭·설명 연결: 능력 | 0 | 33 |
| 위 효과 정보를 조회할 수 있는 유닛 | 0 | 246 |
| 단계 특성 효과의 한국어 설명 projection | 0 | 37 |
| 설명 연결된 원본 특성 효과 행 / 특성 key | 0 / 0 | 36 / 12 |
| 설명이 미확정인 단계 특성 효과 | 2 | 2 |

37은 표시 projection 수이며 원본 행은 36개다. 야생의 분노 I/II는 동일 phase를
각 능력 문서에서 표시하므로 두 번 센다. 유닛-능력 표시 연결은 308개다.
기존에도 이 효과들의 raw key와 positive/negative는 저장되어 있었다.
한국어 단계 효과명·공식 특성 설명 coverage를 기존 능력 툴팁 coverage와 구분한다.
과거 최초 목록 승격의 5 → 1,105는 [기존 admission 보고서](UNIT_PASSIVE_ADMISSION.md)에 있으며
이번 작업의 신규 수로 계산하지 않았다.

## 검증한 경로와 구현

기존 CA DB → source/evidence → passive review → admission → dictionary Production →
Unit 상세 AbilityButton → AbilityDetails 경로를 그대로 사용했다.
exact main/land/direct junction/raw ability/canonical ID를 기존 admission에서 검증한다.
특성 단계 연결은 `special_ability_phase_attribute_effects.phase` → 해당 passive phase,
`.attribute` → `unit_attributes.key` → 선언된 `bullet_text` Loc이다.
공식 설명의 첫 `||` 앞은 이름, 뒤는 본문으로 해석한다. 한국어 우선·영어 fallback·
양쪽 미확인 원본 표시의 기존 Loc resolver를 재사용한다.

processed schema의 `attribute_type` FK 및 설명은 positive가 특성을 부여하고
negative가 특성을 제거함을 명시한다. 처음부터 다른 효과 유형은 거부한다.
raw value, phase, 관계, 원본 행 및 재귀 Loc row IDs를 보존한다.
효과를 Unit.attributes에 넣지 않으며 activation은 NOT_EVALUATED,
전체 메커니즘은 PARTIAL을 유지한다. 능력의 범위·대상·발동 조건은 기존 panel에 표시된다.

새 [효과 admission](../tools/wh3-importer/passive-effects/admission.json)은 35개 능력의
단계 특성 효과와 exact 소유 유닛 및 근거를 기록한다. 그중 33개가 한국어 본문까지 확인되었다.
`promote-ability-dictionary.mjs --write/--check`가 이 review와 실제 Production JSON을
함께 생성·재검증한다. 새 추출기나 범용 프레임워크는 추가하지 않았다.

## 실제 확충 사례

아래는 이번에 새로 읽을 수 있게 된 효과 정보이며, 소유권 자체는 기존 검증을 유지한다.

| exact 유닛 (CA main key) | 패시브 | 추가 표시 정보 |
|---|---|---|
| 바르가이스트 (`wh_main_vmp_mon_vargheists`) | 광란 | 심리 면역 부여 · 공포/섬뜩함 영향 제외 설명 |
| 악쉬나 매복병 (`wh3_dlc24_ksl_inf_akshina_ambushers`) | 우리의 피로 | 불굴 부여 · 패주하지 않는 특성의 공식 설명 |
| 신전 수호대 (`wh2_main_lzd_inf_temple_guards`) | 신성한 의무 | 공포 유발 및 심리 면역 부여와 각각의 설명 |
| 도살귀 (`wh3_dlc26_kho_mon_slaughterbrute`) | 결속의 룬 | 난동 제거 및 불굴 부여 · 제거/부여를 분리 |
| 메르웜 (`wh3_dlc27_hef_mon_merwyrm`) | 심연의 장막 | 전방위 사격 차단 부여와 공식 설명 |
| 야생 바스틸라돈 (`wh2_main_lzd_mon_bastiladon_0`) | 야생의 분노 I | 난동 부여 · 통제 불가 상태의 공식 설명 |

각 효과는 해당 단계의 target/condition에 적용된다. 현재 활성 상태나 항상 해당 특성이
있음을 주장하지 않는다. 정확한 source row IDs는 효과 admission과 dictionary에 남겼다.

## 보류와 버전 차이

- `silenced` (마술 독기), `cannot_die` (불사의 의지): 저장된 9.0.2.0 source에 exact
  unit_attributes 정의·공식 설명 근거가 없다. 원본 효과 key와 부여 방향만 유지하며
  UI에 `특성 문구 미확인`을 표시한다. 주변 능력의 설명을 복사하지 않는다.
- 기존 hidden 5 raw keys, campaign unlock 5, source_type/passive flag 충돌 2:
  보류 유지. COMPLETE 1,046 / PARTIAL 64 / UNKNOWN 5도 그대로다.
  개별 key·이유는 [기존 보류 표](UNIT_PASSIVE_ADMISSION.md)를 참조한다.
- 투사체·행동·소환·전파·강도 계산은 기존 미완료 상태다. 효과 수치를 만들어 채우지 않는다.
- 실제 RPFM 원본 재조회 시 현재 설치는 **9.0.3.0**이었다. schema SHA는 기존과 같지만
  db.pack SHA는 `3708c82e31759fa6ed5691d5094b435f569b0913cc4f83a7e9553aa2f088f8e7`,
  local_en.pack SHA는 `99bf22c99cfaa7c0ba3d820d4d7675bf044c01e037f493700b9e4c6eaa474827`로
  저장된 9.0.2.0과 달랐다. snapshot 일치 gate가 이를 거부했다.
  새 pack의 소유권/효과를 기존 Production에 혼합하지 않았다. 이번 성공 검증은
  커밋된 9.0.2.0 CA evidence의 offline replay이며 9.0.3.0 게임 UI 실측이 아니다.

## 보존과 변경 파일

`src/data/abilityDictionary.json`의 패시브 효과 정보만 바뀌었다.
나머지 모든 src/data JSON은 시작 commit `4186895`와 줄바꿈 정규화 후 byte equality로 검사한다.
능력 사전의 ATTRIBUTE/ACTIVE/TOGGLE/BOUND 항목 및 기존 summary도 deep equality로 검사한다.
1,110 유닛의 다른 스탯·명칭·속성·로스터, 23종족, 개인 기록의 ID/storage/backup은 보존한다.

- `tools/wh3-importer/ability-dictionary/rules.mjs`: exact 효과 Loc 및 부여/제거 검증
- `scripts/promote-ability-dictionary.mjs`: 기존 승격 명령에 효과 admission replay 추가
- `scripts/audit-unit-data.mjs`: 보유 목록과 분리한 효과 설명 coverage 집계
- `src/data/abilityDictionary.json`: 실제 앱 효과 데이터 확충
- `src/domain/ability.ts`, `src/components/AbilityDetails.tsx`: 효과 이름·설명·부여/제거 표시
- `tools/wh3-importer/passive-effects/admission.json`: 소유권과 효과 근거 및 coverage
- `tools/wh3-importer/ability-dictionary/AUDIT.md`, `RULES.md`: 새 표시 규칙과 보류
- `tests/passive-effects.test.cjs`: provenance·소유권·전 데이터 보존·UI·실패 조건 회귀
- `tests/unit-missile-damage.test.cjs`: 이번에 승인한 dictionary 파일 4개만 과거 byte guard에서 구분하며, 새 회귀의 exact inverse 검사로 모든 기존 패시브 수치·대상·조건도 보존 검증
- README 및 이 보고서

## 검증 결과

관련 테스트 29/29 통과 (새 회귀 4개 포함), 실패/skip 0.

- `npm test`: 현재 앱 227 + historical 623 = **850/850 PASS**, 실패/skip 0.
- `npm run check`: TypeScript + `check:data`의 현재 승격 replay 및 기존 historical replay 17개 PASS.
- `npm run build`: PASS. 기존 큰 bundle의 500 kB 경고는 남아 있으며 구조 개편은 수행하지 않았다.
- `npm run check:pages`: route/query/hash roundtrip **8개 PASS**, built assets 확인.
- `node scripts/audit-unit-data.mjs`: Production 1,110 / Sample 5 / 한국어 이름 1,110 /
  ROSTER COMPLETE 23 / 패시브 목록 1,105 / 보유 832 / 빈 목록 273 / UNKNOWN 5 유지.
  새 `passiveEffects` 집계는 33 능력 / 246 유닛 / 37 표시 효과 / 12 특성 key / 설명 보류 2.
- Production build를 실제 CUA 브라우저에서 열어 위 대표 유닛 6개의 패시브 버튼과
  한국어 효과 본문을 모두 확인했다. 도살귀에서 ESC 닫기·포커스 복귀,
  320×740 모바일 panel(가로 넘침 없음, focus containment), 독립 능력 문서의
  동일 효과 표시 및 modal 해제를 확인했다. console error 0.
  개인 기록·즐겨찾기에는 입력하지 않았다. 모바일 viewport override는 원복했다.

초기 전체 검사에서 sandbox의 기존 evidence-view node_modules junction 생성이
EPERM으로 차단되어 같은 명령을 sandbox 밖에서 재실행했다.
전체 회귀의 과거 byte assertion 한 곳은 승인된 dictionary 확충까지 막았으므로
허용 파일을 4개로 고정하고 새 회귀에서 exact inverse 및 비패시브 deep equality를 검사했다.
해당 변경 후 전체 850개와 모든 최종 명령이 통과했다.

로컬 로그·집계·UI 결과 및 화면은 ignored `generated/wh3/passive-effects/`에 남긴다.
[실제 효과 화면](../generated/wh3/passive-effects/production-runes-of-binding.png) 및
[UI 검사 결과](../generated/wh3/passive-effects/ui-results.json)는 이 작업 PC의 증빙이며
GitHub 배포 artifact로 커밋하지 않는다. 게임의 실제 전투 카드 측정은 수행하지 않았다.
