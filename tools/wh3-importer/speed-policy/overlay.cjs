const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {join}=require('node:path');
const hash=b=>createHash('sha256').update(b).digest('hex');
const serialize=v=>JSON.stringify(v,null,2)+'\n';
const manifestBytes=readFileSync(join(__dirname,'manifest.json'));
const manifestSha256='9da8c7dcf52a4d3a0ba1cac38f82ff444daced20892111f5a45b37bcd9b620f0';
if(hash(manifestBytes)!==manifestSha256)throw Error('Static Speed manifest hash changed; explicit review required.');
const manifest=JSON.parse(manifestBytes);
const fail=message=>{throw Error('Static Speed overlay refused: '+message);};
function withoutSpeed(units) {
  if(new Set(units.map(u=>u.id)).size!==units.length)fail('duplicate identity');
  const next=structuredClone(units);
  for(const u of next) {
    if(!Object.hasOwn(u.movement,'speed'))continue;
    const a=manifest.subjects.find(a=>a.id===u.id);
    if(!a||!a.approved||u.movement.speed!==a.expectedSpeed)fail('unapproved/conflicting Speed: '+u.id);
    delete u.movement.speed;
  }
  return next;
}
function applyProductionSpeed(units) {
  const bytes=readFileSync(join(__dirname,'../../../src/data/unitSpeedAdmissions.json'));
  if(hash(bytes)!==reviewSha256)fail('admission sidecar hash changed');
  const review=JSON.parse(bytes),next=withoutSpeed(units);
  if(review.admissions.length!==74)fail('explicit scope changed');
  for(const a of review.admissions) {
    const u=next.find(u=>u.id===a.id);if(!u)continue;
    if(hash(serialize(u))!==a.baseUnitSha256)fail('non-Speed Production drift: '+u.id);
    u.movement.speed=a.value;
  }
  return next;
}
const reviewSha256='cf21af9b51d2572eb10f18d128bff8248d89fab0914c77f0582554ff018ee63d';
module.exports={withoutSpeed,applyProductionSpeed,serialize,hash,reviewSha256,manifestSha256};
