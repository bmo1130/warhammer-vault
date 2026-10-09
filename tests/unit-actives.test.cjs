const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react'),{renderToString}=require('react-dom/server');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitActives,withoutUnitActives,unitActiveAdmission,unitActiveDefinition}=require('../.test-build/src/repositories/unitActives.js');
const {applyUnitRecruitment}=require('../.test-build/src/repositories/unitRecruitment.js');
const {applyUnitMissiles}=require('../.test-build/src/repositories/unitMissiles.js');
const {applyUnitResistances}=require('../.test-build/src/repositories/unitResistances.js');
const {applyUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
const {applyUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {applyUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {unitCatalogRepository:catalog,createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const Details=require('../.test-build/src/components/UnitActiveDetails.js').default;
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/unit-actives/';
const review=read(folder+'admission.json'),projection=read('src/data/unitActiveAdmissions.json'),source=read(folder+'source.json'),membership=read('tools/wh3-importer/unit-attributes/source.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample'),byRaw=key=>review.classifications.find(c=>c.key===key);
const previous=u=>applyUnitRecruitment(applyUnitMissiles(applyUnitResistances(applyUnitSpeed(applyUnitEntities(applyUnitPassives(applyUnitAttributes(localiseUnit(u))))))));
const html=u=>renderToString(React.createElement(Details,{unit:u})).replace(/<!--.*?-->/g,'');
const modules=()=>import('../tools/wh3-importer/unit-actives/rules.mjs');

test('active slice admits 1107 lists, 936 verified empty lists and independent bound ownership',()=>{
 assert.equal(production.length,1110);assert.equal(production.filter(u=>u.abilities!==undefined).length,1107);
 assert.equal(production.filter(u=>u.abilities?.length).length,148);assert.equal(production.filter(u=>u.boundAbilities?.length).length,24);
 assert.deepEqual(review.summary.statuses,{COMPLETE:1103,PARTIAL:4,UNKNOWN:3});assert.equal(review.summary.confirmedEmpty,936);
 assert.equal(review.summary.distinctActive,103);assert.equal(review.summary.classifiedActiveIdentities,104);assert.equal(review.summary.distinctBound,41);
 assert.equal(review.summary.rawKeys,416);assert.equal(review.summary.nonPassiveRawKeys,152);assert.equal(review.summary.landGroups,1072);assert.equal(review.summary.junctions,2013);
 for(const u of production){const a=unitActiveAdmission(u);assert(a);if(a.status==='UNKNOWN'){assert.equal(u.abilities,undefined);assert.equal(u.boundAbilities,undefined);}else{assert(Array.isArray(u.abilities));assert(Array.isArray(u.boundAbilities));}}
});

test('all existing Unit fields and five original lance lists survive exact overlay roundtrip',()=>{
 const raw=read('src/data/units.json');assert.equal(raw.filter(u=>u.gameVersion!=='sample'&&u.abilities!==undefined).length,5);
 for(const b of raw){const u=game.getUnit(b.id);assert.deepEqual(withoutUnitActives(u),previous(b),b.id);assert.deepEqual(withoutUnitActives(applyUnitActives(b)),b);
  if(b.abilities)assert.deepEqual(u.abilities.slice(0,b.abilities.length),b.abilities);
  if(b.gameVersion==='sample'){assert.deepEqual(u,b);assert.equal(unitActiveAdmission(u),undefined);}
 }
 assert.equal(production.filter(u=>u.attributes!==undefined).length,1107);assert.equal(production.filter(u=>u.passiveAbilities!==undefined).length,1105);
 assert.equal(production.filter(u=>u.entities.count!==undefined).length,1071);assert.equal(production.filter(u=>u.entities.totalHealth!==undefined).length,986);assert.equal(production.filter(u=>u.movement.speed!==undefined).length,908);
 for(const k of ['physical','missile','spell','fire','ward'])assert.equal(production.filter(u=>u.defense.resistances?.[k]!==undefined).length,1110);
 assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
 assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
});

test('preceding data JSON bytes and unrelated personal-document/search implementation remain unchanged',()=>{
 const manifest=read(folder+'manifest.json');
 const diff=spawnSync('git',['diff','--name-only',manifest.baselineCommit,'--','src/data','src/lib','src/hooks'],{encoding:'utf8'});assert.equal(diff.status,0);
 assert.deepEqual(diff.stdout.trim().split('\n').filter(Boolean).filter(p=>p!=='src/data/unitActiveAdmissions.json'),[]);
});

test('public ownership requires native type, non-passive flag, unlocked visible default land assignment',()=>{
 for(const a of review.admissions)for(const f of a.facts){const d=membership.rows.find(r=>r.table==='unit_abilities_tables'&&r.row.key===f.rawKey),s=source.rows.find(r=>r.table==='unit_special_abilities_tables'&&r.row.key===f.rawKey);
  assert.equal(s.row.passive,false);assert.equal(d.row.requires_effect_enabling,false);assert.equal(d.row.is_hidden_in_ui,false);assert(['active','bound','unit'].includes(d.row.source_type));assert(['','*'].includes(f.assignmentCulture));
  const junction=membership.rows.find(r=>r.table==='land_units_to_unit_abilites_junctions_tables'&&r.row.land_unit===a.landKey&&r.row.ability===f.rawKey);assert(junction&&f.sourceRowIds.includes(junction.id));assert(f.sourceRowIds.includes(d.id)&&f.sourceRowIds.includes(s.id));
  assert(!f.sourceRowIds.some(id=>id.startsWith('effect_bonus_value_unit_ability_junctions_tables:')||id.startsWith('unit_set_unit_ability_junctions_tables:')));
 }
 assert.equal(review.externalGrantRowIds.length,45);assert.equal(review.externalUnitSetRowIds.length,58);
});

test('toggle groups and formation are explicit; infinite projectile duration is not a toggle rule',()=>{
 assert.equal(review.summary.toggleRawKeys,10);assert.equal(review.summary.toggleUnits,17);
 assert.equal(byRaw('wh_dlc07_unit_formation_lance').kind,'TOGGLE');assert.equal(byRaw('wh_dlc07_unit_formation_lance').canonicalId,'lance');
 assert.equal(byRaw('wh_dlc05_unit_abilities_storm_of_blades').kind,'TOGGLE');assert.deepEqual(byRaw('wh_dlc05_unit_abilities_storm_of_blades').toggleGroups,['wardancer_dances']);
 assert.equal(byRaw('wh2_main_unit_abilities_sun_dragons_breath').kind,'ACTIVE');
 assert.equal(byRaw('wh3_dlc25_unit_abilities_thunderburner').kind,'TOGGLE_CONTROL_UNRESOLVED');
});

test('conditions are preserved independently of base ownership, including HP restrictions',()=>{
 const c=byRaw('wh_dlc06_unit_abilities_the_loons_of_eight_peaks');assert.equal(c.status,'ADMITTED');assert(c.graph.conditionReferences.some(r=>r.rawFlag==='health_below_25%'));assert.equal(c.graph.activationStatus,'NOT_EVALUATED');
 const u=game.getUnit('ca_unit_wh_dlc06_grn_inf_da_eight_peaks_loonies_0');assert(u.abilities.includes(c.canonicalId));assert.match(html(u),/생명력 25% 미만/);assert.match(html(u),/현재 사용 가능 여부는 판단하지 않습니다/);
});

test('native bound source is a separate list; ordinary spell-named candidates stay held',()=>{
 const c=byRaw('wh3_main_mount_bound_celestial_comet'),u=game.getUnit('ca_unit_wh3_main_cth_veh_war_compass_0');assert.equal(c.kind,'BOUND');assert(u.boundAbilities.includes(c.canonicalId));assert(!u.abilities.includes(c.canonicalId));assert.match(html(u),/천상의 유성/);
 for(const key of ['wh3_dlc27_spell_mists_the_writhing_mist_bound','wh3_twa08_spell_bound_heart_of_winter_elemental_bear_ror']){assert.equal(byRaw(key).kind,'SPELL_BOUND_AMBIGUITY');assert(!production.some(u=>u.boundAbilities?.includes(key)||u.abilities?.includes(key)));}
});

test('unlock, hidden, type conflict and culture restrictions cannot create false base abilities or false empty lists',()=>{
 assert.deepEqual(review.summary.excludedByKind,{ACQUIRED_UNLOCK:7,HIDDEN_INTERNAL:6,PASSIVE:254});
 assert.equal(byRaw('wh3_dlc29_ability_bound_prayer_battle_howl').kind,'ACQUIRED_UNLOCK');assert.equal(byRaw('wh2_dlc15_unit_abilities_exploding_unit').kind,'HIDDEN_INTERNAL');
 assert.equal(byRaw('wh3_dlc26_unit_abilities_blow_apart').kind,'TYPE_CONFLICT');
 const squig=game.getUnit('ca_unit_wh3_dlc26_grn_mon_colossal_squig'),storm=game.getUnit('ca_unit_wh3_dlc29_skv_mon_stormfiend_grinderfists');assert.equal(squig.abilities,undefined);assert.equal(storm.abilities,undefined);
 assert.equal(review.admissions.find(a=>a.id===storm.id).withheld[0].kind,'ASSIGNMENT_CONTEXT');
 const ror=game.getUnit('ca_unit_wh3_dlc26_grn_mon_colossal_squig_ror');assert.equal(unitActiveAdmission(ror).status,'PARTIAL');assert(ror.abilities.includes('wh3_dlc26_unit_abilities_acid_vomit'));
});

test('verified empty and passive-only units come from queried closed inventories, not missing rows',()=>{
 const empty=review.admissions.filter(a=>a.status==='COMPLETE'&&!a.abilities.length&&!a.boundAbilities.length);assert.equal(empty.length,936);
 for(const a of empty){assert.equal(a.withheld.length,0);assert(a.membershipQuery.where[0].value.includes(a.landKey));assert.equal(a.facts.length,0);}
 const stern=game.getUnit('ca_unit_wh_dlc04_vmp_inf_sternsmen_0');assert(stern.passiveAbilities.length);assert.deepEqual(stern.abilities,[]);assert.deepEqual(stern.boundAbilities,[]);assert.match(html(stern),/확인된 일반 액티브·토글 능력 없음/);
});

test('canonicalization preserves actual identity and never merges same-name distinct variants',async()=>{
 const {activeSignature}=await modules();
 const keys=['wh2_dlc10_unit_abilities_frost_breath','wh2_dlc10_unit_abilities_frost_wyrm_breath'];assert.equal(byRaw(keys[0]).name,byRaw(keys[1]).name);assert.notEqual(byRaw(keys[0]).canonicalId,byRaw(keys[1]).canonicalId);assert.notEqual(activeSignature(source,membership,keys[0]),activeSignature(source,membership,keys[1]));
 assert.deepEqual(review.aliasGroups.map(g=>g.canonicalId),['lance']);assert.deepEqual(unitActiveDefinition('lance').rawKeys,['wh_dlc07_unit_formation_lance']);
 for(const u of production){const a=new Set(u.abilities??[]),b=new Set(u.boundAbilities??[]);assert.equal(a.size,u.abilities?.length??0);assert.equal(b.size,u.boundAbilities?.length??0);for(const id of [...a,...b])assert(!u.passiveAbilities?.includes(id)&&!u.attributes?.includes(id));for(const id of a)assert(!b.has(id));}
});

test('all 145 registry names are official KO/EN Loc; unit and ability search work in both languages',()=>{
 assert.equal(Object.keys(projection.definitions).length,145);
 for(const d of Object.values(projection.definitions)){assert(/[가-힣]/.test(d.name));assert(d.englishName);assert(!d.name.includes('{{'));assert(!d.typeLabel.includes('[['));}
 const id='ca_unit_wh3_main_cth_veh_war_compass_0';for(const q of ['천상의 유성','Celestial Comet']){assert(game.search(q).some(r=>r.id===id));assert(catalog.search(q).some(r=>r.id===id));}
 for(const q of ['성배 기사','Grail Knights'])assert(game.search(q).some(r=>r.id==='ca_unit_wh_main_brt_cav_grail_knights'));
});

test('14 fresh CA samples and 1009 earlier independent unit inventories match exact expected/actual keys',()=>{
 assert.equal(review.representatives.length,14);assert.equal(review.independentComparisons.length,1009);
 for(const c of [...review.representatives,...review.independentComparisons]){assert(c.match);assert.deepEqual(c.expected,c.actual);assert.match(c.method,/not game/);}
 for(const c of review.representatives)for(const d of c.details){assert.equal(d.activePassiveAttributeOverlap,0);assert.equal(d.gameUiMeasured,false);const u=game.getUnit(c.id);assert.equal(d.displayed,[...u.abilities??[],...u.boundAbilities??[]].includes(d.canonicalId));}
});

test('exact admission inverse cannot conceal arbitrary changes or loosen shared diagnostic identity',()=>{
 const u=game.getUnit('ca_unit_wh3_main_cth_veh_war_compass_0'),changed={...u,boundAbilities:[...u.boundAbilities,'fake_bound']};assert.equal(unitActiveAdmission(changed),undefined);assert.deepEqual(withoutUnitActives(changed),changed);
 assert.throws(()=>applyUnitActives({...read('src/data/units.json').find(x=>x.id===u.id),gameVersion:'other'}),/identity drift/);
 assert.throws(()=>applyUnitActives(changed),/identity drift/);
 createUnitCatalog(game.listUnits(),diagnostics.list());const shared=read('src/data/unitSharedIdentities.json').links;
 for(const link of shared){const unit=game.getUnit(link.productionId);assert.throws(()=>createUnitCatalog([{...unit,boundAbilities:['fake_bound']}],diagnostics.list()),/collision/);assert.throws(()=>createUnitCatalog([{...unit,entities:{...unit.entities,mass:(unit.entities.mass??0)+1}}],diagnostics.list()),/collision/);}
 const issues=validateUnits([{...u,abilities:[...u.abilities,u.boundAbilities[0]],boundAbilities:[...u.boundAbilities,u.boundAbilities[0]]}],game.listFactions().map(f=>f.id));assert(issues.some(i=>i.field==='boundAbilities'));assert(issues.some(i=>i.message.includes('독립된')));
});

test('UI separates active, bound, partial and unknown and cannot display a partial empty set as complete absence',()=>{
 assert.match(html(game.getUnit('ca_unit_wh_main_brt_cav_grail_knights')),/토글/);
 const bound=html(game.getUnit('ca_unit_wh3_main_cth_veh_war_compass_0'));assert.match(bound,/귀속/);assert.match(bound,/원본·검증 근거/);
 const partial=html(game.getUnit('ca_unit_wh3_twa08_ksl_mon_elemental_bear_0_ror'));assert.match(partial,/PARTIAL/);assert.match(partial,/귀속 주문 후보 추가 검토 중/);assert(!partial.includes('확인된 귀속 주문 없음'));
 const unknown=html(game.getUnit('ca_unit_wh3_dlc26_grn_mon_colossal_squig'));assert.match(unknown,/UNKNOWN/);assert.match(unknown,/목록 미확인/);assert(!unknown.includes('확인된 일반 액티브·토글 능력 없음'));
 assert(!html(game.getUnit('ca_unit_wh2_dlc11_cst_mon_bloated_corpse_0')).includes('wh2_dlc15_unit_abilities_exploding_unit'));
});

test('replay gates reject source/schema/coverage/name drift; missing definitions stay held',async()=>{
 const {classifyActive,reviewActives}=await modules();const key='wh_dlc07_unit_formation_lance';
 const s=structuredClone(source);s.rows=s.rows.filter(r=>!(r.table==='unit_special_abilities_tables'&&r.row.key===key));assert.equal(classifyActive(s,membership,key).kind,'MISSING_REFERENCE');
 const empty=structuredClone(source),breath='wh2_main_unit_abilities_sun_dragons_breath';empty.rows=empty.rows.filter(r=>!(r.table==='special_ability_to_special_ability_phase_junctions_tables'&&r.row.special_ability===breath));const special=empty.rows.find(r=>r.table==='unit_special_abilities_tables'&&r.row.key===breath);for(const f of ['activated_projectile','bombardment','vortex','spawned_unit','formation','behaviour'])special.row[f]='';assert.equal(classifyActive(empty,membership,breath).kind,'NO_EXECUTION_REFERENCE');
 const passiveSource=read('tools/wh3-importer/unit-passives/source.json'),{decodeSource}=await import('../tools/wh3-importer/expansion-batch-01/compact.mjs'),{rosterSourceHash}=await import('../tools/wh3-importer/production-growth/roster.mjs');
 const roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash),args=[membership,passiveSource,roster,read('src/data/units.json'),read('src/data/unitAttributeAdmissions.json'),read('src/data/unitPassiveAdmissions.json')];
 for(const mutate of [s=>s.rows.pop(),s=>s.schemas[0].fields.pop(),s=>s.coverage[0].matchedRows++,s=>s.localisations[0].row.text+='bad']){const s=structuredClone(source);mutate(s);assert.throws(()=>reviewActives(s,...args),/source hash drift/);}
});
