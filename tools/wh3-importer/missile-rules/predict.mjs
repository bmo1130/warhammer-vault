import {rawFact} from '../blocker-review/evidence.mjs';

export const fields=Object.freeze({baseDamage:'damage',armorPiercingDamage:'ap_damage',range:'effective_range',baseTime:'base_reload_time'});
const nonempty=v=>v!==''&&v!==null&&v!==undefined;
const table=n=>n+'_tables';

// Indexed equivalent of the existing connected() contract. Key equality alone
// never authorizes a join: exact processed metadata AND recorded edge required.
export function missileGraph(source) {
  const byId=new Map(source.rows.map(r=>[r.id,r])),byTable=new Map(),edges=new Map();
  for(const r of source.rows){const a=byTable.get(r.table)??[];a.push(r);byTable.set(r.table,a);}
  for(const e of source.relationships){const k=e.from+':'+e.field,a=edges.get(k)??[];a.push(e);edges.set(k,a);}
  const rows=t=>byTable.get(table(t))??[];
  const fact=(r,f)=>rawFact(source,r,f);
  const links=(r,f,t)=>{
    if(!r)return [];
    const ref=source.schemas.find(s=>s.table===r.table&&s.version===r.tableVersion)?.fields.find(x=>x.name===f)?.is_reference;
    if(!ref||table(ref[0].replace(/_tables$/,''))!==table(t))return [];
    return (edges.get(r.id+':'+f)??[]).filter(e=>e.targetField===ref[1]&&e.value===r.row[f])
      .map(edge=>({edge,row:byId.get(edge.to)})).filter(x=>x.row?.table===table(t)&&x.row.row[ref[1]]===r.row[f]);
  };
  return {source,rows,fact,links};
}

export function inspectMissileUnit(g,seed) {
  const issues=[],paths=[];
  const required=(r,f,t)=>{
    const fact=g.fact(r,f),found=g.links(r,f,t);
    if(!fact||(nonempty(fact.value)&&found.length!==1))issues.push({rowId:r?.id,field:f,reason:'MISSING_OR_AMBIGUOUS_SCHEMA_JOIN'});
    return found;
  };
  const reverse=(t,f,target)=>{
    const ref=g.source.schemas.find(s=>s.table===table(t))?.fields.find(x=>x.name===f)?.is_reference;
    if(!ref||table(ref[0].replace(/_tables$/,''))!==target.table)issues.push({table:table(t),field:f,reason:'REVERSE_SCHEMA_REFERENCE_MISSING'});
    const key=target.row[ref?.[1]];
    const closed=g.source.coverage.some(c=>c.tableFiles>0&&c.query.table===table(t)&&c.query.where.some(w=>w.field===f&&(w.op==='oneOf'?w.value.includes(key):w.value===key)));
    if(!closed)issues.push({table:table(t),field:f,reason:'REVERSE_SCOPE_NOT_CLOSED'});
    return g.rows(t).filter(r=>{
      if(r.row[f]!==key)return false;
      if(!g.links(r,f,target.table.replace(/_tables$/,'')).some(x=>x.row.id===target.id))issues.push({rowId:r.id,field:f,reason:'REVERSE_OWNER_EDGE_MISSING'});
      return true;
    });
  };
  const roots=g.rows('main_units').filter(r=>g.fact(r,'unit')?.value===seed.mainKey);
  if(roots.length!==1)return {paths,issues:[{reason:'MAIN_IDENTITY_MISSING'}],ammo:null};
  const main=roots[0],landLinks=required(main,'land_unit','land_units'),land=landLinks.length===1?landLinks[0].row:null;
  if(!land||g.fact(land,'key')?.value!==seed.landKey)return {paths,issues:[...issues,{reason:'LAND_IDENTITY_MISSING'}],ammo:null};
  const add=(role,owner,field,prefix,condition=null)=>{
    for(const w of required(owner,field,'missile_weapons')) {
      const projectiles=[];
      for(const p of required(w.row,'default_projectile','projectiles'))projectiles.push({kind:'DEFAULT',row:p.row,edges:[p.edge]});
      for(const a of reverse('missile_weapons_to_projectiles','missile_weapon',w.row)) {
        for(const p of required(a,'projectile','projectiles'))projectiles.push({kind:'ALTERNATE',row:p.row,edges:[...g.links(a,'missile_weapon','missile_weapons').map(x=>x.edge),p.edge]});
      }
      if(!projectiles.length)issues.push({rowId:w.row.id,reason:'NO_PROJECTILE'});
      for(const p of projectiles) {
        p.facts=Object.fromEntries([...Object.values(fields),'projectile_number','shots_per_volley','burst_size','burst_shot_delay','explosion_type','scaling_damage','spawned_vortex','is_spell'].map(f=>[f,g.fact(p.row,f)]));
        const blasts=required(p.row,'explosion_type','projectiles_explosions');
        p.explosion=blasts.map(x=>({rowId:x.row.id,raw:x.row.row,edge:x.edge}));
      }
      paths.push({role,ownerRowId:owner.id,weaponKey:w.row.row.key,weaponRowId:w.row.id,edges:[...prefix,w.edge],condition,
        flags:Object.fromEntries(['precursor','use_secondary_ammo_pool','hide_secondary_range_ammo_statistics_ui'].map(f=>[f,g.fact(w.row,f)])),projectiles});
    }
  };
  const prefix=[landLinks[0].edge];
  add('LAND_PRIMARY',land,'primary_missile_weapon',prefix);
  for(const e of required(land,'engine','battlefield_engines'))add('ENGINE',e.row,'missile_weapon',[...prefix,e.edge]);
  for(const a of reverse('land_units_to_battle_personalities_junctions','land_unit',land))for(const p of required(a,'battle_personality','battle_personalities'))
    for(const s of required(p.row,'battle_entity_stats','battle_entity_stats'))add('RIDER',s.row,'primary_missile_weapon',[...prefix,...g.links(a,'land_unit','land_units').map(x=>x.edge),p.edge,s.edge]);
  for(const j of reverse('unit_missile_weapon_junctions','unit',main)) {
    const effects=reverse('effect_bonus_value_missile_weapon_junctions','missile_weapon_junction',j).map(e=>({rowId:e.id,raw:e.row,effects:required(e,'effect','effects').map(x=>({rowId:x.row.id,raw:x.row.row,edge:x.edge}))}));
    const membership=g.links(j,'unit','main_units').map(x=>x.edge);
    add('MAIN_JUNCTION',j,'missile_weapon',membership,{effects,activation:'UNRESOLVED_NOT_APPLIED'});
    for(const s of required(j,'battle_entity_stats_override','battle_entity_stats'))add('JUNCTION_STATS_OVERRIDE',s.row,'primary_missile_weapon',[...membership,s.edge],{effects,activation:'UNRESOLVED_NOT_APPLIED'});
  }
  const ammo=Object.fromEntries(['primary_ammo','secondary_ammo','infinite_secondary_ammo'].map(f=>[f,g.fact(land,f)]));
  return {mainRowId:main.id,landRowId:land.id,paths,issues,ammo,category:g.fact(land,'category')?.value,class:g.fact(land,'class')?.value,
    mount:g.fact(land,'mount')?.value,engine:g.fact(land,'engine')?.value,articulated:g.fact(land,'articulated_record')?.value};
}

// All candidate reference profiles, including optional effects, must agree for
// an admitted field. Thus no default/alternate/rider/conditional precedence is
// invented. Explosion/multi-shot damage is held unless already separately
// reviewed in the immutable baseline. No multiplication or damage aggregation.
export function predictMissile(t,original={}) {
  const values={},review={};
  const noWeapon=!t.paths.length&&!t.issues.length&&t.ammo&&
    ['primary_ammo','secondary_ammo'].every(f=>t.ammo[f]?.value===0)&&t.ammo.infinite_secondary_ammo?.value===false;
  if(noWeapon)return {status:'N/A',values,review,rule:'CLOSED_NO_REGULAR_WEAPON_AND_EXPLICIT_ZERO_AMMO'};
  const candidates=t.paths.flatMap(p=>p.projectiles.map(x=>({path:p,projectile:x})));
  for(const [field,raw] of Object.entries(fields)) {
    const damage=['baseDamage','armorPiercingDamage'].includes(field);
    let reason=t.issues.length?'INCOMPLETE_DB_CHAIN':!candidates.length?'WEAPON_APPLICABILITY_UNRESOLVED':null;
    const facts=candidates.map(x=>x.projectile.facts[raw]);
    if(!reason&&facts.some(f=>!f||typeof f.value!=='number'||!Number.isFinite(f.value)||f.value<0||(field!=='baseTime'&&!Number.isSafeInteger(f.value))))reason='MISSING_OR_INVALID_NAMED_VALUE';
    if(!reason&&new Set(facts.map(f=>f.value)).size!==1)reason='CANDIDATE_PROFILES_DISAGREE';
    if(!reason&&candidates.some(x=>Object.values(x.path.flags).some(f=>!f)||x.path.flags.precursor.value||x.path.flags.hide_secondary_range_ammo_statistics_ui.value))reason='PRECURSOR_OR_HIDDEN_SECONDARY_DISPLAY_UNVALIDATED';
    if(!reason&&damage&&candidates.some(x=>{
      const f=x.projectile.facts;
      return ['projectile_number','shots_per_volley','burst_size'].some(k=>f[k]?.value!==1)||
        ['explosion_type','scaling_damage','spawned_vortex'].some(k=>!f[k]||nonempty(f[k].value));
    })&&original[field]===undefined)reason='COMPOSITE_DAMAGE_DISPLAY_HELD';
    if(original[field]!==undefined) {
      // Existing fields survive only when the complete source proves exactly
      // their original raw meaning. A changed baseline fails the build below.
      if(t.issues.length||!facts.length||facts.some(f=>f?.value!==original[field]))throw new Error('Existing missile source regression: '+t.id+'.'+field);
      values[field]=original[field];review[field]={status:'COMPLETE',kind:'PRESERVED_CA_STATIC_ADMISSION',reason:null};
    } else if(reason)review[field]={status:'UNKNOWN',reason};
    else {values[field]=facts[0].value;review[field]={status:'COMPLETE',kind:'CA_REFERENCE_PROFILE_INVARIANT',reason:null};}
  }
  const n=Object.keys(values).length;
  return {status:n===4?'COMPLETE':n?'PARTIAL':'UNKNOWN',values,review,rule:'EXACT_SCHEMA_ALL_CANDIDATE_FIELD_INVARIANT'};
}
