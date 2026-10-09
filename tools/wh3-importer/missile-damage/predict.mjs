const damageFields={baseDamage:'damage',armorPiercingDamage:'ap_damage'};
const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const damage=v=>number(v)&&Number.isSafeInteger(v);
const nonempty=v=>v!==''&&v!==null&&v!==undefined;
export function damageProfiles(t,selection) {
  const find=(table,key)=>selection.rows.filter(r=>r.table===table&&r.row.key===key);
  const grouped=new Map();
  for(const [pathIndex,p] of t.paths.entries())for(const [projectileIndex,x] of p.projectiles.entries()) {
    const f=x.facts,raw=x.row.row,effects=p.condition?.effects??[];
    // An entity-stats override is the TARGET of a replacement. Its old weapon
    // is not an additional selectable replacement weapon.
    const activation=p.role==='JUNCTION_STATS_OVERRIDE'?'REPLACEMENT_TARGET':!p.condition?'BASE_REFERENCE':
      effects.length&&effects.every(e=>e.raw.bonus_value_id==='enable'&&e.effects.length===1)?'REQUIRES_ENABLE_EFFECT':'UNRESOLVED_JUNCTION';
    const shot=find('projectile_shot_type_enum_tables',raw.shot_type),display=find('projectile_shot_type_displays_tables',raw.projectile_shot_type_display);
    const alternate=p.projectiles.some(a=>a.kind==='ALTERNATE');
    const modeVerified=alternate&&p.projectiles.every(a=>find('projectile_shot_type_displays_tables',a.row.row.projectile_shot_type_display).length===1&&
      a.row.row.projectile_shot_type_display!=='placeholder')&&new Set(p.projectiles.map(a=>a.row.row.shot_type)).size===p.projectiles.length;
    const base=damage(f.damage?.value)?f.damage.value:null,ap=damage(f.ap_damage?.value)?f.ap_damage.value:null;
    const explosion=x.explosion.length===1?{
      key:x.explosion[0].raw.key,baseDamage:damage(x.explosion[0].raw.detonation_damage)?x.explosion[0].raw.detonation_damage:null,
      armorPiercingDamage:damage(x.explosion[0].raw.detonation_damage_ap)?x.explosion[0].raw.detonation_damage_ap:null,
      radius:number(x.explosion[0].raw.detonation_radius)?x.explosion[0].raw.detonation_radius:null,rowId:x.explosion[0].rowId,
    }:null;
    const key=JSON.stringify([p.weaponKey,raw.key,activation,effects.map(e=>e.raw.effect).sort()]);
    const owner={role:p.role,ownerRowId:p.ownerRowId,pathIndex,projectileIndex};
    if(grouped.has(key)){grouped.get(key).owners.push(owner);continue;}
    grouped.set(key,{
      weaponKey:p.weaponKey,projectileKey:raw.key,weaponRowId:p.weaponRowId,projectileRowId:x.row.id,owners:[owner],activation,
      enableEffects:[...new Set(effects.map(e=>e.raw.effect))].sort(),kind:x.kind,shotType:raw.shot_type,shotDisplay:raw.projectile_shot_type_display,
      mode:modeVerified?'VERIFIED_SWITCHABLE_SHOT_TYPE':alternate?'ALTERNATE_SELECTION_UNRESOLVED':'SINGLE_PROJECTILE',
      requiresShotEffect:shot.length===1?shot[0].row.requires_effect_enabling:null,supersedesShotType:shot.length===1?shot[0].row.supersedes_shot_type:null,
      shotRowId:shot[0]?.id??null,displayRowId:display[0]?.id??null,
      baseDamage:base,armorPiercingDamage:ap,explosion,
      damageKind:base===null||ap===null?'UNKNOWN_DIRECT':base===0&&ap===0&&explosion&&(explosion.baseDamage>0||explosion.armorPiercingDamage>0)?'EXPLOSION_ONLY':
        base===0&&ap===0?'ZERO_DIRECT':explosion?'DIRECT_AND_EXPLOSION':'DIRECT',
      projectileNumber:f.projectile_number?.value??null,shotsPerVolley:f.shots_per_volley?.value??null,burstSize:f.burst_size?.value??null,burstShotDelay:f.burst_shot_delay?.value??null,
      range:f.effective_range?.value??null,baseReloadTime:f.base_reload_time?.value??null,scalingDamage:f.scaling_damage?.value??null,spawnedVortex:f.spawned_vortex?.value??null,
      precursor:p.flags.precursor?.value??null,secondaryAmmo:p.flags.use_secondary_ammo_pool?.value??null,
      uiVisibility:p.flags.hide_secondary_range_ammo_statistics_ui?.value===true?'HIDDEN_BY_WEAPON_FLAG':
        p.flags.hide_secondary_range_ammo_statistics_ui?.value===false?'NOT_HIDDEN_BY_WEAPON_FLAG':'UNRESOLVED',
      uiDisplayedDamage:null,uiSelectedProfile:null,
    });
  }
  return [...grouped.values()];
}
export function predictDamage(t,previous,selection) {
  const profiles=damageProfiles(t,selection),values={...previous.values},review={};
  // A modifier-free raw reference profile excludes a weapon enabled by an
  // effect. This does not claim that the effect is inactive in a real campaign.
  const candidates=profiles.filter(p=>!['REQUIRES_ENABLE_EFFECT','REPLACEMENT_TARGET'].includes(p.activation));
  const baseOwners=profiles.filter(p=>p.activation==='BASE_REFERENCE');
  for(const [field,raw] of Object.entries(damageFields)) {
    let reason=t.issues.length?'INCOMPLETE_DB_CHAIN':!baseOwners.length?'BASE_WEAPON_REFERENCE_UNRESOLVED':!candidates.length?'NO_DAMAGE_CANDIDATES':null;
    if(!reason&&candidates.some(p=>p[field]===null))reason='MISSING_OR_INVALID_DIRECT_DAMAGE';
    if(!reason&&candidates.some(p=>p.activation==='UNRESOLVED_JUNCTION')) {
      // Unknown junction activation still allows a field shared by every path.
      if(new Set(candidates.map(p=>p[field])).size!==1)reason='UNRESOLVED_JUNCTION_ACTIVATION';
    }
    if(!reason&&new Set(candidates.map(p=>p[field])).size!==1)reason=candidates.some(p=>p.mode==='VERIFIED_SWITCHABLE_SHOT_TYPE')?
      'SWITCHABLE_PROFILES_DIFFER':candidates.some(p=>p.owners.some(o=>o.role==='RIDER'))?'SIMULTANEOUS_OWNER_PROFILES_DIFFER':'BASE_PROFILES_DIFFER';
    if(previous.values[field]!==undefined)review[field]={status:'COMPLETE',reason:null,kind:'PRESERVED_FIRST_SLICE'};
    else if(reason)review[field]={status:'UNKNOWN',reason};
    else {values[field]=candidates[0][field];review[field]={status:'COMPLETE',reason:null,kind:'CA_MODIFIER_FREE_DIRECT_PROFILE_INVARIANT',rawField:raw};}
  }
  const selectedProfiles=candidates.map(p=>({weaponKey:p.weaponKey,projectileKey:p.projectileKey,activation:p.activation}));
  const n=Object.keys(values).length;
  const types=[];
  if(t.paths.some(p=>p.condition)||new Set(profiles.map(p=>p.weaponKey)).size>1||profiles.some(p=>p.mode!=='SINGLE_PROJECTILE'))types.push('MULTIPLE_PROFILES');
  if(profiles.some(p=>[p.projectileNumber,p.shotsPerVolley,p.burstSize].some(v=>v!==1)))types.push('MULTISHOT_VOLLEY');
  if(profiles.some(p=>p.explosion))types.push('DIRECT_AND_EXPLOSION');
  if(profiles.some(p=>p.precursor))types.push('PRECURSOR');
  if(profiles.some(p=>p.uiVisibility==='HIDDEN_BY_WEAPON_FLAG'))types.push('HIDDEN_SECONDARY');
  if(t.engine)types.push('ARTILLERY_WAR_MACHINE');
  if(t.mount||t.paths.some(p=>p.role==='RIDER'))types.push('MOUNT_RIDER');
  if(t.issues.length)types.push('INCOMPLETE_REFERENCE');
  return {values,status:n===4?'COMPLETE':n?'PARTIAL':'UNKNOWN',review,profiles,selectedProfiles,types,
    selection:'MODIFIER_FREE_RAW_BASE; ALL_UNCONDITIONAL_MODES_AND_OWNERS; UI_SELECTION_UNMEASURED',
    unresolvedComponents:profiles.filter(p=>nonempty(p.scalingDamage)||nonempty(p.spawnedVortex)).map(p=>({projectileKey:p.projectileKey,scalingDamage:p.scalingDamage,spawnedVortex:p.spawnedVortex}))};
}
