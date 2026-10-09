const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react'),{renderToString}=require('react-dom/server');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitRecruitment,withoutUnitRecruitment,unitRecruitmentAdmission,recruitmentBuilding}=require('../.test-build/src/repositories/unitRecruitment.js');
const {applyUnitMissiles}=require('../.test-build/src/repositories/unitMissiles.js');
const {applyUnitResistances}=require('../.test-build/src/repositories/unitResistances.js');
const {applyUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
const {applyUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {applyUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const Details=require('../.test-build/src/components/UnitRecruitmentDetails.js').default;
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/recruitment/';
const projection=read('src/data/unitRecruitmentAdmissions.json'),report=read(folder+'report.json'),production=game.listUnits().filter(u=>u.gameVersion!=='sample');
const previous=raw=>applyUnitMissiles(applyUnitResistances(applyUnitSpeed(applyUnitEntities(applyUnitPassives(applyUnitAttributes(localiseUnit(raw)))))));
const modules=async()=>({...await import('../tools/wh3-importer/recruitment/predict.mjs'),...await import('../tools/wh3-importer/recruitment/source.mjs')});
const html=unit=>renderToString(React.createElement(Details,{unit})).replace(/<!--.*?-->/g,'');

test('Production stores 758 building requirement units and 1107 direct/special source records, with honest completeness',()=>{
  assert.equal(production.length,1110);assert.equal(projection.admissions.length,1110);
  assert.equal(production.filter(u=>u.campaign?.recruitmentRequirements?.length).length,758);
  assert.equal(production.filter(u=>u.campaign?.recruitmentSources?.length).length,1107);
  assert.deepEqual(report.summary.statuses,{COMPLETE:0,PARTIAL:1107,UNKNOWN:3,'N/A':0});
  assert.deepEqual(report.summary.directBuildingStatuses,{COMPLETE:758,PARTIAL:0,UNKNOWN:352,'N/A':0});
  assert.equal(report.summary.verifiedEffectiveSources.after,0);assert.equal(report.summary.specialClassifiedUnits,627);
  for(const u of production){const a=unitRecruitmentAdmission(u);assert(a);assert.equal(u.campaign.recruitmentReview.status,a.status);assert.equal(u.campaign.recruitmentReview.effectiveStatus,a.sources.length?'PARTIAL_SOURCE':'UNKNOWN');}
  assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
});

test('baseline false is not global disabled; faction restrictions/exclusions cannot become race-wide permissions',async()=>{
  const {buildingPermission}=await modules();const base={building:'b',unit:'u',faction:'',enabled:false};
  assert.equal(buildingPermission(base,[base]),'BASE_PERMISSION');
  const yes={...base,faction:'only_this_faction',enabled:true},no={...yes,enabled:false};
  assert.equal(buildingPermission(yes,[base,yes]),'FACTION_PERMISSION');assert.equal(buildingPermission(no,[base,no]),'FACTION_EXCLUSION');
  assert.equal(buildingPermission(yes,[base,yes,no]),'HELD_CONFLICTING_FACTION_PERMISSION');
  assert.equal(buildingPermission(no,[no]),'HELD_STANDALONE_FACTION_FALSE');assert.equal(buildingPermission({...base,enabled:undefined},[base]),'HELD_INVALID_PERMISSION');
  const factionRows=projection.admissions.flatMap(a=>a.requirements).filter(r=>r.factionKey);assert.equal(factionRows.length,34);
  assert(factionRows.every(r=>r.rawEnabled===true&&r.factionKey==='wh3_dlc29_nag_host_of_nagash'));
  assert(projection.admissions.flatMap(a=>a.requirements).filter(r=>!r.factionKey).every(r=>r.rawEnabled===false));
});

test('chain stage is not Tier; all explicit higher levels and multiple buildings survive',()=>{
  assert.equal(report.summary.multipleBuildings,698);assert.equal(report.summary.multipleChains,587);
  const u=game.getUnit('ca_unit_wh_main_emp_inf_swordsmen'),rows=u.campaign.recruitmentRequirements;assert.equal(rows.length,13);
  for(const r of rows){const b=recruitmentBuilding(r.buildingId);assert(b);assert.equal(r.buildingStage,b.stage);assert.equal(r.requiredPrimaryBuildingLevel,b.requiredPrimaryBuildingLevel);assert.equal(r.buildingTier,undefined);}
  assert(projection.admissions.flatMap(a=>a.requirements).some(r=>r.buildingStage===0));
  assert(projection.admissions.flatMap(a=>a.requirements).some(r=>r.buildingStage!==r.requiredPrimaryBuildingLevel));
  assert.equal(new Set(rows.map(r=>r.sourceKey)).size,rows.length);
});

test('missing selection, processed reference or edge never admits building paths or proves N/A',async()=>{
  const {loadSource,recruitmentGraph,inspectRecruitment}=await modules(),source=loadSource(),seed=source.seeds.find(s=>s.mainKey==='wh_main_emp_inf_spearmen_0');
  assert.equal(inspectRecruitment(recruitmentGraph(source),seed).requirements.length,51);
  for(const mutate of [
    s=>{s.coverage=s.coverage.filter(c=>c.query.table!=='building_units_allowed_tables');},
    s=>{s.schemas.find(x=>x.table==='building_units_allowed_tables').fields.find(f=>f.name==='building').is_reference=null;},
    s=>{s.relationships=s.relationships.filter(e=>e.field!=='building');},
    s=>{s.schemas.find(x=>x.table==='building_units_allowed_tables').fields.find(f=>f.name==='enabled').field_type='I32';}
  ]){const s=structuredClone(source);mutate(s);const result=inspectRecruitment(recruitmentGraph(s),seed);assert.equal(result.requirements.length,0);assert.equal(result.status,'UNKNOWN');assert.notEqual(result.status,'N/A');}
});

test('broken/ambiguous building and unknown condition hold only the affected path; no inferred inheritance',async()=>{
  const {loadSource,recruitmentGraph,inspectRecruitment}=await modules(),source=loadSource(),seed=source.seeds.find(s=>s.mainKey==='wh_main_emp_inf_spearmen_0');
  const row=source.rows.find(r=>r.table==='building_units_allowed_tables'&&r.row.unit===seed.mainKey);
  const changed=structuredClone(source);changed.rows.find(r=>r.id===row.id).row.conditions=99;
  let t=inspectRecruitment(recruitmentGraph(changed),seed);assert.equal(t.requirements.length,50);assert.equal(t.directBuildingStatus,'PARTIAL');assert(t.holds.some(h=>h.includes('CONDITION_HELD')));
  const edge=source.relationships.find(e=>e.from===row.id&&e.field==='building'),target=source.rows.find(r=>r.id===edge.to);
  const duplicate=structuredClone(source);duplicate.rows.push({...structuredClone(target),id:target.id+':ambiguous'});duplicate.relationships.push({...edge,to:target.id+':ambiguous'});
  t=inspectRecruitment(recruitmentGraph(duplicate),seed);assert(t.requirements.length<51);assert(t.holds.some(h=>h.includes('REFERENCE_HELD')));
  const removed=structuredClone(source);removed.rows=removed.rows.filter(r=>r.id!==row.id);removed.relationships=removed.relationships.filter(e=>e.from!==row.id);
  t=inspectRecruitment(recruitmentGraph(removed),seed);assert.equal(t.requirements.length,50);assert(!t.requirements.some(r=>r.sourceKey===String(row.row.key)));
});

test('special source classes are structural, and capacity/research references do not fabricate recruitment effects',async()=>{
  const {loadSource}=await modules(),s=loadSource();
  for(const a of projection.admissions){
    const main=s.rows.find(r=>r.table==='main_units_tables'&&r.row.unit===a.mainKey);
    assert.equal(a.sources.some(x=>x.type==='REGIMENT_OF_RENOWN'),main.row.is_renown);
    assert(a.sources.every(x=>x.effectiveStatus==='PARTIAL_SOURCE'));
    if(a.unitConditions?.capacityConditions.length)assert(!a.sources.some(x=>x.type==='CAPACITY_CHANGE'));
  }
  for(const [type,n] of [['REGIMENT_OF_RENOWN',256],['UNIT_UPGRADE',88],['RITUAL_MERCENARY_SPAWN',36],['MERCENARY_POOL',561]])assert.equal(projection.admissions.filter(a=>a.sources.some(s=>s.type===type)).length,n);
  assert(projection.admissions.some(a=>a.sources.some(s=>s.type==='UNIT_UPGRADE'&&s.technologyKeys.length)));
  assert(!projection.admissions.some(a=>a.sources.some(s=>['LEGENDARY_LORD_EXCLUSIVE','SUMMON_ONLY','GLOBAL','LOCAL'].includes(s.type))));
});

test('building registry preserves exact culture/faction disables, prerequisites, campaigns and alternate buildings',()=>{
  const buildings=Object.values(projection.buildings);assert.equal(buildings.length,1633);
  assert(buildings.some(b=>b.variants.some(v=>v.disables)));assert(buildings.some(b=>b.requiredBuildings.length));
  assert(buildings.some(b=>b.availabilitySets.some(s=>s.rules.some(r=>r.campaign))));assert(buildings.some(b=>b.settlementTypes.length));
  assert(buildings.every(b=>typeof b.onlyInCapital==='boolean'));assert(buildings.some(b=>b.contentPacks.length));
  assert(report.unavailable.some(u=>u.table==='unit_required_technology_junctions_tables'));
  assert.equal(report.races.length,read('src/data/factionRosters.json').rosters.length);for(const race of report.races)assert.equal(race.PARTIAL+race.UNKNOWN,race.total);
});

test('12 independently collected categories agree; CA replay is distinguished from campaign UI measurement',()=>{
  assert.equal(report.comparisons.length,12);
  for(const v of report.comparisons){assert.equal(v.matches,true);assert.equal(v.expectedDirectRows,v.actualDirectRows);assert.equal(v.uiReading,null);assert(v.stages.every(x=>x.expectedStage===x.actualStage&&x.matches));}
  assert.equal(read(folder+'representatives.json').liveGameReadings,0);assert.equal(read(folder+'references.json').liveGameReadings,0);
  assert(report.comparisons.some(c=>c.category==='FACTION_PERMISSION_CONTEXT'));assert(report.comparisons.some(c=>c.category==='TECHNOLOGY_UPGRADE_CONDITION'));
});

test('recruitment overlay has an exact inverse, all previous full Production records and five samples remain identical',()=>{
  for(const raw of read('src/data/units.json')){const before=previous(raw),current=game.getUnit(raw.id);assert.deepEqual(withoutUnitRecruitment(current),before,raw.id);
    assert.deepEqual(withoutUnitRecruitment(applyUnitRecruitment(raw)),raw);assert.deepEqual(current.entities,before.entities);assert.deepEqual(current.missile,before.missile);
    if(raw.gameVersion==='sample'){assert.deepEqual(current,before);assert.equal(unitRecruitmentAdmission(current),undefined);}
  }
  for(const [path,n] of [['entities.count',1071],['entities.totalHealth',986],['movement.speed',908],['attributes',1107],['passiveAbilities',1105]])assert.equal(production.filter(u=>path.split('.').reduce((v,k)=>v?.[k],u)!==undefined).length,n);
  for(const k of ['physical','missile','spell','fire','ward'])assert.equal(production.filter(u=>u.defense.resistances[k]!==undefined).length,1110);
  assert.equal(production.filter(u=>/[가-힣]/.test(u.name)).length,1110);assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});

test('every prior data file, including canonical character aliases and prior admissions, is byte-equivalent to ef6b174',()=>{
  const paths=spawnSync('git',['ls-tree','-r','--name-only','ef6b174','--','src/data'],{encoding:'utf8'});assert.equal(paths.status,0);
  for(const p of paths.stdout.trim().split('\n')){const old=spawnSync('git',['show',`ef6b174:${p}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),p);}
});

test('exact recruitment provenance guards reject edits, additions and deletions instead of hiding unrelated drift',()=>{
  const raw=read('src/data/units.json').find(u=>u.id==='ca_unit_wh_dlc04_emp_inf_free_company_militia_0'),unit=game.getUnit(raw.id);
  assert.throws(()=>applyUnitRecruitment({...raw,gameVersion:'other'}),/identity drift/);assert.throws(()=>applyUnitRecruitment({...raw,campaign:{...raw.campaign,upkeep:1}}),/identity drift/);
  for(const campaign of [{...unit.campaign,recruitmentSources:[]},{...unit.campaign,recruitmentRequirements:[]},{...unit.campaign,upkeep:999},{...unit.campaign,recruitmentReview:{...unit.campaign.recruitmentReview,status:'COMPLETE'}}]){
    const changed={...unit,campaign};assert.equal(unitRecruitmentAdmission(changed),undefined);assert.deepEqual(withoutUnitRecruitment(changed),changed);assert.throws(()=>createUnitCatalog([changed],diagnostics.list()),/collision/);
  }
});

test('validator prevents made-up effective completeness and mismatched building source keys',()=>{
  const u=game.getUnit('ca_unit_wh_main_emp_inf_spearmen_0'),validate=campaign=>validateUnits([{...u,campaign}],game.listFactions().map(f=>f.id));
  assert(validate({...u.campaign,recruitmentReview:{...u.campaign.recruitmentReview,status:'COMPLETE'}}).length);
  assert(validate({...u.campaign,recruitmentSources:[{...u.campaign.recruitmentSources[0],effectiveStatus:'VERIFIED_EFFECTIVE_SOURCE'}]}).length);
  assert(validate({...u.campaign,recruitmentRequirements:[{...u.campaign.recruitmentRequirements[0],buildingStage:-1}]}).length);
  assert(validate({...u.campaign,recruitmentSources:[{...u.campaign.recruitmentSources[0],requirementKey:'wrong'}]}).length);
});

test('UI distinguishes normal/multiple building paths, special partial and unknown without fabricated N/A or Tier',()=>{
  const normal=html(game.getUnit('ca_unit_wh_main_emp_inf_spearmen_0'));assert(normal.includes('최소 CA 단계 0'));assert(normal.includes('Tier로 환산하지'));assert(normal.includes('실효 모집 가능 여부: 미확인'));
  const multi=html(game.getUnit('ca_unit_wh_main_emp_inf_swordsmen'));assert((multi.match(/최소 CA 단계/g)??[]).length>1);
  const special=html(game.getUnit('ca_unit_wh_dlc04_vmp_inf_sternsmen_0'));assert(special.includes('유명연대'));assert(special.includes('PARTIAL'));
  const unknown=html(game.getUnit('ca_unit_wh3_dlc23_chd_veh_iron_daemon_3payload_qb'));assert(unknown.includes('UNKNOWN'));assert(unknown.includes('모집 출처 미확인'));assert(!unknown.includes('직접 출처 확인'));
  assert(normal.includes('직접 출처 확인'));assert(!normal.includes('VERIFIED_EFFECTIVE_SOURCE'));
  const faction=html(game.getUnit('ca_unit_wh2_dlc11_cst_mon_animated_hulks_0'));assert(faction.includes('진영 지정'));assert(!faction.includes('{{tr:'));assert(faction.includes('건물 이름 미확인'));
});

test('compressed sources, pinned inputs, projection/report and live audit replay deterministically',async()=>{
  const {buildRecruitment,verifyInputs}=await import('../tools/wh3-importer/recruitment/rules.mjs');assert.deepEqual(buildRecruitment(),{report,projection});
  const m=read(folder+'manifest.json');m.inputs[0].hash='drift';assert.throws(()=>verifyInputs(m),/Recruitment source drift/);
  const {decodeSource}=await modules(),s=read(folder+'catalog.source.json');s.expandedHash='drift';assert.throws(()=>decodeSource(s),/expanded source drift/);
  const {auditUnitData}=await import('../scripts/audit-unit-data.mjs'),audit=auditUnitData();assert.equal(audit.coverage['campaign.recruitmentRequirements'].known,758);assert.equal(audit.coverage['campaign.recruitmentSources'].known,1107);assert.equal(audit.recruitment.verifiedEffectiveSources.after,0);
  assert.deepEqual(audit.missileStatuses,{COMPLETE:148,PARTIAL:190,UNKNOWN:32,'N/A':740});
});
