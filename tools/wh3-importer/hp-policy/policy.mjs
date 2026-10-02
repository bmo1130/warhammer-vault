import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import {snapshotIdentity,digest,stable} from '../runtime-evidence/contract.mjs';
import {parseProbeLogs,reconstructRuns,value} from '../runtime-evidence/cco-probe/ingest.mjs';

export const byteHash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => {throw Error('ULTRA HP refused: '+message);};
export function hpStaticChain(dump) {
  const selectors=factSelectors(dump),c=observationContext(dump,selectors);
  const main=selectors.fact(c.root,'unit'),land=selectors.fact(c.land,'key');
  if(c.root?.table!=='main_units_tables'||c.land?.table!=='land_units_tables'||main?.value!==dump.unit.caKey||!land)fail('exact static identity missing');
  return {sourceMainKey:main.value,sourceLandKey:land.value,identityFacts:{main,land},
    snapshot:snapshotIdentity(dump.provenance),staticSnapshotId:digest(snapshotIdentity(dump.provenance)),
    inputs:Object.fromEntries([['main.num_men',c.root,'num_men'],['land.num_mounts',c.land,'num_mounts'],
      ['land.num_engines',c.land,'num_engines'],['land.bonus_hit_points',c.land,'bonus_hit_points'],
      ['man.hit_points',c.rider,'hit_points'],['mount.hit_points',c.mountEntity,'hit_points'],
      ['engine.hit_points',c.engineEntity,'hit_points']].map(([name,row,field])=>[name,selectors.fact(row,field)??null])),
    derivation:{status:'WITHHELD',kind:'STATIC_DERIVATION',reason:'COMBAT_ENTITY_HP_AND_ULTRA_COUNT_SEMANTICS_UNPROVEN',formula:null}};
}

// Field-only review. Existing runtime parsing and run reconstruction are reused;
// no component ownership, missile or speed semantics are inferred here.
export function reviewRuntimeHP(parsed,chain,expectedUnitSize) {
  const candidates=[],held=[];
  if(expectedUnitSize!=='ULTRA')return {status:'QUARANTINED_UNIT_SIZE',candidates,held:[{reason:'EXPECTED_SIZE_NOT_ULTRA'}]};
  for(const run of reconstructRuns(parsed)) {
    const first=run.frames[0]?.fields,main=value(first?.['UnitRecordContext.Key']);
    if(main!==chain.sourceMainKey) {held.push({runId:run.id,reason:'IDENTITY_MISMATCH'});continue;}
    let reason=null;
    if(run.events.some(e=>e.event.metadata.unitSize!=='ULTRA'||e.event.metadata.unitSizeSource!=='DECLARED_SETUP'))reason='UNIT_SIZE_MISMATCH';
    else if(parsed.problems.length||run.problems.length||!run.completed||!run.frames.length)reason='MALFORMED_OR_CONFLICTING_CAPTURE';
    else if(run.events.some(({event:e})=>e.metadata.gameVersion!==chain.snapshot.gameVersion||e.metadata.staticSnapshotId!==chain.staticSnapshotId||(e.metadata.contextId??null)!==null))reason='SNAPSHOT_OR_CONTEXT_MISMATCH';
    else if(run.frames.some(f=>value(f.fields['UnitRecordContext.Key'])!==chain.sourceMainKey||value(f.fields['UnitRecordContext.UnitLandRecordContext.Key'])!==chain.sourceLandKey||value(f.fields.IsPlayerUnit)!==true||value(f.fields.UniqueUiId)===undefined||value(f.fields.UniqueUiId)!==value(first.UniqueUiId)))reason='IDENTITY_MISMATCH';
    else if(run.frames.some(f=>!Number.isSafeInteger(value(f.fields.HealthMax))||value(f.fields.HealthMax)<=0||!Number.isSafeInteger(value(f.fields.NumEntitiesInitial))||value(f.fields.NumEntitiesInitial)<=0))reason='HP_OR_INITIAL_COUNT_NOT_VALUE';
    if(reason){held.push({runId:run.id,reason});continue;}
    for(const frame of run.frames)candidates.push({kind:'DIRECT_ULTRA_RUNTIME',sourceMainKey:chain.sourceMainKey,sourceLandKey:chain.sourceLandKey,
      unitSize:'ULTRA',unitSizeSource:'DECLARED_SETUP',HealthMax:value(frame.fields.HealthMax),NumEntitiesInitial:value(frame.fields.NumEntitiesInitial),
      observedHealthPerCombatEntity:value(frame.fields.HealthMax)/value(frame.fields.NumEntitiesInitial),
      reference:frame.reference,runId:run.id,metadata:run.metadata,
      componentCounts:Object.fromEntries(Object.entries(frame.lists).map(([name,list])=>[name,value(list.size)??null]))});
  }
  // Invalid evidence for this identity is never silently discarded in favour of
  // another valid capture. Different HP/count pairs cannot select a winner.
  const conflicting=new Set(candidates.map(c=>stable([c.HealthMax,c.NumEntitiesInitial]))).size>1;
  if(!candidates.length&&!held.length)held.push({reason:'NO_MATCHING_ULTRA_RECORD'});
  const status=held.some(h=>h.reason==='UNIT_SIZE_MISMATCH')?'QUARANTINED_UNIT_SIZE':
    conflicting?'CONFLICTING_HP_EVIDENCE':held.length||parsed.problems.length?'WITHHELD':
    candidates.length?'REVIEWED_DIRECT_ULTRA_RUNTIME':'WITHHELD';
  return {status,candidates,held,...(status==='REVIEWED_DIRECT_ULTRA_RUNTIME'?{totalHealth:candidates[0].HealthMax}:{})};
}

export function replayHP(manifest,{root='.'}={}) {
  if(manifest.expectedUnitSize!=='ULTRA'||manifest.unitSizeSource!=='DECLARED_SETUP')fail('explicit ULTRA manifest required');
  if(new Set(manifest.subjects.map(s=>s.id)).size!==manifest.subjects.length||
    new Set(manifest.subjects.map(s=>s.mainKey)).size!==manifest.subjects.length)fail('duplicate approval identity');
  const staticSources=new Map();
  for(const source of manifest.staticSources){const bytes=readFileSync(`${root}/${source.file}`);if(byteHash(bytes)!==source.sha256)fail('static source hash changed');staticSources.set(source.file,JSON.parse(bytes));}
  const loaded=manifest.inputs.map(input=>{const bytes=readFileSync(`${root}/tools/wh3-importer/hp-policy/${input.file}`);if(byteHash(bytes)!==input.originalSha256)fail('original runtime log hash changed');return {name:input.file,text:bytes.toString('utf8')};});
  const parsed=parseProbeLogs(loaded);
  const review=manifest.subjects.map(subject=>{
    const source=staticSources.get(subject.staticSource),candidate=subject.slug?source.candidates.find(c=>c.slug===subject.slug):source;
    if(!candidate)fail('static candidate missing');
    const dump=structuredClone(candidate.dump);
    if(dump.schemaRefs)dump.schemas=dump.schemaRefs.map(ref=>{const schema=source.schemas.find(s=>`${s.table}:${s.version}`===ref);if(!schema)fail('schema missing');return schema;});
    const chain=hpStaticChain(dump);
    if(chain.sourceMainKey!==subject.mainKey||chain.sourceLandKey!==subject.landKey)fail('approval identity differs from static chain');
    const matchingEvents=parsed.events.filter(e=>{
      const f=e.event.data.fields;
      return value(f?.['UnitRecordContext.Key'])===subject.mainKey;
    });
    const runKeys=new Set(matchingEvents.map(e=>stable([e.event.sessionId,e.event.runId])));
    const scoped={...parsed,events:parsed.events.filter(e=>runKeys.has(stable([e.event.sessionId,e.event.runId])))};
    const result=reviewRuntimeHP(scoped,chain,manifest.expectedUnitSize);
    return {id:subject.id,name:subject.name,approved:subject.approved,staticSource:subject.staticSource,staticPointer:subject.slug??'dump',
      staticChain:chain,...result};
  });
  const admitted=review.filter(r=>r.approved&&r.status==='REVIEWED_DIRECT_ULTRA_RUNTIME').map(r=>({id:r.id,name:r.name,
    kind:'DIRECT_ULTRA_RUNTIME',field:'entities.totalHealth',value:r.totalHealth,
    baseUnitSha256:manifest.subjects.find(s=>s.id===r.id).baseUnitSha256,sourceMainKey:r.staticChain.sourceMainKey,
    sourceLandKey:r.staticChain.sourceLandKey,staticSnapshotId:r.staticChain.staticSnapshotId,
    references:r.candidates.map(c=>c.reference)}));
  if(review.some(r=>r.approved&&r.status!=='REVIEWED_DIRECT_ULTRA_RUNTIME'))fail('approved HP failed replay');
  return {format:'warhammer-vault-ultra-hp-review-v1',expectedUnitSize:'ULTRA',manifestSha256:byteHash(Buffer.from(JSON.stringify(manifest,null,2)+'\n')),
    baselineUnitsSha256:manifest.baselineUnitsSha256,review,admitted};
}
