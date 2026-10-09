import assert from 'node:assert/strict';
const unique=xs=>[...new Set(xs)].sort();
const rows=(s,t)=>s.rows.filter(r=>r.table===t);
const one=(s,t,f,k)=>{const rs=rows(s,t).filter(r=>r.row[f]===k);assert.equal(rs.length,1,`Missing/ambiguous ${t}.${f}=${k}`);return rs[0];};
export const plain=text=>text.replace(/\[\[img:[\s\S]*?\]\]\[\[\/img\]\]/g,'').replace(/\[\[[^\]]+\]\]/g,'').replace(/\\+n/g,'\n').replace(/\|\|/g,'\n\n').trim();
export function resolveLoc(source,pack,key,stack=[]){
 assert(!stack.includes(key),'Cyclic Loc reference');
 let rs=source.localisations.filter(r=>r.sourcePack===pack&&r.row.key===key);
 if(!rs.length)rs=source.localisations.filter(r=>r.sourcePack===pack&&r.row.key===`ui_text_replacements_localised_text_${key}`);
 if(!rs.length)rs=source.localisations.filter(r=>r.sourcePack===pack&&r.row.key===`random_localisation_strings_string_${key}`);
 assert(rs.length,`Missing Loc ${pack}:${key}`);assert.equal(new Set(rs.map(r=>r.row.text)).size,1,'Ambiguous Loc text');
 const rowIds=rs.map(r=>r.id),text=rs[0].row.text.replace(/\{\{tr:([^}]+)\}\}/g,(_,child)=>{const c=resolveLoc(source,pack,child,[...stack,key]);rowIds.push(...c.rowIds);return c.text;});
 assert(!/\{\{|%[+\-]?[nsdf]/.test(text),'Unresolved runtime Loc token');
 return {key,text:plain(text),rowIds:unique(rowIds)};
}
function optionalLoc(source,key){for(const [pack,language]of [['local_kr.pack','ko'],['local_en.pack','en']])try{return {...resolveLoc(source,pack,key),language};}catch{}return undefined;}
const conditionFields={special_ability_to_invalid_usage_flags_tables:['invalid_usage_flag','INVALID_USAGE'],special_ability_to_auto_deactivate_flags_tables:['deactivate_flag','DEACTIVATE'],special_ability_to_invalid_target_flags_tables:['invalid_target','INVALID_TARGET'],special_ability_to_recharge_contexts_tables:['recharge_context','RECHARGE']};
const phaseValues={
 damage_amount:['개체당 피해','HP / 적용 주기'],heal_amount:['최대 생명력 회복','% / 적용 주기'],barrier_heal_amount:['최대 방어막 회복','% / 적용 주기'],
 fatigue_change_ratio:['최대 피로 변화','% / 초'],ability_recharge_change:['재충전 시간 변화','CA 원본'],replenish_ammo:['최대 탄약 변화','CA 원본 비율'],mana_regen_mod:['마법 충전 변화','CA 원본 / 초'],mana_max_depletion_mod:['최대 마법 고갈 변화','CA 원본'],execute_ratio:['즉사 생명력 기준','%'],inspiration_aura_range_mod:['리더십 오라 범위 변화','CA 원본'],
};
const phaseFlags={cant_move:'이동·공격 명령 불가',freeze_fatigue:'활력 신선함 유지',resurrect:'초과 회복 시 개체 부활',imbue_magical:'마법 공격 부여',imbue_ignition:'화염 공격 부여',freeze_recharge:'능력 재충전 정지',remove_magical:'마법 공격 제거'};
const fractionFields=['heal_amount','barrier_heal_amount','fatigue_change_ratio','execute_ratio'];
const paramLabels={active_time:['능력 지속시간','초'],recharge_time:['재충전 시간','초'],initial_recharge:['초기 재충전','초'],num_uses:['사용 횟수','회'],effect_range:['효과 범위','CA 거리'],min_range:['최소 대상 거리','CA 거리'],target_intercept_range:['대상 거리','CA 거리'],wind_up_time:['시전 준비','초']};
const externalFields=['activated_projectile','bombardment','vortex','spawned_unit','formation','behaviour','mom_vortex_key'];
export function buildDictionary({attributes,passives,actives,attributeAdmission,passiveAdmission,activeProjection,supplement}){
 assert.equal(supplement.gameExecuted,false);assert.deepEqual(supplement.provenance,attributes.provenance);
 const reference=(source,table,field,target)=>{const defs=source.schemas.filter(s=>s.table===table);assert.equal(defs.length,1);assert.deepEqual(defs[0].fields.find(f=>f.name===field)?.is_reference,target,`Unverified reference ${table}.${field}`);};
 for(const source of [passives,actives]){
  reference(source,'special_ability_to_special_ability_phase_junctions_tables','phase',['special_ability_phases','id']);
  reference(source,'special_ability_phase_stat_effects_tables','stat',['modifiable_unit_stats','stat_key']);
 }
 reference(supplement,'modifiable_unit_stats_tables','localisation',['unit_stat_localisations','stat_key']);
 assert(supplement.schemas.find(s=>s.table==='ui_text_replacements_tables')?.localisedFields.some(f=>f.name==='localised_text'),'Unverified text replacement field');
 for(const sample of supplement.rows.filter(r=>!['modifiable_unit_stats_tables','unit_stat_localisations_tables','ui_text_replacements_tables'].includes(r.table))){const prior=[...attributes.rows,...passives.rows,...actives.rows].find(r=>r.id===sample.id);assert(prior,`Fresh sample missing from prior evidence: ${sample.id}`);assert.deepEqual(sample,prior,'Fresh representative differs from pinned CA snapshot');}
 for(const c of supplement.coverage){assert.equal(c.tableFiles,1,'Unreviewed pack precedence');assert.equal(supplement.rows.filter(r=>r.table===c.query.table&&c.query.where.every(w=>w.value.includes(r.row[w.field]))).length,c.matchedRows,'Truncated supplement query');}
 const locSource={localisations:[...attributes.localisations,...passives.localisations,...actives.localisations,...supplement.localisations]};
 const byId=new Map();
 const ownedActive=new Set(activeProjection.admissions.flatMap(a=>[...(a.abilities??[]),...(a.boundAbilities??[])]));
 const identities=[
  ...attributeAdmission.classifications.filter(c=>c.status==='ADMITTED').map(c=>({id:c.canonicalId,category:'ATTRIBUTE',name:c.label,englishName:c.englishLabel,rawKeys:[c.key],sourceRowIds:c.sourceRowIds})),
  ...passiveAdmission.classifications.filter(c=>c.status==='ADMITTED').map(c=>({id:c.canonicalId,category:'PASSIVE',name:c.name,englishName:c.englishName,rawKeys:[c.key],sourceRowIds:c.sourceRowIds})),
  ...Object.values(activeProjection.definitions).filter(c=>ownedActive.has(c.id)).map(c=>({...c,category:c.kind})),
 ];
 for(const identity of identities){const existing=byId.get(identity.id);if(existing){assert.equal(existing.category,identity.category);assert.equal(existing.name,identity.name);assert.equal(existing.englishName,identity.englishName);existing.rawKeys=unique([...existing.rawKeys,...identity.rawKeys]);existing.sourceRowIds=unique([...existing.sourceRowIds,...identity.sourceRowIds]);}else byId.set(identity.id,{id:identity.id,category:identity.category,name:identity.name,englishName:identity.englishName,rawKeys:identity.rawKeys,sourceRowIds:identity.sourceRowIds});}
 const entries=[];
 for(const identity of [...byId.values()].sort((a,b)=>a.id.localeCompare(b.id))){
  const {sourceRowIds,...base}=identity,ids=[...sourceRowIds],held=[],phases=[],conditions=[],parameters=[],references=[],contextDescriptions=[];
  let activation=null;
  const rawKey=identity.rawKeys[0],attribute=identity.category==='ATTRIBUTE',source=identity.category==='PASSIVE'?passives:actives;
  const descKey=attribute?`unit_attributes_bullet_text_${rawKey}`:`unit_abilities_tooltip_text_${rawKey}`;
  const descriptions=[];
  for(const [pack,language]of [['local_kr.pack','ko'],['local_en.pack','en']])try{const loc=resolveLoc(locSource,pack,descKey);let text=loc.text;if(attribute&&text.includes('\n\n'))text=text.slice(text.indexOf('\n\n')+2).trim();if(!text||[identity.name,identity.englishName].includes(text))throw Error('Name-only Loc');descriptions.push({...loc,text,language});ids.push(...loc.rowIds);}catch(e){held.push({rawKey,reason:`${descKey} (${pack}): ${e.message}`});}
  // Alias admission established semantic equivalence. Never sum alias effects.
  // A description conflict is held rather than borrowing another alias's text.
  for(const alias of identity.rawKeys.slice(1))for(const d of descriptions)try{assert.equal(resolveLoc(locSource,d.language==='ko'?'local_kr.pack':'local_en.pack',`unit_abilities_tooltip_text_${alias}`).text,d.text,'Alias description differs');}catch(e){held.push({rawKey:alias,reason:e.message});}
  if(!attribute){
   const special=one(source,'unit_special_abilities_tables','key',rawKey);ids.push(special.id);
   activation={intensityBased:special.row.intensity_based_activation,ownedTargetsOnly:special.row.only_affect_owned_units,updateTargetsEveryFrame:special.row.update_targets_every_frame};
   for(const [field,[label,unit]]of Object.entries(paramLabels)){assert.equal(typeof special.row[field],'number');parameters.push({field,label,value:special.row[field],unit});}
   if(special.row.intensity_based_activation)held.push({rawKey,reason:'Intensity-based activation: intensity formula is not evaluated.'});
   for(const field of externalFields)if(special.row[field]){references.push({field,key:special.row[field]});held.push({rawKey,reason:`${field}=${special.row[field]}: external mechanic/activation not evaluated.`});}
   for(const [table,[field,kind]]of Object.entries(conditionFields))for(const r of rows(source,table).filter(r=>r.row.special_ability===rawKey)){
    const text=optionalLoc(locSource,`special_ability_invalid_usage_flags_flag_description_${r.row[field]}`),opposite=optionalLoc(locSource,`special_ability_invalid_usage_flags_alt_description_${r.row[field]}`);
    conditions.push({kind,rawFlag:r.row[field],text:text?.text,oppositeText:opposite?.text,language:text?.language,sourceRowIds:unique([r.id,...(text?.rowIds??[]),...(opposite?.rowIds??[])])});ids.push(r.id,...(text?.rowIds??[]),...(opposite?.rowIds??[]));if(!text)held.push({rawKey,reason:`Condition Loc unresolved: ${r.row[field]}`});
   }
   const links=rows(source,'special_ability_to_special_ability_phase_junctions_tables').filter(r=>r.row.special_ability===rawKey).sort((a,b)=>a.row.order-b.row.order||a.row.phase.localeCompare(b.row.phase));
   const queue=links.map(r=>({key:r.row.phase,order:r.row.order,relationship:'DIRECT',targets:{self:r.row.target_self,friends:r.row.target_friends,enemies:r.row.target_enemies},ids:[r.id]})),seen=new Set();
   for(let i=0;i<queue.length;i++){
    const link=queue[i];assert(i<100,'Cyclic contact graph');
    const p=one(source,'special_ability_phases_tables','id',link.key),effects=[];ids.push(p.id,...link.ids);
    for(const [field,[label,unit]]of Object.entries(phaseValues))if(p.row[field]!==0){assert(Number.isFinite(p.row[field]));effects.push({field,label,value:fractionFields.includes(field)?Number((p.row[field]*100).toFixed(6)):p.row[field],rawValue:p.row[field],unit,sourceRowIds:[p.id]});}
    for(const [field,label]of Object.entries(phaseFlags))if(p.row[field])effects.push({field,label,value:true,rawValue:p.row[field],unit:'',sourceRowIds:[p.id]});
    if(p.row.heal_amount!==0){
     if(!p.row.resurrect)effects.push({field:'resurrect',label:'사망 개체 부활',value:false,rawValue:false,unit:'',sourceRowIds:[p.id]});
     if(!contextDescriptions.length){const context=optionalLoc(locSource,'random_localisation_strings_string_tooltip_healing_power');if(context){contextDescriptions.push(context);ids.push(...context.rowIds);}}
    }
    for(const r of rows(source,'special_ability_phase_stat_effects_tables').filter(r=>r.row.phase===link.key)){
     const stat=one(supplement,'modifiable_unit_stats_tables','stat_key',r.row.stat),name=optionalLoc(locSource,`unit_stat_localisations_onscreen_name_${stat.row.localisation}`);
     effects.push({field:r.row.stat,label:name?.text??r.row.stat,value:r.row.value,rawValue:r.row.value,unit:'CA 보정값',method:r.row.how,sourceRowIds:unique([r.id,stat.id,...(name?.rowIds??[])])});ids.push(r.id,stat.id,...(name?.rowIds??[]));
    }
    for(const r of rows(source,'special_ability_phase_attribute_effects_tables').filter(r=>r.row.phase===link.key)){effects.push({field:r.row.attribute,label:`특성 ${r.row.attribute}`,value:r.row.attribute_type,rawValue:r.row.attribute_type,unit:'CA 효과 유형',sourceRowIds:[r.id]});ids.push(r.id);}
    phases.push({id:link.key,order:link.order,relationship:link.relationship,targets:link.targets,duration:p.row.duration,hidden:p.row.is_hidden_in_ui,interval:p.row.hp_change_frequency,maxAffectedEntities:p.row.max_damaged_entities,affectsAllies:p.row.affects_allies,affectsEnemies:p.row.affects_enemies,effects,sourceRowIds:[p.id,...link.ids]});
    if(p.row.imbue_contact&&!seen.has(p.row.imbue_contact)){seen.add(p.row.imbue_contact);queue.push({key:p.row.imbue_contact,order:link.order,relationship:`CONTACT:${link.key}`,targets:{self:false,friends:false,enemies:false},ids:[p.id]});}
    if(p.row.spreading)held.push({rawKey,reason:`spreading=${p.row.spreading}: propagation not evaluated.`});
   }
  }
  if(phases.some(p=>p.effects.some(e=>e.method)))held.push({rawKey,reason:'Stat effect value/how are verified raw modifiers; final stat, percentage unit and UI sign conversion are not evaluated.'});
  entries.push({...base,description:descriptions.find(d=>d.language==='ko')??descriptions[0]??null,englishDescription:descriptions.find(d=>d.language==='en')??null,contextDescriptions,activation,phases,conditions,parameters,references,
   verification:{description:descriptions.some(d=>d.language==='ko')?'OFFICIAL_KO':descriptions.length?'OFFICIAL_EN':'NAME_ONLY',numericEffects:phases.some(p=>p.effects.some(e=>typeof e.value==='number'&&e.value!==0)),conditions:conditions.some(c=>c.text)?'CA_FLAGS':'NOT_EVALUATED',activation:'NOT_EVALUATED',mechanics:'PARTIAL'},held,sourceRowIds:unique(ids)});
 }
 const categorySummary=Object.fromEntries(['ATTRIBUTE','PASSIVE','ACTIVE','TOGGLE','BOUND'].map(category=>{const es=entries.filter(e=>e.category===category);return [category,{total:es.length,korean:es.filter(e=>e.verification.description==='OFFICIAL_KO').length,englishOnly:es.filter(e=>e.verification.description==='OFFICIAL_EN').length,nameOnly:es.filter(e=>e.verification.description==='NAME_ONLY').length,numeric:es.filter(e=>e.verification.numericEffects).length,conditions:es.filter(e=>e.verification.conditions==='CA_FLAGS').length}];}));
 return {format:'warhammer-vault-ability-dictionary-v1',gameVersion:'9.0.2.0',summary:{total:entries.length,korean:entries.filter(e=>e.verification.description==='OFFICIAL_KO').length,englishOnly:entries.filter(e=>e.verification.description==='OFFICIAL_EN').length,nameOnly:entries.filter(e=>e.verification.description==='NAME_ONLY').length,numeric:entries.filter(e=>e.verification.numericEffects).length,conditions:entries.filter(e=>e.verification.conditions==='CA_FLAGS').length,categories:categorySummary},entries};
}
