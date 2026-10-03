import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {buildResearch,inspectStaticHP,articulationTrace,serialize} from './research.mjs';
import {byteHash} from '../hp-policy/policy.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';

const folder='tools/wh3-importer/hp-research/';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const gate=(ok,message)=>{if(!ok)throw Error('HP sample selection refused: '+message);};

// Finite research hypotheses, NOT normalizer or admission rules. ENGINE means
// engine reference present, mount/articulation references explicitly empty.
// None of the five measured identities has that shape, so these are untested
// extensions of the shared five-case-compatible branch, not rules they prove.
export const engineHypotheses=[
  {id:'H1_CREW_COUNT_WITH_ENGINE',formula:'B*N + M*N + E*G',count:'N',fields:['main.num_men','land.bonus_hit_points','man.hit_points','engine.hit_points','land.num_engines'],
    question:'Crew is the logical count; both crew and engine HP enter HealthMax.'},
  {id:'H2_ENGINE_COUNT_WITH_CREW',formula:'B*G + M*N + E*G',count:'G',fields:['main.num_men','land.bonus_hit_points','man.hit_points','engine.hit_points','land.num_engines'],
    question:'Engine is the logical count; crew HP still contributes.'},
  {id:'H3_CREW_POOL_ONLY',formula:'(B+M)*N',count:'N',fields:['main.num_men','land.bonus_hit_points','man.hit_points'],
    question:'HealthMax is the crew pool; engine HP belongs to a separate object/pool.'},
  {id:'H4_CHASSIS_POOL_ONLY',formula:'(B+E)*G',count:'G',fields:['land.bonus_hit_points','engine.hit_points','land.num_engines'],
    question:'HealthMax uses chassis/body HP; crew does not contribute to this pool.'},
];

export function predictSelection(candidate,hypothesisId) {
  gate(engineHypotheses.some(h=>h.id===hypothesisId),'unknown hypothesis');
  if(candidate.missing.length)return {status:'UNAVAILABLE',HealthMax:null,NumEntitiesInitial:null};
  const f=candidate.staticValues,n=f['main.num_men'],b=f['land.bonus_hit_points'],m=f['man.hit_points'],h=f['mount.hit_points'],
    e=f['engine.hit_points'],a=f['articulation.hit_points'],u=f['land.num_mounts'],g=f['land.num_engines'];
  let HealthMax,NumEntitiesInitial,required;
  if(candidate.shape==='ENGINE') {
    required=engineHypotheses.find(h=>h.id===hypothesisId).fields;
    switch(hypothesisId) {
      case 'H1_CREW_COUNT_WITH_ENGINE':HealthMax=b*n+m*n+e*g;NumEntitiesInitial=n;break;
      case 'H2_ENGINE_COUNT_WITH_CREW':HealthMax=b*g+m*n+e*g;NumEntitiesInitial=g;break;
      case 'H3_CREW_POOL_ONLY':HealthMax=(b+m)*n;NumEntitiesInitial=n;break;
      case 'H4_CHASSIS_POOL_ONLY':HealthMax=(b+e)*g;NumEntitiesInitial=g;break;
    }
  } else if(candidate.shape==='MAN_ONLY') {
    required=['main.num_men','land.bonus_hit_points','man.hit_points'];HealthMax=(b+m)*n;NumEntitiesInitial=n;
  } else if(candidate.shape==='MOUNTED') {
    required=['main.num_men','land.bonus_hit_points','man.hit_points','mount.hit_points','land.num_mounts'];
    HealthMax=b*u+m*n+h*u;NumEntitiesInitial=u;
  } else if(candidate.shape==='ARTICULATED') {
    required=['main.num_men','land.bonus_hit_points','man.hit_points','mount.hit_points','engine.hit_points','articulation.hit_points','land.num_mounts','land.num_engines'];
    HealthMax=b*g+m*n+h*u*g+e*g+a*g;NumEntitiesInitial=g;
  } else return {status:'UNAVAILABLE',HealthMax:null,NumEntitiesInitial:null};
  if(required.some(name=>!Number.isSafeInteger(f[name])||f[name]<0)||!Number.isSafeInteger(HealthMax)||HealthMax<=0||!Number.isSafeInteger(NumEntitiesInitial)||NumEntitiesInitial<=0)
    return {status:'UNAVAILABLE',HealthMax:null,NumEntitiesInitial:null};
  return {status:'UNTESTED_PREDICTION',HealthMax,NumEntitiesInitial};
}

const pairs=engineHypotheses.flatMap((a,i)=>engineHypotheses.slice(i+1).map(b=>[a.id,b.id]));
export function discriminatingPairs(predictions) {
  return pairs.filter(([a,b])=>predictions[a].status!=='UNAVAILABLE'&&predictions[b].status!=='UNAVAILABLE'&&
    (predictions[a].HealthMax!==predictions[b].HealthMax||predictions[a].NumEntitiesInitial!==predictions[b].NumEntitiesInitial));
}

export function buildSelection() {
  const replay=buildResearch(),old=read(folder+'report.json');gate(isDeepStrictEqual(replay,old),'existing HP research replay changed');
  const fixture=read(folder+'articulation.source.json'),cache=new Map(),factsById=new Map();
  const catalog=old.catalog.map(entry=> {
    let bundle=cache.get(entry.source.file);
    if(!bundle) {
      const bytes=readFileSync(entry.source.file),pin=old.inputs.find(p=>p.file===entry.source.file);
      gate(pin&&byteHash(bytes)===pin.bytesSha256,'source bytes differ');bundle=JSON.parse(bytes);
      if(entry.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,pin.expandedSha256);
      cache.set(entry.source.file,bundle);
    }
    const pointer=entry.source.pointer.replace(/^\/decoded/,'');
    let dump=pointer.slice(1).split('/').reduce((value,key)=>value?.[key],bundle);gate(dump,'missing source pointer');
    if(dump.schemaRefs)dump=restoreTrace(bundle,dump);
    const inspected=inspectStaticHP(dump);
    gate(inspected.chain.sourceMainKey===entry.mainKey&&inspected.chain.sourceLandKey===entry.landKey,'exact identity changed');
    if(inspected.refs.articulated_record?.value) {
      const extra=articulationTrace(fixture,entry.mainKey,dump);
      if(extra.key&&extra.hitPoints) {
        inspected.entities.articulation=extra.key;inspected.facts['articulation.hit_points']=extra.hitPoints;
        inspected.missing=inspected.missing.filter(name=>name!=='articulation.exact_entity_hp');
      }
    }
    const s=factSelectors(dump),c=observationContext(dump,s);
    const named=new Set(Object.values(inspected.entities).filter(Boolean).map(f=>f.source.rowId));
    const additional=dump.rows.filter(r=>r.table==='battle_entities_tables'&&!named.has(r.id)&&s.fact(r,'hit_points'));
    factsById.set(entry.id,inspected.facts);
    const candidate={id:entry.id,name:entry.name,mainKey:entry.mainKey,landKey:entry.landKey,shape:entry.shape,
      source:entry.source,missing:inspected.missing,staticValues:Object.fromEntries(Object.entries(inspected.facts).map(([name,f])=>[name,f?.value??null])),
      classification:{caste:s.fact(c.root,'caste')?.value??null,category:s.fact(c.land,'category')?.value??null,class:s.fact(c.land,'class')?.value??null},
      entities:Object.fromEntries(Object.entries(inspected.entities).map(([role,key])=>[role,key?{key:key.value,hitPoints:inspected.facts[role+'.hit_points']?.value??null,
        rowId:key.source.rowId,schemaVersion:key.source.schemaVersion}:null])),
      additionalExactJoinedHP:additional.map(row=>({key:row.row.key,fact:s.fact(row,'hit_points'),role:'UNCLASSIFIED_NO_MULTIPLICITY_INFERRED'})),
      productionEligible:false};
    candidate.predictions=Object.fromEntries(engineHypotheses.map(h=>[h.id,predictSelection(candidate,h.id)]));
    candidate.discriminatingPairs=discriminatingPairs(candidate.predictions);
    candidate.distinctHealthPredictions=new Set(Object.values(candidate.predictions).filter(p=>p.status!=='UNAVAILABLE').map(p=>p.HealthMax)).size;
    candidate.distinctCountPredictions=new Set(Object.values(candidate.predictions).filter(p=>p.status!=='UNAVAILABLE').map(p=>p.NumEntitiesInitial)).size;
    return candidate;
  });
  const compatibility=old.cases.map(c=>({id:c.id,observed:{HealthMax:c.runtime.HealthMax,NumEntitiesInitial:c.runtime.NumEntitiesInitial},
    predictions:catalog.find(entry=>entry.id===c.id).predictions}));
  for(const c of compatibility)for(const prediction of Object.values(c.predictions))gate(prediction.HealthMax===c.observed.HealthMax&&prediction.NumEntitiesInitial===c.observed.NumEntitiesInitial,'hypothesis contradicts existing ULTRA answer');
  const high=catalog.filter(c=>c.entities.engine&&c.entities.man&&c.entities.engine.hitPoints!==c.entities.man.hitPoints&&c.discriminatingPairs.length);
  const informative=catalog.filter(c=>c.discriminatingPairs.length);
  const choose=(mainKey,tier,reason)=> {
    const candidate=catalog.find(c=>c.mainKey===mainKey);gate(candidate&&candidate.discriminatingPairs.length,'recommendation lacks discrimination');
    const inputs=candidate.staticValues;
    const outcomes=[];
    for(const [id,p]of Object.entries(candidate.predictions)) {
      let outcome=outcomes.find(o=>o.HealthMax===p.HealthMax&&o.NumEntitiesInitial===p.NumEntitiesInitial);
      if(!outcome){outcome={HealthMax:p.HealthMax,NumEntitiesInitial:p.NumEntitiesInitial,survives:[],eliminated:[]};outcomes.push(outcome);}
      outcome.survives.push(id);
    }
    for(const o of outcomes)o.eliminated=engineHypotheses.map(h=>h.id).filter(id=>!o.survives.includes(id));
    return {id:candidate.id,mainKey,tier,reason,inputs,
      exactFacts:factsById.get(candidate.id),
      outcomes,unlistedOutcome:'REJECT_ALL_LISTED_EXTENSIONS_OR_BASELINE_ASSUMPTIONS; NO_NEAREST_VALUE_OR_FITTING'};
  };
  const selected=[
    choose('wh_main_brt_art_field_trebuchet',1,'All six hypothesis pairs split; engine HP 500 versus crew 8; N=44 versus G=4. Blessed variant has the same HP inputs and adds no split.'),
    choose('wh2_dlc09_tmb_art_screaming_skull_catapult_0',1,'Same N/G=11 control with engine HP 425; cross-checks source attribution at a second engine HP value. Carronades have identical HP predictions.'),
    choose('wh2_main_skv_art_plagueclaw_catapult',2,'Conditional cross-check if bonus/count multiplicity remains uncertain: N/G=14, engine HP 500, different exact crew/engine keys.'),
    choose('wh2_dlc12_skv_veh_doom_flayer_0',2,'Conditional transfer check from artillery to a non-articulated chariot-class engine. N=G=8 and M=E=8 form a control; only two HP groups remain.'),
  ];
  const coverage=selected.filter(s=>s.tier===1).map(s=>catalog.find(c=>c.id===s.id).discriminatingPairs);
  gate(new Set(coverage.flat().map(pair=>pair.join('|'))).size===pairs.length,'Tier 1 misses a hypothesis pair');
  return {purpose:'RESEARCH_SAMPLE_SELECTION_ONLY',productionEligible:false,baselineCommit:'88e11e5cb1c121929ae6a582e17863a844ecb34d',
    sourceResearchSha256:byteHash(readFileSync(folder+'report.json')),staticSnapshotId:old.staticSnapshotId,
    hypotheses:{engineOnlyExtensions:engineHypotheses,
      sharedBranches:{MAN_ONLY:'C=N; HP=(B+M)*N',MOUNTED:'C=U; HP=B*U+M*N+H*U',ARTICULATED:'C=G; HP=B*G+M*N+H*U*G+E*G+A*G'},
      unidentifiableAlternatives:[
        {scope:'MOUNTED',formulas:['B*U+M*N+H*U','B*U+M*(N+U)','B*U+H*(N+U)'],conditionToSplit:'M != H',availableContrastingUnits:0},
        {scope:'ARTICULATED',formulas:['...+E*G+A*G','...+2*E*G'],conditionToSplit:'E != A',availableContrastingUnits:0},
      ],
      limitation:'Engine-only branch is unmeasured in the five answers. Shared branches are compatible hypotheses, not established universal rules. Finite alternatives do not exhaust all unit-type-specific rules.'},
    compatibility,counts:{production:catalog.length,highDiscriminationUnits:high.length,
      distinctHighHPInputProfiles:new Set(high.map(c=>JSON.stringify(c.staticValues))).size,
      unitsWithAnyHypothesisSplit:informative.length,unavailable:catalog.filter(c=>c.missing.length).length,
      unequalManMount:catalog.filter(c=>c.entities.mount&&c.entities.man?.hitPoints!==c.entities.mount.hitPoints).length,
      unequalEngineArticulation:catalog.filter(c=>c.entities.articulation&&c.entities.engine?.hitPoints!==c.entities.articulation.hitPoints).length,
      engineHPDistribution:Object.fromEntries([8,425,500].map(hp=>[hp,catalog.filter(c=>c.entities.engine?.hitPoints===hp).length]))},
    minimum:{toSeparateListedEngineExtensions:1,oneUnitSeparators:informative.filter(c=>c.discriminatingPairs.length===pairs.length).map(c=>c.id),
      tier1CrossCheck:2,maximumSuggested:4,universalRuleValidation:'NOT_ESTABLISHABLE_FROM_THIS_SELECTION; MOUNTED/ARTICULATION SOURCE ALIASES REMAIN'},
    comparisonPolicy:'Compare HP and count separately, then the joint prediction. An unmatched joint outcome rejects that extension, not every HP expression that still fits numerically. Never select the nearest value or fit a new coefficient.',
    selected,catalog};
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2];gate(process.argv.length===3&&['--check','--write'].includes(mode),'Use --check or --write (selection research only).');
  const selection=buildSelection(),output=serialize(selection),file=folder+'selection.json';
  if(mode==='--write')writeFileSync(file,output);else gate(readFileSync(file,'utf8')===output,'selection replay differs');
  console.log(JSON.stringify({mode,...selection.counts,selected:selection.selected.map(s=>({id:s.id,tier:s.tier})),productionEligible:false}));
}
