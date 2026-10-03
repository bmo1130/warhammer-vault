import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import {evaluateHypothesis} from '../hypotheses.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';
import speedOverlay from '../speed-policy/overlay.cjs';

const folder='tools/wh3-importer/speed-research/';
const read=file=>JSON.parse(readFileSync(file));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
const hash=b=>createHash('sha256').update(b).digest('hex');
const gate=(ok,message)=>{if(!ok)throw Error('Speed research refused: '+message);};
const fields=['walk_speed','run_speed','charge_speed','fly_speed','flying_charge_speed','locomotion_constants'];
const roleRefs={man:'man_entity',mount:'mount',engine:'engine',articulation:'articulated_record'};

// This inspection never selects a component, confirms a conversion or returns
// an admissible Unit field. It uses only existing processed-schema selectors.
export function inspectSpeedTrace(dump,identity,supplement) {
  gate(isReviewedSource(dump.provenance),'unreviewed static snapshot');
  const s=factSelectors(dump),c=observationContext(dump,s),snapshotId=digest(snapshotIdentity(dump.provenance));
  const missing=[];
  if(s.fact(c.root,'unit')?.value!==identity.mainKey||s.fact(c.land,'key')?.value!==identity.landKey)missing.push('EXACT_MAIN_LAND_IDENTITY');
  const refs=Object.fromEntries(Object.entries(roleRefs).map(([role,field])=>[role,s.fact(c.land,field)??null]));
  const rows={man:c.rider,mount:c.mountEntity,engine:c.engineEntity,articulation:s.follow(s.follow(c.land,'articulated_record'),'articulated_entity')};
  let artSelectors=s;
  if(refs.articulation?.value&&!rows.articulation&&supplement) {
    const e=supplement.evidence;
    gate(supplement.originalSnapshotId===snapshotId&&digest(snapshotIdentity(e.provenance))===snapshotId,'articulation snapshot mismatch');
    const roots=e.rows.filter(r=>r.table==='main_units_tables'&&r.row.unit===identity.mainKey);
    gate(roots.length===1,'articulation exact main root missing');
    const extra={unit:{caKey:identity.mainKey},rootRow:roots[0].id,provenance:e.provenance,rows:e.rows,schemas:e.schemas,
      relationships:e.relationships.map(edge=>({...edge,direction:edge.direction??'forward'}))};
    artSelectors=factSelectors(extra);const land=artSelectors.follow(artSelectors.root,'land_unit');
    gate(artSelectors.fact(land,'key')?.value===identity.landKey&&artSelectors.fact(land,'articulated_record')?.value===refs.articulation.value,'articulation exact land/reference mismatch');
    rows.articulation=artSelectors.follow(artSelectors.follow(land,'articulated_record'),'articulated_entity');
  }
  const roles={};
  for(const [role,ref] of Object.entries(refs)) {
    if(!ref){missing.push(role+'.REFERENCE_MISSING');continue;}
    if(ref.value==='')continue;
    const row=rows[role],selector=role==='articulation'?artSelectors:s;
    if(!row){missing.push(role+'.EXACT_JOIN_MISSING');continue;}
    const key=selector.fact(row,'key'),facts=Object.fromEntries(fields.map(f=>[f,selector.fact(row,f)??null]));
    if(!key||!facts.run_speed||typeof facts.run_speed.value!=='number'||!Number.isFinite(facts.run_speed.value)||facts.run_speed.value<=0)missing.push(role+'.RUN_SPEED_UNAVAILABLE');
    roles[role]={key:key?.value??null,facts};
  }
  const extraSources=dump.rows.filter(r=>r.table==='battle_entities_tables'&&s.reachable(r)&&!Object.values(rows).some(v=>v?.id===r.id))
    .map(r=>({key:s.fact(r,'key')?.value??null,runSpeed:s.fact(r,'run_speed')??null})).filter(r=>r.runSpeed);
  const modifierEvidence=dump.rows.filter(r=>r.table==='ground_type_to_stat_effects_tables'&&s.fact(r,'affected_stat')?.value==='scalar_speed')
    .map(r=>({rowId:r.id,affectedGroup:s.fact(r,'affected_group'),groundType:s.fact(r,'ground_type'),multiplier:s.fact(r,'multiplier')}));
  const flags={syncLocomotion:s.fact(c.land,'sync_locomotion')??null,groundStatEffectGroup:s.fact(c.land,'ground_stat_effect_group')??null};
  const flyingRoles=Object.entries(roles).filter(([,r])=>r.facts.fly_speed?.value>0).map(([r])=>r);
  const unknownFlight=Object.values(roles).some(r=>typeof r.facts.fly_speed?.value!=='number'||!Number.isFinite(r.facts.fly_speed.value));
  const reasons=['DISPLAY_CONVERSION_UNCONFIRMED'];
  if(Object.keys(roles).length>1)reasons.push('COMPONENT_SOURCE_PRECEDENCE_UNCONFIRMED');
  if(flyingRoles.length)reasons.push('GROUND_VS_FLIGHT_DISPLAY_UNCONFIRMED');
  if(unknownFlight)reasons.push('FLIGHT_CAPABILITY_UNKNOWN');
  if(extraSources.length)reasons.push('ADDITIONAL_JOINED_SPEED_SOURCE');
  const profile=refs.articulation?.value?'ARTICULATED':refs.engine?.value?'ENGINE':refs.mount?.value?'MOUNTED':'MAN_ONLY';
  const hypotheses=Object.fromEntries(Object.entries(roles).map(([role,r])=>[role,Object.fromEntries(['run_speed','fly_speed']
    .map(f=>[f,evaluateHypothesis('rawSpeed * 10',{rawSpeed:r.facts[f]},({rawSpeed})=>rawSpeed*10)]))]));
  return {identity,snapshotId,profile,refs,roles,flags,flyingRoles,extraSources,modifierEvidence,hypotheses,
    status:missing.length?'SPEED_UNAVAILABLE':'SPEED_AMBIGUOUS',reasons:missing.length?missing:reasons,
    singleGroundSource:missing.length===0&&Object.keys(roles).length===1&&!flyingRoles.length&&!unknownFlight&&!extraSources.length,
    productionEligible:false,displayValue:null,sourcePrecedence:'UNCONFIRMED'};
}

export function buildSpeedResearch() {
  const inputs=[],load=file=>{const bytes=readFileSync(file);inputs.push({file,sha256:hash(bytes)});return JSON.parse(bytes);};
  // Replay the research's original pre-Speed view; only approved values strip.
  const units=speedOverlay.withoutSpeed(read('src/data/units.json'));
  inputs.push({file:'src/data/units.json',sha256:hash(serialize(units))});
  // Reuse the stored exact source-pointer index only. No HP research function,
  // runtime review or HP calculation is invoked by this inspection.
  const index=load('tools/wh3-importer/hp-research/report.json'),cache=new Map();
  const findings=load('tools/wh3-importer/semantics-findings.json');
  gate(findings.topics.displaySpeed.safeToNormalize==='NO','existing speed interpretation changed; separate review required');
  const supplement=load('tools/wh3-importer/hp-research/articulation.source.json');
  const samples=load('tools/wh3-importer/hp-policy/manifest.json').subjects.map(s=>s.id);
  const production=units.filter(u=>u.gameVersion!=='sample');
  gate(production.length===101&&new Set(production.map(u=>u.id)).size===101&&index.catalog.length===101,'catalog identity/count changed');
  const schemaFields=new Map();
  const traces=production.map(unit=> {
    const candidates=index.catalog.filter(c=>c.id===unit.id);gate(candidates.length===1,'missing/ambiguous source pointer');const entry=candidates[0];
    let bundle=cache.get(entry.source.file);
    if(!bundle){bundle=load(entry.source.file);const pin=index.inputs.find(i=>i.file===entry.source.file);
      gate(pin&&inputs.at(-1).sha256===pin.bytesSha256,'source byte pin mismatch');
      if(entry.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,pin.expandedSha256);cache.set(entry.source.file,bundle);}
    let dump=entry.source.pointer.replace(/^\/decoded/,'').slice(1).split('/').reduce((v,k)=>v?.[k],bundle);
    gate(dump,'missing static trace');if(dump.schemaRefs)dump=restoreTrace(bundle,dump);
    for(const schema of dump.schemas.filter(s=>/^(main_units|land_units|battle_entities|mounts|battlefield_engines|land_unit_articulated_vehicles)_tables$/.test(s.table)))
      for(const field of schema.fields.filter(f=>/speed|locomotion|flying/.test(f.name)))schemaFields.set(schema.table+'.'+field.name,{table:schema.table,version:schema.version,...field});
    const result=inspectSpeedTrace(dump,{id:unit.id,name:unit.name,mainKey:entry.mainKey,landKey:entry.landKey},supplement);
    gate(result.snapshotId===index.staticSnapshotId,'catalog snapshot differs');
    return {...result,source:entry.source};
  });
  const compact=c=>({identity:c.identity,source:c.source,snapshotId:c.snapshotId,profile:c.profile,status:c.status,reasons:c.reasons,
    roles:Object.fromEntries(Object.entries(c.roles).map(([role,r])=>[role,{key:r.key,rowId:r.facts.run_speed?.source.rowId,
      values:Object.fromEntries(Object.entries(r.facts).map(([f,v])=>[f,v?.value??null])),
      unconfirmedRunTimesTen:c.hypotheses[role].run_speed.value,unconfirmedFlightTimesTen:c.hypotheses[role].fly_speed.value}])),
    flags:Object.fromEntries(Object.entries(c.flags).map(([k,v])=>[k,v?.value??null])),flyingRoles:c.flyingRoles,
    singleGroundSource:c.singleGroundSource,extraSources:c.extraSources,modifierEvidence:c.modifierEvidence.map(m=>({rowId:m.rowId,
      affectedGroup:m.affectedGroup?.value??null,groundType:m.groundType?.value??null,multiplier:m.multiplier?.value??null})),
    displayValue:null,productionEligible:false});
  // The committed sources already hold every row/schema. Samples retain one
  // exact join trace per speed record; other named fields use that same row.
  const sample=c=>({...compact(c),sourceChains:Object.fromEntries(Object.entries(c.roles).map(([role,r])=>[role,r.facts.run_speed?.source])),
    componentReferences:Object.fromEntries(Object.entries(c.refs).map(([role,f])=>[role,f?.value??null])),
    hypothesisStatus:'UNRESOLVED'});
  return JSON.parse(serialize({purpose:'RESEARCH_ONLY',baselineCommit:'872cbc41d43555d0f918b63906919d2208752354',productionEligible:false,
    inputs,staticSnapshotId:index.staticSnapshotId,counts:{production:production.length,sample:units.length-production.length,
      populatedProductionSpeed:production.filter(u=>['speed','groundSpeed','chargeSpeed'].some(f=>Object.hasOwn(u.movement,f))).length,
      ...Object.fromEntries(['SPEED_DIRECT_STATIC','SPEED_AMBIGUOUS','SPEED_UNAVAILABLE'].map(status=>[status,traces.filter(c=>c.status===status).length])),
      singleGroundSource:traces.filter(c=>c.singleGroundSource).length,flyingProfiles:traces.filter(c=>c.flyingRoles.length).length,
      profiles:Object.fromEntries(['MAN_ONLY','MOUNTED','ENGINE','ARTICULATED'].map(p=>[p,traces.filter(c=>c.profile===p).length]))},
    currentInterpretation:findings.topics.displaySpeed,transformation:{formula:'rawSpeed * 10',status:'UNCONFIRMED_EXISTING_HYPOTHESIS',
      rounding:'UNPROVEN; none applied',independentCardReadings:0,manualWikiReferencesUsedAsGroundTruth:false},
    definition:'Statuses concern display-ready Production speed. A unique raw source is not DIRECT when display conversion is unproven. No component, minimum, maximum or equal-value tie is selected.',
    discoveredSchemaFields:[...schemaFields.values()],cases:samples.map(id=>sample(traces.find(c=>c.identity.id===id))),catalog:traces.map(compact)}));
}

// Optional audit of existing generated CA traces. No capture, source writes or
// Production dependency on these files. Historical snapshots stay separate.
export function auditStoredTraces(report=buildSpeedResearch()) {
  const checks=[],entityRecords=new Map(report.catalog.flatMap(c=>Object.values(c.roles).map(r=>[r.key,r.values])));
  const inspect=(file,dump)=> {
    if(!dump?.rows||!dump.schemas)return;const s=factSelectors(dump),c=observationContext(dump,s),main=s.fact(c.root,'unit')?.value;
    const target=report.catalog.find(x=>x.identity.mainKey===main);
    const vals=Object.fromEntries([['man',c.rider],['mount',c.mountEntity],['engine',c.engineEntity]].filter(([,r])=>r)
      .map(([role,row])=>[role,{key:s.fact(row,'key')?.value,runSpeed:s.fact(row,'run_speed')?.value,flySpeed:s.fact(row,'fly_speed')?.value}]));
    const shared=Object.values(vals).filter(v=>entityRecords.has(v.key));
    if(target)gate(Object.entries(vals).every(([role,v])=>v.key===target.roles[role]?.key&&v.runSpeed===target.roles[role].values.run_speed&&v.flySpeed===target.roles[role].values.fly_speed),'stored trace speed disagrees: '+file);
    for(const v of shared)gate(v.runSpeed===entityRecords.get(v.key).run_speed&&v.flySpeed===entityRecords.get(v.key).fly_speed,'shared entity record speed changed: '+file);
    checks.push({file,sha256:hash(readFileSync(file)),mainKey:main,snapshotId:digest(snapshotIdentity(dump.provenance)),
      currentSnapshot:digest(snapshotIdentity(dump.provenance))===report.staticSnapshotId,
      comparison:target?'EXACT_PRODUCTION_UNIT_MATCH':shared.length?'SHARED_ENTITY_RECORD_ONLY':'NO_PRODUCTION_ENTITY_MATCH',
      matchingEntityKeys:shared.map(v=>v.key),roles:vals});
  };
  for(const file of ['generated/wh3/research/swordsmen.raw.json','generated/wh3/research/handgunners.raw.json','generated/wh3/research/helblaster.raw.json',
    'generated/wh3/grail-knights.raw.json','generated/wh3/helstorm.raw.json','generated/wh3/bloodthirster.raw.json'])if(existsSync(file))inspect(file,read(file));
  for(const [dir,kind] of [['generated/wh3/catalog-identity/policy-2026-10-01/pilot','pilot'],
    ['generated/wh3/refresh-9.0.2/context-materialization/2026-10-01T10-25-28.824Z','materialized']]) {
    if(!existsSync(dir+'/manifest.json'))continue;
    for(const result of read(dir+'/manifest.json').results){const name=kind==='pilot'?result.result:result.file;if(!name)continue;
      const file=dir+'/'+name,d=read(file);inspect(file,d.dump??d.trace??d);}
  }
  return {checks,inspected:checks.length,exactUnitMatches:checks.filter(c=>c.comparison==='EXACT_PRODUCTION_UNIT_MATCH').length,
    sharedEntityOnly:checks.filter(c=>c.comparison==='SHARED_ENTITY_RECORD_ONLY').length,productionEligible:false};
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2];gate(process.argv.length===3&&['--write','--check','--check-generated'].includes(mode),'Use --write, --check or --check-generated.');
  const report=buildSpeedResearch(),bytes=serialize(report);
  if(mode==='--write')writeFileSync(folder+'report.json',bytes);
  else if(mode==='--check')gate(readFileSync(folder+'report.json','utf8')===bytes,'report replay differs');
  else console.log(serialize(auditStoredTraces(report)));
  console.log(JSON.stringify({mode,...report.counts,productionEligible:false}));
}
