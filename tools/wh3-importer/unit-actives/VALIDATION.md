# 최종 검증 결과

- 전체 `npm test`: **805 PASS**, 실패 0 (현재 앱·데이터 182 + 보존된 독립 과거 회귀 623). Windows 설치/복원 및 지원 Unit Size 검사도 통과했다.
- 관련 회귀: 능력·특성·지속·사격·모집 **61 PASS**. 최종 귀속 분류 문구/출처 줄바꿈 및 실행 참조 없는 후보의 보류 방어 규칙을 적용한 액티브 테스트 **15 PASS**.
- `npm run check:data`: 새 액티브 gate와 모든 현행 데이터 slice, 17개 과거 replay PASS. 보호된 559개 과거 baseline 파일 유지.
- `node scripts/promote-unit-actives.mjs --check`: 최종 source/schema/표본/기존 input hash 및 admission/projection/보고서 재현 PASS.
- `npm run build`: TypeScript 및 Vite PASS, 132 modules. JS 15,773.94 kB (gzip 1,253.19 kB), CSS 22.13 kB (gzip 5.48 kB). 이전부터 존재하던 500 kB chunk 경고가 남아 있다. 새 registry/projection이 bundle에 추가되며 이번 slice에서 별도 분할 작업은 하지 않았다.
- `npm run check:pages`: route/query/hash 7개 왕복, 경로 경계, 생성 asset 검사 PASS.
- `git diff --check`: PASS.

## 원본 검증

CA 9.0.2.0 / RPFM 5.1.0의 직접 CA Release pack decode를 사용했다. 152개 비지속 후보의 특수 능력 raw row를 이전 source와 대조했고, 14개 대표 유닛을 별도 eq query로 재추출해 main/land/junction/ability/special 및 processed FK를 확인했다. 기존 1,009개 독립 per-unit BFS trace inventory도 expected/actual 일치했다. 이 검증은 게임 UI 카드 실측이 아니다.

실제 처리 결과는 `RULES.md`, 원본 key/type/분류/Production 표시/중복 비교는 `REPRESENTATIVES.md`, 정확한 보류 7유닛/5raw key 및 제외 13key는 `AUDIT.md`에 있다. `admission.json`에 모든 source row ID, raw key, 판정 및 expected/actual 배열을 보존한다.

`ownership-schema.json`은 main/land/mount/campaign mount/custom battle mount/unit variants/visual variants의 schema를 따로 보존한다. 시각적 variant 또는 Character mount 선택 연결이 기본 능력의 자동 상속 근거가 되지 않는다. schema에만 남고 실제 pack에는 없는 deployable junction은 일반 `unit_abilities` 목록으로 추정하지 않는다. 이번 COMPLETE 범위는 검증된 기본 Unit의 native special ability 목록이며 후천 grant·배치 도구·군단/건물 능력·전체 마법 목록은 대상이 아니다.

## Production 브라우저

로컬 최종 빌드, 1265×712 viewport에서 다음 6상태를 확인했다. 모두 의도한 목록/구분/검증 상태를 표시하고 가로 넘침이 없었다.

| 사례 | 실제 유닛 | 결과 |
| --- | --- | --- |
| 토글 | 성배 기사 | 랜스 · TOGGLE · COMPLETE |
| 기본 BOUND | 오행 전침반 | 천상의 유성/벼락 · BOUND 별도 목록 · COMPLETE · 출처 확장 |
| 확인된 빈 목록 | 창병 | 일반 액티브·BOUND 없음 · COMPLETE |
| 조건부 액티브 | 여덟 봉우리 미치광이 | 기본 보유 유지, 생명력/상태 사용 제한 원본 표시 · COMPLETE |
| 미확정 | 거대 스퀴그 | UNKNOWN · 빈 목록으로 표현하지 않음 |
| 일부 보류 | 얼어붙은 겨울 심장 | 정령의 숨결 표시 · 주문 후보 보류 · PARTIAL |

Unit 검색에서 `Celestial Comet`과 `천상의 유성`이 각각 오행 전침반 1개를 반환했다. 콘솔 오류 0개. 기본 보유가 현재 사용 가능 상태라고 표시하지 않는다. 검증용 탭·preview 프로세스를 정리했다.

검증 로그/화면은 ignored `generated/wh3/unit-actives/`의 `full-tests.log`, `regression-tests.log`, `final-related-tests.log`, `check-data.log`, `build.log`, `pages.log`, `final-promotion.log`, `final-audit.json`, `ui-validation.json`, `ui-bound.png`에 남아 있다.

## 회귀 범위

기존 데이터 JSON은 preceding commit `865b04365c3cfaa88b78499226d93e4ae709bf3d`에서 byte 변경이 없다. 새 `unitActiveAdmissions.json`만 추가했다. 전체 Unit의 새 overlay 역변환이 직전 Production 객체와 일치하며, 기존 5개 랜스 목록과 5개 Sample 객체도 보존했다. 공식 한국어 Unit 이름1110/특성1107/지속1105/entity1071/HP986/speed908/5종저항1110/사격·모집 admission/23 COMPLETE roster/Character canonical/alias와 개인 기록·IME 코드는 유지했다. 임의 데이터 변경을 inverse가 숨기지 못하도록 기존 shared diagnostic collision guard와 추가 변조 검사를 통과했다.

완료 시 로컬 commit만 생성하며 push하지 않는다.
