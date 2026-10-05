# Resistance research validation

기준 커밋: `673a243196824c97cf5c9ff1fb634cd7fdb3206d`.
검증일: 2026-10-05, Windows / PowerShell.

| 검증 | 결과 |
| --- | --- |
| Actual bounded extraction | PASS — 동일 game / schema / pack snapshot; 116 rows |
| `node scripts/review-resistance-research.mjs --check-raw` | PASS — raw hash와 committed source/출력 검증 |
| `node --test tests/resistance-research.test.cjs` | PASS — 7 / 7 |
| `node scripts/review-skill-self-scope-audit.mjs` | PASS — C / 596 junction / 신규 admission 0 유지 |
| `node scripts/review-skill-rank-runtime-resolution.mjs` | PASS — 8 states NOT_OBSERVED / E UNKNOWN 유지 |
| 기존 Skill / Research replay | 아래 13개 모두 PASS |
| `npm test` | PASS — 576 / 576, fail / skipped 0 |
| `npm run build` | PASS — TypeScript와 Vite production build |
| Browser smoke / 320px | 해당 없음 — 신규 admission / Production / UI 변경 0 |

`scripts/verify-skill-production-bretonnia.mjs`에서 아래 replay는 모두 통과했다.

1. `review-skill-production-bretonnia`
2. `review-skill-slice-01`
3. `review-skill-batch-01`
4. `review-skill-batch-02`
5. `review-skill-rank-research`
6. `review-skill-owner-research`
7. `review-skill-class-selector-research`
8. `review-bretonnia-research`
9. `classify-bretonnia-research`
10. `scan-bretonnia-research`
11. `review-research-mappings`
12. `review-research-scopes`
13. `admit-bretonnia-research`

전체 suite의 기존 `Windows installer backs up and restores the existing script; changed probe fails closed`
테스트는 처음에 실행 중인 `Warhammer3`를 감지해 575 / 576으로 종료했다.
게임 종료를 요청했고 기존 안전장치나 테스트를 변경하지 않았다. 사용자가 종료했다고 알린 뒤
`npm test`를 다시 실행해 576 / 576 통과했다. Build는 별도로 실행해 통과했다.
기존 500 kB chunk 경고는 남아 있다.

신규 7개 회귀는 exact Skill / owner / rank / scope / effect / target chain, 같은 typed bonus의 비교,
phase의 ADD 선언을 campaign bonus로 전이하지 않는 gate, raw zero와 missing displayed base의 구분,
snapshot / row payload / duplicate / missing reference 거부, 실제 engine의 unknown 보존 및 clamp 부재,
full pipeline feedback와 deterministic output hashes를 확인한다.
Synthetic engine hypotheses는 게임 observation으로 취급하지 않는다.

Replay는 532개 baseline 파일 hash를 확인한다. 기존 데이터 / 연구 / app / engine 파일 변경은 0개다.
Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 / admitted Skill 3 /
full inventory 226·434·840 / self audit / multi-rank UNKNOWN / runtime resolution /
IndexedDB / backup / comparison을 보존한다.

새 source는 112 rows와 기존 source 4 row refs다. 일반 replay는 게임 / RPFM / generated / Git을 요구하지 않는다.
게임 실행, runtime capture, save 또는 실제 game 파일 변경, admission, push를 수행하지 않았다.
