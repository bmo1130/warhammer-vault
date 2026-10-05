const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const setup=Promise.all([import('../tools/wh3-importer/skill-self-scope-audit/replay.mjs'),import('../tools/wh3-importer/skill-self-scope-audit/policy.mjs'),import('../tools/wh3-importer/skill-self-scope-audit/identity.mjs')]).then(([replay,policy,identity])=>({replay,policy,identity,fixture:replay.runAudit(JSON.parse(fs.readFileSync('tools/wh3-importer/skill-self-scope-audit/manifest.json')))}));
test('all 596 exact self junctions are classified once; route fanout never inflates taxonomy counts',async()=>{
 const {fixture}=await setup,c=fixture.result.coverage;
 assert.deepEqual(c.taxonomy,{CHARACTER_COMBAT_STAT:77,CHARACTER_CAMPAIGN_STAT:176,ABILITY_OR_PASSIVE:294,MOUNT_OR_EQUIPMENT:27,FORCE_OR_ARMY_INDIRECT:12,NON_NUMERIC_OR_NON_UNIT:9,MIXED_CHARACTER_AND_UNIT:0,UNKNOWN:1});
 assert.equal(Object.values(c.taxonomy).reduce((a,b)=>a+b,0),596);assert.equal(c.self.skills,171);assert.equal(c.self.effects,205);assert.equal(new Set(fixture.result.inventory.records.map(r=>r.junctionRowId)).size,596);
 assert.equal(c.characterCombat.junctions,77);assert.equal(c.characterCombat.verifiedExistingUnitOperationJunctions,53);assert.equal(c.characterCombat.unreviewedOperationJunctions,24);
 assert.equal(c.characterCombat.singleRankSkills,24);assert.equal(c.characterCombat.multiRankSkills,17);assert.equal(c.characterCombat.existingPathJunctions,77);assert.equal(c.characterCombat.newPathJunctions,0);
});
test('strict current gate remains zero; character-domain tiers preserve whole-Skill and other blockers',async()=>{
 const {fixture}=await setup,c=fixture.result.coverage;
 assert.equal(c.selfScopeOnly.immediateCompleteSkills,0);assert.deepEqual(c.tiers.map(t=>[t.skills,t.effects,t.junctions]),[[2,2,2],[2,2,2],[5,4,6],[26,11,58]]);
 assert.equal(c.characterCombat.mixedOrNonNumericWholeSkills,15);assert.equal(c.newProductionAdmission,0);assert(fixture.result.classification.records.every(r=>r.productionEligible===false));
 for(const key of c.tiers[0].skillKeys){const s=fixture.result.inventory.skills.find(s=>s.key===key);assert.deepEqual(s.rankLevels,[1]);assert.deepEqual(s.globalAndWholeSkillBlockers,['SELF_CHARACTER_SCOPE']);}
});
test('historical intersections, paths and runtime-owner uncertainty remain distinct',async()=>{
 const {fixture}=await setup,c=fixture.result.coverage;
 assert.equal(c.intersections.multiRank,423);assert.equal(c.intersections.nonUnitMechanic,464);assert.equal(c.intersections.runtimeOwner,201);assert.equal(c.intersections.unsupportedPath,1);assert.equal(c.intersections.unreviewedOperationOrMapping,14);
 assert.equal(c.characterCombat.exactStaticOwnerJunctions,77);assert.equal(c.characterCombat.safeOwnerJunctions,46);assert.equal(c.characterCombat.runtimeOwnerBlockerJunctions,31);
});
test('exact subtype/default and ancillary/mount joins produce 48 profiles without Production insertion',async()=>{
 const {fixture}=await setup,i=fixture.result.identity;
 assert.deepEqual(i.counts,{subtypes:14,baseIdentities:14,combatProfiles:48,campaignSkillGrants:27,customBattleMountRoutes:28,productionCharacterProfiles:0});
 const lord=i.owners.find(o=>o.subtypeKey==='wh_main_brt_lord');assert.equal(lord.baseMainKey,'wh_main_brt_cha_lord_0');assert(lord.campaignMountGrants.some(g=>g.mainKey==='wh_main_brt_cha_lord_2'));
 const foot=i.profiles.find(p=>p.mainKey===lord.baseMainKey),hippo=i.profiles.find(p=>p.mainKey==='wh_main_brt_cha_lord_2');assert.equal(foot.rawStats.meleeDefence,48);assert.equal(hippo.rawStats.meleeDefence,35);assert.notEqual(foot.weaponRowId,hippo.weaponRowId);assert.notEqual(foot.mountKey,hippo.mountKey);
 assert.equal(i.verdict.mountEffectRetention,'UNKNOWN_NOT_INVESTIGATED');assert(i.profiles.every(p=>p.displayedStatsAdmitted===false));
});
test('identity audit rejects broken references, duplicate supplemental rows and absent base records',async()=>{
 const {fixture,identity}=await setup,units=JSON.parse(fs.readFileSync('src/data/units.json'));
 const extra=structuredClone(fixture.extra);extra.relationships.find(e=>e.field==='provided_bodyguard_unit').value='wrong';assert.throws(()=>identity.identityAudit(fixture.source,extra,fixture.scanned,units));
 const duplicate=structuredClone(fixture.extra);duplicate.rows.push(duplicate.rows[0]);assert.throws(()=>identity.identityAudit(fixture.source,duplicate,fixture.scanned,units));
 const bad=structuredClone(fixture.scanned);bad.subtypes[0].mainKey='not-a-main-unit';assert.throws(()=>identity.identityAudit(fixture.source,fixture.extra,bad,units));
});
test('taxonomy uses typed rows and exact mount grant rather than effect name or tooltip pattern',async()=>{
 const {policy}=await setup;
 const e={effectKey:'wh_main_effect_character_stat_melee_attack',rank:1,description:'Melee attack +999',scope:{key:'character_to_character_own'},routes:[{table:'effect_bonus_value_basic_junction_tables',raw:{bonus_value_id:'unknown_bonus'}}]};
 assert.equal(policy.semantic(e,{ancillaryRows:[]},new Map()).family,'UNKNOWN');
 const mount={...e,routes:[],effectKey:'completely_unrelated_name'},skill={ancillaryRows:[{raw:{level:1,granted_ancillary:'anc'}}]},anc=new Map([['anc',{id:'row',row:{category:'mount',provided_bodyguard_unit:'exact-unit'}}]]);
 assert.equal(policy.semantic(mount,skill,anc).family,'MOUNT_OR_EQUIPMENT');assert.equal(policy.semantic({...mount,rank:2},skill,anc).family,'UNKNOWN');
 const health=policy.interpretRoute({table:'effect_bonus_value_basic_junction_tables',raw:{bonus_value_id:'general_bodyguard_size_mod'}});assert.deepEqual(health.candidateStats,['entities.totalHealth']);assert.equal(health.operationStatus,'UNREVIEWED');
});
test('all_units filter never changes character target scope into ordinary army applicability',async()=>{
 const {fixture}=await setup,records=fixture.result.inventory.records;
 assert(records.filter(r=>r.target.unitSetFilters.includes('all_units')).every(r=>r.target.ordinaryProductionTargets.length===0));
 const mentor=records.filter(r=>r.scope.key==='general_to_character_own_forcewide_heroes_only');assert.equal(mentor.length,3);assert(mentor.every(r=>r.target.kind==='OTHER_HERO_CHARACTERS_IN_COMMANDING_FORCE'));
});
test('next code-only resistance review is a bounded conditional package, never automatic admission',async()=>{
 const {fixture}=await setup,n=fixture.result['next-blockers'];assert.equal(n.recommendedCodeOnlyNext,'UNREVIEWED_RESISTANCE_OPERATION');assert.equal(n.boundedSkillKey,'wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail');
 assert(n.blockers.every(b=>b.currentImmediateSkills===0));assert.equal(n.blockers.find(b=>b.key==='MULTI_RANK_UNKNOWN').marginalSkills,2);assert.deepEqual(n.conditionalOpening,{completeSkills:1,junctions:1,effects:1,automaticAdmission:false});
 assert.deepEqual(n.conditionalProofPackages[0].ownerKeys,['wh_dlc07_brt_fay_enchantress']);assert(n.conditionalProofPackages[0].productionTargets.length);assert.equal(n.multiRankRuntimeVerdict,'UNKNOWN_UNCHANGED');
});
test('committed audit outputs reconstruct exactly from pinned existing and bounded supplemental source',async()=>{
 const {fixture}=await setup,manifest=JSON.parse(fs.readFileSync('tools/wh3-importer/skill-self-scope-audit/manifest.json')),{sha256}=await import('../tools/wh3-importer/research-classifier/classify.mjs');
 for(const [name,bytes] of Object.entries(fixture.outputs)){assert.equal(sha256(bytes),manifest.outputSha256[name]);assert.equal(fs.readFileSync(`tools/wh3-importer/skill-self-scope-audit/${name}.json`,'utf8'),bytes);}
 assert.equal(Object.keys(manifest.preservedFiles).length,515);assert.equal(fixture.result.architecture.recommendation,'C');assert.equal(fixture.result.architecture.recommendedOption,'B');assert.equal(fixture.result.architecture.productionBehaviorChanged,false);
});
