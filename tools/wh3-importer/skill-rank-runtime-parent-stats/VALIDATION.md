# Parent-details canonical extraction validation

기준: `b61c19a6ec352b4d8fe2cb377b45d7d619f1e305`. 검증일: 2026-10-05.

| 확인 | 결과 |
|---|---|
| 실제 Desktop 1150 원본 | PASS — 336,250 bytes / 3004행 / 1 capture / rank 0/0 |
| Parent scalar 경로 | OBSERVED — 14 Key/Value 쌍 정상 / 14 At handles NULL |
| 새 canonical probe의 첫 게임 capture | NOT_OBSERVED — 준비된 bundle로 F9 1회 필요 |
| Canonical Lua/CLI 회귀 | PASS 13/13 |
| `npm test` 첫 실행 | 603/604 PASS — 기존 installer 1개가 실행 중인 Warhammer3를 감지해 실패 |
| `npm run build` | PASS — 기존 Vite 500 kB chunk 경고 유지 |
| 기존 Skill/Research 13 replay | 모두 PASS |
| self-scope / resistance / rank-runtime replay | 모두 PASS |
| 기존 stat-fix / stat-items replay | 모두 PASS |
| 신규 parent-stats replay | PASS — 기존 564개 파일 byte hash 및 원본 excerpt 보존 |
| Browser smoke | 수행하지 않음 — UI/Production 변경 0 |

전체 suite의 유일한 실패는 `Windows installer backs up and restores the existing script; changed probe fails closed`다.
기존 installer의 `Get-Process Warhammer3` 안전장치를 바꾸지 않았다.
게임 종료를 요청했으며 이 회귀의 완료 검증은 종료 확인 후 필요하다. 전체 test PASS로 보고하지 않는다.
실제 게임을 자동 종료하거나 실제 게임 파일을 변경하지 않았다.

새 Lua 테스트는 실제 1150의 identity/값을 기준으로 한 **in-memory mock graph**다.
At context와 StatContextFromKey가 NULL이어도 parent Key/Value로 canonical COMPLETE가 되는 것을 확인했다.
7가지 row 순환 위치, 각 rank에서 달라지는 index, 실제 VALUE 0, 요청/비요청 중복 key, 누락 key,
NULL/UNSUPPORTED/nonfinite Value, 잘못된 size를 검증했다. invalid는 모든 observation을 격리한다.
parent source와 canonical Key/Value/index/query 연결을 독립 검증하며 위조 값/ValueBase/query/index를 거부했다.
기존 owner/rank/roster/force/traits/ancillaries를 그대로 유지하고 context/direct lookup diagnostics를 보존했다.
두 8-frame 모델은 기존 resolver를 재사용하여 검토 전 D, productionEligible=false를 유지했다.
이는 새 game rank 관찰이 아니며 실험 의미론을 증명하지 않는다.

baseline CLI는 실제 1150의 exact identity와 실측 rank-0 값에 대조한다.
stats COMPLETE와 trial readiness를 구분하고 stance-preview guard를 유지한다.
`IsPreviewingStance=true`가 남으면 CANONICAL_COMPLETE_CONTROL_BLOCKED이며 8-capture 진행은 차단한다.
raw copies, parsed frames 및 canonical/source query provenance가 보존된다.
이전 UNAVAILABLE capture를 새 CAPTURED로 소급 변경하지 않았다.

기존 파일 변경 0. Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 /
admitted Skill 3 / Skill 226·434·840 / historical owner/selector/rank/self-scope/resistance/runtime /
Modifier / IndexedDB / backup / comparison을 보존했다. 새로운 schema/model/admission 0.
Multi-rank UNKNOWN 유지. 게임 설치/조작 및 push 없음.
