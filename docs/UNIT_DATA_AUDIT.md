# 유닛 데이터 감사 및 한국어 유닛명 admission

아래 표와 테스트 숫자는 한국어 이름 slice 당시의 기록입니다. 이후 특성 승격의 현재 결과는
[attribute admission](UNIT_ATTRIBUTE_ADMISSION.md)을 참조하세요. 현재 특성 목록은 1,107 / UNKNOWN 3이며,
849 COMPLETE / 261 PARTIAL입니다. `data:audit-units`는 현재 materialized 특성을 집계합니다.

감사 기준: 2026-10-07, 작업 시작 commit `52d4a40`의 실제 코드/JSON/CA trace.
과거 README나 coverage 보고서의 숫자를 현재값으로 사용하지 않았다.
Production 1,110개 + Sample 5개, 23 race ROSTER COMPLETE,
High Elves HOLD, canonical Lords 284 / Heroes 210 / subtype aliases 15개다.

`npm run data:audit-units`는 현재 `units.json`, 한국어 admission,
현재 roster source 및 보수적 normalizer를 읽어 다시 집계한다.
아래 UNKNOWN은 필드가 없다는 뜻이며, 해당 기능이 없다는 판정이 아니다.
능력/특성 coverage는 그룹이 저장된 유닛 수이며 완전한 모든 멤버 coverage와 다르다.
사격 UNKNOWN에도 비사격 유닛이 포함되므로 1,110을 사격 유닛 모수로 해석하지 않는다.

| 필드 | 작업 전 Production known / UNKNOWN | 저장된 extractor/fact 및 미승격 후보 | 의미 규명이 남은 부분 |
| --- | ---: | --- | --- |
| 한국어 유닛명 | 0 / 1,110 | 기존 Loc은 영문 1,110개. 기존 코드가 `local_en.pack`만 읽음 | 한국어 pack의 exact key·언어·snapshot 검증 필요. 이번 slice에서 해결 |
| ability / passive / attribute | 5 / 1,105 · 5 / 1,105 · 33 / 1,077 | 현재 1,009개 roster trace 중 ability membership 778개, attribute junction 1,008개. 현행 mapping으로 전체 그룹이 매핑되는 미저장 후보: active 0, passive 28, attribute 260 | distinct 미매핑 ability 405개 / attribute 48개. active/passive 분류·그룹 완결·한국어 label은 별도 admission 필요. 효과 계산은 제외 |
| entity count / HP | 0 / 1,110 · 13 / 1,097 | exact `num_men`, `num_engines`, `bonus_hit_points`는 1,110개에 존재. `num_engines > 0`은 120개. 1,009개 trace에 `hit_points` fact 존재 | ULTRA scale, crew/mount/engine 및 articulated 중복, count 표시 기준과 HP chain profile. raw count를 표시 개체 수로 복사하지 않음. healthPerEntity도 0 / 1,110 |
| speed | 81 / 1,029 | 1,009개 roster trace 모두 `run_speed` fact 보유 | man/mount/engine/flight 대표 경로와 기존 승인된 속도 변환의 exact profile 확장이 필요. raw값만으로 승격하지 않음 |
| resistance / damage resistance | 0 / 1,110 | land `damage_mod_*`가 1,110개에 존재. 별도 raw projectile penetration resistance는 773 / 337 | raw modifier→표시 저항 단위/종류, magic→spell 대응, 능력 및 조건부 효과와의 경계. penetration resistance는 피해 저항 coverage에 합산하지 않음 |
| missile 핵심값 | 기본/AP 피해·range·base reload·shots per volley 각 17 / 1,093 | preflight의 primary missile weapon 참조 306개, raw primary_ammo 1,110개. 새 1,009개 core trace에는 projectile chain이 없어 안전한 materialization-only 후보를 확정할 수 없음 | 엔진 사격·대체/다중 weapon·projectile 활성 경로 및 override. ammunition/표시 accuracy/reloadSkill은 각 0 / 1,110. raw ammo 0도 표시 탄약 0으로 승격하지 않음 |
| recruitment condition / source | 0 / 1,110 | 1,009개 trace 중 building junction을 가진 유닛 659개. permissions와 base cost/upkeep/create_time은 별도 기존 facts | building stage·enabled·condition·faction permissions와 실제 획득/모집 가능성의 차이. 별도 effective recruitment source 필드도 현재 모델에 없음 |

trace 후보 집계의 모수는 새 roster extraction에 저장된 1,009개다.
원래 101개에 대한 모든 과거 연구 자료를 합산한 값으로 주장하지 않는다.
passive 28 / attribute 260은 현행 normalizer가 captured trace 안에서 미매핑 ID 없이
그룹을 만들 수 있는 후보이며, 이번에 승인하거나 효과를 적용한 수가 아니다.

## 닫은 slice: CA 한국어 유닛명

- 1,110 / 1,110 admission, 한국어 유닛명 UNKNOWN 1,110 → 0.
- 서로 다른 exact main ID에 공유 land key가 있는 경우도 ID를 합치지 않음.
  1,072개 exact Korean Loc row로 1,110개의 이름을 증명한다.
- 설치된 CA WH3 9.0.2.0 `db.pack` / `local_en.pack` / schema는 기존 reviewed snapshot과
  같았다. `local_kr.pack`은 RPFM 5.1.0에서 Release pack으로 직접 읽었다.
  유일한 Loc 파일은 `text/localisation__.loc`, 총 212,408 rows이며,
  필요한 exact key/dependency만 committed source에 남겼다.
- Korean pack SHA256:
  `c8c283ed5ef9c8f1ce1a7437731342829a48048180d8890b1cf640fa1721426d`.
  raw source SHA256:
  `0c2c5074655bfaccbe851062d924d541704540fcca9d66e8925fedb68aa64716`.
- main→land processed schema 참조, 실제 schema `onscreen_name` localisation 선언,
  exact 기존 영문명, version, source hash, Loc row/key/pack/path를 검증한다.
  누락·중복·순환·빈 이름·영문 전용 값·미해결 markup은 HOLD 처리한다.
  실제 1,110개에는 해당 HOLD가 0개다. 추측 번역이나 fallback 대체는 없다.
- 기존 `units.json`은 그대로 둔다. 별도 `unitLocalisations.json` admission을
  Production repository가 materialize하여 `Unit.name`을 한국어로 제공한다.
  영문명과 exact ID 검색은 유지하고, 상세 페이지에 영문명을 함께 표시한다.
- shared Production/Evidence identity gate는 승인된 이름만 원래 영문명으로 되돌린 뒤
  기존 전체 record equality를 수행한다. 임의 이름·스탯·version drift는 계속 거부한다.
- 기존 모든 Unit IDs/순서/스탯, 23 complete rosters, character canonical/alias/exclusion,
  HP/speed admissions, diagnostic JSON, 개인 문서/즐겨찾기/최근 기록 key와 v1 backup을 유지한다.

## 보류 범위

이번 이름 slice에서 애매해서 보류한 유닛은 **0개**다.
category/description/ability label 전체의 한국어화를 완료했다고 주장하지 않는다.
이들은 이름과 다른 DB/Loc key·표시 문맥의 별도 slice다.
나머지 필드의 UNKNOWN과 위 표의 의미 blocker는 그대로 유지한다.
High Elf Dragonship captain 5개의 기존 character identity HOLD도 그대로다.
액티브 능력/마법 효과 계산 및 전역·팩션·군주 buff 계산은 변경하지 않았다.

## 재현 및 검증

게임이 없는 clean checkout에서도 아래 admission replay가 동작한다.

```text
node scripts/promote-unit-localisation.mjs --check
npm run data:audit-units
npm run check:data
npm test
npm run build
npm run check:pages
```

`extract-unit-localisation.mjs`는 기존 설치된 게임/RPFM을 읽는 source 갱신 명령이다.
source를 다시 추출해도 reviewed hash pin과 맞지 않으면 승격을 거부하며,
사용자 게임 pack이나 Production 원본 스탯을 쓰지 않는다.
전체 테스트는 현재 앱 테스트와 기존 historical evidence baseline의 테스트를 각각 실행한다.
현재 admission은 live tree에서 검사하며 historical replay는 기존 원본 evidence를 유지한다.

최종 결과: 현재 앱 74개 + 기존 evidence 623개 = 총 697개 테스트 통과, 실패/skip 0개.
새 slice 테스트 5개는 exact source replay, snapshot/identity drift 거부,
누락·중복·순환·잘못된 언어 처리, shared collision gate 및 기존 개인 기록 복원을 검증한다.
`check:data`는 새 localisation/현재 roster admission과 기존 17개 historical replay를 통과했다.
`npm run build`, `npm run check:pages`, `git diff --check`도 통과했다.
build에는 기존 500 kB 초과 bundle 경고가 유지된다.
첫 전체 실행에서는 게임이 실행 중이어서 기존 Windows installer mock 테스트 1개가 거부됐고,
사용자가 게임을 종료한 후 해당 테스트 및 전체 테스트를 다시 실행해 모두 통과했다.
실제 게임 설치/제거 동작과 보호 장치는 변경하지 않았다.

변경 파일: `unit-localisation/source.json`, `unit-localisation/review.mjs`,
`unitLocalisations.json`, localisation repository adapter, 기존 repository/search/shared gate,
Unit 상세 표시/출처, extraction/admission/audit scripts, live/historical test runner와 관련 tests.
