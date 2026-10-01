# Representative WH3 batch pilot

현재 승격 판단은 [PARTIAL 필드 그룹 review](promotion/PARTIAL_REVIEW.md)를 사용합니다. 아래 9.0.1 기록과 저장된 pilot 상태는 역사 자료입니다. PARTIAL 자체는 유닛 전체의 production 거부 조건이 아니며, 검증된 부분집합을 생략·provenance gate로 별도 승인할 수 있습니다. BLOCKED 9개는 이번 review에서 제외했습니다.

2026-10-01 (Asia/Seoul). 기준 HEAD: ae721cf. 실제 CA WH3 9.0.1.0, RPFM 5.1.0, schema format 5.

전체 import 안전성이 입증되지 않았다. 24개 이름 중 9개에서 identity가 결정되지 않고, 유일 root 15개에서도 14개가 새로운 ID/구조 생략을 갖는다. 모든 결과는 staging 진단 자료이며 production Unit catalog로 승격하지 않는다. 앱 UI, src/data/units.json, faction 데이터와 Unit 타입은 수정하지 않았다. 승인 derived formula는 0개다.

## 1. Baseline

작업 전 npm test 62/62, npm run build 성공, 실제 CA integration 4/4 성공(0 skip). 기존 로컬 설정과 실행 중인 RPFM을 사용했다. 인터넷의 CA key나 manual 값으로 discovery를 시작하지 않았다.

## 2. 실제 표본과 선정 이유

먼저 실제 localisation/main/land/permission 관계로 30개 이름 후보를 bounded preflight했다. Gyrocopter 단수 이름은 root 0개였으며 임의 key로 보완하지 않았다. 최종 catalog는 아래 24개다. preflight는 root 조사이며 추가 30개 유닛 정규화가 아니다. catalog에는 displayName, slug, reason, expectedCoverage만 존재한다. 최종 실행에서 root를 다시 발견한다.

| Sample | Actual CA display name | 선정 이유 | 결과 |
| --- | --- | --- | --- |
| sample-01 | Grail Knights | heavy cavalry / core regression | PARTIAL |
| sample-02 | Helstorm Rocket Battery | multi-shot artillery / shared-name variant | BLOCKED |
| sample-03 | Bloodthirster | flying monster / summoned candidate | BLOCKED |
| sample-04 | Swordsmen | ordinary shield infantry | PARTIAL |
| sample-05 | Spearmen (Shields) | shield and anti-large infantry | PARTIAL |
| sample-06 | Handgunners | ranged infantry / Imperial Supply candidate | BLOCKED |
| sample-07 | Free Company Militia | melee and missile infantry | PARTIAL |
| sample-08 | Mounted Yeomen | light mounted cavalry | PARTIAL |
| sample-09 | Pegasus Knights | flying mounted cavalry | PARTIAL |
| sample-10 | Crypt Horrors | monstrous infantry / cross-faction and summoned variants | BLOCKED |
| sample-11 | Dragon Ogres | large multi-entity infantry | CLEAN |
| sample-12 | Necrofex Colossus | composite monster with rider missile | PARTIAL |
| sample-13 | Steam Tank | mobile war machine / multiple identity candidates | BLOCKED |
| sample-14 | Black Coach | single engine chariot with draught mount | PARTIAL |
| sample-15 | Skeleton Chariots | multiple chariots and riders | PARTIAL |
| sample-16 | Ratling Guns | burst-fire weapon team candidate | PARTIAL |
| sample-17 | Doom-Flayers | engine and crew melee machine | PARTIAL |
| sample-18 | Chaos Warhounds | small fast entities / cross-family identity | BLOCKED |
| sample-19 | Hexwraiths | special movement / mounted cross-faction variants | BLOCKED |
| sample-20 | Flamers of Tzeentch | special missile / prologue variant candidate | BLOCKED |
| sample-21 | The Royal Altdorf Gryphites (Demigryph Knights) | RoR mounted variant | PARTIAL |
| sample-22 | The Sternsmen (Grave Guard) | RoR infantry variant | PARTIAL |
| sample-23 | Zombies | summoned and ordinary shared localisation | BLOCKED |
| sample-24 | Dread Saurian | large composite monster / positive ammo without primary weapon | PARTIAL |

## 3. 실제 발견 CA keys

아래 키는 실행 결과이며 catalog/profile의 입력 key가 아니다. 여러 후보는 전부 기록하고 하나를 선택하지 않는다. 모든 candidate main/land 원본값, 비용, is_renown/in_encyclopedia/caste/UI grouping, permission, 직접 unit-set membership과 recruitment override가 각 result.discovery에 있으며 schema/pack/path/row ID도 보존한다. 이름 suffix만으로 summoned/prologue 의미를 확정하지 않는다. unit-set의 category/class 기반 간접 membership이나 effective campaign availability는 계산하지 않는다.

| Sample | main key | land key | recruit / MP | permission groups | RoR raw |
| --- | --- | --- | --- | --- | --- |
| sample-01 | wh_main_brt_cav_grail_knights | wh_main_brt_cav_grail_knights | 1850 / 1850 | wh2_dlc09_rogue_pilgrims_of_myrmidia, wh2_main_rogue_jerrods_errantry, wh2_main_rogue_scourge_of_aquitaine, wh3_main_rogue_minor_cults, wh_main_group_bretonnia | false |
| sample-02 | wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply | wh_main_emp_art_helstorm_rocket_battery | 0 / 1050 | (없음; unavailable의 증거 아님) | false |
| sample-02 | wh_main_emp_art_helstorm_rocket_battery | wh_main_emp_art_helstorm_rocket_battery | 1050 / 1050 | wh2_main_rogue_college_of_pyrotechnics, wh3_dlc25_group_elspeth, wh_main_group_empire, wh_main_group_empire_golden_order, wh_main_group_empire_reikland | false |
| sample-03 | wh3_main_kho_mon_bloodthirster_0 | wh3_main_kho_mon_bloodthirster_0 | 2000 / 2000 | wh3_dlc20_group_chs_valkia, wh3_dlc29_group_endgame_chaos, wh3_main_dae, wh3_main_kho | false |
| sample-03 | wh3_main_kho_mon_bloodthirster_summoned_0 | wh3_main_kho_mon_bloodthirster_summoned_0 | 0 / 0 | (없음; unavailable의 증거 아님) | false |
| sample-04 | wh_main_emp_inf_swordsmen | wh_main_emp_inf_swordsmen | 375 / 375 | wh2_dlc11_cst_rogue_freebooters_of_port_royale, wh2_main_rogue_bernhoffs_brigands, wh2_main_rogue_scions_of_tesseninck, wh3_dlc25_group_elspeth, wh3_main_rogue_alliance_of_order, wh3_main_rogue_the_treaty_of_ashshair, wh_main_group_empire, wh_main_group_empire_golden_order, wh_main_group_empire_reikland, wh_main_group_kislev, wh_main_group_teb | false |
| sample-05 | wh_main_emp_inf_spearmen_1 | wh_main_emp_inf_spearmen_1 | 350 / 350 | wh2_main_rogue_jerrods_errantry, wh2_main_rogue_scions_of_tesseninck, wh3_dlc25_group_elspeth, wh3_main_rogue_alliance_of_order, wh3_main_rogue_the_treaty_of_ashshair, wh_main_group_empire, wh_main_group_empire_golden_order, wh_main_group_empire_reikland, wh_main_group_kislev, wh_main_group_teb | false |
| sample-06 | wh2_dlc13_emp_inf_handgunners_imperial_supply | wh_main_emp_inf_handgunners | 0 / 600 | (없음; unavailable의 증거 아님) | false |
| sample-06 | wh_main_emp_inf_handgunners | wh_main_emp_inf_handgunners | 600 / 600 | wh2_dlc11_cst_rogue_freebooters_of_port_royale, wh2_dlc11_cst_shanty_middle_sea_brigands, wh2_main_rogue_gerhardts_mercenaries, wh2_main_rogue_jerrods_errantry, wh2_main_rogue_pirates_of_the_far_sea, wh2_main_rogue_pirates_of_the_southern_ocean, wh2_main_rogue_pirates_of_trantio, wh3_dlc25_group_elspeth, wh3_main_rogue_alliance_of_order, wh3_main_rogue_the_treaty_of_ashshair, wh_main_group_empire, wh_main_group_empire_golden_order, wh_main_group_empire_reikland, wh_main_group_kislev, wh_main_group_teb | false |
| sample-07 | wh_dlc04_emp_inf_free_company_militia_0 | wh_dlc04_emp_inf_free_company_militia_0 | 450 / 450 | wh2_dlc11_cst_rogue_freebooters_of_port_royale, wh2_main_rogue_bernhoffs_brigands, wh2_main_rogue_gerhardts_mercenaries, wh2_main_rogue_pirates_of_the_far_sea, wh2_main_rogue_pirates_of_the_southern_ocean, wh2_main_rogue_pirates_of_trantio, wh3_dlc25_group_elspeth, wh_main_group_empire, wh_main_group_empire_golden_order, wh_main_group_empire_reikland | false |
| sample-08 | wh_main_brt_cav_mounted_yeomen_0 | wh_main_brt_cav_mounted_yeomen_0 | 400 / 400 | wh2_main_rogue_bernhoffs_brigands, wh_main_group_bretonnia | false |
| sample-09 | wh_main_brt_cav_pegasus_knights | wh_main_brt_cav_pegasus_knights | 1100 / 1100 | wh2_main_rogue_pirates_of_trantio, wh2_main_rogue_scourge_of_aquitaine, wh_main_group_bretonnia | false |
| sample-10 | wh2_dlc09_tmb_mon_crypt_horrors | wh2_dlc09_tmb_mon_crypt_horrors | 0 / 900 | wh2_dlc09_tomb_kings_arkhan | false |
| sample-10 | wh_main_vmp_mon_crypt_horrors | wh_main_vmp_mon_crypt_horrors | 800 / 900 | wh2_dlc11_cst_shanty_shark_straight_seadogs, wh2_main_rogue_abominations, wh2_main_rogue_heirs_of_mourkain, wh3_dlc29_nag_group_undead_legions, wh3_main_rogue_shrouded_wanderers_of_undead, wh_main_group_vampire_counts | false |
| sample-10 | wh_main_vmp_mon_crypt_horrors_summoned | wh_main_vmp_mon_crypt_horrors_summoned | 0 / 0 | (없음; unavailable의 증거 아님) | false |
| sample-11 | wh_dlc01_chs_mon_dragon_ogre | wh_dlc01_chs_mon_dragon_ogre | 1550 / 1550 | wh3_dlc29_group_chs_archaon, wh3_dlc29_group_endgame_chaos, wh3_main_group_belakor, wh_main_group_chaos | false |
| sample-12 | wh2_dlc11_cst_mon_necrofex_colossus_0 | wh2_dlc11_cst_mon_necrofex_colossus_0 | 1800 / 1800 | wh2_dlc11_cst_rogue_terrors_of_the_dark_straights, wh2_dlc11_group_vampire_coast, wh2_dlc11_group_vampire_coast_sartosa, wh3_dlc29_nag_group_undead_legions | false |
| sample-13 | wh2_dlc13_emp_veh_steam_tank_imperial_supply | wh_main_emp_veh_steam_tank_driver | 0 / 2400 | (없음; unavailable의 증거 아님) | false |
| sample-13 | wh_main_emp_veh_steam_tank | wh_main_emp_veh_steam_tank_driver | 2100 / 2400 | wh2_main_rogue_college_of_pyrotechnics, wh3_dlc25_group_elspeth, wh3_main_tze, wh_main_group_empire, wh_main_group_empire_golden_order, wh_main_group_empire_reikland | false |
| sample-14 | wh_main_vmp_veh_black_coach | wh_main_vmp_veh_black_coach | 1100 / 1100 | wh3_dlc29_nag_group_undead_legions, wh3_main_rogue_shrouded_wanderers_of_undead, wh_main_group_vampire_counts | false |
| sample-15 | wh2_dlc09_tmb_veh_skeleton_chariot_0 | wh2_dlc09_tmb_veh_skeleton_chariot_0 | 0 / 850 | wh2_dlc09_tomb_kings, wh2_dlc09_tomb_kings_arkhan, wh3_dlc29_nag_group_undead_legions | false |
| sample-16 | wh2_dlc12_skv_inf_ratling_gun_0 | wh2_dlc12_skv_inf_ratling_gun_0 | 800 / 800 | wh2_main_skv, wh2_main_skv_ikit, wh3_dlc29_group_endgame_skaven | false |
| sample-17 | wh2_dlc12_skv_veh_doom_flayer_0 | wh2_dlc12_skv_veh_doom_flayer_0 | 1100 / 1050 | wh2_main_skv, wh2_main_skv_ikit, wh3_dlc29_group_endgame_skaven | false |
| sample-18 | wh_dlc03_bst_inf_chaos_warhounds_0 | wh_dlc03_bst_inf_chaos_warhounds_0 | 0 / 400 | wh_dlc03_group_beastmen | false |
| sample-18 | wh_main_chs_mon_chaos_warhounds_0 | wh_main_chs_mon_chaos_warhounds_0 | 400 / 400 | wh2_main_rogue_mangy_houndz, wh3_dlc20_group_chs_azazel, wh3_dlc20_group_chs_festus_glottkin, wh3_dlc20_group_chs_valkia, wh3_dlc20_group_chs_vilitch, wh3_dlc29_group_chs_archaon, wh3_dlc29_group_endgame_chaos, wh3_main_group_belakor, wh3_main_rogue_the_challenge_stone_pact, wh_main_group_chaos | false |
| sample-19 | wh2_dlc09_tmb_cav_hexwraiths | wh2_dlc09_tmb_cav_hexwraiths | 0 / 1475 | wh2_dlc09_tomb_kings_arkhan | false |
| sample-19 | wh_main_vmp_cav_hexwraiths | wh_main_vmp_cav_hexwraiths | 1400 / 1400 | wh2_dlc11_cst_shanty_shark_straight_seadogs, wh3_dlc29_nag_group_undead_legions, wh_main_group_vampire_counts | false |
| sample-20 | wh3_main_pro_tze_mon_flamers_0 | wh3_main_pro_tze_mon_flamers_0 | 850 / 850 | wh3_main_pro_tze | false |
| sample-20 | wh3_main_tze_mon_flamers_0 | wh3_main_tze_mon_flamers_0 | 800 / 800 | wh3_dlc20_group_chs_vilitch, wh3_main_dae, wh3_main_pro_tze, wh3_main_tze | false |
| sample-21 | wh_dlc04_emp_cav_royal_altdorf_gryphites_0 | wh_dlc04_emp_cav_royal_altdorf_gryphites_0 | 1850 / 1850 | wh_main_group_empire | true |
| sample-22 | wh_dlc04_vmp_inf_sternsmen_0 | wh_dlc04_vmp_inf_sternsmen_0 | 1150 / 1150 | wh3_dlc29_nag_group_undead_legions, wh_main_group_vampire_counts | true |
| sample-23 | wh_main_vmp_inf_zombie | wh_main_vmp_inf_zombie | 100 / 100 | wh2_main_rogue_the_wandering_dead, wh3_dlc29_nag_group_undead_legions, wh_main_group_vampire_counts | false |
| sample-23 | wh_main_vmp_inf_zombie_summoned | wh_main_vmp_inf_zombie_summoned | 0 / 0 | (없음; unavailable의 증거 아님) | false |
| sample-24 | wh2_dlc13_lzd_mon_dread_saurian_1 | wh2_dlc13_lzd_mon_dread_saurian_1 | 3100 / 3100 | wh2_main_lzd, wh3_dlc23_rogue_sacred_host_of_tepok | false |

## 4. Faction / type 분포

유일 root 15개에서 명시적 staging alias가 검증된 계열: Empire 4, Bretonnia 3, Vampire Counts 2, Skaven 2, Warriors of Chaos 1, Vampire Coast 1, Tomb Kings 1, Lizardmen 1. ambiguous 후보에 Khorne, Daemons/Tzeentch, Beastmen, Arkhan 등이 추가된다. production faction catalog에는 추가하지 않았다.

24개 표본의 실제 land.category 분포: inf_melee 8, cavalry 5, inf_ranged 4, war_machine 4, war_beast 2, artillery 1. 이는 이름으로 추정한 유형이 아니다. Bloodthirster와 Dragon Ogres도 DB category는 inf_melee다. 경/중기병, hybrid, 무기팀, 비행, RoR, 소환은 독립 category가 아니라 mount/entity/weapon/attribute/flag/identity의 조합으로 조사한다. 두 RoR는 main.is_renown=true를 확인했다. Ratling의 이름만으로 별도 장비/승무원 entity를 발명하지 않는다.

## 5. CLEAN / PARTIAL / BLOCKED

CLEAN 1 (Dragon Ogres), PARTIAL 14, BLOCKED 9. 시도 24, 정상적으로 보고된 결과 24, 검증된 제한적 Unit 15. BLOCKED는 모두 IDENTITY_AMBIGUITY이며 validation failure나 transport failure는 없었다. CLEAN도 HP/속도 등 정책 생략은 갖는다. PARTIAL 결과의 normalized는 해당 단일 selector가 표현한 진단용 Unit이며 전체 정보를 표현한다는 뜻이 아니다. validation 실패 시 rejectedNormalization으로만 보존하고 normalized=null이다.

## 6. Direct normalization coverage

총 provenance 374 DIRECT / 15 GENERATED / 52 CURATED. 숫자값 계산 없이 기존 policy를 적용했다. meleeAttack, armor, meleeDefense, leadership, chargeBonus, base/AP melee damage, 기본 비용은 각각 15 MAPPED / 9 FAILED(identity 미확정)이다. 대표 mass/size/penetration resistance는 각각 6 MAPPED / 9 role 생략 / 9 FAILED.

missile.range는 2 MAPPED / 1 UNMAPPED(Free Company의 기본 range는 있지만 override를 모두 표현하지 못함) / 1 OMITTED(Dread Saurian) / 11 NOT_APPLICABLE / 9 FAILED다. missile group 전체 현재 direct target이 모두 매핑된 표본은 Necrofex 1개다. NOT_APPLICABLE은 조사한 base scope에서만 사용하며 runtime 공격 불가능을 뜻하지 않는다. positive ammo가 있는데 chain이 없으면 NA로 분류하지 않는다.

## 7. Semantics-blocked coverage

적용 가능한 정책 생략 이벤트 208건, 15개 검증 표본. HP/표시 속도/부대 개체 수/저항/모집 조건은 15개씩 생략. missile ammo/accuracy/reload display policy는 조사 대상 4개에서 생략한다. identity blocked 9개는 FAILED로 따로 집계하며 정책 생략으로 성공 처리하지 않는다. semantic-only 생략은 CLEAN을 PARTIAL이나 BLOCKED로 바꾸지 않는다. normalizer 자체의 기존 omitted 목록은 그대로 유지하며 집계 단계에서 NA와 적용 가능 생략을 구분한다.

## 8. Entity 구조

- Grail/Yeomen/Pegasus/Gryphites: rider+mount. Pegasus는 flight attribute와 mount entity를 별도로 보존.
- Necrofex: num_men=5, num_mounts=1. man/mount가 같은 battle_entity row를 가리키므로 유일 row 수와 역할 수는 다르다.
- Dread Saurian: num_men=12, num_mounts=1. 이를 count=1 또는 count=12로 승인하지 않는다.
- Black Coach: num_men=1, num_mounts=2, num_engines=1. Skeleton Chariots: 24/2/12. num_mounts의 총수/개별 전차당 의미도 추정하지 않는다.
- Doom-Flayers: num_men=8, num_engines=8. engine 존재만으로 포병이라고 분류하지 않는다.
- 9개에서 대표 entity 역할 생략. 실제 battle_entities.size 값은 small/medium/large/very_large이며 새 unsupported entity size는 없었다. 별도 projectile penetration cap에서 very_small을 발견했다.

## 9. Missile 구조

Free Company Militia는 기본 wh_dlc04_emp_free_company_pistol 외에 wh2_dlc17_emp_free_company_pistol_blessed / wh_dlc04_emp_free_company_pistol_upgraded의 두 unit_missile_weapon_junctions row가 있다. 이는 override 후보이며 세 무기를 동시에 발사한다는 뜻이 아니다. Unit의 단일 missile block에는 이 조건/선택 관계를 보존할 수 없다.

Ratling Guns는 burst/volley/projectile 수를 raw로만 보존하며 very_small penetration cap을 tiny로 바꾸지 않는다. Dread Saurian은 primary_ammo=80, secondary_ammo=180인데 primary_missile_weapon은 빈 문자열이고 현재 조사한 junction에도 연결이 없다. asset/variant/secondary-weapon 구조 추가 조사가 필요하다. 이번 작업에서 파일/모델의 의미나 무기를 추정하지 않았다.

missile_weapons_to_projectiles는 bounded one-hop으로 조사했으나 선택된 missile 표본에서 대체 projectile row는 0개다. 미발견을 WH3 전체 부재로 일반화하지 않는다. Helstorm의 engine→missile→projectile→explosion 체인은 별도 기존 실제 integration에서 회귀 검증했다.

## 10. Root / identity ambiguity

Helstorm, Bloodthirster, Handgunners, Crypt Horrors, Steam Tank, Chaos Warhounds, Hexwraiths, Flamers of Tzeentch, Zombies의 9개 이름이 blocked다. Crypt Horrors는 3개, 나머지는 2개 후보다. 총 main 후보 34개. paid-recruitment는 기존 핵심 regression profile에서만 유지하고 generic pilot에는 쓰지 않는다. 비용 0/permission 없음/is_renown/is_encyclopedia 어느 하나도 보편적인 모집 가능성 판정으로 쓰지 않는다.

## 11. Multi-faction permission

23개 표본에서 적어도 한 candidate가 여러 permission group을 가진다. Swordsmen 11개, Spearmen 10개, Handgunners의 ordinary candidate 15개, Grail 5개. Steam Tank ordinary candidate에는 Empire뿐 아니라 Tzeentch group도 있다. 유일 alias를 찾지 못하면 NO_PRIMARY_CATALOG_MAPPING으로 막으며, 먼저 발견한 group이나 key prefix를 선택하지 않는다. 이번 선택된 15개에서는 이 blocker가 실제 발생하지 않았다.

## 12. Unknown ability

20종, 유닛별 발생 25건, 9개 표본. 빈도는 서로 다른 선택/추적 표본 수다. ambiguous root의 ability는 이 분모에 포함하지 않아 전 범위 빈도라는 주장을 하지 않는다.

| CA ID | 빈도 | Actual Loc name | active/passive source |
| --- | --- | --- | --- |
| wh_main_unit_passive_unstable | 3 | Crumbling | passive |
| wh_main_unit_passive_unstable_mark_ii | 3 | Disintegrating | passive |
| wh2_main_unit_passive_scurry_away | 2 | Scurry Away! | passive |
| wh_dlc07_unit_passive_the_peasants_duty | 1 | The Peasant's Duty | passive |
| wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade | 1 | The Blessing of the Lady | passive |
| wh_main_unit_abilities_black_nimbus | 1 | Black Nimbus | passive |
| wh_main_unit_abilities_black_scythes | 1 | Black Scythes | passive |
| wh_main_unit_abilities_unholy_vigour | 1 | Unholy Vigour | passive |
| wh_main_unit_passive_regeneration | 1 | Regeneration | passive |
| wh2_dlc09_faction_passive_realm_of_souls_tier_1 | 1 | Realm of Souls I | passive |
| wh2_dlc09_faction_passive_realm_of_souls_tier_2 | 1 | Realm of Souls II | passive |
| wh2_dlc09_faction_passive_realm_of_souls_tier_3 | 1 | Realm of Souls III | passive |
| wh2_dlc09_unit_passive_unstable_mark_ii_sand | 1 | Disintegrating | passive |
| wh2_dlc09_unit_passive_unstable_sand | 1 | Crumbling | passive |
| wh2_dlc11_unit_passive_abandon_ship | 1 | Abandon Ship! | passive |
| wh2_dlc11_unit_passive_extra_powder | 1 | Black Powder Aplenty | passive |
| wh2_dlc12_unit_passive_the_best_defence | 1 | The Best Defence | passive |
| wh2_main_unit_passive_primal_instincts | 1 | Primal Instincts | passive |
| wh2_main_unit_passive_strength_in_numbers | 1 | Strength in Numbers | passive |
| wh3_dlc24_unit_passive_predatory_fighter | 1 | Predatory Fighter | passive |

## 13. Unknown attribute

10종, 유닛별 발생 17건, 10개 표본. raw Loc에 translation token/markup이 있으면 그대로 남기고 번역된 이름을 추정하지 않는다.

| CA ID | 빈도 |
| --- | --- |
| undead | 4 |
| guerrilla_deploy | 3 |
| mounted_fire_move | 3 |
| charge_defense | 1 |
| charge_defense_vs_large | 1 |
| charge_reflection | 1 |
| glorious_charge | 1 |
| peasant | 1 |
| strider | 1 |
| wallbreaker | 1 |

각 ID의 Loc, source table/row, 사용 표본, active/passive evidence, mappingExists, unmapped 여부는 unknown-ids.json에 기록한다. 새로운 alias는 승인하지 않았다.

## 14. Unit schema stress test / raw coverage

안전하게 표현 가능: 단일 schema-connected raw melee/armor/base-cost 값, man-only size/mass, 단일 default missile chain의 직접값. 추가 표현 또는 명시적인 생략 contract 필요: 여러 entity 역할, articulated 전차, 조건부 weapon override, 대체 projectile modes, secondary ammo에 대응하는 공격 출처, 변형/소환 identity. 현재 Unit schema는 확장하지 않았다.

selected raw table 이름 35개(Loc 포함), 관계 path 41종, allowlist 밖 참조 path 75종. touched는 selected row가 있는 테이블이고, decode된 파일 39개에는 결과 0개인 probe도 포함된다. raw tables/relationships/outsideAllowlist는 각 sample 목록과 example evidence를 coverage.json에 보존한다. 기존 single trace 밖 신규 bounded probe는 unit-set membership, recruitment source overrides, unit missile overrides, alternate projectile 관계다. Black Coach/Skeleton Chariots의 land_unit_articulated_vehicles는 보존된 미추적 참조다.

DB table list: main_units_tables, Loc, land_units_tables, building_units_allowed_tables, unit_armour_types_tables, unit_category_tables, unit_class_tables, battle_entities_tables, mounts_tables, melee_weapons_tables, unit_shield_types_tables, unit_attributes_groups_tables, ground_type_stat_effect_groups_tables, land_units_to_unit_abilites_junctions_tables, building_levels_tables, battle_entities_size_enums_tables, unit_attributes_to_groups_junctions_tables, ground_type_to_stat_effects_tables, unit_abilities_tables, unit_attributes_tables, unit_special_abilities_tables, special_ability_to_special_ability_phase_junctions_tables, special_ability_phases_tables, special_ability_phase_stat_effects_tables, units_to_groupings_military_permissions_tables, unit_set_to_unit_junctions_tables, unit_missile_weapon_junctions_tables, missile_weapons_tables, projectiles_tables, projectile_shot_type_enum_tables, projectile_penetration_junctions_tables, unit_recruitment_source_overrides_tables, special_ability_behaviour_groups_tables, special_ability_behaviour_groups_to_types_tables, battlefield_engines_tables.

Generic discovery는 유일 root 15개에서 bounded scope를 생성했으며 수동 24-profile 추가가 필요하지 않았다. 하지만 실제 secondary missile 구조와 identity 결정까지 generic하게 해결되었다는 뜻은 아니다.

## 15. Exception taxonomy

351건은 문제 유닛 수가 아니라 이벤트 수이며 INFO와 정책 생략을 포함한다. 카테고리 0건도 지원하고 보존한다. 모든 이벤트에 unit, caKey(미결정 시 null), category, severity, fieldOrRelation, reason, evidence가 있다. 최종 표에 전체 카테고리를 기록했다.

## 16. 이번 수정

기존 discovery와 pack/session 초기화를 export하여 single extractor와 pilot이 공유한다. pilot은 한 RPFM session/reader cache에서 순차 실행한다. trace/inspect/normalize 간 raw를 재사용하고 normalize는 RPFM을 호출하지 않는다. 루트 주입, 임의 paid 정책, catalog 중복, 30개 초과를 거부한다. 실패를 개별 결과로 저장하고 계속 진행하며 저장 실패는 전체 실패로 명시한다.

provenance 의미를 DIRECT(원본값), GENERATED(ca_unit_<key>), CURATED(faction/ability/attribute/boolean-state alias)로 분리했다. source pointer와 rawValue는 모두 유지한다. 숫자값과 생략 정책은 변경하지 않았다.

1차 batch를 전부 수집한 뒤 보고 계층만 보완했다: positive ammo+missing chain을 NA로 숨기지 않기, override가 있으면 default 값만으로 MAPPED라고 하지 않기, 단순 audio/display 참조를 구조 오류로 과대집계하지 않기, 적용 가능 정책 생략만 집계하기. 첫 결과는 generated/wh3/pilot-first-pass에 보존했다. 전체 결과 분류 1/14/9는 바뀌지 않았다.

## 17. 의도적으로 수정하지 않은 예외

34개 candidate 중 임의 선택, 신규 ability/attribute alias, very_small→tiny 변환, empty size 의미, representative entity 선택, secondary missile/asset parser, articulated 전차 집계, runtime override 적용, HP/속도/ammo/reload 공식. 큰 예외는 다음 조사로 남겼다. 아직 trace되지 않은 reverse/asset 경로의 부재를 주장하지 않는다.

## 18. Tests / regression

최종 기본 테스트 78/78(기존 62 + pilot 16), 실제 CA integration 5/5(기존 4 + generic 3표본 subset 1), skip 0. catalog 중복/키 주입/상한, schema 기반 scope, paid ambiguity 차단, taxonomy, 세 outcome, semantics/failure 분리, ability/attribute 빈도, coverage 합계, DIRECT/GENERATED/CURATED, 단일 실패 isolation, validation reject 보존, missing entity/복수 alias를 검증한다.

기존 저장 core 결과와 재정규화 결과의 Unit/omitted/unmapped를 deepEqual 비교하여 3종 모두 동일함을 확인했다. 새로운 provenance kind만 다르다. 실제 core integration의 Grail 52-row trace와 Grail/Helstorm/Bloodthirster 직접값/생략 검증도 통과한다. pilot Grail은 generic ability-phase/Loc scope로 80행이며 core profile의 52행 계약은 그대로다.

## 19. Build

npm run build 성공(tsc -b + Vite). production asset 결과와 UI/data 변경 없음.

## 20. Actual CA pilot / resource limits

npm run pilot:wh3-units 성공. 24 attempted / 24 reported / 15 validated, 약 3.62초, 955 trace rows, 35 selected table names, 39 decoded cached files, 최대 unit trace 101행(허용 250). 9개 ambiguity는 전체 batch 실행 실패와 별개로 개별 BLOCKED 결과다. 실행 성공(exit 0)은 모든 Unit이 CLEAN이라는 뜻이 아니다.

Hard max 30 samples, unit trace 250 rows, identity inspection 400 rows(기존 normalizer permission selector의 250행 제한은 별도 유지), missile probe 150 rows, RPFM concurrency 1. pack metadata inventory와 필요한 테이블 decode만 사용하며 전체 DB dump/무제한 재귀/전체 faction import 없음. 이 시간은 local warm RPFM과 9개 조기 identity stop을 포함하므로 WH3 전체 처리시간으로 선형 외삽하면 안 된다.

재현:

~~~powershell
npm test
npm run build
$env:WH3_INTEGRATION_CONFIG = 'tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
npm run pilot:wh3-units
~~~

출력: generated/wh3/pilot/manifest.json, coverage.json, exceptions.json, unknown-ids.json, summary.md, units/sample-NN.result.json. 모두 기존 gitignore 안에 유지한다. manifest COMPLETE의 results 목록만 해당 실행의 결과다. RUNNING/FAILED manifest에서 이전 summary를 최신 성공 결과로 사용하지 않는다.

## 21. 전체 import 전 blocker

현재 normalizer 단독으로 전체 WH3 유닛에 적용할 때 틀리거나 불완전한 값을 조용히 생성할 위험이 충분히 낮다고 판단할 수 없다. identity 정책, composite-role 표현/생략 contract, secondary/override missile completeness gate, enum/sentinel 검토, 명시적 catalog alias, unknown ID 검토/격리 기준이 필요하다. 특히 기본 missile 값이 유효해도 전체 공격 구조를 표현하지 못할 수 있다. 이번 pilot wrapper의 PARTIAL/BLOCKED를 무시하고 normalized만 취하면 안 된다.

## 22. 다음 작업

우선 9개 ambiguous 이름의 후보를 대상으로 variant identity 정책을 설계한다(직접 비용/permission/sets/flags를 보존하며 일반 paid 규칙 금지). 그 다음 Dread Saurian missile 출처와 Free Company override 활성 조건, 전차/복합 entity의 역할 표현을 각각 bounded 조사한다. unknown ID는 unstable/unstable_mark_ii/scurry_away와 undead/guerrilla_deploy/mounted_fire_move부터 검토한다. 정규화 숫자 공식을 추가하기 전에 completeness/quarantine contract와 대표 표본을 회귀 검증한다. 전체 importer는 자동 실행하지 않았다.

## Exception totals

| Exception category | Count | Severity | Common cause | Required before full import? |
| --- | --- | --- | --- | --- |
| IDENTITY_AMBIGUITY | 9 | BLOCKING | 같은 localisation의 여러 main/land root | 필수: 명시적 identity 정책 |
| UNKNOWN_ENTITY_ROLE | 9 | OMISSION | 대표 rider/mount/engine 역할 선택 불가 | 해당 구조 import 전 해결 또는 명시적 격리 |
| MULTI_ENTITY_STRUCTURE | 9 | INFO | 서로 다른 역할을 연결하는 entity 관계 | 보존/보고 |
| MOUNT_STRUCTURE | 8 | INFO | 별도 mount 관계 | 보존/보고 |
| ARTILLERY_STRUCTURE | 3 | INFO | engine 관계(근접 전차도 포함) | 보존/보고 |
| UNKNOWN_MISSILE_CHAIN | 1 | OMISSION | Dread Saurian의 ammo는 양수이나 primary chain 없음 | 해당 구조 import 전 해결 또는 명시적 격리 |
| MULTIPLE_MISSILE_WEAPONS | 1 | OMISSION | Free Company의 기본 무기와 두 override | 해당 구조 import 전 해결 또는 명시적 격리 |
| UNKNOWN_PROJECTILE_STRUCTURE | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| UNKNOWN_ABILITY | 25 | OMISSION | 검토된 내부 ability alias 없음 | 해당 구조 import 전 해결 또는 명시적 격리 |
| UNKNOWN_ATTRIBUTE | 17 | OMISSION | 검토된 내부 attribute alias 없음 | 해당 구조 import 전 해결 또는 명시적 격리 |
| ABILITY_CLASSIFICATION_CONFLICT | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| UNKNOWN_ENUM_VALUE | 7 | OMISSION | 빈 splash size 6건 + very_small penetration cap 1건 | 해당 구조 import 전 해결 또는 명시적 격리 |
| UNSUPPORTED_SIZE | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| UNSUPPORTED_RAW_SHAPE | 14 | OMISSION | Dread Saurian missile direct source 14필드 없음 | 해당 구조 import 전 해결 또는 명시적 격리 |
| MULTI_FACTION_PERMISSION | 23 | INFO | 한 root에 여러 military group | 보존/보고 |
| NO_PRIMARY_CATALOG_MAPPING | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| MISSING_REQUIRED_JOIN | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| MULTIPLE_REQUIRED_JOIN | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| SEMANTICS_BLOCKED | 208 | OMISSION | 기존 의미 정책에 따른 적용 가능 필드 생략 | gate 유지; 공식 승인 불필요 |
| VALIDATION_FAILURE | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| NORMALIZED_WITH_OMISSIONS | 15 | INFO | 검증 성공하였으나 생략 유지 | 보존/보고 |
| NORMALIZED_CLEAN | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| ROOT_NOT_FOUND | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| RESOURCE_LIMIT | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| SOURCE_FAILURE | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| UNMAPPED_FIELD | 0 | — | 이 bounded 표본에서 미발견 | 새 표본에서 감시 |
| OUTSIDE_TRACE_SCOPE | 2 | OMISSION | Black Coach/Skeleton Chariots articulated_record | 해당 구조 import 전 해결 또는 명시적 격리 |

## Field groups

Fully mapped는 현재 normalizer의 적용 가능한 direct/alias target 기준이며 HP 같은 정책 생략을 포함한 전체 스키마 완성을 뜻하지 않는다. structural failure 열은 9개 identity-blocked와 추가 구조 생략/불완전 alias 표본 수의 합이다. 따라서 applicable 수보다 클 수 있고 semantics 열과 겹칠 수 있다. identity가 막힌 9개는 applicability도 unknown이다. 모든 optional contract field를 포함한 완전 매핑 수는 coverage.groups.allContractFieldsMapped에 별도로 기록했다.

| Field group | Applicable samples | Fully mapped | Semantics blocked | Structural failure |
| --- | --- | --- | --- | --- |
| classification | 15 (+9 unknown) | 15 | 0 | 9 |
| entities | 15 (+9 unknown) | 6 | 15 | 18 |
| movement | 15 (+9 unknown) | 15 | 15 | 9 |
| defense | 15 (+9 unknown) | 6 | 15 | 18 |
| melee | 15 (+9 unknown) | 9 | 15 | 15 |
| missile | 4 (+9 unknown) | 1 | 4 | 12 |
| campaign | 15 (+9 unknown) | 15 | 15 | 9 |
| customBattle | 15 (+9 unknown) | 15 | 0 | 9 |
| abilities | 10 (+9 unknown) | 1 | 0 | 18 |
| passiveAbilities | 10 (+9 unknown) | 1 | 0 | 18 |
| attributes | 15 (+9 unknown) | 5 | 0 | 19 |
