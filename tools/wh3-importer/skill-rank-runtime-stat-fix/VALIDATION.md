# Stat capture correction validation

기준: `6dd11ee45d0a6aa35681cbe81a511b2066761590`. 검증일: 2026-10-05.

| 확인 | 결과 |
|---|---|
| 실제 관련 `1045` 원본 분석 | 4 UNAVAILABLE captures / Low-Born 0/1/2/3 / owner+roster 유지 |
| 요청한 `1047` 원본 | NOT_AVAILABLE — Worshippers 사용자 보고를 원본 관찰로 변환하지 않음 |
| 새 probe 실게임 실행 | NOT_OBSERVED |
| 신규 Lua/CLI 회귀 | PASS 9/9 |
| 새 failure-evidence/preservation replay | PASS / 기존 546 파일 byte hash 보존 |
| 기존 Skill/Research 13 replay | 모두 PASS |
| 기존 runtime-resolution replay | PASS / 과거 UNKNOWN artifact 유지 |
| self-scope audit replay | PASS / 기존 판정 C, admission 0 |
| resistance research replay | PASS / 기존 판정 E, admission 0 |
| `npm test` | PASS 585/585, fail/skip 0 |
| `npm run build` | PASS / 기존 Vite 500 kB chunk 경고 유지 |
| Browser / 320px | 수행하지 않음 — UI/Production 변경 없음 |

실제 Lua mock에서 기존 `StatList.Size` 접근 오류와 `exec.lua` assertion을 재현했다.
수정된 동일 collector가 direct stat lookup으로 capture를 생성하며 owner/skills/force/roster/selection/
traits/ancillary 출력을 그대로 유지했다. 실제 0은 VALUE 0으로 남고 missing 값은 UNSUPPORTED다.
missing details/stat/value, 잘못된 stat key 또는 Unit details identity는 diagnostics를 보존하면서 격리했다.
두 모델의 8-capture mock은 기존 rank resolver와 source query 검증을 통과하고 검토 전 D를 유지했다.
CLI prepare/bind/ingest는 raw bytes 보존, output overwrite 거부, wrong revision 격리를 통과했다.
이는 API 접근 실패 회귀 검증이며 게임 수치나 의미론의 증명이 아니다.

실제 1045 파일의 probe 줄은 원래 CRLF를 보존하며 directory .gitattributes로 Git text 변환을 금지했다.
전체 외부 로그의 hash+원래 줄 번호와 canonical frame hash는 failure-analysis에 기록했다.
새 replay는 excerpt/analysis hash 및 owner/rank/roster 원문 일치를 확인한다.
1047 부재 때문에 정확한 실패 subexpression은 미확정이다. UI ExpressionState 의존성은 문서 기반 가설이며,
새 capture에서 detailsAccess/statScan.size/각 stat access를 읽어 구분해야 한다.

Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 / 기존 admitted Skill 3 /
inventory 226·434·840을 보존했다. app/model/Modifier/IndexedDB/backup/comparison 변경 0.
기존 역사 artifact 변경 0. multi-rank UNKNOWN 유지. 실제 game 파일 설치/수정, game 실행, push 없음.
