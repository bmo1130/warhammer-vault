# Stance preview diagnostic validation

기준 `5657c86fb75c0b3ec49564861c84a07f5fcc9a6f`, 2026-10-05, Windows/PowerShell.

| 항목 | 결과 |
|---|---|
| 실제 1319 capture 원본/checker 재계산 | PASS — 351,027 bytes / 3163행 / canonical COMPLETE / errors=[] |
| 기존 false gate | 유지 — 1319를 기존 inspectFrame으로 읽으면 Stance preview 때문에 거부 |
| 새 Lua/validator/CLI 회귀 | PASS 19/19 — 5-state 및 선택적 7-state mock |
| 기존 Skill/Research 13 replay | 모두 PASS |
| self-scope / resistance / rank runtime replay | 모두 PASS — 기존 결론/admission 유지 |
| stat-fix / stat-items / parent-stats replay | 모두 PASS — 과거 NOT_OBSERVED/UNAVAILABLE 결론 변경 없음 |
| 신규 stance replay | PASS — 기존 575개 tracked 파일 byte hash, 원본 로그/checker/source 보존 |
| 최종 `npm test` | **622/623 PASS, fail 1, skipped 0** — 아래 기존 installer guard |
| `npm run build` | PASS — 기존 Vite 500 kB chunk 경고 유지 |
| Browser/320px | 해당 없음 — Production/UI/admission 변경 0 |
| 새로운 게임 stance diagnostic | **NOT_OBSERVED** — 첫 F9 필요 |

전체 suite의 유일한 실패는 기존 `Windows installer backs up and restores the existing script; changed probe fails closed`다.
실행 중인 Warhammer3(PID 6572)를 `skill-rank-runtime-resolution/install.ps1:21`이 감지했다.
게임 종료 요청을 보냈으나 최종 확인 시에도 실행 중이었다. 게임을 자동 종료하지 않았고 guard/test를 우회하지 않았다.
종료 상태에서 전체 `npm test` 재실행이 필요하며 **전체 PASS로 보고하지 않는다**.
전체 결과는 ignored `generated/wh3/stance-preview-01/npm-test.log`에 보존했다.

회귀는 실제 1319의 identity/관찰값을 입력으로 사용하는 **in-memory simulated graph**다.
게임에서는 새 CCO parent force scalar / model interface / 미선택 조회의 지원 여부가 아직 미관찰이다.
실제 NULL/UNSUPPORTED는 그대로 저장하고 fail closed한다. mock 성공은 API runtime 의미 증명이 아니다.
기존 owner/skill/roster/force/canonical stats와 diagnostics의 보존, prefix/format 격리,
CQI/owner/Unit/rank/순서/모델 stance/AP/movement/source revision 거부를 확인했다.
flag route 차이, 계속 true, 상태 간 변화, alternative hover 중 stat 변화는 관찰 패턴으로만 기록한다.
기존 gate 해제/8-rank 허가/semantics 승인으로 이어지지 않는다. 계획한 UI label도 자동 검증했다고 주장하지 않는다.

준비한 최소 bundle: `generated/wh3/stance-preview-01/bundle` (총 F9 5회, 먼저 1회 검증).
exec.lua SHA256 `3a9ee1607b618cf96c5bb67535dbab1574cc14f032385fe9c25bd02da7e08ac6`.
기존 installer를 재사용하는 정확한 교체/복원 절차는 README에 있다. 실제 게임 파일 설치는 수행하지 않았다.

최종 현재 판정: flagMeaning UNKNOWN, gate KEEP_EXISTING_FALSE_GATE, trialReady=false,
multi-rank UNKNOWN, productionEligible=false, 신규 admission 0.
Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 / admitted Skill 3 /
inventory 226·434·840 / 기존 Modifier/schema/IndexedDB/backup/comparison/historical evidence는 변경하지 않았다.
새 directory와 테스트/해당 파일의 줄 끝 설정만 추가했다. Push하지 않는다.
