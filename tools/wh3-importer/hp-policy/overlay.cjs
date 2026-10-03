const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {join}=require('node:path');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const serialize=value=>JSON.stringify(value,null,2)+'\n';
const reportBytes=readFileSync(join(__dirname,'review.json'));
const reviewSha256='4b094f4fb9ee1898674c68b686eafec22c15545808aa128283d5c62942b8f833';
if(hash(reportBytes)!==reviewSha256)throw Error('ULTRA HP review hash changed; explicit review required.');
const report=JSON.parse(reportBytes);
// This narrow overlay lets historical static admissions keep their original
// exact values/hashes. It never strips arbitrary HP or accepts changed base data.
function staticProductionView(units) {
  if(new Set(units.map(u=>u.id)).size!==units.length)throw Error('ULTRA HP duplicate Production identity');
  const next=structuredClone(units);
  for(const admission of report.admitted) {
    const unit=next.find(u=>u.id===admission.id);if(!unit)continue;
    if(Object.hasOwn(unit.entities,'totalHealth')) {
      if(unit.entities.totalHealth!==admission.value)throw Error('ULTRA HP differs from explicit admission: '+unit.id);
      delete unit.entities.totalHealth;
    }
    if(hash(serialize(unit))!==admission.baseUnitSha256)throw Error('ULTRA HP static Unit identity/value drift: '+unit.id);
  }
  return next;
}
function applyProductionHP(units) {
  const next=staticProductionView(units);
  for(const admission of report.admitted) {
    const unit=next.find(u=>u.id===admission.id);if(unit)unit.entities.totalHealth=admission.value;
  }
  return next;
}
module.exports={staticProductionView,applyProductionHP,serialize,hash,reviewSha256};
