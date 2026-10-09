const table=(headers,rows)=>[headers,headers.map(()=> '---'),...rows].map(r=>'| '+r.join(' | ')+' |').join('\n');
export function renderRules(r) {
 const s=r.summary;
 return `# 사격 직격 피해 2차 정밀 보완

기준 commit ${r.baselineCommit}. CA ${r.gameVersion}, snapshot ${r.snapshotId}. 1차 보류 목록 222개의 exact main/land/weapon/projectile key를 재사용했다. 1차 RULES/AUDIT/VALIDATION과 원본 admission은 역사적 결과로 보존한다. 현재 결과는 이 문서와 report.json이다.

${table(['필드','저장 before → after'],Object.entries(s.fields).map(([k,v])=>[k,v.before+' → '+v.after]))}

${table(['상태','before → after'],Object.entries(s.statuses).map(([k,v])=>[k,v.before+' → '+v.after]))}

신규 피해 승격 ${s.newlyPromotedUnits}유닛 / ${s.newDamageFields}필드. COMPLETE는 기존 네 정적 필드의 저장 상태이며 전체 복합 피해나 게임 카드 계산식의 완성을 뜻하지 않는다. 사거리와 raw 기본 재장전은 이번 slice에서 변경하지 않았다.

## 직격 값과 표시의 의미

projectiles.damage/ap_damage는 1발의 기본 직격 raw 피해다. 폭발, projectile_number, shots_per_volley, burst_size, scaling_damage, spawned_vortex가 함께 있어도 해당 필드의 의미를 바꾸지 않는다. 원본 직격 피해는 독립적으로 승격하며 발사 수·폭발을 합산하지 않는다. scaling/vortex key는 미완결 구성요소로 보존한다. 이것은 modifier 적용 뒤 실제 타격 피해를 계산한 값이 아니다.

CA의 [생성된 CCO 문서 미러](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html#CcoProjectileRecord)는 DamageContext/ApDamageContext, ExplosiveDamageContext/ExplosiveApDamageContext, NumProjectiles, ShotsPerVolley, BurstSize를 별도로 노출한다. CcoUnitDetails.StatList/StatContextFromKey는 보이는 카드 stat을, CcoBattleUnit.ActiveProjectileContext는 실제 사용 중인 발사체를 조회한다. 따라서 raw 기록과 UI 집계 피해를 분리한다. 이 API 문서는 카드 실측이 아니며 문서만으로 mounted 우선순위·Missile Strength 공식·발사 간격을 확정하지 않는다.

## 검증한 선택 규칙

1. 기본 참조 경로는 land primary / engine missile_weapon / rider entity stats다. CA processed schema는 classic artillery의 engine 무기와 crewless war machine의 land primary를 구별한다. 소유자가 서로 다른 피해를 가진 경우 엔진·본체·rider 중 한쪽을 이름이나 최대값으로 고르지 않는다.
2. unit_missile_weapon_junction의 enable effect는 modifier로 활성화되는 교체 프로필이다. **modifier-free 원본 기본값**에서 이 교체를 적용하지 않고 BASE_REFERENCE 값의 불변성을 검사한다. 실제 캠페인에서 effect가 비활성이라는 주장은 아니다. 조건부 무기·effect key는 각각 보존한다. enable 경로가 없는 junction은 자동 제외하지 않으며, 값이 다르면 UNRESOLVED_JUNCTION_ACTIVATION으로 보류한다.
3. battle_entity_stats_override는 교체의 대상 entity stats다. 그 stats의 기존 무기를 새 교체 무기로 중복 계산하지 않는다. 원본 target은 REPLACEMENT_TARGET으로 보존한다.
4. missile_weapons_to_projectiles의 CA schema 설명에 따라 서로 다른 shot_type와 실제 projectile_shot_type_display row를 검증한 추가 발사체는 전환 모드다. default라는 이름만으로 한쪽 피해를 scalar에 넣지 않는다. 각 모드를 보존하고 다르면 SWITCHABLE_PROFILES_DIFFER로 scalar를 보류한다. projectile_shot_type_enum.requires_effect_enabling/supersedes_shot_type와 display rowId도 보존한다.
5. precursor는 자동 공격·카드 표시 의미를 수치에 곱하지 않는다. raw 직격 값이 불변이면 승격한다. hide_secondary_range_ammo_statistics_ui는 CA 설명상 탄약·거리·missile strength를 숨기는 플래그이며 raw 피해를 UNKNOWN/0으로 만드는 이유가 아니다. 현 보류 집합에서 hidden secondary 실제 표본은 0개다. 이 규칙은 변형 검증으로 확인했다.
6. 원본 참조가 끊어지거나 raw 필드 타입이 잘못되면 UNKNOWN이다. 명시적 0은 0으로 보존한다. 양쪽 직격이 0이고 검증된 폭발 피해만 양수면 EXPLOSION_ONLY로 별도 분류한다.

최소 추가 구조는 UnitMissileDamageAdmissions의 profiles 배열이다. 기존 UnitMissile 숫자 필드와 개인 기록 schema는 유지한다. profiles는 weapon/projectile key, 소유 경로, 활성화 조건, 각 직격·폭발 수치, launch/volley/burst, 선택/표시 상태를 담는다. 서로 다른 프로필을 합산하지 않고 UI의 펼침 영역에 각각 보여준다. scalar에 승격되는 두 피해 필드와 profiles 원본은 정확한 admission accessor에서 연결한다.

## 보류 유형별 처리

${table(['유형','처리 유닛','새 피해 승격 유닛','양쪽 피해 확인','피해 보류'],Object.entries(s.perType).map(([k,v])=>[k,v.processed,v.promoted,v.damageComplete,v.remainingDamageHeld]))}

유형은 중복 집계다. 엔진·탑승자 구조는 다른 유형과 겹친다. 원본 참조 불완전 실제 유닛 0개; activation 미확정 junction은 reference 누락과 구별한다.

## 원본·독립 검증과 게임 카드

selection.source.json의 새 exact-key 선택 739 row 중 무기·발사체 ${s.freshRawRows} row는 1차 원본 전체 row와 hash/identity가 동일하다. UI shot enum/display의 별도 원본도 함께 저장했다. validation.source.json은 기존 집계 collector와 다른 traceUnitByMainKey 경로로 12개 보류 표본을 재추출한 자료다. 기존 10개 독립 trace와 17개/68개 기준값도 회귀 검증한다. 같은 CA snapshot을 사용하는 원본 재현성 검사이며 독립 게임 UI 증거와 구별한다.

실제 게임 카드 신규 실측 **0개**. 게임 프로세스는 실행 중이 아니었으며, 이번 데이터 추출은 gameExecuted=false다. 모든 새 프로필의 uiDisplayedDamage/uiSelectedProfile는 null이다. raw selection 추론을 실측값으로 쓰지 않는다. 버전·보정 상태 미기록의 과거 Helstorm wiki Strength 339/current reload 15.3은 비교 자료만 유지한다. Helstorm 직격 30/70은 이번에 저장하며 집계 339나 직격+폭발 합계로 대체하지 않는다.

${table(['보류 표본','독립 raw row 검증','UI'],r.rawComparisons.map(c=>[c.id.replace('ca_unit_',''),c.rows.length+' row hash MATCH','미측정']))}

${table(['기존 17개 표본','expected 기본/AP/거리/reload','Production actual','결과'],r.regression.map(c=>[c.id.replace('ca_unit_',''),Object.values(c.expected).join(' / '),Object.values(c.actual).join(' / '),'4/4 MATCH']))}

report.json.comparisons는 222개 유닛의 CA 직격·폭발·발사체 수·volley/burst·선택 후보·UI null·Production 저장값을 대조한다. sourceReference/rowId/pathIndex/projectileIndex는 1차 lossless 원본에 연결된다. 새로운 수치는 integer 그대로다.

폭발 전용 프로필 ${s.explosionOnlyProfiles.length}개:
${table(['유닛','weapon','projectile'],s.explosionOnlyProfiles.map(p=>[p.id.replace('ca_unit_',''),p.weapon,p.projectile]))}

후속 보류 ${r.held.length}개는 AUDIT.md에 모든 raw key와 필드별 원인을 기록했다. 손실 없는 profiles는 scalar 보류 유닛에도 Production에서 조회할 수 있다. 원본 재추출과 게임 UI 실측은 각각 selection/validation.source.json과 null UI 필드로 분리한다.

재현: node scripts/promote-unit-missile-damage.mjs --check. 새 pack/schema snapshot은 자동 적용하지 않고 source pins가 실패하도록 한다. 1차 admission, 전체 능력 사전 446종, 클릭 상세 패널, 개인 문서·즐겨찾기·검색·Character identity·23종족 roster는 보존한다. 최종 테스트·빌드·변경 파일은 VALIDATION.md에 기록한다.
`;
}
export function renderAudit(r) {
 return `# 사격 직격 피해 2차 보류 감사

${r.held.length}개 scalar 보류. 피해 보류와 사거리/재장전 보류는 구별한다. profiles 원본은 각각 Production에 보존했다. default나 최대 피해의 임의 선택은 없다. source UI 표시 플래그 및 모드는 검증했으나 실제 선택된 카드 프로필은 미측정이다.

- SWITCHABLE_PROFILES_DIFFER: 서로 다른 shot type와 UI 표시 row가 있는 전환 모드. 두 피해를 각각 profiles에 저장; 기본 scalar 선택은 실제 게임 카드 후속 측정 필요.
- SIMULTANEOUS_OWNER_PROFILES_DIFFER: 본체/engine/rider가 서로 다른 직격 피해. 기본 카드 선택 및 동시 공격 집계는 미측정.
- UNRESOLVED_JUNCTION_ACTIVATION: junction은 있으나 enable effect 연결이 없어 기본 활성 상태 불명. script·ability·다른 활성화 경로 후속 조사 필요; 없는 연결을 비활성 증거로 쓰지 않음.
- INCOMPLETE_DB_CHAIN / MISSING_OR_INVALID_DIRECT_DAMAGE: 참조 또는 named raw 필드 증명 불완전. 실제 현재 표본 0개.
- range/baseTime은 이번 범위에서 기존 보류 이유와 값 그대로 유지. precursor raw 피해가 확인되어도 거리·재장전 UI 표시 의미가 자동 해결되지는 않음.
- scaling/vortex 추가 효과는 raw key만 보존하며 실제 합계 계산은 보류. 폭발과 volley는 직격 필드에 합산하지 않음.

${table(['Main key','Land key','상태','직격 피해 차단','다른 기존 필드 보류','weapon → projectile [activation / owner]'],r.held.map(t=>[
 t.mainKey,t.landKey,t.status,Object.entries(t.damageReview).filter(([,v])=>v.status==='UNKNOWN').map(([k,v])=>k+': '+v.reason).join('; ')||'피해 확인',
 Object.entries(t.otherFieldReview).map(([k,v])=>k+': '+v.reason).join('; ')||'없음',
 t.profiles.map(p=>p.weaponKey+' → '+p.projectileKey+' ['+p.activation+' / '+[...new Set(p.owners)].join(', ')+']').join('; ')]))}

## 추가 구성요소 후속 작업

${table(['유닛','projectile','scaling_damage','spawned_vortex'],r.catalog.flatMap(t=>t.unresolvedComponents.map(p=>[t.mainKey,p.projectileKey,p.scalingDamage||'없음',p.spawnedVortex||'없음'])))}
`;
}
