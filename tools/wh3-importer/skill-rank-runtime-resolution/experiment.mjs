import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digest,stable} from '../runtime-evidence/contract.mjs';
export {digest,stable};
export const BASELINE='9f63a7662f7d71638aa580cb2f0227b7b26d8fac';
export const SNAPSHOT='c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5';
export const VERSION='9.0.2.0';
export const PREFIX='WH3_SKILL_RANK_PROBE|';
export const SKILLS=[
 {id:'low-born',key:'wh2_dlc11_skill_brt_army_buff_low_born_militia',name:'Low-Born Militia',mainKey:'wh_main_brt_inf_men_at_arms',landKey:'wh_main_brt_inf_men_at_arms',stats:['stat_morale','stat_melee_defence'],paths:['defense.leadership','defense.meleeDefense'],rows:[[0,0],[4,0],[4,4],[6,6]]},
 {id:'worshippers',key:'wh2_dlc11_skill_brt_army_buff_worshippers_of_the_grail',name:'Worshippers of the Grail',mainKey:'wh_dlc07_brt_inf_foot_squires_0',landKey:'wh_dlc07_brt_inf_foot_squires_0',stats:['stat_armour','stat_melee_attack'],paths:['defense.armor','melee.meleeAttack'],rows:[[0,0],[6,0],[9,4],[12,6]]},
];
export const STAT_KEYS=['stat_morale','stat_melee_defence','stat_armour','stat_melee_attack'];
export const STATES=[[0,0],[1,0],[2,0],[3,0],[0,0],[0,1],[0,2],[0,3]];
export const MODELS=['CURRENT_RANK_ONLY','CUMULATIVE_RANKS'];
export function deltas(skill,model,rank){assert(MODELS.includes(model));assert(Number.isInteger(rank)&&rank>=0&&rank<=3);return model==='CURRENT_RANK_ONLY'?[...skill.rows[rank]]:skill.rows.slice(0,rank+1).reduce((a,b)=>a.map((v,i)=>v+b[i]),[0,0]);}
export function predictions(){return SKILLS.map(s=>({skillKey:s.key,statPaths:s.paths,predictionOnly:true,baseline:'Use observed rank-0 current values, never static/card defaults',ranks:[0,1,2,3].map(rank=>({rank,...Object.fromEntries(MODELS.map(m=>[m,deltas(s,m,rank)]))}))}));}
export function verifyHistorical(){
 const root=new URL('../../../',import.meta.url),source=JSON.parse(readFileSync(new URL('tools/wh3-importer/skill-rank-research/source.json',root))),units=JSON.parse(readFileSync(new URL('src/data/units.json',root)));
 for(const s of SKILLS){assert(units.some(u=>u.id===`ca_unit_${s.mainKey}`));const levels=source.rows.filter(r=>r.table==='character_skill_level_to_effects_junctions_tables'&&r.row.character_skill_key===s.key);assert.equal(levels.length,5);
  const bonuses=s.id==='low-born'?['morale','melee_defence_mod']:['armour_mod','melee_attack_mod'];
  for(let rank=1;rank<=3;rank++)for(let i=0;i<2;i++){const found=levels.filter(l=>l.row.level===rank&&source.rows.some(r=>r.table==='effect_bonus_value_ids_unit_sets_tables'&&r.row.effect===l.row.effect_key&&r.row.bonus_value_id===bonuses[i]));assert.equal(found.length,s.rows[rank][i]===0?0:1);if(found.length)assert.equal(found[0].row.value,s.rows[rank][i]);}
 }
 return {status:'UNCHANGED_HISTORICAL_ROWS_REFERENCED',newStaticRankResearch:false};
}
export function verifySetup(setup){
 assert.equal(setup.format,'wh3-skill-rank-setup-v1');assert.equal(setup.gameVersion,VERSION);assert.equal(setup.snapshotId,SNAPSHOT);assert.equal(setup.ownerSubtype,'wh_main_brt_lord');
 assert(['SMALL','MEDIUM','LARGE','ULTRA'].includes(setup.unitSize));assert(typeof setup.trialId==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(setup.trialId));
 assert.equal(setup.context,'CAMPAIGN');assert.equal(setup.channel,'CCO_CAMPAIGN_PREBONUS_VALUE');
 if(setup.pinnedBaseline){assert(/^[a-f0-9]{64}$/.test(setup.pinnedBaseline.captureSha256));assert(/^[a-f0-9]{64}$/.test(setup.baselineSaveSha256));assert(setup.expectedIdentity&&typeof setup.expectedIdentity==='object');}
 return setup;
}
