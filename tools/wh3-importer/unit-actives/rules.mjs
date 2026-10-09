import assert from 'node:assert/strict';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {sourceHash as membershipHash} from '../unit-attributes/review.mjs';
import {sourceHash as passiveHash,passiveName,passiveGraph} from '../unit-passives/review.mjs';
import {attributeLoc} from '../unit-attributes/review.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
export const unique=xs=>[...new Set(xs)].sort();
const rows=(s,t)=>s.rows.filter(r=>r.table===t);
const one=(s,t,f,k)=>{const rs=rows(s,t).filter(r=>r.row[f]===k);assert.equal(rs.length,1,`Missing/ambiguous ${t}.${f}=${k}`);return rs[0];};
export const sourceHash='424b116cd5817837f8c3be89283e633e5a37de62b3cbe0dd8c959a241d2fab07';
const toggleTable='unit_special_ability_to_special_ability_toggle_groups_junctions_tables';
const flagTables=['special_ability_to_invalid_usage_flags_tables','special_ability_to_auto_deactivate_flags_tables','special_ability_to_invalid_target_flags_tables','special_ability_to_recharge_contexts_tables'];
const legacyAliases={wh_dlc07_unit_formation_lance:'lance'};
const plain=text=>text.replace(/\[\[img:[\s\S]*?\]\]\[\[\/img\]\]/g,'').replace(/\[\[[^\]]+\]\]/g,'').trim();
export function classifyActive(source,membership,key){
  let definition,special;
  try{definition=one(membership,'unit_abilities_tables','key',key);special=one(source,'unit_special_abilities_tables','key',key);}catch{return {key,status:'HOLD',kind:'MISSING_REFERENCE',reason:'Ability definition or special ability is missing/ambiguous.'};}
  const d=definition.row,p=special.row;
  const sourceRowIds=[definition.id,special.id,one(membership,'unit_ability_source_types_tables','key',d.source_type).id];
  const decision=(status,kind,reason)=>({key,status,kind,reason,sourceType:d.source_type,uiType:d.type,passive:p.passive,sourceRowIds});
  for(const f of ['requires_effect_enabling','is_hidden_in_ui','is_hidden_in_ui_for_enemy'])assert.equal(typeof d[f],'boolean');
  assert.equal(typeof p.passive,'boolean');
  if(d.is_hidden_in_ui)return decision('EXCLUDED','HIDDEN_INTERNAL','Explicitly hidden everywhere in UI. Raw identity retained for audit; never admitted from Loc alone.');
  if(d.requires_effect_enabling)return decision('EXCLUDED','ACQUIRED_UNLOCK','Invisible until enabled via campaign data/skill. Default junction is capacity, not a default unlocked ability.');
  if(d.source_type==='passive'&&p.passive)return decision('EXCLUDED','PASSIVE','Agreeing CA passive source and passive flag; handled by the existing passive slice.');
  if(p.passive||!['active','unit','bound','spell'].includes(d.source_type))return decision('HOLD','TYPE_CONFLICT','Source type and passive flag disagree; no activation flag/name heuristic resolves the conflict.');
  if(d.source_type==='spell')return decision('HOLD','SPELL_BOUND_AMBIGUITY','Native spell source, zero mana and limited uses do not alone prove a default bound spell. Retain raw direct ownership candidate; lore-spell list is not imported.');
  if(p.intensity_based_activation)return decision('HOLD','AUTOMATIC_ACTIVATION','Schema explicitly specifies automatic intensity activation; user control is unverified.');
  let name,graph;
  try{name=passiveName(source,key);graph=passiveGraph(source,key);}catch{return decision('HOLD','NAME_OR_GRAPH_UNRESOLVED','Exact official KO/EN Loc or required phase/condition reference is missing or ambiguous.');}
  if(!graph.phaseKeys.length&&!['activated_projectile','bombardment','vortex','spawned_unit','formation','behaviour'].some(f=>p[f]))return decision('HOLD','NO_EXECUTION_REFERENCE','Non-passive flags alone do not prove a public executable ability; no phase or native execution reference.');
  const type=one(source,'unit_ability_types_tables','key',d.type);
  const typeLabel=attributeLoc(source,'local_kr.pack',`unit_ability_types_onscreen_name_${d.type}`);
  const toggles=rows(source,toggleTable).filter(r=>r.row.unit_special_ability===key);
  const formation=p.formation&&d.type==='wh_type_formation'&&p.active_time===-1&&p.affect_self&&graph.phaseKeys.some(k=>one(source,'special_ability_phases_tables','id',k).row.duration===-1);
  const persistentSelf=p.active_time===-1&&p.affect_self&&!p.activated_projectile&&!p.bombardment&&!p.vortex;
  if(persistentSelf&&!toggles.length&&!formation)return decision('HOLD','TOGGLE_CONTROL_UNRESOLVED','Persistent self effect without a toggle-group or verified formation structure; do not infer toggle control from duration alone.');
  const kind=d.source_type==='bound'?'BOUND':toggles.length||formation?'TOGGLE':'ACTIVE';
  assert(!(kind==='BOUND'&&(toggles.length||formation)),'Unreviewed bound toggle');
  for(const t of toggles)sourceRowIds.push(t.id,one(source,'special_ability_exclusive_toggle_groups_tables','key',t.row.special_ability_toggle_groups).id);
  return {...decision('ADMITTED',kind,'Direct default unit assignment, agreeing native non-passive source/flag, public unlocked identity and resolved source graph.'),...name,
    canonicalId:legacyAliases[key]??key,typeLabel:plain(typeLabel.text),enemyHidden:d.is_hidden_in_ui_for_enemy,
    toggleGroups:unique(toggles.map(r=>r.row.special_ability_toggle_groups)),controlEvidence:formation?'VERIFIED_FORMATION_STRUCTURE':toggles.length?'CA_EXCLUSIVE_TOGGLE_GROUP':'CA_ACTIVE_SOURCE_AND_NON_PASSIVE',
    graph,sourceRowIds:unique([...sourceRowIds,...name.sourceRowIds,...typeLabel.rowIds,type.id,...graph.sourceRowIds])};
}

// Canonical aliases require all definition, runtime, condition and phase data
// to agree. Presentation names alone and parent links never prove equivalence.
export function activeSignature(source,membership,key){
  const omit=(v,keys)=>Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k)));
  const tables=['special_ability_to_special_ability_phase_junctions_tables',...flagTables,toggleTable,'special_ability_behaviour_to_ability_junctions_tables'];
  return evidenceHash({definition:omit(one(membership,'unit_abilities_tables','key',key).row,['key']),special:omit(one(source,'unit_special_abilities_tables','key',key).row,['key','unique_id']),related:Object.fromEntries(tables.map(t=>[t,rows(source,t).filter(r=>[r.row.special_ability,r.row.unit_special_ability,r.row.ability].includes(key)).map(r=>omit(r.row,['special_ability','unit_special_ability','ability'])).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]))});
}

export function reviewActives(source,membership,passiveSource,roster,units,attributes,passives){
  assert.equal(evidenceHash(source),sourceHash,'Active source hash drift');
  assert.equal(evidenceHash(membership),membershipHash,'Membership source drift');assert.equal(evidenceHash(passiveSource),passiveHash,'Passive source drift');
  assert.equal(source.membershipSourceHash,membershipHash);assert.equal(source.passiveSourceHash,passiveHash);assert.equal(source.gameExecuted,false);
  assert.deepEqual(source.provenance,membership.provenance);assert.deepEqual(source.provenance,roster.provenance);
  const all={rows:[...new Map([...source.rows,...passiveSource.rows].map(r=>[r.id,r])).values()],localisations:source.localisations};
  assert.equal(new Set(source.rows.map(r=>r.id)).size,source.rows.length);
  const schema=(s,t,f,ref)=>assert.deepEqual(s.schemas.find(x=>x.table===t)?.fields.find(x=>x.name===f)?.is_reference,ref,`Reference drift ${t}.${f}`);
  schema(membership,'land_units_to_unit_abilites_junctions_tables','land_unit',['land_units','key']);schema(membership,'land_units_to_unit_abilites_junctions_tables','ability',['unit_abilities','key']);
  schema(membership,'unit_abilities_tables','source_type',['unit_ability_source_types','key']);schema(membership,'unit_abilities_tables','type',['unit_ability_types','key']);
  schema(source,'unit_special_abilities_tables','key',['unit_abilities','key']);schema(source,toggleTable,'unit_special_ability',['unit_special_abilities','key']);schema(source,toggleTable,'special_ability_toggle_groups',['special_ability_exclusive_toggle_groups','key']);
  schema(source,'special_ability_to_special_ability_phase_junctions_tables','special_ability',['unit_special_abilities','key']);schema(source,'special_ability_to_special_ability_phase_junctions_tables','phase',['special_ability_phases','id']);
  for(const [t,f]of [[flagTables[0],'invalid_usage_flag'],[flagTables[1],'deactivate_flag'],[flagTables[2],'invalid_target'],[flagTables[3],'recharge_context']]){schema(source,t,'special_ability',['unit_special_abilities','key']);schema(source,t,f,['special_ability_invalid_usage_flags','flag_key']);}
  for(const s of [source,membership])for(const c of s.coverage){assert.equal(rows(s,c.query.table).filter(r=>c.query.where.every(w=>w.value.includes(r.row[w.field]))).length,c.matchedRows,'Incomplete exact-key query');assert.equal(c.tableFiles,1,'Unreviewed table precedence');}
  const classifications=rows(membership,'unit_abilities_tables').map(r=>classifyActive(all,membership,r.row.key));
  const admitted=classifications.filter(c=>c.status==='ADMITTED'),aliasGroups=[];
  const groups=new Map();
  for(const c of admitted){const signature=activeSignature(all,membership,c.key);const k=JSON.stringify([c.kind,c.name,c.englishName,signature]);const group=groups.get(k)??[];group.push(c);groups.set(k,group);}
  for(const g of groups.values())if(g.length>1){const canonicalId=unique(g.map(c=>c.canonicalId))[0];g.forEach(c=>c.canonicalId=canonicalId);aliasGroups.push({canonicalId,rawKeys:unique(g.map(c=>c.key)),evidence:'Exact definition/runtime/phase/condition signature and official KO/EN identity'});}
  aliasGroups.push({canonicalId:'lance',rawKeys:['wh_dlc07_unit_formation_lance'],evidence:'Existing app ID retained; exact CA formation source and five previous unit lists re-proved'});
  const identities=unique(admitted.map(c=>c.canonicalId));assert(identities.every(id=>!Object.hasOwn(passives.labels,id)&&!Object.hasOwn(attributes.labels,id)),'Active/bound/passive/attribute canonical overlap');
  const decisions=new Map(classifications.map(c=>[c.key,c])),production=units.filter(u=>u.gameVersion!=='sample'),admissions=[];
  assert.deepEqual(membership.requests.map(r=>r.id),production.map(u=>u.id));
  for(const u of production){
    const request=membership.requests.find(r=>r.id===u.id),main=one({rows:roster.preflight.rows},'main_units_tables','unit',request.mainKey),land=one({rows:roster.preflight.rows},'land_units_tables','key',request.landKey);
    assert.equal(main.row.land_unit,land.row.key);assert.equal(u.gameVersion,source.provenance.gameVersion);
    const queried=membership.coverage.find(c=>c.query.table==='land_units_to_unit_abilites_junctions_tables'&&c.query.where[0].value.includes(request.landKey));assert(queried,'Unqueried inventory');
    const junctions=rows(membership,'land_units_to_unit_abilites_junctions_tables').filter(r=>r.row.land_unit===request.landKey),facts=[],withheld=[],excluded=[];
    for(const j of junctions){const d=decisions.get(j.row.ability);assert(d);const evidence={rawKey:d.key,kind:d.kind,reason:d.reason,assignmentCulture:j.row.culture,sourceRowIds:unique([main.id,land.id,j.id,...d.sourceRowIds??[]])};
      if(d.status==='ADMITTED'&&!['*',''].includes(j.row.culture))withheld.push({...evidence,kind:'ASSIGNMENT_CONTEXT',reason:'Specific battle culture is unverified as unconditional base ownership.'});
      else if(d.status==='ADMITTED')facts.push({...evidence,canonicalId:d.canonicalId});
      else if(d.status==='HOLD')withheld.push(evidence);else excluded.push(evidence);
    }
    const ordinary=unique(facts.filter(f=>f.kind!=='BOUND').map(f=>f.canonicalId)),bound=unique(facts.filter(f=>f.kind==='BOUND').map(f=>f.canonicalId));
    for(const old of u.abilities??[])assert(ordinary.includes(old),`Previous active not re-proved: ${u.id}/${old}`);
    const abilities=[...(u.abilities??[]),...ordinary.filter(id=>!u.abilities?.includes(id))];
    const status=!withheld.length?'COMPLETE':facts.length?'PARTIAL':'UNKNOWN';
    admissions.push({id:u.id,mainKey:request.mainKey,landKey:request.landKey,originalAbilities:u.abilities??null,status,
      ...(status!=='UNKNOWN'?{abilities,boundAbilities:bound}:{}),facts,withheld,excluded,inventoryRowIds:unique([main.id,land.id,...junctions.map(j=>j.id)]),membershipQuery:queried.query});
  }
  const labels=Object.fromEntries(admitted.map(c=>[c.canonicalId,c.name]));
  const definitions=Object.fromEntries(admitted.map(c=>[c.canonicalId,{id:c.canonicalId,name:c.name,englishName:c.englishName,kind:c.kind,type:c.uiType,typeLabel:c.typeLabel,sourceType:c.sourceType,rawKeys:unique(admitted.filter(d=>d.canonicalId===c.canonicalId).map(d=>d.key)),enemyHidden:c.enemyHidden,toggleGroups:c.toggleGroups,conditionReferences:c.graph.conditionReferences,phaseKeys:c.graph.phaseKeys,parentAbility:c.graph.parentAbility,activationStatus:'NOT_EVALUATED',sourceRowIds:c.sourceRowIds}]));
  const counts=key=>Object.fromEntries(unique(classifications.filter(c=>c.status===key).map(c=>c.kind)).map(k=>[k,classifications.filter(c=>c.status===key&&c.kind===k).length]));
  const summary={before:production.filter(u=>u.abilities!==undefined).length,after:admissions.filter(a=>a.abilities!==undefined).length,unknownBefore:production.filter(u=>u.abilities===undefined).length,unknownAfter:admissions.filter(a=>a.status==='UNKNOWN').length,
    statuses:Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN'].map(k=>[k,admissions.filter(a=>a.status===k).length])),nonemptyActive:admissions.filter(a=>a.abilities?.length).length,nonemptyBound:admissions.filter(a=>a.boundAbilities?.length).length,nonemptyAny:admissions.filter(a=>a.facts.length).length,
    confirmedEmpty:admissions.filter(a=>a.status==='COMPLETE'&&!a.abilities.length&&!a.boundAbilities.length).length,ordinaryEmptyIncludingBound:admissions.filter(a=>a.abilities?.length===0&&!a.withheld.length).length,
    distinctActive:unique(admissions.flatMap(a=>a.facts.filter(f=>f.kind!=='BOUND').map(f=>f.canonicalId))).length,distinctBound:unique(admissions.flatMap(a=>a.facts.filter(f=>f.kind==='BOUND').map(f=>f.canonicalId))).length,classifiedActiveIdentities:unique(admitted.filter(c=>c.kind!=='BOUND').map(c=>c.canonicalId)).length,toggleRawKeys:admitted.filter(c=>c.kind==='TOGGLE').length,toggleUnits:admissions.filter(a=>a.facts.some(f=>f.kind==='TOGGLE')).length,
    rawKeys:classifications.length,nonPassiveRawKeys:classifications.filter(c=>c.sourceType!=='passive').length,landGroups:unique(admissions.map(a=>a.landKey)).length,junctions:rows(membership,'land_units_to_unit_abilites_junctions_tables').length,admittedByKind:counts('ADMITTED'),heldByKind:counts('HOLD'),excludedByKind:counts('EXCLUDED'),canonicalOverlap:0,koreanNameCoverage:identities.filter(id=>/[가-힣]/.test(labels[id])).length,canonicalTotal:identities.length};
  const metadata={format:'ca-unit-active-admission-v1',gameVersion:source.provenance.gameVersion,sourceHash,membershipSourceHash:membershipHash,passiveSourceHash:passiveHash,koreanPackHash:source.koreanPackHash};
  return {review:{...metadata,summary,classifications,admissions,aliasGroups,externalGrantRowIds:rows(source,'effect_bonus_value_unit_ability_junctions_tables').map(r=>r.id),externalUnitSetRowIds:rows(source,'unit_set_unit_ability_junctions_tables').map(r=>r.id),gameExecuted:false},projection:{...metadata,labels,definitions,admissions:admissions.map(({id,originalAbilities,status,abilities,boundAbilities,withheld,facts})=>({id,originalAbilities,status,...(abilities!==undefined?{abilities,boundAbilities}:{}),heldKeys:unique(withheld.map(w=>w.rawKey)),rawKeys:unique(facts.map(f=>f.rawKey))}))}};
}

export function compareIndependent(roster,review){
  // Earlier separately captured per-unit BFS traces, not the new batch query.
  const selected=review.admissions.filter(a=>roster.candidates.some(c=>c.id===a.id));
  return selected.map(a=>{const c=roster.candidates.find(c=>c.id===a.id),dump=restoreTrace(roster,c.trace),actual=unique(dump.rows.filter(r=>r.table==='land_units_to_unit_abilites_junctions_tables'&&r.row.land_unit===a.landKey).map(r=>r.row.ability)),expected=unique([...a.facts,...a.withheld,...a.excluded].map(f=>f.rawKey));assert.deepEqual(actual,expected,`Independent inventory drift ${a.id}`);return {id:a.id,expected,actual,match:true,method:'Earlier independent bounded per-unit CA BFS trace; not game UI measurement'};});
}

export function verifyRepresentatives(validation,source,membership,passiveSource,roster,review,projection){
  assert.equal(validation.gameExecuted,false);assert.deepEqual(validation.provenance,source.provenance);
  const allRows=[...new Map([...source.rows,...membership.rows,...passiveSource.rows,...roster.preflight.rows].map(r=>[r.id,r])).values()];
  for(const r of validation.rows){const original=allRows.find(v=>v.id===r.id);assert(original,'New independent raw identity '+r.id);assert.deepEqual(r.row,original.row,'Independent definition drift');}
  for(const c of validation.coverage){assert.equal(c.tableFiles,1);assert.equal(validation.rows.filter(r=>r.table===c.query.table&&c.query.where.every(w=>r.row[w.field]===w.value)).length,c.matchedRows);}
  const mainRef=validation.schemas.find(s=>s.table==='main_units_tables').fields.find(f=>f.name==='land_unit');assert.deepEqual(mainRef.is_reference,['land_units','key']);
  return validation.comparisons.map(c=>{
    const a=review.admissions.find(a=>a.id===c.id);assert(a);assert.equal(a.mainKey,c.mainKey);assert.equal(a.landKey,c.landKey);
    const actual=unique(validation.rows.filter(r=>r.table==='land_units_to_unit_abilites_junctions_tables'&&r.row.land_unit===c.landKey).map(r=>r.row.ability));assert.deepEqual(actual,c.expected);assert.deepEqual(actual,c.actual);
    assert.equal(a.status,c.status);assert.deepEqual(a.abilities??null,c.abilities);assert.deepEqual(a.boundAbilities??null,c.boundAbilities);
    return {...c,details:actual.map(key=>{const d=review.classifications.find(d=>d.key===key),fact=a.facts.find(f=>f.rawKey===key),p=fact?projection.definitions[fact.canonicalId]:null;
      return {rawKey:key,sourceType:d.sourceType,uiType:d.uiType,classification:d.kind,productionLabel:p?.name??null,canonicalId:fact?.canonicalId??null,displayed:!!p,activePassiveAttributeOverlap:0,confidence:p?'VERIFIED_CA_BASE_REFERENCE':'EXCLUDED_OR_HELD_RAW_REFERENCE',gameUiMeasured:false};})};
  });
}
