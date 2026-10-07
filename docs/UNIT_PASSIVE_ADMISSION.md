# 기본 유닛 지속 능력 Production admission

감사 기준은 2026-10-07, 실제 최신 시작 commit `a6cd508`이다. 기존 ability extractor,
processed schema/trace/factSelectors/normalizer, admission 및 `Unit.passiveAbilities?: string[]`를 읽었다.
직전 attribute에서 제외한 416개 ability를 모두 passive로 취급하지 않았다.
현재 JSON을 다시 집계한 작업 전 수치는 Production 1,110, passive 목록 5 / UNKNOWN 1,105다.
기존 legacy mapping의 약 28개 trace 후보 수를 현재 Production 수치나 최종 승격량으로 사용하지 않았다.

## Coverage

| 항목 | Before | After |
| --- | ---: | ---: |
| 지속 능력 목록 저장 | 5 | 1,105 |
| 목록 UNKNOWN (필드 생략) | 1,105 | 5 |
| 실제 지속 능력 1개 이상 | 5 | 832 |
| 확인된 빈 목록 `[]` | 0 | 273 |

기본 보유 목록 COMPLETE **1,046** / PARTIAL **64**다.
PARTIAL 64개 중 59개에는 안전한 보유 능력만 저장하고, 5개는 확정된 보유 능력이 없어 필드를 생략한다.
COMPLETE는 검토한 snapshot의 기본 `land_units_to_unit_abilites_junctions` 보유 목록 기준이며,
항상 활성화됨이나 발동 조건/효과 계산의 완결을 뜻하지 않는다.
모든 ability의 activation은 **NOT_EVALUATED**다.
숨겨진/해금용/분류 충돌 raw key를 제외했다고 이 목록이 모든 캠페인 획득 능력을 포함한다고 주장하지 않는다.

distinct canonical passive **252종**, 승격 raw passive **254개**다.
전체 **416 raw ability key / 1,072 distinct land-unit group / 2,013 unit-ability junction**을 처리했다.
추가 조사에서 모든 416개에 실제 `unit_special_abilities` record가 있고,
264개 source passive는 모두 `passive=true`와 일치했다.
기존 passive 5개 유닛의 canonical ID 및 기존 배열 순서를 그대로 유지한다.

## 원본 분류와 소유권

| 분류 | distinct raw key | 판정 |
| --- | ---: | --- |
| `source_type=passive`, `passive=true` | 264 | 254 승격 가능, hidden 5 / campaign unlock 5 보류 |
| `source_type=active`, `passive=false` | 104 | 액티브로 제외 |
| `source_type=unit`, `passive=false` | 3 | 비지속 unit-source 능력으로 제외 |
| `source_type=bound`, `passive=false` | 41 | bound로 제외. 모두 주문이라고 추측하지 않음 |
| `source_type=spell`, `passive=false` | 2 | 주문으로 제외 |
| `source_type=active`, `passive=true` | 2 | type/flag 충돌 HOLD |

CA active로 제외한 것은 **104개**이며 Lance formation 등을 포함한다.
비지속 unit-source **3개**를 별도로 제외했다.
active로 선언된 raw key 자체는 106개지만 그중 충돌 2개는 별도 보류하므로 숫자를 섞지 않는다.
주문 source 2개는 `wh3_dlc27_spell_mists_the_writhing_mist_bound`,
`wh3_twa08_spell_bound_heart_of_winter_elemental_bear_ror`다.
`wh3_main_mount_bound_celestial_comet` 등 bound 41개는 별도 제외 집계다.

승격 근거는 기존 Production의 exact main ID → land ID → **직접** ability junction →
`unit_abilities` → `unit_special_abilities`다. 실제 processed schema의 모든 해당 참조를 검사한다.
unit ability의 `type`은 schema가 설명하는 UI 분류이고 passive flag의 대체 근거로 사용하지 않는다.
`source_type`의 실제 enum 정의 및 특별 능력 record의 passive boolean이 모두 일치해야 한다.
기존 1,009개 roster trace의 reachable ability facts와 전체 direct query의 키 집합도 대조한다.
기존 101개는 같은 pinned roster의 exact main/land 및 직접 query에서 검증한다.

`requires_effect_enabling=true`는 schema상 캠페인 skill/effect 데이터로 enable되기 전에는
보이지 않는 능력이다. 기본 junction은 이 경우 사용 가능성만 보여 주므로 기본 보유로 승격하지 않는다.
campaign `effect_bonus_value_unit_ability_junctions` **132개**는 외부 grant 참조로 보존하지만
소유권 facts에는 사용하지 않는다. 스킬·아이템·연구·건물·캐릭터/mount 추가 branch를 소유권으로 따라가지 않는다.
이들은 기본 record에 직접 연결되지 않으면 목록에 복사될 수 없다.
다른 main/land가 같은 표시 이름을 가진다는 이유로 부모나 군주 mount의 능력을 가져오지 않는다.

반대로 `wh_main_lord_passive_the_blessing_of_the_lady`처럼 key 이름에 lord가 있어도,
현재 기본 기사 land record에 직접 연결되고 해금 플래그가 꺼져 있으면 보유 근거가 확실하다.
prefix로 제외하거나 모든 lord-named ability를 캠페인 능력으로 간주하지 않는다.
기존 blessing 소유권도 이 방식으로 유지한다.
특정 culture assignment는 default ownership으로 추측하지 않는다. 현재 passive direct 연결은 모두 기본 `*`이며,
이번 source의 단 하나 specific culture 연결은 비지속 Seismic Snare다.
AI usage metadata 역시 그 자체로 AI 전용임을 뜻하지 않으며 키 이름만으로 AI/internal을 분류하지 않는다.

## 조건부 보유와 원본 graph

- Frenzy는 기본 연결 + passive type/flag로 보유를 증명하고
  `morale_is_lower_than_half_of_base_morale` deactivate flag, 공유 phase 및 여러 stat-effect rows를 보존한다.
  현재 리더십이나 항상 발동 여부, 공격/돌격 수치를 계산하지 않는다.
- Regeneration identity와 실제 회복 phase는 분리해 보존한다. phase의 HP-change raw fields를
  Unit의 HP나 회복량으로 materialize하지 않는다.
- Martial Prowess/Mastery의 HP flag, Murderous Prowess/Mastery의 phase,
  Realm of Souls 각 tier, Battle Harmony Yin/Yang의 proximity flag도 기본 보유가 증명되면 목록에 포함한다.
  threshold의 표시 변환, tier의 현재 활성 여부, 팩션 전체의 버프 적용은 하지 않는다.
- Warp-Fueled Rampage (`wh3_dlc29_unit_passive_carnage`) 같은 **native passive ability**의 보유는
  해당 type/flag 및 기본 unit 연결로 증명한다. 직전 attribute의 `rampage` 상태 HOLD는 그대로 유지한다.
  passive 보유 사실을 현재 광란 상태로 바꾸거나 `Unit.attributes`에 복사하지 않는다.
- 원본 special ability 416 rows, passive phase junction 267 rows, transitive contact phase 259 rows,
  stat effect 326 / attribute effect 39 rows, condition flag와 behaviour/UI collection 참조를 저장했다.
  원본 phase order/target booleans/multiple phases 및 raw flags는 admission graph에 유지한다.
  해당 phase의 attribute 효과는 효과 참조일 뿐 기본 attribute 소유권이 아니다.
- Behaviour enum target `special_abilities_specific_behaviour_types`는 reviewed RPFM schema에 대응 정의가 없다.
  source의 `unresolvedReferences`에 기록하고 raw behaviour string을 유지한다.
  소유권/type는 증명되므로 목록에 넣을 수 있으나 engine behaviour나 발동식을 추측하지 않는다.
- superseded set/element, parent ability, activated projectile 등 원본 special/ability 참조를 source에 보존한다.
  해당 참조를 유닛의 새 능력 소유권으로 전이하지 않는다. 효과 수치 계산 엔진은 변경하지 않았다.

## Canonicalization과 attribute 중복 방지

[Exact mapping 254개](../tools/wh3-importer/unit-passives/mappings.json)는 raw key, canonical ID,
CA English/Korean name 및 검증용 signature를 명시한다. mapping/source hash pin은 임의 drift를 거부한다.
이름을 slug로 바꾸거나 prefix를 잘라 자동 alias를 만들지 않는다.
기존 `regeneration`, `crumbling`, `disintegrating`, `blessing_of_the_lady`, `wounds` ID를 유지하며,
Frenzy → `frenzy`, Martial Prowess → `martial_prowess`, Harmony → `battle_harmony_yin/yang` 등은 exact key alias다.
그 외 새 명시적 alias가 없는 variant는 정확한 raw key를 canonical ID로 유지한다.

Guardian의 `wh2_dlc09_unit_passive_guardian`, `wh2_dlc10_unit_passive_guardian`,
`wh_pro04_unit_passive_guardian`은 **guardian**으로 묶는다.
동일 이름, 실제 type/flag, 공유 exact phase `wh_pro04_unit_passive_guardian`,
대상/조건 참조 및 원본 식별자·표시 필드를 제외한 special fields가 일치함을 replay한다.
서로 다른 engine unique ID, icon 및 UI AOE display 값은 삭제하지 않고 source에 남긴다.
어떠한 range/duration/target/condition/phase reference 차이도 정규화로 감추지 않는다.
합쳐진 canonical 목록에서도 facts는 각 raw variant를 계속 보존한다.

종족별 Daemonic Instability/Banished!, Crumbling/Disintegrating, Abandon Ship,
Spawn-Kin 등 같은 영문 표시 이름은 alias 근거가 아니다. phase 또는 non-display fields가 다르거나,
CA 한국어 identity 이름이 다르면 별도 ID를 유지한다.
Tomb Kings와 Construct의 일부 Crumbling/Disintegrating은 공유 phase/signature가 같지만,
CA 한국어가 각각 붕괴/해체 및 분해/붕괴로 다르다. 공유 효과만으로 표시 identity까지 동등하다고 추측하지 않았다.
현재 Daemonic Instability 5종은 서로 다른 canonical identity다.
기존 Khorne canonical alias는 유지하며 다른 종족을 그 ID로 병합하지 않았다.

252개 canonical passive와 기존 attribute 50개 간 ID overlap **0**,
native attribute key 및 active list와의 중복도 **0**이다.
기본 attribute Yin/Yang과 조건부 Battle Harmony 능력은 별도 native 정의/참조로 보존한다.
CA UI collection은 표시 묶음이지 attribute/ability 동의어가 아니다.

## 보류 raw key

| key | 이유 | 연결 유닛 수 |
| --- | --- | ---: |
| `wh2_dlc15_unit_abilities_exploding_unit` | active source / passive=true 충돌 | 3 |
| `wh3_dlc26_unit_abilities_blow_apart` | active source / passive=true 충돌 | 2 |
| `wh2_dlc15_unit_passive_rubble_and_ruin_tier_1_bombardment` | UI 전체 hidden, 내부 실행 역할 | 2 |
| `wh2_dlc15_unit_passive_rubble_and_ruin_tier_2_bombardment` | UI 전체 hidden, 내부 실행 역할 | 2 |
| `wh2_dlc15_unit_passive_rubble_and_ruin_tier_3_bombardment` | UI 전체 hidden, 내부 실행 역할 | 2 |
| `wh2_main_faction_abilities_murderous_prowess_indicator` | UI 전체 hidden indicator | 33 |
| `wh3_dlc27_unit_passive_split_up_hidden` | UI 전체 hidden, 표시 identity 미확정 | 1 |
| `wh3_dlc23_unit_passive_hellbound` | effect enabling 필요, 기본 보유 미확정 | 10 |
| `wh3_main_lord_passive_fetid_stench` | effect enabling 필요 | 2 |
| `wh3_main_lord_passive_glamour_of_slaanesh` | effect enabling 필요 | 2 |
| `wh3_main_lord_passive_seer_of_destiny` | effect enabling 필요 | 2 |
| `wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade` | effect enabling 필요, 기본 blessing과 별개 | 7 |

중복 연결이 있어 distinct PARTIAL은 64개다.
UNKNOWN 5개는 Pegasus Knights, Knights of the Realm, Questing Knights 및 후자 두 RoR의 exact unit IDs다.
원본 ID는 admission의 `status=PARTIAL`이고 `passiveAbilities`가 생략된 5개 entry에 기록했다.
원본의 bare Loc 참조도 정확히 존재하는 key만 따라간다. 이번 승격 가능한 254개의 이름은 모두 CA Korean Loc으로 확정됐다.

## 변경 파일과 호환성

- `scripts/extract-unit-passives.mjs`, `scripts/promote-unit-passives.mjs`
- `tools/wh3-importer/unit-passives/{source.json,mappings.json,review.mjs,admission.json}`
- `src/data/unitPassiveAdmissions.json`, `src/repositories/unitPassives.ts`
- `gameRepository.ts`, `unitSharedIdentity.ts`, `unitLabels.ts`, `unitValidation.ts`, `UnitProductionDetails.tsx`
- `scripts/{test,check-data,audit-unit-data,data-status}.mjs`
- `tests/unit-passives.test.cjs`, 기존 `unit-attributes`/`unit-localisation` 회귀 테스트
- README, 유닛 감사 및 이 보고서

`Unit.passiveAbilities?: string[]`를 재설계하지 않는다. 기존 sidecar admission 구조로 repository가 목록만 materialize한다.
UI는 CA 한국어 identity와 canonical/raw key 출처, PARTIAL/UNKNOWN/확인된 빈 목록을 보여 준다.
기존 전체 Unit의 나머지 필드를 직전 이름/attribute projection 결과와 deep equality로 대조한다.
기존 source JSON, raw units, 한국어 이름 1,110개, attribute 1,107개 / UNKNOWN 3 / 849 COMPLETE / 261 PARTIAL,
기존 스탯/ID/순서, 23 COMPLETE roster, Character canonical/alias, HP/speed admissions는 byte contract를 유지한다.
개인 문서·즐겨찾기·최근 기록 및 v1 backup의 ID/storage schema는 변경하지 않았다.
shared collision gate는 정확한 passive overlay만 원래 목록으로 복원한 뒤 기존 전체 record equality를 검사한다.

source SHA256 `4e6df2a96af6038d8e684fae699a4eae9a7356adfeadc480a805f91d39f626cb`,
mapping SHA256 `963d42c6f403e6beb2acefa5e10eb8218748f2927baae06ca2cbbdafab4ce4b2`.
기존 membership source, db/en/schema reviewed snapshot WH3 9.0.2.0 및 Korean pack hash도 그대로 요구한다.
추가 bounded source는 DB 1,768 / Loc 1,062 rows다. 게임 실행이나 게임 pack 쓰기는 없다.

## 검증

```text
node scripts/promote-unit-passives.mjs --check
npm test
npm run check
npm run build
npm run check
npm run check:pages
```

추출은 로컬 WH3/RPFM에서 수행하지만 커밋된 source/trace/fact/admission replay는 게임이 없는 checkout에서도 동작한다.
관련 tests는 먼저 `tsconfig.test.json` 컴파일 후 실행하며 `npm test`가 컴파일을 포함한다.
새 tests는 전체 Unit 회귀, 기존 byte contract, 기본 소유권과 외부 grant 분리, 조건부 graph,
alias equivalence/variant 차이, source/schema/mapping drift, UNKNOWN 및 UI, 기존 개인 기록 복원을 검증한다.
관련 ability/data tests **50개**, 전체 **715개 (live 92 + historical 623)** 통과. 실패/skip 0개다.
새 passive tests 11개는 보유/조건/종류의 구분, exact alias 및 별도 variant identity, 현재 유닛 전체 회귀,
source/schema/Loc/mapping/소유권 drift 거부, shared identity gate, 중복 validator 및 개인 기록 복원을 검증한다.
`npm run check → npm run build → npm run check` 및 `check:pages`도 통과했다.
두 check 모두 현재 passive/attribute/localisation/roster admission과 기존 17개 historical replay를 실행했다.
Pages route/query/hash roundtrip 7개와 built assets 검사도 통과했다.
기존 Windows 설치/복구 보호 테스트도 통과했으며 보호 장치는 변경하지 않았다.
빌드의 기존 500 kB 초과 bundle 경고는 유지되며 이번 slice에서 구조 개편을 하지 않았다.
