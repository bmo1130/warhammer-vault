const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter,Routes,Route}=require('react-router-dom');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitMissiles,withoutUnitMissiles,unitMissileAdmission,projectMissile}=require('../.test-build/src/repositories/unitMissiles.js');
const {withoutUnitRecruitment}=require('../.test-build/src/repositories/unitRecruitment.js');
const {applyUnitResistances}=require('../.test-build/src/repositories/unitResistances.js');
const {applyUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
const {applyUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {applyUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const {createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const Details=require('../.test-build/src/components/UnitMissileDetails.js').default;
const UnitPage=require('../.test-build/src/pages/UnitPage.js').default;
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/missile-rules/';
const report=read(folder+'report.json'),projection=read('src/data/unitMissileAdmissions.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample');
const core=m=>Object.fromEntries(Object.entries({baseDamage:m?.projectile.baseDamage,armorPiercingDamage:m?.projectile.armorPiercingDamage,range:m?.range,baseTime:m?.reload?.baseTime}).filter(([,v])=>v!==undefined));
const before=raw=>applyUnitResistances(applyUnitSpeed(applyUnitEntities(applyUnitPassives(applyUnitAttributes(localiseUnit(raw))))));
const clean=html=>html.replace(/<!--.*?-->/g,'');
const modules=async()=>({...await import('../tools/wh3-importer/missile-rules/predict.mjs'),...await import('../tools/wh3-importer/missile-rules/source.mjs')});

test('370 actual missile targets, 740 resolved N/A and four independent field coverages agree in Production',()=>{
  assert.equal(production.length,1110);assert.equal(projection.admissions.length,1110);
  const expected={baseDamage:155,armorPiercingDamage:149,range:333,baseTime:336};
  for(const [k,n] of Object.entries(expected)){
    assert.equal(production.filter(u=>core(u.missile)[k]!==undefined).length,n);assert.equal(report.summary.perField[k].after,n);
    assert.equal(report.summary.perField[k].unknownAfter,370-n);assert.equal(report.summary.perField[k].notApplicable,740);
  }
  assert.deepEqual(Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN','N/A'].map(s=>[s,projection.admissions.filter(a=>a.status===s).length])),{COMPLETE:148,PARTIAL:190,UNKNOWN:32,'N/A':740});
  assert.equal(report.summary.newlyPromotedUnits,321);
  for(const a of projection.admissions){const u=game.getUnit(a.id);assert.deepEqual(core(u.missile),a.values);assert.equal(unitMissileAdmission(u).status,a.status);if(a.status==='N/A')assert.equal(u.missile,undefined);}
  assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
});

test('all 17 original missile objects, provenance and all 68 values survive exactly; candidate multipliers do not replace direct damage',()=>{
  const truth=read(folder+'ground-truth.json');assert.equal(truth.baseline.length,17);assert.equal(truth.liveGameReadings,0);
  for(const b of truth.baseline){assert.deepEqual(game.getUnit(b.id).missile,b.originalMissile);assert.deepEqual(core(game.getUnit(b.id).missile),b.expected);assert.equal(b.provenance.liveGameReading,false);}
  for(const v of report.regression)for(const c of Object.values(v.comparisons)){assert.equal(c.matches,true);assert.equal(c.expected,c.actual);assert.deepEqual(c.raw,[c.expected]);}
  const rat=report.regression.find(v=>v.id.endsWith('ratling_gun_0'));
  assert.deepEqual(rat.candidates.RAW_DIRECT,{base:2,ap:6});assert.deepEqual(rat.candidates.RAW_TIMES_VOLLEY,{base:36,ap:108});
  const trebuchet=report.regression.find(v=>v.id.endsWith('art_field_trebuchet'));assert.deepEqual(trebuchet.candidates.DIRECT_PLUS_BLAST,{base:90,ap:215});
  assert.equal(report.manualComparison.cardDifference.rawDirectTotal,100);assert.equal(report.manualComparison.cardDifference.reportedMissileStrength,339);
  assert.equal(report.manualComparison.cardDifference.rawReload,17);assert.equal(report.manualComparison.cardDifference.reportedCurrentReload,15.3);
});

test('N/A requires explicit ammo AND schema-verified closed weapon paths; missing scope/schema/reference never proves absence',async()=>{
  const {loadSource,missileGraph,inspectMissileUnit,predictMissile}=await modules(),s=loadSource(),seed=s.seeds.find(x=>x.mainKey==='wh_main_emp_inf_spearmen_0');
  const inspect=src=>inspectMissileUnit(missileGraph(src),seed);assert.equal(predictMissile(inspect(s)).status,'N/A');
  for(const mutate of [
    x=>{x.coverage=x.coverage.filter(c=>c.query.table!=='unit_missile_weapon_junctions_tables');},
    x=>{x.schemas.find(d=>d.table==='land_units_to_battle_personalities_junctions_tables').fields.find(f=>f.name==='land_unit').is_reference=null;},
    x=>{delete x.rows.find(r=>r.table==='land_units_tables'&&r.row.key===seed.landKey).row.primary_ammo;},
    x=>{x.rows.find(r=>r.table==='land_units_tables'&&r.row.key===seed.landKey).row.primary_missile_weapon='missing_weapon';},
    x=>{x.relationships=x.relationships.filter(e=>!(e.field==='land_unit'&&e.value===seed.landKey));},
  ]){const changed=structuredClone(s);mutate(changed);assert.equal(predictMissile(inspect(changed)).status,'UNKNOWN');}
  const positive=inspect(s);positive.ammo.primary_ammo.value=1;assert.equal(predictMissile(positive).status,'UNKNOWN');
});

test('single plain profiles admit exact raw fields; missing/invalid values are independently unknown, explicit zero stays zero',async()=>{
  const {loadSource,missileGraph,inspectMissileUnit,predictMissile}=await modules(),s=loadSource(),seed=s.seeds.find(x=>x.mainKey==='wh3_main_cth_inf_peasant_archers_0');
  const t=inspectMissileUnit(missileGraph(s),seed);assert.deepEqual(predictMissile(t).values,{baseDamage:14,armorPiercingDamage:1,range:140,baseTime:11});
  for(const invalid of [null,undefined,'0',NaN,Infinity,-1,0.5]){
    const changed=structuredClone(t);changed.paths[0].projectiles[0].facts.damage.value=invalid;
    assert.equal(predictMissile(changed).status,'PARTIAL');assert.equal(predictMissile(changed).values.baseDamage,undefined);assert.equal(predictMissile(changed).values.armorPiercingDamage,1);
  }
  const zero=structuredClone(t);for(const f of ['damage','ap_damage','effective_range','base_reload_time'])zero.paths[0].projectiles[0].facts[f].value=0;
  assert.deepEqual(predictMissile(zero).values,{baseDamage:0,armorPiercingDamage:0,range:0,baseTime:0});assert.equal(predictMissile(zero).status,'COMPLETE');
  zero.paths[0].projectiles[0].facts.base_reload_time.value=11.375;assert.equal(predictMissile(zero).values.baseTime,11.375);
});

test('broken or ambiguous processed forward edges hold missile data rather than selecting a first target',async()=>{
  const {loadSource,missileGraph,inspectMissileUnit,predictMissile}=await modules(),s=loadSource(),seed=s.seeds.find(x=>x.mainKey==='wh3_main_cth_inf_peasant_archers_0');
  const t=inspectMissileUnit(missileGraph(s),seed),weaponId=t.paths[0].weaponRowId;
  const changed=structuredClone(s);changed.relationships=changed.relationships.filter(e=>!(e.from===weaponId&&e.field==='default_projectile'));
  assert.equal(predictMissile(inspectMissileUnit(missileGraph(changed),seed)).status,'UNKNOWN');
  const duplicate=structuredClone(s),row=duplicate.rows.find(r=>r.id===t.paths[0].projectiles[0].row.id),edge=duplicate.relationships.find(e=>e.to===row.id&&e.field==='default_projectile');
  duplicate.rows.push({...structuredClone(row),id:row.id+':duplicate'});duplicate.relationships.push({...edge,to:row.id+':duplicate'});
  assert.equal(predictMissile(inspectMissileUnit(missileGraph(duplicate),seed)).status,'UNKNOWN');
});

test('multiple candidates admit only field invariants; no mount/engine/rider precedence or conditional weapon application',async()=>{
  const {loadSource,missileGraph,inspectMissileUnit,predictMissile}=await modules(),s=loadSource(),seed=s.seeds.find(x=>x.mainKey==='wh3_main_cth_inf_peasant_archers_0');
  const t=inspectMissileUnit(missileGraph(s),seed),second=structuredClone(t.paths[0]);second.role='MAIN_JUNCTION';second.projectiles[0].facts.damage.value=99;t.paths.push(second);
  assert.deepEqual(predictMissile(t).values,{armorPiercingDamage:1,range:140,baseTime:11});
  second.projectiles[0].facts.effective_range.value=500;assert.equal(predictMissile(t).values.range,undefined);
  const old=predictMissile(t);t.paths.reverse();assert.deepEqual(predictMissile(t),old);
  const known=report.catalog.find(t=>t.id==='ca_unit_wh_main_emp_art_great_cannon');assert.equal(known.prediction.values.range,undefined);assert.equal(known.prediction.values.baseTime,22);
  const engine=report.catalog.find(t=>t.id==='ca_unit_wh_main_brt_art_field_trebuchet');assert.equal(engine.paths[0].role,'ENGINE');
  assert(report.catalog.some(t=>t.paths.some(p=>p.role==='RIDER')));assert(report.catalog.some(t=>t.paths.some(p=>p.condition?.effects.length)));
});

test('explosion, launch count, volley, burst, scaling and vortex hold new damage independently of range/base reload',async()=>{
  const {loadSource,missileGraph,inspectMissileUnit,predictMissile}=await modules(),s=loadSource(),seed=s.seeds.find(x=>x.mainKey==='wh3_main_cth_inf_peasant_archers_0');
  const t=inspectMissileUnit(missileGraph(s),seed);
  for(const [field,value] of [['explosion_type','blast'],['projectile_number',3],['shots_per_volley',6],['burst_size',4],['scaling_damage','scaling'],['spawned_vortex','vortex']]){
    const changed=structuredClone(t);changed.paths[0].projectiles[0].facts[field].value=value;
    assert.deepEqual(predictMissile(changed).values,{range:140,baseTime:11});assert.equal(predictMissile(changed).review.baseDamage.reason,'COMPOSITE_DAMAGE_DISPLAY_HELD');
  }
  const hel=game.getUnit('ca_unit_wh_main_emp_art_helstorm_rocket_battery');assert.equal(hel.missile.projectile.baseDamage,undefined);assert.equal(hel.missile.range,480);assert.equal(hel.missile.reload.baseTime,17);assert.equal(hel.missile.explosion,undefined);
});

test('precursor/hidden secondary retain positive weapon identity as UNKNOWN; spell damage flag alone never reclassifies a weapon as an ability',async()=>{
  const {loadSource,missileGraph,inspectMissileUnit,predictMissile}=await modules(),s=loadSource(),seed=s.seeds.find(x=>x.mainKey==='wh3_main_cth_inf_peasant_archers_0');
  const t=inspectMissileUnit(missileGraph(s),seed);
  for(const flag of ['precursor','hide_secondary_range_ammo_statistics_ui']){const changed=structuredClone(t);changed.paths[0].flags[flag].value=true;assert.equal(predictMissile(changed).status,'UNKNOWN');}
  const spell=structuredClone(t);spell.paths[0].projectiles[0].facts.is_spell.value=true;assert.equal(predictMissile(spell).status,'COMPLETE');
  assert.equal(unitMissileAdmission(game.getUnit('ca_unit_wh3_main_kho_mon_soul_grinder_0')).status,'UNKNOWN');
});

test('10 independent exact-key traces cover required structures; raw equality is explicitly distinguished from live game UI',()=>{
  assert.equal(report.rawComparisons.length,10);
  for(const category of ['BOW','CROSSBOW','GUN','MOUNTED_RANGED','THROWING_AXE','CANNON','CATAPULT','EXPLOSIVE_ARTILLERY','MULTISHOT','WAR_MACHINE'])assert(report.rawComparisons.some(v=>v.category===category));
  for(const v of report.rawComparisons){assert.equal(v.uiReading,null);assert.equal(v.kind,'INDEPENDENT_EXTRACTOR_REPLAY_SAME_CA_SNAPSHOT');for(const p of v.comparisons)for(const f of Object.values(p.fields)){assert.equal(f.rawMatches,true);assert.notEqual(f.admittedMatches,false);}}
  const ui=read(folder+'ui.source.json');assert(ui.rows.some(r=>r.row.key==='unit_stat_localisations_onscreen_name_stat_reloading'&&r.row.text.includes('Reload Skill')));
  assert(ui.rows.some(r=>r.row.key==='unit_stat_localisations_onscreen_name_stat_missile_strength'&&r.row.text.includes('Missile Strength')));
  assert(ui.rows.some(r=>r.row.key==='unit_stat_localisations_onscreen_name_scalar_missile_explosion_damage_base'&&r.row.text.includes('Explosive')));
});

test('missile overlay has an exact inverse and all prior slices, Korean names and 23 rosters remain unchanged',()=>{
  for(const raw of read('src/data/units.json')){
    const previous=before(raw),current=withoutUnitRecruitment(game.getUnit(raw.id));assert.deepEqual(withoutUnitMissiles(current),previous,raw.id);assert.deepEqual(withoutUnitMissiles(applyUnitMissiles(raw)),raw);
    const {...a}=current,{...b}=previous;delete a.missile;delete b.missile;assert.deepEqual(a,b,raw.id);
    if(raw.gameVersion==='sample'){assert.deepEqual(current,previous);assert.equal(unitMissileAdmission(current),undefined);}
  }
  for(const [path,n] of [['entities.count',1071],['entities.totalHealth',986],['movement.speed',908],['attributes',1107],['passiveAbilities',1105]])assert.equal(production.filter(u=>path.split('.').reduce((v,k)=>v?.[k],u)!==undefined).length,n);
  for(const k of ['physical','missile','spell','fire','ward'])assert.equal(production.filter(u=>u.defense.resistances[k]!==undefined).length,1110);
  assert.equal(production.filter(u=>/[가-힣]/.test(u.name)).length,1110);assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});

test('all previous src/data files are byte-equivalent to the resistance commit',()=>{
  const paths=spawnSync('git',['ls-tree','-r','--name-only','c9168a6','--','src/data'],{encoding:'utf8'});assert.equal(paths.status,0);
  for(const path of paths.stdout.trim().split('\n')){const old=spawnSync('git',['show',`c9168a6:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);}
});

test('identity guards reject unreviewed additions, deletions and edits, including fake N/A missile objects',()=>{
  const raw=read('src/data/units.json').find(u=>u.id==='ca_unit_wh_dlc04_emp_inf_free_company_militia_0'),u=game.getUnit(raw.id);
  assert.throws(()=>applyUnitMissiles({...raw,gameVersion:'other'}),/identity drift/);assert.throws(()=>applyUnitMissiles({...raw,missile:{projectile:{baseDamage:0}}}),/identity drift/);
  for(const m of [{...u.missile,projectile:{...u.missile.projectile,baseDamage:99}},{...u.missile,ammunition:99},{projectile:{}}]){
    const changed={...u,missile:m};assert.equal(unitMissileAdmission(changed),undefined);assert.deepEqual(withoutUnitMissiles(changed),changed);assert.throws(()=>createUnitCatalog([changed],diagnostics.list()),/collision/);
  }
  const na=game.getUnit('ca_unit_wh_main_vmp_veh_black_coach'),fake={...na,missile:{projectile:{}}};assert.equal(unitMissileAdmission(fake),undefined);assert.throws(()=>createUnitCatalog([fake],diagnostics.list()),/collision/);
  assert.deepEqual(projectMissile(raw,{range:0,baseTime:0,baseDamage:0}).missile,{projectile:{baseDamage:0},range:0,reload:{baseTime:0}});
});

test('UI distinguishes N/A, UNKNOWN, per-field partial, raw direct damage and explicit numeric zero',()=>{
  const html=(missile,status)=>clean(renderToString(React.createElement(Details,{missile,status})));
  const na=html(undefined,'N/A');assert(na.includes('정규 사격 무기 없음 (N/A)'));assert(!na.includes('<strong>0</strong>'));assert(!na.includes('미확인'));
  const unknown=html(undefined,'UNKNOWN');assert.equal((unknown.match(/<strong>미확인<\/strong>/g)??[]).length,4);assert(unknown.includes('정규 사격 무기 있음'));
  const partial=html({projectile:{},range:480,reload:{baseTime:17}},'PARTIAL');assert(partial.includes('<span>사거리</span><strong>480</strong>'));assert(partial.includes('<span>발사체 기본 피해</span><strong>미확인</strong>'));
  assert(html({projectile:{baseDamage:0,armorPiercingDamage:0},range:0,reload:{baseTime:0}},'COMPLETE').includes('<span>발사체 기본 피해</span><strong>0</strong>'));
  const page=id=>clean(renderToString(React.createElement(MemoryRouter,{initialEntries:['/units/'+id]},React.createElement(Routes,null,React.createElement(Route,{path:'/units/:id',element:React.createElement(UnitPage)})))));
  assert(page('ca_unit_wh_main_emp_inf_spearmen_0').includes('정규 사격 무기 없음 (N/A)'));assert(page('ca_unit_wh_main_emp_art_helstorm_rocket_battery').includes('PARTIAL'));assert(page('ca_unit_wh3_main_kho_mon_soul_grinder_0').includes('UNKNOWN'));
  assert(page('ca_unit_wh3_main_cth_inf_peasant_archers_0').includes(projection.sourceHash));
});

test('all source hashes, compressed evidence, report, projection and target-based audit replay deterministically',async()=>{
  const {buildMissileRules,verifyInputs}=await import('../tools/wh3-importer/missile-rules/rules.mjs');assert.deepEqual(buildMissileRules(),{report,projection});
  const manifest=read(folder+'manifest.json');manifest.inputs[0].hash='changed';assert.throws(()=>verifyInputs(manifest),/Missile source drift/);
  const {decodeSource}=await modules(),source=read(folder+'catalog.source.json');source.expandedHash='changed';assert.throws(()=>decodeSource(source),/Expanded missile source drift/);
  const {auditUnitData}=await import('../scripts/audit-unit-data.mjs'),audit=auditUnitData();assert.equal(audit.missileTargets,370);assert.deepEqual(audit.missileStatuses,{COMPLETE:148,PARTIAL:190,UNKNOWN:32,'N/A':740});
  assert.equal(audit.coverage['missile.range'].known,333);assert.equal(audit.coverage['missile.range'].unknown,37);assert.equal(audit.coverage['missile.range'].notApplicable,740);
});
