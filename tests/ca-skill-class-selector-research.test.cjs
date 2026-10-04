const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const dir='tools/wh3-importer/skill-class-selector-research/';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const api=import('../'+dir+'research.mjs');
const bytes=read(dir+'source.json'),source=JSON.parse(bytes),manifest=json(dir+'manifest.json'),selection=json(dir+'selection.json'),units=json('src/data/units.json');
const membership=json(dir+'membership.json'),report=json(dir+'report.json'),set=k=>membership.selectors.find(s=>s.key===k);
const copy=()=>structuredClone(source);
test('class-selector replay pins actual source, exact membership, schema and reports',async()=>{
 const {replay,serialize}=await api;const result=replay(bytes,read('src/data/units.json'),selection,manifest);
 assert.equal(serialize(result.report),read(dir+'report.json').toString());assert.equal(serialize(result.membership),read(dir+'membership.json').toString());
 assert.equal(sha(serialize(result.report)),manifest.reportSha256);assert.equal(sha(serialize(result.membership)),manifest.membershipSha256);
 assert.equal(report.finalVerdict,'B');assert.deepEqual(report.counts,{skills:7,classOrCasteSkills:6,selectors:6,sourceRows:source.rows.length});
 assert.deepEqual(report.newAdmissions,[]);assert.equal(report.modelChanged,false);assert.equal(report.schemaChanged,false);
});
test('infantry is exact main-caste union, not land display class or Bretonnia filter',()=>{
 const s=set('infantry_units');assert.equal(s.status,'STATIC_EXACT_MEMBERSHIP');assert.equal(s.exactMembers.length,695);assert.equal(s.productionMembers.length,66);assert.equal(s.omittedNonProduction.length,629);
 assert.deepEqual(s.branches.filter(b=>b.kind==='MAIN_UNIT_CASTE').map(b=>b.raw.unit_caste).sort(),['melee_infantry','missile_infantry','monstrous_infantry']);
 assert.equal(s.branches.filter(b=>b.kind==='EXPLICIT_UNIT_SET').length,4);
 assert(s.productionMembers.some(m=>m.mainKey==='wh_main_emp_inf_swordsmen'));assert(s.productionMembers.some(m=>m.mainKey==='wh_dlc01_chs_mon_dragon_ogre'));
 assert(!s.exactMembers.some(m=>m.mainKey==='wh_main_brt_cav_knights_of_the_realm'));
 const rogue=report.negativeCases.find(n=>n.mainKey==='wh2_dlc15_grn_mon_rogue_idol_0');assert.equal(rogue.landClass,'inf_mel');assert.equal(rogue.caste,'monster');assert.equal(rogue.infantryMember,false);
 const reliquae=report.negativeCases.find(n=>n.mainKey==='wh_dlc07_brt_inf_grail_reliquae_0');assert.equal(reliquae.landClass,'spcl');assert.equal(reliquae.infantryMember,true);assert.equal(reliquae.production,false);
});
test('overlapping explicit/caste branches deduplicate exact main identity; aliases stay distinct',()=>{
 const infantry=set('infantry_units');assert.equal(infantry.unionCollisions.length,4);assert.equal(new Set(infantry.exactMembers.map(m=>m.mainKey)).size,695);
 assert(infantry.unionCollisions.some(m=>m.mainKey==='wh_dlc04_emp_inf_flagellants_0'&&m.branchRowIds.length===2));
 assert.equal(infantry.mainLandAliases.length,53);
 const all=set('all_units');assert.equal(all.exactMembers.length,2802);assert.equal(new Set(all.exactMembers.map(m=>m.landKey)).size,2675);assert.equal(all.mainLandAliases.length,176);
 for(const m of all.exactMembers)for(const id of m.productionUnitIds)assert.equal(id,'ca_unit_'+m.mainKey);
 assert.equal(all.landWithoutMain.length,4);assert.equal(all.navalOmissions.length,1);assert.equal(all.navalOmissions[0].key,'wh_main_shp_transport');
});
test('RoR and ability-spawn context use their own exact identities; missing Production never substitutes',()=>{
 const ror=set('infantry_units').exactMembers.find(m=>m.mainKey==='wh_pro04_brt_inf_battle_pilgrims_ror_0');assert.equal(ror.isRenown,true);assert.deepEqual(ror.productionUnitIds,[]);
 assert.deepEqual(report.explicitComparison.sharedMainKeys,['wh_dlc07_brt_inf_battle_pilgrims_0','wh_dlc07_brt_inf_grail_reliquae_0','wh_pro04_brt_inf_battle_pilgrims_ror_0']);assert.deepEqual(report.explicitComparison.explicitOnly,[]);
 assert.equal(set('dlc07_brt_inf_battle_pilgrims').productionMembers.length,1);
 for(const c of report.spawnContexts){assert(c.abilities.length>0);assert.equal(c.production,false);assert.equal(c.runtimeApplicability,'NOT_OBSERVED');}
 assert.equal(report.spawnContexts.find(c=>c.mainKey==='wh_main_vmp_mon_crypt_horrors_summoned').infantryMember,true);
 assert.equal(report.spawnContexts.find(c=>c.mainKey==='wh_main_vmp_inf_zombie_summoned').infantryMember,true);
 assert.equal(report.spawnContexts.find(c=>c.mainKey==='wh3_main_kho_mon_bloodthirster_summoned_0').infantryMember,false);
});
test('selector mechanism repeats while scope, owner and unsupported effects stay separate',()=>{
 assert.equal(set('all_units').branches.length,18);assert.equal(set('all_units').productionMembers.length,101);
 assert.equal(set('lords').exactMembers.length,839);assert.equal(set('lords').productionMembers.length,0);
 assert.equal(set('characters').exactMembers.length,1406);assert.equal(set('characters').productionMembers.length,0);
 assert.equal(report.skills.filter(s=>s.selectors.includes('all_units')).length,3);
 assert.equal(report.primarySelectorReuse.length,19);assert.equal(new Set(report.primarySelectorReuse.map(r=>r.raw.effect)).size,17);
 const people=report.skills[0];assert.deepEqual(people.ownerKeys,['wh2_dlc14_brt_repanse']);assert.deepEqual(people.sourceRanks,[1]);assert.equal(people.admission,'NOT_ADMITTED');
 assert.equal(people.effects.find(e=>e.effectKey==='wh2_dlc14_effect_force_army_battle_all_infantry_attack').rawValue,5);
 assert.equal(people.effects.find(e=>e.effectKey==='wh2_dlc14_effect_armour_piercing_damage_infantry').rawValue,3);
 assert(people.blockers.includes('REPLENISHMENT_NO_UNIT_STAT_PATH'));assert.equal(report.peoplesHeroSelectorBlocker,'RESOLVED_STATIC_MAIN_CASTE_UNION');
 assert.equal(report.runtime.gameExecution,'NOT_OBSERVED');
});
test('ambiguous combined fields, exclusion and runtime range selectors fail closed',async()=>{
 const {materialize}=await api;
 for(const change of [j=>j.row.unit_class='inf_mel',j=>j.row.exclude=true]){const s=copy();const j=s.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_set==='infantry_units'&&r.row.unit_caste);change(j);
  const result=materialize(s,'infantry_units',units);assert.equal(result.status,'UNSUPPORTED_SELECTOR_SHAPE');assert.deepEqual(result.productionMembers,[]);assert.deepEqual(result.exactMembers,[]);}
 const s=copy();s.rows.find(r=>r.table==='unit_sets_tables'&&r.row.key==='infantry_units').row.use_unit_exp_level_range=true;
 assert.equal(materialize(s,'infantry_units',units).status,'UNSUPPORTED_SELECTOR_SHAPE');
 const category=copy(),j=category.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_set==='infantry_units'&&r.row.unit_caste);j.row.unit_caste='';j.row.unit_category='infantry';
 assert.equal(materialize(category,'infantry_units',units).status,'UNSUPPORTED_SELECTOR_SHAPE');
});
test('missing inverse coverage or identity edge prevents enumeration',async()=>{
 const {materialize}=await api;const s=copy();s.coverage=s.coverage.filter(c=>!(c.query.table==='main_units_tables'&&c.query.where[0].field==='caste'));
 assert.throws(()=>materialize(s,'infantry_units',units),/coverage/);
 const broken=copy();const m=broken.rows.find(r=>r.table==='main_units_tables'&&r.row.unit==='wh_main_emp_inf_swordsmen');broken.relationships=broken.relationships.filter(r=>!(r.from===m.id&&r.field==='land_unit'));
 assert.throws(()=>materialize(broken,'infantry_units',units),/join/);
});
test('source row duplicates, primary-key collision, class references and alias drift are rejected',async()=>{
 const {validateSource}=await api;
 const duplicate=copy();duplicate.rows.push(structuredClone(duplicate.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables')));assert.throws(()=>validateSource(duplicate),/Duplicate/);
 const collision=copy(),r=structuredClone(collision.rows.find(r=>r.table==='main_units_tables'));r.row.upkeep_cost+=1;r.id=`${r.table}:${sha(JSON.stringify([r.sourcePack,r.path,r.key,r.row])).slice(0,20)}`;collision.rows.push(r);assert.throws(()=>validateSource(collision),/collision/);
 const schema=copy();schema.schemas.find(s=>s.table==='main_units_tables').fields.find(f=>f.name==='caste').is_reference=['unit_class','key'];assert.throws(()=>validateSource(schema),/schema/);
 const alias=copy();alias.rows.find(r=>r.table==='main_units_tables'&&r.row.unit==='wh_main_emp_inf_swordsmen').row.land_unit='wh_main_brt_cav_knights_of_the_realm';assert.throws(()=>validateSource(alias),/payload/);
});
test('pinned replay rejects wrong owner/rank/value/scope/selector and Production changes',async()=>{
 const {replay,serialize}=await api;
 const mutate=(table,predicate,field,value)=>{const s=copy();s.rows.find(r=>r.table===table&&predicate(r.row)).row[field]=value;assert.throws(()=>replay(Buffer.from(serialize(s)),read('src/data/units.json'),selection,manifest),/Source hash/);};
 mutate('character_skill_level_to_effects_junctions_tables',r=>r.character_skill_key===selection.skills[0].key,'level',2);
 mutate('character_skill_level_to_effects_junctions_tables',r=>r.character_skill_key===selection.skills[0].key,'value',99);
 mutate('character_skill_level_to_effects_junctions_tables',r=>r.character_skill_key===selection.skills[0].key,'effect_scope','character_to_character_own');
 mutate('character_skill_node_sets_tables',r=>r.agent_subtype_key==='wh2_dlc14_brt_repanse','agent_subtype_key','wh_main_brt_lord');
 mutate('effect_bonus_value_ids_unit_sets_tables',r=>r.unit_set==='infantry_units','unit_set','all_units');
 assert.throws(()=>replay(bytes,Buffer.from(JSON.stringify([...units,{...units[0],id:'ca_unit_wh_dlc07_brt_inf_grail_reliquae_0'}])),selection,manifest),/Production/);
});
test('all preexisting tracked source, app, tests and evidence files remain pinned',async()=>{
 const {fileHash}=await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs');
 for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,path);
 const prod=units.filter(u=>u.gameVersion!=='sample');assert.deepEqual([prod.length,units.length-prod.length,prod.filter(u=>u.entities?.totalHealth!==undefined).length,prod.filter(u=>u.movement?.speed!==undefined).length],[101,5,13,81]);
 const research=json('src/data/caResearchEffect.json');assert.deepEqual([research.technologies.length,research.effects.length,research.modifiers.length],[10,15,96]);
 const {skillsForUnit,skillModifiers}=require('../.test-build/src/domain/caSkillEffect.js');
 assert.equal(new Set(prod.flatMap(u=>skillsForUnit(u).map(s=>s.skillKey))).size,3);
 for(const u of prod)for(const skill of skillsForUnit(u)){assert.notEqual(skill.skillKey,selection.skills[0].key);assert.throws(()=>skillModifiers(u,[{skillKey:skill.skillKey,ownerKey:'wrong-owner',rank:1}]));assert.throws(()=>skillModifiers(u,[{skillKey:skill.skillKey,ownerKey:skill.owner.key,rank:2}]));}
});
test('saved actual extraction projects without changing original evidence',{skip:!fs.existsSync(source.originalExtraction.path)},async()=>{
 const {projectExtraction,serialize}=await api,raw=read(source.originalExtraction.path);assert.equal(sha(raw),manifest.originalExtractionSha256);assert.equal(serialize(projectExtraction(raw)),bytes.toString());
});
