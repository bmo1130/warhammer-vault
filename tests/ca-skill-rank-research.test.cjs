const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync:read,existsSync}=require('node:fs');
const {createHash}=require('node:crypto');
const dir='tools/wh3-importer/skill-rank-research/',json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=read(dir+'source.json'),source=JSON.parse(bytes),manifest=json(dir+'manifest.json'),report=json(dir+'report.json'),audit=json(dir+'runtime-audit.json');
const api=import('../tools/wh3-importer/skill-rank-research/research.mjs');

test('four exact multi-rank chains replay deterministically without rank arithmetic or admission',async()=>{
 const {replay,serialize,keys}=await api;
 assert.equal(serialize(replay(bytes,manifest)),serialize(replay(bytes,manifest)));assert.deepEqual(replay(bytes,manifest),report);
 assert.equal(sha(serialize(report)),manifest.reportSha256);assert.deepEqual(report.skills.map(s=>s.key),keys);
 assert.deepEqual(json(dir+'selection.json').skills.map(s=>s.key),keys);
 assert.equal(report.semantics,'UNKNOWN');assert.equal(report.finalVerdict,'D');assert.deepEqual(report.admittedSkills,[]);
 assert(report.skills.every(s=>s.rankSemantics==='UNKNOWN'&&s.admission==='NOT_ADMITTED'));
 assert(report.skills.every(s=>s.ranks.length===3&&s.ranks.map(r=>r.rows.length).join() === '1,2,2'));
 assert.equal(report.skills.flatMap(s=>s.ranks.flatMap(r=>r.rows)).length,20);
 assert(report.skills.every(s=>s.ownerChains.every(o=>o.joins.length===4)));
 assert(report.skills[0].ownerKeys.includes('wh_main_brt_lord'));
 assert(report.skills[3].ownerKeys.includes('wh_main_emp_lord'));
 assert(report.effects.every(e=>e.routes.length===1&&e.routes[0].table==='effect_bonus_value_ids_unit_sets_tables'));
});

test('Low-Born retains original independent composite keys, repeated effects, explicit targets and raw values',()=>{
 const s=report.skills[0],lead='wh2_dlc11_effect_force_stat_leadership_peasant_mob_men_at_arms_spear_at_arms',defence='wh2_dlc11_effect_force_stat_melee_defence_brt_peasant_mob_men_at_arms_spear_at_arms';
 assert.deepEqual(s.ranks.map(r=>r.rows.map(e=>[e.effectKey,e.rawValue])),[[[lead,4]],[[lead,4],[defence,4]],[[lead,6],[defence,6]]]);
 const rows=s.ranks.flatMap(r=>r.rows);assert.equal(new Set(rows.map(r=>r.rowId)).size,5);
 assert(rows.every(r=>r.scope.key==='general_to_force_own'&&r.scope.target==='force'&&r.scope.ownership==='yours'));
 assert.deepEqual(s.reusedEffects.map(e=>e.levels),[[1,2,3],[2,3]]);
 const targets=report.unitSets.find(t=>t.key==='wh2_dlc11_brt_peasant_mob_men_at_arms_spear_at_arms');
 assert.equal(targets.members.length,6);assert(targets.members.every(m=>m.mainKey&&m.landKey&&!m.selector.exclude&&!m.selector.unit_category&&!m.selector.unit_class));
 assert(targets.members.every(m=>m.joins.length===3));
});

test('comparison samples preserve rank-specific raw values and cross-faction structural repetition without choosing a rule',()=>{
 const values=s=>s.ranks.map(r=>r.rows.map(e=>e.rawValue).sort((a,b)=>a-b));
 assert.deepEqual(report.skills.slice(1).map(values),[[[10],[4,15],[8,20]],[[6],[4,9],[6,12]],[[4],[4,4],[6,6]]]);
 assert(report.skills.every(s=>s.reusedEffects.length===2&&s.reusedEffects.some(e=>e.levels.join()==='1,2,3')&&s.reusedEffects.some(e=>e.levels.join()==='2,3')));
});

test('processed schema proves references and display priority, not a rank activation/removal rule or skill bundle identity',()=>{
 assert.deepEqual(report.structure.compositeKey,['character_skill_key','effect_key','level']);
 assert.deepEqual(report.structure.fields,['character_skill_key','effect_key','effect_scope','level','value']);
 assert.equal(report.structure.directSkillToBundleReference,false);assert.equal(report.structure.selectedEffectsBundleJunctionCount,0);
 assert.match(report.structure.effectPriorityDescription,/displayed lower down/);
 const schema=source.schemas.find(s=>s.table===report.structure.levelTable);
 assert(schema.fields.every(f=>f.description===''));assert.equal(schema.fields.find(f=>f.name==='level').is_reference,null);
 assert(source.schemaInventory.some(s=>s.table==='effect_bundles_to_effects_junctions_tables'&&s.presentInPack));
 assert(report.skills.every(s=>s.levelDetailRowIds.length===0&&s.otherRankRoutes.every(r=>r.rowIds.length===0)));
});

test('missing runtime ranks/stats remain NOT_OBSERVED; old HP/entity probes cannot become Skill semantic evidence',()=>{
 assert.equal(sha(read(dir+'runtime-audit.json')),manifest.runtimeAuditSha256);
 assert.deepEqual(report.runtime.observations,[0,1,2,3].map(rank=>({rank,leadership:null,meleeDefence:null,status:'NOT_OBSERVED'})));
 assert.equal(report.runtime.existingProbeCanReadRequiredStats,false);assert.equal(report.runtime.tooltipRankMeaning,'UNKNOWN');
 assert.equal(audit.qualifyingControlledRankTrials,0);assert.equal(audit.matchingLowBornSkillRecords,0);
 assert.equal(audit.malformedProbeLines,0);assert(audit.parsedProbeRecords>0);
 assert(!audit.observedFieldNames.some(f=>/leadership|melee.?defen[cs]e|skill|rank/i.test(f)));
 const probe=read(audit.probe.path).toString();
 const queried=probe.match(/local unit_fields = \{([\s\S]*?)\}/)[1];
 assert(!/leadership|melee.?defen[cs]e|skill|rank/i.test(queried));
});

test('row/schema/reference/snapshot/coverage/hash mutations refuse research replay, including re-pinned corrupt sources',async()=>{
 const {replay}=await api;
 const edits=[s=>s.rows.push(structuredClone(s.rows[0])),s=>s.rows.pop(),s=>{s.rows.find(r=>r.table==='character_skill_level_to_effects_junctions_tables').row.value=99;},s=>{s.relationships.splice(s.relationships.findIndex(r=>r.from.startsWith('character_skill_level_to_effects_junctions_tables:')),1);},s=>{s.schemas.find(x=>x.table==='character_skill_level_to_effects_junctions_tables').fields[0].is_reference=['wrong','key'];},s=>{s.provenance.packs[0].sha256='wrong';},s=>{s.originalExtraction.sha256='wrong';},s=>{s.coverage.find(c=>c.query.table==='character_skill_level_to_effects_junctions_tables').matchedRows=99;}];
 for(const edit of edits){const s=structuredClone(source);edit(s);const b=Buffer.from(JSON.stringify(s));
  assert.throws(()=>replay(b,manifest));
  assert.throws(()=>replay(b,{...manifest,sourceSha256:sha(b),processedSchemasSha256:sha(JSON.stringify(s.schemas))}));
 }
});

test('Production/Sample/HP/Speed, existing Skill batches, Research, app/backup/comparison and runtime evidence are preserved',async()=>{
 const {fileHash}=await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs');
 for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,path);
 const units=json('src/data/units.json'),prod=units.filter(u=>u.gameVersion!=='sample');
 assert.deepEqual([prod.length,units.length-prod.length,prod.filter(u=>u.entities?.totalHealth!==undefined).length,prod.filter(u=>u.movement?.speed!==undefined).length],[101,5,13,81]);
 const research=json('src/data/caResearchEffect.json');assert.deepEqual([research.technologies.length,research.effects.length,research.modifiers.length],[10,15,96]);
 assert.deepEqual(['src/data/caSkillEffect.json','src/data/caSkillBatch01.json','src/data/caSkillBatch02.json'].map(p=>json(p).name),['Champions of Bordeleaux','Aspiring Knights','Blessed Water']);
});

test('local original CA extraction still projects losslessly and existing raw capture file identities remain unchanged',{skip:!existsSync(source.originalExtraction.path)},async()=>{
 const {projectExtraction,serialize}=await api,raw=read(source.originalExtraction.path);
 assert.equal(sha(raw),manifest.originalExtractionSha256);assert.equal(serialize(projectExtraction(raw)),bytes.toString());
 for(const input of audit.inputs)for(const path of input.paths)assert.equal(sha(read(path)),input.sha256,path);
});
