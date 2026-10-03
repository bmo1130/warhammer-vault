import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildSpeedResearch,inspectSpeedTrace,serialize} from './research.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import speedOverlay from '../speed-policy/overlay.cjs';

const folder='tools/wh3-importer/speed-research/';
const read=file=>JSON.parse(readFileSync(file)),hash=b=>createHash('sha256').update(b).digest('hex');
const gate=(ok,message)=>{if(!ok)throw Error('Speed card research refused: '+message);};
const scopes={wh_main_emp_inf_swordsmen:{role:'man',profile:'NONFLYING_SINGLE_MAN_RUN'},
  wh_main_brt_cav_mounted_yeomen_0:{role:'mount',profile:'EXACT_MOUNTED_YEOMEN_CHAIN'},
  wh_main_brt_art_field_trebuchet:{role:'engine',profile:'EXACT_FIELD_TREBUCHETS_CHAIN'}};

export function loadCardTraces(ids=null) {
  // A bounded follow-up can materialize named existing traces without rerunning
  // the single-man, engine, flight or articulation catalog research.
  const inventory=ids===null?buildSpeedResearch():read(folder+'report.json');
  if(ids===null)gate(serialize(inventory)===readFileSync(folder+'report.json','utf8'),'original source inventory changed');
  else {
    gate(new Set(ids).size===ids.length&&ids.every(id=>inventory.catalog.some(e=>e.identity.id===id)),'missing/duplicate scoped identity');
    for(const pin of inventory.inputs){const bytes=pin.file==='src/data/units.json'?serialize(speedOverlay.withoutSpeed(read(pin.file))):readFileSync(pin.file);
      gate(hash(bytes)===pin.sha256,'scoped source pin changed: '+pin.file);}
  }
  const index=read('tools/wh3-importer/hp-research/report.json'),supplement=read('tools/wh3-importer/hp-research/articulation.source.json'),cache=new Map();
  return (ids===null?inventory.catalog:ids.map(id=>inventory.catalog.find(e=>e.identity.id===id))).map(entry=> {
    let bundle=cache.get(entry.source.file);
    if(!bundle){bundle=read(entry.source.file);if(entry.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,index.inputs.find(i=>i.file===entry.source.file).expandedSha256);cache.set(entry.source.file,bundle);}
    let dump=entry.source.pointer.replace(/^\/decoded/,'').slice(1).split('/').reduce((v,k)=>v?.[k],bundle);
    gate(dump,'missing exact trace');if(dump.schemaRefs)dump=restoreTrace(bundle,dump);
    const c=inspectSpeedTrace(dump,entry.identity,supplement),s=factSelectors(dump),ctx=observationContext(dump,s);
    const movementFacts=Object.fromEntries([['mounted_draughts',ctx.land,'mounted_draughts'],['sync_locomotion',ctx.land,'sync_locomotion'],
      ['engine_type',ctx.engine,'engine_type'],['draught_attachment_point',ctx.engine,'draught_attachment_point'],['rider_attachment_point',ctx.engine,'rider_attachment_point']]
      .map(([n,row,f])=>[n,s.fact(row,f)??null]));
    const speedSchemas=Object.fromEntries(Object.entries(c.roles).map(([role,r])=> {
      const def=dump.schemas.find(d=>d.table===r.facts.run_speed.source.table&&d.version===r.facts.run_speed.source.schemaVersion);
      return [role,{table:def.table,version:def.version,runSpeedType:def.fields.find(f=>f.name==='run_speed')?.field_type}];
    }));
    const scopedTopology=ids===null?{}:{scopedTopology:{
      mainKey:s.fact(ctx.root,'unit')?.value??null,landKey:s.fact(ctx.land,'key')?.value??null,
      mountRecords:dump.rows.filter(r=>r.table==='mounts_tables'&&s.reachable(r)).map(r=>({rowId:r.id,key:r.key,entity:s.fact(r,'entity')??null})),
      entityKeys:dump.rows.filter(r=>r.table==='battle_entities_tables'&&s.reachable(r)).map(r=>s.fact(r,'key')?.value??null),
    }};
    return {...c,source:entry.source,movementFacts,speedSchemas,...scopedTopology};
  });
}

// The single-man profile matches exact field/schema/join semantics, NOT entity
// key or numeric value: those remain each candidate's individually traced inputs.
// Mounted/engine inheritance is narrower: all movement record keys and values,
// flags and processed joins must match the measured anchor. Intermediate owner
// record names may differ only when their exact join reaches the same endpoints.
export function speedProfile(c,profile) {
  if(!Object.values(scopes).some(s=>s.profile===profile))return null;
  const roleNames=Object.keys(c.roles);
  const nonFlying=roleNames.every(role=>c.roles[role].facts.fly_speed?.value===0&&c.roles[role].facts.flying_charge_speed?.value===0);
  const refs=Object.fromEntries(Object.entries(c.refs).map(([r,f])=>[r,f?.value!==''&&f?.value!==undefined?true:f?.value===''?false:null]));
  const flags=Object.fromEntries(Object.entries(c.movementFacts).map(([k,f])=>[k,f?.value??null]));
  if(!nonFlying||c.extraSources.length||c.status==='SPEED_UNAVAILABLE'||flags.sync_locomotion!==false||flags.mounted_draughts!==false)return null;
  if(profile==='NONFLYING_SINGLE_MAN_RUN'&&(c.profile!=='MAN_ONLY'||roleNames.join()!=='man'))return null;
  if(profile==='EXACT_MOUNTED_YEOMEN_CHAIN'&&(c.profile!=='MOUNTED'||roleNames.join()!=='man,mount'))return null;
  if(profile==='EXACT_FIELD_TREBUCHETS_CHAIN'&&(c.profile!=='ENGINE'||roleNames.join()!=='man,engine'))return null;
  const simple=profile==='NONFLYING_SINGLE_MAN_RUN';
  const roles=Object.fromEntries(Object.entries(c.roles).map(([role,r])=>[role,{schema:c.speedSchemas[role],
    joins:r.facts.run_speed.source.joins.map(j=>({fromTable:j.from.split(':')[0],field:j.field,toTable:j.to.split(':')[0],
      targetField:j.targetField,direction:j.direction,traversal:j.traversal})),
    ...(!simple?{entityKey:r.key,values:Object.fromEntries(Object.entries(r.facts).map(([n,f])=>[n,f?.value??null]))}:{})}]));
  if(Object.values(roles).some(r=>r.schema.runSpeedType!=='F32'||r.joins.some(j=>j.direction!=='forward'||j.traversal!=='from-to'))||
    Object.entries(c.roles).some(([role,r])=>r.facts.run_speed.source.field!=='run_speed'||r.facts.run_speed.source.rowKey.key!==r.key||
      r.facts.run_speed.source.table!==c.speedSchemas[role].table||r.facts.run_speed.source.schemaVersion!==c.speedSchemas[role].version))return null;
  return serialize({profile,snapshotId:c.snapshotId,refs,flags,roles});
}

export function validateManualCard(sample,c) {
  const scope=scopes[sample.mainKey];gate(scope&&sample.id===c.identity.id&&sample.mainKey===c.identity.mainKey&&sample.landKey===c.identity.landKey,'manual exact identity mismatch');
  gate(c.status!=='SPEED_UNAVAILABLE'&&Number.isSafeInteger(sample.observedCardSpeed)&&sample.observedCardSpeed>0,'manual value/source unavailable');
  const matches=Object.entries(c.roles).filter(([,r])=>r.facts.run_speed.value*10===sample.observedCardSpeed);
  gate(matches.length===1&&matches[0][0]===scope.role,'manual card has missing/competing component match');
  const [role,r]=matches[0],association=sample.matchingStaticComponent;
  gate(association.role===role&&association.entityKey===r.key&&association.rawRunSpeed===r.facts.run_speed.value&&
    association.field==='battle_entities_tables.run_speed'&&association.transformationCandidate==='rawSpeed * 10'&&
    association.calculatedCandidate===sample.observedCardSpeed&&association.comparison==='MATCH','manual/static association mismatch');
  const signature=speedProfile(c,scope.profile);gate(signature,'manual anchor has unsupported movement profile');
  return {id:c.identity.id,mainKey:c.identity.mainKey,landKey:c.identity.landKey,kind:'MANUAL_CARD_VALIDATION',
    selectedComponent:role,selectedEntityKey:r.key,rawRunSpeed:r.facts.run_speed.value,observedCardSpeed:sample.observedCardSpeed,
    calculatedSpeed:r.facts.run_speed.value*10,comparison:'MATCH',profile:scope.profile,profileSha256:hash(Buffer.from(signature)),
    profileDefinition:JSON.parse(signature),source:c.source,sourceTrace:r.facts.run_speed.source,
    scope:'EXACT_STRUCTURAL_SPEED_CHAIN_ONLY',productionEligible:false};
}

export function classifyCardSpeed(c,anchors) {
  const result={identity:c.identity,source:c.source,staticSnapshotId:c.snapshotId,topology:c.profile,
    status:'SPEED_AMBIGUOUS',bucket:null,productionEligible:false,candidate:null};
  const hold=bucket=>({...result,bucket});
  if(c.status==='SPEED_UNAVAILABLE')return {...hold('SOURCE_UNAVAILABLE'),status:'SPEED_UNAVAILABLE',reasons:c.reasons};
  if(Object.values(c.roles).some(r=>typeof r.facts.run_speed?.value!=='number'||!Number.isFinite(r.facts.run_speed.value)||r.facts.run_speed.value<=0))
    return {...hold('SOURCE_UNAVAILABLE'),status:'SPEED_UNAVAILABLE'};
  if(Object.values(c.roles).some(r=>r.facts.fly_speed?.value!==0||r.facts.flying_charge_speed?.value!==0))return hold('FLYING_SEMANTICS_UNRESOLVED');
  if(c.extraSources.length)return hold('MULTIPLE_COMPETING_ENTITIES');
  if(c.profile==='ARTICULATED')return hold('ARTICULATED_COMPONENT_AMBIGUITY');
  const matched=anchors.filter(a=>{const scope=scopes[a.mainKey],profile=speedProfile(c,a.profile);
    return scope&&a.kind==='MANUAL_CARD_VALIDATION'&&a.comparison==='MATCH'&&a.profile===scope.profile&&a.selectedComponent===scope.role&&
      a.observedCardSpeed===a.rawRunSpeed*10&&a.calculatedSpeed===a.observedCardSpeed&&profile&&hash(Buffer.from(profile))===a.profileSha256;});
  if(matched.length>1)return hold('MULTIPLE_COMPETING_INTERPRETATIONS');
  if(!matched.length)return hold(c.profile==='MOUNTED'?'MOUNTED_PROFILE_NOT_VALIDATED':c.profile==='ENGINE'?'ENGINE_VEHICLE_PRECEDENCE_UNRESOLVED':'SINGLE_MAN_PROFILE_NOT_VALIDATED');
  const a=matched[0],r=c.roles[a.selectedComponent],raw=r.facts.run_speed.value,value=raw*10;
  if(!Number.isSafeInteger(value)||value<=0)return hold('TRANSFORMATION_ROUNDING_EDGE_CASE');
  return {...result,status:'SPEED_DIRECT_STATIC',candidate:{mainKey:c.identity.mainKey,landKey:c.identity.landKey,selectedComponent:a.selectedComponent,
    selectedEntityKey:r.key,rawRunSpeed:raw,calculatedSpeed:value,formula:'rawSpeed * 10',rounding:'NONE',validationAnchor:a.id,
    evidenceKind:'MANUAL_CARD_VALIDATION',validationBasis:c.identity.id===a.id?'DIRECT_MANUAL_CARD_MATCH':'EXACT_STRUCTURAL_PROFILE_INHERITANCE',
    profile:a.profile,profileSha256:a.profileSha256,sourceTrace:r.facts.run_speed.source}};
}

export function buildCardValidation() {
  const manual=read(folder+'manual-card-evidence.json'),traces=loadCardTraces();
  gate(manual.format==='manual-in-game-speed-card-validation-v1'&&manual.kind==='MANUAL_CARD_VALIDATION'&&
    manual.observationSource==='user manual in-game card reading'&&manual.reportedUnitSize==='ULTRA'&&manual.reportedCardKind==='NORMAL_CARD','manual provenance mismatch');
  gate(manual.samples.length===3&&new Set(manual.samples.map(s=>s.mainKey)).size===3&&manual.samples.every(s=>Object.hasOwn(scopes,s.mainKey)),'exact three manual anchors required');
  gate(manual.staticAssociation.sha256===hash(readFileSync(folder+'report.json'))&&traces.every(c=>c.snapshotId===manual.staticAssociation.snapshotId),'manual static snapshot association changed');
  const anchors=manual.samples.map(s=>validateManualCard(s,traces.find(c=>c.identity.id===s.id))),catalog=traces.map(c=>classifyCardSpeed(c,anchors));
  const buckets=Object.fromEntries([...new Set(catalog.filter(c=>c.bucket).map(c=>c.bucket))].sort().map(b=>[b,catalog.filter(c=>c.bucket===b).length]));
  const pending=traces.filter(c=>catalog.find(r=>r.identity.id===c.identity.id).bucket==='MOUNTED_PROFILE_NOT_VALIDATED'),groups=new Map();
  for(const c of pending){const signature=speedProfile(c,'EXACT_MOUNTED_YEOMEN_CHAIN');if(!signature)continue;
    const list=groups.get(signature)??[];list.push(c);groups.set(signature,list);}
  const suggestions=[...groups.values()].sort((a,b)=>b.length-a.length||(a[0].identity.id<b[0].identity.id?-1:a[0].identity.id>b[0].identity.id?1:0)).slice(0,3)
    .map(group=>({identity:group[0].identity,possibleExactProfileCoverage:group.length,
      compareCardAgainst:Object.fromEntries(Object.entries(group[0].roles).map(([role,r])=>[role,{entityKey:r.key,rawRunSpeed:r.facts.run_speed.value,timesTenCandidate:r.facts.run_speed.value*10}])),
      note:'Future reading only. No preferred source selected; coverage conditional on a unique matching card and exact profile.'}));
  return JSON.parse(serialize({purpose:'RESEARCH_CANDIDATES_ONLY',baselineCommit:'2b503dbc0360d88e97503a9b3e7fbde7ee77a451',productionEligible:false,
    inputs:[folder+'report.json',folder+'manual-card-evidence.json','src/data/units.json'].map(file=>({file,sha256:hash(file==='src/data/units.json'?
      serialize(speedOverlay.withoutSpeed(read(file))):readFileSync(file))})),
    transformation:{formula:'selected run_speed * 10',status:'VALIDATED_FOR_THREE_MANUAL_CARD_ANCHORS',rounding:'UNPROVEN; non-integer outputs withheld',
      universalRule:false,flightInference:false,normalizerPolicyChanged:false,observedGameVersion:manual.observedGameVersion,
      contextModifiers:manual.contextModifiers},anchors,
    counts:{production:catalog.length,...Object.fromEntries(['SPEED_DIRECT_STATIC','SPEED_AMBIGUOUS','SPEED_UNAVAILABLE'].map(status=>[status,catalog.filter(c=>c.status===status).length])),
      directByProfile:Object.fromEntries(anchors.map(a=>[a.profile,catalog.filter(c=>c.candidate?.profile===a.profile).length])),
      singleManGround:traces.filter(c=>c.singleGroundSource).length,singleManDirect:catalog.filter(c=>c.status==='SPEED_DIRECT_STATIC'&&c.topology==='MAN_ONLY').length},
    ambiguityBuckets:buckets,suggestions,catalog}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2];gate(process.argv.length===3&&['--write','--check'].includes(mode),'Use --write or --check; no Production projection.');
  const report=buildCardValidation(),bytes=serialize(report);
  if(mode==='--write')writeFileSync(folder+'card-validation.json',bytes);else gate(readFileSync(folder+'card-validation.json','utf8')===bytes,'candidate report replay differs');
  console.log(JSON.stringify({mode,...report.counts,buckets:report.ambiguityBuckets,productionEligible:false}));
}
