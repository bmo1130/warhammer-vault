import assert from 'node:assert/strict';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {sourceHash as membershipSourceHash,attributeLoc} from '../unit-attributes/review.mjs';
import {unitsHash,koreanPackHash} from '../unit-localisation/review.mjs';
import {rosterSourceHash,discoverRoster} from '../production-growth/roster.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';

export const sourceHash='4e6df2a96af6038d8e684fae699a4eae9a7356adfeadc480a805f91d39f626cb';
export const mappingHash='963d42c6f403e6beb2acefa5e10eb8218748f2927baae06ca2cbbdafab4ce4b2';
const unique=values=>[...new Set(values)].sort();
const rows=(s,t)=>s.rows.filter(r=>r.table===t);
const one=(s,t,f,k)=>{const found=rows(s,t).filter(r=>r.row[f]===k);assert.equal(found.length,1,`Missing/ambiguous ${t}.${f}=${k}`);return found[0];};
const plain=text=>text.replace(/\[\[img:[\s\S]*?\]\]\[\[\/img\]\]/g,'').replace(/\[\[[^\]]+\]\]/g,'').trim();
const flagFields={special_ability_to_invalid_usage_flags_tables:'invalid_usage_flag',special_ability_to_auto_deactivate_flags_tables:'deactivate_flag',special_ability_to_invalid_target_flags_tables:'invalid_target',special_ability_to_recharge_contexts_tables:'recharge_context'};
const omit=(record,fields)=>Object.fromEntries(Object.entries(record).filter(([key])=>!fields.includes(key)));

export function passiveName(source,key){
  const locKey=`unit_abilities_onscreen_name_${key}`;
  const en=attributeLoc(source,'local_en.pack',locKey),ko=attributeLoc(source,'local_kr.pack',locKey);
  const englishName=plain(en.text),name=plain(ko.text);
  assert(englishName&&name&&/[가-힣]/.test(name)&&!name.includes('{{')&&!englishName.includes('{{')&&!/\[\[|\]\]/.test(name),'Unresolved passive identity name');
  return {englishName,name,localisationKey:locKey,sourceRowIds:unique([...en.rowIds,...ko.rowIds])};
}

// Ownership is independent of activation. This graph preserves raw references
// and flags; even an empty flag list never proves an always-active ability.
export function passiveGraph(source,key){
  const special=one(source,'unit_special_abilities_tables','key',key),ids=[special.id];
  const links=rows(source,'special_ability_to_special_ability_phase_junctions_tables').filter(r=>r.row.special_ability===key);
  ids.push(...links.map(r=>r.id));
  const phaseKeys=unique(links.map(r=>r.row.phase)),seen=new Set(),phases=[];
  for(let i=0;i<phaseKeys.length;i++){
    const phaseKey=phaseKeys[i];if(seen.has(phaseKey))continue;seen.add(phaseKey);
    const p=one(source,'special_ability_phases_tables','id',phaseKey);
    phases.push(p);ids.push(p.id);
    if(p.row.imbue_contact)phaseKeys.push(p.row.imbue_contact);
    for(const table of ['special_ability_phase_stat_effects_tables','special_ability_phase_attribute_effects_tables'])ids.push(...rows(source,table).filter(r=>r.row.phase===phaseKey).map(r=>r.id));
  }
  const conditions=[];
  for(const [table,field]of Object.entries(flagFields))for(const r of rows(source,table).filter(r=>r.row.special_ability===key)){
    ids.push(r.id,one(source,'special_ability_invalid_usage_flags_tables','flag_key',r.row[field]).id);
    conditions.push({table,field,rawFlag:r.row[field],sourceRowId:r.id});
  }
  const behaviour=special.row.behaviour;
  if(behaviour){ids.push(one(source,'special_ability_behaviour_groups_tables','group',behaviour).id);ids.push(...rows(source,'special_ability_behaviour_groups_to_types_tables').filter(r=>r.row.group===behaviour).map(r=>r.id));}
  ids.push(...rows(source,'special_ability_behaviour_to_ability_junctions_tables').filter(r=>r.row.ability===key).map(r=>r.id));
  const ui=rows(source,'ability_to_ui_collection_junctions_tables').filter(r=>r.row.ability===key);
  for(const r of ui)ids.push(r.id,one(source,'ability_ui_collections_tables','ability_collection',r.row.collection).id);
  return {phaseReferences:links.map(r=>({sourceRowId:r.id,...r.row})),phaseKeys:unique(phases.map(p=>p.row.id)),conditionReferences:conditions,behaviour,parentAbility:special.row.parent_ability,sourceRowIds:unique(ids),activationStatus:'NOT_EVALUATED'};
}

// Exact identity equivalence for the explicitly reviewed Guardian family.
// Preserve unique engine IDs and UI visuals in raw evidence. No other timing,
// targeting, condition or phase reference is normalized away.
export function passiveSignature(source,membership,key){
  const definition=one(membership,'unit_abilities_tables','key',key);
  const special=one(source,'unit_special_abilities_tables','key',key);
  const related=Object.fromEntries(['special_ability_to_special_ability_phase_junctions_tables',...Object.keys(flagFields),'special_ability_behaviour_to_ability_junctions_tables'].map(t=>[t,rows(source,t).filter(r=>r.row.special_ability===key||r.row.ability===key).map(r=>omit(r.row,['special_ability','ability'])).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
  return evidenceHash({definition:omit(definition.row,['key','icon_name']),special:omit(special.row,['key','unique_id','targetting_aoe','passive_aoe']),related});
}

export function classifyPassive(source,membership,key,mappings){
  const definition=one(membership,'unit_abilities_tables','key',key),special=one(source,'unit_special_abilities_tables','key',key);
  const d=definition.row,p=special.row;
  const sourceRowIds=[definition.id,special.id,one(membership,'unit_ability_source_types_tables','key',d.source_type).id];
  const decision=(status,kind,reason)=>({key,status,kind,reason,sourceType:d.source_type,passive:p.passive,sourceRowIds});
  assert.equal(typeof p.passive,'boolean');
  for(const field of ['requires_effect_enabling','is_hidden_in_ui','is_hidden_in_ui_for_enemy'])assert.equal(typeof d[field],'boolean');
  if(d.source_type==='spell'&&p.passive===false)return decision('EXCLUDED','SPELL','CA spell source and passive=false; not a unit passive.');
  if(d.source_type==='bound'&&p.passive===false)return decision('EXCLUDED','BOUND','CA bound source and passive=false; not automatically a spell or a passive.');
  if(d.source_type==='active'&&p.passive===false)return decision('EXCLUDED','ACTIVE','Agreeing CA active source and passive=false.');
  if(d.source_type==='unit'&&p.passive===false)return decision('EXCLUDED','ACTIVE_UNIT','CA unit-source ability with passive=false.');
  if(d.source_type!=='passive'||p.passive!==true)return decision('HOLD','TYPE_CONFLICT','Source type and actual passive flag conflict or are unreviewed.');
  if(d.is_hidden_in_ui)return decision('HOLD','HIDDEN','CA explicitly hides this ability everywhere in UI; internal role is not a public unit passive identity.');
  if(d.requires_effect_enabling)return decision('HOLD','CAMPAIGN_UNLOCK','CA schema says invisible until enabled via campaign effect/skill data; base junction proves capacity, not default ownership.');
  let name;
  try{name=passiveName(source,key);}catch{return decision('HOLD','NAME_UNRESOLVED','Exact CA Loc identity is missing, ambiguous, cyclic or unresolved.');}
  const mapping=mappings?.entries.find(e=>e.rawKey===key);
  if(mappings&&!mapping)return decision('HOLD','UNREVIEWED_MAPPING','No explicit reviewed mapping.');
  if(mapping){assert.equal(name.englishName,mapping.englishName,'Passive meaning drift');assert.equal(name.name,mapping.name);assert.equal(passiveSignature(source,membership,key),mapping.signature,'Passive variant/reference drift');}
  return {...decision('ADMITTED','BASE_UNIT_PASSIVE','Exact native passive identity; only direct, non-unlock unit membership can admit ownership.'),...name,canonicalId:mapping?.canonicalId??key,sourceRowIds:unique([...sourceRowIds,...name.sourceRowIds]),graph:passiveGraph(source,key)};
}

export function reviewUnitPassives(source,membership,roster,units,attributes,mappings){
  assert.equal(evidenceHash(source),sourceHash,'Passive source hash drift');
  assert.equal(evidenceHash(membership),membershipSourceHash,'Ability membership source hash drift');
  assert.equal(evidenceHash(units),unitsHash,'Unit baseline drift');
  assert.equal(evidenceHash(mappings),mappingHash,'Passive mapping hash drift');
  assert.equal(source.membershipSourceHash,membershipSourceHash);assert.equal(source.koreanPackHash,koreanPackHash);assert.equal(source.gameExecuted,false);
  assert.deepEqual(source.provenance,membership.provenance);assert.deepEqual(source.provenance,roster.provenance);
  assert.equal(source.format,'warhammer-vault-unit-passive-source-v1');
  assert.equal(mappings.sourceHash,sourceHash);assert.equal(mappings.membershipSourceHash,membershipSourceHash);
  assert.equal(new Set(source.rows.map(r=>r.id)).size,source.rows.length);
  const allRows=[...new Map([...membership.rows,...source.rows].map(r=>[r.id,r])).values()];
  const schemaField=(table,field,ref)=>{const defs=[...membership.schemas,...source.schemas].filter(s=>s.table===table);assert.equal(defs.length,1);assert.deepEqual(defs[0].fields.find(f=>f.name===field)?.is_reference,ref,'Passive schema reference drift');};
  schemaField('land_units_to_unit_abilites_junctions_tables','land_unit',['land_units','key']);
  schemaField('land_units_to_unit_abilites_junctions_tables','ability',['unit_abilities','key']);
  schemaField('unit_abilities_tables','source_type',['unit_ability_source_types','key']);
  schemaField('unit_special_abilities_tables','key',['unit_abilities','key']);
  schemaField('special_ability_to_special_ability_phase_junctions_tables','special_ability',['unit_special_abilities','key']);
  schemaField('special_ability_to_special_ability_phase_junctions_tables','phase',['special_ability_phases','id']);
  for(const [table,field]of Object.entries(flagFields)){
    schemaField(table,'special_ability',['unit_special_abilities','key']);
    schemaField(table,field,['special_ability_invalid_usage_flags','flag_key']);
  }
  for(const coverage of [...membership.coverage,...source.coverage]){
    assert.equal(allRows.filter(r=>r.table===coverage.query.table&&coverage.query.where.every(w=>w.value.includes(r.row[w.field]))).length,coverage.matchedRows,'Incomplete ability query');
    assert.equal(coverage.tableFiles,1,'Unreviewed pack precedence');
  }
  const abilitySchema=membership.schemas.find(s=>s.table==='unit_abilities_tables');
  assert(abilitySchema.localisedFields.some(f=>f.name==='onscreen_name'));
  assert(abilitySchema.fields.find(f=>f.name==='requires_effect_enabling').description.includes('invisible until'));
  assert(abilitySchema.fields.find(f=>f.name==='is_hidden_in_ui').description.includes('anywhere in the UI'));
  const classifications=rows(membership,'unit_abilities_tables').map(r=>classifyPassive(source,membership,r.row.key,mappings));
  const decisions=new Map(classifications.map(c=>[c.key,c]));
  const admitted=classifications.filter(c=>c.status==='ADMITTED');
  assert.deepEqual(unique(admitted.map(c=>c.key)),unique(mappings.entries.map(e=>e.rawKey)),'Mapping inventory drift');
  for(const group of mappings.aliasGroups){
    const family=admitted.filter(c=>group.rawKeys.includes(c.key));assert.equal(family.length,group.rawKeys.length);
    assert.equal(new Set(family.map(c=>c.canonicalId)).size,1);assert.equal(new Set(family.map(c=>c.englishName)).size,1);assert.equal(new Set(family.map(c=>c.name)).size,1);
    assert.equal(new Set(family.map(c=>passiveSignature(source,membership,c.key))).size,1,'Alias semantics differ');
  }
  const canonicalIds=unique(admitted.map(c=>c.canonicalId)),attributeIds=Object.keys(attributes.labels);
  assert(canonicalIds.every(id=>!attributeIds.includes(id)),'Passive/attribute canonical ID overlap');
  assert(admitted.every(c=>!rows(membership,'unit_attributes_tables').some(r=>r.row.key===c.key)),'Native attribute/ability key overlap');
  const labels=Object.fromEntries(admitted.map(c=>[c.canonicalId,c.name]));
  const production=units.filter(u=>u.gameVersion!=='sample'),entries=new Map(discoverRoster(roster).flatMap(r=>r.units).map(e=>[e.id,e]));
  assert.deepEqual(membership.requests.map(r=>r.id),production.map(u=>u.id));
  const admissions=[];
  for(const u of production){
    const e=entries.get(u.id),r=membership.requests.find(r=>r.id===u.id);assert(e&&e.mainKey===r.mainKey&&e.landKey===r.landKey&&u.gameVersion===source.provenance.gameVersion);
    const main=one({rows:roster.preflight.rows},'main_units_tables','unit',r.mainKey),land=one({rows:roster.preflight.rows},'land_units_tables','key',r.landKey);assert.equal(main.row.land_unit,r.landKey);
    const junctions=rows(membership,'land_units_to_unit_abilites_junctions_tables').filter(j=>j.row.land_unit===r.landKey);
    assert(membership.coverage.some(c=>c.query.table==='land_units_to_unit_abilites_junctions_tables'&&c.query.where[0].value.includes(r.landKey)),'Unqueried land ability inventory');
    const candidate=roster.candidates.find(c=>c.id===u.id);
    if(candidate){const dump=restoreTrace(roster,candidate.trace),f=factSelectors(dump),c=observationContext(dump,f);assert.equal(f.fact(c.land,'key').value,r.landKey);const keys=dump.rows.filter(j=>j.table==='land_units_to_unit_abilites_junctions_tables'&&j.row.land_unit===r.landKey&&f.reachable(j)).map(j=>f.fact(f.follow(j,'ability'),'key')?.value);assert.deepEqual(unique(keys),unique(junctions.map(j=>j.row.ability)),'Trace/direct ability inventory differs');}
    const facts=[],withheld=[],excluded=[];
    for(const j of junctions){
      const d=decisions.get(j.row.ability);assert(d);
      const evidence={rawKey:d.key,sourceRowIds:unique([main.id,land.id,j.id,...d.sourceRowIds]),assignmentCulture:j.row.culture};
      // No culture-scoped passive is in this snapshot, but never let a future
      // assignment context silently turn into unconditional base ownership.
      if(d.status==='ADMITTED'&&!['*',''].includes(j.row.culture))withheld.push({...evidence,kind:'ASSIGNMENT_CONTEXT',reason:'Specific battle culture assignment is not default unconditional ownership.'});
      else if(d.status==='ADMITTED')facts.push({...evidence,canonicalId:d.canonicalId,kind:'DIRECT_LAND_UNIT_PASSIVE',graphKey:d.key});
      else if(d.status==='HOLD')withheld.push({...evidence,kind:d.kind,reason:d.reason});
      else excluded.push({...evidence,kind:d.kind,reason:d.reason});
    }
    const derived=unique(facts.map(f=>f.canonicalId));
    for(const old of u.passiveAbilities??[])assert(derived.includes(old),`Previous passive not proved ${u.id}/${old}`);
    const passiveAbilities=[...(u.passiveAbilities??[]),...derived.filter(id=>!u.passiveAbilities?.includes(id))];
    const active=u.abilities??[];assert(passiveAbilities.every(id=>!active.includes(id)),'Passive/active overlap');
    admissions.push({id:u.id,mainKey:r.mainKey,landKey:r.landKey,originalPassiveAbilities:u.passiveAbilities??null,passiveAbilities,status:withheld.length?'PARTIAL':'COMPLETE',facts,withheld,excluded});
  }
  const known=admissions.filter(a=>a.passiveAbilities.length||a.status==='COMPLETE');
  const summary={before:production.filter(u=>u.passiveAbilities!==undefined).length,after:known.length,unknownBefore:production.filter(u=>u.passiveAbilities===undefined).length,unknownAfter:production.length-known.length,nonempty:admissions.filter(a=>a.passiveAbilities.length).length,knownEmpty:admissions.filter(a=>!a.passiveAbilities.length&&a.status==='COMPLETE').length,complete:admissions.filter(a=>a.status==='COMPLETE').length,partial:admissions.filter(a=>a.status==='PARTIAL').length,canonicalPassives:unique(admissions.flatMap(a=>a.passiveAbilities)),rawKeys:classifications.length,passiveCandidates:classifications.filter(c=>c.sourceType==='passive').length,admittedRawKeys:admitted.length,landGroups:unique(admissions.map(a=>a.landKey)).length,junctions:rows(membership,'land_units_to_unit_abilites_junctions_tables').length,excludedByKind:Object.fromEntries(unique(classifications.filter(c=>c.status==='EXCLUDED').map(c=>c.kind)).map(k=>[k,classifications.filter(c=>c.status==='EXCLUDED'&&c.kind===k).length])),heldByKind:Object.fromEntries(unique(classifications.filter(c=>c.status==='HOLD').map(c=>c.kind)).map(k=>[k,classifications.filter(c=>c.status==='HOLD'&&c.kind===k).length])),attributeOverlap:0};
  const metadata={format:'warhammer-vault-unit-passive-admission-v1',gameVersion:source.provenance.gameVersion,sourceHash,membershipSourceHash,rosterSourceHash,unitsHash,koreanPackHash,mappingHash:evidenceHash(mappings)};
  return {review:{...metadata,summary,classifications,admissions,aliasGroups:mappings.aliasGroups,externalCampaignGrantRowIds:rows(source,'effect_bonus_value_unit_ability_junctions_tables').map(r=>r.id),activationStatus:'NOT_EVALUATED'},projection:{...metadata,labels,admissions:admissions.map(({id,originalPassiveAbilities,passiveAbilities,status,withheld,facts})=>({id,originalPassiveAbilities,...(passiveAbilities.length||status==='COMPLETE'?{passiveAbilities}:{}),status,heldKeys:unique(withheld.map(w=>w.rawKey)),rawKeys:unique(facts.map(f=>f.rawKey))}))}};
}
