# Ultra entity count + HP admission — 2026-10-07

최신 기준 commit은 `464e844`다. 기존 보고서의 101개 cohort 숫자를 현재 coverage로
사용하지 않고, 현재 Production 1,110개와 각 source trace를 다시 읽었다.
결과는 **B의 보수적 범위: 검증된 13개 identity의 개체 수만 승격**이다.
새 category 전체에 적용할 HP/count 공식은 증명되지 않았다. 기존 HP 13개를
그대로 유지하며 새 HP, 개체당 HP 또는 크기 배율을 추측해서 만들지 않았다.

| 필드 | 저장 before → after | UNKNOWN before → after | COMPLETE / PARTIAL / UNKNOWN |
| --- | --- | --- | --- |
| `entities.count` | 0 → 13 | 1,110 → 1,097 | 13 / 0 / 1,097 |
| `entities.totalHealth` | 13 → 13 | 1,097 → 1,097 | 13 / 0 / 1,097 |
| `entities.healthPerEntity` | 0 → 0 | 1,110 → 1,110 | 0 / 0 / 1,110 |

결합 COMPLETE 13은 **count와 totalHealth 두 필드**에 한정한다. 개체당 HP 또는
물리적 entity graph까지 COMPLETE라는 뜻이 아니다. 10개는 원본 Ultra runtime,
3개는 이미 승인된 동일 HP-chain profile의 검증된 `logicalCount`다.
한국어 이름 1,110 / UNKNOWN 0, attribute 1,107 / UNKNOWN 3, passive 1,105 /
UNKNOWN 5, 23 race COMPLETE와 기존 Character identity/alias는 보존한다.

## 증거와 재현

- [manifest](../tools/wh3-importer/unit-entities/manifest.json): 현재 raw Units의
  canonical digest, source/review byte SHA256, 정확한 13개 scope 및 표본 identity.
- [admission](../tools/wh3-importer/unit-entities/admission.json): 현재 1,110개
  source pointer/shape/raw field/reference/missing chain inventory, 원본 fact의
  row ID/schema/pack/path/join, 직접 capture line과 기존 profile anchor,
  표본 expected/actual 및 보류 사유.
- [Production sidecar](../src/data/unitEntityAdmissions.json): 검증된 count,
  원래 HP, exact main/land, static snapshot, Ultra 선언·검증 방식 및 line references.
- [review.mjs](../tools/wh3-importer/unit-entities/review.mjs)는 원본 HP parser와
  processed-schema fact selector를 재사용한다. commit된 review 숫자를 단독으로
  믿지 않고 `replayHP`를 재실행하여 원본 로그 SHA·complete run·identity·snapshot·
  HealthMax/count 충돌·Ultra를 확인한다. 추가로 custom battle 시나리오와
  campaign context 부재를 요구한다.
- 기존 static 3개 정책은 101개 cohort와 보호 파일을 고정하므로 현재 1,110개에
  맞춰 완화하지 않는다. CLI가 기존 `prepareEvidenceView()`에서 원래 정책 전체를
  replay하고, live review가 해당 byte-pinned 결과와 현재 identity/raw facts를
  대조한다. 기존 HP 13개 모두 일치하지 않으면 admission을 중단한다.

```powershell
node scripts/promote-unit-entities.mjs --check
node scripts/audit-unit-data.mjs
```

`--write`는 새 admission/sidecar만 갱신한다. 원본 `src/data/units.json`, 옛 HP
admission/policy, raw/runtime/source 및 modifier 관련 파일은 변경하지 않는다.
게임 실행, 새 UI 실측 또는 외부 사이트 수치 수집은 이번 작업에 포함하지 않았다.

## Canonical source와 의미

**count:** baseline custom battle의 `CcoBattleUnit.NumEntitiesInitial`이다.
`NumEntities`는 사상자에 따라 변하는 현재 값이므로 source로 사용하지 않는다.
ManList/MountList/EngineList/EntityList 길이를 더하거나 그중 가장 큰 값을 선택하지
않는다. 기존 static 3개에 한해 원래 검증된 `logicalCount`를 재사용한다.

**HP:** 기존 UI `생명력`의 의미인 `entities.totalHealth`를 유지한다. 직접
runtime의 `CcoBattleUnit.HealthMax`를 그대로 보존한다. 남은 현재 HP를 표현하는
`HealthValue`나 캠페인 rank/skill context의 값을 baseline source로 쓰지 않는다.

Static 입력은 다음 processed-schema chain을 따른다. 이름이 비슷한 key를
연결하거나 referenced HP가 없을 때 0으로 채우지 않는다.

| 입력/역할 | 정확한 table/version과 reference |
| --- | --- |
| N | `main_units_tables` v7: `num_men`; `land_unit → land_units.key` |
| B/U/G | `land_units_tables` v54: `bonus_hit_points` / `num_mounts` / `num_engines` |
| M | `land.man_entity → battle_entities_tables` v39: `key`, `hit_points` |
| H | `land.mount → mounts_tables` v10: `entity → battle_entities.key`, `hit_points` |
| E | `land.engine → battlefield_engines_tables` v24: `battle_entity → battle_entities.key`, `hit_points` |
| A | `land.articulated_record → land_unit_articulated_vehicles_tables` v6: `articulated_entity → battle_entities.key`, `hit_points` |

`battle_entities.hit_points`는 각 원본 역할의 HP 입력이다. 그 값 또는
`bonus_hit_points` 자체를 unit-card HP로 승격하지 않는다. 전체 current trace의
구조는 MAN_ONLY 773 / MOUNTED 217 / ENGINE 57 / ARTICULATED 63이다. 구조명은
참조 형태이며 single/multi combat entity 판정이나 계산 허가가 아니다.

**CA raw HP → Production:** 신규 범용 변환은 없다. 직접 10개는 HealthMax 그대로,
기존 static 3개는 이미 승인된 정확한 identity/profile에만 다음 식이 적용된다.

- Spearmen (Shields), Battle Pilgrims: `(B+M)*N = (61+8)*120 = 8280`.
- Blessed Field Trebuchets: `(B+M)*N+(B+E)*G = (45+8)*44+(45+500)*4 = 4512`.

이 식을 새로운 B/count/entity key/attachment profile에 적용하지 않는다.
검증된 infantry에서 합성 per-combat-entity HP × count는 total을 재현하지만,
여러 HP pool이 있는 모든 unit에서 독립적으로 추출한 개체 HP × count라는
범용 의미는 증명되지 않았다. total/count 비율은 새로운 per-entity stat이 아니다.

**size:** 프로젝트의 검증된 HP baseline은 Ultra다. 직접 증거는 ULTRA /
DECLARED_SETUP, static 3개는 RUNTIME_VALIDATED_EXACT_PROFILE이다. Large/Medium/
Small 변환·반올림·최소 count 및 single entity 전용 HP multiplier는 UNKNOWN이다.
`unit_sizes_tables → unit_stat_to_size_scaling_values_tables → modifiable_unit_stats_tables`
의 기존 전역 추출도 raw/base count에 대한 적용 의미를 확정하지 않았다.
`Unit.entities.unitScale`의 `small|large`는 기존 troop 분류이며 게임 Unit Size
설정이 아니다. 새 sidecar에 Ultra를 명시하고 해당 필드에 억지로 저장하지 않는다.

## 표본 expected / actual

아래 actual은 새 materialized Production 값이다. expected는 기존 검증된
원본 runtime 또는 승인된 exact profile이다. 테스트에는 별도로 고정한 13개
expected literal을 사용한다. 7개 race와 여러 구조를 교차검증한다.

| 표본 | 범주 | expected count / total HP | actual count / total HP |
| --- | --- | --- | --- |
| Swordsmen | 일반 보병 | 120 / 8280 | 120 / 8280 |
| Mounted Yeomen | 기병·탑승 | 60 / 5520 | 60 / 5520 |
| Dragon Ogres | 괴수보병 | 16 / 9856 | 16 / 9856 |
| Dread Saurian | 단일 괴수·crew | 1 / 15088 | 1 / 15088 |
| Skeleton Chariots | 전차 | 12 / 7032 | 12 / 7032 |
| Field Trebuchets | 포병 | 4 / 4512 | 4 / 4512 |
| Screaming Skull Catapults | 포병 | 4 / 4356 | 4 / 4356 |
| Plagueclaw Catapults | 포병 | 4 / 5028 | 4 / 5028 |
| Doom-Flayers | war machine | 8 / 6128 | 8 / 6128 |
| Black Coach | 단일 articulated vehicle | 1 / 5980 | 1 / 5980 |
| Spearmen (Shields) | 보병·기존 동일 profile | 120 / 8280 | 120 / 8280 |
| Battle Pilgrims | 보병·기존 동일 profile | 120 / 8280 | 120 / 8280 |
| Blessed Field Trebuchets | 포병·기존 동일 profile | 4 / 4512 | 4 / 4512 |

| 추가 조사 표본 | raw N/B/U/G | expected / actual | 보류 이유 |
| --- | --- | --- | --- |
| Aspiring Champions | 16/608/0/0 | 미확정 / UNKNOWN | Dragon Ogres와 숫자는 같지만 man entity key가 다르다. 숫자 동률은 profile 전이 근거가 아니다 |
| Pegasus Knights | 24/245/24/0 | 미확정 / UNKNOWN | 비행·mount profile의 Ultra baseline 실측과 기여도 검증 없음 |
| Nurglings | 60/147/0/0 | 미확정 / UNKNOWN | swarm의 화면 model과 logical entity 관계를 증명하지 않음 |
| Steam Tank | 3/9052/1/1 | 미확정 / UNKNOWN | mount HP 10; engine/articulation endpoint 일부 미추출. 다른 mount의 HP 8 규칙을 적용할 수 없음 |
| Karl Franz (foot) | 1/4280/0/0 | 미확정 / 보류 | 별도 Lord catalog. main count=1만으로 Ultra HP나 game-size 불변성을 확정하지 않음 |
| Empire Captain (foot) | 1/3680/0/0 | 미확정 / 보류 | 별도 Hero catalog. baseline UI 실측 없으며 rank/skill modifier 값을 대체 사용하지 않음 |

Lord/Hero의 원본 main/land row와 native schema reference도 감사했다. 현재 1,110개
troop Production Units에 이 둘을 새 Unit ID로 삽입하지 않았다. 기존 canonical
Character와 alias를 보존하며 character baseline HP 자체는 UNKNOWN으로 남긴다.

## Artillery / crew / mount와 보류 범위

- **단일/multi:** 판정은 검증된 Initial count에 한정한다. Dread는 N=12지만
  count=1, Black Coach는 count=1, Skeleton Chariots는 N=24지만 count=12다.
  single entity라는 이유로 B 또는 man HP를 그대로 total로 쓰지 않는다.
- **포병:** 검증 4개는 logical count 4. total은 crew와 engine 입력을 포함한
  기존 합산식과 일치한다. 실제 개별 HP pool의 소유 관계까지 증명한 것은 아니다.
  Field의 원본 man HP 8, engine HP 500을 각각 보존하며
  4512/4=1128을 포 한 문의 독립 HP로 승격하지 않는다. artillery 계산과
  Doom-Flayer 계산은 같은 engine 참조 형태에서도 달라 일반화할 수 없다.
- **탑승자:** Dread의 12 riders를 count에 더하지 않는다. named static rider와
  실제 runtime rider override가 다른 사례는 직접 HP/count만 유지한다.
- **articulation/attached entity:** E와 A가 모두 8인 사례의 HP source alias,
  attachment multiplicity, ammo caisson과 personality stats의 활성/소유 의미를
  새로 결정하지 않았다. 동일 count의 component list index를 parent 관계로
  해석하지 않는다.
- **일반 보병·기병·괴수·비행·swarm·새 포병/vehicle profile:** 나머지 1,097개는
  개별 Ultra count와 HP 기여 범위가 증명되지 않아 두 필드 UNKNOWN이다.
  raw 값이 있는 997개 closed primary HP chain도 계산 허가로 보지 않는다.
- **113개 primary trace:** engine endpoint 누락 111, articulation endpoint 누락
  63이며 겹치는 유닛을 제외한 distinct count가 113이다. 기존 HP가 검증된
  경우에도 primary trace의 누락은 별도 기록하며 supplement/direct review를
  참조한다. audit의 각 `unresolvedReferences`에 정확한 raw key와 다음 table/
  field를 저장했다. 다음 조사에서는 `land.engine → battlefield_engines.battle_entity`
  및 `land.articulated_record → articulated_entity/ammo_caisson_entity`를 먼저
  닫고, personality/override가 HP에 실제 기여하는지 확인해야 한다.
- **후천 보정:** difficulty/campaign/technology/skill/item 효과를 적용하거나
  역산하지 않았다. null context의 기존 baseline custom battle만 재사용한다.

## 검증과 변경 범위

새 schema 필드는 필요하지 않았다. 기존 `count/totalHealth/healthPerEntity`
구조에 exact count overlay만 적용한다. adapter가 unit version/원래 HP를 확인하고,
shared identity gate는 검증된 count만 제거하여 기존 collision 검사를 수행한다.
잘못된 count/HP는 제거하지 않으므로 검증을 우회할 수 없다.

관련 테스트는 기존 HP 13개의 고정값 회귀, 전투 개체와 crew/list의 차이,
113개 누락 inventory, 여러 size/context/count/HP 충돌의 fail-closed 동작,
전체 비count 값 보존, 이전 commit 데이터 bytes, UI와 개인 기록 호환성을 검사한다.
실행 결과는 이 작업의 최종 보고 및 아래 검증 기록에서 확인한다.

변경 파일: `tools/wh3-importer/unit-entities/{manifest.json,review.mjs,admission.json}`,
`scripts/promote-unit-entities.mjs`, `src/data/unitEntityAdmissions.json`,
`src/repositories/{unitEntities.ts,gameRepository.ts,unitSharedIdentity.ts}`,
`src/domain/unitValidation.ts`, `src/components/UnitProductionDetails.tsx`,
`scripts/{audit-unit-data.mjs,test.mjs,check-data.mjs}`,
`tests/{unit-entities.test.cjs,unit-localisation.test.cjs,unit-attributes.test.cjs,unit-passives.test.cjs}`,
`README.md`, `docs/{UNIT_DATA_AUDIT.md,UNIT_ENTITY_HP_ADMISSION.md}`.
기존 테스트의 raw equality는 정확한 새 count만 제거한 뒤 계속 모든 옛 필드를 비교한다.

검증 기록:

- 관련 entity/HP + localisation/attribute/passive 테스트: **30 / 30 PASS**.
  기존 HP 13개 모두 고정 expected와 일치했다.
- `npm test`: **722 / 722 PASS**, 현재 앱 99 + 역사적 evidence 623, skip/fail 0.
- `npm run check` → `npm run build` → `npm run check`: 모두 PASS.
  두 check 모두 live admission 및 보호된 과거 replay 17종을 통과했다.
- `npm run check:pages`: route/query/hash 7종 PASS.
- `npm run data:audit-units`: 위 현재 coverage와 23 COMPLETE / Lords 284 /
  Heroes 210 / aliases 15 확인. `git diff --check` PASS.
- build: JS 3,617.44 kB / gzip 354.98 kB. 기존 500 kB chunk 경고만 유지.

Commit 범위는 이 slice의 20개 파일이다. push하지 않는다.
