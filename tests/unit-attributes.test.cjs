const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const Details=require('../.test-build/src/components/UnitProductionDetails.js').default;
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const {withoutUnitLocalisation}=require('../.test-build/src/repositories/unitLocalisation.js');
const {applyUnitAttributes,withoutUnitAttributes,unitAttributeAdmission}=require('../.test-build/src/repositories/unitAttributes.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {getUnitAttributeLabel}=require('../.test-build/src/domain/unitLabels.js');
const json=p=>JSON.parse(readFileSync(p));
const raw=json('src/data/units.json'),projection=json('src/data/unitAttributeAdmissions.json');
const review=json('tools/wh3-importer/unit-attributes/admission.json'),source=json('tools/wh3-importer/unit-attributes/source.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample');
const render=u=>renderToString(React.createElement(Details,{unit:u}));

test('attribute collections promote with exact provenance; all other Unit fields, old traits and Korean names survive',()=>{
  assert.equal(production.length,1110);
  assert.equal(raw.filter(u=>u.attributes!==undefined).length,33);
  assert.equal(production.filter(u=>u.attributes!==undefined).length,1107);
  assert.equal(production.filter(u=>u.attributes?.length).length,1102);
  assert.equal(production.filter(u=>u.attributes===undefined).length,3);
  assert.equal(review.summary.complete,849);assert.equal(review.summary.partial,261);
  assert.equal(review.summary.knownEmpty,5);assert.equal(review.summary.promotedCanonicalAttributes.length,50);
  assert.equal(review.summary.rawKeys,58);assert.equal(review.summary.groups,1038);assert.equal(review.summary.junctions,3249);
  for(const baseline of raw){
    const current=game.getUnit(baseline.id);
    assert.deepEqual(withoutUnitAttributes(withoutUnitLocalisation(current)),baseline,baseline.id);
    if(baseline.gameVersion==='sample'){assert.deepEqual(current,baseline);continue;}
    assert(/[가-힣]/.test(current.name));
    const admission=review.admissions.find(a=>a.id===current.id);
    assert.deepEqual(current.attributes?.slice(0,baseline.attributes?.length??0),current.attributes===undefined?undefined:baseline.attributes??[]);
    assert.equal(new Set(current.attributes).size,current.attributes?.length??0);
    assert.equal(unitAttributeAdmission(current).status,admission.status);
    for(const id of current.attributes??[])assert(admission.facts.some(f=>f.canonicalId===id&&f.sourceRowIds.length>=2));
  }
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
  assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
  // Bind unchanged raw datasets to the actual preceding localisation commit.
  for(const path of ['src/data/units.json','src/data/unitLocalisations.json','tools/wh3-importer/unit-localisation/source.json','src/data/factionRosters.json','src/data/characterAliases.json','src/data/legacyCharacters.json','src/data/lords.json','src/data/heroes.json','src/data/unitHpAdmissions.json','src/data/unitSpeedAdmissions.json']){
    const old=spawnSync('git',['show',`79deea5:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
    assert.equal(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
  }
});

test('exact CA keys canonicalize while distinct traits sharing UI collections stay distinct',()=>{
  const d=new Map(review.classifications.map(c=>[c.key,c]));
  for(const [key,id]of [['daemonic','daemon'],['fatigue_immune','perfect_vigour'],['hide_forest','stalk_in_forest'],['mounted_fire_move','fire_while_moving'],['can_siege','siege_attacker']]){
    assert.equal(d.get(key).canonicalId,id);assert.equal(d.get(key).status,'ADMITTED');
    assert(d.get(key).sourceRowIds.some(row=>row.includes('unit_attributes_tables:')));
    assert(d.get(key).sourceRowIds.some(row=>row.startsWith('local_kr.pack:')));
    assert(/[가-힣]/.test(getUnitAttributeLabel(id)));
    assert(review.admissions.some(a=>a.facts.some(f=>f.rawKey===key&&f.canonicalId===id)));
  }
  assert.notEqual(d.get('hide_forest').canonicalId,d.get('stalk').canonicalId);
  assert.notEqual(d.get('causes_fear').canonicalId,d.get('causes_terror').canonicalId);
  const ui=source.rows.filter(r=>r.table==='attribute_to_ui_collection_junctions_tables');
  assert.equal(ui.find(r=>r.row.unit_attribute==='causes_fear').row.collection,ui.find(r=>r.row.unit_attribute==='causes_terror').row.collection);
  assert.equal(d.get('causes_fear').kind,'CA_ATTRIBUTE_WITH_UI_COLLECTION');
  assert(production.some(u=>u.attributes?.includes('causes_fear')&&u.attributes.includes('causes_terror')));
});

test('movement, targeting-only flags, unresolved meanings and native abilities never become attributes',()=>{
  const d=new Map(review.classifications.map(c=>[c.key,c]));
  const prohibited=['flying','always_flying','cant_run','squig','gorger','guerrilla_deploy','rampage','underground'];
  for(const key of prohibited){
    assert(['EXCLUDED','HOLD'].includes(d.get(key).status));
    assert(d.get(key).sourceRowIds.some(id=>id.startsWith('local_en.pack:')));
    assert(!production.some(u=>u.attributes?.includes(key)));
  }
  assert.equal(review.admissions.filter(a=>a.withheld.some(w=>w.rawKey==='guerrilla_deploy')).length,260);
  for(const key of ['rampage','underground'])assert.equal(review.admissions.filter(a=>a.withheld.some(w=>w.rawKey===key)).length,1);
  assert.deepEqual(projection.admissions.filter(a=>a.attributes===undefined).map(a=>a.id).sort(),[
    'ca_unit_wh2_dlc10_def_cav_raven_heralds_ror_0','ca_unit_wh2_main_def_inf_harpies','ca_unit_wh_dlc05_bst_mon_harpies_0'].sort());
  assert(source.missingKeys.some(r=>r.key==='guerrilla_deployment'));
  assert.equal(review.excludedAbilities.length,416);
  for(const a of review.excludedAbilities)assert(!production.some(u=>u.attributes?.includes(a.key)));
  for(const key of ['wh_main_unit_passive_frenzy','wh_main_unit_passive_regeneration','wh3_main_unit_passive_daemonic_instability_daemon'])assert(review.excludedAbilities.some(a=>a.key===key&&a.sourceType==='passive'));
  assert(!review.classifications.some(c=>c.key==='aquatic'));
});

test('committed source, fact review and projection replay offline; missing rows, key/schema/Loc/snapshot changes fail closed',async()=>{
  const {reviewUnitAttributes,classifyAttribute}=await import('../tools/wh3-importer/unit-attributes/review.mjs');
  const {decodeSource}=await import('../tools/wh3-importer/expansion-batch-01/compact.mjs');
  const {rosterSourceHash}=await import('../tools/wh3-importer/production-growth/roster.mjs');
  const roster=decodeSource(json('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
  assert.deepEqual(reviewUnitAttributes(source,roster,raw),{review,projection});
  for(const mutate of [s=>s.rows.pop(),s=>s.requests[0].group='wrong',s=>s.schemas[0].fields.pop(),s=>s.localisations[0].row.text='guess',s=>s.coverage[0].matchedRows++,s=>s.koreanPackHash='wrong',s=>s.provenance.schemaSha256='wrong']){
    const bad=structuredClone(source);mutate(bad);assert.throws(()=>reviewUnitAttributes(bad,roster,raw),/source hash drift/);
  }
  assert.throws(()=>reviewUnitAttributes(source,roster,raw.slice(1)),/Unit baseline drift/);
  const bad=structuredClone(source);
  bad.localisations.find(r=>r.sourcePack==='local_en.pack'&&r.row.key==='unit_attributes_bullet_text_causes_fear').row.text='Other meaning||effect';
  assert.throws(()=>classifyAttribute(bad,'causes_fear'),/meaning drift/);
});

test('attribute identity overlay never permits changed traits or unrelated facts through the collision guard',()=>{
  for(const d of diagnostics.list()){
    const u=game.getUnit(d.id);assert.equal(createUnitCatalog([u],[d]).length,1);
    const traitTampering=[[...u.attributes,'unproved'],u.attributes.slice(1),[...u.attributes,u.attributes[0]]];
    if(u.attributes.length>1)traitTampering.push([...u.attributes].reverse());
    for(const attributes of traitTampering)assert.throws(()=>createUnitCatalog([{...u,attributes}],[d]),/collision/);
    assert.throws(()=>createUnitCatalog([{...u,movement:{...u.movement,speed:12345}}],[d]),/collision/);
    assert.throws(()=>applyUnitAttributes({...raw.find(r=>r.id===u.id),attributes:['unproved']}),/identity drift/);
  }
});

test('validator rejects duplicate attributes and known ability/movement/internal/held source flags',()=>{
  const u=production[0],factions=game.listFactions().map(f=>f.id);
  for(const attributes of [['causes_fear','causes_fear'],['flying'],['always_flying'],['cant_run'],['squig'],['gorger'],['rampage'],['underground'],['guerrilla_deploy'],['regeneration'],['daemonic_instability']])assert(validateUnits([{...u,attributes}],factions).some(i=>i.field.startsWith('attributes')));
  assert.deepEqual(validateUnits([{...u,attributes:[]}],factions),[]);
});

test('Production details show Korean traits and distinguish partial, unknown and proved-empty collections',()=>{
  const complete=production.find(u=>unitAttributeAdmission(u).status==='COMPLETE'&&u.attributes?.includes('causes_fear'));
  const partial=production.find(u=>unitAttributeAdmission(u).status==='PARTIAL'&&u.attributes?.length);
  const unknown=production.find(u=>u.attributes===undefined),empty=production.find(u=>u.attributes?.length===0);
  assert(render(complete).includes('공포 유발'));assert(render(complete).includes(projection.sourceHash));
  assert(!render(complete).includes('추가 특성은 미확인'));
  assert(render(partial).includes('추가 특성은 미확인'));
  assert(render(unknown).includes('특성 미확인'));assert(render(unknown).includes('추가 특성은 미확인'));
  assert(render(empty).includes('검토된 기본 특성 없음'));assert(!render(empty).includes('추가 특성은 미확인'));
  for(const u of [complete,partial,unknown,empty])for(const key of ['guerrilla_deploy','squig','gorger'])assert(!render(u).includes(`<li>${key}</li>`));
});
