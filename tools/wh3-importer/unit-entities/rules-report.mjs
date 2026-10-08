import {formulas} from './rules.mjs';
const fmt=v=>v===null||v===undefined?'—':String(v);
const table=(headers,rows)=>[headers,headers.map(()=>'---'),...rows].map(row=>'| '+row.map(fmt).join(' | ')+' |').join('\n');
export function renderRulesReport(r){
  const lines=[
    '# Ultra unit HP / entity count: empirical category admission',
    '', '2026-10-08 · baseline `129f55f` · WH3 `9.0.2.0` · Ultra custom battle 기본값.',
    '', '관측 기준 13개를 고정하고 원본 구조별 공식을 검증했다. 개체 수는 13 → 1,071, 표시 총 HP는 13 → 986이다. 새 identity 1,058개를 승격했다. 기존 13개 원본 HP admission과 이전 audit는 보존하고 새 Production projection에서 계산값을 제공한다.',
    '', '## 1. 고정 ground truth와 원본 필드',
    '', '13개 모두 수치 검증에 사용한다. 증거의 독립성은 구분한다: 10개는 직접 CCO runtime capture, 3개(Spearmen, Battle Pilgrims, Blessed Trebuchets)는 기존 exact-profile 승격값이며 독립 측정 세 건으로 중복 집계하지 않는다. 각 capture reference와 원본 provenance는 `rules-report.json`의 training / catalog.sourceFields에 보존했다.',
    '', table(['Unit','count','total HP','관측 HP/count','N','U','G','B','M','H','E','A'],r.training.map(t=>[t.name,t.count,t.totalHealth,t.observedTotalPerDisplayedEntity,...['main.num_men','land.num_mounts','land.num_engines','land.bonus_hit_points','man.hit_points','mount.hit_points','engine.hit_points','articulation.hit_points'].map(k=>t.rawValues[k])])),
    '', 'HP/count는 관측 비율이며 `healthPerEntity` admission이 아니다. 특히 crew/vehicle/artillery에서는 표시 개체가 복합 HP를 포함한다.',
    '', '## 2. 조사한 source와 reference chain',
    '', '`main_units.num_men` (N), `main_units.land_unit`, `main_units.caste`, `land_units.bonus_hit_points` (B), `land_units.num_mounts` (U), `land_units.num_engines` (G), category/class, `man_entity`, `mount`, `engine`, `articulated_record`를 조사했다. `man_entity → battle_entities.hit_points` (M), `mounts.entity → battle_entities.hit_points` (H), `battlefield_engines.battle_entity → battle_entities.hit_points` (E), `land_unit_articulated_vehicles.articulated_entity → battle_entities.hit_points` (A)를 schema-checked joins로 추출했다. `engine_type`, `mounted_draughts`, `sync_locomotion`, rider/draught attachment flags도 보존한다.',
    '', '기본 trace에 없는 articulation은 기존 `articulation.source.json`에서 동일 snapshot / main / land / count / bonus 값을 검증하고 보충했다. 누락 HP를 0으로 대체하지 않는다. runtime `NumEntitiesInitial`, `HealthMax`, ManList / MountList / EngineList / EntityList 및 기존 `logicalCount`를 비교한다.',
    '', 'JSON의 `catalog.sourceFields`는 value와 rowId / sourceId / field / pathId를 저장한다. `sourceRows[sourceId]`에서 table / row key / schema version / pack / file path를, `joinPaths[pathId]`에서 schema-checked join 전체를 복원한다. 동일 경로의 반복 저장만 제거하며 원본 provenance 정보는 모두 유지한다.',
    '', table(['Unit / land identity','caste / category','man entity','mount record → entity','engine record → entity','articulation record → entity'],r.training.map(t=>[t.id.replace('ca_unit_','')+' / '+t.landKey,t.category.caste+' / '+t.category.category,t.roleReferences.man_entity,(t.roleReferences.mount||'—')+' → '+(t.entityKeys.mount||'—'),(t.roleReferences.engine||'—')+' → '+(t.entityKeys.engine||'—'),(t.roleReferences.articulated_record||'—')+' → '+(t.entityKeys.articulation||'—')])),
    '', '## 3. 모든 후보식의 expected / actual',
    '', '공식별 actual을 표에 기록한다. expected는 첫 번째 HP 열이다. ✓는 정확히 일치, Δ는 actual − expected이다. —는 필요한 HP 원본 필드가 없어서 계산 불가이다. 11개 후보를 13개 전체에 적용했으며 class별 선택 결과는 모두 정확히 일치한다.',
  ];
  for(const ids of [['MAN','BONUS','MOUNT','RIDER_MOUNT'],['CREW','ENGINE','ENGINE_CREW','ARTILLERY','VEHICLE'],['ARTICULATED_N','ARTICULATED_UG']]){
    lines.push('',...ids.map(k=>'- `'+k+'`: `'+formulas[k]+'`'),'',table(['Unit','expected HP',...ids],r.training.map(t=>[t.name,t.totalHealth,...ids.map(k=>{
      const c=t.hpCandidates[k];return c.actual===null?'—':c.actual+(c.matches?' ✓':' (Δ '+(c.delta>0?'+':'')+c.delta+')');
    })])));
  }
  lines.push('', '## 4. Entity count: expected / actual', '',
    table(['Unit','expected','N','U','G','raw N+U+G','선택한 rule'],r.training.map(t=>[t.name,t.count,...['N','U','G','COMPONENT_SUM'].map(k=>{const c=t.countCandidates[k];return c.actual+(c.matches?' ✓':' (Δ '+(c.delta>0?'+':'')+c.delta+')');}),t.selected.countRule])),
    '', 'N은 Ultra logical count의 전역 source가 아니다: Dread Saurian 12 → 1, Skeleton Chariots 24 → 12, Field Trebuchets 44 → 4. 일반 몸체는 N, 탑승 몸체는 U, 포병/검증된 전차 구조는 G를 사용한다. articulation에서 U는 엔진당 탈것 수라서 runtime MountList는 U×G이다. component count를 표시 개체 수에 더하지 않는다. 새로운 승격은 각 구조의 실측 Ultra 대응을 일반화하며 Small/Medium/Large 배율을 추정하지 않는다.',
    '', '## 5. 확정한 category 규칙과 적용 범위', '',
    table(['count rule','HP formula','기준 count / HP 일치','direct anchors','count known','HP known'],r.rules.map(rule=>[rule.id,rule.formula,rule.countMatches+' / '+rule.hpMatches,rule.directRuntimeAnchors,rule.countKnown,rule.hpKnown])),
    '', '- MAN_ONLY: mount/engine/articulation reference가 명시적으로 비어 있고 U=G=0, N>0, M=8, 정확한 HP chain일 때 `(B+M)*N`. infantry / monstrous infantry / single body / flying body / swarm 등 이름이 아닌 동일 source 구조에 적용한다.',
    '- MOUNTED: engine/articulation이 없고 N/U가 양의 정수이며 M=H=8일 때 `B*U+M*N+H*U`, 표시 count U. Mounted Yeomen과 Dread Saurian의 1명 및 12명 탑승 구조를 설명한다. M/H를 교환한 식도 동일해지는 훈련 범위이므로 8/8 밖의 HP를 승격하지 않는다.',
    '- ARTILLERY: unmounted engine, warmachine/artillery, 정수 crew/piece, `engine_type=Generic_3_Crew`, M=8 및 exact E가 있을 때 `(B+M)*N+(B+E)*G`, count G. E=425/500 및 crew 44/56의 모든 포병 기준값을 재현한다.',
    '- ENGINE_VEHICLE: unmounted chariot/war_machine, N=G, M=E=8일 때 `B*N+M*N+E*G`, count G. Doom-Flayers의 훈련 구조 밖 crew ratio는 보류한다.',
    '- ARTICULATED_CHARIOT: chariot/war_machine, mount/engine/articulation, 정수 N/G에서 count G. HP는 모든 exact component chain과 M=H=E=A=8이 필요하며 `B*G+M*N+H*U*G+(E+A)*G`. Black Coach는 N 대신 U×G를 쓰는 식의 5,988을 거부하여 5,980을 선택한다. E/A 교환의 물리적 소유권은 주장하지 않는다.',
    '', '각 규칙은 해당 구조의 모든 ground truth를 재현한다. 다른 castes에 적용하는 근거는 동일 named fields / reference shape / component cardinality이다. 미측정 유닛의 confidence는 **EMPIRICAL_SAME_SOURCE_STRUCTURE**, 새로운 게임 실측 확정은 아니다. 완전한 CA 물리적 HP 소유권 해석 대신 UI total을 예측하는 경험적 규칙으로 범위를 제한했다. 이름·특정 unit key 하드코딩은 계산식에 없다.',
    '', '## 6. Production 저장 coverage / UNKNOWN 변화', '',
    table(['Field','known before','known after','UNKNOWN before','UNKNOWN after','새 저장값'],[['entities.count',13,r.summary.count.after,1097,r.summary.count.unknownAfter,r.summary.newCount],['entities.totalHealth',13,r.summary.hp.after,1097,r.summary.hp.unknownAfter,r.summary.newHP],['entities.healthPerEntity',0,0,1110,1110,0]]),
    '', 'Combined: COMPLETE 13 → 986, PARTIAL 0 → 85, UNKNOWN 1,097 → 39. 새로운 count identity 1,058개 중 총 HP도 새로 채운 identity는 973개다. 저장은 `src/data/unitHpEntityRuleAdmissions.json`에서 수행하며 `gameRepository`와 데이터 audit가 이 검증된 projection을 동일하게 적용한다. 기존 `src/data/units.json` 및 13개 원본 admission은 바꾸지 않는다.',
    '', '## 7. Category별 COMPLETE / PARTIAL / UNKNOWN', '',
    table(['caste','전체','COMPLETE','PARTIAL','UNKNOWN'],r.categories.map(c=>[c.category,c.total,c.COMPLETE,c.PARTIAL,c.UNKNOWN])),
    '', 'Lord / hero는 별도 Character catalog이다. 두 기존 source 표본 모두 baseline Ultra capture가 없어 UNKNOWN이며 Unit 숫자 1,110에 포함하지 않는다. canonical identity / alias / localisation을 유지한다. flying / swarm 구조 표본 결과는 아래에 따로 제시한다.',
    '', '## 8. 미해결 구조의 정확한 이유', '',
    '- MOUNTED 13개: N/U가 정수가 아니다 (60/48, 60/40, 24/16). 실측 1:1 또는 정수 attached-rider 구조와 다르며 어느 cardinality가 버려지는지 훈련값이 없다. Night Goblin Squig Hoppers, Wild Riders, Deck Droppers 등의 기존 row 불일치를 값이나 이름 override로 보정하지 않는다.',
    '- ENGINE chariot 7개: N≠G (crew ratio가 Doom-Flayers의 1:1과 다름). 미검증 crew/engine 구조라 count/HP 둘 다 UNKNOWN이다.',
    '- ENGINE warmachine/war_machine 6개와 ARTICULATED의 warmachine/generic 13개: caste/category 구조가 포병 또는 chariot anchor의 적용 범위를 벗어난다. count/HP 둘 다 UNKNOWN이다.',
    '- count만 확인한 85개: ENGINE_VEHICLE 3개, ARTILLERY 34개, ARTICULATED_CHARIOT 48개. engine 또는 articulation HP의 exact join이 누락되거나 HP equality/engine-type 훈련 범위를 벗어난다. `catalog.reasons`와 category.unresolved에 identity별 정확한 필드명을 기록했다. count 계산에는 그 HP field가 필요하지 않으므로 count는 승격한다.',
    '- crew / composite per-entity HP와 다른 unit size의 scaling은 1,110개 모두 UNKNOWN이다.',
    '', '## 9. 추가 검증 표본과 confidence', '',
    table(['category','미측정 표본','예측 count','예측 total HP','결과'],r.samples.map(s=>[s.category,s.name,s.prediction.count,s.prediction.totalHealth,s.status])),
    '', '위 표는 Ultra 구조 검증/예측이며 새로운 live capture 결과가 아니다. 새로운 독립 Ultra reference는 확보하지 못했다. 같은 raw field를 다시 계산하거나 기존 exact-profile 예측을 독립 실측으로 세지 않았다. 각 표본의 source pointer / raw fields / independentReference=null을 명시한다.',
    '', '별도로 기존 runtime archive의 raw-probe 파일 5개에서 중복을 제거한 unit/size/count/HP tuple 5개를 검사했다. 훈련 identity 밖 두 개는 MEDIUM capture였다. 두 원본 로그를 아래 파일에 byte-identical로 보존하고 SHA256, parser 문제 0, completed runs, 동일 snapshot/main/land identity를 재검증했다.',
    '', table(['독립 원본','size','관측 count','관측 HP','관측 count에 적용한 식','계산 HP','delta'],[...new Map(r.independentValidation.map(v=>[v.id,[v.name,v.unitSize,v.observedCount,v.observedTotalHealth,v.formulaUsingObservedCount,v.expected,v.delta]])).values()]),
    '', '네크로펙스의 원본 rider/body 구조에서 MEDIUM 1개체·9,507과 계산값이 일치한다. 자유 민병대는 MEDIUM의 관측 count 60에 `(B+M)=61`을 곱해 3,660을 재현한다. 여기서는 관측 count를 사용했으며 Medium → Ultra 배율을 추정하지 않았다. 기존 로그의 mod/rank/effect 및 actual-game 검증 정보가 완전하지 않아 **추가 수치 일치 근거**로만 사용하고, Ultra training 또는 admission source로 사용하지 않는다. MEDIUM/LARGE/SMALL Production scaling은 계속 UNKNOWN이다.',
    '', '## 10. 변경 파일과 회귀 보호', '',
    '- `tools/wh3-importer/unit-entities/ground-truth.json`: 13개 고정 fixture.',
    '- `rules-manifest.json`, `rules.mjs`, `rules-report.mjs`, `rules-report.json`, `RULES.md`: source pins, 재생 가능한 category 규칙, 모든 후보/승격/보류 감사.',
    '- `unit-entities/review.mjs`: 기존 검증된 raw trace를 새 분석에 전달하는 optional callback; 기존 review/projection은 deep equality로 동일함을 확인.',
    '- `src/data/unitHpEntityRuleAdmissions.json`, `src/repositories/unitEntities.ts`: Production overlay와 exact inverse 및 identity guard.',
    '- `src/components/UnitProductionDetails.tsx`: 실측/구조 계산 및 count-only 상태 출처 설명.',
    '- `scripts/promote-unit-hp-entity-rules.mjs`, `scripts/audit-unit-data.mjs`, `scripts/check-data.mjs`, `scripts/test.mjs`: validator와 재현 검사 연결.',
    '- `tests/unit-hp-entity-rules.test.cjs`, `tests/unit-entities.test.cjs`: 13개 기준값, category coverage, 후보 반례, source/size/ratio/누락/overflow 거부, UI와 보호 데이터 회귀.',
    '- `tests/archive-localisation.test.cjs`, `tests/manual-calculator.test.cjs`, `tests/unit-comparison.test.cjs`: 확대된 coverage 및 HP 계산/비교값을 반영하고 실제 UNKNOWN 표본의 동작도 유지한다.',
    '- `tools/wh3-importer/hp-policy/inputs/independent-necrofex-medium.log`, `independent-free-company-medium.log`: 기존 archive에서 보존한 원본 byte; 추가 교차검증 전용이며 기존 HP policy를 변경하지 않는다.',
    '', '속도·저항·사격·모집 조건의 데이터/규칙을 변경하지 않았다. Korean unit names 1,110, localisation, Character identity/alias, attributes 1,107, passives 1,105, 23 race COMPLETE roster 및 문서/즐겨찾기/최근 기록·영문/한국어 검색·IME 회귀는 기존 테스트에서 함께 검증한다.',
    '', '## 11. 테스트', '',
    '실행 결과와 commit 기록은 [VALIDATION.md](VALIDATION.md)에 기록한다. 관련 HP/entity 테스트, 전체 `npm test`, `npm run check:data`, `npm run build`, `npm run check:pages`를 실행한다. Production projection은 `--check`에서 source pins, 13개 baseline, raw trace 재생과 exact output 비교를 모두 통과해야 한다.',
    ''
  );
  return lines.join('\n');
}
