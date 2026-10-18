# 브레토니아 건물 위키 · 18개 단계 보완

`/buildings`에서 공식 한국어 건물명·건설 비용·기본 턴을 탐색하고,
`/buildings/<exact CA building key>`에서 수입·전체 건물 효과·모집 유닛을 확인한다.
홈 검색, 브레토니아 팩션의 건물 탭, 유닛 상세의 역방향 링크를 유지한다.
건물 기본 정보가 상세 최상단에 있고 ID·해시·availability 등은 하단의
**원본 근거 · 상세 건설 조건**에 접혀 있다.

## 고정 범위와 버전

6개 체인 / 18개 exact 건물 key만 다룬다. 전체 브레토니아 건물 inventory가
아니며 지역 특수 건물·랜드마크를 추가하지 않았다.

| 체인 | 건물 단계 수 | CA 단계 | 보존한 모집 행 |
|---|---:|---|---:|
| wh_main_BRETONNIA_barracks | 4 | 0, 1, 2, 3 | 17 |
| wh_main_BRETONNIA_carpenter | 2 | 0, 1 | 3 |
| wh_main_BRETONNIA_farm_basic | 3 | 0, 1, 2 | 10 |
| wh_main_BRETONNIA_farm_extra | 2 | 0, 1 | 0 |
| wh_main_BRETONNIA_stables | 5 | 0, 1, 2, 3, 4 | 26 |
| wh_main_BRETONNIA_worship | 2 | 1, 2 | 5 |

CA 단계와 주건물 요구 단계는 별개다. +1을 하거나 Tier로 환산하지 않는다.
worship 단계 0은 기존 범위에 없으므로 만들지 않는다.

처음 확인한 기존 원본은 9.0.2.0이며 building_levels의 비용·턴은 보존되어
있었지만 이 18개 건물의 한국어 이름·전체 효과 원본은 없었다. 설치된 게임은
9.0.4.0이고 DB/Loc 해시도 달랐다. **사용자가 9.0.4.0 사용을 명시적으로
허용한 뒤**, 건물 정보만 해당 버전에서 새로 추출했다. 기존 Production과 모집
자료는 9.0.2.0으로 유지하며 UI에서도 두 버전을 구분한다. 비용·턴은 두
버전의 보존된 exact 행과 18개 모두 일치한다. 과거 전체 효과는 확보되지
않았으므로 효과까지 버전 간 동일하다고 주장하지 않는다.

## Coverage

| 필드 | 확인 | 보류 | 근거 |
|---|---:|---:|---|
| 공식 한국어 건물명 | 18 | 0 | exact 문화 variant + CA local_kr Loc |
| 건설 비용 | 18 | 0 | building_levels.create_cost |
| 기본 건설 턴 | 18 | 0 | building_levels.create_time |
| 전체 건물 효과 목록 | 18 | 0 | building_effects_junction exact 역방향 전체 조회 |
| 수입 효과 / 확인된 직접 수입 없음 | 18 | 0 | 효과 전체 목록 + 검토한 income bonus mapping |

효과 행은 **42개**, effect 정의는 **20개**, scope 정의는 **12개**다.
5개 경제 건물에 정액/증감 수입 효과 7행이 있다. 나머지 13개는 이번 완결된
직접 건물 효과 목록에 수입 행이 없다는 뜻이다. 현재 캠페인의 수입 0을
확정한 것이 아니다.

20개 effect의 공식 한국어 Loc을 모두 확보했다. 그중 2개 정의는 CA가
`[HIDDEN]`으로만 제공하는 숨김 효과이며 총 3행에 해당한다. 이 행들도 삭제하지
않고 별도의 접힌 목록에 원본 값과 scope를 표시한다.

Scope의 공식 한국어 Loc은 12개 중 7개만 있다. 나머지 5개는 **공식 범위 문구
미확인**으로 admission에 사유를 남겼다. 이 경우 검증된 scope DB의
location/ownership/target 구조를 검토한 서고 표시명으로 범위를 안내한다.
건물명이나 공식 효과 문구를 임의 번역한 것은 아니다.

## 실제 값과 표시 계약

| 공식 건물명 | 비용 | 기본 턴 | 수입 / 대표 효과 |
|---|---:|---:|---|
| 평지 | 500 골드 | 1 | 정액 수입 300 골드 · 이 건물 |
| 농장 | 1,000 골드 | 2 | 정액 수입 450 골드; 산업 수입 −50% · 자신의 지역 |
| 영토 | 1,500 골드 | 3 | 정액 수입 600 골드; 산업 수입 −100% · 자신의 지역 |
| 풍차 | 1,500 골드 | 2 | 농장 수입 +25% · 자신의 지역; 성장 +5; 인접 성장 +2; 지역 모집 제한 +1 |
| 물레방아 | 2,000 골드 | 3 | 농장 수입 +50% · 자신의 지역; 성장 +10; 인접 성장 +5; 지역 모집 제한 +2 |
| 왕립 막사 | 4,000 골드 | 4 | 직접 수입 효과 없음; 기존 직접 모집 연결 유지 |
| 공성병기 작업장 | 10,000 골드 | 6 | 수성 중 재장전 시간 감소 +20%; 건설 비용 −10% |
| 왕립 동물원 | 8,000 골드 | 5 | 성전사 모집 해금·한도 효과와 기존 직접 모집 연결 |
| 여제의 대성당 | 10,000 골드 | 6 | 영웅 해금·한도, 오염 감소, 조건부 기사도 등 전체 9행 |

풍차의 +25%는 25골드가 아니며 정액 수입과 합산하지 않는다. 연구·군주·진영·
세금·캠페인 조건을 반영한 최종 수입을 계산하지 않는다. 모집·성장·오염·기사도·
영웅 해금 등 경제 이외의 효과도 전부 표시한다. 기사도에는 실제
`Owner.CultureKey == "wh_main_brt_bretonnia"` 조건을 안내한다.

정상 상태의 value와 손상/폐허 상태의 value_damaged/value_ruined를 분리한다.
표시 우선순위 0의 숨김 효과, 실제 0 값의 농민 경제 표식도 삭제하지 않는다.
공식 문구의 `%n`/`%+n`만 원본 값으로 치환하고 이미지 토큰만 제거한다.
효과를 HTML로 실행하지 않는다.

`UNKNOWN`은 null과 보류 사유로 표현한다. 검증된 0은 숫자 0으로 유지한다.
효과 query가 없으면 빈 효과 목록이나 수입 0으로 승격할 수 없다.

## 원본과 admission 재현

- `tools/wh3-importer/building-wiki/selection.json`: 고정 18개 key.
- `collect.mjs`: 설치된 RPFM 5.1.0 MCP로 CA Release pack을 읽기 전용 조회.
  named processed schema, DB 행·reference edge, 전체 exact selection coverage,
  문화 variant·한국어 Loc·효과 정의·scope·context·basic bonus mapping을 추적.
- `source.json`: 9.0.4.0 **DB 118행 / Loc 45행**과 processed schema·출처·coverage.
- `manifest.json`: 원본 payload hash, 별도 버전 정책, 검토한 scope 표시명과
  정액/percent income mapping. 가상 engine bonus/scope 보조 참조 테이블에
  실제 DB 파일이 없는 경우 source.unavailable에 기록한다.
- `admit.mjs`: source version/hash·exact key·schema/edge·Loc 유일성·전체 효과
  조회를 검사하고 원본 field reference와 coverage를 출력.
- `admission.json`과 새 `src/data/buildingWikiAdmissions.json`: 동일한 projection.
  기존 `unitRecruitmentAdmissions.json`에는 경제 필드를 넣거나 값을 바꾸지 않는다.

```powershell
# 설치본에서 다시 추출: 9.0.4.0 이외 버전은 거부. 승격은 별도 검토가 필요함.
node tools/wh3-importer/building-wiki/collect.mjs
# 게임/RPFM 없이 committed source → admission → UI projection 동일성 검사
node tools/wh3-importer/building-wiki/admit.mjs --check
```

DB/EN snapshot은 `37f8972d127a304b431b18b27dedd4407c07d4e8551da0cc4a6bacad9b67edaf`,
한국어 pack SHA256은
`b8433f8d430c3c97d4db2873e1cacfef5a2ea020587238a70f9ba53b54f84c01`이다.
Korean pack도 source payload hash에 포함한다.

## 보존과 검증

24개 유닛 / 61개 exact 직접 모집 행, 기존 Production·개인 target ID,
IndexedDB·백업 v1 형식을 유지한다. 건물의 표시명만 한국어로 바뀌고 영문명·ID
검색도 유지한다. Vite의 `optimizeDeps.entries = ['index.html']`와 generated/
.test-build 탐색 제외는 변경하지 않았으며 원본과 동일함을 테스트한다.

`tests/building-facts.test.cjs`는 경제·군사·특수 건물의 독립 표본, 18개 Loc,
누락/0/음수 percent, 조건·scope·숨김 효과·상태별 값, admission drift 거부,
핵심 정보와 접힌 근거 영역의 순서를 검사한다. 기존 개인 기록 roundtrip과
원본 데이터 보존 검사는 계속 실행한다.

브라우저 검증: 실제 Google Chrome 창을 발견했지만 Windows Computer Use가
현재 URL을 충분한 신뢰도로 판별할 수 없어 **이번 턴의 UI 자동화를 중단**했다.
Chrome 목록·상세의 시각 검증은 **미완료**이며 테스트 통과로 대체했다고
주장하지 않는다. 이 제한을 우회해 다른 UI 제어 수단을 사용하지 않았다.

전체 실행 결과와 로그: `generated/wh3/building-wiki/` (ignored).

- `npm test`: 현재 앱 **241/241**, 과거 증거 재생 **623/623**, 합계
  **864개 통과**, 실패·skip 0.
- `npm run check:data`: 새 건물 admission, 기존 live admission/projection,
  과거 재생 17개 통과. 보호된 과거 파일 558개도 동일.
- `npm run build`: TypeScript/Vite production build 통과. 기존 대형 데이터
  bundle 크기 경고는 남아 있다.
- `npm run check:pages`: 건물 목록/상세를 포함한 경로/query/hash 10개와
  배포 asset 검사 통과.
- `git diff --check` 통과.

과거 passive 테스트는 시작 커밋의 모든 기존 JSON을 계속 비교하며,
새 `buildingWikiAdmissions.json`만 별도의 admission 검증 대상으로 분리했다.
허용된 신규 파일 외의 파일 추가·기존 데이터 변경은 여전히 거부한다.

Commit/push는 수행하지 않았다. 데이터·코드 검증이 끝났어도 위 Chrome 시각
검증은 별도 미완료 항목으로 남는다.
