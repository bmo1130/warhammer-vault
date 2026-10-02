import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {resolveOptions,openRawSource} from '../tools/wh3-importer/extract.mjs';
import {discoverSample} from '../tools/wh3-importer/pilot-discovery.mjs';
import {attemptSample} from '../tools/wh3-importer/pilot.mjs';
import {pilotAffiliations} from '../tools/wh3-importer/pilot-catalog.mjs';
import {isReviewedSource} from '../tools/wh3-importer/reviewed-snapshots.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
import {expansionCatalog,validateExpansionCatalog} from '../tools/wh3-importer/expansion-batch-01/catalog.mjs';

validateExpansionCatalog(expansionCatalog);
const options=await resolveOptions(process.argv.slice(2));
const output=path.resolve('generated/wh3/expansion-batch-01');
await mkdir(path.join(output,'units'),{recursive:true});
const save=(name,value)=>writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
await save('manifest.json',{status:'RUNNING',catalog:expansionCatalog,gameExecuted:false});
let source;
try {
  source=await openRawSource(options);
  if(!isReviewedSource(source.metadata,'')) throw new Error('Expansion requires reviewed 9.0.2.0 schema/pack snapshot');
  const loc=source.local.files.filter(f=>f.path==='text/db/unit_attributes__.loc');
  if(loc.length===1)source.supplementalLocalisations.push(await source.reader.decode(source.local,loc[0].path));
  const preflight=[];
  // Complete the full bounded preflight before any candidate normalization.
  for(const sample of expansionCatalog) {
    const discovery=await discoverSample(source,sample);
    const localisationMatches=source.localisation.rows.filter(row=>row.text===sample.displayName);
    preflight.push({sample,localisationMatches,discovery});
    console.log(`Preflight ${sample.displayName}: ${discovery.candidates.length} exact localisation roots`);
  }
  await save('preflight.json',{catalog:expansionCatalog,provenance:source.metadata,entries:preflight,gameExecuted:false});
  const validate=await loadUnitValidator(),results=[];
  for(const sample of expansionCatalog) {
    const result=await attemptSample(source,{slug:sample.slug,displayName:sample.displayName,reason:'Bounded expansion static review',expectedCoverage:[]},validate,pilotAffiliations);
    results.push(result);await save(`units/${sample.slug}.result.json`,result);
    console.log(`Trace ${sample.displayName}: ${result.status}; ${result.dump?.rows.length??0} selected rows`);
  }
  await save('manifest.json',{status:'COMPLETE',catalog:expansionCatalog,provenance:source.metadata,gameExecuted:false,
    counts:Object.fromEntries(['CLEAN','PARTIAL','BLOCKED'].map(s=>[s,results.filter(r=>r.status===s).length])),
    results:results.map(r=>({slug:r.sample.slug,status:r.status,file:`units/${r.sample.slug}.result.json`}))});
} finally {await source?.client.close().catch(()=>undefined);}
