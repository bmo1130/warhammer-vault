import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {buildProbe,plan,REVISION} from './probe.mjs';
import {baseline,verifySetup,parseLogs,compare,sha} from './check.mjs';
const [command,...args]=process.argv.slice(2),opts={};
for(let i=0;i<args.length;i++){assert(args[i].startsWith('--')&&args[i+1]&&!args[i+1].startsWith('--'));(opts[args[i].slice(2)]??=[]).push(args[++i]);}
const one=k=>{assert.equal(opts[k]?.length,1,`Exactly one --${k} required`);return opts[k][0];};
const out=()=>{const p=resolve(one('out'));assert(!existsSync(p),'Output must be a new directory');mkdirSync(p,{recursive:true});return p;};
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
if(command==='prepare'){
 const entry=baseline(),b=entry.frame;assert(['yes','no'].includes(one('units-panel')));
 const unitsPanel=one('units-panel')==='yes',s=verifySetup({format:'wh3-stance-preview-setup-v1',gameVersion:b.gameVersion,snapshotId:b.snapshotId,unitSize:b.unitSize,
  context:b.context,channel:b.channel,ownerSubtype:b.owner.AgentSubtypeRecordContextKey.value,ownerCQI:b.owner.CQI.value,forceCQI:b.force.CQI.value,
  baselineCaptureSha256:entry.captureSha256,trialId:randomUUID(),unitsPanel,steps:plan(unitsPanel)}),dir=out();
 write(join(dir,'setup.json'),s);
 const fields={...s,sessionId:randomUUID()};delete fields.steps;
 const config=Object.entries(fields).filter(([,v])=>['string','number','boolean'].includes(typeof v)).map(([k,v])=>`${k} = ${JSON.stringify(v)}`);
 config.push('steps = {'+s.steps.map(x=>JSON.stringify(x)).join(',')+'}');
 writeFileSync(join(dir,'exec.lua'),'WV_SKILL_RANK_CONFIG = {'+config.join(',')+'}\n'+buildProbe(),{flag:'wx'});
 console.log(JSON.stringify({bundle:dir,revision:REVISION,steps:s.steps,gameStateMutation:false,gate:'UNCHANGED',trialReady:false,productionEligible:false},null,2));
}else if(command==='inspect'){
 const setup=verifySetup(JSON.parse(readFileSync(one('setup'),'utf8')));assert(opts.log?.length);
 const inputs=opts.log.map(p=>{const b=readFileSync(p);return {path:p,name:basename(p),text:b.toString('utf8'),sha256:sha(b)};});
 const parsed=parseLogs(inputs),result=compare(parsed,setup),dir=out();mkdirSync(join(dir,'raw'));
 inputs.forEach((x,i)=>copyFileSync(x.path,join(dir,'raw',`${i}-${x.name}`)));
 write(join(dir,'setup.json'),setup);write(join(dir,'parsed.json'),parsed);write(join(dir,'comparison.json'),result);
 write(join(dir,'ui-action-attestation-template.json'),{format:'wh3-stance-ui-actions-attestation-v1',verifiedByUser:false,
  baselineSaveUnchanged:false,noSkillPointsOrStanceActivationOrMovement:false,
  captureActions:parsed.frames.map(e=>({captureSha256:e.captureSha256,plannedStep:e.frame.declaredStep,actualUiAction:'',hoveredStanceKey:null,panelsActuallyClosed:null})),
  note:'Step labels are plans, not API observations. Record actual UI actions/skips/mistakes before interpreting correlation.'});
 console.log(JSON.stringify({output:dir,...result},null,2));if(result.errors.length)process.exitCode=2;
}else throw new Error('prepare --units-panel no|yes --out NEW_DIR | inspect --setup FILE --log FILE [--log FILE] --out NEW_DIR');
