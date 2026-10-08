const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter,Routes,Route}=require('react-router-dom');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitResistances,withoutUnitResistances,unitResistanceAdmission}=require('../.test-build/src/repositories/unitResistances.js');
const {applyUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
const {applyUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {applyUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const {createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const Details=require('../.test-build/src/components/UnitResistanceDetails.js').default;
const UnitPage=require('../.test-build/src/pages/UnitPage.js').default;
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/resistance-rules/';
const report=read(folder+'report.json'),projection=read('src/data/unitResistanceAdmissions.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample');
const expand=f=>f?{value:f.value,source:structuredClone({...report.sourceRows[f.sourceId],field:f.field,joins:report.joinPaths[f.pathId]})}:null;
const trace=t=>({...t,landReference:expand(t.landReference),facts:Object.fromEntries(Object.entries(t.facts).map(([k,f])=>[k,expand(f)]))});
const clean=html=>html.replace(/<!--.*?-->/g,'');

test('all 5550 base resistances are exact decoded fields; explicit zero, nonzero and negative fire counts agree',()=>{
  assert.equal(production.length,1110);assert.equal(projection.admissions.length,1110);
  const expected={physical:[911,199,0],missile:[907,203,0],spell:[984,126,0],fire:[1041,69,15],ward:[1109,1,0]};
  for(const [k,[zero,nonzero,negative]] of Object.entries(expected)){
    const values=production.map(u=>u.defense.resistances[k]);assert.equal(values.filter(v=>v===undefined).length,0);
    assert.equal(values.filter(v=>v===0).length,zero);assert.equal(values.filter(v=>v!==0).length,nonzero);assert.equal(values.filter(v=>v<0).length,negative);
    assert.equal(report.summary.perType[k].explicitZero,zero);
  }
  assert.equal(report.summary.explicitZeroFields,4952);assert.equal(report.summary.nonzeroUnits,502);
  assert.equal(report.summary.COMPLETE,1110);assert.equal(report.summary.PARTIAL,0);assert.equal(report.summary.UNKNOWN,0);
  for(const t of report.catalog){
    const u=game.getUnit(t.id);assert.deepEqual(u.defense.resistances,t.prediction.values);
    for(const [k,f] of Object.entries(t.facts)){assert.equal(f.value,u.defense.resistances[k]);assert.equal(report.sourceRows[f.sourceId].table,'land_units_tables');}
    assert.equal(unitResistanceAdmission(u).kind,'CA_EXPLICIT_BASE_PERCENTAGE_POINTS');
  }
});

test('missing one field stays partial and never defaults to zero; broken joins, schemas and identities stay unknown',async()=>{
  const {predictResistances}=await import('../tools/wh3-importer/resistance-rules/rules.mjs');
  const original=trace(report.catalog.find(t=>t.mainKey==='wh_main_emp_inf_spearmen_0'));
  assert.deepEqual(predictResistances(original).values,{physical:0,missile:0,spell:0,fire:0,ward:0});
  const missing=structuredClone(original);delete missing.facts.ward;
  const partial=predictResistances(missing);assert.equal(partial.status,'PARTIAL');assert.equal(partial.values.ward,undefined);assert.equal(partial.values.physical,0);
  for(const mutate of [t=>t.landReference.value='other',t=>t.mainKey='borrowed',t=>t.landReference.source.schemaVersion=999,t=>t.landReference=null]){
    const t=structuredClone(original);mutate(t);assert.equal(predictResistances(t).status,'UNKNOWN');
  }
  for(const mutate of [f=>f.source.joins=[],f=>f.source.rowKey.key='other',f=>f.source.table='battle_entities_tables',f=>f.source.schemaVersion=55,f=>f.source.joins[0].from='other']){
    const t=structuredClone(original);mutate(t.facts.spell);assert.equal(predictResistances(t).status,'PARTIAL');assert.equal(predictResistances(t).values.spell,undefined);
  }
});

test('integer percentage points are not scaled, rounded, clamped or aggregated; only fire accepts negative base values',async()=>{
  const {predictResistances}=await import('../tools/wh3-importer/resistance-rules/rules.mjs');
  const t=trace(report.catalog.find(t=>t.mainKey==='wh3_dlc26_ogr_mon_yhetees'));
  assert.equal(predictResistances(t).values.fire,-25);
  t.facts.ward.value=95;assert.equal(predictResistances(t).values.ward,95);
  t.facts.physical.value=20;t.facts.missile.value=25;assert.equal(predictResistances(t).values.physical,20);
  for(const invalid of [null,'0',NaN,Infinity,0.25,2147483648,-5]){t.facts.physical.value=invalid;assert.equal(predictResistances(t).values.physical,undefined);assert.equal(predictResistances(t).values.fire,-25);}
});

test('independent pack reextraction covers zero, all five nonzero types, fire weakness, mount, engine, articulation and flight',()=>{
  assert.equal(report.rawComparisons.length,11);assert(report.rawComparisons.every(v=>v.uiReading===null));
  for(const k of ['physical','missile','spell','fire','ward'])assert(report.rawComparisons.some(v=>v.comparisons[k].raw>0),k);
  assert(report.rawComparisons.some(v=>v.comparisons.fire.raw<0));
  for(const shape of ['MAN_ONLY','MOUNTED','ENGINE','ARTICULATED'])assert(report.rawComparisons.some(v=>v.shape===shape),shape);
  for(const v of report.rawComparisons)for(const c of Object.values(v.comparisons)){assert.equal(c.expected,c.actual);assert.equal(c.matches,true);}
  assert(report.rawComparisons.some(v=>v.id==='ca_unit_wh_main_brt_cav_pegasus_knights'));
  assert.equal(report.characters.length,4);assert(report.characters.every(c=>c.status==='AUDITED_OUTSIDE_UNIT_SLICE'));
});

test('historical references reproduce 20 physical and 35 spell, while UI labels resolve legacy magic and ward names',()=>{
  const truth=read(folder+'ground-truth.json'),source=read(folder+'semantics.source.json');
  assert.equal(truth.liveGameReadings,0);assert.equal(truth.manualReference.kind,'USER_PROVIDED_WIKI_REFERENCE');
  assert.equal(truth.manualReference.observedGameVersion,null);
  const v=report.referenceComparisons.find(v=>v.id===truth.manualReference.id);
  assert.equal(v.comparisons.physical.actual,20);assert.equal(v.comparisons.spell.actual,35);
  assert(report.candidateComparisons.every(v=>v.RAW_PERCENT_POINTS.matches&&!v.RAW_X100.matches&&!v.ONE_MINUS_RAW_PERCENT.matches&&!v.FRACTION.matches));
  assert(source.rows.some(r=>r.row.key==='unit_stat_localisations_onscreen_name_stat_resistance_magic'&&r.row.text.includes('Spell Resistance')));
  assert(source.rows.some(r=>r.row.key==='stat_resistance_all'&&r.row.icon?.includes('resistance_ward_save')));
});

test('passive and timed active resistance/weakness phases are recorded separately and never added to base',()=>{
  const effects=report.dynamicEffects;assert(effects.every(e=>e.admission==='EXCLUDED_FROM_BASE_FIELDS'));
  const regen=effects.find(e=>e.phase?.id==='wh_main_unit_passive_regeneration');assert.equal(regen.value,-20);assert.equal(regen.stat,'stat_weakness_flame');assert.equal(regen.ability.passive,true);
  const flesh=effects.find(e=>e.phase?.id==='wh_dlc05_spell_life_flesh_to_stone');assert.equal(flesh.value,60);assert(flesh.phase.duration>0);assert.equal(flesh.ability.passive,false);
  assert.equal(game.getUnit('ca_unit_wh_main_vmp_mon_varghulf').defense.resistances.fire,0);
  assert.equal(game.getUnit('ca_unit_wh2_dlc09_tmb_cav_hexwraiths').defense.resistances.ward,8);
});

test('resistance overlay is exactly reversible and preserves every previous field and sample',()=>{
  for(const raw of read('src/data/units.json')){
    const before=applyUnitSpeed(applyUnitEntities(applyUnitPassives(applyUnitAttributes(localiseUnit(raw))))),after=game.getUnit(raw.id);
    assert.deepEqual(withoutUnitResistances(after),before,raw.id);
    assert.deepEqual(withoutUnitResistances(applyUnitResistances(raw)),raw);
    if(raw.gameVersion==='sample')assert.equal(unitResistanceAdmission(after),undefined);
  }
  assert.equal(production.filter(u=>u.entities.count!==undefined).length,1071);assert.equal(production.filter(u=>u.entities.totalHealth!==undefined).length,986);
  assert.equal(production.filter(u=>u.movement.speed!==undefined).length,908);assert.equal(production.filter(u=>u.attributes!==undefined).length,1107);
  assert.equal(production.filter(u=>u.passiveAbilities!==undefined).length,1105);
  assert.equal(production.filter(u=>/[가-힣]/.test(u.name)).length,1110);
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});

test('all preexisting datasets and old resistance/campaign admission evidence remain byte-equivalent to speed commit',()=>{
  const paths=spawnSync('git',['ls-tree','-r','--name-only','5f001a2','--','src/data','tools/wh3-importer/resistance-research'],{encoding:'utf8'});assert.equal(paths.status,0);
  for(const path of paths.stdout.trim().split('\n')){
    const old=spawnSync('git',['show',`5f001a2:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
    assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
  }
});

test('resistance identity guards reject drift and retain altered values for shared identity collision detection',()=>{
  const raw=read('src/data/units.json').find(u=>u.id==='ca_unit_wh_main_vmp_veh_black_coach'),u=game.getUnit(raw.id);
  assert.throws(()=>applyUnitResistances({...raw,gameVersion:'changed'}),/identity drift/);
  assert.throws(()=>applyUnitResistances({...raw,defense:{...raw.defense,resistances:{physical:0}}}),/identity drift/);
  const changed={...u,defense:{...u.defense,resistances:{...u.defense.resistances,ward:99}}};
  assert.equal(unitResistanceAdmission(changed),undefined);assert.deepEqual(withoutUnitResistances(changed),changed);
  assert.throws(()=>createUnitCatalog([changed],diagnostics.list()),/collision/);
});

test('Production UI shows explicit zero, nonzero, fire weakness and per-field unknown with base provenance',()=>{
  const html=r=>clean(renderToString(React.createElement(Details,{resistances:r})));
  const partial=html({physical:0,spell:35,fire:-25});
  for(const text of ['<span>물리 저항</span><strong>0%</strong>','<span>주문 저항</span><strong>35%</strong>','<span>화염 취약성</span><strong>25%</strong>','<span>와드 세이브</span><strong>미확인</strong>'])assert(partial.includes(text),text);
  assert.equal((html(undefined).match(/<strong>미확인<\/strong>/g)??[]).length,5);
  const page=id=>clean(renderToString(React.createElement(MemoryRouter,{initialEntries:['/units/'+id]},React.createElement(Routes,null,React.createElement(Route,{path:'/units/:id',element:React.createElement(UnitPage)})))));
  assert(page('ca_unit_wh2_dlc09_tmb_cav_hexwraiths').includes('<span>와드 세이브</span><strong>8%</strong>'));
  assert(page('ca_unit_wh_main_emp_inf_spearmen_0').includes(projection.sourceHash));
  // Current Production is complete. A missing-data fixture tests its UI path
  // without manufacturing an unresolved Production record.
  const original=game.getUnit,id='ca_unit_wh_main_emp_inf_spearmen_0',unit=original(id);
  game.getUnit=key=>key===id?{...unit,defense:{...unit.defense,resistances:undefined}}:original(key);
  try {assert(page(id).includes('<span>물리 저항</span><strong>미확인</strong>'));} finally {game.getUnit=original;}
});

test('domain validation accepts known zero and signed fire, rejects nonfinite values without a combat clamp',()=>{
  const base=game.getUnit('zombies'),unit=r=>({...base,defense:{...base.defense,resistances:r}});
  assert.deepEqual(validateUnits([unit({physical:0,spell:110,fire:-25})],[base.factionId]),[]);
  for(const [kind,value] of [['physical',-1],['spell',NaN],['fire',Infinity]])assert(validateUnits([unit({[kind]:value})],[base.factionId]).some(i=>i.field==='defense.resistances.'+kind));
});

test('all raw sources, schema meanings, references, report and projection replay deterministically',async()=>{
  const {buildResistanceRules,verifyInputs}=await import('../tools/wh3-importer/resistance-rules/rules.mjs');
  assert.deepEqual(buildResistanceRules(),{report,projection});
  const changed=read(folder+'manifest.json');changed.inputs[0].hash='changed';assert.throws(()=>verifyInputs(changed),/Resistance source drift/);
  const {auditUnitData}=await import('../scripts/audit-unit-data.mjs');const audit=auditUnitData();
  assert.deepEqual(audit.resistanceStatuses,{COMPLETE:1110,PARTIAL:0,UNKNOWN:0});
  assert.equal(audit.resistances.fire.negative,15);assert.equal(audit.coverage['movement.speed'].known,908);
});
