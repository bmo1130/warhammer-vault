import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const replays=['review-skill-production-bretonnia','review-skill-slice-01','review-skill-batch-01','review-skill-batch-02','review-skill-rank-research','review-skill-owner-research','review-skill-class-selector-research','review-bretonnia-research','classify-bretonnia-research','scan-bretonnia-research','review-research-mappings','review-research-scopes','admit-bretonnia-research'];
for(const script of replays){const r=spawnSync(process.execPath,[`scripts/${script}.mjs`],{cwd:root,encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0){process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');process.exit(r.status??1);}console.log(`PASS ${script}`);}
// Commands are a closed constant list; Windows npm.cmd needs cmd dispatch.
for(const command of ['test','build']){const file=process.platform==='win32'?(process.env.ComSpec??'cmd.exe'):'npm',args=process.platform==='win32'?['/d','/s','/c',`npm run ${command}`]:['run',command];const r=spawnSync(file,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.error)throw r.error;if(r.status!==0){process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');process.exit(r.status??1);}console.log(`PASS npm run ${command}`);console.log(r.stdout.split(/\r?\n/).filter(l=>/^ℹ (tests|pass|fail|skipped)|built in/.test(l)).join('\n'));if(r.stderr.trim())console.log(r.stderr.trim());}
console.log('PASS 13 replay commands + npm test + npm run build');
