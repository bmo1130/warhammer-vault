// Compose only the two explicit field admissions around historical replay.
// HP policy/evidence and historical static admission hashes stay unchanged.
const hp=require('./hp-policy/overlay.cjs');
const speed=require('./speed-policy/overlay.cjs');
module.exports={...hp,
  staticProductionView:units=>hp.staticProductionView(speed.withoutSpeed(units)),
  applyProductionHP:units=>speed.applyProductionSpeed(hp.applyProductionHP(speed.withoutSpeed(units))),
};
