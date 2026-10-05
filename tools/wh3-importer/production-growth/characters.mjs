import assert from 'node:assert/strict';

// Explicitly reviewed archetype pairs. No suffix-based automatic merging.
export const characterPairs=[
 ...['beasts','death','metal','shadows','fire','heavens','high','life'].map(l=>[`wh2_dlc13_lzd_slann_mage_priest_${l}`,`wh2_dlc13_lzd_slann_mage_priest_${l}_horde`,'horde']),
 ['wh2_main_lzd_slann_mage_priest','wh2_main_lzd_slann_mage_priest_horde','duplicated_campaign'],
 ['wh2_main_lzd_saurus_old_blood','wh2_dlc13_lzd_saurus_old_blood_horde','horde'],
 ['wh2_dlc13_lzd_kroxigor_ancient','wh2_dlc13_lzd_kroxigor_ancient_horde','horde'],
 ['wh2_dlc12_lzd_red_crested_skink_chief','wh2_dlc13_lzd_red_crested_skink_chief_horde','horde'],
 ...['skink_chief','skink_priest_beasts','skink_priest_heavens'].map(k=>[`wh2_main_lzd_${k}`,`wh2_dlc12_lzd_tlaqua_${k}`,'tlaqua']),
];
// Localised recruitment notices name separate identities, despite shared models.
export const specialLordNotices={
 ...Object.fromEntries(['wakhaf','rakhash','thutep','lahmizzash','setep','alkhazzar_ii'].map((k,i)=>[`wh2_dlc09_tmb_tomb_king_${k}`,`effects_description_wh2_dlc09_effect_tomb_king_unlock_${i+1}`])),
 ...Object.fromEntries(['01','02','03','04'].map(k=>[`wh2_dlc11_cst_admiral_tech_${k}`,`effects_description_wh2_dlc11_effect_tech_cst_admirals_${k}`])),
 wh2_dlc15_grn_goblin_great_shaman_raknik:'effects_description_wh2_dlc15_effect_greenskin_lord_unlock_1',
 wh2_dlc15_grn_orc_warboss_oglok:'effects_description_wh2_dlc15_effect_greenskin_lord_unlock_2',
};
// Direct named LH statements in CA recruitment/quest UI, beyond the subtype
// label. These prove the title without inferring it from unique_agents.
export const legendaryHeroNotices={
 wh2_dlc16_wef_ariel:'campaign_payload_ui_details_description_dummy_ariel_spawns',
 wh2_dlc16_wef_coeddil:'effects_description_wh2_dlc16_wef_drycha_coeddil_unchained_dummy',
 wh_dlc08_nor_kihar:'campaign_payload_ui_details_description_dummy_nor_accept_serpent_champion',
};
export function resolveCharacterLoc(rows,key,trail=[]){
 assert(!trail.includes(key),`Cyclic character Loc: ${[...trail,key]}`);
 const matches=rows.filter(r=>r.table==='Loc'&&r.row.key===key);assert.equal(matches.length,1,`Missing/ambiguous exact character Loc ${key}`);
 const row=matches[0],refs=[row.id];
 const text=row.row.text.replace(/\{\{tr:([^}]+)\}\}/g,(_,child)=>{const resolved=resolveCharacterLoc(rows,child,[...trail,key]);refs.push(...resolved.sourceRowIds);return resolved.text;});
 assert(!text.includes('{{tr:'),`Unresolved character Loc ${key}`);
 return {text,sourceRowIds:[...new Set(refs)]};
}
export function canonicalizeCharacters(result,rows,categories){
 result.characterAliases=[];
 for(const [canonicalKey,aliasKey,context] of characterPairs){
  const collection=categories.filter(c=>c!=='units').find(c=>result[c].some(e=>e.subtypeKey===aliasKey));if(!collection)continue;
  const entries=result[collection],canonical=entries.find(e=>e.subtypeKey===canonicalKey),alias=entries.find(e=>e.subtypeKey===aliasKey);assert(canonical,`Missing archetype ${canonicalKey}`);
  for(const field of ['factionId','characterKind','mainKey','landKey','name'])assert.equal(canonical[field],alias[field],`Alias identity differs: ${aliasKey}.${field}`);
  const a=rows.find(r=>r.table==='agent_subtypes_tables'&&r.row.key===canonicalKey),b=rows.find(r=>r.table==='agent_subtypes_tables'&&r.row.key===aliasKey);
  const withoutKey=({key,...value})=>value;assert.deepEqual(withoutKey(a.row),withoutKey(b.row),'Alias archetype definitions differ');
  const faction=context==='tlaqua'?'wh2_main_lzd_tlaqua':context==='duplicated_campaign'?'wh2_dlc17_lzd_oxyotl':'wh2_dlc13_lzd_spirits_of_the_jungle';
  const permission=rows.find(r=>r.table==='faction_agent_permitted_subtypes_tables'&&r.row.faction===faction&&r.row.subtype===aliasKey);assert(permission,`Missing exact campaign variant relation: ${aliasKey}`);
  assert(result.allowedFactionKeys.includes(faction));
  const factionRow=rows.find(r=>r.table==='factions_tables'&&r.row.key===faction);assert(factionRow);
  if(context==='horde')assert.equal(factionRow.row.feature_forest,'LOCKED_HORDE','Expected proved horde campaign context');
  canonical.subtypeAliases.push(aliasKey);canonical.sourceRowIds=[...new Set([...canonical.sourceRowIds,...alias.sourceRowIds,permission.id])];
  result.characterAliases.push({id:alias.id,canonicalId:canonical.id,entityType:collection.endsWith('Lords')?'lord':'hero',subtypeKey:aliasKey,reason:`IDENTICAL_ARCHETYPE_${context.toUpperCase()}_CAMPAIGN_IMPLEMENTATION`,sourceRowIds:[a.id,b.id,permission.id,factionRow.id]});
  entries.splice(entries.indexOf(alias),1);
 }
 const characters=categories.filter(c=>c!=='units').flatMap(c=>result[c]);
 const unexplained=characters.filter(e=>characters.some(b=>e.id!==b.id&&e.characterKind===b.characterKind&&e.mainKey===b.mainKey&&e.landKey===b.landKey&&e.name===b.name));
 result.heldCharacters=[];
 for(const e of unexplained){
  const category=categories.find(c=>c!=='units'&&result[c].includes(e));
  const reason='HOLD_CHARACTER_IDENTITY: same kind/main/land/resolved name; distinct acquisition/name/trait identity or implementation-alias relation remains unverified';
  result.holds.push({id:e.id,subtypeKey:e.subtypeKey,reason});
  result.heldCharacters.push({...e,category});result[category].splice(result[category].indexOf(e),1);
  result.explicitlyExcluded.push({kind:'character',key:e.subtypeKey,reason,sourceRowIds:e.sourceRowIds});
 }
 const admitted=categories.filter(c=>c!=='units').flatMap(c=>result[c]);
 const accounting=result.subtypeKeys.map(k=>({key:k,count:admitted.filter(e=>e.subtypeKey===k||e.subtypeAliases.includes(k)).length+result.explicitlyExcluded.filter(e=>e.kind==='character'&&e.key===k).length}));
 assert(accounting.every(a=>a.count===1),'Character subtype must belong to exactly one canonical identity or exclusion');
 result.sourceStatus='SOURCE COMPLETE';
}
