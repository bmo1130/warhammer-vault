import {readFileSync,writeFileSync} from 'node:fs';
import {replaySpeed} from '../tools/wh3-importer/speed-policy/admission.mjs';
import overlay from '../tools/wh3-importer/speed-policy/overlay.cjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2];
if(process.argv.length!==3||!['--write','--check'].includes(mode))throw Error('Use --write or --check.');
const report=replaySpeed(),sidecar=overlay.serialize(report),file='src/data/unitSpeedAdmissions.json';
if(overlay.hash(sidecar)!==overlay.reviewSha256)throw Error('Speed explicit admission hash differs');
if(mode==='--check'&&readFileSync(file,'utf8')!==sidecar)throw Error('Speed admission replay differs');
const units=JSON.parse(readFileSync('src/data/units.json')),next=overlay.applyProductionSpeed(units),bytes=overlay.serialize(next);
const validate=await loadUnitValidator();
if(validate(next,JSON.parse(readFileSync('src/data/factions.json')).map(f=>f.id)).length)throw Error('Speed output rejected by Unit validator');
if(mode==='--write'){writeFileSync(file,sidecar);writeFileSync('src/data/units.json',bytes);}
else if(readFileSync('src/data/units.json','utf8')!==bytes)throw Error('Speed Production equality failed');
console.log(JSON.stringify({mode,populated:81,blank:20,kind:'STATIC_DERIVED_SPEED'}));
