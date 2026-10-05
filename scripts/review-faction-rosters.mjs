import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {discoverRoster,reviewRosterUnits,checkCoverage,categories,expectedRosterEntries,rosterSourceHash} from '../tools/wh3-importer/production-growth/roster.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--check','--write','--preview'].includes(mode));
const baseline='68910e320d7759047cecf705b4c6e16b104831f4';
const fromBaseline=path=>{const p=spawnSync('git',['show',`${baseline}:${path}`],{maxBuffer:16*1024*1024});assert.equal(p.status,0);return JSON.parse(p.stdout);};
const read=path=>JSON.parse(fs.readFileSync(path));const serialize=v=>JSON.stringify(v,null,2)+'\n';
const compact=read('tools/wh3-importer/faction-rosters/source.json');
const source=decodeSource(compact,rosterSourceHash);
const rosters=discoverRoster(source),baselineUnits=fromBaseline('src/data/units.json'),oldFactions=fromBaseline('src/data/factions.json');
const factions=structuredClone(oldFactions);
for(const r of rosters){
 const culture=source.preflight.rows.find(row=>row.table==='cultures_tables'&&row.row.key===r.cultureKey);
 const old=oldFactions.find(f=>f.id===r.factionId);
 const name=old?.name??culture.row.audio_state.replaceAll('_',' ');
 const record={id:r.factionId,name,subtitle:name,description:'검토된 CA race roster catalog입니다. Roster 상태는 캐릭터·유닛 entry coverage만 뜻하며 Research·Buildings·Skill 완성을 뜻하지 않습니다.',gameVersion:source.provenance.gameVersion,source:`CA culture ${r.cultureKey} / faction permissions / faction-rosters/ROSTERS.md`,tags:[]};
 const index=factions.findIndex(f=>f.id===r.factionId);if(index<0)factions.push(record);else factions[index]=record;
}
const validate=await loadUnitValidator();
const {reviewed,holds}=reviewRosterUnits(source,rosters,validate,factions.map(f=>f.id));
for(const r of reviewed){const memberships=rosters.filter(s=>s.units.some(u=>u.id===r.id)).map(s=>s.factionId);if(memberships.length>1)r.unit.factionIds=memberships;}
const existingUnitIds=new Set(baselineUnits.map(u=>u.id));
const units=[...baselineUnits,...reviewed.filter(r=>!existingUnitIds.has(r.id)).map(r=>r.unit)],lords=[],heroes=[];
const priorAdmission=fromBaseline('tools/wh3-importer/faction-rosters/admission.json');
for(const old of priorAdmission.rosters){const current=rosters.find(r=>r.factionId===old.factionId);assert(current,'Existing race missing');assert.deepEqual(current.units,old.units,'Existing Unit membership/admission drift');assert.deepEqual(current.explicitlyExcluded.filter(e=>e.kind==='unit'),old.explicitlyExcluded.filter(e=>e.kind==='unit'),'Existing Unit exclusion drift');}
for(const r of rosters)for(const category of categories.filter(c=>c!=='units'))for(const e of r[category]){
 const general=category.endsWith('Lords');const record={id:e.id,name:e.name,factionId:e.factionId,characterKind:e.characterKind,subtypeKey:e.subtypeKey,subtypeAliases:e.subtypeAliases,mainKey:e.mainKey,landKey:e.landKey,gameVersion:source.provenance.gameVersion,source:`CA agent subtype ${e.subtypeKey} / exact faction permission / faction-rosters/source.json`,tags:[]};
 const label=category.startsWith('legendary')?general?'전설 군주':'전설 영웅':category.startsWith('special')?general?'특수 군주':'특수 영웅':general?'일반 군주':'일반 영웅';
 const shared=(general?lords:heroes).find(h=>h.id===record.id);
 if(shared){assert.equal(shared.subtypeKey,record.subtypeKey);assert.equal(shared.characterKind,record.characterKind);shared.factionIds??=[shared.factionId];shared.factionIds.push(e.factionId);}
 else if(general)lords.push({...record,title:label,summary:'검토된 캐릭터 identity입니다. 스킬·효과·mount와 세부 스탯은 미입력입니다.',unitIds:[]});
 else heroes.push({...record,factionIds:[e.factionId],category:label});
}
assert.equal(new Set(units.map(u=>u.id)).size,units.length,'Duplicate Unit');
assert.deepEqual(validate(units,factions.map(f=>f.id)),[],'Invalid roster Unit collection');
assert.deepEqual(units.slice(0,baselineUnits.length),baselineUnits,'Baseline Unit facts changed');
for(const old of priorAdmission.admitted)assert.deepEqual(reviewed.find(r=>r.id===old.id)&&{id:old.id,fields:reviewed.find(r=>r.id===old.id).fields.map(p=>p.field),omitted:reviewed.find(r=>r.id===old.id).omitted.map(o=>o.field)},old,'Previous Unit admission changed');
const report=checkCoverage(rosters,units,lords,heroes);for(const r of report){r.holds=[...rosters.find(s=>s.factionId===r.factionId).holds,...holds.filter(h=>rosters.find(s=>s.factionId===r.factionId).units.some(u=>u.id===h.id))];if(r.holds.length)r.status='HOLD';}
const characterAliases=[...new Map(rosters.flatMap(r=>r.characterAliases).map(a=>[a.id,a])).values()];
const legacyCharacters=[...fromBaseline('src/data/lords.json').map(c=>({...c,entityType:'lord'})),...fromBaseline('src/data/heroes.json').map(c=>({...c,entityType:'hero'}))].filter(c=>![...lords,...heroes].some(e=>e.id===c.id)&&!characterAliases.some(a=>a.id===c.id)).map(c=>{const exclusion=rosters.flatMap(r=>r.explicitlyExcluded).find(e=>e.kind==='character'&&e.key===c.subtypeKey);assert(exclusion,'Unmapped previous character ID');return {...c,exclusionReason:exclusion.reason};});
for(const a of characterAliases){const collection=a.entityType==='lord'?lords:heroes;assert(!collection.some(c=>c.id===a.id));assert(collection.some(c=>c.id===a.canonicalId&&c.subtypeAliases.includes(a.subtypeKey)));}
const inventory={gameVersion:source.provenance.gameVersion,rosters:rosters.map(r=>({factionId:r.factionId,sourceStatus:r.sourceStatus,holds:r.holds,explicitlyExcludedCount:r.explicitlyExcluded.length,...Object.fromEntries(categories.map(c=>[c,expectedRosterEntries(r,c).map(e=>({id:e.id,...(e.characterKind?{characterKind:e.characterKind,subtypeKey:e.subtypeKey,subtypeAliases:e.subtypeAliases}:{})}))]))})),coverage:report};
console.log(JSON.stringify(report,null,2));console.log('new units',reviewed.length,'holds',JSON.stringify(holds),'lords',lords.length,'heroes',heroes.length);
if(mode==='--preview')process.exit(0);
const writes={'src/data/legacyCharacters.json':legacyCharacters,'src/data/characterAliases.json':characterAliases.map(({sourceRowIds,...a})=>a),'src/data/units.json':units,'src/data/factions.json':factions,'src/data/lords.json':lords,'src/data/heroes.json':heroes,'src/data/factionRosters.json':inventory,'tools/wh3-importer/faction-rosters/admission.json':{baseline,sourceHash:rosterSourceHash,rosters,admitted:reviewed.map(r=>({id:r.id,fields:r.fields.map(p=>p.field),omitted:r.omitted.map(o=>o.field)})),holds}};
for(const [path,value] of Object.entries(writes)){if(mode==='--write')fs.writeFileSync(path,serialize(value));else assert.deepEqual(read(path),value,`Roster projection drift: ${path}`);}
console.log('Roster admission/projection',mode,'PASS');
