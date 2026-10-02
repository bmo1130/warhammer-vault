import {mkdir,writeFile} from 'node:fs/promises';
import {resolveOptions,openRawSource} from '../tools/wh3-importer/extract.mjs';
import {discoverSample} from '../tools/wh3-importer/pilot-discovery.mjs';
import {attemptSample} from '../tools/wh3-importer/pilot.mjs';
import {inspectMissileSources} from '../tools/wh3-importer/missile-semantics/collect.mjs';
import {pilotAffiliations} from '../tools/wh3-importer/pilot-catalog.mjs';
import {isReviewedSource} from '../tools/wh3-importer/reviewed-snapshots.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
import {growthCatalogs,validateGrowthCatalog} from '../tools/wh3-importer/production-growth/catalog.mjs';

const name=process.argv[2],catalog=growthCatalogs[name];
if(!catalog||process.argv.length!==3)throw Error('Use extract-production-growth.mjs expansion-batch-02|03|04');
validateGrowthCatalog(catalog);
const output=`generated/wh3/${name}`;
await mkdir(output+'/units',{recursive:true});
const save=(file,value)=>writeFile(output+'/'+file,JSON.stringify(value,null,2)+'\n');
await save('manifest.json',{status:'RUNNING',catalog,gameExecuted:false});
let source;
try {
  source=await openRawSource(await resolveOptions([]));
  if(!isReviewedSource(source.metadata,''))throw Error('Growth requires reviewed game/schema/pack snapshot');
  const loc=source.local.files.filter(f=>f.path==='text/db/unit_attributes__.loc');
  if(loc.length===1)source.supplementalLocalisations.push(await source.reader.decode(source.local,loc[0].path));
  const entries=[];
  for(const sample of catalog){const discovery=await discoverSample(source,sample);
    entries.push({sample,localisationMatches:source.localisation.rows.filter(row=>row.text===sample.displayName),discovery});
    console.log(`Preflight ${sample.displayName}: ${discovery.candidates.length} roots`);
  }
  await save('preflight.json',{catalog,provenance:source.metadata,entries,gameExecuted:false});
  const validate=await loadUnitValidator(),results=[];
  for(const sample of catalog){
    const result=await attemptSample(source,{slug:sample.slug,displayName:sample.displayName,reason:'Bounded production growth static review',expectedCoverage:[]},validate,pilotAffiliations);
    if(result.dump) {
      // Existing bounded graph probe; it does not execute a runtime probe.
      result.missileInspection=await inspectMissileSources(source,result.dump);
    }
    results.push(result);await save(`units/${sample.slug}.result.json`,result);
    console.log(`Trace ${sample.displayName}: ${result.status}; ${result.dump?.rows.length??0} rows; missile ${result.missileInspection?.contract.completeness??'unavailable'}`);
  }
  await save('manifest.json',{status:'COMPLETE',catalog,provenance:source.metadata,gameExecuted:false,
    counts:Object.fromEntries(['CLEAN','PARTIAL','BLOCKED'].map(s=>[s,results.filter(r=>r.status===s).length]))});
} catch(error){await save('manifest.json',{status:'FAILED',catalog,reason:error.message,gameExecuted:false});throw error;}
finally{await source?.client.close().catch(()=>undefined);}
