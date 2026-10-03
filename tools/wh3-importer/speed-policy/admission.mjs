import {readFileSync} from 'node:fs';
import {isDeepStrictEqual as equal} from 'node:util';
import {loadCardTraces,speedProfile,validateManualCard} from '../speed-research/card-validation.mjs';
import overlay from './overlay.cjs';
const read=f=>JSON.parse(readFileSync(f)),folder='tools/wh3-importer/speed-research/';
const gate=(ok,msg)=>{if(!ok)throw Error('Static Speed admission refused: '+msg);};
const stored=v=>JSON.parse(JSON.stringify(v));
const profiles={NONFLYING_SINGLE_MAN_RUN:'man',EXACT_MOUNTED_YEOMEN_CHAIN:'mount',EXACT_FIELD_TREBUCHETS_CHAIN:'engine'};
export function admitSpeed(subject,entry,trace,anchor,unit,snapshotId) {
  gate(entry&&trace&&unit,'missing exact candidate/source/Production identity');
  const c=entry.candidate;
  gate(subject.approved===true&&entry.status==='SPEED_DIRECT_STATIC'&&c,'not explicitly reviewed DIRECT');
  gate(subject.id===entry.identity.id&&subject.id==='ca_unit_'+subject.mainKey&&subject.mainKey===entry.identity.mainKey&&
    subject.landKey===entry.identity.landKey&&equal(trace.identity,entry.identity)&&unit?.id===subject.id&&unit.gameVersion!=='sample','exact identity mismatch');
  gate(trace.status!=='SPEED_UNAVAILABLE'&&trace.snapshotId===snapshotId&&entry.staticSnapshotId===snapshotId,'static snapshot/source mismatch');
  gate(c.profile===subject.profile&&profiles[c.profile]===c.selectedComponent&&trace.extraSources.length===0&&entry.bucket===null,'profile/competing interpretation');
  gate(anchor?.kind==='MANUAL_CARD_VALIDATION'&&anchor.id===c.validationAnchor&&anchor.comparison==='MATCH'&&anchor.profile===c.profile&&
    anchor.selectedComponent===c.selectedComponent&&c.evidenceKind==='MANUAL_CARD_VALIDATION'&&
    Number.isSafeInteger(anchor.observedCardSpeed)&&anchor.observedCardSpeed>0&&typeof anchor.rawRunSpeed==='number'&&
    anchor.observedCardSpeed===anchor.rawRunSpeed*10&&anchor.calculatedSpeed===anchor.observedCardSpeed,'validation anchor mismatch');
  const r=trace.roles[c.selectedComponent],fact=r?.facts.run_speed;
  gate(fact&&typeof fact.value==='number'&&Number.isFinite(fact.value)&&fact.value>0,'missing/invalid raw source');
  const signature=speedProfile(trace,c.profile);
  gate(signature&&overlay.hash(signature)===c.profileSha256&&c.profileSha256===anchor.profileSha256,'exact structural profile mismatch');
  gate(equal(entry.source,trace.source)&&r?.key===c.selectedEntityKey&&fact?.value===c.rawRunSpeed&&equal(stored(fact.source),c.sourceTrace),
    'exact selected entity/field/join mismatch');
  gate(c.sourceTrace.table==='battle_entities_tables'&&c.sourceTrace.field==='run_speed'&&c.sourceTrace.rowKey.key===r.key&&
    c.sourceTrace.joins.length>=2&&c.sourceTrace.joins.every(j=>j.direction==='forward'&&j.traversal==='from-to'&&j.evidence.includes('is_reference')),'required exact source joins missing');
  const value=fact.value*10;
  gate(typeof fact.value==='number'&&Number.isFinite(fact.value)&&fact.value>0&&Number.isSafeInteger(value)&&value>0&&
    c.formula==='rawSpeed * 10'&&c.rounding==='NONE'&&c.calculatedSpeed===value&&subject.expectedSpeed===value,'invalid/unsupported transformation');
  gate(!Object.hasOwn(unit.movement,'speed')||unit.movement.speed===value,'existing Production Speed conflict');
  const base=structuredClone(unit);delete base.movement.speed;
  gate(overlay.hash(overlay.serialize(base))===subject.baseUnitSha256,'non-Speed Production drift');
  return {id:subject.id,mainKey:subject.mainKey,landKey:subject.landKey,kind:'STATIC_DERIVED_SPEED',field:'movement.speed',value,
    selectedComponent:c.selectedComponent,selectedEntityKey:c.selectedEntityKey,rawRunSpeed:fact.value,formula:c.formula,rounding:'NONE',
    staticSnapshotId:snapshotId,profile:c.profile,profileSha256:c.profileSha256,confidence:'EXACT_MANUAL_VALIDATED_SPEED_CHAIN_PROFILE_ONLY',
    baseUnitSha256:subject.baseUnitSha256,staticSource:entry.source,
    sourceFieldReference:folder+'card-validation.json#/catalog/'+read(folder+'card-validation.json').catalog.findIndex(e=>e.identity.id===subject.id)+'/candidate/sourceTrace',
    validationAnchor:{id:anchor.id,kind:'MANUAL_CARD_VALIDATION',observedCardSpeed:anchor.observedCardSpeed,
      reference:folder+'manual-card-evidence.json#/samples/'+read(folder+'manual-card-evidence.json').samples.findIndex(s=>s.id===anchor.id)},
    validationBasis:c.validationBasis};
}
export function replaySpeed(manifest=read('tools/wh3-importer/speed-policy/manifest.json'),units=read('src/data/units.json')) {
  gate(manifest.format==='explicit-reviewed-74-static-speed-v1','manifest format');
  gate(overlay.hash(overlay.serialize(manifest))===overlay.manifestSha256,'explicit manifest changed');
  const report=read(folder+'card-validation.json'),manual=read(folder+'manual-card-evidence.json'),inventory=read(folder+'report.json');
  const required=[...new Set([folder+'card-validation.json',folder+'manual-card-evidence.json',...inventory.inputs.filter(i=>i.file!=='src/data/units.json').map(i=>i.file)])];
  gate(equal(manifest.inputs.map(i=>i.file),required),'required input pins missing/changed');
  for(const p of manifest.inputs)gate(overlay.hash(readFileSync(p.file))===p.sha256,'pinned evidence changed: '+p.file);
  gate(manifest.staticSnapshotId===inventory.staticSnapshotId&&manual.kind==='MANUAL_CARD_VALIDATION'&&manual.samples.length===3,'snapshot/manual evidence mismatch');
  const direct=report.catalog.filter(e=>e.status==='SPEED_DIRECT_STATIC');
  gate(direct.length===74&&manifest.subjects.length===74&&new Set(manifest.subjects.map(s=>s.id)).size===74&&
    equal(manifest.subjects.map(s=>s.id),direct.map(e=>e.identity.id)),'only the exact previously reviewed 74 allowed');
  const baseline=overlay.withoutSpeed(units);
  gate(overlay.hash(overlay.serialize(baseline))===manifest.baselineUnitsSha256,'non-Speed catalog/Sample/order drift');
  const traces=loadCardTraces();
  const anchors=manual.samples.map(s=>stored(validateManualCard(s,traces.find(t=>t.identity.id===s.id))));
  gate(equal(anchors,report.anchors),'stored anchor differs from exact source/manual evidence');
  const admissions=manifest.subjects.map((s,i)=>admitSpeed(s,direct[i],traces.find(t=>t.identity.id===s.id),
    anchors.find(a=>a.id===direct[i].candidate.validationAnchor),units.find(u=>u.id===s.id),manifest.staticSnapshotId));
  return {format:'reviewed-unit-static-speed-admissions-v1',manifestReference:'tools/wh3-importer/speed-policy/manifest.json',
    manifestSha256:overlay.hash(overlay.serialize(manifest)),candidateReportReference:folder+'card-validation.json',
    candidateReportSha256:overlay.hash(readFileSync(folder+'card-validation.json')),admissions};
}
