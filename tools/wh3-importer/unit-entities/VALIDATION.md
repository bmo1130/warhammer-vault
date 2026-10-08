# HP/entity category rules validation

2026-10-08 · Asia/Seoul · baseline 129f55f.

| Check | Result |
| --- | --- |
| 관련 HP/entity regression | PASS 15/15 |
| npm test · current app | PASS 118/118 |
| npm test · isolated historical evidence | PASS 623/623 |
| npm test · total | PASS 741/741, failures 0, skipped 0 |
| npm run check:data | PASS: live admission/projection + 17 historical replays |
| npm run build | PASS: TypeScript + Vite production build |
| npm run check:pages | PASS: 7 route/query/hash roundtrips and asset checks |
| git diff --cached --check | PASS |
| Production data audit | count 1071 / HP 986 / per-entity HP 0 |
| Preserved data audit | Korean names 1110 / race COMPLETE roster 23 |

13개 fixture의 count와 total HP를 모두 재현했다. 기존 13개 direct/exact-profile HP admission과 원본 데이터의 값은 유지했다. 전체 tests는 118개의 현재 앱 테스트와 623개의 격리된 과거 증거 테스트를 각각 실행했다.

변경된 HP 계산은 비교 및 수동 계산기에서도 전달된다. 아직 total HP가 UNKNOWN인 Steam Tank 표본에서는 UNKNOWN이 유지된다. category 범위 밖 cardinality, 누락된 정확한 HP join, component HP equality 변화, 잘못된 unit size/source pin, 비정수/음수/overflow는 승격을 거부한다. 정확히 적용한 overlay만 역변환하여 shared identity guard가 변경된 HP/count를 숨기지 못하게 했다.

독립 raw MEDIUM capture 교차검증: Necrofex Colossus 1 / 9507, Free Company Militia 60 / 3660. 각 identity의 세 frame 모두 계산값과 일치했다. 반복 frame을 별도 identity나 독립 session으로 집계하지 않았다. 로그 원본 byte SHA256은 rules-manifest.json에 고정했다. 훈련값 13개나 Ultra scaling에 이 MEDIUM 측정을 추가하지 않았다. 미기록 mod/rank/effect setup 때문에 추가 corroboration으로만 사용한다.

전체 검사에 필요한 Windows junction은 저장소 내부 격리 디렉터리에만 생성했다. 기존 임시 폴더 installer test의 game-process guard는 게임 종료 후 그대로 통과했다. installer/게임 파일/다른 slice 규칙은 수정하지 않았다.

검토 자료: [RULES.md](RULES.md), [rules-report.json](rules-report.json), [ground-truth.json](ground-truth.json). 모든 계산/문서/Production projection은 scripts/promote-unit-hp-entity-rules.mjs --check에서 재생된다.

요청에 따라 로컬 commit만 생성하고 push하지 않는다. commit ID는 완료 메시지에 기록한다.
