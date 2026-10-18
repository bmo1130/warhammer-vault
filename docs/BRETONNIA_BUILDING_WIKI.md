# 브레토니아 건물 위키 · 첫 bounded slice

`/buildings`에서 목록을, `/buildings/<exact CA building key>`에서 단계별 상세를
표시한다. 홈의 브레토니아 건물 링크·통합 검색·브레토니아 팩션의 건물 탭으로
진입한다. 유닛 상세의 모집 조건에서 이 범위의 건물로 이동하고, 건물에서는
승인된 직접 모집 유닛 상세로 돌아간다.

## 고정 범위

기존 `unitRecruitmentAdmissions.json`의 building registry에 이미 저장된
6개 exact 체인 / 18개 건물 단계만 사용한다. 전체 브레토니아 건물 inventory가
아니다. 범위는 `buildingWikiRepository.ts`의 exact key allowlist로 고정한다.

| CA 체인 | 탐색용 분류명 | 저장된 CA 단계 | 건물 수 | 직접 모집 행 수 |
|---|---|---|---:|---:|
| wh_main_BRETONNIA_barracks | 병영 | 0, 1, 2, 3 | 4 | 17 |
| wh_main_BRETONNIA_carpenter | 목공소 | 0, 1 | 2 | 3 |
| wh_main_BRETONNIA_farm_basic | 농장 | 0, 1, 2 | 3 | 10 |
| wh_main_BRETONNIA_farm_extra | 제분소 | 0, 1 | 2 | 0 |
| wh_main_BRETONNIA_stables | 마구간 | 0, 1, 2, 3, 4 | 5 | 26 |
| wh_main_BRETONNIA_worship | 성배 예배당 | 1, 2 | 2 | 5 |

합계 61개 직접 행 / 중복을 제외한 24개 Production 유닛. 한 유닛이 여러
단계에 명시된 경우 각 행을 유지한다. 영문 단계명은 기존 registry의 CA 이름을
표시하며 새 번역이나 localisation admission을 만들지 않는다. 한국어 체인
분류명은 서고의 탐색용 이름이다.

지역 특수 건물·랜드마크·다른 종족·rogue chain은 이번 범위에서 제외한다.
예를 들어 `wh2_dlc12_special_bordeleaux_manann_shrine_1`은 Bretonnia 문화
variant가 있더라도 자동 편입하지 않는다. worship 단계 0은 registry에 없으므로
만들지 않는다. 비용·건설 시간·건물 효과·전체 건설/승급 트리는 미확인이다.

## 데이터와 연결 계약

- 새로운 게임 데이터 수집·승격·복제 없이 기존 recruitment admission과
  `recruitmentBuilding`을 재사용한다. 확장한 `RecruitmentBuilding` 타입은
  기존 JSON의 availability·정착지·콘텐츠 팩·reference 필드를 그대로 표현한다.
- `unitRecruitmentAdmission(unit)`이 정확히 일치하는 Production만 검사한다.
  exact building ID / chain / CA 단계 / 주건물 요구 단계가 맞고,
  `VERIFIED_DIRECT_SOURCE` requirement와 `BUILDING` source가 같은 source key로
  유일하게 짝지어진 경우만 역방향 연결한다. 원본 조건·진영 key·row ID를 보존한다.
- 군사 그룹·roster 소속·이름 유사성·모집 풀·업그레이드 조건에서 건물 모집을
  추측하지 않는다. 단계 간 모집 상속도 만들지 않는다.
- CA 단계는 0-based chain stage이고 주건물 요구 단계와 별개다. Tier로
  환산하지 않는다. Knights of the Realm은 stables CA 단계 2/3/4의 exact 행만
  연결하며 단계 1에 소급하지 않는다.
- requiredBuildings의 exact 참조는 범위 안이면 링크하고, 범위 밖이면 key를
  유지한다. 선행 조건을 승급 경로로 해석하지 않는다.
- 문화/하위 문화/진영/비활성 variant, availability set의 명시 캠페인 규칙,
  주도시·고유·UI 표식, 자원·지휘관·정착지·콘텐츠 팩 참조를 표시한다.
  빈 조건이나 비활성 표식 없음은 보편적인 건설 허용을 뜻하지 않는다.
- 직접 연결은 `PARTIAL_SOURCE`다. 실제 캠페인 건설 가능 지역, 연구·한도·
  소유 건물·pool 수량·현재 해금·지역/전역 모집 가능성을 판정하지 않는다.
  연결 0개는 현재 승인 자료에 행이 없다는 뜻이며 비모집 확정/N/A가 아니다.
- Snapshot/game version/source hash와 building/source row provenance를 상세에
  유지한다. 기존 모집 source/replay 계약은 변경하지 않는다.

## 개인 기록 보존

건물 target은 이미 허용된 `entityType: building`, exact CA building key를
사용한다. 기존 ArticleEditor·즐겨찾기·최근 항목 hook과 이름 adapter를 재사용한다.
IndexedDB 버전·store·백업 v1·기존 target ID는 변경하지 않는다. 범위 밖 옛
건물 기록은 삭제하거나 새 건물에 자동 연결하지 않는다. 앱 코드와 테스트는
사용자 브라우저의 개인 데이터를 교체하거나 초기화하지 않는다.

## 검증

`tests/building-wiki.test.cjs`에서 고정 범위, 61행/24유닛 역방향 일치,
없는 단계 비추론, admission drift/source 누락·잘못된 identity 거부,
검색/경로/상세 provenance/상호 링크, 연결 0의 미확인 표시와 기존 개인
target의 백업 roundtrip을 확인한다. 기존 `src/data`와 persistence 소스도
Git HEAD와 줄바꿈을 정규화한 뒤 동일함을 검사한다.

2026-10-18 검증 결과:

- `npm test`: 현재 앱 **234 / 234**, 과거 증거 재생 **623 / 623** 통과.
  새 건물 테스트 7개를 포함해 총 **857개**, 실패·skip 0.
- `npm run check:data`: live admission/projection 및 historical replay 17개 통과.
  기존 증거 재생 baseline의 보호 파일 558개도 일치한다.
- `npm run build`: TypeScript 및 Vite production build 통과. 기존 대형
  데이터 번들의 chunk 크기 경고는 남아 있다.
- `npm run check:pages`: 건물 목록과 상세를 포함해 경로/query/hash 10개
  roundtrip과 built asset 검사 통과.
- `git diff --check` 통과. 기존 `src/data`·저장소/백업 구현·target 형식은
  변경하지 않았다.

기존 UI 회귀 테스트는 새 Router 링크를 렌더링하도록 MemoryRouter만 감쌌으며
데이터 기대값은 유지했다. 역사적 증거 앱은 기존 adapter를 그대로 재생하고,
현재 앱의 `archivePresentation.ts`만 기존 evolving UI 목록에 추가했다.

Windows 샌드박스의 native realpath/junction EPERM으로 build/test/check:data는
동일한 명령을 권한 확장으로 실행해 완료했다. 브라우저 localhost 점검은
로딩 시간 초과로 시각 검증을 완료하지 못했다. UI 확인은 실제 App route의
서버 렌더링 테스트이며 모바일 스크린샷 검증을 했다는 뜻은 아니다.
검증 로그는 ignored `generated/mobile-building-wiki-validation/`에 보존한다.
Commit/push는 수행하지 않았다.
