const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync:read,existsSync}=require('node:fs'),{createHash}=require('node:crypto');
const React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {comparisonUnit}=require('../.test-build/src/repositories/productionUnitSelection.js');
const {skillsForUnit,skillModifiers,calculateWithSkills:calculate,calculatorSourceLabel}=require('../.test-build/src/domain/caSkillEffect.js');
const {calculateResearchAndManual}=require('../.test-build/src/domain/caResearchEffect.js');
const {wikiRepository:wiki}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const dir='tools/wh3-importer/skill-batch-02/',json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=read(dir+'source.json'),source=JSON.parse(bytes),unitsBytes=read('src/data/units.json'),manifest=json(dir+'manifest.json'),projection=json('src/data/caSkillBatch02.json'),report=json(dir+'review.json');
const api=import('../tools/wh3-importer/skill-batch-02/review.mjs');
const pilgrim=comparisonUnit('ca_unit_wh_dlc07_brt_inf_battle_pilgrims_0'),knight=comparisonUnit('ca_unit_wh_main_brt_cav_knights_of_the_realm'),foot=comparisonUnit('ca_unit_wh_dlc07_brt_inf_foot_squires_0'),peasant=comparisonUnit('ca_unit_wh_dlc07_brt_peasant_mob_0');
const choice={skillKey:projection.skillKey,ownerKey:projection.owner.key,rank:1},active=[choice],near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);

test('twelve bounded exact skill owner/rank/scope/target/effect reviews and one admission replay deterministically',async()=>{
 const {admitBatch,serialize,keys}=await api,r=admitBatch(bytes,unitsBytes,manifest);
 assert.deepEqual(r,admitBatch(bytes,unitsBytes,manifest));assert.deepEqual(r.review,report);assert.deepEqual(r.admission,json(dir+'admission.json'));assert.deepEqual(r.projection,projection);
 for(const [k,v] of Object.entries(r))assert.equal(sha(serialize(v)),manifest.outputs[k+'.json']);
 assert.deepEqual(report.skills.map(s=>s.skillKey),keys);assert.deepEqual(json(dir+'selection.json').skills.map(s=>s.key),keys);
 assert.equal(sha(read(dir+'selection.json')),manifest.selectionSha256);
 assert.equal(report.skills.length,12);assert(report.skills.every(s=>s.maxRank===1&&s.ranks.length===1));
 assert.deepEqual(report.summary.skillStatuses,{DIRECT_SUPPORTED:1,NON_UNIT_STAT:5,REVIEW_REQUIRED:3,SUPPORTED_WITH_LIMITATION:2,UNSUPPORTED:1});
 assert.deepEqual(report.skills.map(s=>s.owners.length),[1,1,1,1,1,1,1,1,1,1,8,8]);
 assert(report.skills.flatMap(s=>s.owners).every(o=>o.joins.length===7));
 assert.equal(report.skills[4].owners[0].key,'wh_dlc07_brt_fay_enchantress');
 assert.equal(report.skills[4].effects[0].scope.key,'general_to_force_own');
 assert(report.skills.slice(0,4).flatMap(s=>s.effects).every(e=>e.scope.key!=='general_to_force_own'));
 assert(report.skills[8].effects.some(e=>e.targets.some(t=>t.kind==='CLASS_SELECTOR')));
 assert.equal(report.skills[6].status,'UNSUPPORTED');assert.equal(report.skills[5].effects[0].candidateStat,'defense.resistances.spell');
});

test('actual same-owner overlap is retained but unreviewed resistance operation never produces a fabricated multiple-Skill stack',()=>{
 const a=report.skills[4],b=report.skills[5];assert.equal(a.owners[0].key,b.owners[0].key);
 assert.deepEqual(a.effects[0].targets.map(t=>t.members.map(m=>m.mainKey)),b.effects[0].targets.map(t=>t.members.map(m=>m.mainKey)));
 assert.equal(a.effects[0].mappingCandidates[0].operation,'multiply');assert.deepEqual(b.effects[0].mappingCandidates,[]);
 assert.equal(b.status,'REVIEW_REQUIRED');assert.equal(report.overlap.status,'NO VERIFIED MULTI-SKILL TARGET');
 assert.deepEqual(json(dir+'admission.json').admittedSkills,[a.skillKey]);assert(!JSON.stringify(projection).includes(b.skillKey));
 assert.throws(()=>skillModifiers(pilgrim,[{...choice,skillKey:b.skillKey}]));
 for(const u of JSON.parse(unitsBytes).filter(u=>u.gameVersion!=='sample'))assert(skillsForUnit(u).length<=1);
});

test('only one exact Production target receives reviewed charge percentage; wrong owners/ranks/names/non-Production targets fail closed',()=>{
 assert.equal(projection.sourceKind,'CA_SKILL');assert.equal(projection.modifiers.length,1);assert.deepEqual(projection.targets,[{unitId:pilgrim.id,mainKey:'wh_dlc07_brt_inf_battle_pilgrims_0',landKey:'wh_dlc07_brt_inf_battle_pilgrims_0'}]);
 assert.deepEqual(projection.modifiers.map(m=>[m.stat,m.operation,m.value]),[['melee.chargeBonus','multiply',30]]);
 assert.equal(projection.owner.key,'wh_dlc07_brt_fay_enchantress');assert.equal(projection.scope.key,'general_to_force_own');
 assert.equal(skillsForUnit(pilgrim)[0].name,'Blessed Water');assert.equal(skillsForUnit(foot)[0].name,'Aspiring Knights');assert.equal(skillsForUnit(knight)[0].name,'Champions of Bordeleaux');
 for(const u of [foot,knight,peasant,{...pilgrim,id:'ca_unit_wh_pro04_brt_inf_battle_pilgrims_ror_0'},{...pilgrim,id:'ca_unit_wh_dlc07_brt_inf_grail_reliquae_0'},{...pilgrim,id:'same-name-other-identity'},{...pilgrim,gameVersion:'wrong'}])assert.throws(()=>skillModifiers(u,active));
 for(const change of [{ownerKey:'wh_dlc07_brt_alberic'},{ownerKey:'wh_main_brt_lord'},...[-1,0,2,1.5,NaN].map(rank=>({rank}))])assert.throws(()=>skillModifiers(pilgrim,[{...choice,...change}]));
 assert.throws(()=>skillModifiers(pilgrim,[choice,choice]));assert.throws(()=>skillModifiers(pilgrim,[choice,{skillKey:report.skills[5].skillKey,ownerKey:choice.ownerKey,rank:1}]));
 assert.deepEqual(json(dir+'admission.json').omittedTargets.map(x=>x.mainKey),['wh_dlc07_brt_inf_grail_reliquae_0','wh_pro04_brt_inf_battle_pilgrims_ror_0']);
});

test('identity/owner/level/effect/value/scope/target/membership/pack/schema/snapshot/digest mutations refuse admission',async()=>{
 const {admitBatch,buildAdmission}=await api;
 const edits=[['character_skills_tables','key','wrong'],['character_skill_nodes_tables','character_skill_key','wrong'],['character_skill_node_sets_tables','agent_subtype_key','wrong'],['character_skill_level_to_effects_junctions_tables','level',2],['character_skill_level_to_effects_junctions_tables','effect_key','wrong'],['character_skill_level_to_effects_junctions_tables','value',20],['character_skill_level_to_effects_junctions_tables','effect_scope','character_to_character_own'],['unit_set_to_unit_junctions_tables','unit_record','wrong'],['unit_set_to_unit_junctions_tables','exclude',true],['unit_sets_tables','use_unit_exp_level_range',true],['main_units_tables','land_unit','wrong']];
 for(const [table,field,value] of edits){const s=structuredClone(source),row=s.rows.find(r=>r.table===table&&JSON.stringify(r.row).includes(table.includes('skill')?'blessed_water':'battle_pilgrims'))??s.rows.find(r=>r.table===table&&JSON.stringify(r.row).includes('fay_enchantress'));assert(row,table);row.row[field]=value;assert.throws(()=>admitBatch(Buffer.from(JSON.stringify(s)),unitsBytes,manifest));assert.throws(()=>buildAdmission(s,unitsBytes));}
 for(const mutate of [s=>s.rows.push(structuredClone(s.rows[0])),s=>s.relationships.pop(),s=>{s.schemas[0].fields[0].is_reference=['wrong','key']},s=>{s.provenance.packs[0].sha256='wrong'},s=>{s.provenance.schemaSha256='wrong'},s=>{s.provenance.gameVersion='wrong'},s=>{s.originalExtraction.sha256='wrong'}]){const s=structuredClone(source);mutate(s);assert.throws(()=>admitBatch(Buffer.from(JSON.stringify(s)),unitsBytes,manifest));}
 for(const k of ['baselineCommit','sourceSha256','originalExtractionSha256','processedSchemasSha256','snapshotId','unitsSha256'])assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,[k]:'wrong'}));
 assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,admittedSkills:[report.skills[5].skillKey]}));
 assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,admittedTargets:[{...manifest.admittedTargets[0],landKey:'wrong'}]}));
 for(const k of Object.keys(manifest.outputs))assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,outputs:{...manifest.outputs,[k]:'wrong'}}));
});

test('Blessed Water on/off + Research + Manual use existing arithmetic, source labels, unknown/zero and transient Profile contract',async()=>{
 const research=['wh_dlc07_tech_brt_economy_industry_swords','wh_dlc07_tech_brt_economy_other_fanaticism'],manual=[{id:'manual-charge',stat:'melee.chargeBonus',operation:'add',value:'2'}],before=JSON.stringify(pilgrim);
 assert.equal(calculate(pilgrim,[],[],[]).unit.melee.chargeBonus,18);near(calculate(pilgrim,[],[],active).unit.melee.chargeBonus,23.4);
 const all=calculate(pilgrim,manual,research,active);near(all.unit.melee.chargeBonus,26);near(all.unit.melee.damage.base,28);near(all.unit.melee.damage.armorPiercing,6.72);assert.equal(all.unit.melee.meleeAttack,37);assert.equal(all.unit.defense.meleeDefense,38);
 assert.deepEqual(calculate(pilgrim,manual,research,[]),calculateResearchAndManual(pilgrim,manual,research));assert.equal(calculate(pilgrim,manual,research,[]).unit.melee.chargeBonus,20);near(calculate(pilgrim,manual,research,active).unit.melee.chargeBonus,26);assert.equal(calculate(pilgrim,manual,[],[]).unit.melee.chargeBonus,20);
 for(const b of all.breakdown)for(const m of b.modifiers)assert(calculatorSourceLabel(m.id,research,active).includes(m.id.startsWith('ca-skill:')?'CA_SKILL':m.id.startsWith('ca-research:')?'CA_RESEARCH':'MANUAL'));
 const unknown=structuredClone(pilgrim);delete unknown.melee.chargeBonus;assert.equal(calculate(unknown,manual,research,active).unit.melee.chargeBonus,undefined);
 const zero=structuredClone(pilgrim);zero.melee.chargeBonus=0;assert.equal(calculate(zero,[],[],active).unit.melee.chargeBonus,0);assert.equal(JSON.stringify(pilgrim),before);
 global.indexedDB=memoryIndexedDb();const profile=await wiki.saveManualProfile({name:'Skill batch02 transient test',unitId:pilgrim.id,modifiers:all.modifiers});assert.deepEqual(profile.modifiers.map(m=>m.id),['manual-charge']);assert(!JSON.stringify(await wiki.exportBackup()).includes('ca-skill:'));await wiki.deleteManualProfile(profile.id);
});

test('Calculator shows only new approved exact owner/rank/percentage, deferred skills absent, historical app/data contracts pinned',async()=>{
 const render=u=>renderToString(React.createElement(MemoryRouter,{initialEntries:[`/calculator?unit=${u.id}`]},React.createElement(App)));
 const html=render(pilgrim);for(const text of ['Blessed Water','Fay Enchantress','wh_dlc07_brt_fay_enchantress','0 · 비활성','1 · 활성','돌격 보너스 +30%'])assert(html.includes(text),text);
 for(const s of report.skills.filter(s=>s.skillKey!==projection.skillKey))assert(!html.includes(s.skillKey));assert(!render(knight).includes('Blessed Water'));assert(!render(peasant).includes('Character Skills'));
 const {fileHash}=await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs');
 for(const [p,h] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(p,read(p)),h,p);
 for(const [p,pin] of Object.entries(manifest.appFiles))assert.equal(fileHash(p,read(p)),pin.after,p);
 const units=JSON.parse(unitsBytes),prod=units.filter(u=>u.gameVersion!=='sample');assert.deepEqual([prod.length,units.length-prod.length,prod.filter(u=>u.entities?.totalHealth!==undefined).length,prod.filter(u=>u.movement?.speed!==undefined).length],[101,5,13,81]);
 const original=json('src/data/caSkillEffect.json'),old=calculate(knight,[],[],[{skillKey:original.skillKey,ownerKey:original.owner.key,rank:1}]);assert.equal(old.unit.defense.leadership,80);assert.equal(old.unit.melee.damage.bonusVsLarge,27);
 const r=json('src/data/caResearchEffect.json');assert.deepEqual([r.technologies.length,r.effects.length,r.modifiers.length],[10,15,96]);
});

test('actual ignored CA extraction reproduces source and original hash without changing prior evidence',{skip:!existsSync('generated/wh3/skill-batch-02/raw.json')},async()=>{
 const {projectExtraction,serialize}=await api,raw=read('generated/wh3/skill-batch-02/raw.json');assert.equal(sha(raw),manifest.originalExtractionSha256);assert.equal(serialize(projectExtraction(raw)),bytes.toString());
});
