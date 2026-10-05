import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {resolve as pathResolve,join,basename} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {VERSION,SNAPSHOT,verifySetup} from '../skill-rank-runtime-resolution/experiment.mjs';
import {parseLogs} from '../skill-rank-runtime-resolution/resolve.mjs';
import {buildProbe,inspectFrame,resolve,REVISION,DIAGNOSTIC_REVISION} from './probe.mjs';
import {diagnose} from './stat-items.mjs';
const [command,...args]=process.argv.slice(2),options={};
for(let i=0;i<args.length;i++){assert(args[i].startsWith('--')&&args[i+1]&&!args[i+1].startsWith('--'),'Expected --key value');(options[args[i].slice(2)]??=[]).push(args[++i]);}
const one=k=>{assert(options[k]?.length===1,`Exactly one --${k} required`);return options[k][0];};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const logs=()=>{assert(options.log?.length,'At least one --log required, ordered chronologically');return options.log.map(p=>{const b=readFileSync(p);return {name:basename(p),text:b.toString('utf8'),sha256:sha(b),path:p};});};
const newDir=()=>{const p=pathResolve(one('out'));assert(!existsSync(p),'Output must be a new directory');mkdirSync(p,{recursive:true});return p;};
if(command==='prepare'){
 const setup=verifySetup({format:'wh3-skill-rank-setup-v1',gameVersion:VERSION,snapshotId:SNAPSHOT,ownerSubtype:'wh_main_brt_lord',unitSize:one('unit-size'),trialId:randomUUID(),context:'CAMPAIGN',channel:'CCO_CAMPAIGN_PREBONUS_VALUE'});
 const source=buildProbe(),out=newDir(),config={...setup,sessionId:randomUUID()};
 // All interpolated strings are fixed identifiers, enums, or generated UUIDs.
 const prelude='WV_SKILL_RANK_CONFIG = {'+Object.entries(config).map(([k,v])=>`${k} = ${JSON.stringify(v)}`).join(',')+'}\n';
 write(join(out,'setup.json'),setup);
 writeFileSync(join(out,'exec.lua'),prelude+source,{flag:'wx'});
 console.log(JSON.stringify({bundle:out,next:'Reuse historical install.ps1; capture baseline before bind',probeRevision:REVISION,statDiagnosticRevision:DIAGNOSTIC_REVISION,liveApiVerified:false}));
}else if(command==='diagnose'){
 const setup=verifySetup(json(one('setup'))),inputs=logs(),parsed=parseLogs(inputs);
 assert.equal(parsed.problems.length,0);assert.equal(parsed.frames.length,1,'Expected only the new first 0/0 capture');
 const result=diagnose(parsed.frames[0],setup),out=newDir();mkdirSync(join(out,'raw'));
 inputs.forEach((input,i)=>copyFileSync(input.path,join(out,'raw',`${i}-${input.name}`)));
 write(join(out,'setup.json'),setup);write(join(out,'parsed.json'),parsed);write(join(out,'diagnostic-report.json'),result);
 console.log(JSON.stringify({output:out,...result},null,2));
 if(result.status!=='COMPLETE')process.exitCode=2;
}else if(command==='bind'){
 const setup=verifySetup(json(one('setup'))),parsed=parseLogs(logs());
 assert.equal(parsed.problems.length,0);assert(parsed.frames.length>=1);
 const first=inspectFrame(parsed.frames[0],setup);assert.deepEqual(first.ranks,[0,0]);
 const save=pathResolve(one('save')),bound={...setup,baselineSaveSha256:sha(readFileSync(save)),baselineSaveName:basename(save),pinnedBaseline:{captureSha256:first.entry.captureSha256},expectedIdentity:first.identity};
 delete bound.review;verifySetup(bound);const out=newDir();write(join(out,'setup.json'),bound);
 console.log(JSON.stringify({bound:join(out,'setup.json'),note:'Identity pinned. Loaded binary save still requires user attestation.'}));
}else if(command==='ingest'){
 const setup=verifySetup(json(one('setup'))),inputs=logs(),parsed=parseLogs(inputs),result=resolve(parsed,setup),out=newDir();
 mkdirSync(join(out,'raw'));
 inputs.forEach((input,i)=>copyFileSync(input.path,join(out,'raw',`${i}-${input.name}`)));
 write(join(out,'setup.json'),setup);write(join(out,'parsed.json'),parsed);write(join(out,'resolution.json'),result);
 writeFileSync(join(out,'observations.jsonl'),result.observations.map(o=>JSON.stringify(o)).join('\n')+(result.observations.length?'\n':''),{flag:'wx'});
 write(join(out,'review-template.json'),{...setup,review:{controlledSetup:false,loadedSaveAttested:false,baselineSaveSha256:setup.baselineSaveSha256??null,captureSha256s:parsed.frames.map(f=>f.captureSha256),channel:setup.channel,currentValuesNotTooltipOrPreview:false,reviewer:'',evidenceNote:'Record unchanged difficulty/research/mods/campaign modifiers; baseline save reload; verify this CCO Value channel reflects committed campaign bonuses.'}});
 console.log(JSON.stringify({output:out,verdict:result.verdict,semantics:result.semantics,errors:result.errors.length,productionEligible:false}));
 if(result.errors.length)process.exitCode=2;
}else throw new Error('Commands: prepare --unit-size ULTRA --out DIR | diagnose --setup FILE --log FILE --out DIR | bind --setup FILE --log FILE --save FILE --out DIR | ingest --setup FILE --log FILE [--log FILE] --out DIR');
