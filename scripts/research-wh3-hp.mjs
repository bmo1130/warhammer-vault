import {readFileSync,writeFileSync} from 'node:fs';
import {buildResearch,serialize} from '../tools/wh3-importer/hp-research/research.mjs';
const mode=process.argv[2];
if(process.argv.length!==3||!['--check','--write'].includes(mode))throw Error('Use --check or --write (research report only).');
const file='tools/wh3-importer/hp-research/report.json',report=buildResearch(),bytes=serialize(report);
if(mode==='--write')writeFileSync(file,bytes);
else if(readFileSync(file,'utf8')!==bytes)throw Error('HP research replay differs');
console.log(JSON.stringify({mode,...report.counts,productionEligible:report.productionEligible}));
