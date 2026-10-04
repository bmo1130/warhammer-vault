import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { scanResearch, dedupeCandidates, policySha256, originalClassifierSha256 } from '../research-scan-bretonnia/scan.mjs';
import { sha256 } from '../research-classifier/classify.mjs';
import { pins, ownForceScope, operations, effectMappings } from '../research-classifier/policy.mjs';

export const reportSha256 = '97166548e93f0144c29ddc0b412f17719f450fbd90625b78d66ab6a1756d0aa3';
export const legacySha256 = '8faa8083057cd69360486563aff4c9c7633e2cf4d2df39e1e109adc3804d99b0';
export const serialize = value => JSON.stringify(value, null, 2) + '\n';
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
export const identity = c => [c.technologyKey,c.effectKey,c.mainKey,c.landKey,c.stat,c.operation,c.value];
const candidateId = c => JSON.stringify([c.technologyKey,c.effectKey,c.mainKey,c.stat]);
const effectId = (technologyKey,effectKey) => `${technologyKey}:${effectKey}`;
export function reviewedInput(report) {
  const effects=report.technologies.flatMap(t=>t.effects).filter(e=>e.status==='DIRECT_CANDIDATE');
  const candidates=dedupeCandidates(effects.flatMap(e=>e.candidates)).candidates;
  return {format:'wh3-reviewed-research-input-v1',reportSha256,
    effects:effects.map(e=>({technologyKey:e.technologyKey,effectKey:e.effectKey,sourceRowId:e.sourceRowId})),
    candidates:candidates.map(c=>({identity:identity(c),candidateSha256:sha256(JSON.stringify(c))}))};
}

// Exact duplicates may be collapsed; conflicting values, sources, joins or IDs
// sharing a technology/effect/main/path never acquire an arbitrary winner.
export function admitCandidates(input,canonical) {
  const deduped=dedupeCandidates(input);
  assert.equal(deduped.conflicts.length,0,'Admission candidate collision');
  const expected=new Map(canonical.map(c=>[candidateId(c),c]));
  for(const c of deduped.candidates) {
    assert(expected.has(candidateId(c)),'Candidate is not an approved DIRECT identity');
    assert.deepEqual(c,expected.get(candidateId(c)),'Candidate source/membership/identity/value drift');
    assert.equal(c.scope,ownForceScope.key);
    assert.equal(operations[c.stat],c.operation);
    assert(effectMappings[c.effectKey].mappings.some(m=>m.stat===c.stat&&m.operation===c.operation));
    assert(Number.isFinite(c.value),'Non-finite modifier');
  }
  assert.equal(deduped.candidates.length,canonical.length,'Candidate loss/gain');
  return deduped;
}

export function verifyLegacy(legacy,projection) {
  const identities=projection.modifiers.map(m=>{
    const e=projection.effects.find(e=>e.id===m.effectId),t=projection.targets.find(t=>t.unitId===m.unitId);
    assert(e&&t,'Missing projection reference');
    return [e.technologyKey,e.effectKey,t.mainKey,t.landKey,m.stat,m.operation,m.value];
  });
  const links=[];
  for(const [index,p] of legacy.entries()) for(const m of p.modifiers) {
    const effectKey=m.source.split(' · ')[1];
    const old=[p.researchKey,effectKey,p.mainKey,p.landKey,m.stat,m.operation,m.value];
    const matches=identities.map((i,n)=>isDeepStrictEqual(i,old)?n:-1).filter(n=>n>=0);
    assert.equal(matches.length,1,'Legacy Research lost, changed or duplicated');
    links.push({modifierId:projection.modifiers[matches[0]].id,legacyContext:index,legacyModifierId:m.id,
      sourceSha256:p.sourceSha256,reviewSha256:p.reviewSha256});
  }
  return links;
}

export function admitResearch({sourceBytes,unitsBytes,scanManifest,policyBytes,classifierBytes,reportBytes,reviewed,manifest,legacyBytes}) {
  assert.equal(manifest.format,'wh3-reviewed-research-admission-v1');
  assert.equal(manifest.baselineCommit,'fa163c22b1ea85eb7ec01c48399075bde27aed26');
  assert.equal(manifest.reportSha256,reportSha256);assert.equal(sha256(reportBytes),reportSha256);
  assert.equal(manifest.policySha256,policySha256);assert.equal(manifest.classifierSha256,originalClassifierSha256);
  assert.equal(manifest.sourceSha256,scanManifest.sourceSha256);
  assert.equal(manifest.unitsSha256,pins.unitsSha256);assert.equal(manifest.snapshotId,pins.snapshotId);
  assert.equal(manifest.legacySha256,legacySha256);assert.equal(sha256(legacyBytes),legacySha256);
  const {report}=scanResearch(sourceBytes,unitsBytes,scanManifest,policyBytes,classifierBytes);
  assert.equal(serialize(report),reportBytes.toString(),'Committed classifier report replay drift');
  assert.deepEqual(reviewed,reviewedInput(report),'Reviewed identity/digest drift');
  assert.equal(sha256(serialize(reviewed)),manifest.reviewedInputSha256);
  const selected=report.technologies.filter(t=>t.summary.DIRECT_CANDIDATE);
  const direct=selected.flatMap(t=>t.effects).filter(e=>e.status==='DIRECT_CANDIDATE');
  const canonical=dedupeCandidates(direct.flatMap(e=>e.candidates)).candidates;
  const {candidates}=admitCandidates(canonical,canonical);
  const units=JSON.parse(unitsBytes);
  for(const c of candidates) assert.equal(units.filter(u=>u.id===c.unitId&&u.gameVersion===pins.gameVersion).length,1,'Production target missing');
  const technologies=selected.map(t=>({key:t.key,name:t.name,sourceRowId:t.sourceRowId,localisationRowId:t.localisationRowId,
    partial:t.effects.some(e=>e.status!=='DIRECT_CANDIDATE'),
    omittedEffects:t.effects.filter(e=>e.status!=='DIRECT_CANDIDATE').map(e=>({effectKey:e.effectKey,classification:e.status,reason:e.reasonIds.join(' / ')}))
  })).sort((a,b)=>compare(a.name,b.name)||compare(a.key,b.key));
  const effects=direct.map(e=>({id:effectId(e.technologyKey,e.effectKey),technologyKey:e.technologyKey,effectKey:e.effectKey,
    sourceRowId:e.sourceRowId,rawValue:e.rawValue,scope:ownForceScope,
    omittedTargetCount:e.omittedTargets.length})).sort((a,b)=>compare(a.id,b.id));
  const targets=[...new Map(candidates.map(c=>[c.unitId,{unitId:c.unitId,mainKey:c.mainKey,landKey:c.landKey}])).values()].sort((a,b)=>compare(a.unitId,b.unitId));
  const modifiers=candidates.map(c=>({id:`ca-research:${c.technologyKey}:${c.effectKey}:${c.mainKey}:${c.stat}`,
    effectId:effectId(c.technologyKey,c.effectKey),unitId:c.unitId,stat:c.stat,operation:c.operation,value:c.value}));
  assert.equal(new Set(modifiers.map(m=>m.id)).size,modifiers.length,'Modifier ID collision');
  for(const target of targets) assert(candidates.filter(c=>c.unitId===target.unitId).every(c=>c.mainKey===target.mainKey&&c.landKey===target.landKey),'Conflicting applicability identity');
  const projection={format:'wh3-ca-research-projection-v1',sourceKind:'CA_RESEARCH',
    provenance:{admissionRef:'tools/wh3-importer/research-admission-batch-01/manifest.json',sourceSha256:manifest.sourceSha256,
      reportSha256,reviewedInputSha256:manifest.reviewedInputSha256,policySha256,snapshotId:pins.snapshotId,
      gameVersion:pins.gameVersion,static:report.source.provenance,originalExtraction:report.source.originalExtraction,legacySha256},
    technologies,effects,targets,modifiers};
  const legacyLinks=verifyLegacy(JSON.parse(legacyBytes),projection);
  const outputIdentities=modifiers.map(m=>{
    const e=effects.find(e=>e.id===m.effectId),t=targets.find(t=>t.unitId===m.unitId);
    return [e.technologyKey,e.effectKey,t.mainKey,t.landKey,m.stat,m.operation,m.value];
  });
  assert.deepEqual(outputIdentities,candidates.map(identity),'Candidate → projection equality');
  const skippedEffects=report.technologies.flatMap(t=>t.effects).filter(e=>e.status!=='DIRECT_CANDIDATE')
    .map(e=>({technologyKey:e.technologyKey,effectKey:e.effectKey,classification:e.status,reasonIds:e.reasonIds}));
  const summary={inputDirectEffects:direct.length,inputCandidates:candidates.length,admittedTechnologies:technologies.length,
    admittedEffects:effects.length,admittedCandidates:modifiers.length,targetUnits:targets.length,
    paths:[...new Set(modifiers.map(m=>m.stat))].sort(compare),operations:report.summary.candidates.operations,
    partialTechnologies:technologies.filter(t=>t.partial).map(t=>({key:t.key,name:t.name})),
    rejectedCandidates:0,skippedEffects:skippedEffects.length,collisionCount:0,legacyContexts:JSON.parse(legacyBytes).length,
    legacyModifiers:legacyLinks.length,projectionSha256:sha256(serialize(projection))};
  const admission={format:'wh3-reviewed-research-decisions-v1',reviewedInputSha256:manifest.reviewedInputSha256,
    technologies:technologies.map(t=>t.key),effects:effects.map(e=>e.id),
    candidates:candidates.map((c,i)=>({modifierId:modifiers[i].id,inputCandidateIndex:i,
      sourcePointer:{effectRowId:c.effectRowId,targetRowId:c.targetRowId,membershipRowIds:c.membershipRowIds,
        mainRowId:c.mainRowId,landRowId:c.landRowId,relationshipRefs:c.relationshipRefs,ruleIds:c.ruleIds}})),
    legacyLinks,rejectedCandidates:[],skippedEffects,summary};
  for(const [name,value] of Object.entries({'admission.json':admission,'projection.json':projection,'summary.json':summary}))
    assert.equal(sha256(serialize(value)),manifest.outputs[name],`Reviewed output digest drift: ${name}`);
  return {admission,projection,summary};
}
