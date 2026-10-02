import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {growthAdmissions,replayGrowthReview,renderGrowthReview} from '../tools/wh3-importer/production-growth/batch.mjs';
const mode=process.argv[2];
if(process.argv.length!==3||!['--check','--write','--verbose'].includes(mode))throw Error('Use --check, --write or --verbose');
for(const name of Object.keys(growthAdmissions).sort()) {
  const base=`tools/wh3-importer/${name}/`,bundle=JSON.parse(await readFile(base+'sources.json','utf8'));
  const result=replayGrowthReview(name,bundle);
  if(mode==='--verbose') {
    await mkdir(`generated/wh3/${name}`,{recursive:true});
    await writeFile(`generated/wh3/${name}/review.verbose.json`,JSON.stringify(result.expanded,null,2)+'\n');
  } else for(const [file,text]of [['review.json',JSON.stringify(result.artifact,null,2)+'\n'],['EXPANSION_BATCH.md',renderGrowthReview(name,result)]]) {
    if(mode==='--write')await writeFile(base+file,text);
    else if(await readFile(base+file,'utf8')!==text)throw Error('Growth review differs: '+base+file);
  }
  console.log(`${name} review ${mode}: ${result.reviews.length} explicit core subsets`);
}
