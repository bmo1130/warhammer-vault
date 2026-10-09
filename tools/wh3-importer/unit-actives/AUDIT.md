# 다음 UNKNOWN 집중 감사로 이관

전체 규칙 연구를 기다리지 않고 검증된 일반 구조를 먼저 승격했다. 보류 유닛 7개(4 PARTIAL / 3 UNKNOWN), 서로 다른 raw key 5개. 누락값을 빈 목록으로 만들지 않았다.

| Unit ID | 상태 | raw key | 이유 유형 | 정확한 이유 |
| --- | --- | --- | --- | --- |
| ca_unit_wh3_dlc26_grn_mon_colossal_squig | UNKNOWN | wh3_dlc26_unit_abilities_blow_apart | TYPE_CONFLICT | Source type and passive flag disagree; no activation flag/name heuristic resolves the conflict. |
| ca_unit_wh3_dlc26_grn_mon_colossal_squig_ror | PARTIAL | wh3_dlc26_unit_abilities_blow_apart | TYPE_CONFLICT | Source type and passive flag disagree; no activation flag/name heuristic resolves the conflict. |
| ca_unit_wh3_dlc29_skv_mon_stormfiend_grinderfists | UNKNOWN | wh3_dlc29_unit_abilities_stormfiend_seismic_snare | ASSIGNMENT_CONTEXT | Specific battle culture is unverified as unconditional base ownership. |
| ca_unit_wh3_twa08_ksl_mon_elemental_bear_0_ror | PARTIAL | wh3_twa08_spell_bound_heart_of_winter_elemental_bear_ror | SPELL_BOUND_AMBIGUITY | Native spell source, zero mana and limited uses do not alone prove a default bound spell. Retain raw direct ownership candidate; lore-spell list is not imported. |
| ca_unit_wh3_dlc25_dwf_veh_thunderbarge | PARTIAL | wh3_dlc25_unit_abilities_thunderburner | TOGGLE_CONTROL_UNRESOLVED | Persistent self effect without a toggle-group or verified formation structure; do not infer toggle control from duration alone. |
| ca_unit_wh3_dlc25_dwf_veh_thunderbarge_grungni_mp | PARTIAL | wh3_dlc25_unit_abilities_thunderburner | TOGGLE_CONTROL_UNRESOLVED | Persistent self effect without a toggle-group or verified formation structure; do not infer toggle control from duration alone. |
| ca_unit_wh3_dlc27_hef_mon_sea_elemental | UNKNOWN | wh3_dlc27_spell_mists_the_writhing_mist_bound | SPELL_BOUND_AMBIGUITY | Native spell source, zero mana and limited uses do not alone prove a default bound spell. Retain raw direct ownership candidate; lore-spell list is not imported. |

## 숨김/후천적 해금 후보

| raw key | native source | 분류 | 근거 |
| --- | --- | --- | --- |
| wh2_dlc15_unit_abilities_exploding_unit | active | HIDDEN_INTERNAL | Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone. |
| wh2_dlc15_unit_passive_rubble_and_ruin_tier_1_bombardment | passive | HIDDEN_INTERNAL | Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone. |
| wh2_dlc15_unit_passive_rubble_and_ruin_tier_2_bombardment | passive | HIDDEN_INTERNAL | Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone. |
| wh2_dlc15_unit_passive_rubble_and_ruin_tier_3_bombardment | passive | HIDDEN_INTERNAL | Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone. |
| wh2_main_faction_abilities_murderous_prowess_indicator | passive | HIDDEN_INTERNAL | Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone. |
| wh3_dlc23_unit_passive_hellbound | passive | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |
| wh3_dlc27_unit_passive_split_up_hidden | passive | HIDDEN_INTERNAL | Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone. |
| wh3_dlc29_ability_bound_prayer_battle_howl | unit | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |
| wh3_dlc29_ability_bound_prayer_winters_chill | unit | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |
| wh3_main_lord_passive_fetid_stench | passive | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |
| wh3_main_lord_passive_glamour_of_slaanesh | passive | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |
| wh3_main_lord_passive_seer_of_destiny | passive | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |
| wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade | passive | ACQUIRED_UNLOCK | Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability. |

이 후보들은 public 기본 목록에 포함하지 않으며 Loc가 있어도 표시하지 않는다. 명시적 숨김·후천 해금 제외는 다른 검증된 기본 목록을 UNKNOWN으로 만들지 않는다. 모든 외부 grant/scope row ID는 admission.json에 보존했다. native spell의 BOUND 예외 및 Thunderburner 조작 상태에는 독립 게임 UI 근거가 필요하다. 문화 제한은 해당 context 확인이 필요하며 이름으로 판정하지 않는다. active/passive 충돌은 native 정의와 실제 조작 가능 여부의 별도 검증이 필요하다.
