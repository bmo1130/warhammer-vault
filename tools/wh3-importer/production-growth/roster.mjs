import assert from 'node:assert/strict';
import {normalizeUnit} from '../normalization/normalizer.mjs';
import {assertReviewedProductionResult} from '../promotion/first-batch.mjs';
import {removeField} from '../promotion/partial-review.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';
import {portable} from '../expansion-batch-01/projection.mjs';
export const categories=['legendaryLords','genericLords','legendaryHeroes','genericHeroes','units'];
// Reviewed extraction pin, using the existing expansion dictionary contract.
export const rosterSourceHash='15206b218154f221b355dbe3ffe8d79e737929099b9b0d4ca9ce81ba1b25f9b9';
const aliases={wh_main_vmp_heinrich_kemmler:'heinrich_kemmler',wh_dlc04_vmp_vlad_con_carstein:'vlad_von_carstein'};
const one=(rows,table,field,value)=>{const xs=rows.filter(r=>r.table===table&&r.row[field]===value);assert.equal(xs.length,1,`${table}.${field}=${value}: expected one source row`);return xs[0];};
export function discoverRoster(source){
 assert(isReviewedSource(source.provenance,''),'Unreviewed roster source');
 const rows=source.preflight.rows;
 for(const coverage of source.preflight.coverage){
  const count=rows.filter(r=>r.table===coverage.query.table&&coverage.query.where.every(w=>w.op==='oneOf'?w.value.includes(r.row[w.field]):r.row[w.field]===w.value)).length;
  assert.equal(count,coverage.matchedRows,'Incomplete selected source rows');
 }
 return source.catalog.map(seed=>{
  const result={...seed,legendaryLords:[],genericLords:[],legendaryHeroes:[],genericHeroes:[],units:[],explicitlyExcluded:[],holds:[]};
  const excluded=(kind,key,reason,sourceRowIds)=>result.explicitlyExcluded.push({kind,key,reason,sourceRowIds});
  const factionRows=seed.factionKeys.map(k=>one(rows,'factions_tables','key',k));
  const subcultures=rows.filter(p=>p.table==='cultures_subcultures_tables'&&p.row.culture===seed.cultureKey).map(p=>p.row.subculture);
  assert.deepEqual([...seed.factionKeys].sort(),rows.filter(p=>p.table==='factions_tables'&&subcultures.includes(p.row.subculture)).map(p=>p.row.key).sort(),'Unexplained faction missing from culture');
  const nativeSubculture=one(rows,'factions_tables','key',seed.cultureKey).row.subculture;
  const allowed=factionRows.filter(f=>f.row.subculture===nativeSubculture&&!f.row.is_quest_faction&&!f.row.is_rebel&&(f.row.military_group===seed.militaryGroup||rows.some(p=>p.table==='frontend_factions_tables'&&p.row.faction===f.row.key))).map(f=>f.row.key);
  assert.deepEqual([...allowed].sort(),[...seed.allowedFactionKeys].sort(),'Race membership drift');
  const leaders=rows.filter(p=>p.table==='frontend_faction_leaders_tables'&&seed.factionKeys.includes(p.row.faction));
  const allPermissions=rows.filter(p=>p.table==='faction_agent_permitted_subtypes_tables'&&seed.factionKeys.includes(p.row.faction));
  const subtypeKeys=[...new Set([...allPermissions.map(p=>p.row.subtype),...leaders.map(p=>p.row.agent_subtype_record)])].sort();
  assert.deepEqual([...seed.subtypeKeys].sort(),subtypeKeys,'Unexplained subtype missing from inventory');
  const groups=new Set(factionRows.map(p=>p.row.military_group));
  const mainKeys=[...new Set([...rows.filter(p=>p.table==='units_to_groupings_military_permissions_tables'&&groups.has(p.row.military_group)).map(p=>p.row.unit),...rows.filter(p=>p.table==='units_custom_battle_permissions_tables'&&seed.factionKeys.includes(p.row.faction)).map(p=>p.row.unit),...subtypeKeys.map(k=>one(rows,'agent_subtypes_tables','key',k).row.associated_unit_override).filter(Boolean)])].sort();
  assert.deepEqual([...seed.mainKeys].sort(),mainKeys,'Unexplained unit missing from inventory');
  // All subtype rows found from culture/faction permissions are accounted for.
  for(const key of seed.subtypeKeys){
   const subtype=one(rows,'agent_subtypes_tables','key',key);
   const starting=leaders.filter(p=>p.row.agent_subtype_record===key&&allowed.includes(p.row.faction));
   const permissions=rows.filter(r=>r.table==='faction_agent_permitted_subtypes_tables'&&r.row.subtype===key&&allowed.includes(r.row.faction)&&!r.row.mod_disabled);
   const playable=permissions.filter(p=>one(rows,'agents_tables','key',p.row.agent).row.playable);
   if(!playable.length&&!starting.length){excluded('character',key,'NO_ENABLED_NONQUEST_PLAYABLE_AGENT_PERMISSION',[subtype.id,...allPermissions.filter(p=>p.row.subtype===key).map(p=>p.id)]);continue;}
   if(!subtype.row.recruitable&&!starting.length){excluded('character',key,'NON_RECRUITABLE_SPAWN_OR_BACKGROUND_SUBTYPE',[subtype.id,...playable.map(p=>p.id)]);continue;}
   const main=one(rows,'main_units_tables','unit',subtype.row.associated_unit_override);
   const land=one(rows,'land_units_tables','key',main.row.land_unit);
   const unique=rows.find(r=>r.table==='unique_agents_tables'&&r.row.agent_subtype===key);
   // Some campaign companions use a unique set-piece battle identity instead
   // of unique_agents (e.g. the Damned Paladin). Retain that exact proof too.
   const battleCharacter=rows.find(r=>r.table==='units_custom_battle_permissions_tables'&&r.row.unit===main.row.unit&&allowed.includes(r.row.faction)&&r.row.campaign_exclusive&&r.row.set_piece_character===main.row.unit);
   const uniqueBattle=battleCharacter&&subtype.row.auto_generate&&rows.filter(r=>r.table==='agent_subtypes_tables'&&r.row.associated_unit_override===main.row.unit).length===1;
   const general=starting.length>0||playable.some(p=>p.row.agent==='general');
   const legend=general?(starting.length>0||subtype.row.recruitment_category==='legendary_lords'):(!!unique||!!uniqueBattle);
   // Hidden background subtypes lack a proved selectable character identity.
   // Retain them as explicit unverified-membership exclusions.
   if(!subtype.row.show_in_ui&&!unique&&!uniqueBattle&&!starting.length){excluded('character',key,'PLAYER_ARCHETYPE_NOT_VERIFIED: no UI entry or unique-agent definition',[subtype.id,...playable.map(p=>p.id)]);continue;}
   const localisationKey=`land_units_onscreen_name_${land.row.key}`;
   const loc=one(rows,'Loc','key',localisationKey);
   const kind=general?(legend?'legendary_lord':'generic_lord'):(legend?'legendary_hero':'generic_hero');
   const id=aliases[key]??`ca_${general?'lord':'hero'}_${key}`;
   const nameRows=unique?['forename','surname','other_name','clan_name'].filter(k=>unique.row[k]).map(k=>one(rows,'Loc','key',`names_name_${unique.row[k]}`)):[];
   const properName=nameRows.map(r=>r.row.text).filter(Boolean).join(' ');
   const entry={id,subtypeKey:key,mainKey:main.row.unit,landKey:land.row.key,localisationKey,name:properName||loc.row.text,factionId:seed.factionId,characterKind:kind,sourceRowIds:[subtype.id,main.id,land.id,loc.id,...playable.map(p=>p.id),...starting.map(p=>p.id),...(unique?[unique.id]:[]),...(uniqueBattle?[battleCharacter.id]:[]),...nameRows.map(p=>p.id)]};
   result[general?(legend?'legendaryLords':'genericLords'):(legend?'legendaryHeroes':'genericHeroes')].push(entry);
  }
  for(const key of seed.mainKeys){
   const main=one(rows,'main_units_tables','unit',key);
   if(main.row.is_naval||!main.row.land_unit){excluded('unit',key,'NAVAL_OR_NO_LAND_IDENTITY',[main.id]);continue;}
   const land=one(rows,'land_units_tables','key',main.row.land_unit);
   if(['lord','hero'].includes(main.row.caste)){excluded('unit',key,'CHARACTER_BATTLE_FORM: character/mount identity belongs in subtype inventory, not troop roster',[main.id,land.id]);continue;}
   const permissions=rows.filter(r=>r.table==='units_to_groupings_military_permissions_tables'&&r.row.unit===key);
   const primary=permissions.find(r=>r.row.military_group===seed.militaryGroup)??(permissions.length===1?permissions[0]:undefined);
   const customs=rows.filter(r=>r.table==='units_custom_battle_permissions_tables'&&r.row.unit===key&&allowed.includes(r.row.faction)&&!r.row.set_piece_character);
   if(!customs.length){excluded('unit',key,'NO_NONQUEST_PLAYER_BATTLE_PERMISSION: spawn/background membership unverified',[main.id,land.id,...permissions.map(p=>p.id)]);continue;}
   const localisationKey=`land_units_onscreen_name_${land.row.key}`,loc=one(rows,'Loc','key',localisationKey);
   result.units.push({id:`ca_unit_${key}`,mainKey:key,landKey:land.row.key,name:loc.row.text,localisationKey,factionId:seed.factionId,militaryGroup:primary?.row.military_group??null,customBattleFaction:primary?null:customs[0].row.faction,isRenown:main.row.is_renown,campaignExclusive:customs.every(p=>p.row.campaign_exclusive),sourceRowIds:[main.id,land.id,loc.id,...(primary?[primary.id]:[]),...customs.map(p=>p.id)]});
  }
  for(const f of factionRows.filter(f=>!allowed.includes(f.row.key)))excluded('faction',f.row.key,f.row.is_quest_faction?'QUEST_BATTLE_FACTION':f.row.is_rebel?'REBEL_FACTION':'FOREIGN_CATALOG_GROUP',[f.id]);
  for(const category of categories)result[category].sort((a,b)=>a.id.localeCompare(b.id));
  return result;
 });
}
export function reviewRosterUnits(source,rosters,validate,factionIds){
 const reviewed=[],holds=[];
 for(const candidate of source.candidates){
  const entry=rosters.flatMap(r=>r.units).find(u=>u.id===candidate.id);assert(entry,'Unselected candidate');
  if(candidate.hold){holds.push({id:entry.id,reason:candidate.hold});continue;}
  try{
   const dump=restoreTrace(source,candidate.trace),permissionTrace=restoreTrace(source,candidate.permission);
   const normalized=portable(normalizeUnit(dump,{factionId:entry.factionId,militaryGroup:entry.militaryGroup,permissionTrace,rosterFaction:entry.customBattleFaction}));
   // Same whole-group omission policy as growth; no new mapping or missile /
   // entity formula. Existing direct core facts and identity gate are reused.
   const omittedGroups=['abilities','passiveAbilities','attributes','missile'];
   for(const group of omittedGroups){removeField(normalized.unit,group);normalized.provenance.fields=normalized.provenance.fields.filter(p=>p.field!==group&&!p.field.startsWith(group+'.'));normalized.omitted.push({field:group,kind:'UNRESOLVED',reason:'Roster core admission: optional group withheld in full.'});}
   assertReviewedProductionResult(normalized,validate,factionIds,{mainKey:entry.mainKey,landKey:entry.landKey,id:entry.id,name:entry.name,factionId:entry.factionId,militaryGroup:entry.militaryGroup,customBattleFaction:entry.customBattleFaction},{expected:normalized.unmapped,omittedGroups});
   const unit=normalized.unit;unit.source=`CA base DB · WH3 ${unit.gameVersion} · reviewed race roster core · faction-rosters/ROSTERS.md`;
   reviewed.push({id:entry.id,unit,fields:normalized.provenance.fields,omitted:normalized.omitted});
  }catch(error){holds.push({id:entry.id,reason:error.message});}
 }
 return {reviewed,holds};
}
export function checkCoverage(rosters,units,lords,heroes){
 const ids=new Set();for(const item of [...units,...lords,...heroes]){assert(!ids.has(item.id),'Duplicate wiki identity');ids.add(item.id);}
 return rosters.map(r=>{
  const missing=[];
  const counts=Object.fromEntries(categories.map(category=>{
   const admitted=r[category].filter(e=>{
    const found=(category==='units'?units:category.endsWith('Lords')?lords:heroes).some(a=>a.id===e.id&&(a.factionId===e.factionId||a.factionIds?.includes(e.factionId))&&a.gameVersion!=='sample'&&(category==='units'||a.characterKind===e.characterKind&&a.subtypeKey===e.subtypeKey));
    if(!found)missing.push(e.id);return found;
   });
   return [category,{admitted:admitted.length,expected:r[category].length}];
  }));
  return {factionId:r.factionId,counts,missing,status:missing.length||r.holds.length?'HOLD':'ROSTER COMPLETE',exclusions:r.explicitlyExcluded.length};
 });
}
