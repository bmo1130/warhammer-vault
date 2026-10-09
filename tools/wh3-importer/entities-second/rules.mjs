import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {decodeSource} from '../missile-rules/source.mjs';
import {predictRule,candidates,formulas} from '../unit-entities/rules.mjs';
export const folder='tools/wh3-importer/entities-second/';
export const read=p=>JSON.parse(fs.readFileSync(p));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
const load=p=>decodeSource(read(folder+p));
const positive=n=>Number.isSafeInteger(n)&&n>0;
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
export const comparisonFields={main_units_tables:['land_unit','num_men','caste'],
  land_units_tables:['man_entity','mount','engine','articulated_record','num_mounts','num_engines','bonus_hit_points','category'],
  battle_entities_tables:['hit_points','type'],mounts_tables:['entity'],
  battlefield_engines_tables:['battle_entity','engine_type'],land_unit_articulated_vehicles_tables:['articulated_entity']};

// Ultra only. No identity/name is used to select a count or HP recipe.
export function predictSecond(c){
  const f=c.rawValues,N=f['main.num_men'],U=f['land.num_mounts'],G=f['land.num_engines'],B=f['land.bonus_hit_points'],M=f['man.hit_points'],E=f['engine.hit_points'];
  const p={...predictRule(c)};
  const hasEngine=c.roleReferences.engine&&c.engineRecordPresent&&positive(G);
  const safeCounts=positive(N)&&nonnegative(U)&&nonnegative(G);
  if(c.shape==='MOUNTED'&&positive(U)&&N%U!==0){
    return {count:null,totalHealth:null,countRule:null,hpRule:null,reasons:['INDEPENDENT_MOUNT_CARD_CONFLICT:N_VS_U_AND_HP_MULTIPLICITY']};
  }
  if(!safeCounts)return {count:null,totalHealth:null,countRule:null,hpRule:null,reasons:['INVALID_COUNT_STRUCTURE']};
  if(hasEngine&&/^Generic_(?:[235]_Crew|No_Crew_(?:Rotate|Fixed))$/.test(c.structuralFlags.engine_type)){
    p.count=G;p.countRule=c.prediction?.countRule??p.countRule??'NATIVE_ENGINE_CARD_G';
  }
  if(!c.missing.length&&c.shape==='ENGINE'&&U===0&&hasEngine&&M===8&&positive(E)&&
    c.classification.caste==='warmachine'&&c.classification.category==='artillery'&&c.entityTypes.engine==='artillery'&&
    /^Generic_[235]_Crew$/.test(c.structuralFlags.engine_type)){
    p.hpRule='ARTILLERY';p.totalHealth=candidates(c).ARTILLERY;
  }else if(!c.missing.length&&c.shape==='ENGINE'&&U===0&&hasEngine&&M===8&&E===8&&N%G===0&&
    c.classification.caste==='chariot'&&c.classification.category==='war_machine'&&c.entityTypes.engine==='chariot'&&
    c.structuralFlags.engine_type==='Generic_No_Crew_Rotate'){
    p.hpRule='ENGINE_CREW';p.totalHealth=candidates(c).ENGINE_CREW;
  }
  if(!nonnegative(B)||!positive(p.totalHealth)){p.totalHealth=null;p.hpRule=null;}
  // Every referenced HP contributor must have an exact captured 9.0.2 row.
  if(c.missing.length){p.totalHealth=null;p.hpRule=null;}
  if(!positive(p.count)){p.count=null;p.countRule=null;}
  p.reasons=[...(p.count===null?['UNVALIDATED_COUNT_STRUCTURE']:[]),...(p.totalHealth===null?
    c.missing.length?c.missing.map(m=>'MISSING:'+m):['OUTSIDE_VALIDATED_HP_STRUCTURE']:[])];
  return p;
}

// Literal transcription of the independent website's Ultra branch, with no
// rounding/scaling and no zero fallback for unknown original component HP.
export function independentCandidate(c){
  const f=c.rawValues,N=f['main.num_men'],U=f['land.num_mounts'],G=f['land.num_engines'],B=f['land.bonus_hit_points'],
    M=f['man.hit_points'],H=f['mount.hit_points'],E=f['engine.hit_points'],A=f['articulation.hit_points'];
  const cavalry=['melee_cavalry','missile_cavalry','war_beast'].includes(c.classification.caste);
  const count=c.roleReferences.engine?G:c.roleReferences.mount?cavalry?N:U:N;
  if(c.missing.length)return {count,totalHealth:null};
  const mount=c.roleReferences.mount?H:0,engine=c.roleReferences.engine?E:0,articulation=c.roleReferences.articulated_record?A:0;
  const totalHealth=G?c.classification.caste==='warmachine'&&c.entityTypes.man==='man'&&c.entityTypes.engine!=='chariot'&&!/no_crew/i.test(c.structuralFlags.engine_type)?
    N*(M+B)+G*(engine+B):c.classification.caste==='chariot'?N*M+U*G*mount+G*(engine+B)+G*articulation:
    N*M+U*mount+G*(engine+B)+G*articulation:U?cavalry?N*M+N*(mount+B):N*M+U*(mount+B):N*(M+B);
  return {count,totalHealth};
}

export function buildSecond(manifest=read(folder+'manifest.json')){
  assert.equal(manifest.format,'unit-ultra-entities-second-manifest-v1');assert.equal(manifest.unitSize,'ULTRA');assert.equal(manifest.gameVersion,'9.0.2.0');
  for(const pin of manifest.inputs)assert.equal(digest(read(pin.file)),pin.hash,'Entities second source drift '+pin.file);
  const old=read('tools/wh3-importer/unit-entities/rules-report.json'),legacy=read('src/data/unitHpEntityRuleAdmissions.json');
  const stored=load('stored.source.json'),ref=load('reference.source.json'),fresh=load('fresh.source.json');
  assert.equal(stored.snapshotId,manifest.snapshotId);
  for(const [table,field,target]of [
    ['main_units_tables','land_unit',['land_units','key']],['land_units_tables','man_entity',['battle_entities','key']],
    ['land_units_tables','mount',['mounts','key']],['land_units_tables','engine',['battlefield_engines','key']],
    ['land_units_tables','articulated_record',['land_unit_articulated_vehicles','key']],['mounts_tables','entity',['battle_entities','key']],
    ['battlefield_engines_tables','battle_entity',['battle_entities','key']],['land_unit_articulated_vehicles_tables','articulated_entity',['battle_entities','key']],
  ])assert.deepEqual(stored.schemas.find(s=>s.table===table)?.fields.find(f=>f.name===field)?.is_reference,target,'Native schema reference drift '+table+'.'+field);
  for(const pin of stored.inputs)assert.equal(digest(read(pin.file)),pin.hash,'Stored source drift '+pin.file);
  for(const row of stored.rows)assert.equal(digest(snapshotIdentity(row.provenance)),manifest.snapshotId);
  assert.equal(digest(snapshotIdentity(fresh.provenance)),fresh.snapshotId);assert.notEqual(fresh.snapshotId,manifest.snapshotId);
  const rowChecks=stored.rows.map(r=>{
    const a=r.row,b=ref.independent.rows.find(x=>x.table===a.table&&(x.row.key??x.row.unit)===(a.row.key??a.row.unit));
    const conflicts=comparisonFields[a.table].filter(f=>!b||(typeof a.row[f]==='number'?Number(b.row[f]):b.row[f])!==a.row[f]);
    return {table:a.table,key:a.row.key??a.row.unit,fields:comparisonFields[a.table],conflicts,result:conflicts.length?'CONFLICT':'MATCH'};
  });
  const cardMap=new Map(ref.publisher.cards.map(c=>[c.mainKey,c]));assert.equal(cardMap.size,1110);
  const catalog=stored.chains.map(chain=>{
    const previous=old.catalog.find(c=>c.id===chain.id);assert(previous&&previous.status!=='COMPLETE');
    const c={id:chain.id,name:previous.name,mainKey:chain.mainKey,landKey:chain.landKey,shape:previous.shape,
      originalStatus:previous.status,originalPrediction:previous.prediction,classification:previous.classification,
      rawValues:{...previous.rawValues},roleReferences:previous.roleReferences,entityKeys:{...previous.entityKeys},entityTypes:{},
      structuralFlags:{...previous.structuralFlags},missing:chain.missing,originalMissing:previous.missing,source:previous.source,staticSnapshotId:stored.snapshotId};
    for(const [k,v]of Object.entries({'main.num_men':chain.main.num_men,'land.num_mounts':chain.land.num_mounts,'land.num_engines':chain.land.num_engines,'land.bonus_hit_points':chain.land.bonus_hit_points}))assert.equal(c.rawValues[k],v,c.mainKey+' '+k);
    const refFields={man:'man_entity',mount:'mount',engine:'engine',articulation:'articulated_record'};
    for(const [role,field]of Object.entries(refFields))assert.equal(chain.refs[role],c.roleReferences[field]);
    for(const [role,row]of Object.entries(chain.roles)){
      const field=role+'.hit_points';if(c.rawValues[field]!==null)assert.equal(c.rawValues[field],row.hit_points,c.mainKey+' '+field);
      c.rawValues[field]=row.hit_points;c.entityKeys[role]=row.key;c.entityTypes[role]=row.type;
    }
    const engine=stored.rows.find(r=>r.row.table==='battlefield_engines_tables'&&r.row.row.key===chain.refs.engine)?.row.row;
    c.engineRecordPresent=!!engine;c.structuralFlags.engine_type=engine?.engine_type??c.structuralFlags.engine_type;
    c.prediction=predictSecond(c);c.candidates=candidates(c);c.independentCandidate=independentCandidate(c);c.publisherCard=cardMap.get(c.mainKey);
    // Conflicting independent implementations or raw fields block promotion.
    const relevantKeys=new Set([c.mainKey,c.landKey,...Object.values(chain.roles).map(r=>r.key),...Object.values(chain.refs)]);
    c.independentRawConflicts=rowChecks.filter(r=>relevantKeys.has(r.key)&&r.result==='CONFLICT');
    if(c.independentRawConflicts.length)c.prediction={count:null,totalHealth:null,countRule:null,hpRule:null,reasons:['INDEPENDENT_RAW_FIELD_CONFLICT']};
    for(const field of ['count','totalHealth'])if(c.prediction[field]!==null&&
      (c.prediction[field]!==c.publisherCard[field]||c.prediction[field]!==c.independentCandidate[field])){
      c.prediction[field]=null;c.prediction[field==='count'?'countRule':'hpRule']=null;c.prediction.reasons.push('INDEPENDENT_CARD_'+field.toUpperCase()+'_CONFLICT');
    }
    if(c.originalPrediction.count!==null)assert.equal(c.prediction.count,c.originalPrediction.count,'Existing count changed '+c.id);
    c.status=c.prediction.count!==null&&c.prediction.totalHealth!==null?'COMPLETE':c.prediction.count!==null||c.prediction.totalHealth!==null?'PARTIAL':'UNKNOWN';
    c.freshComparison={version:fresh.provenance.gameVersion,admitted:false,
      components:Object.entries(chain.roles).map(([role,row])=>{const newer=fresh.rows.find(r=>r.table==='battle_entities_tables'&&r.row.key===row.key)?.row;
        return {role,key:row.key,originalHP:row.hit_points,comparisonHP:newer?.hit_points??null,result:newer?.hit_points===row.hit_points?'MATCH':'DIFFERENT_OR_MISSING'};}),
      missingReferences:chain.missing.map(m=>{const role=m.split('.')[0],record=fresh.rows.find(r=>r.table===({engine:'battlefield_engines_tables',articulation:'land_unit_articulated_vehicles_tables'}[role])&&r.row.key===chain.refs[role])?.row;
        return {role,record:chain.refs[role],comparisonTarget:record?.battle_entity??record?.articulated_entity??null};})};
    return c;
  });assert.equal(catalog.length,124);
  const regression=old.catalog.filter(c=>c.status==='COMPLETE').map(c=>{
    const actual=predictRule(c),a=legacy.admissions.find(a=>a.id===c.id);assert.equal(actual.count,a.count);assert.equal(actual.totalHealth,a.totalHealth);
    assert.equal(cardMap.get(c.mainKey).count,a.count);assert.equal(cardMap.get(c.mainKey).totalHealth,a.totalHealth);
    return {id:c.id,count:a.count,totalHealth:a.totalHealth,result:'MATCH_UNCHANGED'};
  });assert.equal(regression.length,986);
  const training=read('tools/wh3-importer/unit-entities/ground-truth.json').cases.map(g=>{
    const c=old.catalog.find(c=>c.id===g.id),actual=predictRule(c);assert.equal(actual.count,g.count);assert.equal(actual.totalHealth,g.totalHealth);
    return {...g,actual,result:'MATCH_UNCHANGED',directMeasurement:old.training.find(t=>t.id===g.id).measurementKind==='DIRECT_ULTRA_RUNTIME'};
  });assert.equal(training.length,13);
  const promotions=catalog.filter(c=>c.prediction.totalHealth!==null||c.originalPrediction.count===null&&c.prediction.count!==null);
  const groups=['PARTIAL','UNKNOWN'].map(status=>{const a=catalog.filter(c=>c.originalStatus===status);return {originalStatus:status,before:a.length,
    newCount:a.filter(c=>c.originalPrediction.count===null&&c.prediction.count!==null).length,newHP:a.filter(c=>c.prediction.totalHealth!==null).length,
    COMPLETE:a.filter(c=>c.status==='COMPLETE').length,PARTIAL:a.filter(c=>c.status==='PARTIAL').length,UNKNOWN:a.filter(c=>c.status==='UNKNOWN').length};});
  const structures=[...new Set(promotions.map(c=>c.prediction.hpRule??c.prediction.countRule))].map(rule=>{const a=promotions.filter(c=>(c.prediction.hpRule??c.prediction.countRule)===rule);
    return {rule,units:a.length,newCount:a.filter(c=>c.originalPrediction.count===null&&c.prediction.count!==null).length,newHP:a.filter(c=>c.prediction.totalHealth!==null).length};});
  const newCount=groups.reduce((n,g)=>n+g.newCount,0),newHP=groups.reduce((n,g)=>n+g.newHP,0);
  const summary={production:1110,countBefore:1071,countAfter:1071+newCount,hpBefore:986,hpAfter:986+newHP,newCount,newHP,newIdentities:promotions.length,
    COMPLETE:986+newHP,PARTIAL:catalog.filter(c=>c.status==='PARTIAL').length,UNKNOWN:catalog.filter(c=>c.status==='UNKNOWN').length,
    originalHPRegression:regression.length,originalCountRegression:1071,groundTruthRegression:training.length,
    exactHPChainsRecovered:catalog.filter(c=>!c.missing.length&&c.originalMissing.length).length,healthPerEntityKnown:0,newDirectGameMeasurements:0};
  const browser=read(folder+'browser-card-evidence.json');assert.equal(browser.gameExecuted,false);
  const browserValidation=browser.cards.map(g=>{const c=catalog.find(c=>c.mainKey===g.mainKey);assert(c);const candidate=c.independentCandidate;
    assert.equal(candidate.count,g.count);assert.equal(candidate.totalHealth,g.totalHealth);
    return {...g,expected:candidate,actual:{count:g.count,totalHealth:g.totalHealth},promoted:c.status==='COMPLETE',result:c.status==='COMPLETE'?'MATCH':'CONFIRMS_REFERENCE_CONFLICT'};});
  const report={format:'unit-ultra-entities-second-report-v1',baselineCommit:manifest.baselineCommit,gameVersion:manifest.gameVersion,unitSize:'ULTRA',snapshotId:manifest.snapshotId,
    inputs:manifest.inputs,summary,groups,structures,training,regression,independentMediumValidation:old.independentValidation,rowChecks,browserValidation,catalog,
    confidence:{rawSource:'EXACT_STORED_CA_9_0_2',independentVersion:ref.independent.patch,publisherUpstreamResolved:ref.publisher.upstreamCommitHttpStatus===200,
      freshVersion:fresh.provenance.gameVersion,freshRows:fresh.rows.length,freshAdmitted:false,newDirectGameMeasurements:0,
      limitation:'Independent derived website cards and implementation; no new game UI capture. Conflicting mounted recipes stay held.'}};
  const projection={format:'unit-ultra-entities-second-admissions-v1',gameVersion:manifest.gameVersion,unitSize:'ULTRA',sourceHash:digest(report),admissions:promotions.map(c=>{
    const a=legacy.admissions.find(a=>a.id===c.id);return {id:c.id,mainKey:c.mainKey,landKey:c.landKey,staticSnapshotId:c.staticSnapshotId,
      count:c.prediction.count,totalHealth:c.prediction.totalHealth,originalCount:a?.originalCount??null,originalTotalHealth:a?.originalTotalHealth??null,
      kind:'EMPIRICAL_CATEGORY_RULE',status:c.status,unitSizeSource:'RUNTIME_VALIDATED_SOURCE_STRUCTURE_WITH_INDEPENDENT_DERIVED_CARD',
      rule:c.prediction.countRule,hpFormula:c.prediction.hpRule?formulas[c.prediction.hpRule]:null,countMeaning:'INITIAL_LOGICAL_COMBAT_ENTITIES_NOT_COMPONENT_OR_CREW_COUNT',
      healthMeaning:c.prediction.totalHealth===null?'UNKNOWN':'DISPLAYED_TOTAL_UNIT_HP',healthPerEntityStatus:'UNKNOWN',
      confidence:'EMPIRICAL_STRUCTURE; INDEPENDENT_DERIVED_CARD; NO_NEW_GAME_MEASUREMENT',reviewReference:folder+'report.json',references:[folder+'stored.source.json',c.publisherCard.page]};
  })};
  return {report,projection};
}
