# Self-scope audit validation

기준 커밋: `1e3323b5b49a82c8b2a5911191f0faf99b30ef45`.
검증일: 2026-10-05, Windows / PowerShell.

## 실행 결과

| 검증 | 결과 |
| --- | --- |
| `node scripts/review-skill-self-scope-audit.mjs` | PASS — 596 junction, pinned source에서 6개 출력 재구성 |
| `node scripts/review-skill-self-scope-audit.mjs --check-raw` | PASS — 실제 bounded extraction과 committed identity source hash 일치 |
| `node --test tests/skill-self-scope-audit.test.cjs` | PASS — 9 / 9 |
| `node scripts/review-skill-rank-runtime-resolution.mjs` | PASS — 8개 상태 NOT_OBSERVED, 최종 E / UNKNOWN 유지 |
| 기존 Skill / Research replay | 아래 13개 모두 PASS |
| `npm test` | PASS — 569 / 569, fail / skipped 0 |
| `npm run build` | PASS — TypeScript와 Vite production build |

기존 replay는 `scripts/verify-skill-production-bretonnia.mjs`의 다음 13개 명령으로 실행했다.

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

첫 전체 검증에서 13개 replay는 통과했으나 `npm test`의 기존 installer 회귀가 실행 중인
WARHAMMER III를 감지하여 568 / 569로 종료했다. 기존 안전장치를 변경하지 않았다.
사용자가 저장 후 게임을 종료했다고 알린 뒤 `npm test`를 다시 실행하여 569 / 569 통과했다.
`npm run build`는 별도로 실행해 통과했다. Vite의 기존 500 kB chunk 경고는 남아 있다.
Production / UI 변경이 없으므로 browser smoke는 수행하지 않았다.

## 검증 범위와 한계

신규 회귀는 taxonomy 합계와 junction 중복 방지, strict admission 0과 조건부 whole-Skill tiers,
historical blocker 교집합, exact subtype / mount FK, 잘못된 FK·중복 row·누락 identity 거부,
typed route 분류, `all_units`와 character scope의 분리, bounded next-blocker 조건 및 출력 hash replay를 확인한다.
이 테스트는 게임 runtime semantics를 증명하지 않는다.

기존 515개 파일의 hash를 manifest / replay로 확인했다. Production 101 / Sample 5 / HP 13 /
Speed 81 / Research 10 technologies · 15 effects · 96 modifiers / admitted Skill 3 /
full Skill inventory 226 · 434 · 840과 기존 classifier, owner / selector / rank research,
runtime evidence, IndexedDB, backup, comparison, Modifier engine을 보존했다.

multi-rank observation은 추가하지 않았으며 과거 UNKNOWN artifact를 수정하지 않았다.
Character model / mount model / calculator / stat path / production admission은 구현하지 않았다.
새 identity 자료는 같은 game version / pack / schema snapshot의 read-only DB 자료다.
추가 source 173 rows와 기존 source 137 row references를 사용했고 기존 18 MB source는 복제하지 않았다.

게임 실행, save 변경, probe 설치, 실제 game 파일 쓰기, push는 수행하지 않았다.
