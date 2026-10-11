# 공통 능력 사전 규칙

Production 기본 보유 identity 446종만 사전에 연결한다. registry의 culture-only active 1종은 기본 유닛 보유가 아니므로 제외한다. Attribute 50 / Passive 252 / Active 93 / Toggle 10 / Bound 41. 기존 canonical ID, raw alias, admission, Unit, Character와 개인 저장 형식은 수정하지 않는다.

## 정확한 참조 경로

| 분류 | 설명 | 효과 |
|---|---|---|
| Attribute | 기존 admission raw key → `unit_attributes_tables.key` → `unit_attributes_bullet_text_<key>` Loc | 공식 설명 본문. 특성 이름용 `imued_effect_text`를 효과 설명으로 세지 않음 |
| Passive / Active / Toggle / Bound | 기존 admission rawKeys → `unit_abilities_tables.key` → `unit_abilities_tooltip_text_<key>` Loc | `unit_special_abilities_tables.key` → `special_ability_to_special_ability_phase_junctions_tables.special_ability` → `.phase` → `special_ability_phases_tables.id` |
| Stat effect | phase → `special_ability_phase_stat_effects_tables.phase` | `.stat` → `modifiable_unit_stats_tables.stat_key` → `.localisation` → `unit_stat_localisations_tables.stat_key` → `onscreen_name` Loc. `.value` / `.how` 보존 |
| Attribute effect | phase → `special_ability_phase_attribute_effects_tables.phase` | `.attribute` / `.attribute_type` 보존. 별도 보유 특성 admission으로 승격하지 않음 |
| 조건 | ability → `special_ability_to_invalid_usage_flags_tables`, `special_ability_to_auto_deactivate_flags_tables`, `special_ability_to_invalid_target_flags_tables`, `special_ability_to_recharge_contexts_tables` | 각 flag → `special_ability_invalid_usage_flags_tables.flag_key` → `flag_description` / `alt_description` Loc |

Loc의 `{{tr:token}}`은 정확한 key, `ui_text_replacements_localised_text_<token>`, `random_localisation_strings_string_<token>` 순으로 해결한다. `morale`의 random 문자열은 다시 자기 token을 참조하므로 UI text replacement가 우선이다. 동일 key의 다른 본문, 순환, 누락, `%n` 등 미해결 runtime token은 보류한다. 한국어가 실패하면 공식 영어로, 둘 다 실패하면 이름만 확인 상태로 열린다. 이름만 반복하는 본문은 설명으로 인정하지 않는다.

팩션별 text replacement 선택 엔진은 구현하지 않는다. 예를 들어 언데드는 기본 공식 설명을 사용하고 Vampire Counts variant를 자동 대입하지 않는다. 관련 variant 원문은 새 raw source에 보존되어 있다.

## 의미와 제한

- 패시브의 phase attribute 효과는 exact `unit_attributes.key` 및 선언된 `bullet_text` Loc으로 이름·본문을 연결한다. positive=부여 / negative=제거는 processed schema의 명시적 설명을 검증한다. 효과의 raw key/type 및 definition/Loc 행을 보존한다. Unit 기본 보유 특성으로 승격하지 않는다. 저장된 source에 정의·본문이 없는 silenced/cannot_die는 문구 미확인으로 유지한다. 이 후속 확충은 33개 패시브 / 246개 유닛 / 37개 표시 효과이며, 소유권 숫자 및 비패시브 사전 데이터는 유지한다.

- 공식 툴팁은 배경 문구일 수도 있다. 446종 설명 coverage는 전투 메커니즘 446종 완결을 뜻하지 않는다.
- 비영 수치 효과 290종은 phase의 수치와 참조가 확인된 수이다. stat 보정은 원본 value/how로 표시하며 최종 스탯, 퍼센트 단위, 표시 부호를 계산하지 않는다. `unit_stat_modifiers_how_enums` 정의가 설치 schema에 없으므로 add/mult는 원본 문자열로 보존한다.
- 구조화된 조건 235종은 공식 flag 문구가 연결된 수이다. 특성의 조건은 공식 설명 본문에 그대로 제공하며 이 235종에 포함하지 않는다. flag 목록이 비어 있다고 무조건 상시 발동을 확정하지 않는다.
- 자동 해제 조건은 멈추는 조건이다. 반대 문구를 보존하지만 이를 단독으로 완전한 발동 규칙이라고 단정하지 않는다.
- phase 순서와 직접 대상/self/friends/enemies, 숨김 여부, allies/enemies 필터, 접촉 효과 관계를 보존한다. 같은 능력의 여러 phase나 검토된 raw alias를 합산하지 않는다.
- damage_amount는 개체당·주기당 HP, hp_change_frequency는 초, max_damaged_entities는 주기당 개체 제한이다. DPS 및 부대 총 피해를 계산하지 않는다.
- heal_amount는 최대 HP 비율이다. CA 생성 CCO API HealPercent 문서와 설치 raw를 함께 확인하여 ×100으로 %를 표시한다. 재생 raw 0.001 → 0.1% / 1초, resurrect=false. 화염 관련 stat -20은 원본 보정으로 남기고 UI 취약성 부호로 뒤집지 않는다. 모든 회복 phase에는 공식 치유 적용 보정 설명을 공통 규칙으로 연결한다.
- barrier_heal_amount, fatigue_change_ratio, execute_ratio는 schema/API 의미에 따라 ×100. 탄약 등 의미가 덜 확정된 수치는 원본 단위로 보존한다. 지속 -1은 시간 제한 없음, 사용 횟수·재충전 -1은 특수 값이다. 0 범위를 지름/반경이나 UNKNOWN으로 바꾸지 않는다.
- intensity에 의한 실제 변화, behaviour, formation, vortex, bombardment, projectile, spawned_unit, spreading의 외부 계산은 보류한다. 실제 활성 상태와 전체 메커니즘은 NOT_EVALUATED / PARTIAL이다. 능력 효과를 유닛의 기본 수치에 합산하지 않는다.

## 검증과 재현

`collect.mjs`는 직접 열린 CA 9.0.2.0 db.pack / local_en.pack / local_kr.pack의 metadata와 기존 snapshot을 일치시킨 후 bounded query를 수행한다. 새 source에는 96 DB rows와 3,153 Loc rows가 있다. 우선 표본 4개 특성 및 3개 지속 능력의 16 DB rows를 별도로 재조회하여 이전 증거와 exact 비교한다. 게임 카드 직접 실측과 구분한다.

`manifest.json`은 기존 모든 src/data JSON, 세 source/admission 및 의미 근거 문서를 고정한다. 텍스트 SHA256은 Git/Windows의 CRLF를 LF로 정규화하여 다른 checkout에서도 재생된다. 데이터 값과 배열 순서를 포함한 나머지 바이트는 보존한다. `promote-ability-dictionary.mjs --check`는 raw query completeness, sample 일치, 사전 projection 및 감사 문서를 재생한다.

## UI와 문서

Unit 상세의 공통 버튼 → 하나의 native modal panel → 공통 AbilityDetails. 모바일 bottom panel, 독립 scroll, ESC, native focus containment, 닫기 시 opener focus 복귀. 상세가 닫힌 목록에는 본문을 복제하지 않는다. standalone `/abilities/:id`는 같은 사전과 renderer를 사용한다. 안정적인 canonical ID와 repository get/list는 향후 검색·소유 유닛 역참조·관련 링크를 위한 기반이다. EntityType이나 개인 문서·즐겨찾기·최근 기록의 backup contract는 확장하지 않았다.

전체 held raw key와 이유, expected/actual은 [AUDIT.md](AUDIT.md), 실제 화면·테스트 결과는 [VALIDATION.md](VALIDATION.md)에 기록한다.
