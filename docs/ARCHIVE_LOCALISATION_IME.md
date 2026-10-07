# 팩션·캐릭터 한국어 이름 / 유닛 검색 IME

검토 기준: `ba02dee`의 실제 Production과 CA 9.0.2.0, RPFM schema 5.1. `local_kr.pack` SHA-256 `c8c283ed5ef9c8f1ce1a7437731342829a48048180d8890b1cf640fa1721426d`. 이전 보고서 숫자를 복사하지 않고 기존 JSON과 새로운 exact admission을 비교했다.

## Coverage

| 표시 identity 분류 | 전체 | 한국어 before → after | UNKNOWN before → after |
|---|---:|---:|---:|
| 팩션 | 24 | 1 → 24 | 23 → 0 |
| 전설 군주 | 112 | 0 → 112 | 112 → 0 |
| 일반 군주 | 157 | 0 → 157 | 157 → 0 |
| 특수 군주 | 15 | 0 → 15 | 15 → 0 |
| 전설 영웅 | 35 | 0 → 35 | 35 → 0 |
| 일반 영웅 | 156 | 0 → 156 | 156 → 0 |
| 특수 영웅 | 19 | 0 → 19 | 19 → 0 |
| 기존 저장 경로용 군주 | 2 | 0 → 2 | 2 → 0 |
| 기존 저장 경로용 영웅 | 1 | 0 → 1 | 1 → 0 |

총 521개 표시 identity에 신규 exact Korean Loc row 577개를 연결했다. 기존 유닛명 Loc 1,072개와 중복되는 key는 0개다. before의 팩션 1개는 수동 한국어 표시였으며 이번에 공식 `뱀파이어 백작`으로 교정했다. 예전 `뱀파이어 카운트` 검색도 유지한다. 기본 이름의 영어 fallback 잔존 및 번역 보류 목록은 **없음**이다. 영문 검색용 원래 이름, stable ID, subtype, 출처 상세의 원본 키는 의도적으로 유지한다.

## Reference / admission

별도 이름 체계를 만들지 않고 기존 `unit-localisation`의 exact Loc resolver, raw source → admission → 작은 Production overlay 방식을 재사용했다. `promote-archive-localisation.mjs --check`는 설치된 게임 없이 전체 raw source와 기존 roster에서 재현하며 source, schema, pack, 입력 identity와 projection의 변경을 거부한다.

- 프로젝트의 faction은 race/culture catalog identity다. 기존 faction ID → roster catalog `cultureKey` → `cultures_tables.key` → schema의 localised `name` → `cultures_name_<cultureKey>` → exact Korean Loc.
- 캐릭터는 기존 canonical ID → `agent_subtypes_tables.key` → native `associated_unit_override` → `main_units.unit` → native `land_unit` → `land_units.key`를 유지한다.
- 표시 이름 우선순위는 기존 canonical English recipe와 같다. 명시적으로 검토된 이름 포함 모집 안내(노란색 이름 부분), `unique_agents` 이름 부분, subtype의 실제 이름 override, land onscreen name이다. `Legendary Lord/Hero` 분류 문자열은 이름으로 사용하지 않는다. 레거시 경로는 원래 land onscreen name recipe를 유지한다.
- `unique_agents.agent_subtype` native reference와 `forename/surname/other_name/clan_name → names.id`를 검증한다. CA StringU8 decimal reference와 `names.id` I64의 정확하고 안전한 변환을 통해 101개 native target row를 추가로 확보했다. 원래 roster snapshot은 수정하지 않았다.
- 동일 이름 문자열끼리 merge하지 않는다. 기존 15개 subtype alias의 `canonicalId`를 그대로 사용한다. 예: `wh2_dlc13_lzd_slann_mage_priest_beasts_horde` → 기존 `ca_lord_wh2_dlc13_lzd_slann_mage_priest_beasts` → `슬란 법사 사제 (야수)`. 보리스 토드브링거는 land onscreen name, 울리카 마그도바는 unique-agent 이름 부분, 알카자르 2세는 기존 exact 이름 포함 안내 참조다.
- 각 admission은 원래 English name, recipe, native source row와 모든 KR Loc dependency receipt를 보존한다. ID/URL/저장 key에 한국어를 쓰지 않는다.

영웅 20개에서 비어 있는 성/가문 슬롯 때문에 최초 조사에서 이름이 누락된 것처럼 보였다. 다음 12개 key는 English Loc가 **정확히 빈 문자열**이고 Korean Loc row가 없다. 실제 이름의 누락이 아니므로 빈 부분으로만 처리하고 그 사유와 native/English provenance를 기록한다. Korean row가 있는 빈 슬롯은 그것도 그대로 해석한다. Korean-only text가 있으면 버리지 않는다.

`names_name_1451103641`, `names_name_1580933377`, `names_name_1682132102`, `names_name_1896245993`, `names_name_201891974`, `names_name_2147360506`, `names_name_2147360514`, `names_name_2147360732`, `names_name_614972636`, `names_name_621417306`, `names_name_915706158`, `names_name_978618377`.

모든 실제 이름을 만드는 부분은 공식 Korean row로 확인했다. 빈 슬롯 외 공식 이름 Loc가 없어 보류한 항목은 없다.

## IME 원인과 수정

메인 화면과 유닛 탭은 같은 `SearchBox`를 사용했다. 메인은 local state를 동기 갱신하지만 유닛 탭은 `useSearchParams → navigate → BrowserRouter.startTransition → URL-derived value`를 다시 input에 넣었다. 조합 중 controlled value가 지연된 이전 query로 복원될 수 있었고 composition 보호가 없었다. 별도 debounce, onInput, input remount, input 내 trim/lowercase는 없었다. trim/lowercase는 검색 repository에서만 실행된다.

공통 SearchBox의 편집 값은 동기 local draft로 유지한다. `compositionstart/update`와 native `isComposing` 동안 완전한 DOM value를 대체 저장하고 query에 발행하지 않는다. `compositionend`에서 최종값을 발행하고 뒤따르는 동일 onChange를 중복 제거한다. 지연된 URL acknowledgement는 더 최신 draft를 덮지 않는다. 조합이 끝나고 URL이 정착한 후 외부 탐색/뒤로 가기/초기화는 draft에 반영한다. 기존 replace navigation과 필터 query 동기화는 유지했다. 영어·숫자·삭제는 즉시 발행한다.

회귀 테스트는 성배기사 중간값, 음절별 조합, 연속 단어, native composing flag, 마지막 change가 end 전/후에 오는 순서, end 후 중복 event, 지연 URL, 영어/숫자/공백/삭제, 중국어/일본어, 조합 취소와 URL 초기화를 검증한다. normalization은 input 값을 다시 쓰지 않는다.

## 검증

`archive-localisation.test.cjs`는 521개 detail route의 h1과 팩션 label, 전 팩션 roster의 군주/영웅, 메인·팩션 목록·유닛 detail, English/Korean/ID 검색, 동명 별개 ID, 15 alias, 3 legacy 경로, 개인 문서·즐겨찾기·최근 기록 backup 복원을 검사한다. 직전 entity13 commit의 기존 raw 데이터와 admissions는 byte-identical 회귀 기준이다.

`search-composition.test.cjs`는 UI가 사용하는 입력 controller의 실제 이벤트 순서를 검증한다. 브라우저에서는 Production preview의 실제 입력/URL/검색 결과/삭제를 확인한다. 제공되는 브라우저 API에 CompositionEvent dispatch와 OS IME 제어가 없어 **실제 OS IME의 e2e 조합을 자동 재현했다는 주장은 하지 않는다**. handler 이벤트 순서 테스트와 실제 UI smoke를 조합한다.

최종 실행 결과:

- 관련 신규 테스트 11개 PASS, 갱신된 기존 UI/roster/catalog 테스트 24개 PASS. 기존 entity/HP 13개 회귀와 Unit localisation도 전체 테스트에서 PASS.
- `npm test`: 현재 앱 110 + 기존 증거 623 = **733 PASS**, 실패/취소/skip 0.
- `npm run check` → `npm run build` → `npm run check`: 모두 PASS. 두 check 각각 live 이름/entity/passive/attribute/unit-name/roster gates와 17개 기존 evidence replay를 통과했다. 기존 protected 파일 559개는 보존됐다.
- build: TypeScript와 Vite 118 modules PASS. 기존과 같은 500 kB 초과 chunk 경고만 남는다(3,896.27 kB JS / gzip 407.22 kB).
- `npm run check:pages`: route/query/hash 왕복 7개, 같은 origin 복원, built asset 검사 PASS.
- 실제 새 Production build preview에서 팩션 24개 한국어, 제국의 전설/일반 군주·영웅과 특수 영웅 목록, 보리스 상세, 울리카의 3개 소속 팩션 label을 확인했다. 390×844 모바일에서 울리카 이름과 팩션 표시, 유닛 검색·하단 navigation, 가로 넘침 없음을 확인했다.
- `성배기사` 입력의 DOM value와 URL q는 모두 정확히 `성배기사`. 삭제 후 모두 `성배기`, 연속 입력 후 모두 `성배기사 보병`, 전체 삭제 후 value `''`/q 없음. 필터 변경과 다른 페이지에서 뒤로 가기, 검색 초기화도 query/draft를 보존·복원한다.
- CA 공식 이름은 `성배 기사`이다. 기존 literal substring 검색을 바꾸지 않았으므로 `성배기사`의 결과는 0개, `성배 기사`와 기존 `Grail Knights`는 같은 stable Unit 1개다. 입력 버그 수정과 띄어쓰기 검색의 기존 동작을 구분했다.
- 실제 OS IME 조합 e2e는 제공된 API로 실행 불가. CJK composition 중간값과 최종 commit 횟수는 공통 input controller 테스트로 검증했다. 브라우저 smoke는 문자 입력과 UI/URL 동기화 검증이다.

로컬 smoke 화면은 Git에서 제외한 `generated/wh3/archive-search-smoke.jpg`, `archive-search-mobile.jpg`, `archive-hero-mobile.jpg`에 저장했다. 모든 이전 Unit raw/overlay 파일, Character canonical/alias/legacy 파일, roster JSON은 `ba02dee`와 byte-identical이며 새 이름 overlay만 추가했다. 한국어 Unit 1,110, attribute 저장 1,107, passive 저장 1,105, count/HP admission 13, race COMPLETE 23을 유지했다.

## 변경 파일 (27)

- 문서: `README.md`, `docs/ARCHIVE_LOCALISATION_IME.md`
- 실행/검증: `scripts/extract-archive-localisation.mjs`, `scripts/promote-archive-localisation.mjs`, `scripts/test.mjs`, `scripts/check-data.mjs`, `scripts/evidence-view.mjs`
- 출처/승격: `tools/wh3-importer/unit-localisation/archive.mjs`, `archive-source.json`, `archive-admission.json`, `review.mjs`
- Production 표시: `src/data/archiveLocalisations.json`, `src/repositories/archiveLocalisation.ts`, `src/repositories/gameRepository.ts`, `src/components/LocalisationSource.tsx`
- IME: `src/domain/compositionInput.ts`, `src/components/SearchBox.tsx`
- UI label: `src/pages/HomePage.tsx`, `FactionPage.tsx`, `LordPage.tsx`, `HeroPage.tsx`, `CalculatorPage.tsx`
- 테스트: `tests/archive-localisation.test.cjs`, `search-composition.test.cjs`, `app.test.cjs`, `faction-rosters.test.cjs`, `unit-catalog.test.cjs`
