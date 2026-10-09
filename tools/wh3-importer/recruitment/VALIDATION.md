# 모집 slice 검증 및 변경 파일

## 결과

- 직접 건물 모집 조건: **0 → 758** 유닛, UNKNOWN **1110 → 352**.
- 직접/특수 출처 기록: **0 → 1107** 유닛, UNKNOWN **1110 → 3**.
- 확정 실효 출처: **0 → 0**. 출처 기록 1107개는 캠페인 건설·해금이 미완결인 PARTIAL이다.
- 전체 모집 경로: COMPLETE 0 / PARTIAL 1107 / UNKNOWN 3 / N/A 0.
- 직접 건물 참조 경로: COMPLETE 758 / PARTIAL 0 / UNKNOWN 352 / N/A 0. 전체 경로 완결과 별개다.
- 특수 구조 분류 627, 복수 건물 698, 복수 체인 587, 추가 해금 참조 369 유닛. 구조 간 중복을 보존했다.
- 종족별 전체 표는 RULES.md 및 report.json /races. 기존 roster 24개 중 23 COMPLETE와 High Elves HOLD를 그대로 보존했다.

## 실제 검증 실행

| 검증 | 결과 |
|---|---|
| 관련 모집 및 기존 slice 회귀 테스트 | 현재 app 167개 중 모집 14개 PASS |
| 전체 `npm test` | PASS: current 167 + historical 623 = 790, 실패 0; Windows 설치 검사 포함 |
| `npm run check:data` | PASS: 현재 admission 및 17 historical replays |
| `npm run build` | PASS: TypeScript + Vite, 129 modules |
| `npm run check:pages` | PASS: 7 route/query/hash roundtrips, 현재 asset 확인 |
| Production browser UI | 5개 사례 PASS, console error 0, 가로 overflow 없음 |

빌드 JS 15,357.38 kB / gzip 1,209.21 kB. 기존 Vite 500 kB chunk 경고가 있으며 모집 데이터 추가로 번들이 커졌다. 코드 분할이나 별도 캠페인 계산 엔진은 이번 scope에 포함하지 않았다.

전체 이전 src/data 파일을 ef6b1748888f8d60e3c167ce11b5997dfc4d4b6f와 비교하는 테스트, 모든 이전 Production Unit을 정확한 inverse로 재구성하는 테스트가 통과했다. HP 986 / count 1071 / speed 908 / 기본 저항 각 1110 / attribute 1107 / passive 1105 / 한국어 유닛명 1110 및 사격 상태 148 COMPLETE, 190 PARTIAL, 32 UNKNOWN, 740 N/A가 유지됐다. Character identity/alias, 검색/IME, 개인 기록·백업·즐겨찾기 회귀 테스트도 포함한다.

## UI 및 독립 비교

Production preview에서 창병(일반 건물), 검병(13개 직접 연결/5개 체인 조건), 스턴스맨(유명연대 및 여러 풀 PARTIAL), Iron Daemon payload QB(UNKNOWN), Animated Hulks(진영 지정 출처 7개 그룹)를 확인했다. 일반 건물에 명시된 CA 단계와 주건물 요구 값을 별도로 표시하고 상위 단계는 실제 행만 표시한다. 미해결 건물명 번역 템플릿은 그대로 노출하지 않고 이름 미확인으로 표시한다. 임시 preview와 브라우저를 종료했다.

비모집 전체 N/A는 확정된 데이터가 0개이므로 실제 N/A 사례를 만들어 UI 검증하지 않았다. UNKNOWN을 비모집으로 바꾸지 않았다. 로컬 화면 증거: generated/wh3/recruitment/ui-multiple.png (ignored).

별도 기존 unit tracer + exact-key probe 12범주가 모두 raw 건물 행/단계/특수 참조와 일치했다. 동일 CA snapshot의 별도 추출 경로 비교이며 게임 캠페인 UI 실측은 **0개**다. expected/actual 전체 표는 RULES.md 및 report.json /comparisons. LL 독점 표본을 확보했다고 주장하지 않으며 faction permission 사례만 별도 검증했다.

## 원본 및 provenance

- CA 9.0.2.0, RPFM 5.1.0, sourceKind ca-pack, gameExecuted false.
- Snapshot c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5.
- Schema SHA256 5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4.
- db.pack SHA256 d0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723.
- local_en.pack SHA256 f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a.
- Projection report SHA256 30b0867b36612ed9176fea6eb6fc3e44efca4e3223203193b90b716e08a6e32c.
- Exact 1110 main-unit seeds, 50 keys / 1000 rows maximum per DB query, fullImport false. 21,620 rows with processed schema, row keys, source paths, hashes, reference edges and selection coverage are losslessly retained.
- main_units v7; building_units_allowed v4; building_levels v3; building_chains v10; building_culture_variants v5; factions v6; military/exclusive permission v0; mercenary groups/pool junction v3; recruitment_sources v1; unit upgrade junction v3. Full 32 processed table/version pairs: report.json /schemaVersions.
- Actual absent-table schema fields are unit_required_technology_junctions.unit_key, building_level_required_technology_junctions.building_level_key and building_chain_climate_restrictions.building_chain. Schema metadata is preserved; no file absence is interpreted as zero conditions.

Exact source paths, stage/condition rules and multiple-source handling are in RULES.md. All unresolved unit keys, source table/key/row, unknown override/buildability/script/unlock issues and the three UNKNOWN units are in AUDIT.md and report.json /held. No unit-name exceptions or dynamic effects were introduced. Direct and effective verification are stored separately.

## 변경 파일

- Production data: src/data/unitRecruitmentAdmissions.json only (all prior JSON unchanged).
- Domain: src/domain/unit.ts, src/domain/unitValidation.ts.
- Repository: src/repositories/unitRecruitment.ts, src/repositories/gameRepository.ts, src/repositories/unitSharedIdentity.ts.
- UI: src/components/UnitRecruitmentDetails.tsx, src/components/UnitProductionDetails.tsx, src/style.css.
- CLI/checks: scripts/promote-unit-recruitment.mjs, scripts/audit-unit-data.mjs, scripts/test.mjs, scripts/check-data.mjs.
- New tests: tests/unit-recruitment.test.cjs.
- Prior regression comparisons now strip only an exact matching recruitment admission: tests/unit-attributes.test.cjs, tests/unit-passives.test.cjs, tests/unit-localisation.test.cjs, tests/unit-entities.test.cjs, tests/unit-speed-rules.test.cjs, tests/unit-resistances.test.cjs, tests/unit-missiles.test.cjs. Existing comparisons/count expectations remain.
- Collector/replay: tools/wh3-importer/recruitment/collect.mjs, collect-validation.mjs, source.mjs, predict.mjs, rules.mjs, report.mjs.
- Evidence: same directory's catalog.source.json, validation.source.json, manifest.json, references.json, representatives.json, report.json.
- Reports: same directory's RULES.md, AUDIT.md, VALIDATION.md.

Local commit only; no push, deployment, mod installation or other slice rewrite.
