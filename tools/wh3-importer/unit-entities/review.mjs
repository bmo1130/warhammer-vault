import fs from 'node:fs';
import assert from 'node:assert/strict';
import {byteHash,replayHP} from '../hp-policy/policy.mjs';
import {digest} from '../runtime-evidence/contract.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {rosterSourceHash} from '../production-growth/roster.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {inspectStaticHP} from '../hp-research/research.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';

const folder='tools/wh3-importer/unit-entities/';
const read=p=>JSON.parse(fs.readFileSync(p));
const gate=(ok,message)=>assert(ok,'Unit entities refused: '+message);
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export function reviewedCount(record) {
  gate(record.status==='REVIEWED_DIRECT_ULTRA_RUNTIME'&&record.candidates.length>0&&!record.held.length,'runtime review not eligible');
  const first=record.candidates[0];
  for(const c of record.candidates)gate(c.unitSize==='ULTRA'&&c.unitSizeSource==='DECLARED_SETUP'&&
    c.sourceMainKey===record.staticChain.sourceMainKey&&c.sourceLandKey===record.staticChain.sourceLandKey&&
    c.metadata.staticSnapshotId===record.staticChain.staticSnapshotId&&c.metadata.gameVersion===record.staticChain.snapshot.gameVersion&&
    c.metadata.scenarioId==='CCO_P0_CUSTOM_BATTLE'&&(c.metadata.contextId??null)===null&&
    c.HealthMax===record.totalHealth&&c.NumEntitiesInitial===first.NumEntitiesInitial&&
    Number.isSafeInteger(c.NumEntitiesInitial)&&c.NumEntitiesInitial>0,'runtime count/size/context conflict');
  return first.NumEntitiesInitial;
}

export function reviewUnitEntities(manifest=read(folder+'manifest.json'),units=read('src/data/units.json')) {
  gate(manifest.format==='reviewed-ultra-unit-entities-scope-v1'&&manifest.unitSize==='ULTRA','explicit ULTRA scope required');
  gate(digest(units)===manifest.unitsHash,'Unit baseline drift');
  for(const pin of manifest.inputs)gate(byteHash(fs.readFileSync(pin.file))===pin.sha256,'source hash drift: '+pin.file);
  const runtime=replayHP(read('tools/wh3-importer/hp-policy/manifest.json'));
  assert.deepEqual(runtime,read('tools/wh3-importer/hp-policy/review.json'));
  const statics=read('tools/wh3-importer/hp-policy/static-review.json');
  const historical=read('tools/wh3-importer/hp-research/report.json');
  const roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
  const cache=new Map(),traces=new Map();
  for(const c of roster.candidates)traces.set(c.id,{dump:restoreTrace(roster,c.trace),source:{file:'tools/wh3-importer/faction-rosters/source.json',pointer:`/decoded/candidates/${roster.candidates.indexOf(c)}/trace`}});
  for(const c of historical.catalog) {
    const pin=historical.inputs.find(p=>p.file===c.source.file);gate(pin,'missing historical source pin');
    if(!cache.has(pin.file)) {
      const bytes=fs.readFileSync(pin.file);gate(byteHash(bytes)===pin.bytesSha256,'historical trace source changed');
      let bundle=JSON.parse(bytes);if(c.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,pin.expandedSha256);
      cache.set(pin.file,bundle);
    }
    const bundle=cache.get(pin.file),dump=c.source.pointer.replace(/^\/decoded/,'').slice(1).split('/').reduce((v,k)=>v?.[k],bundle);
    gate(dump&&!traces.has(c.id),'missing/duplicate exact trace');
    traces.set(c.id,{dump:dump.schemaRefs?restoreTrace(bundle,dump):dump,source:c.source});
  }
  const production=units.filter(u=>u.gameVersion!=='sample');
  gate(production.length===1110&&traces.size===production.length,'catalog scope changed');
  const byId=new Map(),catalog=production.map(u=>{
    const t=traces.get(u.id);gate(t,'missing current Unit trace');
    const inspected=inspectStaticHP(t.dump),s=factSelectors(t.dump),ctx=observationContext(t.dump,s);
    gate(u.id==='ca_unit_'+inspected.chain.sourceMainKey&&u.gameVersion===inspected.chain.snapshot.gameVersion,'exact identity/version changed');
    const facts={...inspected.facts,...Object.fromEntries(['category','class'].map(f=>[f,s.fact(ctx.land,f)??null]))};
    byId.set(u.id,{unit:u,inspected,facts,source:t.source});
    return {id:u.id,name:u.name,mainKey:inspected.chain.sourceMainKey,landKey:inspected.chain.sourceLandKey,
      source:t.source,shape:inspected.shape,classification:{caste:s.fact(ctx.root,'caste')?.value,category:facts.category?.value,class:facts.class?.value},
      rawValues:Object.fromEntries(Object.entries(inspected.facts).map(([k,f])=>[k,f?.value??null])),
      entityKeys:Object.fromEntries(Object.entries(inspected.entities).map(([k,f])=>[k,f?.value??null])),
      roleReferences:Object.fromEntries(Object.entries(inspected.refs).map(([k,f])=>[k,f?.value??null])),missing:inspected.missing,
      unresolvedReferences:inspected.missing.filter(m=>m.endsWith('.exact_entity_hp')).map(m=>{
        const articulated=m.startsWith('articulation.');
        return {role:articulated?'ARTICULATED':'ENGINE',landField:articulated?'articulated_record':'engine',
          targetTable:articulated?'land_unit_articulated_vehicles_tables':'battlefield_engines_tables',
          targetKey:inspected.refs[articulated?'articulated_record':'engine']?.value,
          nextField:articulated?'articulated_entity':'battle_entity',nextTable:'battle_entities_tables',hpField:'hit_points'};
      }),
      countStatus:'UNKNOWN',hpStatus:u.entities.totalHealth===undefined?'UNKNOWN':'COMPLETE',
      reasons:[...inspected.missing.map(m=>'PRIMARY_TRACE_MISSING:'+m),'ULTRA_LOGICAL_COUNT_NOT_PROVEN_FOR_THIS_IDENTITY','RAW_HP_CONTRIBUTION_AND_MULTIPLICITY_NOT_PROVEN']};
  });
  // No shape classifier or numeric prediction admits new identities. Reuse
  // only the ten baseline runtime captures and the three existing exact-profile
  // HP admissions. The CLI independently replays the unchanged static policy.
  gate(runtime.review.length===10&&statics.admitted.length===3,'existing reviewed cohort changed');
  const proofs=[...runtime.review.map(r=>({id:r.id,kind:'DIRECT_ULTRA_RUNTIME',count:reviewedCount(r),hp:r.totalHealth,
    unitSizeSource:'DECLARED_SETUP',reviewReference:'tools/wh3-importer/hp-policy/review.json',references:r.candidates.map(c=>c.reference),
    staticSnapshotId:r.staticChain.staticSnapshotId,mainKey:r.staticChain.sourceMainKey,landKey:r.staticChain.sourceLandKey,
    rawFacts:r.staticChain.inputs,componentCounts:r.candidates[0].componentCounts,formula:null})),
    ...statics.admitted.map(a=>({id:a.id,kind:'RUNTIME_VALIDATED_EXACT_PROFILE',count:a.logicalCount,hp:a.value,
      unitSizeSource:a.unitSizeSource,reviewReference:'tools/wh3-importer/hp-policy/static-review.json',references:a.runtimeValidation.references,
      staticSnapshotId:a.staticSnapshotId,mainKey:a.sourceMainKey,landKey:a.sourceLandKey,
      rawFacts:a.sourceFields,componentCounts:null,formula:a.formula,hpProfileSha256:a.hpProfileSha256,anchorId:a.runtimeValidation.id}))];
  gate(new Set(proofs.map(p=>p.id)).size===13&&digest(proofs.map(p=>p.id))===manifest.scopeHash,'explicit identity scope changed');
  const admissions=proofs.map(p=>{
    const c=byId.get(p.id);gate(c,'approved unit missing');
    gate(c.unit.entities.count===undefined&&c.unit.entities.totalHealth===p.hp,'existing HP/count conflict');
    gate(c.inspected.chain.sourceMainKey===p.mainKey&&c.inspected.chain.sourceLandKey===p.landKey&&c.inspected.chain.staticSnapshotId===p.staticSnapshotId,'review/current identity mismatch');
    for(const [k,f]of Object.entries(p.rawFacts))if(k!=='articulation.hit_points')gate((c.inspected.facts[k]?.value??null)===(f?.value??null),'raw/current HP fact conflict: '+k);
    gate(Number.isSafeInteger(p.count)&&p.count>0,'invalid count');
    return {...p,status:'COMPLETE',unitSize:'ULTRA',field:'entities.count',originalCount:null,
      countMeaning:'INITIAL_LOGICAL_COMBAT_ENTITIES_NOT_COMPONENT_OR_CREW_COUNT',healthMeaning:'EXISTING_DISPLAYED_TOTAL_HEALTH',
      healthPerEntityStatus:'UNKNOWN',healthPerEntityReason:'TOTAL_DIVIDED_BY_COUNT_IS_NOT_INDEPENDENT_COMPONENT_HP',currentSource:c.source};
  });
  for(const c of catalog){const a=admissions.find(a=>a.id===c.id);if(a){c.countStatus='COMPLETE';c.reasons=['PER_ENTITY_HP_AND_GENERAL_SCALING_REMAIN_UNPROVEN'];}}
  const samples=manifest.samples.map(sample=>{
    const c=byId.get(sample.id);gate(c,'sample identity missing');
    const admission=admissions.find(a=>a.id===sample.id);
    return {...sample,name:c.unit.name,rawFacts:c.facts,source:c.source,
      expected:admission?{count:admission.count,totalHealth:admission.hp}:null,
      actual:{count:admission?.count??null,totalHealth:c.unit.entities.totalHealth??null},
      result:admission?'MATCH_EXISTING_REVIEW':'WITHHELD_NO_VALIDATED_ULTRA_REFERENCE'};
  });
  // Lord/hero identities are in separate catalogs, not the 1,110 troop Units.
  // Keep their source rows/schema references as unresolved audit evidence;
  // never manufacture a Unit ID or use rank/skill-adjusted character captures.
  const characters=manifest.characters.map(c=>{
    const mains=roster.preflight.rows.filter(r=>r.table==='main_units_tables'&&r.row.unit===c.mainKey);
    gate(mains.length===1,'character main missing/ambiguous');
    const lands=roster.preflight.rows.filter(r=>r.table==='land_units_tables'&&r.row.key===mains[0].row.land_unit);
    const schema=roster.schemas.find(s=>s.table==='main_units_tables'&&s.version===mains[0].tableVersion);
    gate(lands.length===1&&JSON.stringify(schema.fields.find(f=>f.name==='land_unit')?.is_reference)===JSON.stringify(['land_units','key']),'character native land reference missing');
    const main=mains[0],land=lands[0];
    return {...c,landKey:land.row.key,source:'tools/wh3-importer/faction-rosters/source.json:/decoded/preflight',
      rowIds:[main.id,land.id],schemaVersions:{main:main.tableVersion,land:land.tableVersion},
      rawValues:{num_men:main.row.num_men,bonus_hit_points:land.row.bonus_hit_points,num_mounts:land.row.num_mounts,num_engines:land.row.num_engines},
      roleReferences:{man_entity:land.row.man_entity,mount:land.row.mount,engine:land.row.engine,articulated_record:land.row.articulated_record},
      expected:null,actual:null,result:'WITHHELD_CHARACTER_CATALOG_NO_BASELINE_ULTRA_CAPTURE'};
  });
  const summary={production:production.length,count:{before:0,after:admissions.length,unknownBefore:1110,unknownAfter:1110-admissions.length},
    hp:{before:13,after:13,unknownBefore:1097,unknownAfter:1097},healthPerEntity:{known:0,unknown:1110},
    combined:{complete:13,partial:0,unknown:1097},directRuntime:10,exactExistingProfile:3,
    shapes:Object.fromEntries(['MAN_ONLY','MOUNTED','ENGINE','ARTICULATED'].map(shape=>[shape,catalog.filter(c=>c.shape===shape).length])),
    incompleteRawHpChains:catalog.filter(c=>c.missing.length).length};
  const review={format:'reviewed-ultra-unit-entities-v1',baselineCommit:manifest.baselineCommit,unitSize:'ULTRA',manifestHash:digest(manifest),
    summary,admissions,samples,characters,catalog,
    scaling:{ULTRA:'DIRECT_CAPTURE_OR_EXISTING_EXACT_PROFILE_ONLY',LARGE:'UNKNOWN',MEDIUM:'UNKNOWN',SMALL:'UNKNOWN'},
    canonicalHpSource:'CcoBattleUnit.HealthMax; existing exact-profile static HP only',
    canonicalCountSource:'CcoBattleUnit.NumEntitiesInitial; existing exact-profile logicalCount only',
    restrictions:['NO_GENERAL_STATIC_HP_FORMULA','NO_NUM_MEN_AS_UNIVERSAL_COUNT','NO_COMPONENT_LIST_SUM','NO_PER_ENTITY_HP_RATIO_ADMISSION','NO_CAMPAIGN_MODIFIERS','NO_UNIT_SIZE_MULTIPLIER_INFERENCE']};
  const projection={format:'reviewed-ultra-unit-entity-admissions-v1',gameVersion:'9.0.2.0',unitSize:'ULTRA',sourceHash:digest(review),
    admissions:admissions.map(a=>({id:a.id,mainKey:a.mainKey,landKey:a.landKey,staticSnapshotId:a.staticSnapshotId,count:a.count,totalHealth:a.hp,
      originalCount:a.originalCount,kind:a.kind,status:a.status,unitSizeSource:a.unitSizeSource,
      reviewReference:a.reviewReference,references:a.references}))};
  return JSON.parse(serialize({review,projection}));
}
