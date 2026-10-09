const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {unitMissileAdmission,withoutUnitMissiles}=require('../.test-build/src/repositories/unitMissiles.js');
const Details=require('../.test-build/src/components/UnitMissileDetails.js').default;
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/missile-damage/';
const report=read(folder+'report.json'),projection=read('src/data/unitMissileDamageAdmissions.json');
let context;
async function setup(){
 if(context)return context;
 const {loadSource,decodeSource}=await import('../tools/wh3-importer/missile-rules/source.mjs');
 const {missileGraph,inspectMissileUnit}=await import('../tools/wh3-importer/missile-rules/predict.mjs');
 const {predictDamage}=await import('../tools/wh3-importer/missile-damage/predict.mjs');
 const source=loadSource(),graph=missileGraph(source),selection=decodeSource(read(folder+'selection.source.json'));
 return context={source,selection,predictDamage,inspect:key=>inspectMissileUnit(graph,source.seeds.find(s=>s.mainKey===key))};
}

test('second slice persists 351 new direct fields across 184 units; preserves every first-slice value and only changes damage',()=>{
 assert.equal(report.summary.newlyPromotedUnits,184);assert.equal(report.summary.newDamageFields,351);
 assert.equal(projection.admissions.length,222);
 const first=read('src/data/unitMissileAdmissions.json');
 for(const old of first.admissions){
  const current=unitMissileAdmission(game.getUnit(old.id));assert(current);
  for(const [k,v] of Object.entries(old.values))assert.equal(current.values[k],v,old.id+'.'+k);
  assert.equal(current.values.range,old.values.range);assert.equal(current.values.baseTime,old.values.baseTime);
  if(old.status==='N/A'){assert.equal(current.status,'N/A');assert.equal(game.getUnit(old.id).missile,undefined);assert.deepEqual(current.profiles,[]);}
 }
 for(const t of report.catalog)for(const k of t.newFields)assert.equal(game.getUnit(t.id).missile.projectile[k],t.values[k]);
 assert.equal(report.regression.reduce((n,r)=>n+r.fieldsChecked,0),68);
});

test('explosion, launch count, volley, burst and scaling/vortex leave per-projectile direct damage unchanged',async()=>{
 const {inspect,selection,predictDamage}=await setup();
 const t=inspect('wh_main_emp_inf_handgunners');t.paths=t.paths.filter(p=>p.role==='LAND_PRIMARY');
 const expected={baseDamage:5,armorPiercingDamage:17};
 for(const [field,value] of [['projectile_number',9],['shots_per_volley',18],['burst_size',4],['explosion_type','blast'],['scaling_damage','scaling'],['spawned_vortex','vortex']]){
  const changed=structuredClone(t);changed.paths[0].projectiles[0].facts[field].value=value;
  assert.deepEqual(predictDamage(changed,{values:{}},selection).values,expected);
 }
 const hel=unitMissileAdmission(game.getUnit('ca_unit_wh_main_emp_art_helstorm_rocket_battery'));
 assert.equal(hel.values.baseDamage,30);assert.equal(hel.values.armorPiercingDamage,70);
 assert(hel.profiles[0].explosion);assert.notEqual(hel.values.baseDamage,30+hel.profiles[0].explosion.baseDamage);
 assert.equal(game.getUnit(hel.id).missile.explosion,undefined);
});

test('modifier-free enable replacement is separated; unresolved activation is retained and field invariants remain independent',async()=>{
 const {inspect,selection,predictDamage}=await setup(),t=inspect('wh_dlc04_emp_inf_free_company_militia_0');
 const p=predictDamage(t,{values:{range:90,baseTime:9}},selection);
 assert.deepEqual(p.values,{range:90,baseTime:9,baseDamage:12,armorPiercingDamage:2});
 assert(p.profiles.some(p=>p.baseDamage===4&&p.armorPiercingDamage===10&&p.activation==='REQUIRES_ENABLE_EFFECT'));
 const changed=structuredClone(t);changed.paths.find(p=>p.weaponKey.includes('blessed')).condition.effects=[];
 assert.equal(predictDamage(changed,{values:{}},selection).values.baseDamage,undefined);
 assert.equal(predictDamage(changed,{values:{}},selection).review.baseDamage.reason,'UNRESOLVED_JUNCTION_ACTIVATION');
 changed.paths.find(p=>p.weaponKey.includes('blessed')).projectiles[0].facts.damage.value=12;
 const partial=predictDamage(changed,{values:{}},selection);assert.equal(partial.values.baseDamage,12);assert.equal(partial.values.armorPiercingDamage,undefined);
 const bad=structuredClone(t);bad.paths[1].condition.effects[0].raw.bonus_value_id='unknown_operation';
 assert.equal(predictDamage(bad,{values:{}},selection).values.baseDamage,undefined);
});

test('entity-stats override is a replacement target, not an additional attack; incomplete chains block new scalar damage',async()=>{
 const {inspect,selection,predictDamage}=await setup(),t=inspect('wh_main_emp_inf_handgunners');t.paths=t.paths.filter(p=>p.role==='LAND_PRIMARY');
 const target=structuredClone(t.paths[0]);target.role='JUNCTION_STATS_OVERRIDE';target.projectiles[0].facts.damage.value=999;t.paths.push(target);
 const p=predictDamage(t,{values:{}},selection);assert.equal(p.values.baseDamage,5);assert.equal(p.profiles[1].activation,'REPLACEMENT_TARGET');
 const changed=structuredClone(t);changed.issues.push({reason:'MISSING_OR_AMBIGUOUS_SCHEMA_JOIN'});
 assert.deepEqual(predictDamage(changed,{values:{}},selection).values,{});
 assert.equal(predictDamage(changed,{values:{}},selection).review.baseDamage.reason,'INCOMPLETE_DB_CHAIN');
});

test('verified bolt thrower modes preserve distinct direct damage; missing display cannot justify default selection',async()=>{
 const {inspect,selection,predictDamage}=await setup(),t=inspect('wh2_main_hef_art_eagle_claw_bolt_thrower');
 const p=predictDamage(t,{values:{range:380,baseTime:12}},selection);
 assert.deepEqual(p.values,{range:380,baseTime:12});assert.equal(p.review.baseDamage.reason,'SWITCHABLE_PROFILES_DIFFER');
 assert.deepEqual(p.profiles.map(x=>[x.baseDamage,x.armorPiercingDamage,x.projectileNumber]),[[30,120,1],[3,8,16]]);
 assert(p.profiles.every(p=>p.mode==='VERIFIED_SWITCHABLE_SHOT_TYPE'&&p.displayRowId&&p.shotRowId));
 const missing=structuredClone(selection);missing.rows=missing.rows.filter(r=>r.row.key!=='bolt_thrower_multi_shot');
 assert.equal(predictDamage(t,{values:{}},missing).values.baseDamage,undefined);
 const shown=unitMissileAdmission(game.getUnit('ca_unit_wh2_main_hef_art_eagle_claw_bolt_thrower'));assert.equal(shown.profiles.length,2);
});

test('simultaneous body/rider/engine profiles do not select maximum or primary by key/order',async()=>{
 const {inspect,selection,predictDamage}=await setup(),t=inspect('wh2_dlc11_cst_mon_necrofex_colossus_0');
 const p=predictDamage(t,{values:{}},selection);
 assert.equal(p.values.baseDamage,undefined);assert.equal(p.review.baseDamage.reason,'SIMULTANEOUS_OWNER_PROFILES_DIFFER');
 assert.deepEqual(p.profiles.map(x=>[x.baseDamage,x.armorPiercingDamage]),[[35,145],[8,20]]);
 assert.equal(p.profiles[1].owners.length,5);assert.equal(p.profiles[1].secondaryAmmo,true);
 const reversed=structuredClone(t);reversed.paths.reverse();
 assert.deepEqual(predictDamage(reversed,{values:{}},selection).values,p.values);
 const same=structuredClone(t);same.paths.forEach(p=>p.projectiles.forEach(x=>x.facts.damage.value=35));
 assert.equal(predictDamage(same,{values:{}},selection).values.baseDamage,35);
 assert.equal(predictDamage(same,{values:{}},selection).values.armorPiercingDamage,undefined);
});

test('precursor and hidden UI flags preserve raw damage while labeling UI visibility separately',async()=>{
 const {inspect,selection,predictDamage}=await setup(),t=inspect('wh3_main_kho_mon_soul_grinder_0');
 assert.deepEqual(predictDamage(t,{values:{}},selection).values,{baseDamage:30,armorPiercingDamage:90});
 const hidden=structuredClone(t);hidden.paths[0].flags.hide_secondary_range_ammo_statistics_ui.value=true;
 const p=predictDamage(hidden,{values:{}},selection);assert.equal(p.values.baseDamage,30);assert.equal(p.profiles[0].uiVisibility,'HIDDEN_BY_WEAPON_FLAG');
 assert.equal(p.profiles[0].uiDisplayedDamage,null);assert.equal(p.profiles[0].uiSelectedProfile,null);
 assert.equal(report.summary.perType.HIDDEN_SECONDARY.processed,0);
});

test('zero direct damage is distinct from UNKNOWN and explosion-only profiles are explicitly preserved',async()=>{
 const {inspect,selection,predictDamage}=await setup(),t=inspect('wh_main_emp_inf_handgunners');t.paths=t.paths.filter(p=>p.role==='LAND_PRIMARY');
 for(const invalid of [null,undefined,'0',NaN,Infinity,-1,0.5]){
  const changed=structuredClone(t);changed.paths[0].projectiles[0].facts.damage.value=invalid;
  const p=predictDamage(changed,{values:{}},selection);assert.equal(p.values.baseDamage,undefined);assert.equal(p.values.armorPiercingDamage,17);assert.equal(p.profiles[0].baseDamage,null);
 }
 const zero=structuredClone(t);zero.paths[0].projectiles[0].facts.damage.value=0;zero.paths[0].projectiles[0].facts.ap_damage.value=0;
 const p=predictDamage(zero,{values:{}},selection);assert.deepEqual(p.values,{baseDamage:0,armorPiercingDamage:0});assert.equal(p.profiles[0].damageKind,'ZERO_DIRECT');
 const thunder=unitMissileAdmission(game.getUnit('ca_unit_wh3_dlc25_dwf_veh_thunderbarge'));
 const bomb=thunder.profiles.find(p=>p.damageKind==='EXPLOSION_ONLY');assert(bomb);assert.equal(bomb.baseDamage,0);assert.equal(bomb.armorPiercingDamage,0);assert(bomb.explosion.baseDamage>0||bomb.explosion.armorPiercingDamage>0);
 assert.equal(thunder.values.baseDamage,undefined);assert.equal(thunder.status,'UNKNOWN');
});

test('fresh exact selections and 12 independent traces are never represented as game card readings',async()=>{
 const {selection}=await setup();assert.equal(selection.gameExecuted,false);assert.equal(selection.rows.length,739);
 assert.equal(report.summary.freshRawRows,714);assert.equal(report.rawComparisons.length,12);assert.equal(report.summary.liveGameCardReadings,0);
 for(const t of report.catalog)for(const p of t.profiles){assert.equal(p.uiDisplayedDamage,null);assert.equal(p.uiSelectedProfile,null);assert(p.projectileRowId);}
 for(const c of report.rawComparisons){assert.equal(c.uiReading,null);assert(c.rows.some(r=>r.table==='projectiles_tables'));assert(c.rows.every(r=>r.rowHash.length===64));}
 assert(report.rawComparisons.some(c=>c.outsideScope.length>0));
});

test('all previous src/data and ability dictionary documentation are byte-equivalent to latest baseline',()=>{
 const commit=read(folder+'manifest.json').baselineCommit;
 const paths=spawnSync('git',['ls-tree','-r','--name-only',commit,'--','src/data','tools/wh3-importer/ability-dictionary','docs'],{encoding:'utf8'});assert.equal(paths.status,0);
 for(const path of paths.stdout.trim().split('\n')){
  const old=spawnSync('git',['show',commit+':'+path],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
  assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
 }
 for(const raw of read('src/data/units.json')){
  if(raw.gameVersion==='sample')continue;
  const current=withoutUnitMissiles(game.getUnit(raw.id));assert.deepEqual(current.missile,raw.missile);
 }
});

test('Production UI exposes separate modes and direct/explosive components without claiming measured card damage',()=>{
 const render=id=>{const u=game.getUnit(id),a=unitMissileAdmission(u);return renderToString(React.createElement(Details,{missile:u.missile,status:a.status,profiles:a.profiles})).replace(/<!--.*?-->/g,'');};
 const bolt=render('ca_unit_wh2_main_hef_art_eagle_claw_bolt_thrower');assert(bolt.includes('30 / 120'));assert(bolt.includes('3 / 8'));assert(bolt.includes('추가 발사 모드'));assert(bolt.includes('표시 피해는 미측정'));
 const hel=render('ca_unit_wh_main_emp_art_helstorm_rocket_battery');assert(hel.includes('30 / 70'));assert(hel.includes('폭발 기본 / AP 피해 (별도)'));assert(hel.includes('직격 피해는 발사체 1발'));
 const thunder=render('ca_unit_wh3_dlc25_dwf_veh_thunderbarge');assert(thunder.includes('직격 없음, 폭발 전용'));assert(thunder.includes('0 / 0'));assert(thunder.includes('기본 수치 미확인'));
});

test('damage source pins, report, projection and audit replay deterministically',async()=>{
 const {buildDamageRules}=await import('../tools/wh3-importer/missile-damage/rules.mjs');assert.deepEqual(buildDamageRules(),{report,projection});
 const bad=read(folder+'manifest.json');bad.inputs[0].hash='changed';assert.throws(()=>buildDamageRules(bad),/Damage input drift/);
 const {renderRules,renderAudit}=await import('../tools/wh3-importer/missile-damage/report.mjs');
 assert.equal(fs.readFileSync(folder+'RULES.md','utf8').replace(/\r\n/g,'\n'),renderRules(report));assert.equal(fs.readFileSync(folder+'AUDIT.md','utf8').replace(/\r\n/g,'\n'),renderAudit(report));
});
