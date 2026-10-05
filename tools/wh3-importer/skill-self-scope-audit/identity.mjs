import assert from 'node:assert/strict';
import {unique} from '../skill-production-bretonnia/source.mjs';
export function identityAudit(source,extra,inventory,units){
 assert.equal(extra.format,'wh3-skill-self-identity-source-v1');
 const ids=new Map(source.rows.map(r=>[r.id,r]));for(const id of extra.reusedRowIds)assert(ids.has(id),`Missing reused identity ${id}`);
 for(const r of extra.rows){assert(!ids.has(r.id),'Duplicate supplemental source row');ids.set(r.id,r);}
 assert.equal(new Set(extra.rows.map(r=>r.id)).size,extra.rows.length);
 const schemas=new Map([...source.schemas,...extra.schemas].map(s=>[`${s.table}:${s.version}`,s]));
 for(const edge of extra.relationships){const from=ids.get(edge.from),to=ids.get(edge.to);assert(from&&to);const field=schemas.get(`${from.table}:${from.tableVersion}`).fields.find(f=>f.name===edge.field);assert(field?.is_reference);assert.equal(field.is_reference[0],to.table.replace(/_tables$/,''));assert.equal(field.is_reference[1],edge.targetField);assert.equal(from.row[edge.field],to.row[edge.targetField]);assert.equal(edge.value,from.row[edge.field]);}
 const all=[...ids.values()],rows=t=>all.filter(r=>r.table===t),one=(t,f,v)=>{const found=rows(t).filter(r=>r.row[f]===v);assert.equal(found.length,1,`Missing/ambiguous identity ${t}.${f}=${v}`);return found[0];};
 const allEdges=[...source.relationships,...extra.relationships],join=(a,f,b,k)=>{assert(allEdges.some(e=>e.from===a.id&&e.field===f&&e.to===b.id&&e.targetField===k));return {from:a.id,field:f,to:b.id,targetField:k};};
 const profiles=new Map();
 function profile(mainKey){
  if(profiles.has(mainKey))return profiles.get(mainKey);
  const main=one('main_units_tables','unit',mainKey),land=one('land_units_tables','key',main.row.land_unit),weapon=one('melee_weapons_tables','key',land.row.primary_melee_weapon),armour=one('unit_armour_types_tables','key',land.row.armour),man=one('battle_entities_tables','key',land.row.man_entity);
  const mount=land.row.mount?one('mounts_tables','key',land.row.mount):null,mountEntity=mount?one('battle_entities_tables','key',mount.row.entity):null;
  const route=[join(main,'land_unit',land,'key'),join(land,'primary_melee_weapon',weapon,'key'),join(land,'armour',armour,'key'),join(land,'man_entity',man,'key'),...(mount?[join(land,'mount',mount,'key'),join(mount,'entity',mountEntity,'key')]:[])];
  const p={mainKey,landKey:land.row.key,caste:main.row.caste,mainRowId:main.id,landRowId:land.id,weaponRowId:weapon.id,armourRowId:armour.id,manEntityKey:man.row.key,manEntityRowId:man.id,mountKey:mount?.row.key??null,mountEntityKey:mountEntity?.row.key??null,mountRowId:mount?.id??null,mountEntityRowId:mountEntity?.id??null,productionUnitIds:units.filter(u=>u.id===`ca_unit_${mainKey}`&&u.gameVersion===source.provenance.gameVersion).map(u=>u.id),joins:route,
   rawStats:{leadership:land.row.morale,meleeAttack:land.row.melee_attack,meleeDefence:land.row.melee_defence,chargeBonus:land.row.charge_bonus,armour:armour.row.armour_value,weaponBase:weapon.row.damage,weaponAP:weapon.row.ap_damage,bonusHitPoints:land.row.bonus_hit_points,manHitPoints:man.row.hit_points,manRunSpeed:man.row.run_speed,mountHitPoints:mountEntity?.row.hit_points??null,mountRunSpeed:mountEntity?.row.run_speed??null},
   displayedStatsAdmitted:false,note:'Raw source cells only. HP/speed/composite precedence and mount effect retention are not resolved.'};profiles.set(mainKey,p);return p;
 }
 const owners=inventory.subtypes.map(o=>{
  const subtype=one('agent_subtypes_tables','key',o.key),base=profile(o.mainKey),grants=[];
  for(const skill of inventory.skills.filter(s=>s.ownerKeys.includes(o.key)))for(const grant of skill.ancillaryRows){const g=ids.get(grant.rowId),anc=one('ancillaries_tables','key',g.row.granted_ancillary);if(anc.row.category!=='mount'||!anc.row.provided_bodyguard_unit)continue;
   const p=profile(anc.row.provided_bodyguard_unit);grants.push({skillKey:skill.key,rank:g.row.level,grantRowId:g.id,ancillaryKey:anc.row.key,ancillaryRowId:anc.id,mainKey:p.mainKey,landKey:p.landKey,joins:[join(g,'granted_ancillary',anc,'key'),join(anc,'provided_bodyguard_unit',ids.get(p.mainRowId),'unit')],availability:'GRANT_STATIC_ONLY_EQUIPPED_RUNTIME_STATE_NOT_OBSERVED'});
  }
  const custom=rows('units_custom_battle_mounts_tables').filter(r=>r.row.base_unit===o.mainKey).map(r=>{const p=profile(r.row.mounted_unit);return {rowId:r.id,mainKey:p.mainKey,landKey:p.landKey,joins:[join(r,'base_unit',ids.get(base.mainRowId),'unit'),join(r,'mounted_unit',ids.get(p.mainRowId),'unit')]};});
  // Included ancillaries can identify additional source variants, not campaign
  // acquisition. Keep that arm distinct from Skill grants and custom battles.
  const allowed=rows('ancillaries_included_agent_subtypes_tables').filter(r=>r.row.agent_subtype===o.key).flatMap(r=>{const anc=one('ancillaries_tables','key',r.row.ancillary);if(!anc.row.provided_bodyguard_unit)return [];const p=profile(anc.row.provided_bodyguard_unit);return [{rowId:r.id,ancillaryKey:anc.row.key,ancillaryRowId:anc.id,mainKey:p.mainKey,landKey:p.landKey,joins:[join(r,'agent_subtype',subtype,'key'),join(r,'ancillary',anc,'key'),join(anc,'provided_bodyguard_unit',ids.get(p.mainRowId),'unit')]}];});
  return {subtypeKey:o.key,characterType:o.characterType,baseMainKey:base.mainKey,baseLandKey:base.landKey,defaultIdentityJoin:[join(subtype,'associated_unit_override',ids.get(base.mainRowId),'unit'),...base.joins.slice(0,1)],campaignMountGrants:grants,customBattleMounts:custom,includedMountAncillaries:allowed,variantMainKeys:unique([base.mainKey,...grants.map(g=>g.mainKey),...custom.map(c=>c.mainKey),...allowed.map(a=>a.mainKey)]),runtimeEquippedMountKnown:false};
 });
 return {format:'wh3-self-scope-character-identity-v1',owners,profiles:[...profiles.values()].sort((a,b)=>a.mainKey.localeCompare(b.mainKey)),counts:{subtypes:owners.length,baseIdentities:unique(owners.map(o=>o.baseMainKey)).length,combatProfiles:profiles.size,campaignSkillGrants:owners.reduce((n,o)=>n+o.campaignMountGrants.length,0),customBattleMountRoutes:owners.reduce((n,o)=>n+o.customBattleMounts.length,0),productionCharacterProfiles:[...profiles.values()].filter(p=>p.productionUnitIds.length).length},
  verdict:{defaultSubtypeJoin:'DETERMINISTIC_STATIC_DEFAULT_ASSOCIATED_UNIT_OVERRIDE',activeBattleIdentity:'REQUIRES_EQUIPPED_MOUNT_AND_CONTEXT_SELECTION',mountModellingRequiredForFullSupport:true,onFootOrExactProfilePilotPossible:true,mountEffectRetention:'UNKNOWN_NOT_INVESTIGATED',sameUnitStatSourceChain:true,productionContractChanged:false}};
}
