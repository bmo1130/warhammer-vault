const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {comparisonUnit}=require('../.test-build/src/repositories/productionUnitSelection.js');
const {skillsForUnit,skillModifiers,calculateWithSkills}=require('../.test-build/src/domain/caSkillEffect.js');
const dir='tools/wh3-importer/skill-production-bretonnia/',read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),manifest=json(dir+'manifest.json'),review=json(dir+'review.json');
const existing=['caSkillEffect','caSkillBatch01','caSkillBatch02'].map(p=>json(`src/data/${p}.json`));
const apis=Promise.all(['replay','source','scan','classify','admit','protected'].map(n=>import('../'+dir+n+'.mjs')));
const fixture=apis.then(([{replay}])=>replay(read(dir+'source.json'),read('src/data/units.json'),read(dir+'selection.json'),read(dir+'review.json'),existing,manifest));

test('full pipeline reconstructs every committed output without game, RPFM or generated input',async()=>{
 const r=await fixture;assert.equal(r.inventory.skills.length,226);assert.equal(r.report.totalSkillRanks,434);assert.equal(r.report.totalEffectJunctions,840);
 for(const [name,bytes] of Object.entries(r.outputs)){assert.equal(read(dir+name+'.json').toString(),bytes);assert.equal(sha(bytes),manifest.outputSha256[name]);}
 assert.deepEqual(r.report.effectClassifications,{DIRECT:10,LIMITED:2,NON_UNIT_STAT:739,REVIEW_REQUIRED:82,UNSUPPORTED:7});
 assert.deepEqual([r.report.singleRankSkills,r.report.multiRankSkills,r.report.zeroRankSkills],[140,80,6]);
});
test('exact culture/faction permission closure is deterministic and covers every Bretonnia character kind',async()=>{
 const r=await fixture,[,,{scan}]=await apis;const again=scan(r.source,json('src/data/units.json'));
 assert.deepEqual(again.inventory,r.inventory);assert.deepEqual(again.memberships,r.memberships);
 assert.equal(r.inventory.factionKeys.length,23);assert.equal(r.inventory.subtypes.length,14);
 assert.deepEqual(r.inventory.subtypes.reduce((o,s)=>(o[s.characterType]=(o[s.characterType]??0)+1,o),{}),{special_hero:2,legendary_lord:4,generic_hero:4,generic_lord:4});
 assert(r.inventory.subtypes.some(o=>o.key==='wh_dlc07_brt_green_knight'&&o.availability==='SPECIAL_RUNTIME_AVAILABILITY_UNKNOWN'));
});
test('owner sets are explicit subtype lists; foreign relations and special owners cannot enlarge allowlists',async()=>{
 const r=await fixture,s=r.inventory.skills.find(s=>s.key==='wh2_dlc11_skill_brt_army_buff_low_born_militia');assert.equal(s.ownerTaxonomy,'EXACT_OWNER_SET');assert.equal(s.ownerKeys.length,8);
 assert.deepEqual(s.safeOwnerKeys,s.ownerKeys);assert(!s.ownerKeys.includes('wh_main_brt_paladin'));
 assert(r.inventory.skills.some(s=>s.foreignOwners.length));assert.equal(r.report.foreignDirectOwnerSubtypes,554);
 for(const s of r.inventory.skills)for(const k of s.safeOwnerKeys)assert(r.inventory.subtypes.some(o=>o.key===k));
 for(const a of r.admission.skills)assert.equal(a.ownerKeys.length,1);
});
test('positive class/caste unions retain exact main and land aliases and cross-culture members',async()=>{
 const r=await fixture,inf=r.memberships.find(m=>m.key==='infantry_units'),all=r.memberships.find(m=>m.key==='all_units');
 assert.equal(inf.exactMembers.length,695);assert.equal(inf.productionMembers.length,66);assert.equal(inf.omittedNonProduction.length,629);assert.equal(inf.branchOverlapCount,4);
 assert(inf.productionMembers.some(m=>m.mainKey==='wh_main_emp_inf_swordsmen'));assert.equal(all.exactMembers.length,2802);assert.equal(all.productionMembers.length,101);assert.equal(all.mainLandAliases.length,176);
 assert.equal(all.landWithoutMain.length,4);assert.equal(all.navalOmissions.length,1);
 for(const m of all.productionMembers)for(const id of m.productionUnitIds)assert.equal(id,'ca_unit_'+m.mainKey);
 assert(!inf.exactMembers.some(m=>m.mainKey==='wh_main_brt_cav_knights_of_the_realm'));
});
test('RoR and spawn-only targets keep exact identities and never substitute Production base Units',async()=>{
 const r=await fixture,p=r.memberships.find(m=>m.key==='dlc07_brt_inf_battle_pilgrims');assert.equal(p.exactMembers.length,3);assert.equal(p.productionMembers.length,1);
 assert(p.exactMembers.some(m=>m.isRenown&&!m.productionUnitIds.length));
 const rors=r.memberships.filter(m=>m.key.endsWith('_ror'));assert.equal(rors.length,3);assert(rors.every(m=>m.exactMembers.length&&m.productionMembers.length===0));
});
test('conditional experience selectors remain unresolved and cannot project their unconditional RoR branch',async()=>{
 const r=await fixture,c=r.memberships.filter(m=>m.status==='UNRESOLVED_SELECTOR');assert.equal(c.length,4);assert(c.every(m=>m.definition.use_unit_exp_level_range&&m.productionMembers.length===0));
 assert.deepEqual(c.map(m=>m.sourceIdentityCandidates.length),[4,5,6,9]);assert(c.every(m=>m.identityUnresolvedCount===0&&!m.candidateIdentityIsEffectApplicability));
 const skills=r.classification.skills.filter(s=>s.effects.some(e=>e.blockers.includes('COMPLEX_OR_CONDITIONAL_SELECTOR')));assert.equal(skills.length,4);assert(skills.every(s=>!s.eligible));
});
test('multi-rank rejects even rank-one junctions; vow Skills with no junction rank are preserved separately',async()=>{
 const r=await fixture,s=r.classification.skills.find(s=>s.skillKey==='wh2_dlc11_skill_brt_army_buff_low_born_militia');assert(!s.eligible);assert(s.effects.some(e=>e.rank===1));assert(s.effects.every(e=>e.blockers.includes('MULTI_RANK_UNKNOWN')));
 assert.equal(r.classification.skills.filter(s=>s.blockers.includes('MULTI_RANK_UNKNOWN')).length,80);assert.equal(r.classification.skills.filter(s=>s.blockers.includes('NO_SOURCE_RANK')).length,6);
});
test('vigour and replenishment paths and flat AP/resistance operations fail closed',async()=>{
 const r=await fixture,es=r.classification.skills.flatMap(s=>s.effects);
 for(const b of ['UNSUPPORTED_VIGOUR_PATH','UNSUPPORTED_REPLENISHMENT_PATH','UNREVIEWED_FLAT_AP_OPERATION','UNREVIEWED_RESISTANCE_OPERATION']){const rows=es.filter(e=>e.blockers.includes(b));assert(rows.length);assert(rows.every(e=>!e.eligible));}
 const hero=r.classification.skills.find(s=>s.skillKey==='wh2_dlc14_skill_brt_repanse_the_peoples_hero');assert.equal(hero.directEffects,1);assert(!hero.eligible);
});
test('self/character, campaign mechanics and partial effects never appear in admission',async()=>{
 const r=await fixture;assert.equal(r.classification.partialAdmission.allowed,false);assert.equal(r.admission.heldDirectCandidates.length,3);
 assert(r.admission.skills.flatMap(s=>s.effects).every(e=>e.scopeKey==='general_to_force_own'&&e.classification==='DIRECT'&&e.rank===1));
 assert(r.admission.skills.every(s=>!s.omittedEffectJunctions.length));assert.equal(r.report.selfCharacterJunctions,596);
});
test('reviewed gate independently rejects forged DIRECT labels, new exact effects and partial policy changes',async()=>{
 const r=await fixture,[,,,,{admit}]=await apis,c=structuredClone(r.classification),s=c.skills.find(s=>s.skillKey==='wh2_dlc14_skill_brt_repanse_the_peoples_hero');
 s.eligible=true;s.classification='DIRECT';s.blockers=[];assert.throws(()=>admit(r.inventory,c,review,existing),/reviewed/);
 const changed=structuredClone(r.classification);changed.skills.find(s=>s.eligible).effects[0].mappings[0].operation='set';assert.throws(()=>admit(r.inventory,changed,review,existing),/candidate drift/);
 for(const change of [{rank:2},{scopeKey:'character_to_character_own'},{eligible:false},{blockers:['MULTI_RANK_UNKNOWN']}]){const drift=structuredClone(r.classification);Object.assign(drift.skills.find(s=>s.eligible).effects[0],change);assert.throws(()=>admit(r.inventory,drift,review,existing));}
 const partial=structuredClone(review);partial.partialAllowed=true;assert.throws(()=>admit(r.inventory,r.classification,partial,existing));
});
test('full admission equals existing Calculator data: six exact junctions, seven modifiers, three Units',async()=>{
 const r=await fixture;assert.equal(r.admission.skills.length,3);assert.equal(r.report.admission.effects,6);assert.equal(r.admission.modifierCount,7);assert.deepEqual(r.admission.newSkillKeys,[]);
 for(const p of existing){const a=r.admission.skills.find(s=>s.skillKey===p.skillKey);assert.deepEqual(a.targets,p.targets);assert.deepEqual([...a.modifiers].sort((a,b)=>a.id.localeCompare(b.id)),[...p.modifiers].sort((a,b)=>a.id.localeCompare(b.id)));}
 assert.equal(r.admission.overlapVerdict,'NO VERIFIED MULTI-SKILL TARGET');assert.deepEqual(r.admission.overlaps,[]);
});
test('Calculator on/off and exact owner, Unit and rank guards preserve transient selections',()=>{
 for(const p of existing){const u=comparisonUnit(p.targets[0].unitId),selected=[{skillKey:p.skillKey,ownerKey:p.owner.key,rank:1}];assert(skillsForUnit(u).some(s=>s.skillKey===p.skillKey));assert.equal(skillModifiers(u,selected).length,p.modifiers.length);
  assert.equal(calculateWithSkills(u,[],[],selected).error,'');assert.deepEqual(skillModifiers(u,[]),[]);
  for(const change of [{ownerKey:'wh_main_brt_louen_leoncouer'},{rank:2},{rank:1.5}])assert.throws(()=>skillModifiers(u,[{...selected[0],...change}]));
  assert.throws(()=>skillModifiers(comparisonUnit('ca_unit_wh_main_emp_inf_swordsmen'),selected));
 }
});
test('all 475 baseline files including Research, model, persistence and previous Skill evidence stay protected',async()=>{
 const [,,,,,{verifyProtected}]=await apis;verifyProtected(manifest,read);assert.equal(Object.keys(manifest.preservedFiles).length,475);
 assert.throws(()=>verifyProtected(manifest,p=>p==='src/data/units.json'?Buffer.from('[]'):read(p)),/Protected baseline drift/);
 assert(sha(read('src/data/caResearchEffect.json'))===manifest.preservedFiles['src/data/caResearchEffect.json']);
});
test('source payload/schema/reference drift and duplicate dictionary references fail closed',async()=>{
 const r=await fixture,[,{verifySource,decodeSource}]=await apis;assert.throws(()=>verifySource(Buffer.from(read(dir+'source.json').toString().replace('wh3-full-skill-source-compact-v1','changed')),manifest),/hash drift/);
 const compact=json(dir+'source.json');compact.rows.push(compact.rows[0]);assert.throws(()=>decodeSource(compact),/Duplicate row/);
 const s=structuredClone(r.source);s.schemas[0].fields[0].name='wrong';const {encodeSource}=await import('../'+dir+'source.mjs');const mutated=JSON.stringify(encodeSource(s));assert.throws(()=>verifySource(mutated,manifest),/hash drift/);
});
test('source primary-key collisions and ambiguous main/land identities are rejected before materialization',async()=>{
 const r=await fixture,{validateSource,materialize}=await import('../tools/wh3-importer/skill-class-selector-research/research.mjs'),s=structuredClone(r.source);
 const row=s.rows.find(r=>r.table==='main_units_tables');const collision=structuredClone(row);collision.row.num_men=999;collision.id=collision.table+':'+sha(JSON.stringify([collision.sourcePack,collision.path,collision.key,collision.row])).slice(0,20);s.rows.push(collision);
 assert.throws(()=>validateSource({...s,format:'wh3-skill-class-selector-source-v1'}),/collision/);
 const bad=structuredClone(r.source),land=bad.rows.find(r=>r.table==='land_units_tables'&&r.row.key==='wh_dlc07_brt_inf_battle_pilgrims_0');bad.rows.push(structuredClone(land));assert.throws(()=>materialize(bad,'dlc07_brt_inf_battle_pilgrims',json('src/data/units.json')),/identity/);
});
test('blocker priority measures marginal openings, preserving other blockers and whole-Skill policy',async()=>{
 const r=await fixture,b=r.report.nextBlocker;assert.equal(b.blocker,'MULTI_RANK_UNKNOWN');assert.deepEqual([b.affectedSkills,b.marginalSkills,b.marginalEffectJunctions,b.marginalDistinctEffects],[80,2,12,5]);
 assert(b.skillKeys.includes('wh2_dlc11_skill_brt_army_buff_low_born_militia'));assert(!b.skillKeys.includes('wh2_dlc11_skill_brt_army_buff_glorfinials_progeny'));
 assert(r.report.blockerRelief.filter(b=>b.blocker!=='MULTI_RANK_UNKNOWN').every(b=>b.marginalSkills===0&&b.marginalEffectJunctions===0));
});
