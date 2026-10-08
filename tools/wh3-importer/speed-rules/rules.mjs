import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {reviewUnitEntities} from '../unit-entities/review.mjs';
import {inspectSpeedTrace} from '../speed-research/research.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';

const folder='tools/wh3-importer/speed-rules/';
const read=p=>JSON.parse(fs.readFileSync(p));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export function verifyInputs(manifest) {
  assert.equal(manifest.format,'empirical-base-card-speed-rules-v1');
  for(const pin of manifest.inputs) assert.equal(digest(read(pin.file)),pin.hash,'Speed source drift: '+pin.file);
}

// Topology/fields only. Identity and display names never select a rule.
export function predictSpeed(t) {
  const hold=reason=>({value:null,rule:null,role:null,reasons:[reason]});
  if(t.missing.length) return hold('MISSING_EXACT_SOURCE:'+t.missing.join(','));
  if(t.extraSources.length) return hold('ADDITIONAL_SPEED_SOURCE');
  if(t.flags.sync_locomotion!==false||t.flags.mounted_draughts!==false) return hold('UNVALIDATED_SYNC_OR_DRAUGHT');
  if(Object.values(t.roles).some(r=>![r.fly_speed,r.flying_charge_speed].every(v=>v===0))) return hold('UNVALIDATED_FLIGHT_DISPLAY');
  const keys=Object.keys(t.roles).sort().join(',');
  let rule,role;
  if(t.profile==='MAN_ONLY'&&keys==='man') { rule='GROUND_MAN_RUN';role='man'; }
  else if(t.profile==='MOUNTED'&&keys==='man,mount') { rule='GROUND_MOUNT_RUN';role='mount'; }
  else if(t.profile==='ENGINE'&&keys==='engine,man'&&t.classification.category==='artillery'&&
    t.flags.engine_type==='Generic_3_Crew'&&t.roles.engine.locomotion_constants==='wheeled_entity') {
    rule='GROUND_ARTILLERY_ENGINE_RUN';role='engine';
  } else return hold(t.profile==='ARTICULATED'?'ARTICULATION_PRECEDENCE_UNVALIDATED':'UNVALIDATED_ENGINE_STRUCTURE');
  const raw=t.roles[role].run_speed;
  // No rounding policy inferred: accept exact integer conversions only.
  const value=raw*10;
  if(!Number.isFinite(raw)||raw<0||!Number.isSafeInteger(value)||value<0) return hold('NONINTEGER_OR_INVALID_DISPLAY_CONVERSION');
  return {value,rule,role,reasons:[]};
}

const compare=(expected,actual)=>({expected,actual,delta:actual===null?null:actual-expected,matches:actual===expected});
function candidates(t,expected) {
  const p=predictSpeed(t),r=t.roles[p.role],raw=r?.run_speed??null;
  const values=Object.values(t.roles).map(r=>r.run_speed);
  const candidate={SELECTED_RUN:raw,SELECTED_RUN_X10:raw===null?null:raw*10,
    MAN_RUN_X10:t.roles.man?t.roles.man.run_speed*10:null,
    SELECTED_WALK_X10:r?r.walk_speed*10:null,SELECTED_CHARGE_X10:r?r.charge_speed*10:null,
    SELECTED_FLY_X10:r?r.fly_speed*10:null,
    MIN_RUN_X10:values.length?Math.min(...values)*10:null,MAX_RUN_X10:values.length?Math.max(...values)*10:null,
    ROUND_RUN_X10:raw===null?null:Math.round(raw*10),FLOOR_RUN_X10:raw===null?null:Math.floor(raw*10),
    CEIL_RUN_X10:raw===null?null:Math.ceil(raw*10)};
  return Object.fromEntries(Object.entries(candidate).map(([k,v])=>[k,compare(expected,Number.isFinite(v)?v:null)]));
}

function exactSupplement(e,identity) {
  const root=e.rows.filter(r=>r.table==='main_units_tables'&&r.row.unit===identity.mainKey);
  if(!root.length) return null;
  assert.equal(root.length,1);
  // Restrict to forward joins from this exact main root. Shared crew entities
  // must not make another unit's engine appear to be this unit's component.
  const ids=new Set([root[0].id]);
  for(let changed=true;changed;) { changed=false;
    for(const edge of e.relationships) if(ids.has(edge.from)&&!ids.has(edge.to)) { ids.add(edge.to);changed=true; }
  }
  return {unit:{caKey:identity.mainKey},rootRow:root[0].id,provenance:e.provenance,
    rows:e.rows.filter(r=>ids.has(r.id)),schemas:e.schemas,
    relationships:e.relationships.filter(r=>ids.has(r.from)&&ids.has(r.to)).map(r=>({...r,direction:'forward'}))};
}

export function buildSpeedRules(manifest=read(folder+'manifest.json')) {
  verifyInputs(manifest);
  const truth=read(folder+'ground-truth.json'),legacy=read('src/data/unitSpeedAdmissions.json');
  const artillery=read(folder+'artillery.source.json'),articulation=read('tools/wh3-importer/hp-research/articulation.source.json');
  assert.equal(digest(snapshotIdentity(artillery.provenance)),manifest.snapshotId);
  assert.equal(artillery.provenance.gameVersion,manifest.gameVersion);
  const catalog=[],sourceRows={},joinPaths={},rowIds=new Map(),pathIds=new Map();
  const intern=f=>{if(!f)return null;const {joins,field,...source}=f.source;
    const rowHash=digest(source),pathHash=digest(joins);
    if(!rowIds.has(rowHash))rowIds.set(rowHash,'s'+rowIds.size);
    if(!pathIds.has(pathHash))pathIds.set(pathHash,'p'+pathIds.size);
    const sourceId=rowIds.get(rowHash),pathId=pathIds.get(pathHash);sourceRows[sourceId]=source;joinPaths[pathId]=joins;
    return {value:f.value,sourceId,pathId,field};};
  const supplements=[];
  reviewUnitEntities(undefined,undefined,({unit,dump,source,selectors:s,context:c})=>{
    const identity={id:unit.id,name:unit.name,mainKey:s.fact(c.root,'unit').value,landKey:s.fact(c.land,'key').value};
    let trace=inspectSpeedTrace(dump,identity,articulation.evidence.rows.some(r=>r.table==='main_units_tables'&&r.row.unit===identity.mainKey)?articulation:undefined);
    const extra=exactSupplement(artillery,identity);
    let selectors=s,context=c;
    if(extra) {
      const next=inspectSpeedTrace(extra,identity);assert.equal(next.snapshotId,trace.snapshotId);
      // Supplement must agree with every overlapping raw speed/identity field.
      for(const [role,r] of Object.entries(trace.roles)) {
        assert.equal(next.roles[role]?.key,r.key,identity.id);
        for(const [field,f] of Object.entries(r.facts)) if(f) assert.equal(next.roles[role].facts[field]?.value,f.value,identity.id+'.'+role+'.'+field);
      }
      assert.equal(next.refs.engine.value,trace.refs.engine.value);
      supplements.push({id:unit.id,previousMissing:trace.status==='SPEED_UNAVAILABLE',result:'EXACT_SNAPSHOT_AND_OVERLAPPING_FIELDS_MATCH'});
      trace=next;selectors=factSelectors(extra);context=observationContext(extra,selectors);
      source={file:folder+'artillery.source.json',pointer:'/rows',mainRow:extra.rootRow};
    }
    assert.equal(trace.snapshotId,manifest.snapshotId);
    const flags=Object.fromEntries(['sync_locomotion','mounted_draughts','ground_stat_effect_group'].map(f=>[f,selectors.fact(context.land,f)?.value??null]));
    flags.engine_type=selectors.fact(context.engine,'engine_type')?.value??null;
    const roleFields=Object.fromEntries(Object.entries(trace.roles).map(([role,r])=>[role,Object.fromEntries(Object.entries(r.facts).map(([f,v])=>[f,intern(v)]))]));
    const t={...identity,source,profile:trace.profile,snapshotId:trace.snapshotId,
      classification:{caste:s.fact(c.root,'caste')?.value,category:s.fact(c.land,'category')?.value,class:s.fact(c.land,'class')?.value},
      flags,refs:Object.fromEntries(Object.entries(trace.refs).map(([r,f])=>[r,intern(f)])),
      roles:Object.fromEntries(Object.entries(trace.roles).map(([r,v])=>[r,Object.fromEntries(Object.entries(v.facts).map(([f,v])=>[f,v?.value??null]))])),
      roleFields,entityKeys:Object.fromEntries(Object.entries(trace.roles).map(([r,v])=>[r,v.key])),
      extraSources:trace.extraSources.map(s=>s.key),missing:trace.status==='SPEED_UNAVAILABLE'?trace.reasons:[],
      terrainModifiers:trace.modifierEvidence.map(m=>({group:m.affectedGroup?.value,ground:m.groundType?.value,multiplier:m.multiplier?.value})),
      originalSpeed:unit.movement.speed??null};
    t.prediction=predictSpeed(t);t.status=t.prediction.value!==null?'COMPLETE':t.missing.length?'UNKNOWN':'PARTIAL';
    catalog.push(t);
  });
  const byId=new Map(catalog.map(t=>[t.id,t]));
  assert.equal(catalog.length,1110);assert.equal(legacy.admissions.length,81);
  const regression=truth.legacy.map(a=>{
    const t=byId.get(a.id),old=legacy.admissions.find(v=>v.id===a.id);
    assert.equal(t.originalSpeed,a.value);assert.equal(old.value,a.value);assert.equal(old.kind,a.kind);
    assert.equal(t.prediction.value,a.value,'Existing speed regression: '+a.id);
    return {...a,actual:t.prediction.value,delta:t.prediction.value-a.value,
      directCardReference:truth.cases.find(s=>s.id===a.id)?.reference??null,candidates:candidates(t,a.value)};
  });
  const validation=truth.cases.map(a=>{
    const t=byId.get(a.id);assert.equal(t.prediction.value,a.value,'Manual card conflict');assert.equal(t.prediction.role,a.selectedRole);
    return {...a,name:t.name,entityKeys:t.entityKeys,roles:t.roles,candidates:candidates(t,a.value),result:'MATCH'};
  });
  const rules=['GROUND_MAN_RUN','GROUND_MOUNT_RUN','GROUND_ARTILLERY_ENGINE_RUN'].map(id=>{
    const ts=catalog.filter(t=>t.prediction.rule===id);
    return {id,formula:'selected battle_entities.run_speed * 10',rounding:'NONE; noninteger result held',
      manualAnchors:validation.filter(v=>byId.get(v.id).prediction.rule===id).map(v=>({id:v.id,phase:v.phase,reference:v.reference})),
      stored:ts.length,previous:ts.filter(t=>t.originalSpeed!==null).length,promoted:ts.filter(t=>t.originalSpeed===null).length};
  });
  const summary={production:catalog.length,before:81,after:catalog.filter(t=>t.prediction.value!==null).length,
    unknownBefore:1029,unknownAfter:catalog.filter(t=>t.prediction.value===null).length,
    promoted:catalog.filter(t=>t.originalSpeed===null&&t.prediction.value!==null).length,
    COMPLETE:catalog.filter(t=>t.status==='COMPLETE').length,PARTIAL:catalog.filter(t=>t.status==='PARTIAL').length,UNKNOWN:catalog.filter(t=>t.status==='UNKNOWN').length,
    regressionMatches:regression.filter(r=>r.delta===0).length,directManualSamples:validation.length,independentMountedHoldouts:validation.filter(v=>v.phase==='INDEPENDENT_MOUNTED_HOLDOUT').length};
  const categoryMap=new Map();for(const t of catalog){const k=t.classification.category;const row=categoryMap.get(k)??{category:k,COMPLETE:0,PARTIAL:0,UNKNOWN:0,promoted:0};row[t.status]++;if(t.originalSpeed===null&&t.prediction.value!==null)row.promoted++;categoryMap.set(k,row);}
  const reasonCounts={};for(const t of catalog.filter(t=>t.prediction.value===null)) for(const reason of t.prediction.reasons)reasonCounts[reason]=(reasonCounts[reason]??0)+1;
  const candidateSummary=Object.keys(validation[0].candidates).map(candidate=>({candidate,manualMatches:validation.filter(t=>t.candidates[candidate].matches).length,manualTotal:validation.length,legacyMatches:regression.filter(t=>t.candidates[candidate].matches).length,legacyTotal:regression.length}));
  const samples=['wh_main_emp_inf_swordsmen','wh_dlc06_chs_inf_aspiring_champions_0','wh_dlc01_chs_mon_dragon_ogre','wh_main_brt_cav_mounted_yeomen_0',
    'wh2_main_lzd_cav_cold_ones_1','wh_main_emp_cav_demigryph_knights_0','wh_main_grn_mon_giant','wh2_dlc13_lzd_mon_dread_saurian_1','wh_main_emp_veh_steam_tank','wh_main_brt_art_field_trebuchet',
    'wh_main_emp_art_great_cannon','wh_main_dwf_art_flame_cannon','wh_main_vmp_veh_black_coach','wh2_dlc09_tmb_veh_skeleton_chariot_0',
    'wh_main_brt_cav_pegasus_knights','wh2_dlc12_skv_veh_doom_flayer_0','wh3_main_nur_inf_nurglings_0'].map(k=>{
      const t=byId.get('ca_unit_'+k);assert(t,'Representative missing: '+k);return {id:t.id,name:t.name,profile:t.profile,classification:t.classification,roles:t.roles,prediction:t.prediction,status:t.status,
        independentCardReference:validation.find(v=>v.id===t.id)?.reference??null};
    });
  const characterNames=new Map([...read('src/data/lords.json'),...read('src/data/heroes.json')].map(c=>[c.id,c.name]));
  const characters=read('tools/wh3-importer/unit-entities/rules-report.json').characters.map(c=>({id:c.id,name:characterNames.get(c.id)??null,status:'OUTSIDE_UNIT_SPEED_SLICE',reason:'Character schema/canonical mount context is separate; no character value modified'}));
  const report={format:'empirical-base-card-speed-report-v1',baselineCommit:manifest.baselineCommit,gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,
    inputs:manifest.inputs,summary,rules,validation,regression,candidateSummary,categories:[...categoryMap.values()],reasonCounts,samples,characters,
    supplements,confidenceLimit:'6 manual cards (version/date/modifiers not recorded); 81 prior derived values are regression evidence, not 81 independent measurements. Mounted holdouts are independent of the three-case fitting set, but historical inputs, not new observations.',
    sourceRows,joinPaths,catalog};
  const sourceHash=digest(report);
  const projection={format:'unit-base-card-speed-rule-admissions-v1',gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,sourceHash,reportReference:folder+'report.json',
    admissions:catalog.filter(t=>t.prediction.value!==null).map(t=>({id:t.id,mainKey:t.mainKey,landKey:t.landKey,originalSpeed:t.originalSpeed,value:t.prediction.value,
      kind:t.originalSpeed!==null?'PRESERVED_STATIC_SPEED':'EMPIRICAL_STRUCTURE_SPEED',rule:t.prediction.rule,selectedRole:t.prediction.role,
      entityKey:t.entityKeys[t.prediction.role],rawRunSpeed:t.roles[t.prediction.role].run_speed,rounding:'NONE',
      directCardReference:validation.find(v=>v.id===t.id)?.reference??null}))};
  // Missing optional source metadata must replay identically after JSON storage.
  return {report:JSON.parse(serialize(report)),projection};
}
