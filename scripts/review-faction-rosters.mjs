import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {discoverRoster,reviewRosterUnits,checkCoverage,categories,rosterSourceHash} from '../tools/wh3-importer/production-growth/roster.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--check','--write','--preview'].includes(mode));
const baseline='0205595380d4dcb95a9df83a2e3b405b518160c9';
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
const units=[...baselineUnits,...reviewed.map(r=>r.unit)],lords=[],heroes=[];
for(const r of rosters)for(const category of categories.filter(c=>c!=='units'))for(const e of r[category]){
 const general=category.endsWith('Lords');const record={id:e.id,name:e.name,factionId:e.factionId,characterKind:e.characterKind,subtypeKey:e.subtypeKey,subtypeAliases:[],mainKey:e.mainKey,landKey:e.landKey,gameVersion:source.provenance.gameVersion,source:`CA agent subtype ${e.subtypeKey} / exact faction permission / faction-rosters/source.json`,tags:[]};
 if(general)lords.push({...record,title:category==='legendaryLords'?'전설 군주':'일반 군주',summary:'검토된 캐릭터 identity입니다. 스킬·효과·mount와 세부 스탯은 미입력입니다.',unitIds:[]});
 else {const shared=heroes.find(h=>h.id===record.id);if(shared){assert.equal(shared.subtypeKey,record.subtypeKey);shared.factionIds.push(e.factionId);}else heroes.push({...record,factionIds:[e.factionId],category:category==='legendaryHeroes'?'전설 영웅':'일반 영웅'});}
}
assert.equal(new Set(units.map(u=>u.id)).size,units.length,'Duplicate Unit');
assert.deepEqual(validate(units,factions.map(f=>f.id)),[],'Invalid roster Unit collection');
assert.deepEqual(units.slice(0,baselineUnits.length),baselineUnits,'Baseline Unit facts changed');
const report=checkCoverage(rosters,units,lords,heroes);for(const r of report)r.holds=holds.filter(h=>rosters.find(s=>s.factionId===r.factionId).units.some(u=>u.id===h.id));
const inventory={gameVersion:source.provenance.gameVersion,rosters:rosters.map(r=>({factionId:r.factionId,holds:r.holds,explicitlyExcludedCount:r.explicitlyExcluded.length,...Object.fromEntries(categories.map(c=>[c,r[c].map(e=>({id:e.id,...(e.characterKind?{characterKind:e.characterKind,subtypeKey:e.subtypeKey}:{})}))]))})),coverage:report};
console.log(JSON.stringify(report,null,2));console.log('new units',reviewed.length,'holds',JSON.stringify(holds),'lords',lords.length,'heroes',heroes.length);
if(mode==='--preview')process.exit(0);
const writes={'src/data/units.json':units,'src/data/factions.json':factions,'src/data/lords.json':lords,'src/data/heroes.json':heroes,'src/data/factionRosters.json':inventory,'tools/wh3-importer/faction-rosters/admission.json':{baseline,sourceHash:rosterSourceHash,rosters,admitted:reviewed.map(r=>({id:r.id,fields:r.fields.map(p=>p.field),omitted:r.omitted.map(o=>o.field)})),holds}};
for(const [path,value] of Object.entries(writes)){if(mode==='--write')fs.writeFileSync(path,serialize(value));else assert.deepEqual(read(path),value,`Roster projection drift: ${path}`);}
console.log('Roster admission/projection',mode,'PASS');
