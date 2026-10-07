# 유닛 특성 Production admission

2026-10-07, 실제 작업 시작 commit `79deea5`의 Production 1,110개 및 기존 extractor,
schema-connected fact/trace, admission, Unit schema를 읽고 검토했다.
기존 한국어 이름 1,110개와 raw Unit 원본을 그대로 보존한다.

## 결과와 집계 기준

| 항목 | Before | After |
| --- | ---: | ---: |
| `attributes` 목록 저장 유닛 | 33 | 1,107 |
| 목록 UNKNOWN (필드 미저장) | 1,077 | 3 |
| 실제 특성 1개 이상 | 33 | 1,102 |
| 검토된 기본 특성 없음 (`[]`) | 0 | 5 |

모든 raw key의 의미가 확정된 유닛은 **849 COMPLETE**다.
보류 raw key가 남은 **261 PARTIAL**에는 확정된 특성만 표시한다.
그중 3개는 확정된 표시 특성조차 없어 `attributes`를 생략한다.
따라서 UNKNOWN 3은 목록 필드 coverage이며 미해결 의미가 3유닛에만 있다는 뜻이 아니다.
COMPLETE 역시 이 snapshot의 기본 그룹과 검토된 공성 플래그 범위이며,
전투/캠페인에서 부여되는 최종 특성 전체를 확정하지 않는다.

승격된 distinct canonical ID는 **50개**다. 기존 33개 유닛에 저장된 ID와 순서를 유지하고
검증된 추가 ID만 배열에 넣었다. 기존부터 사용되던 ID가 다른 유닛에 추가되는 것도 50개 집계에 포함된다.
**58 raw CA key / 1,038 distinct group / 3,249 junction**을 처리했다.
57개는 실제 그룹에 연결된 native attribute이며 `can_siege`는 native Loc 정의와
`main_units.can_siege`의 processed schema 설명을 결합해 증명한 별도 공성 플래그다.

## 원본 의미와 분류

- CA `unit_attributes_tables` v5 정의, `land_units.attribute_group` → 그룹 →
  `unit_attributes_to_groups_junctions.attribute`의 exact schema 참조를 검증한다.
- 저장된 1,009 roster trace의 reachable attribute fact와 보충한 전체 reverse group query를 대조한다.
  나머지 기존 101개도 같은 pinned roster의 exact main/land 참조에서 검증한다.
- CA English/Korean `unit_attributes_bullet_text_<key>`를 근거로 title과 설명을 검토한다.
  `undead` title만 schema가 선언한 `imued_effect_text`를 사용한다. 원본 오탈자도 그대로 따른다.
  Loc title의 exact 참조만 해석하며 tooltip body의 runtime 변수나 효과를 계산하지 않는다.
- Native UI collection 연결 9개는 표시 묶음이다. 능력 소유권이나 의미 동등성을 뜻하지 않는다.
  공포와 섬뜩함은 같은 collection에 있어도 별도 특성이다.
- 기사/농민, 스킹크/크록시거처럼 원본 tooltip에 구체적인 사용자 특성이 명시된 값은 표시한다.
  설명이 능력 대상 판정만을 명시한 `squig`, `gorger`는 제외한다.
- `unit_abilities_tables`에 속한 **416개 raw ability key**는 source type
  active/bound/passive/spell/unit과 함께 exclusion evidence로만 보존한다.
  광란 `wh_main_unit_passive_frenzy`, 재생 `wh_main_unit_passive_regeneration`,
  악마의 불안정성 `wh3_main_unit_passive_daemonic_instability_daemon`,
  부상/붕괴 계열 등은 `attributes`에 복사하지 않는다. 기존 능력/지속 능력 필드도 수정하지 않는다.
- 예시로 요청된 수병은 이 scope의 native attribute에서 증명되지 않았으므로 새로 만들지 않는다.

## Canonicalization

정확한 key allowlist만 사용한다. `daemonic → daemon`, `fatigue_immune → perfect_vigour`,
`hide_forest → stalk_in_forest`는 기존 canonical ID를 유지한다.
`mounted_fire_move → fire_while_moving`, `can_siege → siege_attacker`도 exact proof를 저장한다.
`hide_forest`와 `stalk`, `causes_fear`와 `causes_terror`는 합치지 않는다.
이번 source에서 서로 다른 두 native raw key가 동의어라는 새 증거는 없어 임의 alias를 추가하지 않았다.
반복된 group/공성 경로는 배열 ID를 중복시키지 않고 모든 raw key 및 source row ID를 facts에 보존한다.

## 보류와 제외

| Raw key | 상태 / 유닛 수 | 이유 |
| --- | --- | --- |
| `guerrilla_deploy` | HOLD / 260 | 두 CA title 모두 `{{tr:guerrilla_deployment}}`이고 정확한 참조 Loc key가 없다. 접두사를 추측하거나 선봉 배치 label을 발명하지 않는다. |
| `rampage` | HOLD / 1 | tooltip은 현재 제어 불가능한 광란 상태를 설명한다. 정적 group만으로 발동 조건/현재 상태를 확정할 수 없다. |
| `underground` | HOLD / 1 | tooltip은 Dread Maw가 현재 지하에 있는 상태를 설명한다. 정적 membership만으로 활성화 상태를 확정할 수 없다. |
| `flying`, `always_flying`, `cant_run` | EXCLUDED | 구조화된 movement와 겹치는 이동 플래그. 이번 slice에서 이동 필드도 수정하지 않는다. |
| `squig`, `gorger` | EXCLUDED | 원본 설명이 능력 target 판정용 분류만을 명시한다. 사용자 전투 특성으로 표시하지 않는다. |

보류 수에는 1개 유닛의 중복이 있어 distinct PARTIAL은 261개다.
목록 UNKNOWN 3개는 `ca_unit_wh_dlc05_bst_mon_harpies_0`,
`ca_unit_wh2_dlc10_def_cav_raven_heralds_ror_0`, `ca_unit_wh2_main_def_inf_harpies`다.

## 구조, provenance와 회귀 방지

`units.json`을 재작성하지 않는다. 기존 `Unit.attributes?: string[]`에 exact sidecar admission을
repository가 materialize한다. 기존 이름/스탯/유닛 ID/순서/source/23 COMPLETE roster,
Character canonicalization/alias, 개인 문서·즐겨찾기·최근 기록과 v1 backup 구조는 동일하다.
shared identity gate는 정확히 승인된 배열만 원래 배열로 복원한 뒤 전체 원본 record equality를 검사한다.
임의 추가/삭제/순서 변경, 스탯/name/version drift는 계속 거부한다.
상세 페이지는 CA 한국어 특성과 PARTIAL/UNKNOWN/확인된 빈 목록을 구별한다.

원본 source SHA256:
`7d99580858e1b5ebaebd0561be0603d67abde8984cb6903aae39e435fe495044`.
WH3 9.0.2.0 db/en/schema는 기존 reviewed snapshot과 동일하고 Korean pack도 이전 이름 slice의
`c8c283ed5ef9c8f1ce1a7437731342829a48048180d8890b1cf640fa1721426d`를 요구한다.
pack/game 실행이나 게임 파일 쓰기 없이 bounded DB 6,796 rows와 Loc 1,075 rows를 보존했다.

변경 파일:

- `scripts/extract-unit-attributes.mjs`, `scripts/promote-unit-attributes.mjs`
- `tools/wh3-importer/unit-attributes/{source.json,policy.mjs,review.mjs,admission.json}`
- `src/data/unitAttributeAdmissions.json`, `src/repositories/unitAttributes.ts`
- `gameRepository.ts`, `unitSharedIdentity.ts`, `unitLabels.ts`, `unitValidation.ts`, `UnitProductionDetails.tsx`
- `scripts/{test,check-data,evidence-view,audit-unit-data,data-status}.mjs`, `package.json`
- `tests/unit-attributes.test.cjs`, `tests/unit-localisation.test.cjs`, README 및 감사 문서

## 검증

게임이 없는 checkout에서 replay 가능하다. 새 source/schema/query/Loc/identity drift를 fail closed로
거부하고 기존 데이터와 한국어 이름을 이전 commit의 실제 JSON에 대조한다.
중복 trait 및 movement/ability/내부/보류 raw key 혼입을 validator와 admission으로 차단한다.
기존 historical evidence는 별도 원본 baseline에서 재실행한다.

```text
node scripts/promote-unit-attributes.mjs --check
node --test tests/unit-attributes.test.cjs tests/unit-localisation.test.cjs tests/unit.test.cjs tests/unit-catalog.test.cjs tests/faction-rosters.test.cjs
npm test
npm run check
npm run build
npm run check
npm run check:pages
```

관련 tests는 먼저 `tsconfig.test.json` 컴파일이 필요하다. 전체 `npm test`가 이를 자동으로 수행한다.
최종 결과: 관련 유닛/데이터 테스트 **39개**, 전체 **704개 (live 81 + historical 623)** 통과,
실패/skip 0개. 새 attribute tests 7개는 전체 유닛의 비특성 필드 회귀, exact mapping/provenance,
의미 분류/보류, offline replay/drift 거부, collision guard, validator 및 표시 상태를 검증한다.
`npm run check → npm run build → npm run check`와 `check:pages`도 통과했다.
두 check 모두 live attribute/localisation/roster admission 및 기존 17개 historical replay를 실행했다.
Pages route/query/hash roundtrip 7개와 built assets 검증도 통과했다.
기존 Windows 설치/복구 보호 테스트는 게임 종료 상태에서 통과했고 해당 보호 장치는 수정하지 않았다.
기존 500 kB 초과 bundle 경고는 남아 있으며 이번 slice에서 구조 개편을 하지 않았다.

## Exact mapping inventory

| Raw CA key | Canonical ID | CA Korean title | Units |
| --- | --- | --- | ---: |
 | armoured_vehicle | armoured_vehicle | 직사 방패 | 5 |
 | bound_fire_daemon | bound_fire_daemon | 속박된 화염 악마 | 2 |
 | can_block_missiles_360 | can_block_missiles_360 | 전방위 사격 차단 | 2 |
 | can_siege | siege_attacker | 공성 공격자 | 338 |
 | causes_fear | causes_fear | 공포 유발 | 564 |
 | causes_terror | causes_terror | 섬뜩함 유발 | 222 |
 | charge_defense | charge_defense | 돌격 방어 전문가 | 37 |
 | charge_defense_vs_large | charge_defense_vs_large | 대형 상대 돌격 방어 | 83 |
 | charge_reflection | charge_reflection | 돌격 반사 | 86 |
 | construct | construct | 구조물 | 22 |
 | contempt | contempt | 경멸 | 27 |
 | daemonic | daemon | 악마적 | 65 |
 | devastating_flanker | devastating_flanker | 파괴적인 측면 공격 | 34 |
 | elemental | elemental | 정령 | 8 |
 | encourages | encourages | 격려 | 39 |
 | expendable | expendable | 소모품 | 42 |
 | fatigue_immune | perfect_vigour | 완벽한 활력 | 16 |
 | flanking_immune | flanking_immune | 측면 공격 면역 | 17 |
 | formed_attack | formed_attack | 대형 공격 | 5 |
 | glorious_charge | glorious_charge | 영광스러운 돌격 | 3 |
 | gunship | gunship | 화력지원 부대 | 2 |
 | hellforged | hellforged | 지옥대장간 | 13 |
 | hide_forest | stalk_in_forest | 은신 (숲) | 755 |
 | ignore_imbue_contact_effects_enemy | ignore_imbue_contact_effects_enemy | 접촉 효과 면역 | 10 |
 | ignore_trees | ignore_trees | 나무꾼 | 110 |
 | immune_to_psychology | immune_to_psychology | 심리 면역 | 109 |
 | knight | knight | 기사 | 11 |
 | kroxigor | kroxigor | 크록시거 | 5 |
 | mark_khorne | mark_khorne | 코른의 표식 | 30 |
 | mark_nurgle | mark_nurgle | 너글의 표식 | 29 |
 | mark_slaanesh | mark_slaanesh | 슬라네쉬의 표식 | 28 |
 | mark_tzeentch | mark_tzeentch | 젠취의 표식 | 22 |
 | moulder_monster | moulder_monster | 몰더 괴수 | 16 |
 | mounted_fire_move | fire_while_moving | 이동 중 사격 | 120 |
 | ogre_charge | ogre_charge | 오거 돌격 | 14 |
 | peasant | peasant | 농민 | 19 |
 | skink | skink | 스킹크 | 11 |
 | slayer | slayer | 척살단 | 9 |
 | snipe | snipe | 저격 | 7 |
 | spell_mastery | spell_mastery | 원소풍 통달 | 3 |
 | stalk | stalk | 암행 | 71 |
 | strider | strider | 활보 | 138 |
 | tiger_warrior | tiger_warrior | 호랑이 전사 | 3 |
 | unbreakable | unbreakable | 불굴 | 52 |
 | undead | undead | 언데드 | 102 |
 | unspottable | unspottable | 탐지 불가 | 1 |
 | unyielding_assault | unyielding_assault | 꿋꿋한 맹공 | 4 |
 | wallbreaker | wallbreaker | 장벽 파괴자 | 49 |
 | yang | yang | 양 | 16 |
 | yin | yin | 음 | 19 |
