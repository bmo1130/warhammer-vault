const {withoutUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {withoutUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
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
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {applyUnitPassives,withoutUnitPassives,unitPassiveAdmission}=require('../.test-build/src/repositories/unitPassives.js');
const {getUnitPassiveAbilityLabel}=require('../.test-build/src/domain/unitLabels.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const json=p=>JSON.parse(readFileSync(p));
const raw=json('src/data/units.json'),source=json('tools/wh3-importer/unit-passives/source.json'),membership=json('tools/wh3-importer/unit-attributes/source.json');
const review=json('tools/wh3-importer/unit-passives/admission.json'),projection=json('src/data/unitPassiveAdmissions.json'),mappings=json('tools/wh3-importer/unit-passives/mappings.json');
const attributes=json('src/data/unitAttributeAdmissions.json'),production=game.listUnits().filter(u=>u.gameVersion!=='sample');
const render=u=>renderToString(React.createElement(Details,{unit:u}));

test('passive collections promote with proved-empty and partial states; every non-passive field and old passive ID remains exact',()=>{
  assert.equal(production.length,1110);assert.equal(raw.filter(u=>u.passiveAbilities!==undefined).length,5);
  assert.equal(production.filter(u=>u.passiveAbilities!==undefined).length,1105);
  assert.equal(production.filter(u=>u.passiveAbilities?.length).length,832);
  assert.equal(production.filter(u=>u.passiveAbilities?.length===0).length,273);
  assert.equal(production.filter(u=>u.passiveAbilities===undefined).length,5);
  assert.equal(review.summary.complete,1046);assert.equal(review.summary.partial,64);
  assert.equal(review.summary.canonicalPassives.length,252);
  assert.equal(review.summary.rawKeys,416);assert.equal(review.summary.passiveCandidates,264);assert.equal(review.summary.admittedRawKeys,254);assert.equal(review.summary.landGroups,1072);assert.equal(review.summary.junctions,2013);
  for(const baseline of raw){
    const current=game.getUnit(baseline.id),previous=applyUnitAttributes(localiseUnit(baseline));
    assert.deepEqual(withoutUnitSpeed(withoutUnitEntities(withoutUnitPassives(current))),previous,baseline.id);
    if(baseline.gameVersion==='sample'){assert.deepEqual(current,baseline);continue;}
    assert(/[가-힣]/.test(current.name));
    assert.deepEqual(current.passiveAbilities?.slice(0,baseline.passiveAbilities?.length??0),current.passiveAbilities===undefined?undefined:baseline.passiveAbilities??[]);
    assert.equal(new Set(current.passiveAbilities).size,current.passiveAbilities?.length??0);
    const admission=review.admissions.find(a=>a.id===current.id);
    for(const id of current.passiveAbilities??[])assert(admission.facts.some(f=>f.canonicalId===id));
  }
  assert.equal(production.filter(u=>u.attributes!==undefined).length,1107);
  assert.equal(attributes.admissions.filter(a=>a.status==='COMPLETE').length,849);
  assert.equal(attributes.admissions.filter(a=>a.status==='PARTIAL').length,261);
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
  assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
});

test('prior names, attributes, stats, roster, character aliases and all earlier admissions retain actual preceding commit bytes',()=>{
  for(const p of ['src/data/units.json','src/data/unitLocalisations.json','src/data/unitAttributeAdmissions.json','tools/wh3-importer/unit-attributes/source.json','tools/wh3-importer/unit-attributes/admission.json','tools/wh3-importer/unit-attributes/policy.mjs','src/data/factionRosters.json','src/data/characterAliases.json','src/data/legacyCharacters.json','src/data/factions.json','src/data/lords.json','src/data/heroes.json','src/data/unitSharedIdentities.json','src/data/unitHpAdmissions.json','src/data/unitSpeedAdmissions.json']){
    const old=spawnSync('git',['show',`a6cd508:${p}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
    assert.equal(readFileSync(p,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),p);
  }
});

test('ownership comes only from direct default land membership with agreeing native passive flags, not effect grants or prefixes',()=>{
  const definitions=new Map(membership.rows.filter(r=>r.table==='unit_abilities_tables').map(r=>[r.row.key,r]));
  const specials=new Map(source.rows.filter(r=>r.table==='unit_special_abilities_tables').map(r=>[r.row.key,r]));
  for(const a of review.admissions)for(const f of a.facts){
    const d=definitions.get(f.rawKey),s=specials.get(f.rawKey);
    assert.equal(d.row.source_type,'passive');assert.equal(s.row.passive,true);
    assert.equal(d.row.requires_effect_enabling,false);assert.equal(d.row.is_hidden_in_ui,false);
    assert.equal(f.kind,'DIRECT_LAND_UNIT_PASSIVE');assert(['*',''].includes(f.assignmentCulture));
    const j=membership.rows.find(r=>r.table==='land_units_to_unit_abilites_junctions_tables'&&r.row.land_unit===a.landKey&&r.row.ability===f.rawKey);
    assert(j&&f.sourceRowIds.includes(j.id));assert(f.sourceRowIds.includes(d.id)&&f.sourceRowIds.includes(s.id));
    assert(!f.sourceRowIds.some(id=>id.startsWith('effect_bonus_value_unit_ability_junctions_tables:')));
  }
  assert.equal(review.externalCampaignGrantRowIds.length,132);
  // A lord-named key is legitimately basic on these units; prefix heuristics
  // would destroy existing ownership. Unlock-only variant remains held.
  const knights=game.getUnit('ca_unit_wh_main_brt_cav_grail_knights');assert(knights.passiveAbilities.includes('blessing_of_the_lady'));
  assert(review.classifications.some(c=>c.key==='wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade'&&c.kind==='CAMPAIGN_UNLOCK'));
});

test('conditional passives preserve phases, attributes and flag references without claiming activation or computing effects',()=>{
  const c=id=>review.classifications.find(c=>c.canonicalId===id);
  assert.equal(c('frenzy').graph.activationStatus,'NOT_EVALUATED');
  assert(c('frenzy').graph.conditionReferences.some(r=>r.rawFlag==='morale_is_lower_than_half_of_base_morale'));
  assert(c('martial_prowess').graph.conditionReferences.some(r=>r.rawFlag==='health_below_25%'));
  assert(c('battle_harmony_yin').graph.conditionReferences.some(r=>r.rawFlag==='no_harmony_yang_in_proximity'));
  for(const id of ['realm_of_souls_tier_1','realm_of_souls_tier_2','realm_of_souls_tier_3','murderous_mastery','martial_mastery','regeneration'])assert(production.some(u=>u.passiveAbilities?.includes(id)));
  const regen=c('regeneration');assert(regen.graph.phaseKeys.includes('wh_main_unit_passive_regeneration'));
  const regenPhase=source.rows.find(r=>r.table==='special_ability_phases_tables'&&r.row.id===regen.graph.phaseKeys[0]);
  assert(regen.graph.sourceRowIds.includes(regenPhase.id));assert(Object.hasOwn(regenPhase.row,'hp_change_frequency'));
  const frenzyPhase=c('frenzy').graph.phaseKeys[0];
  assert(source.rows.filter(r=>r.table==='special_ability_phase_stat_effects_tables'&&r.row.phase===frenzyPhase).length>1);
  const carnage=review.classifications.find(c=>c.key==='wh3_dlc29_unit_passive_carnage');
  assert.equal(carnage.status,'ADMITTED');
  assert(!production.some(u=>u.attributes?.includes('rampage')));
  assert.equal(review.activationStatus,'NOT_EVALUATED');
});

test('Guardian aliases canonicalize with exact reference equivalence; equal names with distinct variants remain separate',async()=>{
  const {passiveSignature}=await import('../tools/wh3-importer/unit-passives/review.mjs');
  const family=review.aliasGroups[0];assert.equal(family.canonicalId,'guardian');assert.equal(family.rawKeys.length,3);
  for(const key of family.rawKeys){
    const c=review.classifications.find(c=>c.key===key);assert.equal(c.canonicalId,'guardian');assert.equal(c.name,'수호자');
    assert(review.admissions.some(a=>a.facts.some(f=>f.rawKey===key&&f.canonicalId==='guardian')));
  }
  assert.equal(new Set(family.rawKeys.map(k=>passiveSignature(source,membership,k))).size,1);
  const bad=structuredClone(source);bad.rows.find(r=>r.table==='unit_special_abilities_tables'&&r.row.key===family.rawKeys[0]).row.effect_range++;
  assert.notEqual(passiveSignature(bad,membership,family.rawKeys[0]),passiveSignature(source,membership,family.rawKeys[1]));
  const instability=review.classifications.filter(c=>c.englishName==='Daemonic Instability');
  assert.equal(instability.length,5);assert.equal(new Set(instability.map(c=>c.canonicalId)).size,5);
  const crumbling=review.classifications.filter(c=>c.englishName==='Crumbling');assert.equal(new Set(crumbling.map(c=>c.canonicalId)).size,3);
});

test('active, spell, bound and hidden/unlock/conflicting keys never enter the passive list or duplicate attributes',()=>{
  assert.deepEqual(review.summary.excludedByKind,{ACTIVE:104,ACTIVE_UNIT:3,BOUND:41,SPELL:2});
  assert.deepEqual(review.summary.heldByKind,{CAMPAIGN_UNLOCK:5,HIDDEN:5,TYPE_CONFLICT:2});
  const admitted=new Set(review.classifications.filter(c=>c.status==='ADMITTED').map(c=>c.key));
  for(const a of projection.admissions){
    assert(a.rawKeys.every(key=>admitted.has(key)));
    const u=game.getUnit(a.id);
    assert((u.passiveAbilities??[]).every(id=>!u.abilities?.includes(id)&&!u.attributes?.includes(id)&&!Object.hasOwn(attributes.labels,id)));
  }
  for(const [key,kind]of [['wh_dlc07_unit_formation_lance','ACTIVE'],['wh3_twa08_spell_bound_heart_of_winter_elemental_bear_ror','SPELL'],['wh3_main_mount_bound_celestial_comet','BOUND'],['wh2_main_faction_abilities_murderous_prowess_indicator','HIDDEN'],['wh3_dlc23_unit_passive_hellbound','CAMPAIGN_UNLOCK'],['wh3_dlc26_unit_abilities_blow_apart','TYPE_CONFLICT']]){
    assert(review.classifications.some(c=>c.key===key&&c.kind===kind));assert(!projection.admissions.some(a=>a.rawKeys.includes(key)));
  }
  assert.equal(review.summary.attributeOverlap,0);
});

test('offline replay rejects source/snapshot, schema, row, condition, mapping and ownership drift',async()=>{
  const {reviewUnitPassives,classifyPassive}=await import('../tools/wh3-importer/unit-passives/review.mjs');
  const {decodeSource}=await import('../tools/wh3-importer/expansion-batch-01/compact.mjs');
  const {rosterSourceHash}=await import('../tools/wh3-importer/production-growth/roster.mjs');
  const roster=decodeSource(json('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
  const run=(s=source,m=membership,u=raw,mp=mappings)=>reviewUnitPassives(s,m,roster,u,attributes,mp);
  assert.deepEqual(run(),{review,projection});
  for(const mutate of [s=>s.rows.pop(),s=>s.coverage[0].matchedRows++,s=>s.schemas[0].fields.pop(),s=>s.provenance.schemaSha256='wrong',s=>s.rows.find(r=>r.table==='special_ability_to_auto_deactivate_flags_tables').row.deactivate_flag='wrong',s=>s.localisations[0].row.text='guess']){
    const bad=structuredClone(source);mutate(bad);assert.throws(()=>run(bad),/source hash drift/);
  }
  const badMembership=structuredClone(membership);badMembership.rows.find(r=>r.table==='land_units_to_unit_abilites_junctions_tables').row.land_unit='foreign_lord_mount';assert.throws(()=>run(source,badMembership),/membership source hash drift/);
  const badMap=structuredClone(mappings);badMap.entries[0].canonicalId='guess';assert.throws(()=>run(source,membership,raw,badMap),/mapping hash drift/);
  assert.throws(()=>run(source,membership,raw.slice(1)),/Unit baseline drift/);
  const bad=structuredClone(source);bad.rows.find(r=>r.table==='unit_special_abilities_tables'&&r.row.key==='wh_main_unit_passive_frenzy').row.passive=false;
  assert.equal(classifyPassive(bad,membership,'wh_main_unit_passive_frenzy',mappings).kind,'TYPE_CONFLICT');
});

test('only exact passive projection can be stripped by the shared identity guard',()=>{
  for(const d of diagnostics.list()){
    const u=game.getUnit(d.id);assert.equal(createUnitCatalog([u],[d]).length,1);
    const stored=u.passiveAbilities??[],variants=[[...stored,'unproved']];
    if(stored.length)variants.push(stored.slice(1),[...stored,stored[0]]);
    if(stored.length>1)variants.push([...stored].reverse());
    for(const passiveAbilities of variants)assert.throws(()=>createUnitCatalog([{...u,passiveAbilities}],[d]),/collision/);
    for(const changed of [{...u,name:'wrong'},{...u,gameVersion:'wrong'},{...u,defense:{...u.defense,armor:99999}}])assert.throws(()=>createUnitCatalog([changed],[d]),/collision/);
    assert.throws(()=>applyUnitPassives({...raw.find(r=>r.id===u.id),passiveAbilities:['unproved']}),/identity drift/);
  }
});

test('validator keeps passive arrays distinct from active/attribute lists and rejects duplicates',()=>{
  const u=production[0],factions=game.listFactions().map(f=>f.id);
  for(const fields of [{passiveAbilities:['frenzy','frenzy']},{passiveAbilities:['lance']},{abilities:['same_id'],passiveAbilities:['same_id']},{attributes:['causes_fear'],passiveAbilities:['causes_fear']}])assert(validateUnits([{...u,...fields}],factions).some(i=>i.field.startsWith('passiveAbilities')));
  assert.deepEqual(validateUnits([{...u,passiveAbilities:[]}],factions),[]);
});

test('UI shows native Korean identity, canonical/source keys and ownership without asserting current activation',()=>{
  const u=production.find(u=>u.passiveAbilities?.includes('frenzy')),html=render(u);
  assert(html.includes('지속 능력'));assert(html.includes(getUnitPassiveAbilityLabel('frenzy')));assert(html.includes('title="frenzy"'));
  assert(html.includes('wh_main_unit_passive_frenzy'));assert(html.includes('보유가 항상 활성화됨을 뜻하지 않습니다'));assert(html.includes(projection.sourceHash));
  const partial=production.find(u=>unitPassiveAdmission(u).status==='PARTIAL'&&u.passiveAbilities?.length);
  const unknown=production.find(u=>u.passiveAbilities===undefined),empty=production.find(u=>u.passiveAbilities?.length===0);
  assert(render(partial).includes('추가 능력은 보류 중'));assert(render(unknown).includes('지속 능력 미확인'));assert(render(empty).includes('검토된 기본 지속 능력 없음'));
});

test('existing personal Unit article, bookmark and recent view backups retain the same IDs and Korean names',async()=>{
  global.indexedDB=memoryIndexedDb();
  const target={entityType:'unit',entityId:production.find(u=>u.passiveAbilities?.includes('frenzy')).id};
  const article={evaluation:'이전 개인 문서',tactics:'나의 조합',strengths:'',weaknesses:''};
  await wiki.saveArticle(target,article);await wiki.setBookmark(target,true);await wiki.recordView(target);
  const backup=await wiki.exportBackup();global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(backup));
  assert.equal((await wiki.getArticle(target)).evaluation,article.evaluation);assert(await wiki.hasBookmark(target));assert.equal((await wiki.listRecent())[0].entityId,target.entityId);
  assert(/[가-힣]/.test(game.getUnit(target.entityId).name));
});
