# Speed 2차 보완 결과

기준 커밋 `c122973`, Production 1,110개, 원본 버전 `9.0.2.0`. Speed만 변경했다. 검증된 191개를 별도 admission overlay에 반영했고, 원래 908개 값은 모두 유지했다. 커밋 후 push하지 않는다.

## 1–2. 저장 coverage와 상태

| 항목 | Before | After |
| --- | ---: | ---: |
| Speed 저장 / COMPLETE | 908 | 1,099 |
| Speed 미저장 | 202 | 11 |
| PARTIAL | 125 | 0 |
| UNKNOWN | 77 | 11 |

## 3–5. 기존 보류 유형별 처리

유형은 기존 감사의 첫 차단 원인으로 나눈 서로 겹치지 않는 집계다.

| 기존 유형 | 대상 | 신규 승격 | 남은 보류 |
| --- | ---: | ---: | ---: |
| 비행 | 117 | 117 | 0 |
| 원본 참조 누락 | 77 | 66 | 11 |
| 동기화 이동 | 3 | 3 | 0 |
| 미검증 엔진 | 3 | 3 | 0 |
| 관절 차량 | 2 | 2 | 0 |

비행은 본체 87개와 탈것 30개다. 참조 누락 77개 중 **6개는 기존 9.0.2 추출 자료를 합쳐 전체 원본 체인을 복구**했다. 나머지 신규 승격 60개는 카드에 선택되는 탈것 체인이 이미 완전했다. 선택되지 않는 engine/articulation 누락을 카드의 selected mount 누락과 구분하여 승격했고, 그 누락은 감사에 그대로 남겼다. 원본 자체에 데이터가 없다고 결론 내리지 않았다. 기존 추출에서 선택된 원본을 확보하지 못한 경우다.

특수 구조 8개도 승격했다. 동기화 이동은 단일 지상 본체의 애니메이션 동기화 플래그이며, 검증된 체인에서는 Speed 배수가 아니다. 엔진과 관절 차량은 검증된 engine_type 및 native component reference 조건으로 제한했다.

## 6. 비행 기본 카드 Speed 규칙

- 단일 본체는 `land_units.man_entity → battle_entities`, 탈것은 `land_units.mount → mounts.entity → battle_entities`를 선택한다. 탑승자의 속도로 대체하지 않는다.
- 독립 공개 구현의 선택 순서는 mount → engine → man이다. 엔진·관절 차량은 이 순서를 무조건 적용하지 않고 [RULES.md](RULES.md)의 검증된 구조에만 적용한다.
- 이번 비행 117개는 선택 entity의 `fly_speed > 0`이며 `fly_speed >= run_speed`다. **기본 카드 Speed = 선택된 `fly_speed × 10`**으로 모두 재현한다. 검증된 지상 구조는 선택된 `run_speed × 10`이다.
- 두 독립 사이트의 positive-fly fallback과 max(run, fly) 정의가 이번 범위에서는 일치한다. `0 < fly_speed < run_speed`, 반올림이 필요한 값, 추가 이동 source, 미검증 draught 구조는 일반화하지 않는다.
- 지상 run, 공중 fly, 지상 charge, 공중 charge, 가속·감속·선회와 locomotion은 원본에서 별도로 보존한다. 실제 전투 이동에 영향을 주는 피로·지형·능력·기술 등의 보정은 기본 카드 Speed에 합산하지 않는다. 이름별 하드코딩이나 임의 비행 multiplier는 없다.

페가수스의 예: 탑승자 run 3.3, 탈것 run 8.2, fly 10.5, charge 10.8, flying_charge 13. 기본 카드는 **105**이며 33/82/108/130과 구별된다. 군주·영웅은 이 1,110개 Unit catalog 밖에 있으므로 비행 탑승 Character의 신규 값을 만들지 않았다.

## 7. 기존 908개 회귀

908/908 값과 identity를 유지했다. 기존 정적 기준 81개 및 과거 사용자 게임 카드 표본 6개도 유지했다. 원본 Unit JSON과 기존 admission/source/report는 수정하지 않았다. 새 overlay는 `movement.speed`만 바꾸며 역변환 및 버전·값 drift guard를 테스트했다.

## 8–9. 카드 기준값과 독립 검증

**이번 직접 게임 UI 실측은 0개다.** 새로 관찰한 아래 6개는 TWW Stats 웹 카드다. 9.0.0 / Ultra / rank 0 / Fresh / No Comparison 조건을 [browser-card-evidence.json](browser-card-evidence.json)에 전체 URL 및 관찰 시각과 함께 보존했다. 해당 selected entity 및 native land reference의 이동 필드는 저장된 9.0.2와 일치한다.

| 독립 웹 카드 | CA 9.0.2 expected | 웹 카드 actual | Production |
| --- | ---: | ---: | ---: |
| Pegasus Knights | 105 | 105 | 105 |
| Obsinite Gyrocopters | 100 | 100 | 100 |
| Vargheists | 92 | 92 | 92 |
| Sky-junk | 30 | 30 | 30 |
| The Crows of Khaine (Harpies) | 82 | 82 | 82 |
| The Konigstein Stalkers | 31 | 31 | 31 |

신규 191개에 존재하는 component profile 307개 모두 독립 9.0.0 CA export의 이동 필드와 일치했다. 기존 908개를 포함한 저장값 1,099개도 TW Database의 key 기반 9.0.2 카드 값과 일치했다. 미저장 11개에는 사이트 기대값이 있더라도 그 값만으로 승격하지 않았다.

TW Database가 제시한 upstream commit `c773c6d0`은 GitHub 조회에서 HTTP 422로 확인되지 않았다. 따라서 그 사이트 하나만으로 원본을 복구하거나 확정하지 않았다. [TWW Stats](https://twwstats.com)의 공개 선택·표시 구현, [실재하는 독립 export commit](https://github.com/Shazbot/WH3-Dump/tree/8a4f7e64714cf971b44988a4b59f218af6d04ff2), 기존 CA 원본 체인으로 교차 검증했다. 출처별 신뢰 한계는 [VALIDATION.md](VALIDATION.md)에 기록했다.

새로 재추출한 설치본은 **9.0.3.0**이었다. 819개 bounded row와 실행 파일·pack hash를 별도 보존했으며 9.0.2로 재표기하지 않았다. 기존 component profile 5개의 이동 필드 차이도 별도 비교했다. Production 수치는 저장된 정확한 9.0.2 원본에서만 가져왔다. 재추출은 게임 UI 측정이 아니다.

## 10. 남은 11개

모두 engine key 및 target entity key는 알지만, **저장된 9.0.2 snapshot에 카드가 선택하는 engine의 battle_entities 행이 없다.** 최신 9.0.3이나 탑승자·사이트 기대값을 대신 저장하지 않았다.

- Claw of Nagash, Mortis Engine, Coven Throne
- Casket of Souls
- Doom-flayer RoR, Doomwheel 기본/RoR/기술 연구소 RoR 두 종류
- Deathshrieker Rocket Launcher, Magma Cannon
- Bloodwrack Shrine

11개 정확한 main/land/engine/entity raw key와 개별 차단 원인, 신규 191개의 선택 프로필은 [AUDIT.md](AUDIT.md)에 있다. 선택되지 않는 원본이 누락된 승격 60개의 raw gap도 [report.json](report.json)에 남겼다.

## 11. 변경 파일과 provenance

- `src/data/unitSpeedSecondAdmissions.json`: 검증된 신규 191개 projection.
- `src/repositories/unitSpeed.ts`: 기존·신규 overlay와 identity guard 통합.
- `src/components/UnitProductionDetails.tsx`: provenance에서 실제 선택한 `run_speed` 또는 `fly_speed` 표시.
- `scripts/promote-unit-speed-second.mjs`, `scripts/check-data.mjs`, `scripts/test.mjs`, `scripts/audit-unit-data.mjs`: deterministic 재생 및 coverage 감사.
- `tests/unit-speed-second.test.cjs`, `tests/unit-speed-rules.test.cjs`: 신규 구조·보류·원본 버전·908개 회귀 검증. 다른 4개 테스트는 live Speed coverage 기대값만 갱신했다. 능력 테스트의 이전 자료 보존 검사는 이전 slice에서 이미 추가된 overlay를 허용하면서 기존 파일 내용을 계속 비교하도록 고쳤다.
- 이 폴더의 bounded collectors, 원본 source envelope 4개, manifest, 규칙·감사·검증·report와 독립 웹 카드 관찰 자료.

Production 원본 snapshot: `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

신규 report/projection source hash: `d54f1ffa0658e0ad041a4c31667908b246ae086f5b91a647a262d8bd2986315d`.

원본 행별 파일·row provenance와 input hash는 source/manifest에 보존한다. `node scripts/promote-unit-speed-second.mjs --check`로 projection과 생성 문서를 재현한다. HP 986, 개체 수 1,071, 저항 5종 × 1,110, 직격 기본/AP 328/327, 사거리 333, 재장전 336과 모집·446종 능력 사전/패널/독립 문서·localisation·Character identity·23종족 roster·개인 기록을 유지했다.

## 12. 테스트·빌드·Production UI

| 검증 | 결과 |
| --- | --- |
| Speed 관련 테스트 | 16/16 PASS (기존 9 + 신규 7) |
| `npm test` | 838/838 PASS (현재 215 + 역사 회귀 623) |
| 빌드 전 `npm run check` | PASS, TypeScript 및 `check:data` 포함 |
| `npm run build` | PASS, 140 modules. 기존 큰 bundle 경고는 남음 |
| 빌드 후 `npm run check` | PASS |
| `npm run check:pages` | PASS, 8 route/query/hash roundtrips 및 built asset 검사 |
| `git diff --check` | PASS |

실제 빌드의 Production UI에서 비행 Pegasus 105(`fly_speed 10.5`), 지상 Great Cannon 20(`run_speed 2`), 관절 Steam Tank 40(`run_speed 4`)과 provenance를 확인했다. 브라우저 오류 로그는 0개다. 이는 전쟁서고 화면 검증이며 게임 자체 UI 실측이 아니다. 스크린샷과 실행 로그는 로컬 ignored `generated/wh3/speed-second/`에 보존했다. 검증용 preview는 종료했다.
