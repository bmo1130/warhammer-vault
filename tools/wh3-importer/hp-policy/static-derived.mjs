import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {byteHash} from './policy.mjs';
import {buildBlackCoachResearch,profileSignature,assessProfile} from '../hp-research/black-coach.mjs';
import {inspectStaticHP,serialize} from '../hp-research/research.mjs';
import {scopedPrediction} from '../hp-research/followup.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import {digest} from '../runtime-evidence/contract.mjs';
import speedOverlay from '../speed-policy/overlay.cjs';

const folder='tools/wh3-importer/hp-policy/',research='tools/wh3-importer/hp-research/';
const read=file=>JSON.parse(readFileSync(file));
const gate=(ok,message)=>{if(!ok)throw Error('Static HP admission refused: '+message);};
// Explicit scope, not a classifier or permission for other matching units.
const allowed={
  wh_main_emp_inf_spearmen_1:{value:8280,profile:'MAN_ONLY',anchor:'ca_unit_wh_main_emp_inf_swordsmen'},
  wh_dlc07_brt_inf_battle_pilgrims_0:{value:8280,profile:'MAN_ONLY',anchor:'ca_unit_wh_main_emp_inf_swordsmen'},
  wh_dlc07_brt_art_blessed_field_trebuchet_0:{value:4512,profile:'ARTILLERY',anchor:'ca_unit_wh_main_brt_art_field_trebuchet'},
};

// Materialize only the three approved traces with the existing decoder/selectors.
export function staticHPCase(entry,selection,historical) {
  const c=selection.catalog.find(c=>c.id===entry.id),pin=historical.inputs.find(p=>p.file===entry.staticSource.file);
  gate(c&&pin&&isDeepStrictEqual(c.source,entry.staticSource),'source pointer changed');
  const bytes=readFileSync(pin.file);gate(byteHash(bytes)===pin.bytesSha256,'static source bytes changed');
  let bundle=JSON.parse(bytes);
  if(c.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,pin.expandedSha256);
  let dump=c.source.pointer.replace(/^\/decoded/,'').slice(1).split('/').reduce((v,k)=>v?.[k],bundle);
  gate(dump,'missing source pointer');if(dump.schemaRefs)dump=restoreTrace(bundle,dump);
  const inspected=inspectStaticHP(dump),s=factSelectors(dump),ctx=observationContext(dump,s);
  const classification=Object.fromEntries([['caste',ctx.root,'caste'],['category',ctx.land,'category'],['class',ctx.land,'class']]
    .map(([n,row,f])=>[n,s.fact(row,f)?.value]));
  gate(isDeepStrictEqual(classification,c.classification)&&inspected.shape===c.shape,'classification changed');
  const structuralFacts=Object.fromEntries([['engine_type',ctx.engine,'engine_type'],['draught_attachment_point',ctx.engine,'draught_attachment_point'],
    ['rider_attachment_point',ctx.engine,'rider_attachment_point'],['mounted_draughts',ctx.land,'mounted_draughts'],['sync_locomotion',ctx.land,'sync_locomotion']]
    .map(([n,row,f])=>[n,s.fact(row,f)??null]));
  const joinShape=Object.fromEntries(Object.entries(inspected.facts).filter(([,f])=>f).map(([n,f])=>[n,
    {table:f.source.table,field:f.source.field,schemaVersion:f.source.schemaVersion,
      joins:f.source.joins.map(j=>({field:j.field,targetField:j.targetField,direction:j.direction}))}]));
  return {id:c.id,name:c.name,mainKey:inspected.chain.sourceMainKey,landKey:inspected.chain.sourceLandKey,
    staticSnapshotId:inspected.chain.staticSnapshotId,snapshot:inspected.chain.snapshot,shape:inspected.shape,classId:entry.classId,
    classification,staticValues:Object.fromEntries(Object.entries(inspected.facts).map(([n,f])=>[n,f?.value??null])),
    componentRecords:{...Object.fromEntries(Object.entries(inspected.entities).map(([r,f])=>[r,f?.value??null])),
      mountRecord:inspected.refs.mount?.value||null,engineRecord:inspected.refs.engine?.value||null,
      articulationRecord:inspected.refs.articulated_record?.value||null},
    joinShape,structuralFlags:Object.fromEntries(Object.entries(structuralFacts).map(([n,f])=>[n,f?.value??null])),
    missing:inspected.missing,extraEntities:c.additionalExactJoinedHP,exactFacts:inspected.facts,
    references:inspected.refs,entityKeys:inspected.entities,structuralFacts,staticSource:c.source,sourcePin:pin};
}

export function admitStaticHP(subject,c,anchor,assessment,direct,unit,snapshotId) {
  const scope=allowed[subject.mainKey];
  gate(scope&&subject.approved===true&&subject.id==='ca_unit_'+subject.mainKey&&subject.landKey===subject.mainKey,'unapproved exact identity');
  gate(c.id===subject.id&&c.mainKey===subject.mainKey&&c.landKey===subject.landKey&&unit?.id===subject.id,'identity mismatch');
  gate(c.staticSnapshotId===snapshotId&&digest(c.snapshot)===snapshotId&&anchor?.staticSnapshotId===snapshotId,'static snapshot mismatch');
  gate(c.classId===scope.profile&&subject.profile===scope.profile&&subject.anchor===scope.anchor&&anchor.id===scope.anchor,'profile/anchor scope mismatch');
  gate(c.missing.length===0&&c.extraEntities.length===0,'missing/extra HP sources');
  gate(isDeepStrictEqual(Object.keys(c.exactFacts).sort(),Object.keys(anchor.exactFacts).sort()),'missing required field');
  for(const [ref,role] of [['man_entity','man'],['mount','mount'],['engine','engine'],['articulated_record','articulation']]) {
    const expected=role==='man'?c.componentRecords.man:c.componentRecords[role+'Record'];
    gate(c.references[ref]?.source?.rowId&&c.references[ref].value===(expected??''),'missing/changed component join');
    if(c.componentRecords[role])gate(c.entityKeys[role]?.value===c.componentRecords[role]&&
      c.entityKeys[role].source.rowId===c.exactFacts[role+'.hit_points']?.source.rowId,'missing entity/HP join');
  }
  gate(assessment.status==='STATIC_DERIVATION_CONFIDENT'&&Object.values(assessment.checks).every(v=>v===true)&&assessment.anchors.includes(anchor.id),'research confidence failed');
  for(const [name,fact] of Object.entries(c.exactFacts)) {
    gate(c.staticValues[name]===(fact?.value??null),'source field value mismatch');
    if(fact) {
      gate(Number.isSafeInteger(fact.value)&&fact.value>=0&&fact.source?.rowId&&fact.source.schemaVersion&&Array.isArray(fact.source.joins),'missing required field provenance');
      const expected=anchor.joinShape[name];
      gate(expected&&isDeepStrictEqual(c.joinShape[name],expected),'required exact join changed');
      gate(isDeepStrictEqual(fact.source.joins.map(j=>({field:j.field,targetField:j.targetField,direction:j.direction})),expected.joins),'field join provenance changed');
    }
  }
  gate(profileSignature(c)===profileSignature(anchor)&&byteHash(Buffer.from(profileSignature(c)))===subject.hpProfileSha256,'HP-chain profile mismatch');
  gate(anchor.runtimeRolesMatch&&anchor.runtimeCountsMatch&&anchor.comparisons.V_N.matchesHealth&&anchor.comparisons.V_N.matchesCount,'runtime profile not validated');
  gate(direct?.kind==='DIRECT_ULTRA_RUNTIME'&&direct.id===anchor.id&&direct.staticSnapshotId===snapshotId&&
    anchor.runtime.unitSize==='ULTRA'&&anchor.runtime.unitSizeSource==='DECLARED_SETUP'&&direct.value===anchor.runtime.HealthMax,'runtime validation basis mismatch');
  const prediction=scopedPrediction(c,'N');
  gate(prediction&&Number.isSafeInteger(prediction.HealthMax)&&prediction.HealthMax>0,'invalid derivation result');
  gate(assessment.reviewedHPOutputs.length===1&&assessment.reviewedHPOutputs[0]===prediction.HealthMax,'competing derivation');
  gate(prediction.NumEntitiesInitial===anchor.runtime.NumEntitiesInitial&&prediction.HealthMax===direct.value&&
    prediction.HealthMax===subject.expectedHP&&subject.expectedHP===scope.value,'derivation differs from explicit approval');
  gate(!Object.hasOwn(unit.entities,'totalHealth')||unit.entities.totalHealth===prediction.HealthMax,'existing Production HP conflict');
  const base=speedOverlay.withoutSpeed([unit])[0];delete base.entities.totalHealth;
  gate(byteHash(Buffer.from(serialize(base)))===subject.baseUnitSha256,'non-HP Production drift');
  return {id:c.id,name:c.name,sourceMainKey:c.mainKey,sourceLandKey:c.landKey,staticSnapshotId:c.staticSnapshotId,
    kind:'STATIC_DERIVED_HP',field:'entities.totalHealth',value:prediction.HealthMax,baseUnitSha256:subject.baseUnitSha256,
    unitSize:'ULTRA',unitSizeSource:'RUNTIME_VALIDATED_EXACT_PROFILE',profile:subject.profile,hpProfileSha256:subject.hpProfileSha256,
    formula:prediction.formula,inputs:c.staticValues,logicalCount:prediction.NumEntitiesInitial,
    confidence:'EXACT_RUNTIME_VALIDATED_HP_CHAIN_PROFILE_ONLY',checks:assessment.checks,
    staticSource:c.staticSource,sourcePin:c.sourcePin,snapshot:c.snapshot,
    sourceFields:c.exactFacts,componentReferences:c.references,entityKeys:c.entityKeys,structuralFacts:c.structuralFacts,
    runtimeValidation:{id:anchor.id,kind:direct.kind,reviewReference:folder+'review.json',
      HealthMax:anchor.runtime.HealthMax,NumEntitiesInitial:anchor.runtime.NumEntitiesInitial,
      unitSize:anchor.runtime.unitSize,unitSizeSource:anchor.runtime.unitSizeSource,references:anchor.runtime.references}};
}

export function replayStaticHP(manifest=read(folder+'static-manifest.json')) {
  gate(manifest.format==='explicit-three-unit-static-hp-v1'&&manifest.unitSize==='ULTRA','manifest/Unit Size mismatch');
  gate(manifest.subjects.length===3&&new Set(manifest.subjects.map(s=>s.mainKey)).size===3&&
    manifest.subjects.every(s=>Object.hasOwn(allowed,s.mainKey)),'only three approved identities allowed');
  const requiredInputs=[research+'black-coach.json',research+'selection.json',research+'report.json',folder+'manifest.json',folder+'review.json'];
  gate(isDeepStrictEqual(manifest.inputs.map(i=>i.file),requiredInputs),'required input pins missing/changed');
  for(const input of manifest.inputs)gate(byteHash(readFileSync(input.file))===input.sha256,'pinned input changed: '+input.file);
  const latest=buildBlackCoachResearch();
  gate(serialize(latest)===readFileSync(research+'black-coach.json','utf8'),'latest research replay differs');
  const selection=read(research+'selection.json'),historical=read(research+'report.json'),runtime=read(folder+'review.json'),units=read('src/data/units.json');
  gate(selection.staticSnapshotId===manifest.staticSnapshotId,'manifest snapshot changed');
  const admitted=manifest.subjects.map(subject=> {
    const entry=latest.catalog.find(c=>c.id===subject.id);gate(entry,'missing exact research identity');
    const c=staticHPCase(entry,selection,historical),anchor=latest.cases.find(c=>c.id===subject.anchor),
      assessment=assessProfile(c,latest.cases,latest.survivingReviewedFormulations);
    gate(isDeepStrictEqual(assessment,entry.assessment)&&entry.hpProfileSha256===subject.hpProfileSha256,'research assessment/profile changed');
    return admitStaticHP(subject,c,anchor,assessment,runtime.admitted.find(a=>a.id===subject.anchor),units.find(u=>u.id===subject.id),manifest.staticSnapshotId);
  });
  // Existing selectors expose optional undefined path properties. Compare the
  // same JSON representation that the committed source/review contract stores.
  return JSON.parse(serialize({format:'reviewed-three-unit-static-ultra-hp-v1',manifestSha256:byteHash(Buffer.from(serialize(manifest))),
    inputs:manifest.inputs,unitSize:'ULTRA',admitted}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2];gate(process.argv.length===3&&['--check','--write'].includes(mode),'Use --check or --write.');
  const bytes=serialize(replayStaticHP()),file=folder+'static-review.json';
  if(mode==='--write')writeFileSync(file,bytes);else gate(bytes===readFileSync(file,'utf8'),'static review replay differs');
  console.log(JSON.stringify({mode,admitted:3,kind:'STATIC_DERIVED_HP'}));
}
