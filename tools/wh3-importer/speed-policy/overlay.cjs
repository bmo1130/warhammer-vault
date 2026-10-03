const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {join}=require('node:path');
const hash=b=>createHash('sha256').update(b).digest('hex');
const serialize=v=>JSON.stringify(v,null,2)+'\n';
const manifestBytes=readFileSync(join(__dirname,'manifest.json'));
const manifestSha256='78b6c84540fe31414a75717ad982bdbabfed3bf660a2ebe338bc0f91857cb92c';
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
  if(review.admissions.length!==81)fail('explicit scope changed');
  for(const a of review.admissions) {
    const u=next.find(u=>u.id===a.id);if(!u)continue;
    if(hash(serialize(u))!==a.baseUnitSha256)fail('non-Speed Production drift: '+u.id);
    u.movement.speed=a.value;
  }
  return next;
}
// Historical mounted research pins the 74-admission checkout. Reconstruct only
// that exact snapshot, rejecting anything outside the approved seven additions.
function mountedResearchInputBytes(file) {
  let value;
  if(file==='src/data/units.json') {
    value=JSON.parse(readFileSync(file));
    for(const a of manifest.subjects.slice(74)) {
      const u=value.find(u=>u.id===a.id);if(!u)fail('mounted research identity missing');
      if(Object.hasOwn(u.movement,'speed')) {
        if(u.movement.speed!==a.expectedSpeed)fail('mounted research Speed conflict');
        delete u.movement.speed;
      }
    }
  } else if(file==='src/data/unitSpeedAdmissions.json') {
    const bytes=readFileSync(file);if(hash(bytes)!==reviewSha256)fail('admission sidecar hash changed');
    value=JSON.parse(bytes);value.admissions=value.admissions.slice(0,74);
    value.manifestSha256=manifest.mountedFollowup.baselineManifestSha256;
    delete value.mountedCandidateReportReference;delete value.mountedCandidateReportSha256;
  } else if(file==='tools/wh3-importer/speed-policy/manifest.json') {
    value=structuredClone(manifest);value.subjects=value.subjects.slice(0,74);
    value.format='explicit-reviewed-74-static-speed-v1';delete value.mountedFollowup;
  } else return readFileSync(file);
  const bytes=serialize(value),pin=file.endsWith('/units.json')?'baselineUnitsSha256':
    file.endsWith('/unitSpeedAdmissions.json')?'baselineAdmissionsSha256':'baselineManifestSha256';
  if(hash(bytes)!==manifest.mountedFollowup[pin])fail('historical mounted research snapshot differs: '+file);
  return bytes;
}
const reviewSha256='2c397f2677e78c92bf9fc91c6c82c1dc43c19798e5c43335872b954f29a1e8dd';
module.exports={withoutSpeed,applyProductionSpeed,mountedResearchInputBytes,serialize,hash,reviewSha256,manifestSha256};
