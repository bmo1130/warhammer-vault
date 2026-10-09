const table=(h,rows)=>[h,h.map(()=> '---'),...rows].map(r=>'| '+r.join(' | ')+' |').join('\n');
const label={baseDamage:'직격 기본 피해',armorPiercingDamage:'직격 AP 피해',range:'사거리',baseTime:'raw 기본 재장전 (초)'};
const tuple=o=>['baseDamage','armorPiercingDamage','range','baseTime'].map(k=>o[k]??'미확인').join(' / ');
export function renderReport(r) {
  const s=r.summary;
  return `# 유닛 사격 기본 필드 승격

Production ${s.production}개. 정규 사격 무기 ${s.regularMissileUnits}개, N/A ${s.notApplicable}개. COMPLETE ${s.COMPLETE} / PARTIAL ${s.PARTIAL} / UNKNOWN ${s.UNKNOWN} / N/A ${s['N/A']}. 기존 17개 보존, 신규 수치 승격 ${s.newlyPromotedUnits}개.

${table(['필드','저장 before → after','사격 대상 UNKNOWN before → after','대상 370 기준','전체 1,110 저장 기준','N/A 포함 해결 비율'],Object.entries(s.perField).map(([k,v])=>[label[k],v.before+' → '+v.after,v.unknownBefore+' → '+v.unknownAfter,v.targetCoveragePercent.toFixed(2)+'%',v.allUnitStoredPercent.toFixed(2)+'%',v.resolvedIncludingNotApplicablePercent.toFixed(2)+'%']))}

기존 전체 유닛 기준 미저장 1,093개에는 비대상 740개가 포함되어 있었다. 새 UNKNOWN 분모는 확인된 사격 대상 370개이며 N/A는 완료된 비대상이다. N/A는 missile 객체나 가짜 0 피해를 생성하지 않는다. 수치가 없는 객체도 원본으로 확인된 N/A와 미확인을 구별한다. 네 필드 전체 완료율은 ${(s.COMPLETE/370*100).toFixed(2)}%; 하나 이상 수치가 확인된 사격 대상은 ${s.COMPLETE+s.PARTIAL}/370 (${((s.COMPLETE+s.PARTIAL)/370*100).toFixed(2)}%).

## CA 원본과 정확한 경로

CA WH3 ${r.gameVersion}, snapshot ${r.snapshotId}, baseline ${r.baselineCommit}.

- main_units_tables v7.unit → land_unit → land_units_tables v54.key.
- 본체: land_units.primary_missile_weapon → missile_weapons_tables v12.key.
- 포병: land_units.engine → battlefield_engines_tables v24.key → missile_weapon → missile_weapons.key. 실제 schema는 고전 포병에 engine 무기를, 승무원 없는 전쟁 기계에 land primary를 설명한다. 포병대원 무기를 엔진 무기로 가정하지 않는다.
- 탑승자: land_units_to_battle_personalities_junctions_tables v2.land_unit → land key; battle_personality → battle_personalities_tables v12.key; battle_entity_stats → battle_entity_stats_tables v2.key; primary_missile_weapon → missile weapon. 각 부착 슬롯의 경로를 보존하며 탑승자 수로 피해를 곱하지 않는다.
- main 전용/교체: unit_missile_weapon_junctions_tables v1.unit → main key, missile_weapon → weapon key, battle_entity_stats_override → entity stats의 primary_missile_weapon. effect_bonus_value_missile_weapon_junctions_tables v0.missile_weapon_junction → junction.id / effect → effects_tables v0.effect. 조건 참조는 보존하며 활성화나 우선순위를 추론하지 않는다.
- 기본 발사체: missile_weapons.default_projectile → projectiles_tables v53.key. 추가 발사체: missile_weapons_to_projectiles_tables v0.missile_weapon → weapon key / projectile → projectile key. default라는 이름만으로 다른 경로를 무시하지 않는다.
- 폭발: projectiles.explosion_type → projectiles_explosions_tables v19.key. detonation_damage / detonation_damage_ap / detonation_radius는 별도 원본이다.

실제 processed schema, 전체 선택 raw row, pack/path/key/version, forward/reverse edge, 선택 완료 coverage를 catalog.source.json에 lossless gzip JSON으로 보존한다. source.mjs로 decode하며 expandedHash를 검증한다. report.json catalog의 rowId/field/source/edges는 이 원본을 가리킨다. 유닛별 이름 예외 규칙이 없다. 선택 쿼리는 100 seed key / 1,000 row 이하이며 전체 DB import가 아니다. 기존 main/land 원본 row digest와 모두 일치한 1,110 exact root만 포함한다. manifest는 모든 입력과 기존 slice admission을 pin한다.

N/A 판정은 빈 필드 하나로 하지 않는다. 본체·engine·rider·main 교체 경로에 대한 실제 schema와 완료된 reverse scope, 명시적인 primary_ammo=0 / secondary_ammo=0 / infinite_secondary_ammo=false가 함께 필요하다. 원본이나 참조가 불완전하면 UNKNOWN이다. ability/spell 발사체는 정규 무기를 생성하지 않는다. 이 분류는 기본 정규 무기 대상이며 액티브 발사체가 존재할 수 있는 N/A 유닛의 원거리 능력을 부정하지 않는다.

owner-schema.source.json에 실제 mounts v10(6 fields), battle_entities v39(58 fields), land_unit_articulated_vehicles v6(10 fields)의 전체 processed field metadata를 보존했다. 이 세 소유 구조에 추가 missile weapon/projectile/personality/entity-stats reference는 없다. battle entity의 can_cast_projectile 설명은 projectile spell이며 정규 무기 참조가 아니다. projectile intersection/penetration 저항 필드도 무기 소유가 아니다. 따라서 mount/vehicle/body의 원본에서 추가 무기 경로를 누락해 N/A로 만든 것이 아니다.

## 계산 및 표시 규칙

네 필드는 기존 Production 의미를 유지한다: projectiles.damage → missile.projectile.baseDamage; ap_damage → armorPiercingDamage; effective_range → missile.range; base_reload_time → missile.reload.baseTime. I32 피해/거리는 정수 그대로, F32 재장전은 디코딩된 숫자 그대로다. 배율, 정수화, 반올림, 절삭, 최소/최대 선택이 없다. 명시적인 0도 유효한 raw 수치이며 누락을 0으로 채우지 않는다.

단일 단순 발사체는 네 필드를 승격한다. 복수 weapon/attachment/default/alternate/conditional 경로는 각 필드가 모든 후보에서 같은 경우에만 승격한다. 하나라도 다르면 해당 필드만 보류한다. 조건부 효과를 기본값에 합산하거나 대표 weapon을 선택하지 않는다. 이 보수적인 invariant 규칙은 일부 실제 기본 무기가 명확해 보이는 유닛도 보류한다. 활성화·기본 프로필 우선순위는 후속 감사 범위다.

새 직격 피해는 projectile_number=1 / shots_per_volley=1 / burst_size=1이며 explosion_type, scaling_damage, spawned_vortex가 명시적으로 비어 있는 구조에 한정한다. 복합 피해의 정확한 표시를 네 필드만으로 보장하지 못하면 피해 두 필드를 보류하되 검증된 range/reload는 승격한다. precursor=true 또는 hidden secondary UI flag는 표시 의미 미확정으로 보류한다. use_secondary_ammo_pool은 원본으로 보존하지만 탄약량/소비/배율을 추론하지 않는다.

기존 17개는 이미 별도 shots/explosion 등의 정적 metadata와 검토 출처를 가진 기록이다. 그 전체 missile 객체를 보존하며 네 raw 필드가 모든 실제 연결 경로와 정확히 일치해야 한다. 이는 이름 예외가 아니라 기존 admission 보존 규칙이다. 기존 explosion/volley 값은 신규 필드로 다시 쓰지 않는다. 새 유닛의 복합 피해를 기존 17개처럼 완성되었다고 주장하지 않는다.

ui.source.json에서 ui_unit_stats.localisation → unit_stat_localisations.stat_key → local_en.pack Loc를 확인했다. Base Missile Damage / Armour-Piercing Missile Damage와 Base Explosive Damage는 별도 표시이며 stat_missile_damage와 stat_missile_damage_over_time은 Missile Strength로 연결된다. stat_reloading의 실제 이름은 Reload Skill이며 base_reload_time이 아니다. raw 직격 피해를 Missile Strength에 넣거나 raw 재장전을 현재 발사 주기 또는 Reload Skill이라고 표시하지 않는다. 현재 UI는 기존 ‘발사체 기본/AP 피해’와 ‘raw/base 재장전’ 의미를 유지하고 복합 피해 보류/미확인을 설명한다. 전투 카드의 집계 Missile Strength, 실제 주기/DPS를 새로 구현하지 않는다.

## 기존 17개 expected / actual 및 후보식

숫자 순서: 직격 기본 / 직격 AP / 사거리 / raw 기본 재장전. 모든 68개 기존 값이 일치한다. 아래 expected는 게임 카드 실측이 아니라 기존 CA 정적 admission이다.

${table(['유닛 CA key','기존 expected','원본 및 Production actual','결과'],r.regression.map(v=>[v.id.replace('ca_unit_',''),tuple(v.expected),tuple(Object.fromEntries(Object.entries(v.comparisons).map(([k,c])=>[k,c.actual]))),'4/4 MATCH; CA static']))}

${table(['유닛','expected 기본/AP','raw 직접','×volley','×launch count','×burst','직격+폭발'],r.regression.map(v=>{const pair=o=>o?o.base+'/'+o.ap:'N/A';return [v.id.replace('ca_unit_',''),v.expected.baseDamage+'/'+v.expected.armorPiercingDamage,...['RAW_DIRECT','RAW_TIMES_VOLLEY','RAW_TIMES_LAUNCH_COUNT','RAW_TIMES_BURST','DIRECT_PLUS_BLAST'].map(k=>pair(v.candidates[k]))];}))}

raw 직접 후보는 17/17 일치한다. multiplier가 1인 표본의 수치적 일치는 배율을 증명하지 않는다. Ratling과 Outriders는 ×volley가 기존 직격 피해와 다르고, 폭발 포병/Salamander는 직격+폭발이 다르다. 발사 수/volley/burst는 서로 다른 schema 필드이며 하나로 합치지 않는다. 기본 재장전은 17/17 raw 그대로 일치하나 현재 주기 변환의 검증은 아니다.

Helstorm의 과거 사용자 wiki 비교는 raw 30/70/480/17과 일치하지만 카드 Missile Strength 339는 직격 합계 100과 다르고 현재 reload 15.3은 raw 17과 다르다. 관측 게임 버전·보정 상태가 미기록이므로 카드 계산식 ground truth로 사용하지 않는다. 이 유닛은 range 480 / base reload 17만 신규 승격하며 복합 피해는 보류했다.

## 구조별 결과

${table(['주 소유 구조','COMPLETE','PARTIAL','UNKNOWN','N/A','신규 수치 승격'],r.structures.map(v=>[v.shape,v.COMPLETE,v.PARTIAL,v.UNKNOWN,v['N/A'],v.newlyPromoted]))}

structure 분류는 engine / mount / articulation / land 원본 참조 순서이며 weapon 경로는 각각 별도로 보존된다. 포병 엔진, mounted firing, 복수 riders는 같은 필드 invariant 규칙으로 독립 승격한다. category/class는 catalog에 보존하며 hardcode한 이름 분기가 없다.

## 독립 검증

${r.confidenceLimit}

같은 CA snapshot의 기존 exact-key traceUnitByMainKey를 이용해 10개 표본을 별도 재추출했다. 집계 collector와 다른 trace code path로 main/land 및 기본 projectile의 전체 row hash가 일치했다. 기대값은 raw이고 게임 UI 값은 null이다. 신규 기본 규칙과 기존 검토 출처를 구분하며 모든 원본을 validation.source.json에 보존한다.

${table(['구조','표본','raw expected 기본/AP/거리/reload','Production actual','검증'],r.rawComparisons.map(v=>[v.category,v.id.replace('ca_unit_',''),tuple(Object.fromEntries(Object.entries(v.comparisons[0].fields).map(([k,c])=>[k,c.expected]))),tuple(Object.fromEntries(Object.entries(v.comparisons[0].fields).map(([k,c])=>[k,c.production]))),'raw 4/4 MATCH; '+v.status+'; UI 미측정']))}

## 보류·회귀·재현

사격 유닛 보류 ${r.held.length}개(PARTIAL ${s.PARTIAL}, UNKNOWN ${s.UNKNOWN})의 정확한 main/land/weapon/projectile key와 필드별 이유는 AUDIT.md 및 report.json에 있다. 원본 누락/참조 단절은 현재 0개이며 복합 피해, 후보 간 차이, precursor/hidden secondary 표시 의미가 주요 보류 원인이다. 나머지 유닛을 기다리지 않고 ${s.newlyPromotedUnits}개에 확인된 필드를 승격했다.

기존 UnitMissile schema를 재사용한다. 원본 units.json 및 모든 이전 src/data는 byte-equivalent로 보존한다. 독립 unitMissileAdmissions overlay는 네 필드만 수정하며 exact inverse가 기존 공유 ID guard를 보존한다. HP 986 / entity 1,071 / speed 908 / 저항 5×1,110 / 한국어 이름 1,110 / Attribute 1,107 / Passive 1,105 / roster 23 COMPLETE 및 검색·개인 기록은 회귀 검증한다. 검증 명령과 결과는 VALIDATION.md.

재현: node scripts/promote-unit-missiles.mjs --check. 원본 재추출은 collect.mjs / collect-validation.mjs로 수행하며 새 pack/schema snapshot은 자동 승격하지 않고 재검토한다.
`;
}
export function renderAudit(r) {
  return `# 사격 후속 감사

보류 ${r.held.length}개. COMPLETE ${r.summary.COMPLETE}, PARTIAL ${r.summary.PARTIAL}, UNKNOWN ${r.summary.UNKNOWN}, N/A ${r.summary['N/A']}. 아래 보류는 기본 무기가 없다는 의미가 아니다. 모든 raw 분기·폭발·발사 수·효과 연결은 lossless source와 report catalog에 있다.

- CANDIDATE_PROFILES_DISAGREE: 본체/포병/rider/교체/추가 발사체 사이에서 해당 필드 값이 다르다. default 또는 key/row 순서로 대표값을 고르지 않는다. CA/game-facing 기본 프로필 및 능력·스킬 활성 상태를 별도 실측으로 해소할 것.
- COMPOSITE_DAMAGE_DISPLAY_HELD: explosion, 여러 발사체, volley/burst, scaling/vortex 중 하나가 있어 직격 수치만 완성된 사격 피해로 표현할 수 없다. range/base reload invariant는 먼저 승격했다. 피해와 발사/폭발 metadata를 다루는 별도 slice에서 검토할 것. 직격+폭발 또는 ×발사 수의 합산으로 채우지 않는다.
- PRECURSOR_OR_HIDDEN_SECONDARY_DISPLAY_UNVALIDATED: precursor 또는 hidden secondary의 카드 표시/자동 공격 의미를 실측할 것. 정규 weapon reference는 있으므로 N/A로 바꾸지 않는다.
- 실제 게임 카드 실측 0개. 10개 독립 trace 비교는 추출 재현성 검증이다. current reload / Missile Strength / animation fire cycle은 여전히 보류한다. 과거 Helstorm 카드 비교의 버전과 보정 상태는 미기록이다.
- 조건부 무기는 원본 분기만 보존한다. source에 있는 effect는 현재 적용 여부/우선순위를 증명하지 않는다. 능력/주문·스킬·연구·아이템/캠페인 modifier를 네 기본 필드에 적용하지 않는다.

${table(['Main key','Land key','상태','필드별 보류 이유','Weapon keys','Projectile keys'],r.held.map(t=>[t.mainKey,t.landKey,t.status,Object.entries(t.review).filter(([,v])=>v.status==='UNKNOWN').map(([k,v])=>label[k]+': '+v.reason).join('; '),t.weapons.join(', '),t.projectiles.join(', ')]))}
`;
}
