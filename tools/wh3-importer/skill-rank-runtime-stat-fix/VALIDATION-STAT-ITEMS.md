# Seven-item diagnostic validation

기준: `4bd04c314e1eb8f16d88d60c64f8dad3fbab0dd9`. 검증일: 2026-10-05.

| 검증 | 결과 |
|---|---|
| 전달한 Desktop 1132 원본 | PASS — 330,847 bytes / probe 1개 / 3038행 / 0/0 |
| 실제 details / collection size / direct query | 두 CONTEXT / 두 VALUE 7 / 네 query 모두 NULL |
| 실제 7개 항목 내용 | NOT_OBSERVED — 기존 로그가 항목을 기록하지 않음 |
| 새 probe 실게임 실행 | NOT_OBSERVED — 새 첫 0/0 F9 필요 |
| Lua/CLI 회귀 | PASS 15/15 (기존 9 + 신규 6) |
| `npm test` | PASS 591/591, fail/skip 0 |
| `npm run build` | PASS — 기존 500 kB chunk 경고 유지 |
| 신규 stat-items replay | PASS — 원본 capture/hash 및 552개 기존 파일 보존 |
| 기존 stat-fix replay | PASS — 546개 baseline 및 1045 원본 기록 보존 |
| 기존 Skill/Research 13 replay | 모두 PASS |
| self-scope / resistance / rank-runtime replay | 모두 PASS |
| Browser smoke | 수행하지 않음 — UI/Production 변경 0 |

새 mock은 정확히 7개 **테스트 전용** 키/값, NULL인 기존 direct lookup을 제공한다.
실제 Lua 코드가 각 item context와 parent query를 기록하고, 기존 exact-stat gate는 UNAVAILABLE을 유지했다.
첫 item NULL/Value 실패가 있어도 뒤 6개를 계속 수집하고 unknown을 0으로 바꾸지 않았다.
두 Value 경로의 충돌은 PARTIAL, 과도한 size는 수집 거부했다. 새로운 key alias는 도입하지 않았다.
wrong owner/Unit/rank/query/revision은 diagnostic validator에서 REJECTED다.
stance preview는 diagnostic과 분리된 controlIssue로 남고 rankTrialEligible은 항상 false다.
diagnose CLI는 원본 raw bytes를 보존하며 잘못된 identity에도 raw/REJECTED report를 남긴다.
모든 mock은 메모리/임시 test 디렉터리에만 있으며 실제 runtime evidence로 저장하지 않는다.

5개 기존 도구 파일만 수정했다: stat-capture.lua(열거), probe.mjs(진단 revision), cli.mjs(diagnose),
test fixture/회귀, directory .gitattributes(새 raw CRLF 보존). 과거 README/VALIDATION/failure-analysis/manifest/
related-runtime-events와 모든 source/research/app/Modifier 파일을 수정하지 않았다.
새 원본 capture 및 source hash/line/canonical capture hash는 별도 stat-items artifact에 기록했다.
이전 일반적인 StatList 접근 불가 가설은 이번 capture의 원인으로 채택하지 않는다.
실제 키/Value 경로 또는 lookup NULL 원인은 새 항목 진단 로그 전에는 미확정이다.

Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 / admitted Skill 3 /
Skill 226·434·840 보존. self-scope 지원/Character Calculator/rank model/admission 변경 0.
Multi-rank UNKNOWN. 실제 game 파일 설치/수정 및 push 없음.
