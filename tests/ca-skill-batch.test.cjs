const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync:read,existsSync}=require('node:fs');
const {createHash}=require('node:crypto');
const React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {comparisonUnit}=require('../.test-build/src/repositories/productionUnitSelection.js');
const {skillsForUnit,skillModifiers,calculateWithSkills:calculate,calculatorSourceLabel}=require('../.test-build/src/domain/caSkillEffect.js');
const {calculateResearchAndManual}=require('../.test-build/src/domain/caResearchEffect.js');
const {wikiRepository:wiki}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const dir='tools/wh3-importer/skill-batch-01/',json=p=>JSON.parse(read(p)),bytes=read(dir+'source.json'),source=JSON.parse(bytes);
const unitsBytes=read('src/data/units.json'),manifest=json(dir+'manifest.json'),report=json(dir+'review.json'),projection=json('src/data/caSkillBatch01.json');
const hash=b=>createHash('sha256').update(b).digest('hex'),api=import('../tools/wh3-importer/skill-batch-01/review.mjs');
const foot=comparisonUnit('ca_unit_wh_dlc07_brt_inf_foot_squires_0'),knight=comparisonUnit('ca_unit_wh_main_brt_cav_knights_of_the_realm'),peasant=comparisonUnit('ca_unit_wh_dlc07_brt_peasant_mob_0');
const choice={skillKey:projection.skillKey,ownerKey:projection.owner.key,rank:1},active=[choice];
const near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);

test('seven exact Skill inventory/owner/rank/effect/scope/target classification replays without broad classification rules',async()=>{
 const {keys,admitBatch,serialize}=await api,r=admitBatch(bytes,unitsBytes,manifest);
 assert.deepEqual(r,admitBatch(bytes,unitsBytes,manifest));assert.deepEqual(r.review,report);
 assert.deepEqual(r.admission,json(dir+'admission.json'));assert.deepEqual(r.projection,projection);
 for(const [name,value] of Object.entries(r))assert.equal(hash(serialize(value)),manifest.outputs[name+'.json']);
 assert.deepEqual(report.skills.map(s=>s.skillKey),keys);assert.deepEqual(report.skills.map(s=>[s.maxRank,s.owners.length]),[[1,1],[1,1],[3,8],[1,8],[1,14],[1,1],[1,1]]);
 assert.deepEqual(report.summary,{skills:7,rankEffectRows:15,skillStatuses:{DIRECT_SUPPORTED:2,NON_UNIT_STAT:1,REVIEW_REQUIRED:2,SUPPORTED_WITH_LIMITATION:1,UNSUPPORTED:1},effectStatuses:{DIRECT_SUPPORTED:6,NON_UNIT_STAT:2,REVIEW_REQUIRED:6,UNSUPPORTED:1}});
 assert.deepEqual(report.scopeInventory.map(s=>[s.record.key,s.occurrences,s.sameAsFirstSlice]),[['character_to_character_own',2,false],['general_to_force_own',13,true]]);
 assert(report.skills.flatMap(s=>s.owners).every(o=>o.joins.length===7&&o.enabled));
});

test('multi-rank raw levels change effect set; neither replacement nor incremental hypothesis is silently selected/admitted',()=>{
 const low=report.skills[2],cmp=report.multiRankComparison;
 assert.equal(low.rankSemantics,'UNKNOWN_REPLACEMENT_VS_INCREMENTAL');assert.equal(low.rankSetShape,'MIXED_EFFECT_SET');
 assert.deepEqual(low.ranks.map(r=>[r.rank,r.effectRowIds.length]),[[1,1],[2,2],[3,2]]);
 assert.deepEqual(low.effects.map(e=>[e.rank,e.rawValue,e.status]),[[1,4,'REVIEW_REQUIRED'],[2,4,'REVIEW_REQUIRED'],[2,4,'REVIEW_REQUIRED'],[3,6,'REVIEW_REQUIRED'],[3,6,'REVIEW_REQUIRED']]);
 assert.equal(cmp.applicationSemantics,'UNKNOWN');assert.deepEqual(Object.values(cmp.hypotheses[2].replacement),[6,6]);assert.deepEqual(Object.values(cmp.hypotheses[2].incremental),[14,10]);
 assert(low.effects.every(e=>e.targets.every(t=>t.kind==='EXPLICIT_MAIN_MEMBERSHIP')));
 assert.equal(projection.maxRank,1);assert(!JSON.stringify(projection).includes(low.skillKey));
 assert(source.schemas.find(s=>s.table==='character_skill_level_to_effects_junctions_tables').fields.filter(f=>['level','value'].includes(f.name)).every(f=>f.description===''));
});

test('generic Lord, Paladin Hero, shared owners and character-self scope remain distinct from Unit applicability',()=>{
 const generic=report.skills[2].owners.find(o=>o.key==='wh_main_brt_lord');assert.equal(generic.characterType,'generic_lord');assert.equal(generic.agentType,'general');
 const paladin=report.skills[5].owners[0];assert.equal(paladin.key,'wh_main_brt_paladin');assert.equal(paladin.characterType,'generic_hero');assert.equal(paladin.agentType,'champion');
 const lady=report.skills[4];assert(lady.owners.some(o=>o.key==='wh_main_brt_paladin'));assert(lady.owners.some(o=>o.key==='wh_main_brt_lord'));
 assert(lady.owners.some(o=>o.key==='wh2_dlc11_cst_ghost_paladin'),'Shared record crosses faction labels; no name-based roster restriction');
 assert.equal(lady.effects[0].scope.target,'character');assert.equal(lady.effects[0].status,'REVIEW_REQUIRED');
 assert.equal(lady.effects[0].targets[0].kind,'CLASS_SELECTOR');assert.equal(lady.effects[0].targets[0].selectors.length,18);
 assert.equal(report.skills[3].effects[0].targets[0].setKey,'all_units');assert.equal(report.skills[3].effects[0].targets[0].kind,'CLASS_SELECTOR');
 assert.equal(report.skills[5].effects[0].relations.length,0);assert.equal(report.skills[5].status,'NON_UNIT_STAT');
 const fount=report.skills[6];assert.equal(fount.status,'SUPPORTED_WITH_LIMITATION');assert.deepEqual(fount.effects.map(e=>e.status),['NON_UNIT_STAT','DIRECT_SUPPORTED']);
 assert.deepEqual(fount.effects[1].mappingCandidates.map(m=>[m.stat,m.operation,m.value]),[['campaign.upkeep','multiply',-25]]);
});

test('only exact single-rank Aspiring Knights admitted: three effect keys, four existing paths, one Production target and explicit RoR omission',()=>{
 const admission=json(dir+'admission.json');assert.deepEqual(admission.admittedSkills,[projection.skillKey]);assert.equal(admission.deferredSkills.length,5);
 assert.deepEqual(admission.admittedTargets,[{unitId:foot.id,mainKey:'wh_dlc07_brt_inf_foot_squires_0',landKey:'wh_dlc07_brt_inf_foot_squires_0'}]);
 assert.deepEqual(projection.modifiers.map(m=>[m.stat,m.operation,m.value]),[['defense.leadership','add',5],['melee.meleeAttack','add',8],['melee.damage.armorPiercing','multiply',12],['melee.damage.base','multiply',12]]);
 assert.equal(projection.owner.key,'wh_dlc07_brt_alberic');assert.equal(projection.sourceKind,'CA_SKILL');
 assert.equal(skillsForUnit(foot).length,1);assert.equal(skillsForUnit(knight)[0].name,'Champions of Bordeleaux');assert.equal(skillsForUnit(peasant).length,0);
 assert.throws(()=>skillModifiers(knight,active));assert.throws(()=>skillModifiers(peasant,active));
 for(const rank of [-1,0,2,3,1.5,NaN])assert.throws(()=>skillModifiers(foot,[{...choice,rank}]));
 for(const change of [{ownerKey:'wh_main_brt_lord'},{ownerKey:'wh_main_brt_louen_leoncouer'},{skillKey:report.skills[2].skillKey},{skillKey:report.skills[6].skillKey}])assert.throws(()=>skillModifiers(foot,[{...choice,...change}]));
 assert.throws(()=>skillModifiers(foot,[choice,choice]));assert.throws(()=>skillModifiers({...foot,gameVersion:'wrong'},active));
 assert.equal(new Set(skillModifiers(foot,active).map(m=>m.id)).size,4);
 assert(skillModifiers(foot,active).every(m=>m.conditions.ownerKey===choice.ownerKey&&m.scope==='lord_army'));
});

test('each admitted identity/rank/raw/scope/target/schema/pack/snapshot/digest mutation fails closed, including refreshed fake source hashes',async()=>{
 const {admitBatch}=await api;
 const edits=[['character_skills_tables','key','wrong'],['character_skill_level_to_effects_junctions_tables','level',0],['character_skill_level_to_effects_junctions_tables','level',2],['character_skill_level_to_effects_junctions_tables','effect_key','wrong'],['character_skill_level_to_effects_junctions_tables','value',999],['character_skill_level_to_effects_junctions_tables','effect_scope','wrong'],['character_skill_node_sets_tables','agent_subtype_key','wrong'],['main_units_tables','land_unit','wrong'],['unit_set_to_unit_junctions_tables','unit_record','wrong'],['unit_set_to_unit_junctions_tables','exclude',true]];
 for(const [table,field,value] of edits){const changed=structuredClone(source),r=changed.rows.find(r=>r.table===table&&JSON.stringify(r.row).includes('foot_squires'))??changed.rows.find(r=>r.table===table);r.row[field]=value;const b=Buffer.from(JSON.stringify(changed));assert.throws(()=>admitBatch(b,unitsBytes,manifest));assert.throws(()=>admitBatch(b,unitsBytes,{...manifest,sourceSha256:hash(b)}));}
 for(const mutate of [s=>s.relationships.pop(),s=>s.rows.push(structuredClone(s.rows[0])),s=>{s.schemas[0].fields[0].is_reference=['wrong','key']},s=>{s.provenance.packs[0].sha256='wrong'},s=>{s.provenance.schemaSha256='wrong'},s=>{s.provenance.gameVersion='wrong'},s=>{s.originalExtraction.sha256='wrong'}]){const s=structuredClone(source);mutate(s);assert.throws(()=>admitBatch(Buffer.from(JSON.stringify(s)),unitsBytes,manifest));}
 for(const field of ['sourceSha256','originalExtractionSha256','processedSchemasSha256','snapshotId','unitsSha256','baselineCommit'])assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,[field]:'wrong'}));
 assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,admittedSkills:[report.skills[2].skillKey]}));assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,admittedTargets:[{...manifest.admittedTargets[0],landKey:'wrong'}]}));
 for(const file of ['review.json','admission.json','projection.json'])assert.throws(()=>admitBatch(bytes,unitsBytes,{...manifest,outputs:{...manifest.outputs,[file]:'wrong'}}));
});

test('rank off/on restoration and same-stat Research + Skill + Manual retain original flat/percent engine rules',()=>{
 const research=['wh_dlc07_tech_brt_economy_industry_swords'],manual={id:'manual-base',stat:'melee.damage.base',operation:'add',value:'8'},before=JSON.stringify(foot);
 const skill=calculate(foot,[],[],active);assert.equal(skill.unit.defense.leadership,75);assert.equal(skill.unit.melee.meleeAttack,36);near(skill.unit.melee.damage.base,10.08);near(skill.unit.melee.damage.armorPiercing,29.12);
 const combined=calculate(foot,[],research,active);near(combined.unit.melee.damage.base,11.16);near(combined.unit.melee.damage.armorPiercing,32.24);
 const all=calculate(foot,[manual],research,active);near(all.unit.melee.damage.base,21.08);near(all.unit.melee.damage.armorPiercing,32.24);
 assert.equal(all.breakdown.find(b=>b.stat==='melee.damage.base').percent,24);assert.equal(all.modifiers.length,1);
 near(calculate(foot,[manual],[],active).unit.melee.damage.base,19.04);near(calculate(foot,[manual],research,[]).unit.melee.damage.base,19.04);
 near(calculate(foot,[manual],research,active).unit.melee.damage.base,21.08);assert.deepEqual(calculate(foot,[manual],research,[]),calculateResearchAndManual(foot,[manual],research));
 for(const b of all.breakdown)for(const m of b.modifiers)assert(calculatorSourceLabel(m.id,research,active).includes(m.id.startsWith('ca-skill:')?'CA_SKILL':m.id.startsWith('ca-research:')?'CA_RESEARCH':'MANUAL'));
 const unknown=structuredClone(foot);delete unknown.melee.damage.base;assert.equal(calculate(unknown,[manual],research,active).unit.melee.damage.base,undefined);
 const zero=structuredClone(foot);zero.melee.meleeAttack=0;assert.equal(calculate(zero,[],[],active).unit.melee.meleeAttack,8);assert.equal(JSON.stringify(foot),before);
 // Actual admitted skills have disjoint Unit targets. No synthetic double-skill stacking case.
 assert(!projection.targets.some(t=>json('src/data/caSkillEffect.json').targets.some(old=>old.unitId===t.unitId)));
});

test('Calculator shows admitted owner/rank only; deferred/self skills absent; personal Profiles/backups stay manual-only',async()=>{
 const render=u=>renderToString(React.createElement(MemoryRouter,{initialEntries:[`/calculator?unit=${u.id}`]},React.createElement(App)));
 const html=render(foot);for(const text of ['Aspiring Knights','Alberic de Bordeleaux','wh_dlc07_brt_alberic','CA_SKILL','0 · 비활성','1 · 활성'])assert(html.includes(text));
 assert(html.includes('기본 무기 피해 +12%'));assert(html.includes('관통 무기 피해 +12%'));
 for(const skill of report.skills.slice(2))assert(!html.includes(skill.skillKey));assert(!render(knight).includes('Aspiring Knights'));assert(!render(peasant).includes('Character Skills'));
 global.indexedDB=memoryIndexedDb();const calc=calculate(foot,[{id:'manual-ma',stat:'melee.meleeAttack',operation:'add',value:'8'}],[],active);
 const profile=await wiki.saveManualProfile({name:'Transient skill test',unitId:foot.id,modifiers:calc.modifiers});assert.deepEqual(profile.modifiers.map(m=>m.id),['manual-ma']);
 const backup=await wiki.exportBackup();assert(!JSON.stringify(backup).includes('ca-skill:'));await wiki.importBackup(backup);assert.deepEqual((await wiki.getManualProfile(profile.id)).modifiers,profile.modifiers);await wiki.deleteManualProfile(profile.id);
});

test('original Alberic evidence/projection, Research artifacts, Units101/Sample5/HP13/Speed81 and engine/personal data contracts stay pinned',()=>{
 for(const [p,h] of Object.entries(manifest.preservedFiles)){const b=read(p);assert.equal(hash(/\.(?:mjs|ts|tsx|ps1|md|css)$/.test(p)?b.toString().replace(/\r\n/g,'\n'):b),h,p);}
 for(const [p,pin] of Object.entries({...manifest.appFiles,...manifest.forwardFiles}))assert.equal(hash(read(p).toString().replace(/\r\n/g,'\n')),pin.after,p);
 const units=JSON.parse(unitsBytes),production=units.filter(u=>u.gameVersion!=='sample');assert.equal(production.length,101);assert.equal(units.length-production.length,5);assert.equal(production.filter(u=>u.entities?.totalHealth!==undefined).length,13);assert.equal(production.filter(u=>u.movement?.speed!==undefined).length,81);
 const old=json('src/data/caSkillEffect.json'),selected=[{skillKey:old.skillKey,ownerKey:old.owner.key,rank:1}],calc=calculate(knight,[],[],selected);assert.equal(calc.unit.defense.leadership,80);assert.equal(calc.unit.melee.damage.bonusVsLarge,27);
 const research=json('src/data/caResearchEffect.json');assert.deepEqual([research.technologies.length,research.effects.length,research.modifiers.length],[10,15,96]);
});

test('actual ignored RPFM extraction reproduces committed Skill batch source and original extraction hash',{skip:!existsSync('generated/wh3/skill-batch-01/raw.json')},async()=>{
 const {projectExtraction,serialize}=await api,raw=read('generated/wh3/skill-batch-01/raw.json');assert.equal(hash(raw),manifest.originalExtractionSha256);assert.equal(serialize(projectExtraction(raw)),bytes.toString());
});
