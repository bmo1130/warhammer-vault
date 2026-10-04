const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync:read}=require('node:fs');
const {createHash}=require('node:crypto');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {comparisonUnit}=require('../.test-build/src/repositories/productionUnitSelection.js');
const {skillsForUnit,skillModifiers,calculateWithSkills:calculate,calculatorSourceLabel}=require('../.test-build/src/domain/caSkillEffect.js');
const {calculateResearchAndManual,researchesForUnit}=require('../.test-build/src/domain/caResearchEffect.js');
const {wikiRepository:wiki}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const dir='tools/wh3-importer/skill-slice-01/',json=p=>JSON.parse(read(p)),sourceBytes=read(dir+'source.json'),source=JSON.parse(sourceBytes);
const manifest=json(dir+'manifest.json'),unitsBytes=read('src/data/units.json'),projection=json('src/data/caSkillEffect.json');
const knight=comparisonUnit('ca_unit_wh_main_brt_cav_knights_of_the_realm'),grail=comparisonUnit('ca_unit_wh_main_brt_cav_grail_knights'),peasant=comparisonUnit('ca_unit_wh_dlc07_brt_peasant_mob_0');
const choice={skillKey:projection.skillKey,ownerKey:projection.owner.key,rank:1},active=[choice];
const key=s=>'wh_dlc07_tech_brt_economy_'+s;
const hash=b=>createHash('sha256').update(b).digest('hex');
const row={id:'manual-leadership',stat:'defense.leadership',operation:'add',value:'8'};
const api=import('../tools/wh3-importer/skill-slice-01/review.mjs');

test('single actual skill, exact legendary Lord, level/scope/target and deterministic admission/projection replay',async()=>{
 const a=await api,r=a.admitSkill(sourceBytes,unitsBytes,manifest);
 assert.deepEqual(r,a.admitSkill(sourceBytes,unitsBytes,manifest));assert.deepEqual(r.review,json(dir+'review.json'));
 assert.deepEqual(r.admission,json(dir+'admission.json'));assert.deepEqual(r.projection,projection);
 assert.equal(r.review.name,'Champions of Bordeleaux');assert.equal(r.review.owner.key,'wh_dlc07_brt_alberic');
 assert.equal(r.review.owner.agentType,'general');assert.equal(r.review.owner.characterType,'legendary_lord');
 assert.equal(r.review.owner.cultureKey,'wh_main_brt_bretonnia');assert.equal(r.review.owner.factionKey,'wh_main_brt_bordeleaux');
 assert.deepEqual(r.review.rankTrace.levels,[1]);assert.equal(r.review.rankTrace.maxRank,1);assert.equal(r.review.rankTrace.junctionRowIds.length,2);
 assert.deepEqual(r.review.scopeTrace.record,{key:'general_to_force_own',location:'forcewide_when_commanding',ownership:'yours',source:'character',target:'force',territory:'any'});
 assert.equal(r.review.ownerTrace.length,12);assert(r.review.targetTrace.every(t=>t.joins.length===3));
 assert.deepEqual(projection.targets,[{unitId:knight.id,mainKey:'wh_main_brt_cav_knights_of_the_realm',landKey:'wh_main_brt_cav_knights_of_the_realm'}]);
 assert.equal(r.admission.omittedTargets.length,1);assert.equal(r.admission.omittedTargets[0].reason,'TARGET_NOT_IN_PRODUCTION');
 assert.deepEqual(projection.ranks[0].effects.map(e=>[e.stat,e.operation,e.rawValue,e.value]),[['melee.damage.bonusVsLarge','add',15,15],['defense.leadership','add',5,5]]);
 assert.equal(projection.sourceKind,'CA_SKILL');assert.equal(hash(sourceBytes),manifest.sourceSha256);
});

test('every source digest/identity/level/effect/value/scope/target/owner/schema/pack/snapshot drift requires review',async()=>{
 const {admitSkill}=await api;
 const mutateRow=(table,field,value)=>s=>{s.rows.find(r=>r.table===table).row[field]=value};
 const mutations=[mutateRow('character_skills_tables','key','wrong'),mutateRow('character_skill_level_to_effects_junctions_tables','level',2),
  mutateRow('character_skill_level_to_effects_junctions_tables','effect_key','wrong'),mutateRow('character_skill_level_to_effects_junctions_tables','value',999),
  mutateRow('character_skill_level_to_effects_junctions_tables','effect_scope','faction_to_force_own_unseen'),
  mutateRow('unit_set_to_unit_junctions_tables','exclude',true),mutateRow('unit_set_to_unit_junctions_tables','unit_record',peasant.id),
  mutateRow('character_skill_node_sets_tables','agent_subtype_key','wh_main_brt_louen_leoncouer'),
  mutateRow('main_units_tables','land_unit','wrong'),
  s=>{s.schemas.find(s=>s.table==='character_skill_level_to_effects_junctions_tables').fields.find(f=>f.name==='effect_key').is_reference=['wrong','key']},
  s=>{s.provenance.packs[0].sha256='wrong'},s=>{s.provenance.gameVersion='wrong'},s=>{s.provenance.schemaSha256='wrong'},
  s=>{s.originalExtraction.sha256='wrong'},s=>s.relationships.pop(),s=>s.rows.push(structuredClone(s.rows[0]))];
 for(const mutate of mutations){const changed=structuredClone(source);mutate(changed);assert.throws(()=>admitSkill(Buffer.from(JSON.stringify(changed)),unitsBytes,manifest));}
 for(const field of ['sourceSha256','originalExtractionSha256','processedSchemasSha256','skillKey','ownerKey','snapshotId','unitsSha256','baselineCommit'])assert.throws(()=>admitSkill(sourceBytes,unitsBytes,{...manifest,[field]:'wrong'}));
 for(const field of ['review.json','admission.json','projection.json'])assert.throws(()=>admitSkill(sourceBytes,unitsBytes,{...manifest,outputs:{...manifest.outputs,[field]:'wrong'}}));
 // Refreshing a mutated byte checksum cannot bypass the pinned reviewed slice.
 const changed=structuredClone(source);changed.rows[0].row.key='wrong';const bytes=Buffer.from(JSON.stringify(changed));
 assert.throws(()=>admitSkill(bytes,unitsBytes,{...manifest,sourceSha256:hash(bytes)}));
});

test('semantic review refuses rehashed rank/owner/membership/scope/bonus conflicts, beyond the outer byte gate',async()=>{
 const {reviewSkill}=await api;
 const edit=(s,table,field,value)=>{const r=s.rows.find(r=>r.table===table),old=r.id;r.row[field]=value;
  r.id=`${r.table}:${hash(JSON.stringify([r.sourcePack,r.path,r.key,r.row])).slice(0,20)}`;
  for(const j of s.relationships){if(j.from===old)j.from=r.id;if(j.to===old)j.to=r.id;}};
 for(const [table,field,value] of [
  ['character_skill_level_to_effects_junctions_tables','level',0],['character_skill_level_to_effects_junctions_tables','level',2],
  ['character_skill_level_to_effects_junctions_tables','value',999],['unit_set_to_unit_junctions_tables','exclude',true],
  ['unit_sets_tables','use_unit_exp_level_range',true],['character_skill_node_set_items_tables','mod_disabled',true],
  ['agent_subtypes_tables','recruitable',false],['character_skill_node_sets_tables','agent_subtype_key','generic'],
  ['campaign_effect_scopes_tables','location','factionwide'],['effect_bonus_value_ids_unit_sets_tables','bonus_value_id','wrong']]){
   const changed=structuredClone(source);edit(changed,table,field,value);assert.throws(()=>reviewSkill(changed),undefined,`${table}.${field}`);
 }
 const duplicate=structuredClone(source);duplicate.rows.push(structuredClone(duplicate.rows.find(r=>r.table==='character_skill_level_to_effects_junctions_tables')));
 duplicate.rows.at(-1).row.value=999;
 assert.throws(()=>reviewSkill(duplicate),/Duplicate/);
});

test('app owner/rank selection is exact: inactive 0 is absence, no invalid CA rank, wrong owner/skill/unit/version or duplicates',()=>{
 assert.equal(skillsForUnit(knight).length,1);assert.equal(skillsForUnit(grail).length,0);assert.equal(skillsForUnit(peasant).length,0);
 for(const rank of [-1,0,2,1.5,NaN])assert.throws(()=>skillModifiers(knight,[{...choice,rank}]));
 assert.throws(()=>skillModifiers(knight,[{...choice,ownerKey:'wh_main_brt_louen_leoncouer'}]));
 assert.throws(()=>skillModifiers(knight,[{...choice,skillKey:'wrong'}]));assert.throws(()=>skillModifiers(knight,[choice,choice]));
 assert.throws(()=>skillModifiers(peasant,active));assert.throws(()=>skillModifiers({...knight,gameVersion:'wrong'},active));
 const modifiers=skillModifiers(knight,active);assert.equal(modifiers.length,2);
 for(const m of modifiers){assert.equal(m.sourceType,'lord_skill');assert.equal(m.scope,'lord_army');assert(m.source.startsWith('CA_SKILL'));
  assert.equal(m.conditions.ownerKey,choice.ownerKey);assert.equal(m.conditions.commandingOwnForce,true);assert(m.id.includes(choice.ownerKey)&&m.id.includes(knight.id.slice(8)));}
 const before=JSON.stringify(projection);modifiers[0].value=999;assert.equal(JSON.stringify(projection),before);
});

test('Research + Skill + Manual use same-stat sums and existing engine; inactive returns identical existing result',()=>{
 const before=JSON.stringify(knight),research=[key('farm_hoods')];
 assert.equal(calculate(knight,[],[],active).unit.defense.leadership,80);assert.equal(calculate(knight,[],[],active).unit.melee.damage.bonusVsLarge,27);
 const combined=calculate(knight,[],research,active);assert.equal(combined.unit.defense.leadership,85);
 assert.equal(combined.breakdown.find(b=>b.stat==='defense.leadership').flat,10);
 const all=calculate(knight,[row],research,active);assert.equal(all.unit.defense.leadership,93);
 assert.equal(all.breakdown.find(b=>b.stat==='defense.leadership').flat,18);assert.equal(all.modifiers.length,1);
 assert.equal(calculate(knight,[row],[],active).unit.defense.leadership,88);
 assert.equal(calculate(knight,[row],research,[]).unit.defense.leadership,88);
 assert.deepEqual(calculate(knight,[row],research,[]),calculateResearchAndManual(knight,[row],research));
 assert.deepEqual(calculate(knight,[],[],[]),calculateResearchAndManual(knight,[],[]));
 for(const b of all.breakdown)for(const m of b.modifiers){const label=calculatorSourceLabel(m.id,research,active);assert(label.includes(m.id.startsWith('ca-skill:')?'CA_SKILL':m.id.startsWith('ca-research:')?'CA_RESEARCH':'MANUAL'));}
 assert.equal(JSON.stringify(knight),before);
 // Unknown remains unknown; actual zero is still modified numerically.
 const unknown=structuredClone(knight);delete unknown.defense.leadership;delete unknown.melee.damage.bonusVsLarge;
 const missing=calculate(unknown,[row],research,active);assert.equal(missing.unit.defense.leadership,undefined);assert.equal(missing.unit.melee.damage.bonusVsLarge,undefined);
 const zero=structuredClone(knight);zero.defense.leadership=0;zero.melee.damage.bonusVsLarge=0;
 assert.equal(calculate(zero,[],[],active).unit.defense.leadership,5);assert.equal(calculate(zero,[],[],active).unit.melee.damage.bonusVsLarge,15);
 assert(calculate(knight,[],research,[{...choice,rank:2}]).error);
 const old=['industry_tournaments','farm_hoods','industry_swords'].map(key);
 assert.deepEqual(calculate(grail,[{...row,stat:'melee.meleeAttack'}],old,[]),calculateResearchAndManual(grail,[{...row,stat:'melee.meleeAttack'}],old));
});

test('read-only owner/rank Skill section only on exact applicable Unit, Profiles/backups retain manual-only data',async()=>{
 const render=u=>renderToString(React.createElement(MemoryRouter,{initialEntries:[`/calculator?unit=${u.id}`]},React.createElement(App)));
 const html=render(knight);for(const text of ['Character Skills','Champions of Bordeleaux','Alberic de Bordeleaux','wh_dlc07_brt_alberic','CA_SKILL','0 · 비활성','1 · 활성'])assert(html.includes(text));
 assert(!render(grail).includes('Character Skills'));assert(!render(peasant).includes('Champions of Bordeleaux'));
 global.indexedDB=memoryIndexedDb();const result=calculate(knight,[row],[key('farm_hoods')],active);
 const saved=await wiki.saveManualProfile({name:'Skill transient',unitId:knight.id,modifiers:result.modifiers});
 assert.deepEqual(saved.modifiers.map(m=>m.id),[row.id]);const backup=await wiki.exportBackup();
 assert(!JSON.stringify(backup).includes('ca-skill:'));assert(!JSON.stringify(backup).includes('ca-research:'));
 await wiki.importBackup(backup);assert.deepEqual((await wiki.getManualProfile(saved.id)).modifiers,saved.modifiers);
 await wiki.deleteManualProfile(saved.id);assert.equal((await wiki.listManualProfiles()).profiles.length,0);
});

test('Research 10/15/96, Production 101/Sample5/HP13/Speed81 and all prior admission/engine/schema/evidence bytes preserved',()=>{
 const baseline=JSON.parse(read('tools/wh3-importer/research-mapping-review-01/manifest.json'));
 const researchManifest=json('tools/wh3-importer/research-admission-batch-01/manifest.json');
 assert.equal(hash(read('src/data/caResearchEffect.json')),researchManifest.outputs['projection.json']);
 const p=json('src/data/caResearchEffect.json');assert.deepEqual([p.technologies.length,p.effects.length,p.modifiers.length],[10,15,96]);
 for(const [path,expected] of Object.entries(baseline.protectedFiles).filter(([path])=>!path.includes('caResearch')&&!path.endsWith('CalculatorPage.tsx')&&!path.endsWith('style.css'))){
  const bytes=read(path);assert.equal(hash(/\.(?:mjs|ts|tsx|ps1|md)$/.test(path)?bytes.toString().replace(/\r\n/g,'\n'):bytes),expected,path);
 }
 const units=JSON.parse(unitsBytes),production=units.filter(u=>u.gameVersion!=='sample');
 assert.equal(production.length,101);assert.equal(units.length-production.length,5);
 assert.equal(production.filter(u=>u.entities?.totalHealth!==undefined).length,13);
 assert.equal(production.filter(u=>u.movement?.speed!==undefined).length,81);
 assert.equal(hash(unitsBytes),'da22d7eb4d6af13856274e3f81fe18c789ed6588b6e0c956cbf97583f1350dc1');
 assert.equal(researchesForUnit(grail).length,4);
});
