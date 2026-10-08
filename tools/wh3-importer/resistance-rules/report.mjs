const table=(headers,rows)=>[headers,headers.map(()=> '---'),...rows].map(r=>'| '+r.join(' | ')+' |').join('\n');
export function renderReport(r) {
  const s=r.summary;
  return `# 기본 피해 저항 승격

Production ${s.production}개. 신규 유닛 ${s.promotedUnits}개 / 독립 저항 필드 ${s.promotedFields}개. COMPLETE ${s.COMPLETE}, PARTIAL ${s.PARTIAL}, UNKNOWN ${s.UNKNOWN}. 명시적인 0 필드 ${s.explicitZeroFields}개, 비영 저항 또는 취약성을 가진 유닛 ${s.nonzeroUnits}개.

${table(['저항','저장 before → after','UNKNOWN before → after','명시적 0','비영','양수','음수'],Object.entries(s.perType).map(([k,v])=>[k,v.before+' → '+v.after,v.unknownBefore+' → '+v.unknownAfter,v.explicitZero,v.nonzero,v.positive,v.negative]))}

## 원본과 의미

CA WH3 ${r.gameVersion}; snapshot ${r.snapshotId}. main_units_tables (schema 7).land_unit → land_units_tables (schema 54).key의 정확한 forward reference만 사용한다. 각 유닛의 land 기록이 소유한 damage_mod_physical / damage_mod_missile / damage_mod_magic / damage_mod_flame / damage_mod_all을 각각 physical / missile / spell / fire / ward에 매핑한다. 원본 db.pack path와 row key, field, schema version, join, trace pointer는 report.json의 sourceRows / joinPaths / catalog에 보존한다. manifest의 canonical JSON SHA256과 기존 단위 감사의 재귀 source pin을 재검증한다.

다섯 필드는 I32, schema default_value="0"이며 설명은 0을 unaffected, +100을 negation으로 설명한다. 실제 저장한 0은 모두 디코딩된 명시적인 raw 0이다. 누락 필드에 default를 주입하지 않는다. 끊어진/중복 reference, 미존재 field, 잘못된 자료형은 해당 저항만 UNKNOWN이다. 다른 저항은 독립 승격한다.

변환은 raw 정수 = 기본 저항 percentage points = 표시 숫자 %. 배율, 반올림, 절삭, 90/100 clamp가 없다. 음수 fire는 부호를 보존하고 UI에서 절댓값을 화염 취약성으로 표시한다. 다른 음수 기본 저항은 검증되지 않은 구조로 보류한다. 현재 원본 최대값은 spell 70이며 fire -25가 실제 존재한다.

ui_unit_stats.key → unit_stat_localisations.stat_key → local_en.pack의 onscreen_name/tooltip_text가 현재 게임 명칭을 확인한다. stat_resistance_magic의 실제 Loc는 Spell Resistance다. 구 schema 설명의 magical damage를 WH3 마법 무기 저항으로 해석하지 않는다. stat_resistance_all은 resistance_ward_save.png 아이콘과 Damage Resistance Loc에 연결된다. fire는 stat_resistance_flame, 취약성은 stat_weakness_flame에 별도 UI 정의가 있다. UI min 0 / clamp_displayed_minimum=true는 표시 설정이며 음수 원본을 0으로 바꾸는 근거가 아니다. max_value=100과 clamp_displayed_maximum=false도 원본 상한 계산식이 아니다.

[CA 공식 Damage Part 1](https://community.creative-assembly.com/total-war/total-war-warhammer/blogs/6-feature-focus-2-damage-part-1), 최초 2023-07-13 / 커뮤니티 이관 2024-03-28: 저항 종류는 독립적이며 화염만 음수 취약성을 허용한다. 주문 저항은 주문 피해에 적용하고 마법 무기 공격은 포함하지 않는다. 물리는 마법 공격·주문을 제외하고, 사격은 마법 투사체를 포함한 사격에, 와드는 모든 피해에 적용된다. 적용 가능한 저항의 합에 90% 상한을 설명하지만 이것은 개별 기본 필드 clamp가 아니다. 이 작업은 적용 조합이나 실제 피해량을 계산하지 않는다.

## 구조별 승격

${table(['원본 구조','신규 COMPLETE','PARTIAL','UNKNOWN'],r.structures.map(v=>[v.shape,v.promoted,v.partial,v.unknown]))}

${table(['CA category','유닛 수'],r.categories.map(v=>[v.category,v.count]))}

이동 구조가 달라도 같은 land 소유 기본 저항 경로를 사용한다. battle_entities, man_entity, mount, battlefield_engines, articulated vehicle의 이동·HP·관통 저항을 합산하거나 선택하지 않는다. mounted/변형 main key는 자기 land key의 필드를 사용한다. variant 이름에 따른 예외는 없다. component 참조가 불완전해도 정확한 land 저항 필드가 있으면 승격한다. schema-inventory.json은 조사 대상의 관련 필드와 reference를 보존한다.

## 독립 검증과 한계

${r.confidenceLimit}

새 bounded CA 추출 ${r.rawComparisons.length}개 Production root / ${r.rawComparisons.length*5}개 저항은 기존 추출과 동일 pack/schema snapshot에서 모두 일치했다. 이 검증은 추출 재현성이지 별도의 게임 카드 실측이 아니다. 4개 Character 지상/탑승 기록도 감사했으나 별도 canonical/mount schema 범위여서 수정하지 않았다. 게임 UI 실제 표시값은 새 추출 표본에서 미측정이며 expected는 CA raw다.

${table(['독립 raw 표본','구조','expected / Production actual (물리, 사격, 주문, 화염, 와드)','결과'],r.rawComparisons.map(v=>[v.name,v.shape,Object.values(v.comparisons).map(c=>c.expected+'/'+c.actual).join(', '),'5/5 MATCH; UI 미측정']))}

${table(['기존/공식 참고 표본','종류','expected / raw / Production actual','confidence'],r.referenceComparisons.map(v=>[v.name,v.kind,Object.entries(v.comparisons).map(([k,c])=>k+' '+c.expected+'/'+c.raw+'/'+c.actual).join(', '),v.confidence]))}

Bloodthirster의 사용자 제공 wiki 참고 physical 20 / spell 35는 독립 reference지만 관찰 날짜·게임 버전·보정 상태가 기록되지 않았다. 공식 Empire Spearmen 무저항 예시는 과거 설명이며 현재 버전의 직접 UI 관찰을 대체하지 않는다. 나머지 구조별 수치는 schema/원본으로 확정한 기본값이다. 전 유닛 게임 카드와 일치했다고 주장하지 않는다. report.json은 null uiReading과 provenance/confidence를 명시한다.

${table(['필드','참고 expected','raw 그대로 actual','×100 actual','100−raw actual','raw/100 actual'],r.candidateComparisons.map(v=>[v.kind,v.expected,v.RAW_PERCENT_POINTS.actual,v.RAW_X100.actual,v.ONE_MINUS_RAW_PERCENT.actual,v.FRACTION.actual]))}

두 비영 참고값에서 raw 그대로만 2/2 일치한다. schema의 0/+100 의미와 phase의 stat_resistance_* 정수 add는 percentage point 해석을 지지한다. phase 효과는 기본값에 적용하지 않는다. 화염 부호 보존은 schema와 공식 의미에 근거하며 새로운 실측값이 아니다.

## 능력과 기본값의 분리

special_ability_to_special_ability_phase_junctions.phase → special_ability_phases.id; special_ability_phase_stat_effects.phase / stat / how → phase / modifiable_unit_stats / unit_stat_modifiers_how_enums. 이 별도 경로의 수치를 기본 land 저항에 합산하지 않는다. 아래 raw effect와 phase duration/passive 속성을 report에 보존한다. possession은 activation을 의미하지 않는다.

${table(['Phase','stat','raw 효과','how','duration','분류'],r.dynamicEffects.map(e=>[e.phase?.id??'미해결',e.stat,e.value,e.how,e.phase?.duration??'미확인',e.ability?.passive===true?'passive / 기본 제외':e.ability?.passive===false?'active / 기본 제외':'phase / 기본 제외']))}

재생의 stat_weakness_flame -20도 기본 fire에 합산하지 않는다. Flesh to Stone의 physical +60은 기간 있는 active 효과다. Duck and Weave physical +10 / Attuned to Magic ward +10은 passive phase 효과다. 효과가 전투 시작부터 적용될 수 있어도 여기는 기본 원본만 표시한다. 기존 resistance-research의 캠페인 Secret of the Grail effect/operation admission은 보류 상태로 유지하며 base field 승격을 근거로 ADD를 승인하지 않는다. 장갑, 방패 사격 방어, projectile_penetration_resistance, 아이템·연구·스킬·난이도·공격자의 마법/화염 flag를 혼합하지 않는다.

## 보류와 범위 보존

이번 1,110 Unit slice의 기본 저항 보류는 ${r.held.length}개다. 이는 기본 필드가 모두 명시적으로 존재한 결과다. 동적/캠페인 최종 저항, 능력 발동 상태, Character 별도 mount record 및 현재 버전 카드 전체 실측은 AUDIT.md에 이관한다. sample 5개는 승격 범위 밖이며 미확정 상태를 그대로 유지한다.

원본 units.json와 모든 기존 src/data 파일은 변경하지 않는다. 최소 기존 UnitResistances optional schema를 재사용한다. 새로운 독립 admission overlay만 defense.resistances에 적용하며, 정확한 역변환으로 공유 identity를 보존한다. UI는 0%, 음수 취약성, 미확인을 구별하고 후천적 효과 제외를 설명한다. 기존 HP 986 / count 1,071 / speed 908 / 이름·능력·roster·검색·개인 기록을 회귀 검증한다. 실행 결과는 VALIDATION.md에 기록한다.
`;
}
export function renderAudit(r) {
  return `# Resistance follow-up audit

Current base-field holds: ${r.held.length}. All 1,110 exact land rows explicitly contain five valid resistance fields; no missing value was turned into zero.

- Fresh live-game card readings are unavailable. Confirm unmodified cards for zero, nonzero, multiple resistance, ward 8, fire -25, flight and mounted/vehicle samples. Record game version, mods, rank, effects and passive activation. Expected/actual pack comparisons are not direct UI measurements.
- Passive/active phase effects can change a visible card even at battle start. Base land fire=0 with regeneration phase weakness is intentionally still base 0. Do not silently promote effective resistance. Keep raw phase refs in report.json and existing ability sources; activation/stacking resolution needs another task.
- Character audit: ${r.characters.map(c=>c.mainKey).join(', ')}. Separate character schema/canonical mount contexts were not modified. Their raw values are audit-only.
- Campaign magic-resistance bonus operation and consumer applicability remain unresolved in the existing resistance-research evidence. This task does not alter that policy or implement a dynamic effect/damage engine.
- For future sources, missing/ambiguous land references, absent named fields or invalid I32 values must stay UNKNOWN per field. Negative nonfire base fields require semantic review. Never apply schema defaults to missing decoded rows.
- UI display clamps and CA's published aggregate 90% combat cap do not clamp stored independent base fields.

Full current exceptions: ${JSON.stringify(r.held)}
`;
}
