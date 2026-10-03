const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {join}=require('node:path');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const serialize=value=>JSON.stringify(value,null,2)+'\n';
const reportBytes=readFileSync(join(__dirname,'review.json'));
const reviewSha256='4b094f4fb9ee1898674c68b686eafec22c15545808aa128283d5c62942b8f833';
if(hash(reportBytes)!==reviewSha256)throw Error('ULTRA HP review hash changed; explicit review required.');
const report=JSON.parse(reportBytes);
const staticReviewSha256='2a717a9d31c2c1fc2e62fa75bc8d5574a7289cb708efa8dcd415a8d14e361a55';
const staticBytes=readFileSync(join(__dirname,'static-review.json'));
if(hash(staticBytes)!==staticReviewSha256)throw Error('Static HP review hash changed; explicit review required.');
const staticReport=JSON.parse(staticBytes);
const staticIds=['ca_unit_wh_main_emp_inf_spearmen_1','ca_unit_wh_dlc07_brt_inf_battle_pilgrims_0','ca_unit_wh_dlc07_brt_art_blessed_field_trebuchet_0'];
if(staticReport.admitted.length!==3||staticReport.admitted.some((a,i)=>a.id!==staticIds[i]||a.kind!=='STATIC_DERIVED_HP'||a.unitSize!=='ULTRA'))throw Error('Static HP explicit scope changed');
const admissions=[...report.admitted,...staticReport.admitted];
if(new Set(admissions.map(a=>a.id)).size!==admissions.length)throw Error('Conflicting HP admission identity');
// This narrow overlay lets historical static admissions keep their original
// exact values/hashes. It never strips arbitrary HP or accepts changed base data.
function staticProductionView(units) {
  if(new Set(units.map(u=>u.id)).size!==units.length)throw Error('ULTRA HP duplicate Production identity');
  const next=structuredClone(units);
  for(const admission of admissions) {
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
  for(const admission of admissions) {
    const unit=next.find(u=>u.id===admission.id);if(unit)unit.entities.totalHealth=admission.value;
  }
  return next;
}
module.exports={staticProductionView,applyProductionHP,serialize,hash,reviewSha256,staticReviewSha256};
