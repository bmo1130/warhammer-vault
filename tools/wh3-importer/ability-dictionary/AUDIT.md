# 공통 능력 사전 감사

CA 9.0.2.0 · 기본 보유 admission을 변경하지 않은 공통 사전. 게임 실행/실측 없음.

전체 446; 공식 한국어 설명 446; 영어만 0; 이름만 0; 비영 수치 효과 290; 공식 문구가 연결된 구조화 조건 235. 클릭 및 독립 문서 대상은 446.

| 분류 | 전체 | 공식 KO | EN만 | 이름만 | 수치 효과 | 구조화 조건 |
|---|---:|---:|---:|---:|---:|---:|
| ATTRIBUTE | 50 | 50 | 0 | 0 | 0 | 0 |
| PASSIVE | 252 | 252 | 0 | 0 | 219 | 174 |
| ACTIVE | 93 | 93 | 0 | 0 | 40 | 44 |
| TOGGLE | 10 | 10 | 0 | 0 | 10 | 0 |
| BOUND | 41 | 41 | 0 | 0 | 21 | 17 |

## 추출 경로와 단위

- 특성: canonical admission → raw unit_attributes.key → bullet_text Loc → 재귀 text replacement. 이름 앞뒤 || 분리. imued_effect_text 이름을 설명으로 세지 않는다.
- Passive/Active/Toggle/Bound: canonical admission rawKeys → unit_abilities.tooltip_text Loc; unit_special_abilities → ordered phase junction → special_ability_phases → stat/attribute effects. 이미 검토된 alias는 한 번만 계산하지 않고 한 그래프만 보존한다. 같은 이름을 합치지 않는다.
- Stat: phase_stat_effects.stat → modifiable_unit_stats.localisation → unit_stat_localisations. value/how는 원본 보정값; add/mult의 최종 스탯 변환, 표시 부호 역전과 중첩은 미구현.
- 조건: 사용 불가, 자동 해제, 대상 불가, 재충전 flag를 분리한다. flag_description은 flag가 참인 문구이며 자동 해제 문구를 발동 조건으로 뒤집지 않는다. alt_description은 반대 문구로 따로 저장한다. 조건 없는 목록은 무조건 상시 발동의 증거가 아니다.
- hp_change_frequency: 초. damage_amount: 개체당/주기당 HP; max_damaged_entities는 해당 주기에 영향을 줄 수 있는 개체 수 제한. 피해량·DPS를 합산하지 않는다.
- heal_amount: raw × 100 = 최대 HP의 % / 적용 주기. CA 생성 CCO API HealPercent 설명으로 교차 확인; 설치 schema의 오래된 절대 HP 설명과 구분. barrier_heal_amount, fatigue_change_ratio, execute_ratio도 각각 schema/API 근거로 비율 표시.
- -1 duration은 원본 지속 제한 없음 표시; -1 recharge/uses는 각각 특수 값으로 표시하며 상시 사용 가능으로 해석하지 않는다. 0 범위는 지름·반경을 추정하지 않고 원본 0을 표시한다.
- 정적 기본 수치가 아닌 능력 발동 중 보정이다. intensity/투사체/폭격/소환/형성/전파/behaviour 외부 계산은 보류. 완결된 전투 메커니즘 coverage와 설명 coverage는 별개다.

[CA 생성 CCO API 문서(커뮤니티 미러)](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html#CcoSpecialAbilityPhaseRecord) · 웹 문서 버전은 9.0.2로 고정되지 않으므로 installed raw와 함께 해석 근거로 사용한다.

## 우선 표본 expected / actual

### 공포 유발 / Causes Fear (causes_fear)

raw: causes_fear

공식 설명: 이 부대는 근처의 모든 적 부대에 겁을 주고 리더십을 꺾습니다. 또한 이 부대는 공포의 영향을 받지 않습니다. 공포 효과는 누적되지 않습니다.

조건: 명시적 flag 없음 · 실제 발동 상태 미평가

phase expected(raw) / actual(projection): 수치 phase 없음; 공식 설명 연결

### 돌격 방어 전문가 / Expert Charge Defence (charge_defense)

raw: charge_defense

공식 설명: 이 부대는 대비 중일 경우 모든 공격자의 돌격 보너스를 무시합니다.

조건: 명시적 flag 없음 · 실제 발동 상태 미평가

phase expected(raw) / actual(projection): 수치 phase 없음; 공식 설명 연결

### 은신 (숲) / Hide (forest) (stalk_in_forest)

raw: hide_forest

공식 설명: 이 부대는 적 부대가 너무 가까이 오기 전까지는 숲 안에 숨을 수 있습니다.

조건: 명시적 flag 없음 · 실제 발동 상태 미평가

phase expected(raw) / actual(projection): 수치 phase 없음; 공식 설명 연결

### 언데드 / Undead (undead)

raw: undead

공식 설명: 언데드 부대는 패주를 시킬 수 없지만 리더십이 꺾이면 피해를 입기 시작합니다.

언데드는 다음과 같은 특성도 갖습니다.
 공포와 섬뜩함 면역

언데드 부대는 뱀파이어 백작의 강령술사 등 특수 캐릭터를 통해 생명력을 회복할 수도 있습니다.

조건: 명시적 flag 없음 · 실제 발동 상태 미평가

phase expected(raw) / actual(projection): 수치 phase 없음; 공식 설명 연결

### 재생 / Regeneration (regeneration)

raw: wh_main_unit_passive_regeneration

공식 설명: 놀라운 속도로 뼈를 맞추고 살을 꿰맬 수 있는 존재가 있습니다. 막강한 능력이지만 불에는 취약하죠.

조건: 명시적 flag 없음 · 실제 발동 상태 미평가

phase expected(raw) / actual(projection): wh_main_unit_passive_regeneration: 주기 1초, 개체 제한 0; heal_amount 0.001 → 0.1 % / 적용 주기; resurrect false → false ; stat_weakness_flame -20 → -20 CA 보정값

### 붕괴 / Crumbling (crumbling)

raw: wh_main_unit_passive_unstable

공식 설명: 올드 월드에서는 망자가 좀체 쉴 수 없습니다. 뱀파이어와 강령술사가 소환한 망자는 더 이상 속세의 일에 개의치 않습니다. 주군의 뜻을 섬길 뿐입니다.

조건: DEACTIVATE: 리더십 0 이상 (morale_is_higher_than_broken)

phase expected(raw) / actual(projection): wh_main_unit_passive_unstable: 주기 1초, 개체 제한 1; damage_amount 28 → 28 HP / 적용 주기

### 분해 / Disintegrating (disintegrating)

raw: wh_main_unit_passive_unstable_mark_ii

공식 설명: 어둠의 마법 속박이 실패했습니다. 육신과 강령술의 에너지 모두 대상에게서 벗겨져 나와 먼지처럼 사라집니다.

조건: DEACTIVATE: 리더십 '사기 와해' 이상 (morale_is_higher_than_shattered)

phase expected(raw) / actual(projection): wh_main_unit_passive_unstable_mark_ii: 주기 0.2초, 개체 제한 5; damage_amount 133 → 133 HP / 적용 주기

## 보류 raw key / 정확한 이유

- banished / wh3_main_unit_passive_daemonic_instability_khorne_ii: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- battle_harmony_yang / wh3_main_unit_passive_battle_harmony_yang: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- battle_harmony_yin / wh3_main_unit_passive_battle_harmony_yin: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- blessing_of_the_lady / wh_main_lord_passive_the_blessing_of_the_lady: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- crumbling / wh_main_unit_passive_unstable: behaviour=undead_crumbling: external mechanic/activation not evaluated.
- daemonic_instability / wh3_main_unit_passive_daemonic_instability_khorne: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- disintegrating / wh_main_unit_passive_unstable_mark_ii: behaviour=undead_crumbling: external mechanic/activation not evaluated.
- frenzy / wh_main_unit_passive_frenzy: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- guardian / wh2_dlc10_unit_passive_guardian: Alias description differs
+ actual - expected

+ '유혈낭자한 전장에서 누군가 등 뒤에 있어 준다는 것은 의지가 됩니다.'
- '유혈낭자의 전장에서 누군가 등 뒤에 있어준다는 것은 의지가 됩니다.'
       ^

- guardian / wh2_dlc09_unit_passive_guardian: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- lance / wh_dlc07_unit_formation_lance: formation=wedge_formation: external mechanic/activation not evaluated.
- lance / wh_dlc07_unit_formation_lance: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- martial_mastery / wh2_main_unit_passive_martial_mastery: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- martial_prowess / wh2_main_unit_passive_martial_prowess: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- murderous_mastery / wh2_main_faction_abilities_murderous_mastery: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- murderous_prowess / wh2_main_faction_abilities_murderous_prowess: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- regeneration / wh_main_unit_passive_regeneration: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc02_unit_passive_the_flag_of_blood_keep / wh_dlc02_unit_passive_the_flag_of_blood_keep: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc03_unit_passive_bloodgreed / wh_dlc03_unit_passive_bloodgreed: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc03_unit_passive_drunken / wh_dlc03_unit_passive_drunken: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc03_unit_passive_primal_fury / wh_dlc03_unit_passive_primal_fury: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc03_unit_passive_soul_eater / wh_dlc03_unit_passive_soul_eater: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc04_unit_passive_balefire / wh_dlc04_unit_passive_balefire: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc04_unit_passive_chilling_aura / wh_dlc04_unit_passive_chilling_aura: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc04_unit_passive_strength_of_the_penitent / wh_dlc04_unit_passive_strength_of_the_penitent: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc04_unit_passive_unholy_lodestone / wh_dlc04_unit_passive_unholy_lodestone: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc04_unit_passive_vigour_mortis / wh_dlc04_unit_passive_vigour_mortis: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_hero_passive_hawkish_precision / wh_dlc05_hero_passive_hawkish_precision: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_spell_bound_shield_of_thorns / wh_dlc05_spell_bound_shield_of_thorns: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_spell_bound_the_curse_of_anraheir / wh_dlc05_spell_bound_the_curse_of_anraheir: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_unit_abilities_storm_of_blades / wh_dlc05_unit_abilities_storm_of_blades: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_unit_abilities_the_shadows_coil / wh_dlc05_unit_abilities_the_shadows_coil: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_unit_abilities_woven_mist / wh_dlc05_unit_abilities_woven_mist: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc05_unit_passive_guardians_of_the_wildwood / wh_dlc05_unit_passive_guardians_of_the_wildwood: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc06_quest_passive_squigs_go_boom / wh_dlc06_quest_passive_squigs_go_boom: bombardment=wh_dlc06_quest_passive_squigs_go_boom: external mechanic/activation not evaluated.
- wh_dlc06_unit_abilities_marked_by_ulthar / wh_dlc06_unit_abilities_marked_by_ulthar: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc06_unit_abilities_maternal_instinct / wh_dlc06_unit_abilities_maternal_instinct: spawned_unit=wh_dlc06_grn_mon_spider_hatchlings_0_summoned: external mechanic/activation not evaluated.
- wh_dlc06_unit_abilities_skyhammer_bomb / wh_dlc06_unit_abilities_skyhammer_bomb: bombardment=wh_dlc06_unit_abilities_skyhammer_bomb: external mechanic/activation not evaluated.
- wh_dlc06_unit_abilities_smoke_bomb / wh_dlc06_unit_abilities_smoke_bomb: vortex=wh_dlc06_unit_abilities_smoke_bomb: external mechanic/activation not evaluated.
- wh_dlc06_unit_abilities_smoke_bomb / wh_dlc06_unit_abilities_smoke_bomb: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc06_unit_abilities_the_loons_of_eight_peaks / wh_dlc06_unit_abilities_the_loons_of_eight_peaks: vortex=wh_dlc06_unit_abilities_the_loons_of_eight_peaks: external mechanic/activation not evaluated.
- wh_dlc06_unit_passive_opportunist_murderer / wh_dlc06_unit_passive_opportunist_murderer: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc06_unit_passive_power_of_the_dragonback / wh_dlc06_unit_passive_power_of_the_dragonback: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc06_unit_passive_squigs_go_wild / wh_dlc06_unit_passive_squigs_go_wild: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc07_unit_passive_icon_of_devotion / wh_dlc07_unit_passive_icon_of_devotion: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc07_unit_passive_the_peasants_duty / wh_dlc07_unit_passive_the_peasants_duty: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc08_lord_passive_daring_deathblow / wh_dlc08_lord_passive_daring_deathblow: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc08_unit_passive_berserk / wh_dlc08_unit_passive_berserk: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc08_unit_passive_favour_of_the_ruinous_powers / wh_dlc08_unit_passive_favour_of_the_ruinous_powers: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc08_unit_passive_from_the_mist / wh_dlc08_unit_passive_from_the_mist: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc08_unit_passive_rage / wh_dlc08_unit_passive_rage: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_dlc15_quest_passive_primal_rage / wh_dlc15_quest_passive_primal_rage: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_hero_passive_swarm_of_flies / wh_main_hero_passive_swarm_of_flies: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_mount_passive_aura_of_protection / wh_main_mount_passive_aura_of_protection: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_spell_bound_bironas_timewarp / wh_main_spell_bound_bironas_timewarp: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_spell_bound_chain_lightning_ror / wh_main_spell_bound_chain_lightning_ror: vortex=wh_main_spell_heavens_chain_lightning: external mechanic/activation not evaluated.
- wh_main_spell_light_shems_burning_gaze_bound / wh_main_spell_light_shems_burning_gaze_bound: activated_projectile=wh_main_spell_light_shems_burning_gaze: external mechanic/activation not evaluated.
- wh_main_unit_abilities_black_nimbus / wh_main_unit_abilities_black_nimbus: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_unit_abilities_black_scythes / wh_main_unit_abilities_black_scythes: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_unit_abilities_blooood / wh_main_unit_abilities_blooood: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_unit_abilities_boom / wh_main_unit_abilities_boom: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_main_unit_abilities_gyrobomber_bomb / wh_main_unit_abilities_gyrobomber_bomb: bombardment=wh_main_unit_abilities_gyrobomber_bomb: external mechanic/activation not evaluated.
- wh_main_unit_abilities_gyrocopter_bomb / wh_main_unit_abilities_gyrocopter_bomb: bombardment=wh_main_unit_abilities_gyrocopter_grenade: external mechanic/activation not evaluated.
- wh_main_unit_abilities_spinning_loons / wh_main_unit_abilities_spinning_loons: vortex=wh_main_unit_abilities_spinning_loons: external mechanic/activation not evaluated.
- wh_main_unit_passive_deathblow / wh_main_unit_passive_deathblow: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_pro04_unit_abilities_apocalyptic_charge / wh_pro04_unit_abilities_apocalyptic_charge: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_pro04_unit_abilities_enrage / wh_pro04_unit_abilities_enrage: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_pro04_unit_abilities_loecs_shroud / wh_pro04_unit_abilities_loecs_shroud: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_pro04_unit_abilities_soul_devourer / wh_pro04_unit_abilities_soul_devourer: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh_pro04_unit_passive_wildfire_aura / wh_pro04_unit_passive_wildfire_aura: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc09_unit_abilities_death_from_above / wh2_dlc09_unit_abilities_death_from_above: bombardment=wh2_dlc09_unit_abilities_death_from_above: external mechanic/activation not evaluated.
- wh2_dlc09_unit_passive_spirit_conduit / wh2_dlc09_unit_passive_spirit_conduit: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc09_unit_passive_unstable_mark_ii_sand / wh2_dlc09_unit_passive_unstable_mark_ii_sand: behaviour=undead_crumbling: external mechanic/activation not evaluated.
- wh2_dlc09_unit_passive_unstable_sand / wh2_dlc09_unit_passive_unstable_sand: behaviour=undead_crumbling: external mechanic/activation not evaluated.
- wh2_dlc10_spell_bound_lesser_doombolt / wh2_dlc10_spell_bound_lesser_doombolt: bombardment=wh2_dlc10_spell_bound_lesser_doombolt: external mechanic/activation not evaluated.
- wh2_dlc10_spell_bound_soulblight / wh2_dlc10_spell_bound_soulblight: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc10_spell_bound_word_of_pain / wh2_dlc10_spell_bound_word_of_pain: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc10_unit_abilities_frost_breath / wh2_dlc10_unit_abilities_frost_breath: activated_projectile=wh2_dlc10_unit_abilities_frost_breath: external mechanic/activation not evaluated.
- wh2_dlc10_unit_abilities_frost_wyrm_breath / wh2_dlc10_unit_abilities_frost_wyrm_breath: activated_projectile=wh2_dlc10_unit_abilities_frost_breath: external mechanic/activation not evaluated.
- wh2_dlc10_unit_passive_abyssal_howl / wh2_dlc10_unit_passive_abyssal_howl: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc10_unit_passive_the_trial_of_blades / wh2_dlc10_unit_passive_the_trial_of_blades: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc11_unit_passive_abandon_ship / wh2_dlc11_unit_passive_abandon_ship: spawned_unit=wh2_dlc11_cst_inf_zombie_deckhands_mob_necrofex_summoned_0: external mechanic/activation not evaluated.
- wh2_dlc11_unit_passive_extra_powder / wh2_dlc11_unit_passive_extra_powder: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc11_unit_passive_gaseous_demise / wh2_dlc11_unit_passive_gaseous_demise: vortex=wh2_dlc11_unit_abilities_gaseous_demise: external mechanic/activation not evaluated.
- wh2_dlc11_unit_passive_noxious_unstable_mark_ii / wh2_dlc11_unit_passive_noxious_unstable_mark_ii: vortex=wh2_dlc11_unit_abilities_gaseous_demise: external mechanic/activation not evaluated.
- wh2_dlc12_character_abilities_brass_orb_tech_lab_doom_flayer / wh2_dlc12_character_abilities_brass_orb_tech_lab_doom_flayer: vortex=wh2_dlc12_character_abilities_brass_orb: external mechanic/activation not evaluated.
- wh2_dlc12_unit_abilities_ark_of_sotek / wh2_dlc12_unit_abilities_ark_of_sotek: vortex=wh2_dlc12_unit_abilities_ark_of_sotek: external mechanic/activation not evaluated.
- wh2_dlc12_unit_abilities_burning_alignment / wh2_dlc12_unit_abilities_burning_alignment: vortex=wh2_dlc12_unit_abilities_burning_alignment: external mechanic/activation not evaluated.
- wh2_dlc12_unit_abilities_drop_rocks_of_sundering / wh2_dlc12_unit_abilities_drop_rocks_of_sundering: bombardment=wh2_dlc12_unit_abilities_drop_rocks_of_sundering: external mechanic/activation not evaluated.
- wh2_dlc12_unit_abilities_shield_of_chaqua / wh2_dlc12_unit_abilities_shield_of_chaqua: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc12_unit_abilities_toad_rage / wh2_dlc12_unit_abilities_toad_rage: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc12_unit_passive_portent_of_warding / wh2_dlc12_unit_passive_portent_of_warding: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc12_unit_passive_the_best_defence / wh2_dlc12_unit_passive_the_best_defence: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc12_unit_passive_thunderous_one / wh2_dlc12_unit_passive_thunderous_one: bombardment=wh2_dlc12_unit_thunderous_one: external mechanic/activation not evaluated.
- wh2_dlc13_unit_abilities_bathed_in_blood / wh2_dlc13_unit_abilities_bathed_in_blood: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc13_unit_abilities_blinding_radiance / wh2_dlc13_unit_abilities_blinding_radiance: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc13_unit_abilities_emergency_vent / wh2_dlc13_unit_abilities_emergency_vent: vortex=wh2_dlc13_unit_abilities_emergency_vent: external mechanic/activation not evaluated.
- wh2_dlc13_unit_passive_dread_aversion / wh2_dlc13_unit_passive_dread_aversion: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc13_unit_passive_kaboom / wh2_dlc13_unit_passive_kaboom: vortex=wh2_dlc13_unit_passive_kaboom: external mechanic/activation not evaluated.
- wh2_dlc14_unit_abilities_doppelgang / wh2_dlc14_unit_abilities_doppelgang: spawned_unit=wh2_dlc14_skv_inf_eshin_triads_ror_summoned_0: external mechanic/activation not evaluated.
- wh2_dlc14_unit_abilities_warp_quake / wh2_dlc14_unit_abilities_warp_quake: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc14_unit_passive_aura_of_agony / wh2_dlc14_unit_passive_aura_of_agony: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc14_unit_passive_aura_of_ardour / wh2_dlc14_unit_passive_aura_of_ardour: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc14_unit_passive_barbed_net / wh2_dlc14_unit_passive_barbed_net: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc14_unit_passive_duck_and_weave / wh2_dlc14_unit_passive_duck_and_weave: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_abilities_arachneruption / wh2_dlc15_unit_abilities_arachneruption: bombardment=wh2_dlc15_unit_abilities_arachneruption: external mechanic/activation not evaluated.
- wh2_dlc15_unit_abilities_emberstorm / wh2_dlc15_unit_abilities_emberstorm: vortex=wh2_dlc15_unit_abilities_emberstorm: external mechanic/activation not evaluated.
- wh2_dlc15_unit_abilities_mighty_roar / wh2_dlc15_unit_abilities_mighty_roar: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_abilities_noxious_breath_imrik / wh2_dlc15_unit_abilities_noxious_breath_imrik: activated_projectile=wh2_dlc15_hef_black_dragon_breath_imrik: external mechanic/activation not evaluated.
- wh2_dlc15_unit_abilities_sun_dragon_breath_imrik / wh2_dlc15_unit_abilities_sun_dragon_breath_imrik: activated_projectile=wh2_dlc15_hef_sun_dragon_breath_imrik: external mechanic/activation not evaluated.
- wh2_dlc15_unit_passive_fiery_rebirth / wh2_dlc15_unit_passive_fiery_rebirth: vortex=wh2_dlc15_unit_passive_fiery_rebirth: external mechanic/activation not evaluated.
- wh2_dlc15_unit_passive_giant_explodin_spores / wh2_dlc15_unit_passive_giant_explodin_spores: bombardment=wh2_dlc15_unit_passive_giant_explodin_spores: external mechanic/activation not evaluated.
- wh2_dlc15_unit_passive_overwhelming_odour / wh2_dlc15_unit_passive_overwhelming_odour: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_passive_pump_harder_ladz / wh2_dlc15_unit_passive_pump_harder_ladz: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_passive_rubble_and_ruin_tier_1 / wh2_dlc15_unit_passive_rubble_and_ruin_tier_1: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_passive_rubble_and_ruin_tier_2 / wh2_dlc15_unit_passive_rubble_and_ruin_tier_2: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_passive_rubble_and_ruin_tier_3 / wh2_dlc15_unit_passive_rubble_and_ruin_tier_3: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc15_unit_passive_spirit_of_gork_or_mork / wh2_dlc15_unit_passive_spirit_of_gork_or_mork: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc16_lord_passive_ceithin_hars_tenacity / wh2_dlc16_lord_passive_ceithin_hars_tenacity: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc16_spell_bound_flesh_to_stone / wh2_dlc16_spell_bound_flesh_to_stone: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc16_unit_abilities_fluid_injection / wh2_dlc16_unit_abilities_fluid_injection: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc16_unit_abilities_whirling_death / wh2_dlc16_unit_abilities_whirling_death: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc16_unit_passive_warp_discharge / wh2_dlc16_unit_passive_warp_discharge: vortex=wh2_dlc16_unit_passive_warp_discharge: external mechanic/activation not evaluated.
- wh2_dlc17_spell_bound_lesser_chain_lightning / wh2_dlc17_spell_bound_lesser_chain_lightning: vortex=wh2_dlc17_spell_bound_lesser_chain_lightning: external mechanic/activation not evaluated.
- wh2_dlc17_spell_bound_urannons_thunderbolt / wh2_dlc17_spell_bound_urannons_thunderbolt: bombardment=wh_main_spell_heavens_urannons_thunderbolt: external mechanic/activation not evaluated.
- wh2_dlc17_unit_abilities_primeval_roar / wh2_dlc17_unit_abilities_primeval_roar: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc17_unit_passive_drunken_bravado / wh2_dlc17_unit_passive_drunken_bravado: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_dlc17_unit_passive_searing_bile_blood / wh2_dlc17_unit_passive_searing_bile_blood: vortex=wh2_dlc17_unit_passive_searing_bile_blood: external mechanic/activation not evaluated.
- wh2_dlc17_unit_passive_spurting_bile_blood / wh2_dlc17_unit_passive_spurting_bile_blood: vortex=wh2_dlc17_unit_passive_spurting_bile_blood: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_death_shriek / wh2_main_unit_abilities_death_shriek: activated_projectile=wh2_main_vmp_terrorgheist_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_drop_rocks / wh2_main_unit_abilities_drop_rocks: bombardment=wh2_main_unit_abilities_drop_rocks: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_fiery_breath / wh2_main_unit_abilities_fiery_breath: activated_projectile=wh2_main_def_war_hydra_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_moon_dragons_breath / wh2_main_unit_abilities_moon_dragons_breath: activated_projectile=wh2_main_hef_moon_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_noxious_breath / wh2_main_unit_abilities_noxious_breath: activated_projectile=wh2_main_def_black_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_pestilential_breath / wh2_main_unit_abilities_pestilential_breath: activated_projectile=wh2_main_vmp_zombie_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_soporific_breath / wh2_main_unit_abilities_soporific_breath: activated_projectile=wh2_main_wef_forest_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_star_dragons_breath / wh2_main_unit_abilities_star_dragons_breath: activated_projectile=wh2_main_hef_star_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_sun_dragons_breath / wh2_main_unit_abilities_sun_dragons_breath: activated_projectile=wh2_main_hef_sun_dragon_breath: external mechanic/activation not evaluated.
- wh2_main_unit_abilities_wake_of_fire / wh2_main_unit_abilities_wake_of_fire: bombardment=wh2_main_unit_abilities_wake_of_fire: external mechanic/activation not evaluated.
- wh2_main_unit_passive_attuned_to_magic / wh2_main_unit_passive_attuned_to_magic: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_main_unit_passive_blizzard_aura / wh2_main_unit_passive_blizzard_aura: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_main_unit_passive_primal_instincts / wh2_main_unit_passive_primal_instincts: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_main_unit_passive_scurry_away / wh2_main_unit_passive_scurry_away: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_main_unit_passive_snare_net / wh2_main_unit_passive_snare_net: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_main_unit_passive_strength_in_numbers / wh2_main_unit_passive_strength_in_numbers: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh2_main_unit_passive_the_rats_emerge / wh2_main_unit_passive_the_rats_emerge: spawned_unit=wh2_main_skv_inf_skavenslave_spearmen_0_summoned: external mechanic/activation not evaluated.
- wh3_cp1_unit_passive_ferocious_ambush / wh3_cp1_unit_passive_ferocious_ambush: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc20_spell_bound_gehennas_golden_hounds / wh3_dlc20_spell_bound_gehennas_golden_hounds: vortex=wh_main_spell_metal_gehennas_golden_hounds: external mechanic/activation not evaluated.
- wh3_dlc20_unit_abilities_violent_wind / wh3_dlc20_unit_abilities_violent_wind: vortex=wh3_dlc20_abilities_violent_wind: external mechanic/activation not evaluated.
- wh3_dlc20_unit_passive_giver_of_arcane_glory / wh3_dlc20_unit_passive_giver_of_arcane_glory: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc20_unit_passive_giver_of_furious_glory / wh3_dlc20_unit_passive_giver_of_furious_glory: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc20_unit_passive_giver_of_glory / wh3_dlc20_unit_passive_giver_of_glory: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc20_unit_passive_murderous_charge / wh3_dlc20_unit_passive_murderous_charge: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc20_unit_passive_supreme_vanity / wh3_dlc20_unit_passive_supreme_vanity: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_spell_bound_enfeebling_foe / wh3_dlc23_spell_bound_enfeebling_foe: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_spell_bound_the_withering / wh3_dlc23_spell_bound_the_withering: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_abilities_flaming_breath / wh3_dlc23_unit_abilities_flaming_breath: activated_projectile=wh3_dlc23_unit_abilities_flaming_breath: external mechanic/activation not evaluated.
- wh3_dlc23_unit_abilities_more_power / wh3_dlc23_unit_abilities_more_power: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_backstabbers / wh3_dlc23_unit_passive_backstabbers: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_blazing_body / wh3_dlc23_unit_passive_blazing_body: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_cowardly_despoilers / wh3_dlc23_unit_passive_cowardly_despoilers: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_dig_in / wh3_dlc23_unit_passive_dig_in: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_hellish_frenzy / wh3_dlc23_unit_passive_hellish_frenzy: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_malign_authority / wh3_dlc23_unit_passive_malign_authority: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_pelt_of_wulfag / wh3_dlc23_unit_passive_pelt_of_wulfag: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc23_unit_passive_revel_in_fear / wh3_dlc23_unit_passive_revel_in_fear: Intensity-based activation: intensity formula is not evaluated.
- wh3_dlc23_unit_passive_revel_in_fear / wh3_dlc23_unit_passive_revel_in_fear: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_mount_passive_wounded_pride / wh3_dlc24_mount_passive_wounded_pride: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_passive_shield_of_thorns / wh3_dlc24_passive_shield_of_thorns: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_bastion_of_the_great_cities / wh3_dlc24_unit_abilities_bastion_of_the_great_cities: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_disdain_of_the_dragon_emperor / wh3_dlc24_unit_abilities_disdain_of_the_dragon_emperor: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_fearsome_roar / wh3_dlc24_unit_abilities_fearsome_roar: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_fury_of_the_falling_blade / wh3_dlc24_unit_abilities_fury_of_the_falling_blade: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_howl_of_the_great_beast / wh3_dlc24_unit_abilities_howl_of_the_great_beast: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_jade_dragons_breath / wh3_dlc24_unit_abilities_jade_dragons_breath: vortex=wh3_dlc24_bound_spell_jade_dragons_breath: external mechanic/activation not evaluated.
- wh3_dlc24_unit_abilities_lampreys_bite / wh3_dlc24_unit_abilities_lampreys_bite: vortex=wh3_dlc24_lord_abilities_lampreys_bite: external mechanic/activation not evaluated.
- wh3_dlc24_unit_abilities_maelstrom_of_change / wh3_dlc24_unit_abilities_maelstrom_of_change: spreading=wh3_dlc24_unit_abilities_maelstrom_of_change: propagation not evaluated.
- wh3_dlc24_unit_abilities_mark_of_yin / wh3_dlc24_unit_abilities_mark_of_yin: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_abilities_moon_flare / wh3_dlc24_unit_abilities_moon_flare: vortex=wh3_dlc24_unit_abilities_moon_flare: external mechanic/activation not evaluated.
- wh3_dlc24_unit_abilities_nan_gau_grenades / wh3_dlc24_unit_abilities_nan_gau_grenades: bombardment=wh3_dlc24_unit_abilities_nan_gau_grenade: external mechanic/activation not evaluated.
- wh3_dlc24_unit_abilities_witchbrew / wh3_dlc24_unit_abilities_witchbrew: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_bound_missile_mirror / wh3_dlc24_unit_bound_missile_mirror: behaviour=missile_mirror: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_arcane_charge / wh3_dlc24_unit_passive_arcane_charge: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_construct_instability / wh3_dlc24_unit_passive_construct_instability: behaviour=undead_crumbling: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_construct_instability_ii / wh3_dlc24_unit_passive_construct_instability_ii: behaviour=undead_crumbling: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_elemental_instability / wh3_dlc24_unit_passive_elemental_instability: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_elemental_instability_ii / wh3_dlc24_unit_passive_elemental_instability_ii: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_eyes_of_the_empress / wh3_dlc24_unit_passive_eyes_of_the_empress: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_gift_of_mutation / wh3_dlc24_unit_passive_gift_of_mutation: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_guardian_shield / wh3_dlc24_unit_passive_guardian_shield: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_icon_of_the_great_cities / wh3_dlc24_unit_passive_icon_of_the_great_cities: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_petrifying_gaze / wh3_dlc24_unit_passive_petrifying_gaze: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_predatory_fighter / wh3_dlc24_unit_passive_predatory_fighter: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_sour_discharge / wh3_dlc24_unit_passive_sour_discharge: vortex=wh3_dlc24_unit_abilities_sour_discharge: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_sour_discharge / wh3_dlc24_unit_passive_sour_discharge: behaviour=vortex_on_entity_death: external mechanic/activation not evaluated.
- wh3_dlc24_unit_passive_spawn_kin_kroxigors / wh3_dlc24_unit_passive_spawn_kin_kroxigors: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc24_unit_passive_tides_of_transformation / wh3_dlc24_unit_passive_tides_of_transformation: vortex=wh3_dlc23_lord_abilities_tide_of_transformation: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_full_power / wh3_dlc25_unit_abilities_full_power: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_abilities_gyrocopter_bomb_anti_large / wh3_dlc25_unit_abilities_gyrocopter_bomb_anti_large: bombardment=wh3_dlc25_unit_abilities_gyrocopter_grenade_anti_large: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_spear_of_grungni / wh3_dlc25_unit_abilities_spear_of_grungni: activated_projectile=wh3_dlc25_unit_abilities_spear_of_grungni: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_unspeakable_foulness / wh3_dlc25_unit_abilities_unspeakable_foulness: activated_projectile=wh3_dlc25_unit_abilities_unspeakable_foulness: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_whirlwind_of_death / wh3_dlc25_unit_abilities_whirlwind_of_death: vortex=wh3_dlc25_unit_abilities_whirlwind_of_death: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_whirlwind_of_death / wh3_dlc25_unit_abilities_whirlwind_of_death: behaviour=vortex_per_entity: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_whirlwind_of_death_ror / wh3_dlc25_unit_abilities_whirlwind_of_death_ror: vortex=wh3_dlc25_unit_abilities_whirlwind_of_death: external mechanic/activation not evaluated.
- wh3_dlc25_unit_abilities_whirlwind_of_death_ror / wh3_dlc25_unit_abilities_whirlwind_of_death_ror: behaviour=vortex_per_entity: external mechanic/activation not evaluated.
- wh3_dlc25_unit_passive_abandon_ship / wh3_dlc25_unit_passive_abandon_ship: vortex=wh3_dlc25_unit_passive_abandon_ship: external mechanic/activation not evaluated.
- wh3_dlc25_unit_passive_abandon_ship / wh3_dlc25_unit_passive_abandon_ship: behaviour=vortex_on_death: external mechanic/activation not evaluated.
- wh3_dlc25_unit_passive_blackpowder_discipline / wh3_dlc25_unit_passive_blackpowder_discipline: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_passive_corrosive_bile / wh3_dlc25_unit_passive_corrosive_bile: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_passive_dwarf_rum / wh3_dlc25_unit_passive_dwarf_rum: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_passive_nurgling_emergence / wh3_dlc25_unit_passive_nurgling_emergence: spawned_unit=wh3_dlc25_nur_inf_nurglings_summoned: external mechanic/activation not evaluated.
- wh3_dlc25_unit_passive_rear_guardian / wh3_dlc25_unit_passive_rear_guardian: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_passive_tears_of_nurgle / wh3_dlc25_unit_passive_tears_of_nurgle: spreading=wh3_dlc25_unit_passive_tears_of_nurgle: propagation not evaluated.
- wh3_dlc25_unit_passive_tears_of_nurgle / wh3_dlc25_unit_passive_tears_of_nurgle: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_passive_the_blessing_of_the_father / wh3_dlc25_unit_passive_the_blessing_of_the_father: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc25_unit_passive_wards_of_grimnir / wh3_dlc25_unit_passive_wards_of_grimnir: Intensity-based activation: intensity formula is not evaluated.
- wh3_dlc25_unit_passive_wards_of_grimnir / wh3_dlc25_unit_passive_wards_of_grimnir: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_abilities_acid_vomit / wh3_dlc26_unit_abilities_acid_vomit: vortex=wh3_dlc26_unit_abilities_acid_vomit: external mechanic/activation not evaluated.
- wh3_dlc26_unit_abilities_force_of_total_destruction / wh3_dlc26_unit_abilities_force_of_total_destruction: vortex=wh3_dlc26_unit_abilities_force_of_total_destruction: external mechanic/activation not evaluated.
- wh3_dlc26_unit_abilities_force_of_total_destruction / wh3_dlc26_unit_abilities_force_of_total_destruction: behaviour=vortex_on_entity_death: external mechanic/activation not evaluated.
- wh3_dlc26_unit_abilities_immovable_bulwark / wh3_dlc26_unit_abilities_immovable_bulwark: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_abilities_maneater_smoke_bomb / wh3_dlc26_unit_abilities_maneater_smoke_bomb: vortex=wh2_main_character_abilities_verminous_valour: external mechanic/activation not evaluated.
- wh3_dlc26_unit_abilities_maneater_smoke_bomb / wh3_dlc26_unit_abilities_maneater_smoke_bomb: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_abilities_marked_for_eatin / wh3_dlc26_unit_abilities_marked_for_eatin: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_abilities_unstoppable_choppas / wh3_dlc26_unit_abilities_unstoppable_choppas: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_passive_aura_of_frost / wh3_dlc26_unit_passive_aura_of_frost: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_passive_bloodstorm / wh3_dlc26_unit_passive_bloodstorm: vortex=wh3_dlc26_unit_abilities_bloodstorm: external mechanic/activation not evaluated.
- wh3_dlc26_unit_passive_bloodstorm / wh3_dlc26_unit_passive_bloodstorm: behaviour=vortex_on_entity_death: external mechanic/activation not evaluated.
- wh3_dlc26_unit_passive_carrion_frenzy / wh3_dlc26_unit_passive_carrion_frenzy: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_passive_grey_supremacy / wh3_dlc26_unit_passive_grey_supremacy: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_passive_hellraiser / wh3_dlc26_unit_passive_hellraiser: vortex=wh3_dlc26_unit_passive_hellraiser: external mechanic/activation not evaluated.
- wh3_dlc26_unit_passive_piggy_back_joust / wh3_dlc26_unit_passive_piggy_back_joust: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc26_unit_passive_uncanny_coordination / wh3_dlc26_unit_passive_uncanny_coordination: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_character_abilities_murderous_mastery / wh3_dlc27_character_abilities_murderous_mastery: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_spell_bound_enfeebling_foe / wh3_dlc27_spell_bound_enfeebling_foe: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_spell_bound_runecaller_death_doom_and_darkness / wh3_dlc27_spell_bound_runecaller_death_doom_and_darkness: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_abilities_consuming_hatred / wh3_dlc27_unit_abilities_consuming_hatred: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_abilities_dread_maw_surface / wh3_dlc27_unit_abilities_dread_maw_surface: vortex=wh3_dlc27_unit_abilities_burrow: external mechanic/activation not evaluated.
- wh3_dlc27_unit_abilities_dread_maw_surface / wh3_dlc27_unit_abilities_dread_maw_surface: spawned_unit=wh3_dlc27_nor_mon_dread_maw: external mechanic/activation not evaluated.
- wh3_dlc27_unit_abilities_dread_maw_surface / wh3_dlc27_unit_abilities_dread_maw_surface: behaviour=dig_yourself_out: external mechanic/activation not evaluated.
- wh3_dlc27_unit_abilities_flaming_breath / wh3_dlc27_unit_abilities_flaming_breath: activated_projectile=wh3_dlc27_unit_abilities_flaming_breath: external mechanic/activation not evaluated.
- wh3_dlc27_unit_passive_abyssal_cloak / wh3_dlc27_unit_passive_abyssal_cloak: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_battle_songs / wh3_dlc27_unit_passive_battle_songs: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_burrowing_instinct / wh3_dlc27_unit_passive_burrowing_instinct: behaviour=teleport_leave_battle: external mechanic/activation not evaluated.
- wh3_dlc27_unit_passive_burrowing_instinct / wh3_dlc27_unit_passive_burrowing_instinct: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_dual_personality_betrayer / wh3_dlc27_unit_passive_dual_personality_betrayer: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_dual_personality_defiler / wh3_dlc27_unit_passive_dual_personality_defiler: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_dual_personality_savage / wh3_dlc27_unit_passive_dual_personality_savage: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_endless_malice / wh3_dlc27_unit_passive_endless_malice: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_enfeebling_cold / wh3_dlc27_unit_passive_enfeebling_cold: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_momentum / wh3_dlc27_unit_passive_momentum: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_murderous_euphoria / wh3_dlc27_unit_passive_murderous_euphoria: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_naval_discipline / wh3_dlc27_unit_passive_naval_discipline: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_pleasure_through_pain / wh3_dlc27_unit_passive_pleasure_through_pain: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_poisonous_blood / wh3_dlc27_unit_passive_poisonous_blood: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc27_unit_passive_split_up / wh3_dlc27_unit_passive_split_up: vortex=wh3_dlc27_unit_passive_split_up: external mechanic/activation not evaluated.
- wh3_dlc27_unit_passive_split_up / wh3_dlc27_unit_passive_split_up: behaviour=vortex_on_death: external mechanic/activation not evaluated.
- wh3_dlc29_mount_passive_unholiest_relic / wh3_dlc29_mount_passive_unholiest_relic: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_passive_spell_lightning_strike / wh3_dlc29_passive_spell_lightning_strike: bombardment=wh3_dlc29_passive_spell_heavens_lightning_strike: external mechanic/activation not evaluated.
- wh3_dlc29_spell_bound_okkams_mindrazor / wh3_dlc29_spell_bound_okkams_mindrazor: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_spell_bound_plague / wh3_dlc29_spell_bound_plague: vortex=wh2_main_spell_plague_plague: external mechanic/activation not evaluated.
- wh3_dlc29_spell_bound_soulblight / wh3_dlc29_spell_bound_soulblight: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_abilities_battle_of_wills / wh3_dlc29_unit_abilities_battle_of_wills: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_abilities_blood_omens / wh3_dlc29_unit_abilities_blood_omens: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_abilities_flesh_eating_scarabs / wh3_dlc29_unit_abilities_flesh_eating_scarabs: vortex=wh3_dlc29_unit_abilities_flesh_eating_scarabs: external mechanic/activation not evaluated.
- wh3_dlc29_unit_abilities_meteor_strike / wh3_dlc29_unit_abilities_meteor_strike: bombardment=wh_main_spell_heavens_comet_of_casandora_bound: external mechanic/activation not evaluated.
- wh3_dlc29_unit_abilities_of_warp_and_ruin / wh3_dlc29_unit_abilities_of_warp_and_ruin: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_abilities_raging_tornado / wh3_dlc29_unit_abilities_raging_tornado: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_abilities_soul_slaying_hunger / wh3_dlc29_unit_abilities_soul_slaying_hunger: vortex=wh3_dlc29_unit_abilities_soul_slaying_hunger: external mechanic/activation not evaluated.
- wh3_dlc29_unit_abilities_the_gaze_of_dust / wh3_dlc29_unit_abilities_the_gaze_of_dust: activated_projectile=wh3_dlc29_unit_abilities_the_gaze_of_dust: external mechanic/activation not evaluated.
- wh3_dlc29_unit_abilities_wrath_of_the_sands / wh3_dlc29_unit_abilities_wrath_of_the_sands: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_active_maleficient_gaze / wh3_dlc29_unit_active_maleficient_gaze: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_active_ripping_blades / wh3_dlc29_unit_active_ripping_blades: vortex=wh3_dlc29_unit_active_ripping_blades: external mechanic/activation not evaluated.
- wh3_dlc29_unit_passive_aura_of_vitriol / wh3_dlc29_unit_passive_aura_of_vitriol: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_carnage / wh3_dlc29_unit_passive_carnage: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_crush_the_weak / wh3_dlc29_unit_passive_crush_the_weak: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_curse_of_the_fallen / wh3_dlc29_unit_passive_curse_of_the_fallen: vortex=wh3_dlc29_unit_passive_curse_of_the_fallen: external mechanic/activation not evaluated.
- wh3_dlc29_unit_passive_curse_of_the_fallen / wh3_dlc29_unit_passive_curse_of_the_fallen: behaviour=vortex_on_death: external mechanic/activation not evaluated.
- wh3_dlc29_unit_passive_doom_of_many / wh3_dlc29_unit_passive_doom_of_many: Intensity-based activation: intensity formula is not evaluated.
- wh3_dlc29_unit_passive_doom_of_many / wh3_dlc29_unit_passive_doom_of_many: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_drakenhof_banner / wh3_dlc29_unit_passive_drakenhof_banner: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_lieutenants_of_the_apocalypse / wh3_dlc29_unit_passive_lieutenants_of_the_apocalypse: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_little_plague_i / wh3_dlc29_unit_passive_little_plague_i: spreading=wh3_dlc29_unit_passive_contained_plague: propagation not evaluated.
- wh3_dlc29_unit_passive_little_plague_ii / wh3_dlc29_unit_passive_little_plague_ii: spreading=wh3_dlc29_unit_passive_contained_plague: propagation not evaluated.
- wh3_dlc29_unit_passive_mutant_rush / wh3_dlc29_unit_passive_mutant_rush: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_pestilent_perfection / wh3_dlc29_unit_passive_pestilent_perfection: vortex=wh3_dlc29_unit_passive_pestilent_perfection: external mechanic/activation not evaluated.
- wh3_dlc29_unit_passive_pestilent_perfection / wh3_dlc29_unit_passive_pestilent_perfection: behaviour=vortex_on_entity_death: external mechanic/activation not evaluated.
- wh3_dlc29_unit_passive_portents_of_battle / wh3_dlc29_unit_passive_portents_of_battle: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_power_grab / wh3_dlc29_unit_passive_power_grab: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_scrying_pool / wh3_dlc29_unit_passive_scrying_pool: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_spiky / wh3_dlc29_unit_passive_spiky: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_dlc29_unit_passive_yell_and_bawl / wh3_dlc29_unit_passive_yell_and_bawl: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_mount_bound_celestial_comet / wh3_main_mount_bound_celestial_comet: bombardment=wh_main_spell_heavens_comet_of_casandora_bound: external mechanic/activation not evaluated.
- wh3_main_mount_bound_celestial_lightning / wh3_main_mount_bound_celestial_lightning: bombardment=wh_main_spell_heavens_urannons_thunderbolt: external mechanic/activation not evaluated.
- wh3_main_mount_passive_totem_of_endless_bloodletting / wh3_main_mount_passive_totem_of_endless_bloodletting: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_spell_bound_lash_of_slaanesh_keeper_of_secrets / wh3_main_spell_bound_lash_of_slaanesh_keeper_of_secrets: vortex=wh3_main_spell_slaanesh_lash_of_slaanesh: external mechanic/activation not evaluated.
- wh3_main_spell_bound_pestilent_breath / wh3_main_spell_bound_pestilent_breath: vortex=wh2_main_mount_bound_pestilent_breath: external mechanic/activation not evaluated.
- wh3_main_spell_nurgle_miasma_of_pestilence_bound / wh3_main_spell_nurgle_miasma_of_pestilence_bound: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_spell_nurgle_stream_of_corruption_bound / wh3_main_spell_nurgle_stream_of_corruption_bound: vortex=wh3_main_spell_nurgle_stream_of_corruption: external mechanic/activation not evaluated.
- wh3_main_spell_slaanesh_acquiescence_bound / wh3_main_spell_slaanesh_acquiescence_bound: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_spell_slaanesh_phantasmagoria_bound / wh3_main_spell_slaanesh_phantasmagoria_bound: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_spell_tzeentch_blue_fire_of_tzeentch_bound / wh3_main_spell_tzeentch_blue_fire_of_tzeentch_bound: activated_projectile=wh3_main_spell_tzeentch_blue_fire_of_tzeentch: external mechanic/activation not evaluated.
- wh3_main_spell_tzeentch_pink_fire_of_tzeentch_bound / wh3_main_spell_tzeentch_pink_fire_of_tzeentch_bound: vortex=wh3_main_spell_tzeentch_pink_fire_of_tzeentch: external mechanic/activation not evaluated.
- wh3_main_unit_abilities_elemental_breath / wh3_main_unit_abilities_elemental_breath: activated_projectile=wh3_main_unit_abilities_elemental_breath: external mechanic/activation not evaluated.
- wh3_main_unit_abilities_gnoblar_traps / wh3_main_unit_abilities_gnoblar_traps: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_abilities_sky_junk_bomb / wh3_main_unit_abilities_sky_junk_bomb: bombardment=wh3_main_unit_abilities_sky_junk_bomb: external mechanic/activation not evaluated.
- wh3_main_unit_abilities_stun_bomb / wh3_main_unit_abilities_stun_bomb: vortex=wh_dlc06_lord_abilities_flash_bomb: external mechanic/activation not evaluated.
- wh3_main_unit_abilities_stun_bomb / wh3_main_unit_abilities_stun_bomb: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_aura_of_immolation / wh3_main_unit_passive_aura_of_immolation: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_cloud_of_flies / wh3_main_unit_passive_cloud_of_flies: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_daemonic_instability_daemon / wh3_main_unit_passive_daemonic_instability_daemon: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_daemon_ii / wh3_main_unit_passive_daemonic_instability_daemon_ii: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_nurgle / wh3_main_unit_passive_daemonic_instability_nurgle: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_nurgle_ii / wh3_main_unit_passive_daemonic_instability_nurgle_ii: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_slaanesh / wh3_main_unit_passive_daemonic_instability_slaanesh: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_slaanesh_ii / wh3_main_unit_passive_daemonic_instability_slaanesh_ii: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_tzeentch / wh3_main_unit_passive_daemonic_instability_tzeentch: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_daemonic_instability_tzeentch_ii / wh3_main_unit_passive_daemonic_instability_tzeentch_ii: behaviour=daemonic_instability: external mechanic/activation not evaluated.
- wh3_main_unit_passive_defensive_stance / wh3_main_unit_passive_defensive_stance: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_eye_of_the_dragon / wh3_main_unit_passive_eye_of_the_dragon: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_feasting_on_fear / wh3_main_unit_passive_feasting_on_fear: Intensity-based activation: intensity formula is not evaluated.
- wh3_main_unit_passive_hellblade / wh3_main_unit_passive_hellblade: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_slime_trail / wh3_main_unit_passive_slime_trail: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_soul_hunters / wh3_main_unit_passive_soul_hunters: Intensity-based activation: intensity formula is not evaluated.
- wh3_main_unit_passive_soul_hunters / wh3_main_unit_passive_soul_hunters: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_main_unit_passive_soulscent / wh3_main_unit_passive_soulscent: Intensity-based activation: intensity formula is not evaluated.
- wh3_main_unit_passive_soulscent / wh3_main_unit_passive_soulscent: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa06_unit_passive_adaptive_tactics / wh3_twa06_unit_passive_adaptive_tactics: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa06_unit_passive_gloom_of_flies / wh3_twa06_unit_passive_gloom_of_flies: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa06_unit_passive_hungering_blades / wh3_twa06_unit_passive_hungering_blades: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa07_spell_bound_call_of_tor / wh3_twa07_spell_bound_call_of_tor: bombardment=wh3_twa07_spell_bound_call_of_tor: external mechanic/activation not evaluated.
- wh3_twa07_unit_abilities_searing_torrent / wh3_twa07_unit_abilities_searing_torrent: bombardment=wh3_twa07_unit_abilities_searing_torrent: external mechanic/activation not evaluated.
- wh3_twa07_unit_passive_mantle_of_immolation / wh3_twa07_unit_passive_mantle_of_immolation: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa07_unit_passive_obsessive_adoration / wh3_twa07_unit_passive_obsessive_adoration: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa07_unit_passive_wasting_sickness / wh3_twa07_unit_passive_wasting_sickness: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa08_spell_bound_enfeebling_foe_keeper_of_secrets_ror / wh3_twa08_spell_bound_enfeebling_foe_keeper_of_secrets_ror: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa08_spell_bound_searing_doom / wh3_twa08_spell_bound_searing_doom: bombardment=wh_main_spell_metal_searing_doom: external mechanic/activation not evaluated.
- wh3_twa08_unit_abilities_glacial_defence / wh3_twa08_unit_abilities_glacial_defence: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa08_unit_passive_goreshell / wh3_twa08_unit_passive_goreshell: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wh3_twa08_unit_passive_redirecting_aura / wh3_twa08_unit_passive_redirecting_aura: behaviour=missile_mirror: external mechanic/activation not evaluated.
- wh3_twa10_unit_passive_blisterback / wh3_twa10_unit_passive_blisterback: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.
- wounds / wh3_main_unit_passive_single_entity: Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.

## 보존 및 출처

기존 모든 src/data JSON과 세 admission/source는 manifest SHA256으로 보존. Unit/Character/EntityType/개인 저장 형식 수정 없음. 신규 source SHA256(evidenceHash): b9ac104e16a8977a35ba536a0e524152d54f7ab8fee42443c1cd9d8d3e04e24d. provenance 전체는 source.json 및 Production sidecar에 보존.
