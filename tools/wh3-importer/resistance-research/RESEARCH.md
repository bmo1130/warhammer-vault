# Secrets of the Grail: resistance operation research

**최종 판정 E — 현재 evidence로 UNKNOWN. 신규 admission 0.**

기준 커밋 `673a243196824c97cf5c9ff1fb634cd7fdb3206d`, WH3 `9.0.2.0`.
범위는 Secrets의 exact spell-resistance campaign bonus와 이를 해석하는 데 필요한 source evidence다.
Character Calculator / self scope / multi-rank / mount / Production / Modifier engine은 변경하지 않았다.
게임은 실행하지 않았으며 runtime은 **NOT_OBSERVED**다.

## 1. Exact source chain

| 항목 | Source fact |
| --- | --- |
| Skill | `wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail` |
| Skill source row | `character_skills_tables:acaa6c2b6b0201ded14d` |
| Owner | `wh_dlc07_brt_fay_enchantress` |
| Rank | 1; 전체 Skill effect junction 1개 |
| Effect junction | `character_skill_level_to_effects_junctions_tables:4df13ea8b742a64189e6` |
| Effect | `wh_dlc07_effect_force_stat_magic_resistance_battle_pilgrims` |
| Effect source row | `effects_tables:3cd9aa84acc876fe1e14` |
| Raw value | 20, junction value field `F32` |
| Scope | `general_to_force_own`: character → commanding own force |
| Typed route row | `effect_bonus_value_ids_unit_sets_tables:6a63e128f19095d46275` |
| Bonus identity | `unit_damage_resistance_magic_mod` |
| Unit set | `dlc07_brt_inf_battle_pilgrims` |
| Candidate UnitStatPath | `defense.resistances.spell` |
| Effect priority | 581; processed schema는 UI 목록 순서라고 명시 |
| Current classifier | REVIEW_REQUIRED: `NO_VERIFIED_NUMERIC_MAPPING`, `UNREVIEWED_RESISTANCE_OPERATION` |

Owner의 enabled node → item → set → subtype, permission / prerequisite / restriction 근거를
`trace.json.ownerChains`에 보존했다. Source scope와 exact explicit set materialization도 재사용한다.

| Exact main / land key | Current materialization |
| --- | --- |
| `wh_dlc07_brt_inf_battle_pilgrims_0` | Production `ca_unit_wh_dlc07_brt_inf_battle_pilgrims_0` |
| `wh_dlc07_brt_inf_grail_reliquae_0` | TARGET_NOT_IN_PRODUCTION |
| `wh_pro04_brt_inf_battle_pilgrims_ror_0` | TARGET_NOT_IN_PRODUCTION |

Main→land 및 branch source row를 `trace.json.targetMaterialization`에 기록했다.
누락된 두 target을 이름이 비슷한 Unit으로 치환하지 않았다.
이는 target catalog의 제외이며 Skill effect를 부분적으로 승인하는 정책이 아니다.

## 2. 동일 semantic 비교

동일 이름이나 tooltip 패턴이 아니라 **같은 exact typed bonus**를 기준으로 선택했다.
기존 full source에는 이 spell bonus의 Bretonnia effect가 Secrets 하나뿐이므로,
부족한 비교/UI/phase 자료만 read-only RPFM으로 추가 조회했다. 새 full Skill extraction은 하지 않았다.

| Exact effect key | Queried consumers / raw values / scopes |
| --- | --- |
| `wh_dlc07_effect_force_stat_magic_resistance_battle_pilgrims` | Skill 1 / 20 / `general_to_force_own` |
| `wh2_dlc09_effect_force_stat_magic_resistance_tmb_monster_rank7` | Skill 1 / 15 / `general_to_force_own` |
| `wh2_dlc09_effect_force_stat_magic_resistance_tmb_monster` | Typed route와 definition만 확인; 아래 4개 usage table에는 consumer 없음 |
| `wh2_dlc11_effect_force_stat_magic_resistance_animated_hulks_mournguls` | Research 1 / 20 / `faction_to_force_own_unseen` |
| `wh2_dlc11_effect_force_stat_magic_resistance_cairn_wraith_hex_wraith` | Skill 3 / 5, 10, 15 / `general_to_force_own` |
| `wh2_dlc11_effect_force_stat_magic_resistance_cst_infantry` | Bundle 1 / 15 / `faction_to_force_own` |
| `wh_main_effect_character_stat_magic_resistance` | Skill 48, Research 1, trait 8, bundle 20 / 5, 10, 15, 20, 25, 30, 35, 50 / 7 exact scopes |

총 7 effect, Secrets를 제외한 독립 비교 6개이며, **실제 consumer가 있는 독립 비교는 5개**다.
Consumer rows는 84개다. Source key / row ID / raw value / scope를 `comparisons.json`에 전부 보존한다.
여러 rank row를 관찰한 것이 rank application 의미론을 증명하지는 않는다. 이번에는 이를 조사하지 않았다.

Secrets의 동일 exact effect key는 아래 4개 table에서 Skill 1회만 확인됐다.
Research / trait / bundle의 동일 exact key 사용은 각 0회다. 이 범위를 넘어 전 게임의 모든
effect consumer가 조사됐다고 주장하지 않는다.

- `character_skill_level_to_effects_junctions_tables`
- `technology_effects_junction_tables`
- `trait_level_effects_tables`
- `effect_bundles_to_effects_junctions_tables`

이 bounded 집합의 raw value는 5~50의 양수 정수다. Raw 1 / 0.1 / 음수 사례는 각각 0개다.
정수 표현이나 동일 scope/value는 단위·연산·negative 방향의 proof가 아니다.
모든 비교 effect의 `is_positive_value_good=true`는 UI 색상 규칙이다.
`priority` 또한 UI 순서다. `_mod` 같은 key naming과 localisation의 `%n%`는
ADD / MULTIPLY / SET 결정을 위한 충분한 근거로 사용하지 않았다.
기존 reviewed Unit operation whitelist에는 이 exact bonus의 승인 사례가 **0개**다.
비교 consumer의 실제 before/after 수치도 모두 NOT_OBSERVED다.

## 3. Source가 직접 선언하는 것과 선언하지 않는 것

Secrets의 effect / Skill-value junction / typed unit-set route schema에는
`operation`, `how`, `multiplier`, `add`, `set` field가 없다.
Bonus FK 대상 `campaign_bonus_value_ids_unit_sets_tables`는 이 CA pack inventory에 table file이 0개다.
따라서 source에 없는 bonus 구현을 추정해서 채우지 않는다. 이 조회 결과는
`semantics.json.bonusDefinitionQuery`와 `source.json.coverage`에 남겼다.

같은 표시 stat을 수정하는 별도 ability-phase row에는 직접적인 연산 선언이 있다.

```text
special_ability_phase_stat_effects_tables:08aed4c45d2a15656303
phase = wh3_dlc23_lord_passive_presence_of_the_master_runelord
stat  = stat_resistance_magic
value = 20
how   = add
```

이는 **그 phase row의 ADD 선언**을 직접 증명한다. 그러나 해당 phase table과 Secrets의
campaign unit-set bonus 구현을 연결하는 FK / operation declaration은 확보되지 않았다.
Value 20과 표시 stat이 같다는 사실만으로 다른 적용 경로의 연산을 승계하지 않는다.
Ability activation, stacking 또는 final displayed result도 관찰하지 않았다.
이 구분을 replay와 회귀 테스트로 고정했다.

## 4. Base stat의 저장 단위와 표시 변환

Battle Pilgrims의 exact land row는 `land_units_tables:aac889b5d2f2e7ef8e70`이고
`damage_mod_magic` raw value는 **0**이다. 이 field는 `I32`이며 processed schema는
0=unaffected, −100=double damage, +100=negation으로 설명한다.
즉 원본 damage modifier의 scale은 정수 percentage points에 해당한다.
이것이 현재 표시 Spell Resistance의 exact base와 같다는 변환은 여전히 미확정이다.

현재 자료는 다음을 구분한다.

- **CA raw damage-modifier field:** schema endpoint scale와 raw 0 확인.
- **앱 `UnitResistances` 계약:** 20은 20%, 0.2가 아니라고 `src/domain/unit.ts`에 명시.
- **현재 CA UI label:** `stat_resistance_magic` → Spell Resistance localisation 확인.
- **Raw `damage_mod_magic` → displayed spell resistance:** declarative mapping / executable conversion / 독립 실측 부족, UNKNOWN.
- **Production Battle Pilgrims base:** `defense.resistances.spell` 누락, unavailable. Raw 0으로 보충하지 않음.

기존 `semantics-findings.json`의 resistance 결론과 conservative normalizer gate를 수정하지 않았다.
현재 9.0.2.0 UI label은 새 bounded source에서 확인했지만, 오래된 9.0.1.0 연구의 결론을 소급 변경하지 않았다.

`ui_unit_stats`의 magic row는 min=0, max=100, clamp_displayed_minimum=true,
clamp_displayed_maximum=false다. 이는 UI metadata이며 damage engine의 effective cap,
resistance 종류 간 stacking, raw conversion을 증명하지 않는다. 특정 90%/100% cap을 새 규칙으로 만들지 않았다.

## 5. 기존 engine 적합성

현재 core는 `((set ?? base) + sum(add)) * (1 + sum(percent)/100)`이다.
연산이 각각 입증된다면 ADD / percentage MULTIPLY / SET을 기존 API로 표현할 수 있다.
그러나 현재는 어느 것도 Secrets의 production Modifier로 선택할 근거가 충분하지 않다.
Resistance 전용 산식이나 clamp를 구현하지 않았다.

아래는 **가상의 알려진 baseline에서 기존 engine candidate를 계산한 예시**다.
게임 관찰값도, Production의 누락 base를 채운 값도 아니다.

| 가상 baseline B | ADD raw20 | MULTIPLY raw20 | SET raw20 |
| ---: | ---: | ---: | ---: |
| 0 | 20 | 0 | 20 |
| 10 | 30 | 12 | 20 |
| 50 | 70 | 60 | 20 |
| 90 | 110 | 108 | 20 |

Baseline 0 하나로 ADD와 SET을 구분할 수 없다. 현재 core는 알려진 90에 ADD20을 넣으면
110을 내고 clamp하지 않는다. 만약 실제 필요한 clamp가 확인되면 그 조건에서 core가 정확히
표현 가능한지 다시 판정해야 한다. Clamp가 증명되지 않았으므로 현재 verdict를 D로 단정하지 않는다.
실제 target의 missing base에는 SET을 포함한 모든 연산이 unknown을 유지한다.

## 6. Runtime과 whole-Skill gate

Static만으로 명백한 연산 선언과 검증된 동일 적용 사례가 확보되지 않아 runtime evidence가 필요하다.
이번 작업은 게임을 실행하거나 probe/save/game 파일을 변경하지 않았다.

필요한 후속 관찰은 exact game version / main / land / Fay owner / Skill rank를 확인하고,
다른 조건을 유지한 상태에서 다음을 비교하는 것이다.

1. 독립적으로 확인한 displayed baseline, 가능하면 nonzero baseline 포함.
2. 동일 baseline에서 Secrets rank1 on/off.
3. 동일 bonus의 stacking과 결과가 boundary에 접근할 때의 capture.
4. Display clamp와 effective battle stat의 차이가 있는 경우 이를 구분할 수 있는 evidence.

이 절차는 실제 실행 가능한 save/probe가 준비됐다는 주장이 아니다. 새 범용 runtime framework는 만들지 않았다.
비교 effect의 before/after 또는 내부 bonus operation을 직접 선언하는 추가 source가 확보되면 재검토할 수 있다.

| Whole-Skill 조건 | 결과 |
| --- | --- |
| Rank1 / exact safe owner / supported own-force scope | 확인 |
| Exact static targets / unresolved branch | Production 1 target / unresolved 0 |
| 전체 Unit-stat effect / 기존 path | 1 effect / 기존 spell path |
| Omitted/unsupported Skill effect | 0 |
| Operation / reviewed numeric mapping | 미검증, 기존 blocker 2개 유지 |
| Production displayed spell baseline / raw conversion | 미승인 / UNKNOWN |
| Stacking / effective cap | NOT_OBSERVED |
| Partial admission / effective Modifier | 도입하지 않음 / 0 |

Operation이 나중에 해결돼도 base/conversion gate를 함께 확인해야 한다.
이번에는 Skill / effect / Modifier 모두 신규 admission **0개**다.

## 7. Full pipeline feedback

Bretonnia의 broad resistance 후보는 10 junction / 8 distinct effect다.
이 중 Secrets와 같은 exact spell bonus는 **1 junction / 1 effect**다.
나머지 physical / missile / ward bonus의 operation으로 일반화하지 않았다.

현재 입증으로 해제된 operation junction **0**, 다른 junction **0**.
향후 이 exact bonus가 증명되면 Secrets의 기존 1 junction이 mapping 검토 후보가 된다.
자동 admission은 없으며 현재 다른 동일-bonus junction을 추가로 열었다고 보고하지 않는다.
Full classifier, self audit tiers와 NEXT_BLOCKERS의 historical 결과는 그대로 보존했다.

## 8. Reproduction / preservation

추가 원본은 116 rows다. 기존 source 4 rows는 reference로 재사용하고 새 112 rows만
`source.json`에 보관했다. Version / schema / db.pack / local_en.pack hashes는 기존 snapshot과 일치한다.
Schema와 source provenance, query filter / file count / match count를 보존하며 원본 18 MB artifact를 복제하지 않았다.

```powershell
# Actual pack query only; optional, ignored raw output. Requires existing RPFM config.
node scripts/extract-resistance-research.mjs
# Ordinary replay requires only committed artifacts; no game / RPFM / generated / Git.
node scripts/review-resistance-research.mjs
# Optional actual extraction hash check.
node scripts/review-resistance-research.mjs --check-raw
node scripts/review-skill-self-scope-audit.mjs
node scripts/review-skill-rank-runtime-resolution.mjs
node scripts/verify-skill-production-bretonnia.mjs
```

Replay verifies 532 baseline file hashes and deterministically rebuilds trace / comparisons / semantics / feedback.
`--write` writes only this new research artifact's four outputs and output hashes.
Historical data, classifier, operation policy and app sources are not written.

Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 / admitted Skill 3 /
full inventory 226·434·840 / Character self audit / multi-rank UNKNOWN / runtime-resolution artifact /
Modifier engine / IndexedDB / backup / comparison are preserved. No browser smoke is required because
Production admission and behavior changes are zero. Validation results are in `VALIDATION.md`.
