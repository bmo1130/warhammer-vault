import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {byteHash,replayHP,hpStaticChain} from '../hp-policy/policy.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {decodeSource,historicalSourceHash} from '../expansion-batch-01/compact.mjs';
import {growthAdmissions} from '../production-growth/batch.mjs';
import {requireSameSource} from '../blocker-review/evidence.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

const folder='tools/wh3-importer/hp-research/';
export const serialize=value=>JSON.stringify(value,null,2)+'\n';
const requireFact=(ok,message)=>{if(!ok)throw Error('HP research refused: '+message);};
const json=(file,root)=>JSON.parse(readFileSync(`${root}/${file}`,'utf8'));

export function checkProtectedInputs({root='.'}={}) {
  const baseline=json(folder+'baseline.json',root);
  for(const input of baseline.protectedFiles) {
    const bytes=readFileSync(`${root}/${input.file}`);
    const content=input.hashMode==='LF_TEXT'?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;
    requireFact(byteHash(content)===input.sha256,`protected input changed: ${input.file}`);
  }
  return baseline;
}

// Research access only. No predicted health is returned for the catalog and no
// research function creates an admission or alters a Unit.
export function inspectStaticHP(dump) {
  requireFact(isReviewedSource(dump.provenance),'unreviewed snapshot');
  const chain=hpStaticChain(dump),s=factSelectors(dump),c=observationContext(dump,s);
  const refs=Object.fromEntries(['man_entity','mount','engine','articulated_record'].map(f=>[f,s.fact(c.land,f)??null]));
  const articulated=s.follow(c.land,'articulated_record'),entity=s.follow(articulated,'articulated_entity');
  const facts={...chain.inputs,'articulation.hit_points':s.fact(entity,'hit_points')??null};
  const entities=Object.fromEntries([['man',c.rider],['mount',c.mountEntity],['engine',c.engineEntity],['articulation',entity]].map(([role,row])=>[role,s.fact(row,'key')??null]));
  const shape=refs.articulated_record?.value?'ARTICULATED':refs.engine?.value?'ENGINE':refs.mount?.value?'MOUNTED':'MAN_ONLY';
  const missing=[];
  for(const name of ['main.num_men','land.num_mounts','land.num_engines','land.bonus_hit_points'])if(!Number.isSafeInteger(facts[name]?.value))missing.push(name);
  for(const [ref,role] of [['man_entity','man'],['mount','mount'],['engine','engine'],['articulated_record','articulation']]) {
    if(!refs[ref])missing.push('land.'+ref);
    else if(refs[ref].value!==''&&(!entities[role]||!Number.isSafeInteger(facts[role+'.hit_points']?.value)))missing.push(role+'.exact_entity_hp');
  }
  return {chain,refs,facts,entities,shape,missing};
}

export function articulationTrace(fixture,mainKey,primaryDump) {
  requireSameSource(fixture.evidence.provenance,primaryDump.provenance);
  requireFact(fixture.originalSnapshotId===digest(snapshotIdentity(primaryDump.provenance)),'supplement snapshot mismatch');
  const e=fixture.evidence,root=e.rows.filter(r=>r.table==='main_units_tables'&&r.row.unit===mainKey);
  requireFact(root.length===1,'supplement exact main root missing/ambiguous');
  const dump={unit:{caKey:mainKey},rootRow:root[0].id,provenance:e.provenance,rows:e.rows,schemas:e.schemas,
    // EvidenceProbe records forward schema references without this annotation.
    // Keep original edges in the fixture; annotate direction in memory only.
    relationships:e.relationships.map(edge=>({...edge,direction:'forward'}))};
  const s=factSelectors(dump),c=observationContext(dump,s),primary=inspectStaticHP(primaryDump);
  requireFact(s.fact(c.land,'key')?.value===primary.chain.sourceLandKey,'supplement land identity mismatch');
  for(const [name,row,field] of [['main.num_men',c.root,'num_men'],['land.bonus_hit_points',c.land,'bonus_hit_points'],
    ['land.num_mounts',c.land,'num_mounts'],['land.num_engines',c.land,'num_engines']])
    requireFact(s.fact(row,field)?.value===primary.facts[name]?.value,`conflicting supplemental field ${name}`);
  requireFact(s.fact(c.land,'articulated_record')?.value===primary.refs.articulated_record?.value,'conflicting articulation reference');
  const owner=s.follow(c.land,'articulated_record'),entity=s.follow(owner,'articulated_entity');
  return {key:s.fact(entity,'key')??null,hitPoints:s.fact(entity,'hit_points')??null};
}

export function classifyStaticHP(inspected) {
  return inspected.missing.length?{status:'DERIVATION_UNAVAILABLE',reasons:inspected.missing}:
    {status:'DERIVATION_AMBIGUOUS',reasons:['HP_FIELD_COMBINATION_NOT_IDENTIFIED','ULTRA_COUNT_MAPPING_NOT_PROVEN_FOR_THIS_STATIC_SHAPE']};
}

// Enumerated comparisons for the five measured identities. Coefficients remain
// hypotheses, even on an exact match. No fitting or winning-formula selection.
export function compareCandidates(mainKey,facts,runtime) {
  const f=name=>facts[name]?.value;
  const n=f('main.num_men'),b=f('land.bonus_hit_points'),m=f('man.hit_points'),h=f('mount.hit_points'),
    e=f('engine.hit_points'),a=f('articulation.hit_points'),u=f('land.num_mounts'),g=f('land.num_engines');
  const candidates=[];
  const add=(id,formula,inputs,evaluate,assumption)=> {
    const available=inputs.every(name=>Number.isSafeInteger(f(name)));
    const result=available?evaluate():null;
    candidates.push({id,formula,inputs,result,matchesRuntime:available?result===runtime.HealthMax:null,
      confidence:available?(result===runtime.HealthMax?'NUMERICALLY_COMPATIBLE_ONLY':'NUMERICALLY_REJECTED'):'UNAVAILABLE',assumption});
  };
  const base=['main.num_men','land.bonus_hit_points','man.hit_points'];
  add('man_only','(B + M) * N',base,()=>(b+m)*n,'N is the combat entity count; one man HP contribution per combat entity.');
  add('bonus_only','B * N',base.slice(0,2),()=>b*n,'No entity HP contribution.');
  if(mainKey==='wh_main_emp_inf_swordsmen'||mainKey==='wh_dlc01_chs_mon_dragon_ogre')return candidates;
  add('mount_only','(B + H) * U',['land.bonus_hit_points','mount.hit_points','land.num_mounts'],()=>(b+h)*u,'U is the combat count; rider HP excluded.');
  add('one_rider_one_mount','(B + M + H) * U',[...base,'mount.hit_points','land.num_mounts'],()=>(b+m+h)*u,'U is the combat count; one rider and mount contribution.');
  add('two_man_no_mount','(B + 2*M) * U',[...base,'land.num_mounts'],()=>(b+2*m)*u,'Counterexample: equal M/H can conceal the contributing source.');
  add('crew_and_mount','B*U + M*N + H*U',[...base,'mount.hit_points','land.num_mounts'],()=>b*u+m*n+h*u,'U logical mounts, N crew; bonus once per logical mount.');
  add('all_mount_counterexample','B*U + H*(N+U)',['main.num_men','land.bonus_hit_points','mount.hit_points','land.num_mounts'],()=>b*u+h*(n+u),'Counterexample: M=H conceals whether crew or body supplies the additional HP.');
  if(mainKey!=='wh2_dlc09_tmb_veh_skeleton_chariot_0')return candidates;
  const engineInputs=[...base,'mount.hit_points','engine.hit_points','land.num_mounts','land.num_engines'];
  add('one_of_each','(B + M + H + E) * G',engineInputs,()=>(b+m+h+e)*g,'One of each HP source per engine.');
  add('engine_only','(B + E) * G',['land.bonus_hit_points','engine.hit_points','land.num_engines'],()=>(b+e)*g,'Engine as sole base HP source.');
  add('crew_draught_engine','B*G + M*N + H*U*G + E*G',engineInputs,()=>b*g+m*n+h*u*g+e*g,'U interpreted as draughts per engine, N total crew.');
  add('with_articulation','B*G + M*N + H*U*G + E*G + A*G',[...engineInputs,'articulation.hit_points'],()=>b*g+m*n+h*u*g+e*g+a*g,'Previous candidate plus one articulation HP per engine. Multiplicity remains unproven.');
  add('double_engine_without_articulation','B*G + M*N + H*U*G + 2*E*G',engineInputs,()=>b*g+m*n+h*u*g+2*e*g,'Counterexample: E=A=8 makes double engine and articulation contributions indistinguishable.');
  return candidates;
}

export function buildResearch({root='.'}={}) {
  const baseline=checkProtectedInputs({root}),inputs=[],all=[];
  const read=file=>{const bytes=readFileSync(`${root}/${file}`);inputs.push({file,bytesSha256:byteHash(bytes)});return JSON.parse(bytes);};
  const manifest=read(folder+'five-unit-manifest.json'),runtime=replayHP(manifest,{root});
  const current=json('tools/wh3-importer/hp-policy/review.json',root),ids=new Set(manifest.subjects.map(s=>s.id));
  const historical={...current,manifestSha256:runtime.manifestSha256,review:current.review.filter(r=>ids.has(r.id)),admitted:current.admitted.filter(r=>ids.has(r.id))};
  requireFact(isDeepStrictEqual(runtime,historical),'original five runtime records changed');
  const first=read('tools/wh3-importer/promotion/dragon-ogres.source.json');
  all.push({id:manifest.subjects.find(s=>s.mainKey===first.dump.unit.caKey).id,file:inputs.at(-1).file,pointer:'/dump',dump:first.dump});
  const partialFile='tools/wh3-importer/promotion/partial-sources.json',partial=read(partialFile);
  all.push(...partial.candidates.map((c,i)=>({id:c.identity.internalId,file:partialFile,pointer:`/candidates/${i}/dump`,dump:restoreTrace(partial,c.dump)})));
  for(const name of ['expansion-batch-01',...Object.keys(growthAdmissions).sort()]) {
    const file=`tools/wh3-importer/${name}/sources.json`,compact=read(file),config=growthAdmissions[name];
    if(config)requireFact(evidenceHash(compact)===config.compactSourceHash,'compact source pin changed');
    const expanded=decodeSource(compact,config?.sourceHash??historicalSourceHash);
    inputs.at(-1).expandedSha256=compact.expandedSha256;
    all.push(...expanded.candidates.map((c,i)=>({id:c.identity.internalId,file,pointer:`/decoded/candidates/${i}/dump`,dump:restoreTrace(expanded,c.dump),originalExtraction:c.source})));
  }
  const supplementFile=folder+'articulation.source.json',fixture=read(supplementFile);
  const production=json('src/data/units.json',root).filter(u=>u.gameVersion!=='sample');
  requireFact(production.length===baseline.production&&new Set(all.map(c=>c.id)).size===all.length&&all.length===production.length,'catalog identity/count differs');
  const catalog=production.map(unit=> {
    const c=all.find(c=>c.id===unit.id);requireFact(c,'missing exact Production source');
    const inspected=inspectStaticHP(c.dump);
    if(inspected.refs.articulated_record?.value) {
      const supplement=articulationTrace(fixture,inspected.chain.sourceMainKey,c.dump);
      if(supplement.key&&supplement.hitPoints) {
        inspected.entities.articulation=supplement.key;inspected.facts['articulation.hit_points']=supplement.hitPoints;
        inspected.missing=inspected.missing.filter(name=>name!=='articulation.exact_entity_hp');
      }
    }
    return {id:unit.id,name:unit.name,mainKey:inspected.chain.sourceMainKey,landKey:inspected.chain.sourceLandKey,
      source:{file:c.file,pointer:c.pointer,...(c.originalExtraction?{originalExtraction:c.originalExtraction}:{})},
      shape:inspected.shape,staticValues:Object.fromEntries(Object.entries(inspected.facts).map(([key,fact])=>[key,fact?.value??null])),
      classification:classifyStaticHP(inspected),productionEligible:false};
  });
  const cases=runtime.review.map(r=> {
    const c=all.find(c=>c.id===r.id),inspected=inspectStaticHP(c.dump);
    if(inspected.refs.articulated_record?.value) {
      const supplemental=articulationTrace(fixture,r.staticChain.sourceMainKey,c.dump);
      inspected.facts['articulation.hit_points']=supplemental.hitPoints;inspected.entities.articulation=supplemental.key;
    }
    const observed=r.candidates[0];
    return {id:r.id,name:r.name,mainKey:r.staticChain.sourceMainKey,landKey:r.staticChain.sourceLandKey,
      shape:inspected.shape,staticFacts:inspected.facts,entityKeys:inspected.entities,staticReferences:inspected.refs,
      source:catalog.find(c=>c.id===r.id).source,
      runtime:{NumEntitiesInitial:observed.NumEntitiesInitial,HealthMax:observed.HealthMax,componentCounts:observed.componentCounts,
        observedPerCombatEntity:observed.HealthMax/observed.NumEntitiesInitial,unitSize:observed.unitSize,unitSizeSource:observed.unitSizeSource,
        staticSnapshotId:observed.metadata.staticSnapshotId,references:r.candidates.map(c=>c.reference)},
      candidates:compareCandidates(r.staticChain.sourceMainKey,inspected.facts,observed),
      productionEligible:false,interpretationConfidence:'NUMERICAL_FIT_WITH_UNIDENTIFIED_SEMANTICS'};
  });
  return {purpose:'RESEARCH_ONLY',productionEligible:false,baselineCommit:baseline.baselineCommit,
    snapshot:runtime.review[0].staticChain.snapshot,staticSnapshotId:runtime.review[0].staticChain.staticSnapshotId,
    inputs,supplement:{file:supplementFile,originalFile:fixture.originalFile,originalSha256:fixture.originalSha256},
    classificationDefinition:{DERIVATION_CONFIDENT:'Both HP combination and ULTRA combat count mapping uniquely established from static evidence.',
      DERIVATION_AMBIGUOUS:'Named HP/count inputs and exact joins present; their application/multiplicity or ULTRA mapping unproven.',
      DERIVATION_UNAVAILABLE:'Required named input or nonempty referenced entity HP chain unavailable; never treat it as zero.'},
    counts:{production:catalog.length,...Object.fromEntries(['DERIVATION_CONFIDENT','DERIVATION_AMBIGUOUS','DERIVATION_UNAVAILABLE'].map(status=>[status,catalog.filter(c=>c.classification.status===status).length])),
      shapes:Object.fromEntries(['MAN_ONLY','MOUNTED','ENGINE','ARTICULATED'].map(shape=>[shape,catalog.filter(c=>c.shape===shape).length]))},
    cases,catalog};
}
