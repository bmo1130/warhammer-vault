import fs from 'node:fs';
import assert from 'node:assert/strict';
import {reviewUnitEntities,serialize} from './review.mjs';
import {articulationTrace} from '../hp-research/research.mjs';
import {digest} from '../runtime-evidence/contract.mjs';
import {byteHash} from '../hp-policy/policy.mjs';
import {parseProbeLogs,reconstructRuns,value} from '../runtime-evidence/cco-probe/ingest.mjs';

const folder='tools/wh3-importer/unit-entities/';
const read=p=>JSON.parse(fs.readFileSync(p));
const positive=n=>Number.isSafeInteger(n)&&n>0;
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
export function verifyRuleInputs(manifest) {
  assert.equal(manifest.format,'empirical-ultra-hp-entity-scope-v1');
  assert.equal(manifest.unitSize,'ULTRA');assert.equal(manifest.gameVersion,'9.0.2.0');
  assert.deepEqual(manifest.inputs.map(i=>i.file),[folder+'manifest.json',folder+'admission.json',folder+'ground-truth.json',
    'tools/wh3-importer/hp-research/articulation.source.json','src/data/units.json']);
  for(const pin of manifest.inputs)assert.equal(digest(read(pin.file)),pin.hash,'HP/entity source drift: '+pin.file);
  assert.deepEqual(manifest.validationInputs.map(i=>i.file),['tools/wh3-importer/hp-policy/inputs/independent-necrofex-medium.log','tools/wh3-importer/hp-policy/inputs/independent-free-company-medium.log']);
  for(const pin of manifest.validationInputs)assert.equal(byteHash(fs.readFileSync(pin.file)),pin.sha256,'independent capture byte drift');
}

export function crossValidateIndependent(catalog,manifest) {
  const parsed=parseProbeLogs(manifest.validationInputs.map(pin=>({name:pin.file,text:fs.readFileSync(pin.file,'utf8')})));
  assert.equal(parsed.problems.length,0);assert.equal(parsed.conflictKeys.length,0);
  const runs=reconstructRuns(parsed),results=[];
  for(const subject of manifest.validationSubjects){
    const c=catalog.find(c=>c.id===subject.id);assert(c&&!c.missing.length);
    const captures=runs.filter(run=>run.frames.some(frame=>value(frame.fields['UnitRecordContext.Key'])===c.mainKey));
    assert(captures.length>0);
    for(const run of captures){
      assert(run.completed&&!run.problems.length);
      assert.equal(run.metadata.unitSize,'MEDIUM');assert.equal(run.metadata.unitSizeSource,'DECLARED_SETUP');
      assert.equal(run.metadata.gameVersion,manifest.gameVersion);assert.equal(run.metadata.staticSnapshotId,c.staticSnapshotId);
      assert.equal(run.metadata.scenarioId,'CCO_P0_CUSTOM_BATTLE');
      for(const frame of run.frames.filter(f=>value(f.fields['UnitRecordContext.Key'])===c.mainKey)){
        assert.equal(value(frame.fields['UnitRecordContext.UnitLandRecordContext.Key']),c.landKey);
        const count=value(frame.fields.NumEntitiesInitial),actual=value(frame.fields.HealthMax),f=c.rawValues;
        assert(positive(count)&&positive(actual));
        const perLogical=c.prediction.hpRule==='MAN'?f['land.bonus_hit_points']+f['man.hit_points']:
          c.prediction.hpRule==='RIDER_MOUNT'?f['land.bonus_hit_points']+f['mount.hit_points']+f['man.hit_points']*f['main.num_men']/f['land.num_mounts']:null;
        assert(positive(perLogical));
        const expected=count*perLogical;assert.equal(actual,expected,c.id+' independent HP fit');
        results.push({id:c.id,name:c.name,unitSize:'MEDIUM',observedCount:count,observedTotalHealth:actual,
          formulaUsingObservedCount:'observedCount * '+perLogical,expected,delta:actual-expected,
          ultraPrediction:c.prediction,ultraDirectlyValidated:false,reference:frame.reference,
          result:'MATCH_INDEPENDENT_MEDIUM_HP_CAPTURE; NO_ULTRA_SCALING_INFERENCE',
          limitation:'Historical mod/rank/effect setup and actual-game verification are incomplete; corroboration only, not an admission source.'});
      }
    }
  }
  return results;
}
// These are empirical Ultra UI recipes. Equal component HP values leave
// physical ownership unidentified; guard those equalities instead of claiming
// that the training set identified a unique rider/chassis ownership model.
export const formulas={
  MAN:'(B+M)*N', BONUS:'B*N', MOUNT:'(B+H)*U',
  RIDER_MOUNT:'B*U+M*N+H*U', CREW:'(B+M)*N',
  ENGINE:'(B+E)*G', ENGINE_CREW:'B*G+M*N+E*G',
  ARTILLERY:'(B+M)*N+(B+E)*G', VEHICLE:'B*N+M*N+E*G',
  ARTICULATED_N:'B*G+M*N+H*U*G+(E+A)*G',
  ARTICULATED_UG:'B*G+(M+H)*U*G+(E+A)*G',
};
export function candidates(c) {
  const f=c.rawValues,N=f['main.num_men'],U=f['land.num_mounts'],G=f['land.num_engines'],B=f['land.bonus_hit_points'],
    M=f['man.hit_points'],H=f['mount.hit_points'],E=f['engine.hit_points'],A=f['articulation.hit_points'];
  const calc=(fields,fn)=>fields.every(nonnegative)?fn():null;
  return {
    MAN:calc([B,M,N],()=>(B+M)*N),BONUS:calc([B,N],()=>B*N),MOUNT:calc([B,H,U],()=>(B+H)*U),
    RIDER_MOUNT:calc([B,M,H,N,U],()=>B*U+M*N+H*U),CREW:calc([B,M,N],()=>(B+M)*N),
    ENGINE:calc([B,E,G],()=>(B+E)*G),ENGINE_CREW:calc([B,M,E,N,G],()=>B*G+M*N+E*G),
    ARTILLERY:calc([B,M,E,N,G],()=>(B+M)*N+(B+E)*G),VEHICLE:calc([B,M,E,N,G],()=>B*N+M*N+E*G),
    ARTICULATED_N:calc([B,M,H,E,A,N,U,G],()=>B*G+M*N+H*U*G+(E+A)*G),
    ARTICULATED_UG:calc([B,M,H,E,A,U,G],()=>B*G+(M+H)*U*G+(E+A)*G),
  };
}

export function predictRule(c) {
  const f=c.rawValues,N=f['main.num_men'],U=f['land.num_mounts'],G=f['land.num_engines'],
    M=f['man.hit_points'],H=f['mount.hit_points'],E=f['engine.hit_points'],A=f['articulation.hit_points'];
  const r=c.roleReferences,empty=k=>r[k]==='',has=k=>typeof r[k]==='string'&&r[k].length>0;
  let count=null,countRule=null,hpRule=null;
  if(!positive(N)||!nonnegative(U)||!nonnegative(G)||!has('man_entity'))return {count,totalHealth:null,countRule,hpRule,reasons:['INVALID_OR_MISSING_COUNT_STRUCTURE']};
  if(c.shape==='MAN_ONLY'&&U===0&&G===0&&empty('mount')&&empty('engine')&&empty('articulated_record')){
    count=N;countRule='MAN_ONLY_N';
    if(M===8&&!c.missing.length)hpRule='MAN';
  } else if(c.shape==='MOUNTED'&&G===0&&positive(U)&&N%U===0&&has('mount')&&empty('engine')&&empty('articulated_record')){
    count=U;countRule='MOUNTED_U';
    if(M===8&&H===8&&!c.missing.length)hpRule='RIDER_MOUNT';
  } else if(c.shape==='ENGINE'&&U===0&&positive(G)&&N%G===0&&has('engine')&&empty('mount')&&empty('articulated_record')){
    if(c.classification.category==='artillery'&&c.classification.caste==='warmachine'){
      count=G;countRule='ARTILLERY_G';
      if(M===8&&positive(E)&&!c.missing.length&&c.structuralFlags.engine_type==='Generic_3_Crew')hpRule='ARTILLERY';
    } else if(c.classification.caste==='chariot'&&c.classification.category==='war_machine'&&N===G){
      count=G;countRule='ENGINE_VEHICLE_G';
      if(M===8&&E===8&&!c.missing.length)hpRule='VEHICLE';
    }
  } else if(c.shape==='ARTICULATED'&&positive(U)&&positive(G)&&N%G===0&&has('mount')&&has('engine')&&has('articulated_record')&&
    c.classification.caste==='chariot'&&c.classification.category==='war_machine'){
    count=G;countRule='ARTICULATED_CHARIOT_G';
    // N versus U*G are indistinguishable on Skeleton Chariots, but Black
    // Coach (N=1, U*G=2) rejects the second recipe. A is required, never zero.
    if(M===8&&H===8&&E===8&&A===8&&!c.missing.length)hpRule='ARTICULATED_N';
  }
  const value=hpRule?candidates(c)[hpRule]:null,totalHealth=positive(value)?value:null;
  if(totalHealth===null)hpRule=null;
  const countReasons=countRule?[]:c.shape==='MOUNTED'&&positive(U)&&N%U!==0?['NONINTEGRAL_RIDERS_PER_MOUNT:N='+N+',U='+U]:
    c.shape==='ENGINE'&&c.classification.caste==='chariot'&&N!==G?['ENGINE_VEHICLE_CREW_RATIO_NOT_TRAINED:N='+N+',G='+G]:['NO_TRAINED_COUNT_STRUCTURE:'+c.shape+'/'+c.classification.caste+'/'+c.classification.category];
  return {count:positive(count)?count:null,totalHealth,countRule,hpRule,
    reasons:[...countReasons,...(hpRule?[]:c.missing.length?c.missing.map(m=>'MISSING:'+m):['OUTSIDE_TRAINED_HP_STRUCTURE'])]};
}

export function buildRules() {
  const manifest=read(folder+'rules-manifest.json');verifyRuleInputs(manifest);
  const records=new Map(),supplement=read('tools/wh3-importer/hp-research/articulation.source.json');
  const original=reviewUnitEntities(undefined,undefined,({unit,inspected,source,dump,selectors:s,context:ctx})=>{
    inspected=structuredClone(inspected);
    if(inspected.refs.articulated_record?.value&&supplement.evidence.rows.some(r=>r.table==='main_units_tables'&&r.row.unit===inspected.chain.sourceMainKey)){
      const a=articulationTrace(supplement,inspected.chain.sourceMainKey,dump);
      if(a.key&&a.hitPoints){inspected.entities.articulation=a.key;inspected.facts['articulation.hit_points']=a.hitPoints;inspected.missing=inspected.missing.filter(m=>m!=='articulation.exact_entity_hp');}
    }
    const structuralFacts=Object.fromEntries([['engine_type',ctx.engine,'engine_type'],['mounted_draughts',ctx.land,'mounted_draughts'],
      ['sync_locomotion',ctx.land,'sync_locomotion'],['draught_attachment_point',ctx.engine,'draught_attachment_point'],['rider_attachment_point',ctx.engine,'rider_attachment_point']]
      .map(([k,row,field])=>[k,s.fact(row,field)??null]));
    records.set(unit.id,{unit,inspected,source,structuralFacts});
  });
  // Callback enrichment must never change the historical review output.
  // Replay without enrichment below is already checked by the existing CLI;
  // only this layer consumes the exact supplemental articulation chain.
  const historical=read(folder+'admission.json'),fixture=read(folder+'ground-truth.json');
  assert.deepEqual(original.review,historical,'historical replay drift');
  assert.equal(fixture.unitSize,'ULTRA');assert.equal(fixture.cases.length,13);
  assert.equal(new Set(fixture.cases.map(c=>c.id)).size,13);
  const groundIds=new Set(fixture.cases.map(c=>c.id)),sourceRows={},joinPaths={};
  const compactFact=f=>{
    if(!f)return null;
    const {joins,field,...row}=f.source,pathId=digest(joins),sourceId=digest(row);
    sourceRows[sourceId]=row;
    joinPaths[pathId]=joins;
    return {value:f.value,source:{rowId:row.rowId,sourceId,field,pathId}};
  };
  const catalog=historical.catalog.map(base=>{
    const r=records.get(base.id);assert(r);
    const i=r.inspected;
    const c={...base,rawValues:Object.fromEntries(Object.entries(i.facts).map(([k,f])=>[k,f?.value??null])),
      entityKeys:Object.fromEntries(Object.entries(i.entities).map(([k,f])=>[k,f?.value??null])),missing:i.missing,
      staticSnapshotId:i.chain.staticSnapshotId,structuralFlags:Object.fromEntries(Object.entries(r.structuralFacts).map(([k,f])=>[k,f?.value??null]))};
    const p=predictRule(c);
    const prior=historical.admissions.find(a=>a.id===c.id);
    if(prior){assert.equal(p.count,prior.count,c.id+' count');assert.equal(p.totalHealth,prior.hp,c.id+' HP');}
    const expected=fixture.cases.find(g=>g.id===c.id);
    if(expected){assert.equal(expected.count,prior?.count);assert.equal(expected.totalHealth,prior?.hp);}
    const {unit,inspected,source,structuralFacts}=r;
    return {...c,prediction:p,countStatus:p.count===null?'UNKNOWN':'COMPLETE',hpStatus:p.totalHealth===null?'UNKNOWN':'COMPLETE',
      status:p.count!==null&&p.totalHealth!==null?'COMPLETE':p.count!==null||p.totalHealth!==null?'PARTIAL':'UNKNOWN',
      reasons:p.reasons,sourceFields:Object.fromEntries(Object.entries({...inspected.facts,...structuralFacts,...Object.fromEntries(Object.entries(inspected.refs).map(([k,f])=>['land.'+k,f]))}).map(([k,f])=>[k,compactFact(f)])),
      confidence:groundIds.has(c.id)?'EXISTING_VERIFIED_BASELINE':'EMPIRICAL_SAME_SOURCE_STRUCTURE; NO_INDEPENDENT_LIVE_CAPTURE'};
  });
  const training=fixture.cases.map(g=>{
    const c=catalog.find(c=>c.id===g.id),a=historical.admissions.find(a=>a.id===g.id),v=candidates(c),f=c.rawValues;
    return {...g,category:c.classification,shape:c.shape,observedTotalPerDisplayedEntity:g.totalHealth/g.count,
      landKey:c.landKey,roleReferences:c.roleReferences,entityKeys:c.entityKeys,rawValues:c.rawValues,structuralFlags:c.structuralFlags,
      componentCounts:a.componentCounts,measurementKind:a.kind,references:a.references,
      countCandidates:Object.fromEntries(Object.entries({N:f['main.num_men'],U:f['land.num_mounts'],G:f['land.num_engines'],COMPONENT_SUM:f['main.num_men']+f['land.num_mounts']+f['land.num_engines']})
        .map(([k,actual])=>[k,{expected:g.count,actual,delta:actual-g.count,matches:actual===g.count}])),
      hpCandidates:Object.fromEntries(Object.entries(v).map(([k,actual])=>[k,{expected:g.totalHealth,actual,delta:actual===null?null:actual-g.totalHealth,matches:actual===g.totalHealth}])),
      selected:c.prediction};
  });
  const rules=[...new Set(catalog.map(c=>c.prediction.countRule).filter(Boolean))].map(id=>{
    const anchors=training.filter(t=>t.selected.countRule===id);
    assert(anchors.length>0,'untrained rule '+id);
    return {id,formula:anchors[0].selected.hpRule?formulas[anchors[0].selected.hpRule]:null,anchors:anchors.map(t=>t.id),
      directRuntimeAnchors:anchors.filter(t=>t.measurementKind==='DIRECT_ULTRA_RUNTIME').length,
      countMatches:anchors.length,hpMatches:anchors.filter(t=>t.selected.totalHealth===t.totalHealth).length,
      countKnown:catalog.filter(c=>c.prediction.countRule===id).length,hpKnown:catalog.filter(c=>c.prediction.countRule===id&&c.prediction.totalHealth!==null).length};
  });
  const countKnown=catalog.filter(c=>c.prediction.count!==null).length,hpKnown=catalog.filter(c=>c.prediction.totalHealth!==null).length;
  const summary={production:1110,count:{before:13,after:countKnown,unknownBefore:1097,unknownAfter:1110-countKnown},
    hp:{before:13,after:hpKnown,unknownBefore:1097,unknownAfter:1110-hpKnown},
    combined:Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN'].map(status=>[status.toLowerCase(),catalog.filter(c=>c.status===status).length])),
    newCount:countKnown-13,newHP:hpKnown-13,newIdentities:catalog.filter(c=>!groundIds.has(c.id)&&c.status!=='UNKNOWN').length,
    healthPerEntity:{known:0,unknown:1110}};
  const categories=[...new Set(catalog.map(c=>c.classification.caste))].map(category=>{
    const group=catalog.filter(c=>c.classification.caste===category);
    return {category,total:group.length,...Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN'].map(status=>[status,group.filter(c=>c.status===status).length])),
      unresolved:group.filter(c=>c.status!=='COMPLETE').map(c=>({id:c.id,reasons:c.reasons}))};
  });
  const selected=read(folder+'manifest.json').samples.filter(s=>!groundIds.has(s.id));
  for(const [category,predicate]of Object.entries({
    INFANTRY:c=>c.shape==='MAN_ONLY'&&c.classification.caste==='melee_infantry',
    MONSTROUS_INFANTRY:c=>c.shape==='MAN_ONLY'&&c.classification.caste==='monstrous_infantry',
    SINGLE_ENTITY_BODY:c=>c.shape==='MAN_ONLY'&&c.rawValues['main.num_men']===1,
    CAVALRY:c=>c.shape==='MOUNTED'&&c.rawValues['main.num_men']===c.rawValues['land.num_mounts'],
    MOUNT_WITH_CREW:c=>c.shape==='MOUNTED'&&c.rawValues['main.num_men']>c.rawValues['land.num_mounts']&&c.status==='COMPLETE',
    ARTILLERY:c=>c.shape==='ENGINE'&&c.classification.category==='artillery'&&c.status==='COMPLETE',
  }))for(const c of catalog.filter(c=>!groundIds.has(c.id)&&predicate(c)).slice(0,3))if(!selected.some(s=>s.id===c.id))selected.push({id:c.id,category});
  const samples=selected.map(s=>{
    const c=catalog.find(c=>c.id===s.id);
    return {...s,name:c.name,prediction:c.prediction,status:c.status,confidence:c.confidence,source:c.source,rawValues:c.rawValues,
      independentReference:null,result:'STRUCTURAL_EXTRAPOLATION_ONLY; NOT AN INDEPENDENT_MEASUREMENT'};
  });
  const independentValidation=crossValidateIndependent(catalog,manifest);
  const inputs=manifest.inputs;
  const report={format:'empirical-ultra-hp-entity-rules-v1',baselineCommit:'129f55f',manifestHash:digest(manifest),unitSize:'ULTRA',gameVersion:'9.0.2.0',inputs,summary,rules,training,categories,samples,sourceRows,joinPaths,
    independentValidation,validationInputs:manifest.validationInputs,
    confidenceLimit:'10 direct Ultra anchors + 3 dependent exact-profile baselines. Additional independent MEDIUM HP fits corroborate two structures; no new independent Ultra capture or unit-size scaling inference.',
    scaling:{ULTRA:'EMPIRICAL_CATEGORY_RULES',LARGE:'UNKNOWN',MEDIUM:'UNKNOWN',SMALL:'UNKNOWN'},characters:historical.characters,catalog};
  const units=read('src/data/units.json');
  const projection={format:report.format,gameVersion:report.gameVersion,unitSize:'ULTRA',sourceHash:digest(report),admissions:catalog.filter(c=>c.status!=='UNKNOWN').map(c=>{
    const u=units.find(u=>u.id===c.id),prior=historical.admissions.find(a=>a.id===c.id);
    return {id:c.id,mainKey:c.mainKey,landKey:c.landKey,staticSnapshotId:c.staticSnapshotId,count:c.prediction.count,totalHealth:c.prediction.totalHealth,
      originalCount:u.entities.count??null,originalTotalHealth:u.entities.totalHealth??null,kind:prior?.kind??'EMPIRICAL_CATEGORY_RULE',status:c.status,
      unitSizeSource:prior?.unitSizeSource??'RUNTIME_VALIDATED_SOURCE_STRUCTURE',rule:c.prediction.countRule,hpFormula:c.prediction.hpRule?formulas[c.prediction.hpRule]:null,
      countMeaning:'INITIAL_LOGICAL_COMBAT_ENTITIES_NOT_COMPONENT_OR_CREW_COUNT',healthMeaning:c.prediction.totalHealth===null?'UNKNOWN':'DISPLAYED_TOTAL_UNIT_HP',healthPerEntityStatus:'UNKNOWN',
      confidence:c.confidence,reviewReference:folder+'rules-report.json',references:prior?.references??[c.source.file+':'+c.source.pointer]};
  })};
  return JSON.parse(serialize({report,projection}));
}
