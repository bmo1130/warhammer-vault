import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {replayHP,byteHash} from '../tools/wh3-importer/hp-policy/policy.mjs';
import {replayStaticHP} from '../tools/wh3-importer/hp-policy/static-derived.mjs';
import overlay from '../tools/wh3-importer/production-overlay.cjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2];
if(process.argv.length!==3||!['--check','--write'].includes(mode))throw Error('Use --check or --write. No game execution or capture.');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const manifest=json('tools/wh3-importer/hp-policy/manifest.json');
const report=replayHP(manifest),committed=json('tools/wh3-importer/hp-policy/review.json');
if(!isDeepStrictEqual(report,committed))throw Error('HP review replay differs');
const staticReport=replayStaticHP();
if(!isDeepStrictEqual(staticReport,json('tools/wh3-importer/hp-policy/static-review.json')))throw Error('Static HP review replay differs');
const units=json('src/data/units.json'),base=overlay.staticProductionView(units);
if(byteHash(Buffer.from(overlay.serialize(base)))!==manifest.baselineUnitsSha256)throw Error('Unrelated Production/Sample values or ordering changed');
const next=overlay.applyProductionHP(base),output=overlay.serialize(next);
const hpAdmissions={format:'reviewed-unit-ultra-hp-admissions-v1',reviewReference:'tools/wh3-importer/hp-policy/review.json',
  reviewSha256:overlay.reviewSha256,unitSize:'ULTRA',unitSizeSource:'DECLARED_SETUP',
  staticReviewReference:'tools/wh3-importer/hp-policy/static-review.json',staticReviewSha256:overlay.staticReviewSha256,
  admissions:[...report.admitted.map(a=>({id:a.id,mainKey:a.sourceMainKey,landKey:a.sourceLandKey,staticSnapshotId:a.staticSnapshotId,
    kind:a.kind,field:a.field,value:a.value})),...staticReport.admitted.map(a=>({id:a.id,mainKey:a.sourceMainKey,landKey:a.sourceLandKey,
    staticSnapshotId:a.staticSnapshotId,kind:a.kind,field:a.field,value:a.value,unitSize:a.unitSize,unitSizeSource:a.unitSizeSource,
    profile:a.profile,hpProfileSha256:a.hpProfileSha256,confidence:a.confidence,
    sourceReference:'tools/wh3-importer/hp-policy/static-review.json#/admitted/'+staticReport.admitted.indexOf(a)}))]};
const validate=await loadUnitValidator();
if(validate(next,json('src/data/factions.json').map(f=>f.id)).length)throw Error('HP output rejected by Unit validator');
if(mode==='--write'){writeFileSync('src/data/units.json',output);writeFileSync('src/data/unitHpAdmissions.json',overlay.serialize(hpAdmissions));}
else if(readFileSync('src/data/units.json','utf8')!==output||readFileSync('src/data/unitHpAdmissions.json','utf8')!==overlay.serialize(hpAdmissions))throw Error('HP Production/projection equality failed');
console.log(JSON.stringify({mode,admitted:[...report.admitted,...staticReport.admitted].map(a=>({id:a.id,totalHealth:a.value,kind:a.kind})),production:next.filter(u=>u.gameVersion!=='sample').length,
  hpMissing:next.filter(u=>u.gameVersion!=='sample'&&!Object.hasOwn(u.entities,'totalHealth')).length}));
