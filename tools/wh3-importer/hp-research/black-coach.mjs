import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {buildResearch,inspectStaticHP,articulationTrace,serialize} from './research.mjs';
import {buildSelection} from './selection.mjs';
import {scopedPrediction,buildFollowup} from './followup.mjs';
import {byteHash,replayHP} from '../hp-policy/policy.mjs';
import {parseProbeLogs,reconstructRuns,value} from '../runtime-evidence/cco-probe/ingest.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';

const folder='tools/wh3-importer/hp-research/',policy='tools/wh3-importer/hp-policy/';
const read=file=>JSON.parse(readFileSync(file));
const gate=(ok,message)=>{if(!ok)throw Error('Black Coach HP research refused: '+message);};
const roles={man:'ManList',mount:'MountList',engine:'EngineList',articulation:'EntityList'};
const classId=c=>c.shape==='MAN_ONLY'?'MAN_ONLY':c.shape==='ARTICULATED'?'ARTICULATED':
  c.shape==='MOUNTED'?(c.staticValues['main.num_men']===c.staticValues['land.num_mounts']?'MOUNTED_EQUAL_COUNTS':'ATTACHED_RIDERS'):
  c.shape==='ENGINE'?(c.classification.category==='artillery'?'ARTILLERY':c.classification.caste==='chariot'?'ENGINE_VEHICLE':'OTHER'):'OTHER';

// Research-only bounded equivalence: same snapshot, HP/count values, exact
// component record identities, processed join paths, class and attachment flags.
// Different CA Unit identities may share this subgraph. No coefficient fitting
// or extrapolation to a new profile, no admission, no catalog writes.
export function profileSignature(c,{countsOnly=false}={}) {
  const values=countsOnly?Object.fromEntries(['main.num_men','land.num_mounts','land.num_engines'].map(n=>[n,c.staticValues[n]])):c.staticValues;
  return serialize({classId:c.classId,shape:c.shape,classification:c.classification,staticSnapshotId:c.staticSnapshotId,
    values,componentHPRecords:Object.fromEntries(Object.keys(roles).map(r=>[r,c.componentRecords[r]])),
    joinShape:c.joinShape,structuralFlags:c.structuralFlags});
}

// Surviving source/count aliases from the earlier research, not new fitted
// branches. Equal outputs do not by themselves prove physical ownership.
export function reviewedHPOutputs(c,survivors) {
  const outputs=survivors.map(id=>scopedPrediction(c,id==='V_N'?'N':'(U*G)')).filter(Boolean).map(p=>p.HealthMax);
  if(!outputs.length)return outputs;
  const f=c.staticValues,N=f['main.num_men'],B=f['land.bonus_hit_points'],M=f['man.hit_points'],H=f['mount.hit_points'],
    U=f['land.num_mounts'],G=f['land.num_engines'],E=f['engine.hit_points'],A=f['articulation.hit_points'];
  if(c.shape==='MOUNTED')outputs.push(B*U+M*(N+U),B*U+H*(N+U));
  if(c.shape==='ARTICULATED')outputs.push(B*G+M*N+H*U*G+2*E*G,B*G+M*N+H*U*G+2*A*G);
  if(c.classId==='ENGINE_VEHICLE')outputs.push(B*G+M*N+E*G,B*N+E*(N+G),B*N+M*(N+G));
  return [...new Set(outputs)].sort((a,b)=>a-b);
}

export function assessProfile(c,cases,survivors) {
  const full=cases.filter(s=>profileSignature(c)===profileSignature(s));
  const counted=cases.filter(s=>profileSignature(c,{countsOnly:true})===profileSignature(s,{countsOnly:true}));
  const anchors=full.filter(s=>s.runtimeRolesMatch&&s.runtimeCountsMatch&&s.comparisons.V_N.matchesHealth&&s.comparisons.V_N.matchesCount);
  const countAnchors=counted.filter(s=>s.runtimeRolesMatch&&s.runtimeCountsMatch);
  const predictions=survivors.map(id=>scopedPrediction(c,id==='V_N'?'N':'(U*G)'));
  const checks={
    EXACT_STATIC_IDENTITY_AND_JOINS:c.missing.length===0&&c.extraEntities.length===0,
    STRUCTURAL_CLASS_TESTED:cases.some(s=>s.classId===c.classId&&s.comparisons.V_N.matchesHealth&&s.comparisons.V_N.matchesCount),
    NO_DIFFERING_SURVIVING_HP_PREDICTION:predictions.length>0&&predictions.every(Boolean)&&reviewedHPOutputs(c,survivors).length===1,
    REQUIRED_STATIC_MULTIPLICITIES_VERIFIED:countAnchors.length>0,
    ULTRA_LOGICAL_COUNT_VERIFIED:countAnchors.length>0&&predictions.every(p=>p&&countAnchors.some(s=>s.runtime.NumEntitiesInitial===p.NumEntitiesInitial)),
    SAME_TESTED_HP_CHAIN_PROFILE:anchors.length>0,
  };
  const unavailable=c.missing.length>0;
  const status=unavailable?'STATIC_DERIVATION_UNAVAILABLE':Object.values(checks).every(Boolean)?'STATIC_DERIVATION_CONFIDENT':'STATIC_DERIVATION_AMBIGUOUS';
  return {status,checks,reviewedHPOutputs:reviewedHPOutputs(c,survivors),anchors:anchors.map(s=>s.id),numericallyEqualProfiles:full.map(s=>s.id),
    reasons:unavailable?c.missing:Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name),
    confidenceScope:'EXACT_TESTED_HP_CHAIN_PROFILE_ONLY; empirical recipe confidence, not universal ownership proof',productionEligible:false};
}

export function buildBlackCoachResearch() {
  const historical=buildResearch(),selection=buildSelection(),forecast=buildFollowup();
  gate(serialize(selection)===readFileSync(folder+'selection.json','utf8'),'historical selection changed');
  gate(serialize(forecast)===readFileSync(folder+'followup.json','utf8'),'nine-case forecast changed');
  const manifest=read(policy+'manifest.json'),runtime=replayHP(manifest);
  gate(isDeepStrictEqual(runtime,read(policy+'review.json')),'current runtime replay differs');
  const parsed=parseProbeLogs(manifest.inputs.map(i=>({name:i.file,text:readFileSync(policy+i.file,'utf8')}))),runs=reconstructRuns(parsed);
  gate(parsed.problems.length===0,'raw parsing problems');
  const cache=new Map(),supplement=read(folder+'articulation.source.json');
  const catalog=selection.catalog.map(c=> {
    let bundle=cache.get(c.source.file);
    if(!bundle){const bytes=readFileSync(c.source.file),pin=historical.inputs.find(i=>i.file===c.source.file);
      gate(pin&&byteHash(bytes)===pin.bytesSha256,'static source pin changed');bundle=JSON.parse(bytes);
      if(c.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,pin.expandedSha256);cache.set(c.source.file,bundle);}
    let dump=c.source.pointer.replace(/^\/decoded/,'').slice(1).split('/').reduce((v,k)=>v?.[k],bundle);
    gate(dump,'source pointer missing');if(dump.schemaRefs)dump=restoreTrace(bundle,dump);
    const inspected=inspectStaticHP(dump),s=factSelectors(dump),ctx=observationContext(dump,s);
    gate(inspected.chain.sourceMainKey===c.mainKey&&inspected.chain.sourceLandKey===c.landKey,'exact identity differs');
    gate(inspected.chain.staticSnapshotId===selection.staticSnapshotId,'static snapshots differ');
    if(inspected.refs.articulated_record?.value){const a=articulationTrace(supplement,c.mainKey,dump);
      if(a.key&&a.hitPoints){inspected.entities.articulation=a.key;inspected.facts['articulation.hit_points']=a.hitPoints;
        inspected.missing=inspected.missing.filter(n=>n!=='articulation.exact_entity_hp');}}
    gate(isDeepStrictEqual(Object.fromEntries(Object.entries(inspected.facts).map(([n,f])=>[n,f?.value??null])),c.staticValues),'static HP inputs changed');
    const joinedRecords={mount:inspected.refs.mount,engine:inspected.refs.engine,articulation:inspected.refs.articulated_record};
    const paths=Object.entries(inspected.facts).filter(([,f])=>f).map(([n,f])=>[n,{table:f.source.table,field:f.source.field,schemaVersion:f.source.schemaVersion,
      joins:f.source.joins.map(j=>({field:j.field,targetField:j.targetField,direction:j.direction}))}]);
    const structuralFacts=Object.fromEntries([['engine_type',ctx.engine,'engine_type'],['draught_attachment_point',ctx.engine,'draught_attachment_point'],
      ['rider_attachment_point',ctx.engine,'rider_attachment_point'],['mounted_draughts',ctx.land,'mounted_draughts'],['sync_locomotion',ctx.land,'sync_locomotion']]
      .map(([n,row,field])=>[n,s.fact(row,field)??null]));
    return {id:c.id,name:c.name,mainKey:c.mainKey,landKey:c.landKey,shape:c.shape,classId:classId(c),classification:c.classification,
      staticSnapshotId:inspected.chain.staticSnapshotId,staticValues:c.staticValues,entities:c.entities,
      componentRecords:{...Object.fromEntries(Object.entries(inspected.entities).map(([r,f])=>[r,f?.value??null])),
        ...Object.fromEntries(Object.entries(joinedRecords).map(([r,f])=>[r+'Record',f?.value||null]))},
      joinShape:Object.fromEntries(paths),structuralFlags:Object.fromEntries(Object.entries(structuralFacts).map(([n,f])=>[n,f?.value??null])),
      staticSource:c.source,...(inspected.refs.articulated_record?.value?{articulationSource:{file:folder+'articulation.source.json',originalSha256:supplement.originalSha256}}:{}),
      missing:inspected.missing,extraEntities:c.additionalExactJoinedHP,
      exactFacts:inspected.facts,structuralFacts,productionEligible:false};
  });
  const cases=runtime.review.map(r=> {
    const c=catalog.find(c=>c.id===r.id);gate(c,'no exact catalog chain');
    const matching=runs.filter(run=>value(run.frames[0]?.fields['UnitRecordContext.Key'])===c.mainKey);
    gate(matching.length&&matching.every(run=>run.completed&&!run.problems.length),'incomplete/conflicting snapshot');
    const frames=matching.flatMap(run=>run.frames),first=frames[0];
    const f=c.staticValues,N=f['main.num_men'],U=f['land.num_mounts'],G=f['land.num_engines'];
    const counts={ManList:N,MountList:c.shape==='ARTICULATED'?U*G:U,EngineList:G,
      EntityList:c.shape==='MAN_ONLY'?N:c.shape==='MOUNTED'?U:G};
    const actual=Object.fromEntries(Object.keys(roles).map(role=>[role,[...new Set(frames.flatMap(frame=>Object.values(frame.lists[roles[role]].entries)
      .map(e=>value(e.fields['EntityRecordContext.Key']))))].sort()]));
    const mismatches=Object.keys(roles).filter(role=>c.entities[role]&&
      (actual[role].length!==1||actual[role][0]!==c.entities[role].key));
    // EntityList is the aggregate context view for unarticulated shapes; it is
    // not an articulation source there. Do not invent a physical owner mapping.
    const runtimeRolesMatch=mismatches.length===0;
    const runtimeCountsMatch=frames.every(frame=>Object.entries(counts).every(([list,n])=>value(frame.lists[list].size)===n));
    const compare=p=>({...p,matchesHealth:p.HealthMax===r.totalHealth,matchesCount:p.NumEntitiesInitial===value(first.fields.NumEntitiesInitial)});
    const comparisons={V_N:compare(scopedPrediction(c,'N')),V_UG:compare(scopedPrediction(c,'(U*G)'))};
    return {...c,runtime:{HealthMax:r.totalHealth,NumEntitiesInitial:value(first.fields.NumEntitiesInitial),
      references:r.candidates.map(o=>o.reference),unitSize:'ULTRA',unitSizeSource:'DECLARED_SETUP',
      snapshots:frames.map(frame=>({reference:frame.reference,HealthMax:value(frame.fields.HealthMax),HealthValue:value(frame.fields.HealthValue),
        NumEntitiesInitial:value(frame.fields.NumEntitiesInitial),NumEntities:value(frame.fields.NumEntities),
        lists:Object.fromEntries(Object.entries(frame.lists).map(([n,l])=>[n,value(l.size)]))})),
      completeSnapshotRuns:matching.length,independentSessionCount:new Set(matching.map(run=>JSON.parse(run.id)[0])).size,
      unitProfileSampleWeight:1,listEntityKeys:Object.fromEntries(Object.entries(roles).map(([role,list])=>[list,actual[role]]))},
      runtimeRolesMatch,runtimeCountsMatch,roleMismatches:mismatches,comparisons,
      aliases:c.classId==='ARTICULATED'?['E=A=8 makes E+A and 2*E numerically indistinguishable; no physical ownership inference.']:
        c.shape==='MOUNTED'?['M=H=8 makes exchanging rider/mount HP sources indistinguishable.']:
        c.classId==='ENGINE_VEHICLE'?['N=G and M=E=8; bonus-count and HP source aliases remain.']:
        c.classId==='ARTILLERY'?['Separate bonus pools versus effective chassis bonus are algebraically equivalent.']:[]};
  });
  const survivors=['V_N','V_UG'].filter(id=>cases.every(c=>c.comparisons[id].matchesHealth&&c.comparisons[id].matchesCount));
  const assessed=catalog.map((c,i)=> {
    const assessment=assessProfile(c,cases,survivors);
    // Keep full fact objects only in measured cases; catalog uses exact pointers
    // and normalized HP profile values, as in existing research reports.
    return {id:c.id,name:c.name,mainKey:c.mainKey,landKey:c.landKey,classId:c.classId,
      staticSource:c.staticSource,selectionPointer:`/catalog/${i}`,
      hpProfileSha256:byteHash(Buffer.from(profileSignature(c))),countProfileSha256:byteHash(Buffer.from(profileSignature(c,{countsOnly:true}))),
      ...(c.classId==='ARTILLERY'?{staticValues:c.staticValues,componentRecords:c.componentRecords,structuralFlags:c.structuralFlags}:{}),
      assessment,productionEligible:false};
  });
  const definitions={MAN_ONLY:{formula:'(B+M)*N',bonusMultiplicity:'N',logicalCount:'N',contribution:'M*N'},
    MOUNTED_EQUAL_COUNTS:{formula:'B*U+M*N+H*U',bonusMultiplicity:'U',logicalCount:'U',contribution:'M*N+H*U'},
    ATTACHED_RIDERS:{formula:'B*U+M*N+H*U',bonusMultiplicity:'U',logicalCount:'U',contribution:'M*N+H*U; effective rider keys unresolved'},
    ARTILLERY:{formula:'(B+M)*N+(B+E)*G',bonusMultiplicity:'N+G (numerical decomposition only)',logicalCount:'G',contribution:'M*N+E*G'},
    ENGINE_VEHICLE:{formula:'B*N+M*N+E*G',bonusMultiplicity:'N (N=G in sole tested profile)',logicalCount:'G',contribution:'M*N+E*G; effective rider key unresolved'},
    ARTICULATED:{formula:'B*G+M*N+H*U*G+E*G+A*G',bonusMultiplicity:'G',logicalCount:'G',contribution:'M*N+H*U*G+E*G+A*G'},
    OTHER:{formula:null,bonusMultiplicity:'UNKNOWN',logicalCount:'UNKNOWN',contribution:'UNKNOWN'}};
  const classes=Object.entries(definitions).filter(([id])=>assessed.some(c=>c.classId===id)).map(([id,definition])=> {
    const tested=cases.filter(c=>c.classId===id),members=assessed.filter(c=>c.classId===id);
    const conditions={MAN_ONLY:'Exact main→land→man; mount/engine/articulation references empty.',
      MOUNTED_EQUAL_COUNTS:'Exact man and mount→entity joins; no engine/articulation; N=U.',
      ATTACHED_RIDERS:'Exact man and mount→entity joins; no engine/articulation; N!=U.',
      ARTILLERY:'Exact man and engine→battle_entity joins; mount/articulation empty; extra joined HP roles empty; observed class flags and engine type must agree.',
      ENGINE_VEHICLE:'Exact man and engine→battle_entity joins; mount/articulation empty; vehicle branch remains scoped to tested N=G.',
      ARTICULATED:'Exact man, mount→entity, engine→battle_entity and articulation→articulated_entity joins.',OTHER:'No tested applicable branch.'};
    return {id,...definition,conditions:conditions[id],catalogCount:members.length,testedUnitProfiles:tested.length,
      testedIds:tested.map(c=>c.id),confidence:!tested.length?'UNKNOWN':tested.every(c=>c.runtimeRolesMatch&&c.runtimeCountsMatch)?
        'CONFIRMED_FOR_TESTED_STRUCTURE':'PLAUSIBLE_BUT_AMBIGUOUS',
      confidenceScope:'Tested profiles only; category names do not authorize other units.',
      confidentIds:members.filter(c=>c.assessment.status==='STATIC_DERIVATION_CONFIDENT').map(c=>c.id)};
  });
  const black=cases.find(c=>c.mainKey==='wh_main_vmp_veh_black_coach');gate(black,'Black Coach missing');
  const prior=forecast.nextCandidates.find(c=>c.id===black.id);gate(prior,'original 5980/5988 forecast missing');
  for(const id of ['V_N','V_UG'])gate(prior.predictions[id].HealthMax===black.comparisons[id].HealthMax,'forecast formula changed');
  const counts=Object.fromEntries(['STATIC_DERIVATION_CONFIDENT','STATIC_DERIVATION_AMBIGUOUS','STATIC_DERIVATION_UNAVAILABLE'].map(status=>[status,assessed.filter(c=>c.assessment.status===status).length]));
  return {purpose:'RESEARCH_ONLY',productionEligible:false,baselineCommit:'35fb5f3174328dae303b574875f385ac844640ad',
    inputs:{manifestSha256:byteHash(readFileSync(policy+'manifest.json')),reviewSha256:byteHash(readFileSync(policy+'review.json')),
      priorForecastSha256:byteHash(readFileSync(folder+'followup.json')),selectionSha256:byteHash(readFileSync(folder+'selection.json'))},
    rawInputs:manifest.inputs,counts:{production:assessed.length,directRuntimeHP:runtime.admitted.length,missingHP:assessed.length-runtime.admitted.length,...counts},
    survivingReviewedFormulations:survivors,blackCoachDecision:{priorForecast:prior.predictions,
      observed:{HealthMax:black.runtime.HealthMax,NumEntitiesInitial:black.runtime.NumEntitiesInitial},
      differingTerm:{V_N:black.staticValues['man.hit_points']*black.staticValues['main.num_men'],
        V_UG:black.staticValues['man.hit_points']*black.staticValues['land.num_mounts']*black.staticValues['land.num_engines'],
        delta:black.comparisons.V_UG.HealthMax-black.comparisons.V_N.HealthMax},
      surviving:survivors,rejected:['V_N','V_UG'].filter(id=>!survivors.includes(id)),
      completeSnapshotRuns:black.runtime.completeSnapshotRuns,independentSessionCount:black.runtime.independentSessionCount},
    assessmentDefinition:'All six user conditions are evaluated per exact tested HP-chain profile. Equal-output algebraic/source aliases alone are not a numerical ambiguity; effective entity overrides and new untested profiles remain ambiguous. CONFIDENT is research scope only, not permission or code for static admission.',
    classes,cases,catalog:assessed,
    additionalMeasurements:{needed:assessed.some(c=>c.assessment.reviewedHPOutputs.length>1&&!cases.some(s=>s.id===c.id)),
      candidates:assessed.filter(c=>c.assessment.reviewedHPOutputs.length>1&&!cases.some(s=>s.id===c.id)).slice(0,2).map(c=>({id:c.id,outputs:c.assessment.reviewedHPOutputs})),
      reason:'The reviewed 5980/5988 split is resolved. Remaining source aliases yield identical HP for this 101-unit snapshot; new-profile transfer and rider overrides need static chain proof first, not arbitrary new prediction branches.'}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2],file=folder+'black-coach.json';
  gate(process.argv.length===3&&['--check','--write'].includes(mode),'Use --check or --write (research report only).');
  const report=buildBlackCoachResearch(),bytes=serialize(report);
  if(mode==='--write')writeFileSync(file,bytes);else gate(readFileSync(file,'utf8')===bytes,'report replay differs');
  console.log(JSON.stringify({mode,...report.counts,survivors:report.survivingReviewedFormulations,classes:report.classes.map(c=>({id:c.id,total:c.catalogCount,confident:c.confidentIds.length})),productionEligible:false}));
}
