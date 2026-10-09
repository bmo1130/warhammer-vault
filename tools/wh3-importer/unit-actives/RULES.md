# 유닛 기본 액티브 능력 Production 승격

CA 9.0.2.0, 기준 commit `865b04365c3cfaa88b78499226d93e4ae709bf3d`. 이번 변경은 액티브·귀속 보유 목록 overlay 하나이며 기존 모든 데이터 JSON을 hash로 고정한다. commit만 수행하고 push하지 않는다.

## Coverage

| 지표 | before | after |
| --- | --- | --- |
| 목록 저장 | 5 | 1107 |
| UNKNOWN | 1105 | 3 |
| 일반 액티브·토글 보유 | 5 | 148 |
| BOUND 보유 | 0 | 24 |
| 양쪽 중 하나 이상 보유 | 5 | 171 |
| 양쪽 모두 확인된 빈 목록 | 0 | 936 |

신규 승격 **1102개**. COMPLETE 1103, PARTIAL 4, UNKNOWN 3. 빈 목록은 COMPLETE에 포함하며 UNKNOWN을 빈 배열로 대체하지 않는다. 일반 액티브만 비어 있고 BOUND가 있는 23개도 별도 보유 목록으로 확인했다.

| 구조 | 기존 | 승격 후 | 신규 |
| --- | --- | --- | --- |
| ACTIVE_OR_TOGGLE_ONLY | 5 | 147 | 142 |
| BOUND_ONLY | 0 | 23 | 23 |
| ACTIVE_AND_BOUND | 0 | 1 | 1 |
| CONFIRMED_EMPTY | 0 | 936 | 936 |
| UNKNOWN | 0 | 3 | 0 |

## 확정된 참조와 분류

`main_units_tables.unit → land_unit → land_units_tables.key ← land_units_to_unit_abilites_junctions_tables.land_unit → ability → unit_abilities_tables.key` (CA 원본의 abilites 오타 유지). 기본 membership 1,072 land 그룹 / 2,013 junction / 1,110 main identity. 별도 대표 재추출은 실제 main v7 / land v54 processed schema FK를 확인한다. 탈것·변형도 해당 main의 실제 land 연결만 사용하며 본체·탈것·Character catalog 능력을 이름이나 parent로 합산하지 않는다. main/land/mount schema inventory에 별도의 자동 ability 상속 필드는 확인되지 않았다. Character 군주·영웅 catalog는 독립 identity이며 이번 작업으로 변경하거나 Unit에 복사하지 않았다.

`unit_abilities.source_type → unit_ability_source_types.key`, `unit_special_abilities.key → unit_abilities.key`, `unit_abilities.type → unit_ability_types.key`를 함께 검증한다. native source_type active/unit + passive=false + public/unlocked default assignment가 일반 액티브 경로다. native bound + passive=false는 별도 BOUND 목록이며 귀속 주문·능력 분류다. UI type은 폭격·강화 등 효과의 표시 분류이며 ownership/active/passive 분류를 대체하지 않는다. source_type=spell인 2개는 이름·mana=0·횟수 제한만으로 BOUND라 가정하지 않는다.

TOGGLE은 `unit_special_ability_to_special_ability_toggle_groups_junctions.unit_special_ability → unit_special_abilities.key` 및 `special_ability_toggle_groups → special_ability_exclusive_toggle_groups.key`의 명시적 연결 9개(3그룹), 또는 이미 검증된 formation 구조(type=formation, formation 참조, 자기 대상, 무한 active/phase)의 랜스 1개다. 총 10개 native key / 17개 Unit. 무한 지속 브레스는 ACTIVE이며 지속시간만으로 토글로 만들지 않는다. 그룹 없는 자기 무한 효과 Thunderburner는 제어 의미가 불확실해 보류한다.

원본 416 key 중 비지속 후보 152개를 처리했다. native 분류 승인 ACTIVE 94 / TOGGLE 10 / BOUND 41. registry canonical 145개(104 일반/토글 + 41 BOUND) 중 Production 기본 보유로 승인된 distinct 일반/토글 **103**, BOUND **41**이다. 1개 일반 identity는 문화 제한 연결만 있어 기본 보유로 승격하지 않았다. 추가 소유권은 발생하지 않는다.

## 조건·후천적 능력·숨김

`special_ability_to_special_ability_phase_junctions → special_ability_phases`와 invalid_usage / auto_deactivate / invalid_target / recharge_context flags 및 원본 behaviour/parent 참조를 보존한다. 쿨다운·횟수·생명력·비행 상태 등은 ownership과 독립이다. 활성화 상태는 NOT_EVALUATED이며 효과 수치·DPS·최종 전투 상태를 계산하지 않는다. behaviour enum 중 일부 schema 대상이 없는 기존 제한은 효과 의미 해석에만 영향을 주며 직접 ownership 근거로 사용하지 않는다.

`requires_effect_enabling=true` 7개는 기본 해금으로 인정하지 않는다. `is_hidden_in_ui=true` 6개는 public 목록에서 제외하고 raw identity를 audit에 보존한다. passive=true/native passive 일치 254개는 기존 지속 slice가 처리한다. 기존 passive의 숨김/해금 보류 판단과 projection은 전부 보존했다. AI usage 값은 AI의 사용 참고값이므로 그것만으로 사람 조작 불가/내부 능력으로 분류하지 않는다.

외부 `effect_bonus_value_unit_ability_junctions` 45개와 `unit_set_unit_ability_junctions` 58개는 추가 grant/scope 참조로만 보존한다. 스킬·아이템·연구·건물·팩션·캠페인/battle-context grant는 기본 목록을 만들지 않는다. optional custom-battle upgrade 표시 플래그는 토글 제어 플래그가 아니며 native 기본 land assignment와 캠페인 unlock 플래그를 별도로 검증한다.

## Canonical·Loc·provenance

기존 app alias `lance ← wh_dlc07_unit_formation_lance`를 유지했다. 신규 key 간 alias 병합은 완전한 정의/runtime/phase/condition signature와 공식 KO/EN 이름이 일치하는 경우만 허용했으며 이번 자료에는 추가 병합이 없다. 동명 Frost Breath, Soulblight, Fiery Breath 등 서로 다른 구조는 독립 ID다. active/bound/passive/attribute canonical 및 각 Unit 목록의 중복 **0**.

공식 KO/EN registry 이름 145/145; Production에서 소유한 144개 canonical도 전부 한영 이름을 제공한다. Loc onscreen_name을 정확한 raw key로 찾고 {{tr}} 참조를 검증한다. 표시용 CA icon markup만 제거하고 원문/Loc row ID는 보존한다. 한국어 이름과 영어 이름으로 Unit 검색을 확장했다.

source SHA256 `424b116cd5817837f8c3be89283e633e5a37de62b3cbe0dd8c959a241d2fab07`; membership SHA256 `7d99580858e1b5ebaebd0561be0603d67abde8984cb6903aae39e435fe495044`; passive source SHA256 `4e6df2a96af6038d8e684fae699a4eae9a7356adfeadc480a805f91d39f626cb`; Korean pack SHA256 `c8c283ed5ef9c8f1ce1a7437731342829a48048180d8890b1cf640fa1721426d`. CA db.pack/local_en.pack 및 schema SHA는 source.json.provenance에 고정되어 있다. 모든 admission은 UnitstableID/mainKey/landKey/rawCAkey/canonicalID/row ID와 assignmentCulture를 보존한다. 기본값이 없다는 추정 대신 queried closed membership 및 모든 후보의 분류 종결을 통해 빈 목록을 확정한다.

## 독립 검증

기존 별도 per-unit BFS trace 1009개와 배치 inventory expected/actual이 모두 일치했다. 실제 CA pack을 별도 eq query로 재추출한 14개 대표 표본도 main/land/junction/ability/special의 exact raw row 및 분류/Production 표시가 일치한다. 상세 표는 REPRESENTATIVES.md와 admission.json에 있다. 새 ability UI 카드 실측 표본은 없으며 원본 재추출을 게임 카드 실측이라고 표기하지 않는다. 신규 UI 표시 검증은 앱이 승인된 목록을 표시하는지 확인하는 검증이다.

## 변경 파일과 검증

- tools/wh3-importer/unit-actives/: 범위 제한 추출·독립 표본·고정 source/manifest·분류·audit·보고서
- src/data/unitActiveAdmissions.json: 독립 최소 projection; 기존 데이터 JSON 변경 없음
- src/domain/unit.ts, unitValidation.ts, unitLabels.ts: boundAbilities 최소 확장, 충돌 검증, 공식 이름
- src/repositories/unitActives.ts, gameRepository.ts, unitCatalogRepository.ts, unitSharedIdentity.ts: overlay/정확한 역변환·한영 검색·기존 collision guard
- src/components/UnitActiveDetails.tsx, UnitProductionDetails.tsx: 일반/토글/BOUND/빈 목록/보류 상태·조건·출처 표시
- scripts/promote-unit-actives.mjs, check-data.mjs, test.mjs, audit-unit-data.mjs 및 관련 tests: 재현 gate와 기존 assertion을 유지하는 exact inverse

검증 명령과 최종 결과는 VALIDATION.md에 기록한다. HP986/entity1071/speed908/5저항1110/attribute1107/passive1105/기존 사격·모집/23 COMPLETE roster/이름·alias·개인 문서·IME 구현은 보존했다.
