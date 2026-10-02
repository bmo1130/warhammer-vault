import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {projectExpansion} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {serializeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {growthCatalogs,validateGrowthCatalog} from '../tools/wh3-importer/production-growth/catalog.mjs';
const [name,mode]=process.argv.slice(2),catalog=growthCatalogs[name];
if(!catalog||!['--write','--check'].includes(mode)||process.argv.length!==4)throw Error('Use project-production-growth.mjs expansion-batch-NN --write|--check');
const read=async p=>JSON.parse(await readFile(p,'utf8')),input=`generated/wh3/${name}/`;
if((await read(input+'manifest.json')).status!=='COMPLETE')throw Error('Extraction not COMPLETE');
const preflight=await read(input+'preflight.json');
const results=await Promise.all(catalog.map(async c=>{const bytes=await readFile(input+`units/${c.slug}.result.json`);return {bytes,result:JSON.parse(bytes)};}));
const bundle=projectExpansion(preflight,results,{catalog,validateCatalog:validateGrowthCatalog,batchName:name});
const output=serializeSource(bundle),target=`tools/wh3-importer/${name}/sources.json`;
if(mode==='--write'){await mkdir(`tools/wh3-importer/${name}`,{recursive:true});await writeFile(target,output);}
else if(await readFile(target,'utf8')!==output)throw Error('Staging compact projection differs');
console.log(`${name} projection ${mode}: ${catalog.length} candidates; source ${bundle.expandedSha256}`);
