import fs from 'node:fs';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash,discoverRoster} from '../tools/wh3-importer/production-growth/roster.mjs';
import {restoreTrace} from '../tools/wh3-importer/promotion/partial-review.mjs';
import {normalizeUnit} from '../tools/wh3-importer/normalization/normalizer.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
export function auditUnitData(){
  const attributeProjection=read('src/data/unitAttributeAdmissions.json');
  const attributeById=new Map(attributeProjection.admissions.map(a=>[a.id,a]));
  const passiveProjection=read('src/data/unitPassiveAdmissions.json');
  const passiveById=new Map(passiveProjection.admissions.map(a=>[a.id,a]));
  const entityProjection=read('src/data/unitHpEntityRuleAdmissions.json');
  const entityById=new Map(entityProjection.admissions.map(a=>[a.id,a]));
  const units=read('src/data/units.json').filter(u=>u.gameVersion!=='sample').map(u=>{
    const a=attributeById.get(u.id),p=passiveById.get(u.id),e=entityById.get(u.id);
    return {...u,...(a?.attributes!==undefined?{attributes:a.attributes}:{}),...(p?.passiveAbilities!==undefined?{passiveAbilities:p.passiveAbilities}:{}),...(e?{entities:{...u.entities,...(e.count!==null?{count:e.count}:{}),...(e.totalHealth!==null?{totalHealth:e.totalHealth}:{})}}:{})};
  }),total=units.length;
  const paths=['abilities','passiveAbilities','attributes','entities.count','entities.totalHealth','entities.healthPerEntity','movement.speed','defense.resistances','defense.projectilePenetrationResistance','missile','missile.range','missile.projectile.baseDamage','missile.projectile.armorPiercingDamage','missile.reload.baseTime','missile.projectile.shotsPerVolley','missile.ammunition','missile.accuracy.accuracy','missile.reload.reloadSkill','campaign.recruitmentRequirements'];
  const coverage=Object.fromEntries(paths.map(p=>{const known=units.filter(u=>p.split('.').reduce((v,k)=>v?.[k],u)!==undefined).length;return [p,{known,unknown:total-known}];}));
  const s=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash),rosters=discoverRoster(s);
  const entries=new Map(rosters.flatMap(r=>r.units).map(e=>[e.id,e]));
  const materializable={abilities:0,passiveAbilities:0,attributes:0},unmapped={ability:new Set(),attribute:new Set()};
  let abilityMembership=0,attributeMembership=0,buildingSources=0,rawSpeed=0,rawHitPoints=0;
  for(const c of s.candidates){
    const e=entries.get(c.id),dump=restoreTrace(s,c.trace);
    const normalized=normalizeUnit(dump,{factionId:e.factionId,militaryGroup:e.militaryGroup,permissionTrace:restoreTrace(s,c.permission),rosterFaction:e.customBattleFaction});
    const u=units.find(u=>u.id===c.id);
    for(const group of Object.keys(materializable))if(u[group]===undefined&&normalized.unit[group]?.length&&!normalized.unmapped.some(m=>m.kind===(group==='attributes'?'attribute':'ability')))materializable[group]++;
    normalized.unmapped.forEach(m=>unmapped[m.kind]?.add(m.caId));
    if(dump.rows.some(r=>r.table==='land_units_to_unit_abilites_junctions_tables'&&r.row.land_unit===e.landKey))abilityMembership++;
    if(dump.rows.some(r=>r.table==='unit_attributes_to_groups_junctions_tables'))attributeMembership++;
    if(dump.rows.some(r=>r.table==='building_units_allowed_tables'&&r.row.unit===e.mainKey))buildingSources++;
    if(normalized.facts.some(f=>f.source.table==='battle_entities_tables'&&f.source.field==='run_speed'))rawSpeed++;
    if(normalized.facts.some(f=>f.source.table==='battle_entities_tables'&&f.source.field==='hit_points'))rawHitPoints++;
  }
  const mainRows=units.map(u=>s.preflight.rows.find(r=>r.table==='main_units_tables'&&r.row.unit===entries.get(u.id).mainKey));
  const landRows=units.map(u=>s.preflight.rows.find(r=>r.table==='land_units_tables'&&r.row.key===entries.get(u.id).landKey));
  const raw={numMen:mainRows.filter(r=>Number.isFinite(r.row.num_men)).length,numEngines:landRows.filter(r=>Number.isFinite(r.row.num_engines)).length,nonzeroEngines:landRows.filter(r=>r.row.num_engines>0).length,bonusHitPoints:landRows.filter(r=>Number.isFinite(r.row.bonus_hit_points)).length,resistanceRows:landRows.filter(r=>Object.keys(r.row).some(k=>k.startsWith('damage_mod_'))).length,primaryMissileWeapon:landRows.filter(r=>r.row.primary_missile_weapon).length,primaryAmmo:landRows.filter(r=>Number.isFinite(r.row.primary_ammo)).length};
  const localisation=fs.existsSync('src/data/unitLocalisations.json')?read('src/data/unitLocalisations.json'):null;
  const koreanNames=localisation?.admissions.length??units.filter(u=>/[가-힣]/.test(u.name)).length;
  coverage.attributes.complete=attributeProjection.admissions.filter(a=>a.status==='COMPLETE').length;
  coverage.attributes.partial=attributeProjection.admissions.filter(a=>a.status==='PARTIAL').length;
  coverage.attributes.knownEmpty=attributeProjection.admissions.filter(a=>a.attributes?.length===0).length;
  coverage.attributes.nonempty=units.filter(u=>u.attributes?.length).length;
  coverage.passiveAbilities.complete=passiveProjection.admissions.filter(a=>a.status==='COMPLETE').length;
  coverage.passiveAbilities.partial=passiveProjection.admissions.filter(a=>a.status==='PARTIAL').length;
  coverage.passiveAbilities.knownEmpty=passiveProjection.admissions.filter(a=>a.passiveAbilities?.length===0).length;
  coverage.passiveAbilities.nonempty=units.filter(u=>u.passiveAbilities?.length).length;
  coverage['entities.count'].complete=entityProjection.admissions.filter(a=>a.count!==null).length;
  coverage['entities.count'].partial=0;
  coverage['entities.totalHealth'].complete=entityProjection.admissions.filter(a=>a.totalHealth!==null).length;
  coverage['entities.totalHealth'].partial=0;
  return {production:total,sample:read('src/data/units.json').length-total,koreanNames:{known:koreanNames,unknown:total-koreanNames},coverage,raw,roster:{complete:read('src/data/factionRosters.json').coverage.filter(r=>r.status==='ROSTER COMPLETE').length,lords:read('src/data/lords.json').length,heroes:read('src/data/heroes.json').length,aliases:read('src/data/characterAliases.json').length},traceEvidence:{scope:s.candidates.length,abilityMembership,attributeMembership,buildingSources,rawSpeed,rawHitPoints,materializableWholeGroups:materializable,unmappedDistinctIds:Object.fromEntries(Object.entries(unmapped).map(([k,v])=>[k,v.size]))}};
}
if(process.argv[1]?.endsWith('audit-unit-data.mjs'))console.log(JSON.stringify(auditUnitData(),null,2));
