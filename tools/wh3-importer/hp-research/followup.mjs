import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {buildResearch,serialize} from './research.mjs';
import {buildSelection,engineHypotheses,predictSelection} from './selection.mjs';
import {byteHash,replayHP} from '../hp-policy/policy.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';

const folder='tools/wh3-importer/hp-research/';
const read=file=>JSON.parse(readFileSync(file));
const requireEvidence=(ok,message)=>{if(!ok)throw Error('HP follow-up refused: '+message);};

// Finite research comparisons only. No result is consumed by admission or the
// normalizer. These structural branches are hypotheses, not ownership rules.
export function scopedPrediction(c,articulatedManCount='N') {
  if(c.missing.length)return null;
  const f=c.staticValues,N=f['main.num_men'],B=f['land.bonus_hit_points'],M=f['man.hit_points'],
    H=f['mount.hit_points'],E=f['engine.hit_points'],A=f['articulation.hit_points'],U=f['land.num_mounts'],G=f['land.num_engines'];
  let HealthMax,NumEntitiesInitial,formula;
  if(c.shape==='MAN_ONLY'){HealthMax=(B+M)*N;NumEntitiesInitial=N;formula='(B+M)*N';}
  else if(c.shape==='MOUNTED'){HealthMax=B*U+M*N+H*U;NumEntitiesInitial=U;formula='B*U + M*N + H*U';}
  else if(c.shape==='ARTICULATED') {
    const crew=articulatedManCount==='N'?N:U*G;
    HealthMax=B*G+M*crew+H*U*G+E*G+A*G;NumEntitiesInitial=G;
    formula=`B*G + M*${articulatedManCount} + H*U*G + E*G + A*G`;
  } else if(c.shape==='ENGINE'&&c.classification.category==='artillery') {
    HealthMax=(B+M)*N+(B+E)*G;NumEntitiesInitial=G;formula='(B+M)*N + (B+E)*G';
  } else if(c.shape==='ENGINE'&&c.classification.caste==='chariot') {
    HealthMax=B*N+M*N+E*G;NumEntitiesInitial=G;formula='B*N + M*N + E*G';
  } else return null;
  if(!Number.isSafeInteger(HealthMax)||HealthMax<=0||!Number.isSafeInteger(NumEntitiesInitial)||NumEntitiesInitial<=0)return null;
  return {HealthMax,NumEntitiesInitial,formula,status:'RESEARCH_PREDICTION_ONLY'};
}

export function buildFollowup() {
  const historical=buildResearch(),selection=buildSelection();
  requireEvidence(serialize(selection)===readFileSync(folder+'selection.json','utf8'),'historical predictions changed');
  const manifest=read('tools/wh3-importer/hp-policy/manifest.json'),runtime=replayHP(manifest);
  requireEvidence(isDeepStrictEqual(runtime,read('tools/wh3-importer/hp-policy/review.json')),'direct runtime replay changed');
  const cache=new Map();
  const staticClues=c=> {
    let bundle=cache.get(c.source.file);
    if(!bundle) {
      const bytes=readFileSync(c.source.file),pin=historical.inputs.find(i=>i.file===c.source.file);
      requireEvidence(pin&&byteHash(bytes)===pin.bytesSha256,'static source bytes changed');
      bundle=JSON.parse(bytes);
      if(c.source.pointer.startsWith('/decoded/'))bundle=decodeSource(bundle,pin.expandedSha256);
      cache.set(c.source.file,bundle);
    }
    let dump=c.source.pointer.replace(/^\/decoded/,'').slice(1).split('/').reduce((value,key)=>value?.[key],bundle);
    requireEvidence(dump,'missing exact source pointer');if(dump.schemaRefs)dump=restoreTrace(bundle,dump);
    const s=factSelectors(dump),context=observationContext(dump,s);
    return Object.fromEntries([['caste',context.root,'caste'],['category',context.land,'category'],['class',context.land,'class'],
      ['engine_type',context.engine,'engine_type'],['mounted_draughts',context.land,'mounted_draughts'],['sync_locomotion',context.land,'sync_locomotion']]
      .map(([name,row,field])=>[name,s.fact(row,field)??null]));
  };
  const cases=runtime.review.map(r=> {
    const c=selection.catalog.find(c=>c.id===r.id),observed=r.candidates[0];
    requireEvidence(c&&c.mainKey===r.staticChain.sourceMainKey&&c.landKey===r.staticChain.sourceLandKey,'exact identity differs');
    const compare=p=>({...p,predictionStatus:p.status,
      status:p.HealthMax===observed.HealthMax&&p.NumEntitiesInitial===observed.NumEntitiesInitial?'NUMERICALLY_COMPATIBLE_ONLY':'REJECTED_BY_OBSERVATION',
      matchesHealth:p.HealthMax===observed.HealthMax,matchesCount:p.NumEntitiesInitial===observed.NumEntitiesInitial});
    const old=c.shape==='ENGINE'?Object.fromEntries(engineHypotheses.map(h=>[h.id,compare(predictSelection(c,h.id))])):null;
    const A=scopedPrediction(c,'N'),B=scopedPrediction(c,'(U*G)');
    requireEvidence(A&&B,'unavailable scoped comparison');
    return {id:c.id,name:c.name,mainKey:c.mainKey,landKey:c.landKey,shape:c.shape,staticValues:c.staticValues,
      staticSource:c.source,structuralClues:staticClues(c),
      runtime:{HealthMax:observed.HealthMax,NumEntitiesInitial:observed.NumEntitiesInitial,componentCounts:observed.componentCounts,
        unitSize:observed.unitSize,unitSizeSource:observed.unitSizeSource,references:r.candidates.map(c=>c.reference),staticSnapshotId:observed.metadata.staticSnapshotId},
      historicalHypotheses:old,scopedComparisons:{V_N:compare(A),V_UG:compare(B)},
      ...(c.shape==='ENGINE'?{unconditionalArtilleryFormula:{HealthMax:(c.staticValues['land.bonus_hit_points']+c.staticValues['man.hit_points'])*c.staticValues['main.num_men']+
        (c.staticValues['land.bonus_hit_points']+c.staticValues['engine.hit_points'])*c.staticValues['land.num_engines'],
        matchesHealth:(c.staticValues['land.bonus_hit_points']+c.staticValues['man.hit_points'])*c.staticValues['main.num_men']+
        (c.staticValues['land.bonus_hit_points']+c.staticValues['engine.hit_points'])*c.staticValues['land.num_engines']===observed.HealthMax}}:{}),
      confidence:'NUMERICALLY_COMPATIBLE_ONLY',productionEligible:false};
  });
  const measured=new Set(cases.map(c=>c.id));
  const splits=selection.catalog.filter(c=>!measured.has(c.id)).flatMap(c=> {
    const A=scopedPrediction(c,'N'),B=scopedPrediction(c,'(U*G)');
    return A&&B&&(A.HealthMax!==B.HealthMax||A.NumEntitiesInitial!==B.NumEntitiesInitial)?
      [{id:c.id,mainKey:c.mainKey,landKey:c.landKey,name:c.name,staticValues:c.staticValues,staticSource:c.source,
        predictions:{V_N:A,V_UG:B},productionEligible:false}]:[];
  });
  return {purpose:'RESEARCH_ONLY',productionEligible:false,
    inputs:{runtimeReviewSha256:byteHash(readFileSync('tools/wh3-importer/hp-policy/review.json')),
      historicalResearchSha256:byteHash(readFileSync(folder+'report.json')),historicalSelectionSha256:byteHash(readFileSync(folder+'selection.json'))},
    rawInputs:manifest.inputs.map(i=>({file:i.file,originalPath:i.originalPath,originalSha256:i.originalSha256})),
    counts:{production:selection.catalog.length,directRuntimeHP:runtime.admitted.length,missingHP:selection.catalog.length-runtime.admitted.length,
      staticDerivationConfident:0,staticDerivationAmbiguous:selection.catalog.length,staticDerivationUnavailable:0},
    hypotheses:{V_N:'Scoped branches; articulated M*N contribution.',V_UG:'Same branches; articulated M*(U*G) contribution. Cardinality proxy only, no physical parent mapping inferred.'},
    algebraicAliases:['Artillery: (B+M)*N+(B+E)*G = M*N+G*(E+B*(1+N/G)); separate physical pools not established.',
      'Doom-Flayers: N=G and M=E=8; B*N+M*N+E*G = B*G+(M+E)*G = (B+2*M)*G.',
      'Mounted cases: M=H=8; exchanging man and mount HP contribution sources is not identifiable.',
      'Skeleton Chariots: N=U*G and E=A=8; M*N vs M*U*G and E+A vs 2*E not identifiable.'],
    cases,nextCandidates:splits,automation:'NONE: no unique static ownership, bonus multiplicity or cross-class ULTRA count contract established.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2],file=folder+'followup.json';
  if(process.argv.length!==3||!['--check','--write'].includes(mode))throw Error('Use --check or --write (research only).');
  const report=buildFollowup(),bytes=serialize(report);
  if(mode==='--write')writeFileSync(file,bytes);else requireEvidence(readFileSync(file,'utf8')===bytes,'report replay differs');
  console.log(JSON.stringify({mode,...report.counts,nextCandidates:report.nextCandidates.map(c=>c.name),productionEligible:false}));
}
