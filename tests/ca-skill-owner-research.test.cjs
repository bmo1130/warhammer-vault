const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync:read,existsSync}=require('node:fs'),{createHash}=require('node:crypto');
const dir='tools/wh3-importer/skill-owner-research/',json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=read(dir+'source.json'),source=JSON.parse(bytes),manifest=json(dir+'manifest.json'),report=json(dir+'report.json');
const prior=manifest.priorReviewPaths.map(json),api=import('../tools/wh3-importer/skill-owner-research/research.mjs');
const permissions=owner=>owner.factionPermissionRowIds.map(id=>report.factionPermissionProofs.find(p=>p.rowId===id));
const lords=['wh2_dlc14_brt_repanse','wh_dlc07_brt_alberic','wh_dlc07_brt_fay_enchantress','wh_dlc07_brt_prophetess_beasts','wh_dlc07_brt_prophetess_heavens','wh_dlc07_brt_prophetess_life','wh_main_brt_lord','wh_main_brt_louen_leoncouer'];

test('six exact owner research samples replay deterministically, without model changes or new admission',async()=>{
 const {replay,serialize,keys}=await api;assert.deepEqual(replay(bytes,manifest,prior),report);
 assert.equal(serialize(replay(bytes,manifest,prior)),serialize(replay(bytes,manifest,prior)));assert.equal(sha(serialize(report)),manifest.reportSha256);
 assert.deepEqual(report.skills.map(s=>s.key),keys);assert.deepEqual(json(dir+'selection.json').skills.map(s=>s.key),keys);
 assert.equal(report.finalVerdict,'B');assert.equal(report.modelChanged,false);assert.deepEqual(report.newAdmissions,[]);
 assert.deepEqual(report.skills.map(s=>s.owners.length),[8,8,8,14,1,8]);
 assert.equal(report.skills.flatMap(s=>s.owners).length,47);
 assert.deepEqual([report.taxonomyCounts.EXACT_SINGLE_OWNER,report.taxonomyCounts.EXACT_OWNER_SET],[1,5]);
});

test('generic and legendary owners use separate exact nodes and tree sets; no class, faction, prefix or inherited ownership',()=>{
 for(const skill of [...report.skills.slice(0,3),report.skills[5]]){
  assert.deepEqual(skill.ownerKeys,lords);assert.equal(new Set(skill.owners.map(o=>o.nodeKey)).size,8);assert.equal(new Set(skill.owners.map(o=>o.nodeSetKey)).size,8);
  assert(skill.owners.every(o=>o.joins.length===7&&o.treeEnabled&&o.dependenciesInThisTree&&o.flags.agent.playable&&o.flags.subtype.canGainXp));
  assert(skill.owners.some(o=>o.characterType==='generic_lord'));assert(skill.owners.some(o=>o.characterType==='legendary_lord'));
  assert(skill.owners.every(o=>o.alternateTreeSets.length===0));
 }
 assert.equal(report.taxonomyCounts.CHARACTER_CLASS_OWNER,0);assert.equal(report.taxonomyCounts['INHERITED/INDIRECT_OWNER'],0);
 assert(report.skills.every(s=>s.ownerKeys.every(k=>k&&!k.includes('*'))));
 assert(!report.skills[0].ownerKeys.includes('wh_main_brt_paladin'));
 assert(!report.skills[3].ownerKeys.includes('wh_dlc07_brt_fay_enchantress'));
 assert(!report.skills.some(s=>s.ownerKeys.includes('wh_main_emp_karl_franz')));
});

test('each owner independently resolves the same rank/effect/value/scope/typed target/membership signature; operation blockers remain separate',()=>{
 for(const skill of report.skills){assert(skill.sourceMeaningIdenticalAcrossOwners);assert.equal(new Set(skill.owners.map(o=>o.sourceMeaningSha256)).size,1);assert(skill.owners.every(o=>/^[a-f0-9]{64}$/.test(o.sourceMeaningSha256)));}
 assert(report.skills.slice(0,4).every(s=>s.sourceRankLevels.join()==='1'&&s.admission==='NOT_ADMITTED'&&s.blockers.length>0));
 assert.equal(report.skills[0].effectChains[0].scope.key,'character_to_character_own');
 assert.equal(report.skills[1].effectChains[0].scope.key,'character_to_character_own');
 assert.equal(report.skills[2].effectChains[0].scope.key,'general_to_force_own');
 assert.equal(report.skills[3].effectChains[0].scope.key,'character_to_character_own');
 assert(report.skills.slice(0,4).flatMap(s=>s.effectChains).every(e=>e.operationAssessment.mappingCandidates.length===0));
 assert.equal(report.skills[5].rankSemantics,'UNKNOWN');assert(report.skills[5].blockers.includes('MULTI_RANK_SEMANTICS_UNKNOWN'));
});

test('mixed Lord/Hero and cross-faction Lady mantle ownership is exact, with special acquisition and unlock explicitly unobserved',()=>{
 const s=report.skills[3];assert.equal(s.ownerKeys.length,14);
 for(const owner of ['wh2_dlc11_cst_ghost_paladin','wh2_dlc13_emp_hunter_rodrik_l_anguille','wh2_dlc14_brt_henri_le_massif']){
  const o=s.owners.find(o=>o.key===owner);assert(o);assert.equal(o.flags.subtype.showInUi,false);
  assert.equal(o.selectionAvailability,'SPECIAL_CHARACTER_ACQUISITION_NOT_OBSERVED');assert.equal(o.runtimeAvailability,'NOT_OBSERVED');
  assert.equal(o.characterType,owner==='wh2_dlc11_cst_ghost_paladin'?'generic_hero':'exact_hero_subtype');
 }
 assert(s.owners.some(o=>permissions(o).some(p=>p.factionKey==='wh2_dlc11_cst_the_drowned')));
 assert(s.owners.some(o=>permissions(o).some(p=>p.factionKey==='wh2_dlc13_emp_the_huntmarshals_expedition')));
 assert(s.owners.every(o=>o.unlock.modelRank===7&&o.unlock.levelDetails.length===1));
 assert(s.owners.every(o=>permissions(o).some(p=>!p.modDisabled)&&permissions(o).every(p=>p.joins.length===5&&p.agentKey===o.agentKey&&p.subtypeKey===o.key)));
 assert.equal(new Set(report.factionPermissionProofs.map(p=>p.rowId)).size,report.factionPermissionProofs.length);
 assert(report.nonMatchingAgentPermissionRowIds.length>0);
 assert(report.limits.campaignSubtypeTableIsNotPlayabilityProof);assert(report.limits.factionPermissionIsContextNotOwnerDefinition);
});

test('prerequisite closure and locks are complete; equal display names never merge distinct skills',()=>{
 assert.equal(report.prerequisiteNodes.length,55);assert(report.prerequisiteNodes.every(n=>n.skillLockRowIds.length===0&&n.ancillaryLockRowIds.length===0));
 assert.equal(report.prerequisiteNodes.flatMap(n=>n.incoming).length,8);
 for(const owner of report.skills[5].owners){const node=report.prerequisiteNodes.find(n=>n.key===owner.nodeKey);assert.equal(node.requiredNumParents,0);assert.equal(node.incoming.length,1);assert.equal(node.incoming[0].raw.link_type,'REQUIRED');}
 assert(report.skills.slice(0,5).flatMap(s=>s.owners).every(o=>o.flags.node.requiredNumParents===0));
 assert(report.sameNameGroups.slice(0,5).every(g=>g.keys.length===1&&g.alternatives.length===0));
 assert.deepEqual(report.sameNameGroups[5].alternatives,[{key:'wh_main_skill_brt_lord_battle_low-born_militia',nodeRowIds:[]}]);
 assert(!report.skills.some(s=>s.key==='wh_main_skill_brt_lord_battle_low-born_militia'));
});

test('source identity, owner/tree/enable flags, scope/value, schema, permissions and snapshot corruption refuse replay',async()=>{
 const {replay,research}=await api;
 const rows=[['character_skill_nodes_tables','character_skill_key','wrong'],['character_skill_node_sets_tables','agent_subtype_key','wrong'],['character_skill_node_set_items_tables','mod_disabled',true],['character_skill_level_to_effects_junctions_tables','value',999],['agent_subtypes_tables','can_gain_xp',false],['faction_agent_permitted_subtypes_tables','subtype','wrong']];
 for(const [table,field,value] of rows){const s=structuredClone(source);s.rows.find(r=>r.table===table&&(table!=='faction_agent_permitted_subtypes_tables'||r.row.subtype==='wh_dlc07_brt_alberic'&&r.row.agent==='general')).row[field]=value;assert.throws(()=>replay(Buffer.from(JSON.stringify(s)),manifest,prior));assert.throws(()=>research(s,prior));}
 const edits=[s=>s.rows.push(structuredClone(s.rows[0])),s=>{s.relationships.splice(s.relationships.findIndex(j=>j.from.startsWith('character_skill_node_sets_tables:')&&j.field==='agent_subtype_key'),1);},s=>{s.schemas.find(x=>x.table==='character_skill_node_sets_tables').fields.find(f=>f.name==='agent_subtype_key').is_reference=['wrong','key'];},s=>{s.provenance.packs[0].sha256='wrong';},s=>{s.originalExtraction.sha256='wrong';},s=>{s.coverage.find(c=>c.query.table==='character_skill_nodes_tables').matchedRows=999;}];
 for(const edit of edits){const s=structuredClone(source);edit(s);const b=Buffer.from(JSON.stringify(s));assert.throws(()=>replay(b,manifest,prior));assert.throws(()=>replay(b,{...manifest,sourceSha256:sha(b),processedSchemasSha256:sha(JSON.stringify(s.schemas))},prior));}
 const changedPrior=structuredClone(prior);changedPrior[1].skills.find(s=>s.skillKey===report.skills[0].key).effects[0].rawValue=999;assert.throws(()=>replay(bytes,manifest,changedPrior));
});

test('all three existing exact-single-owner admissions retain applicability and all app/data/artifact/evidence pins',async()=>{
 const {fileHash}=await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs');
 for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,path);
 const {comparisonUnit}=require('../.test-build/src/repositories/productionUnitSelection.js'),{skillModifiers}=require('../.test-build/src/domain/caSkillEffect.js');
 for(const path of ['src/data/caSkillEffect.json','src/data/caSkillBatch01.json','src/data/caSkillBatch02.json']){
  const s=json(path),unit=comparisonUnit(s.targets[0].unitId),choice={skillKey:s.skillKey,ownerKey:s.owner.key,rank:1};
  assert(skillModifiers(unit,[choice]).length>0);assert.throws(()=>skillModifiers(unit,[{...choice,ownerKey:'wh_main_brt_lord'}]));assert.throws(()=>skillModifiers(unit,[{...choice,rank:2}]));
  assert.throws(()=>skillModifiers({...unit,id:'wrong-unit'},[choice]));
 }
 const units=json('src/data/units.json'),prod=units.filter(u=>u.gameVersion!=='sample');assert.deepEqual([prod.length,units.length-prod.length,prod.filter(u=>u.entities?.totalHealth!==undefined).length,prod.filter(u=>u.movement?.speed!==undefined).length],[101,5,13,81]);
 const research=json('src/data/caResearchEffect.json');assert.deepEqual([research.technologies.length,research.effects.length,research.modifiers.length],[10,15,96]);
 assert.equal(json('tools/wh3-importer/skill-rank-research/report.json').finalVerdict,'D');
});

test('actual saved CA extraction projects deterministically and keeps original SHA256',{skip:!existsSync(source.originalExtraction.path)},async()=>{
 const {projectExtraction,serialize}=await api,raw=read(source.originalExtraction.path);
 assert.equal(sha(raw),manifest.originalExtractionSha256);assert.equal(serialize(projectExtraction(raw)),bytes.toString());
 assert.equal(serialize(projectExtraction(raw)),serialize(projectExtraction(raw)));
});
