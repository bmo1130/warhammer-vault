import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {createHash} from 'node:crypto';
import {loadCardTraces,speedProfile,validateManualCard} from './card-validation.mjs';
import {serialize} from './research.mjs';
const folder='tools/wh3-importer/speed-research/',read=f=>JSON.parse(readFileSync(f));
const hash=b=>createHash('sha256').update(b).digest('hex'),stored=v=>JSON.parse(serialize(v));
const gate=(ok,m)=>{if(!ok)throw Error('Mounted Speed research refused: '+m);};
const scopes={
  wh_main_brt_cav_mounted_yeomen_0:{profile:'EXACT_MOUNTED_YEOMEN_CHAIN',speed:92},
  wh_main_brt_cav_knights_of_the_realm:{profile:'EXACT_KNIGHTS_OF_THE_REALM_CHAIN',speed:84},
  wh2_main_lzd_cav_cold_ones_1:{profile:'EXACT_COLD_ONE_RIDERS_CHAIN',speed:66},
  wh_main_brt_cav_grail_knights:{profile:'EXACT_GRAIL_KNIGHTS_CHAIN',speed:84},
};
function profile(c,name) {
  if(!Object.values(scopes).some(s=>s.profile===name))return null;
  const signature=speedProfile(c,'EXACT_MOUNTED_YEOMEN_CHAIN');
  return signature?serialize({...JSON.parse(signature),profile:name}):null;
}
function structuralHold(c) {
  if(c.status==='SPEED_UNAVAILABLE')return 'SOURCE_UNAVAILABLE';
  if(c.identity.id!=='ca_unit_'+c.identity.mainKey||c.identity.mainKey!==c.scopedTopology.mainKey||c.identity.landKey!==c.scopedTopology.landKey)return 'EXACT_IDENTITY_MISMATCH';
  if(c.profile!=='MOUNTED'||Object.keys(c.roles).join()!=='man,mount'||c.refs.engine?.value!==''||c.refs.articulation?.value!=='')return 'HYBRID_OR_MISSING_COMPONENT';
  if(c.extraSources.length||c.scopedTopology.mountRecords.length!==1)return 'MULTIPLE_MOUNT_OR_ENTITY_SOURCES';
  if(c.roles.man.key===c.roles.mount.key)return 'RIDER_MOUNT_SOURCE_NOT_DISTINGUISHABLE';
  if(c.scopedTopology.entityKeys.length!==2||new Set(c.scopedTopology.entityKeys).size!==2)return 'MULTIPLE_MOUNT_OR_ENTITY_SOURCES';
  if(Object.values(c.roles).some(r=>typeof r.facts.run_speed?.value!=='number'||!Number.isFinite(r.facts.run_speed.value)||r.facts.run_speed.value<=0))return 'SOURCE_UNAVAILABLE';
  if(c.scopedTopology.mountRecords[0].entity?.value!==c.roles.mount.key||c.scopedTopology.mountRecords[0].rowId!==c.roles.mount.facts.run_speed?.source.joins[1]?.to)
    return 'MOUNT_JOIN_MISMATCH';
  if(Object.values(c.roles).some(r=>r.facts.fly_speed?.value!==0||r.facts.flying_charge_speed?.value!==0))return 'FLYING_SEMANTICS_UNRESOLVED';
  if(c.movementFacts.sync_locomotion?.value!==false||c.movementFacts.mounted_draughts?.value!==false)return 'MOVEMENT_FLAGS_NOT_VALIDATED';
  return null;
}
export function validateMountedCard(sample,c,manualReference) {
  const scope=scopes[sample.mainKey];
  gate(scope&&sample.id===c.identity.id&&sample.mainKey===c.identity.mainKey&&sample.landKey===c.identity.landKey,'manual exact identity mismatch');
  gate(sample.observedCardSpeed===scope.speed&&structuralHold(c)===null,'manual value/structural scope mismatch');
  for(const role of ['man','mount']) {
    const fact=c.roles[role].facts.run_speed,association=sample.components[role];
    gate(association?.entityKey===c.roles[role].key&&association.rawRunSpeed===fact.value&&association.timesTenCandidate===fact.value*10,'rider/mount association mismatch');
  }
  const matches=Object.entries(c.roles).filter(([,r])=>r.facts.run_speed.value*10===sample.observedCardSpeed),a=sample.matchingStaticComponent;
  gate(matches.length===1&&matches[0][0]==='mount'&&a.role==='mount'&&a.entityKey===c.roles.mount.key&&a.rawRunSpeed===c.roles.mount.facts.run_speed.value&&
    a.field==='battle_entities_tables.run_speed'&&a.transformationCandidate==='rawSpeed * 10'&&a.calculatedCandidate===sample.observedCardSpeed&&a.comparison==='MATCH','unique manual mount match missing');
  const signature=profile(c,scope.profile);gate(signature,'exact typed profile unavailable');
  return stored({id:sample.id,mainKey:sample.mainKey,landKey:sample.landKey,kind:'MANUAL_CARD_VALIDATION',manualReference,
    rider:sample.components.man,mount:sample.components.mount,observedCardSpeed:sample.observedCardSpeed,selectedComponent:'mount',
    comparison:'MATCH',formula:'mount run_speed * 10',profile:scope.profile,profileSha256:hash(signature),profileDefinition:JSON.parse(signature),
    source:c.source,sourceTraces:{man:c.roles.man.facts.run_speed.source,mount:c.roles.mount.facts.run_speed.source},productionEligible:false});
}
export function assessMounted(c,anchors) {
  const result={identity:c.identity,source:c.source,staticSnapshotId:c.snapshotId,status:'SPEED_AMBIGUOUS',reason:null,candidate:null,productionEligible:false,
    components:Object.fromEntries(['man','mount'].map(role=>[role,{entityKey:c.roles[role]?.key??null,rawRunSpeed:c.roles[role]?.facts.run_speed?.value??null,
      timesTenCandidate:c.roles[role]?.facts.run_speed?c.roles[role].facts.run_speed.value*10:null}])),
    mountRelation:c.refs.mount,topology:c.scopedTopology,sourceTraces:Object.fromEntries(['man','mount'].map(role=>[role,c.roles[role]?.facts.run_speed?.source??null])),
    movementFlags:Object.fromEntries(Object.entries(c.movementFacts).map(([name,f])=>[name,f?.value??null])),
    overrideScope:'NO_ADDITIONAL_BASE_MOVEMENT_SOURCE_IN_REVIEWED_TRACE; conditional ground effects excluded'};
  const hold=reason=>({...result,reason}),structural=structuralHold(c);
  if(structural)return {...hold(structural),...(structural==='SOURCE_UNAVAILABLE'?{status:'SPEED_UNAVAILABLE'}:{})};
  const matches=anchors.filter(a=> {
    const scope=scopes[a.mainKey],signature=profile(c,a.profile);
    return scope&&a.id==='ca_unit_'+a.mainKey&&a.kind==='MANUAL_CARD_VALIDATION'&&a.comparison==='MATCH'&&a.selectedComponent==='mount'&&
      a.profile===scope.profile&&a.observedCardSpeed===scope.speed&&a.observedCardSpeed===a.mount.rawRunSpeed*10&&
      a.rider.entityKey===a.profileDefinition.roles.man.entityKey&&a.rider.rawRunSpeed===a.profileDefinition.roles.man.values.run_speed&&
      a.mount.entityKey===a.profileDefinition.roles.mount.entityKey&&a.mount.rawRunSpeed===a.profileDefinition.roles.mount.values.run_speed&&
      signature&&hash(signature)===a.profileSha256&&equal(JSON.parse(signature),a.profileDefinition);
  });
  if(matches.length!==1)return hold(matches.length?'COMPETING_VALIDATION_PROFILES':'EXACT_MOUNTED_PROFILE_NOT_VALIDATED');
  const a=matches[0],raw=c.roles.mount.facts.run_speed.value,value=raw*10;
  if(!Number.isSafeInteger(value)||value<=0)return hold('TRANSFORMATION_ROUNDING_EDGE_CASE');
  return {...result,status:'SPEED_DIRECT_STATIC',candidate:{mainKey:c.identity.mainKey,landKey:c.identity.landKey,selectedComponent:'mount',
    selectedEntityKey:c.roles.mount.key,rawRunSpeed:raw,calculatedSpeed:value,formula:'rawSpeed * 10',rounding:'NONE',
    validationAnchor:a.id,profile:a.profile,profileSha256:a.profileSha256,
    validationBasis:c.identity.id===a.id?'DIRECT_MANUAL_CARD_MATCH':'EXACT_STRUCTURAL_PROFILE_INHERITANCE',
    sourceTraceReference:'sourceTraces/mount',evidenceKind:'MANUAL_CARD_VALIDATION'}};
}
export function loadMountedScope() {
  // Preserve the immutable source of the already admitted 74; no new approval.
  const pins=read('tools/wh3-importer/speed-policy/manifest.json').inputs;
  for(const p of pins)gate(hash(readFileSync(p.file))===p.sha256,'existing evidence pin changed: '+p.file);
  const baseline=read(folder+'card-validation.json'),scope=baseline.catalog.filter(c=>c.bucket==='MOUNTED_PROFILE_NOT_VALIDATED'),oldManual=read(folder+'manual-card-evidence.json');
  gate(scope.length===17&&scope.every(c=>c.status==='SPEED_AMBIGUOUS'&&c.topology==='MOUNTED'),'original mounted 17 scope changed');
  const yeomen=oldManual.samples.find(s=>s.mainKey==='wh_main_brt_cav_mounted_yeomen_0');gate(yeomen,'original mounted anchor missing');
  const traces=loadCardTraces([...scope.map(c=>c.identity.id),yeomen.id]);
  gate(scope.every(e=>equal(e.identity,traces.find(c=>c.identity.id===e.identity.id).identity)&&equal(e.source,traces.find(c=>c.identity.id===e.identity.id).source)),'scoped identity/source pointer changed');
  return {baseline,scope,oldManual,yeomen,traces};
}
export function buildMountedValidation() {
  const {baseline,scope,oldManual,yeomen,traces}=loadMountedScope(),manual=read(folder+'mounted-manual-card-evidence.json');
  gate(manual.format==='manual-mounted-speed-card-validation-v1'&&manual.kind==='MANUAL_CARD_VALIDATION'&&manual.observationSource==='user manual in-game card observation','manual provenance mismatch');
  const expected=Object.keys(scopes).slice(1);
  gate(equal(manual.samples.map(s=>s.mainKey),expected)&&manual.samples.length===3,'exact three new readings required');
  gate(oldManual.staticAssociation.sha256===hash(readFileSync(folder+'report.json'))&&
    manual.staticAssociation.sha256===oldManual.staticAssociation.sha256&&traces.every(c=>c.snapshotId===manual.staticAssociation.snapshotId),'static snapshot association drift');
  const y=traces.find(c=>c.identity.id===yeomen.id),original=stored(validateManualCard(yeomen,y));
  gate(equal(original,baseline.anchors.find(a=>a.id===yeomen.id)),'original Mounted Yeomen validation changed');
  const ySample={...yeomen,components:Object.fromEntries(['man','mount'].map(role=>[role,{entityKey:y.roles[role].key,
    rawRunSpeed:y.roles[role].facts.run_speed.value,timesTenCandidate:y.roles[role].facts.run_speed.value*10}]))};
  const anchors=[validateMountedCard(ySample,y,folder+'manual-card-evidence.json#/samples/'+oldManual.samples.indexOf(yeomen)),
    ...manual.samples.map((s,i)=>validateMountedCard(s,traces.find(c=>c.identity.id===s.id),folder+'mounted-manual-card-evidence.json#/samples/'+i))];
  const catalog=scope.map(e=>assessMounted(traces.find(c=>c.identity.id===e.identity.id),anchors)),direct=catalog.filter(c=>c.status==='SPEED_DIRECT_STATIC').length,
    unavailable=catalog.filter(c=>c.status==='SPEED_UNAVAILABLE').length;
  const buckets=Object.fromEntries([...new Set(catalog.filter(c=>c.reason).map(c=>c.reason))].sort().map(r=>[r,catalog.filter(c=>c.reason===r).length]));
  return stored({purpose:'MOUNTED_17_RESEARCH_CANDIDATES_ONLY',baselineCommit:'faf5b2aa724b0dffcdb53fb633ed34ab20fd720b',productionEligible:false,
    inputs:[folder+'card-validation.json',folder+'manual-card-evidence.json',folder+'mounted-manual-card-evidence.json','src/data/units.json',
      'src/data/unitSpeedAdmissions.json','tools/wh3-importer/speed-policy/manifest.json'].map(file=>({file,sha256:hash(readFileSync(file))})),
    staticSnapshotId:manual.staticAssociation.snapshotId,materializedIdentityIds:traces.map(c=>c.identity.id),anchors,
    counts:{mountedReviewed:17,mountedAnchors:4,newDirect:direct,mountedAmbiguous:catalog.filter(c=>c.status==='SPEED_AMBIGUOUS').length,
      unavailable,
      expectedCatalog:{SPEED_DIRECT_STATIC:baseline.counts.SPEED_DIRECT_STATIC+direct,SPEED_AMBIGUOUS:baseline.counts.SPEED_AMBIGUOUS-direct-unavailable,
        SPEED_UNAVAILABLE:baseline.counts.SPEED_UNAVAILABLE+unavailable},unchangedProduction:{speedPopulated:74,speedBlank:27}},
    ambiguityReasons:buckets,untouchedBuckets:{ENGINE_VEHICLE_PRECEDENCE_UNRESOLVED:5,FLYING_SEMANTICS_UNRESOLVED:3,ARTICULATED_COMPONENT_AMBIGUITY:2},
    catalog});
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2];gate(process.argv.length===3&&['--write','--check'].includes(mode),'Use --write or --check; no Production projection.');
  const report=buildMountedValidation(),bytes=serialize(report),file=folder+'mounted-validation.json';
  if(mode==='--write')writeFileSync(file,bytes);else gate(readFileSync(file,'utf8')===bytes,'mounted report replay differs');
  console.log(JSON.stringify({mode,...report.counts,reasons:report.ambiguityReasons}));
}
