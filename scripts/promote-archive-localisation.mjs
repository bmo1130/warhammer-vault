import fs from 'node:fs';
import assert from 'node:assert/strict';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash} from '../tools/wh3-importer/production-growth/roster.mjs';
import {reviewArchiveLocalisation} from '../tools/wh3-importer/unit-localisation/archive.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const data=Object.fromEntries(['factions','lords','heroes','legacyCharacters','characterAliases'].map(p=>[p,read(`src/data/${p}.json`)]));
const review=reviewArchiveLocalisation(read('tools/wh3-importer/unit-localisation/archive-source.json'),decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash),data);
const projection={format:review.format,gameVersion:review.gameVersion,sourceHash:review.sourceHash,koreanPack:review.koreanPack,
  admissions:review.admissions.map(a=>({id:a.id,type:a.type,category:a.category,originalName:a.originalName,englishName:a.englishName,name:a.name,
    localisationKeys:a.recipe.keys,sourceRowIds:a.sourceRowIds})),holds:review.holds.map(h=>({id:h.id,type:h.type,reason:h.reason}))};
for(const [p,v]of Object.entries({'tools/wh3-importer/unit-localisation/archive-admission.json':review,'src/data/archiveLocalisations.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');else assert.deepEqual(read(p),v,'Archive localisation admission/projection drift: '+p);
}
console.log(JSON.stringify({summary:review.summary,exactLocs:review.exactLocs,holds:review.holds.map(h=>[h.id,h.reason])},null,2));
console.log(`Archive Korean localisation ${mode} PASS`);
