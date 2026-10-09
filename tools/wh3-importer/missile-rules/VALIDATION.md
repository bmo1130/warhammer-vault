# 사격 slice 검증 — 2026-10-09

기준 commit: `c9168a6a2cb36c6de2e45dc8b9280c59443ed14f`. CA 9.0.2.0 / snapshot `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

## 데이터 결과

- Production 1,110 / 정규 사격 대상 370 / N/A 740.
- COMPLETE 148 / PARTIAL 190 / UNKNOWN 32 / N/A 740.
- 기본 피해 17 → 155, AP 17 → 149, 사거리 17 → 333, raw 기본 재장전 17 → 336.
- 수치 신규 승격 321개: LAND 186 / ENGINE 70 / MOUNTED 65. 기존 17개 전체 missile 객체와 68개 핵심 필드 보존.
- 실제 0인 raw 기본 재장전 1개(`wh3_dlc25_dwf_art_goblin_hewer`) 보존. N/A는 숫자 0/UNKNOWN 또는 빈 missile 객체로 만들지 않음.
- 이전 모든 `src/data` 파일은 기준 commit과 동일. 사격 이외 Unit 필드는 effective repository의 exact inverse로 전부 동일.
- HP 986 / entity count 1,071 / speed 908 / 저항 다섯 종류 각각 1,110 / 한국어 유닛명 1,110 / Attribute 1,107 / Passive 1,105 / 23 COMPLETE roster 유지.

## 검증 범위

사격 전용 테스트 14개: 정규 무기 분모·N/A 판정, 원본/schema/reverse scope 누락, 끊어진/중복 forward edge, 명시적인 0과 invalid type, 필드 독립 승격, 복수 프로필 값 불일치, engine/rider/mount 소유 경로, 폭발/launch count/volley/burst/scaling/vortex 피해 보류, precursor/hidden-secondary 보류, spell flag와 ability-only 구분, 17개 회귀, 10개 독립 trace 비교, 모든 이전 dataset의 byte 보존, 공유 identity collision, 상태별 UI, source/codec/report/projection/audit replay.

실제 게임 카드 신규 실측은 0개. 10개 표본은 다른 exact-key trace code path로 같은 pack/schema를 재추출한 검증이다. 과거 wiki Helstorm 값은 버전·보정 상태 미기록의 비교 자료다. Production UI smoke test는 전쟁서고 화면 검증이며 게임 카드 실측으로 집계하지 않는다.

## 변경 파일

- `src/data/unitMissileAdmissions.json`: 네 사격 필드 및 N/A/UNKNOWN/PARTIAL/COMPLETE 독립 admission; original missile 보존, report/source hash 연결.
- `src/repositories/unitMissiles.ts`: 네 필드 projection, 검증된 status/provenance accessor, exact inverse.
- `src/repositories/gameRepository.ts`, `unitSharedIdentity.ts`: 사격 overlay 적용과 기존 공유 ID의 엄격한 역변환.
- `src/components/UnitMissileDetails.tsx`, `UnitProductionDetails.tsx`: 기존 raw 필드 의미 보존, 네 상태·숫자 0·미확인 구분, 기존 보조 사격 필드 유지.
- `scripts/promote-unit-missiles.mjs`, `audit-unit-data.mjs`, `test.mjs`, `check-data.mjs`: 재현 gate와 실제 사격 대상/N/A 분모 감사.
- `tests/unit-missiles.test.cjs`: 신규 사격 검증. `unit-attributes`, `unit-passives`, `unit-localisation`, `unit-entities`, `unit-speed-rules`, `unit-resistances`의 기존 불변성 검증은 exact missile inverse만 추가.
- `tools/wh3-importer/missile-rules/`: 범위 한정 수집기 3개, lossless codec, exact graph/predict/replay/report code, manifest, 원본 catalog/UI/validation/owner-schema evidence, processed schema inventory, 기존 17개 provenance/비교 표본, RULES/AUDIT/VALIDATION 및 machine-readable report.

원본 `units.json` 및 기존 admission/연구/능력/저항/HP/속도 데이터는 재작성하지 않았다. schema 확장, 동적 사격/DPS 엔진, 개인 기록 저장 형식 변경은 없다.

## Production 브라우저 smoke

최종 build를 `http://127.0.0.1:5175/warhammer-vault/`에서 확인했다. 임시 탭과 preview 서버는 검증 후 종료했다.

| 표본 | 확인한 사격 표시 |
| --- | --- |
| Peasant Archers / `wh3_main_cth_inf_peasant_archers_0` | COMPLETE: range 140 / direct base 14 / AP 1 / raw reload 11 |
| Empire Spearmen / `wh_main_emp_inf_spearmen_0` | N/A: 정규 사격 무기 없음, 숫자 0이나 미확인으로 대체하지 않음 |
| Helstorm / `wh_main_emp_art_helstorm_rocket_battery` | PARTIAL: range 480 / raw reload 17, 두 직격 피해 필드는 미확인 |
| Khorne Soul Grinder / `wh3_main_kho_mon_soul_grinder_0` | UNKNOWN: 정규 weapon은 있으나 precursor 표시 의미 미확정, 네 값 미확인 |
| Goblin Hewer / `wh3_dlc25_dwf_art_goblin_hewer` | PARTIAL: range 80 / raw reload **0** 보존, 직격 피해 미확인 |

브라우저 error log 0개. 스크린샷: ignored `generated/wh3/missile/ui-complete.png`. 모든 UI 설명은 raw 직격 피해와 카드 집계 위력, raw reload와 실제 발사 간격을 구별한다.

## 실행 결과

| 명령 / 검사 | 결과 |
| --- | --- |
| `node --test tests/unit-missiles.test.cjs` | 14/14 PASS |
| `npm test` (최종 source pins) | 776/776 PASS: 현재 앱 153 + 역사적 evidence 623; 실패/skip 0 |
| Windows installer backup/restore / changed-probe fail-closed 검사 | PASS; 게임 프로세스 차단 없음 |
| `npm run check:data` | PASS: live 사격 및 기존 모든 admission/projection + 17 historical replay; 보호된 기존 559 파일 동일 |
| `npm run build` | PASS: TypeScript + Vite, 126 modules |
| `npm run check:pages` | PASS: 7 route/query/hash 왕복 및 모든 built asset |
| Production 브라우저 5개 상태 표본 / error log | PASS / error 0 |
| `git diff --check` | PASS |

Vite의 기존 대형 chunk 경고는 유지된다. 최종 JS 5,946.78 kB / gzip 517.20 kB. 이는 경고이며 build 오류가 아니다. 이번 사격 slice에서 bundle 구조를 별도로 변경하지 않았다.

상세 실행 log는 ignored `generated/wh3/missile/final-tests.log`, `check-data.log`, `build.log`에 보관한다. 로컬 commit만 수행하며 push하지 않는다.
