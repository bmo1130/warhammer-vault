# Bretonnia self-scope audit

**최종 판정 C — 별도 Character Combat Calculator 프로젝트로 분리 권장.**
추천 architecture는 Option B다. Ordinary Unit Calculator의 다음 구현 blocker로 self scope를
선정하지 않는다. 전설군주·영웅 빌드와 밸런싱에는 가치가 있으나 identity/profile/mount와 적용 도메인이 필요하다.
이번 작업은 audit만 수행했으며 production behavior, model, path, admission을 변경하지 않았다.

기준 커밋 `1e3323b5b49a82c8b2a5911191f0faf99b30ef45`, WH3 `9.0.2.0`.
기존 515개 파일을 manifest로 보호한다. multi-rank는 재조사하지 않았으며 runtime 판정 UNKNOWN을 보존한다.

## 596의 실제 의미

기존 full pipeline의 `scope.target === character` / SELF_CHARACTER_SCOPE 596 junction 전부를 조사했다.
각 junction은 한 번만 집계한다. 동일 effect의 agent별 route fanout이나 weapon strength의 base/AP 두 route를
여러 junction으로 세지 않는다. 대상은 171 Skill / 205 distinct effect이며 Skill 분포는 single-rank 106 / multi-rank 65다.

| Taxonomy | Junction | Source 근거 / 의미 |
| --- | ---: | --- |
| CHARACTER_COMBAT_STAT | 77 | unit-set numeric bonus와 basic health bonus. 직접 전투 stat의 source intent |
| CHARACTER_CAMPAIGN_STAT | 176 | 영웅 행동 확률·비용·실패, 경험치, 시야, campaign 이동·부상 회복 |
| ABILITY_OR_PASSIVE | 294 | 주문/능력 enable·overcast·cost·cooldown·miscast, attributes, poison phase, spell mastery |
| MOUNT_OR_EQUIPMENT | 27 | 동일 Skill/rank ancillary grant → category mount → provided_bodyguard_unit |
| FORCE_OR_ARMY_INDIRECT | 12 | aura 5, forcewide Hero XP 3, 전투 승리 후 campaign movement 1, night battle 1, interception 2 |
| NON_NUMERIC_OR_NON_UNIT | 9 | 명칭 추가 6, immortality 3 |
| MIXED_CHARACTER_AND_UNIT | 0 | 한 junction의 typed route에서 상충하는 도메인이 확인된 사례 없음 |
| UNKNOWN | 1 | Louen Grail Vow dummy: typed execution route가 없어 의미 확정 불가 |
| 합계 | **596** | 상호 배타적 primary taxonomy |

Numeric raw value가 있다는 사실은 Unit numeric stat이라는 뜻이 아니다. spell cost/cooldown도 이 audit에서는
기존 UnitStatPath의 base-stat modifier로 취급하지 않는다. Aura/agent action은 상황에 따라 Unit/army에 영향을
줄 수 있지만 unconditional ordinary Unit modifier로 바꾸지 않는다. Campaign hero action의 army-assist 결과도
campaign mechanic이며 별도 outcome 실행은 미검증이다.

이 집합이 모두 엄밀한 자기 자신 적용은 아니다. scope는 `character_to_character_own` 591개,
`character_to_character_own_spellcaster_text` 2개, `general_to_character_own_forcewide_heroes_only` 3개다.
마지막 3개는 지휘 Lord가 아니라 force의 Hero characters가 target이다. `unit_set = all_units`라는 filter가 있어도
character target scope를 army 전체 Unit target으로 바꾸지 않는다.

## Numeric 전투 후보와 증거 수준

| Measure | Count |
| --- | ---: |
| Direct character-combat numeric candidate junction | **77** |
| Distinct Skill / effect | **41 / 14** |
| Candidate Skill single-rank / multi-rank | **24 / 17** |
| Existing UnitStatPath로 구조상 표현 가능한 junction | **77** |
| 새 numeric path를 요구하는 candidate junction | **0** |
| 기존 Unit arithmetic operation 근거를 재사용 가능한 junction | **53** |
| Operation 미검증 junction | **24** |
| Exact static owner key 확보 | **77** junction / **13** subtype |
| 기존 safe owner가 하나 이상 있는 junction | **46** |
| Runtime owner blocker가 있는 junction | **31** |
| Skill의 모든 effect가 self direct numeric인 Skill | **26** |
| Numeric 외 effect/다른 scope가 섞여 whole-Skill admission이 막히는 touched Skill | **15** |
| 위 touched Skill 중 다른 scope도 포함하는 Skill | **11** |

77은 source의 stat intent가 확인된 후보 수이며 effective Modifier 77개가 증명됐다는 뜻은 아니다.
53의 operation은 기존 Unit-domain reviewed numeric bonus rule의 add/multiply convention이다.
**Character-self applicability, baseline stat admission, mount 유지, rank application을 새로 증명한 수는 0이다.**
24개는 flat charge 7 / resistance 5 / speed 2 / health 10이다. Health의 typed bonus는
`general_bodyguard_size_mod`, localisation은 hit points %. `entities.totalHealth`에 구조상 담을 수 있어도
이 source만으로 health operation/composite semantics를 승인하지 않는다.
Missile base damage/range/ammunition에 해당하는 self numeric junction은 이번 집합에서 확인되지 않았다.
Missile resistance는 별도 defensive resistance다. Aura, miscast, spell intensity를 speculative path로 추가하지 않았다.

Skill 이름은 기존 CA localisation 원문을 보존한다. 일부 이름의 `{{tr:...}}`는 source에 들어 있는
text replacement reference이며 표시명으로 다른 Skill key를 합치거나 owner/identity를 추정하지 않았다.

## 다른 blocker와의 교집합

| 기존 full classifier blocker | Self 596 중 distinct junction |
| --- | ---: |
| MULTI_RANK_UNKNOWN | **423** |
| NON_UNIT_MECHANIC | **464** |
| RUNTIME_OWNER_AVAILABILITY | **201** |
| UNSUPPORTED_* path | **1** — miscast |
| UNREVIEWED operation/semantics/mapping flag | **14** |
| Unsupported path 또는 character aura path | **6** |

교집합은 중복 집계다. 기존 classifier의 labels를 수정하지 않았다. 기존 operation blocker 14는
health 10을 잡지 않으므로, refined numeric 후보의 미검증 operation은 24다.
Unsupported path 1은 numeric combat path 부족을 뜻하지 않는다. 능력의 miscast mechanic이다.

## Coverage — strict current gate와 미래 조건을 구분

**self scope 하나만 해결했을 때 현재 Ordinary Unit Calculator의 즉시 complete admission: 0 Skill / 0 effect.**
character profile/base stat, target applicability와 production registry가 없기 때문이다.
기존 full pipeline의 one-blocker counterfactual 역시 0이다. 이 audit은 classifier를 약화하지 않는다.

아래는 별도 Character domain/base-profile/admission gate가 새로 증명·도입된다는 조건의 후보 수다.
현재 admission 수가 아니며, whole-Skill numeric-only 정책을 유지한다.

| 미래 지원 단계 | Complete Skill | Distinct effect | Junction |
| --- | ---: | ---: | ---: |
| 최소: single-rank + existing verified arithmetic + direct numeric only | **2** | **2** | **2** |
| Existing numeric path만 확대 | **2** | **2** | **2** |
| 위 domain + bounded resistance operation까지 별도 검증 | **5** | **4** | **6** |
| Mount/context, runtime owner/background, multi-rank와 모든 numeric operation까지 해결 | **26** | **11** | **58** |

기존 path에 모든 numeric 후보를 표현할 수 있으므로 path 추가만으로 coverage는 늘지 않는다.
전체 41 Skill 중 15개는 다른 effect 때문에 partial policy 변경 없이는 numeric 부분만 admission할 수 없다.
따라서 모든 numeric self blocker를 해결해도 여기서 계산한 whole-Skill 상한은 26이며 596을 그대로 기회 규모로 쓰지 않는다.
Ability/campaign/mount-unlock까지 포함한 모든 self mechanic 지원은 이 numeric calculator 상한을 넘어서는 별도 제품 범위다.

최소 2개는 exact key가 다른 starter Blade Master와 Lance of Bretonnia다.

| Key | Rank 1 source | 허용 가능한 static owner subset |
| --- | --- | --- |
| wh_main_skill_all_all_self_blade_master_starter | melee attack +5 | Repanse, Alberic, generic Lord, Louen, Paladin의 exact subtype keys |
| wh_main_skill_brt_lord_unique_general_lance_formation | charge bonus +9% | wh_dlc07_brt_alberic / wh_main_brt_lord |

첫 Skill의 Henri owner는 runtime availability가 미확인이라 safe subset에 포함하지 않는다.
표의 값은 실제 계산 결과나 신규 Modifier가 아니라 기존 rank-1 raw source 값이다.
Resistance까지 검증하면 Courageous / Girdle of Gold / Lady’s Mantle가 추가 후보다.

## Exact Lord/Hero → combat identity

기존 committed source에 14개 Bretonnia subtype의 기본 연결이 이미 있다.

`agent_subtypes.key → associated_unit_override → main_units.unit → land_unit → land_units.key`

이는 **static default**의 deterministic FK chain이다. 현재 캐릭터가 battle에서 쓰는 identity는
장착 mount/context까지 입력해야 결정된다. subtype 하나로 모든 state의 Unit을 고정하지 않는다.

| Subtype | Default main = land |
| --- | --- |
| wh2_dlc14_brt_henri_le_massif | wh2_dlc14_brt_cha_henri_le_massif_0 |
| wh2_dlc14_brt_repanse | wh2_dlc14_brt_cha_repanse_de_lyonesse_0 |
| wh_dlc07_brt_alberic | wh_dlc07_brt_cha_alberic_bordeleaux_0 |
| wh_dlc07_brt_damsel_beasts | wh_dlc07_brt_cha_damsel_beasts_0 |
| wh_dlc07_brt_damsel_life | wh_dlc07_brt_cha_damsel_life_0 |
| wh_dlc07_brt_fay_enchantress | wh_dlc07_brt_cha_fay_enchantress_0 |
| wh_dlc07_brt_green_knight | wh_dlc07_brt_cha_green_knight_0 |
| wh_dlc07_brt_prophetess_beasts | wh_dlc07_brt_cha_prophetess_beasts_0 |
| wh_dlc07_brt_prophetess_heavens | wh_dlc07_brt_cha_prophetess_heavens_0 |
| wh_dlc07_brt_prophetess_life | wh_dlc07_brt_cha_prophetess_0 |
| wh_main_brt_damsel_heavens | wh_main_brt_cha_damsel_0 |
| wh_main_brt_lord | wh_main_brt_cha_lord_0 |
| wh_main_brt_louen_leoncouer | wh_main_brt_cha_king_louen_leoncoeur_0 |
| wh_main_brt_paladin | wh_main_brt_cha_paladin_0 |

Generic Lord, Legendary Lord, generic/special Hero는 같은 main/land/weapon/entity source schema를 사용한다.
armour/melee attack/defence/morale/weapon profiles도 기존 Unit의 stat container로 표현할 수 있다.
다만 HP·speed·composite·displayed stat 입증은 현재 ordinary profiles의 승인으로 자동 상속되지 않는다.
Character base/profile 48개는 모두 source audit 자료이며 Production에 하나도 포함되지 않는다: **0 / 48**.

기존 Lord/Hero entity는 source identity나 전투 stats를 갖고 있지 않다. `src/data/lords.json`은 sample
Vampire Counts Lord 2개이며 Bretonnia subtype과 조인할 CA key가 없다. 이름으로 이를 보완하지 않는다.

## Mount: source identity 교체가 실제로 존재

Campaign route:

`character_skill_level_to_ancillaries.granted_ancillary → ancillaries.key → provided_bodyguard_unit → main_units.unit → land_units.key`

Custom battle route:

`units_custom_battle_mounts.base_unit → main_units.unit`, `mounted_unit → 다른 main_units.unit`

추가로 `ancillaries_included_agent_subtypes`의 exact subtype/ancillary 연결을 보존한다.
**Skill grant / custom battle option / included ancillary를 하나의 campaign availability로 합치지 않는다.**
결과는 default 14개와 추가 variant를 포함한 **48 combat source profiles**, campaign Skill mount grant **27개**,
custom-battle mount route **28개**다. 추가 variant union은 34개이며 runtime 사용 가능/장착 여부는 미관찰이다.

Generic Lord의 source 비교 예:

| Exact main key | land melee attack / defence | armour record value | weapon base / AP | mount key |
| --- | --- | ---: | --- | --- |
| wh_main_brt_cha_lord_0 | 54 / 48 | 90 | 290 / 140 | 없음 |
| wh_main_brt_cha_lord_4 | 54 / 48 | 110 | 290 / 140 | wh_main_brt_mnt_warhorse_hero |
| wh_main_brt_cha_lord_3 | 54 / 48 | 90 | 290 / 140 | wh_main_brt_mnt_royal_pegasus_hero |
| wh_main_brt_cha_lord_2 | 52 / 35 | 90 | 150 / 290 | wh_main_brt_mnt_hippogryph_lords |

이 표는 raw DB 비교다. effect를 적용한 실측 stat이나 displayed speed/HP를 계산하지 않았다.
mount는 entity만 바꾸는 것으로 단순화할 수 없다. main/land record, weapon, armour, man/mount entity chain도 달라진다.
또한 모든 Lord가 foot→horse→barded horse→pegasus→hippogryph의 같은 경로를 가진다고 추정하지 않는다.
원본의 grant/key/route가 있는 variant만 나열한다.

따라서 **완전 self 지원에는 명시적인 mount/profile selection이 필요하다.**
정확한 on-foot/profile 하나로 제한한 pilot은 mount transition model 없이 가능하다.
하지만 Skill이 mount 교체 후 계속 붙는지, mount/rider 중 어디에 적용되는지는 **UNKNOWN**이며 이번에 해결하지 않았다.

## Modifier engine 재사용

`src/domain/unitModifiers.ts`는 scope/owner/condition을 처리하지 않고 선택된 numeric modifiers만 계산한다.
산식은 `((set ?? base) + sum(add)) * (1 + sum(percent)/100)`이고 unknown base는 unknown으로 유지한다.
stat path whitelist, 중복 ID 거부, deterministic 순서와 breakdown은 재사용할 수 있다.

기존 `Modifier.targetType`에 lord가 있더라도 Lord object에는 numeric stat container가 없고 Hero target도
완성되어 있지 않다. `caSkillEffect.ts`는 exact ordinary Unit/owner/rank/commanding own force를 선택하는
adapter다. 이 adapter를 character self에 그대로 사용하면 army 대상과 self 대상을 혼동한다.

필요한 것은 별도 CharacterCombatProfile identity와 self applicability adapter다.
Unit의 combat stat container/type과 arithmetic을 공유하되 registry/target을 분리한다.
기존 arithmetic을 general stat-container core로 얇게 분리하거나 검증된 내부 adapter로 재사용할 수 있다.
새 engine을 만들 필요는 없다. 이번 audit에서 그 adapter/core를 구현하지 않았다.
Resistance는 기존 path가 있어도 operation/cap/conditional stacking은 별도 증명이 필요하다.
Research/army Skills/Manual을 새 대상에 복사해서 적용하지 않는다.

## Option 비교와 사용자 가치

| Option | Coverage | 비용 / architecture | 사용자 가치 / 주요 제한 |
| --- | --- | --- | --- |
| A: self 미지원 유지 | 현재 추가 0 | 낮음, 기존 Unit 계약 유지 | army Unit 확인·비교에 집중. Character 빌드/리워크 비교는 포기 |
| B: 별도 Character Combat Calculator | 조건부 최소 2 → operation 검토 후 5 → 모든 numeric blocker 해결 시 26 | 중간~높음. subtype + exact main/land + mount/context + snapshot profile, self 적용 adapter, 별도 UI | 전설군주 리워크/모딩, character 빌드에 높음. mount·rank 선택이 mobile UI를 복잡하게 함 |
| C: Unit model에 Character 통합 | 같은 numeric 상한 26 | 높음. target discriminator, repository/routes/comparison/Profiles/backup 계약 검토 | 미래 save parsing에는 명확한 통합 identity가 도움. 기존 Production/ordinary target 의미 변경 위험 |

사용 사례 관점에서 character combat은 별도 가치가 있다. 특히 Legendary Lord의 무기·방어·mount를
바꾸는 밸런싱은 48개 profile의 정확한 source identity를 비교해야 한다. 게임 중 character 빌드 확인에도 유용하다.
그러나 현재 Unit 비교와 army Research/Skill 계산에 즉시 얻는 coverage는 0이다. mobile에서는
mount/profile/rank 선택을 접고 기본 stat 비교를 우선 노출하는 별도 화면이 적합하다.
이는 제품 목적을 바탕으로 한 architecture 평가이며 사용량/수요가 관측됐다는 주장은 아니다. 로어는 추가하지 않았다.

**추천 C / architecture Option B.** Character Calculator를 별도로 계획하고 초기 pilot을 exact single-profile,
single-rank, 검증된 numeric effect로 제한한다. 현재 self를 풀어서 모든 Character를 Production에 넣는 방식은 피한다.
전투 stat container는 공유하되 character identity와 ordinary Unit membership은 별도 계약으로 둔다.

## NEXT BLOCKER 재평가

기존 NEXT_BLOCKERS.md와 coverage 결과를 수정하지 않고 새 비교를 `next-blockers.json`에 기록했다.

| Blocker | 현재 one-blocker marginal complete Skill / distinct effect | 조건부 proof package | 난이도 / risk / 확장 |
| --- | --- | --- | --- |
| multi-rank | 2 / 5 (12 junction) | 기존 두 Skill runtime 증명 대기 | 중간 / 높음 / rank projection·deactivation |
| self scope | 0 / 0 | 새 Character domain을 갖추면 최소 2 / 2 | 높음 / 높음 / profile·mount·UI |
| runtime owner | 0 / 0 | background/acquisition/lock 조건까지 필요 | 높음 / 높음 / runtime provenance |
| vigour | 0 / 0 | Basic Training 1 Skill / 1 effect | 중간~높음 / 높음 / 새 fatigue parameter 및 base/path |
| replenishment | 0 / 0 | The Army of the King 1 / 1 | 높음 / 높음 / campaign baseline·cap·context |
| resistance operation | 0 / 0 | Secrets of the Grail **1 / 1** | 낮음~중간 / 중간~높음 / 기존 numeric path |
| flat AP operation | 0 / 0 | People's Hero의 replenishment와 whole-Skill blocker가 남음 | 낮음~중간 / 중간 / 기존 AP path |
| conditional selector | 0 / 0 | complete Skill마다 operation blocker도 남음 | 중간~높음 / 높음 / Unit experience predicate context |

one-blocker 숫자가 0인 경우와 mapping/base/path까지 새로 입증하는 package의 조건부 후보 수는 다르다.
`NO_VERIFIED_NUMERIC_MAPPING`은 operation proof가 새 mapping을 만들 때만 함께 제거할 수 있는 파생 blocker다.
아직 증명이 없으므로 표의 어떤 package도 즉시 admission을 뜻하지 않는다.

**multi-rank 실험 대기 중 코드 작업 추천: resistance operation의 bounded source/mapping review.**
첫 대상은 `wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail`, exact owner
`wh_dlc07_brt_fay_enchantress`, own-force single rank [1], effect
`wh_dlc07_effect_force_stat_magic_resistance_battle_pilgrims`다. Production target identity도 이미 있다.
기존 `defense.resistances.spell`을 사용하므로 vigour/campaign replenish/Character domain보다 architecture 확장이 작다.
source와 exact reviewed gate를 준비하되 tooltip의 %만 보고 add/multiply를 고르지 않는다.
percentage-point 의미와 필요한 cap/조건을 입증할 수 없으면 그 다음 작업도 UNKNOWN으로 끝내야 한다.
같은 typed bonus operation은 다른 팩션에도 재사용 후보가 되지만 effect 자체를 자동 admission하지 않는다.

## Artifact와 재현

`inventory.json`의 596 records는 skill dictionary, foreign owner dictionary와 source row ID를 참조한다.
`classification.json`은 record별 taxonomy/operation/path/relevance/blocker를 제공한다.
기존 Skill source 18 MB는 복제하지 않았다. 부족했던 identity/base-stat/mount 연결만 RPFM으로 조회해
`identity-source.json`에 **새 173 rows**, 기존 source **137 row refs**를 보관한다. pack/schema/version은 기존 snapshot과 일치한다.
`identity.json`의 source joins와 raw stats는 admission projection이 아니다.

```powershell
node scripts/review-skill-self-scope-audit.mjs
node scripts/review-skill-self-scope-audit.mjs --check-raw
node --test tests/skill-self-scope-audit.test.cjs
node scripts/review-skill-rank-runtime-resolution.mjs
node scripts/verify-skill-production-bretonnia.mjs
```

첫 명령은 게임/RPFM/generated 없이 committed source로 replay한다. `--check-raw`만 ignored 실제 extraction이 필요하다.
`scripts/extract-skill-self-scope-identity.mjs`는 필요한 FK closure를 다시 조회하는 read-only extractor다.
`--write`는 새 audit 출력/manifest 재생성용이며 historical classifier나 source를 쓰지 않는다.

검증 실행 결과는 `VALIDATION.md`에 기록한다. Production 101 / Sample 5 / HP 13 / Speed 81 /
Research 10·15·96 / admitted Skill 3 / full inventory 226·434·840 / runtime evidence / IndexedDB / backup /
comparison / Modifier engine / 기존 owner·selector·rank research와 runtime UNKNOWN은 모두 보존한다.
