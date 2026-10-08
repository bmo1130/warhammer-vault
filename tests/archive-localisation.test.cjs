const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {archiveLocalisation,localiseArchiveName}=require('../.test-build/src/repositories/archiveLocalisation.js');
const {resolveSavedTargetName}=require('../.test-build/src/repositories/archivePresentation.js');
const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const read=p=>JSON.parse(readFileSync(p));
const data=Object.fromEntries(['factions','lords','heroes','legacyCharacters','characterAliases'].map(p=>[p,read(`src/data/${p}.json`)]));
const source=read('tools/wh3-importer/unit-localisation/archive-source.json');
const admission=read('tools/wh3-importer/unit-localisation/archive-admission.json');
const projection=read('src/data/archiveLocalisations.json');
const render=path=>renderToString(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(App)));
const current=(type,id)=>type==='faction'?game.getFaction(id):type.includes('lord')?game.getLord(id):game.getHero(id);
const escaped=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));

test('all 521 stable identities have exact Korean displays, no held names, and retained English searches',()=>{
  assert.equal(projection.admissions.length,521);assert.deepEqual(projection.holds,[]);
  assert.deepEqual(Object.fromEntries(Object.entries(admission.summary).map(([k,v])=>[k,[v.before,v.after,v.unknown]])),{
    faction:[1,24,0],legendary_lord:[0,112,0],generic_lord:[0,157,0],special_lord:[0,15,0],
    legendary_hero:[0,35,0],generic_hero:[0,156,0],special_hero:[0,19,0],legacy_lord:[0,2,0],legacy_hero:[0,1,0]});
  for(const a of projection.admissions){
    const item=current(a.type,a.id);assert.equal(item.id,a.id);assert.equal(item.name,a.name);assert(/[가-힣]/.test(item.name));
    assert.equal(archiveLocalisation(item,a.type).sourcePack,'local_kr.pack');
    if(!a.type.startsWith('legacy_'))for(const q of [a.englishName,a.originalName,a.name,a.id])assert(game.search(q).some(r=>r.id===a.id),`${a.id}: ${q}`);
    assert.throws(()=>localiseArchiveName({...item,name:'Altered source'},a.type),/identity drift/);
  }
  assert.equal(admission.exactLocs,577);assert.equal(source.nameRows.length,101);assert.deepEqual(source.missingKeys,[]);
  const unitKeys=new Set(read('tools/wh3-importer/unit-localisation/source.json').rows.map(r=>r.row.key));
  assert.equal(source.rows.filter(r=>unitKeys.has(r.row.key)).length,0);
});

test('exact reference recipes replay offline; altered raw text, type, references or baseline fail closed',async()=>{
  const {reviewArchiveLocalisation}=await import('../tools/wh3-importer/unit-localisation/archive.mjs');
  const {decodeSource}=await import('../tools/wh3-importer/expansion-batch-01/compact.mjs');
  const {rosterSourceHash}=await import('../tools/wh3-importer/production-growth/roster.mjs');
  const roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
  assert.deepEqual(reviewArchiveLocalisation(source,roster,data),admission);
  for(const mutate of [s=>s.rows[0].row.text='임의 번역',s=>s.nameRows[0].row.id='1',s=>s.requests[0].id='merged',s=>s.koreanPack.sha256='wrong',s=>s.localisationConventions[0].localised_fields=[]]){
    const wrong=structuredClone(source);mutate(wrong);assert.throws(()=>reviewArchiveLocalisation(wrong,roster,data),/source hash drift/);
  }
  assert.throws(()=>reviewArchiveLocalisation(source,roster,{...data,lords:data.lords.slice(1)}),/baseline drift/);
  assert.equal(source.optionalMissingKeys.length,12);
  for(const key of source.optionalMissingKeys){
    assert(!source.rows.some(r=>r.row.key===key));
    const en=roster.preflight.rows.filter(r=>r.table==='Loc'&&r.row.key===key);assert.equal(en.length,1);assert.equal(en[0].row.text,'');
    const refs=source.requests.flatMap(r=>r.nameReferences??[]).filter(r=>r.localisationKey===key);assert(refs.length);assert(refs.every(r=>r.emptyEnglish));
  }
  for(const r of source.requests)for(const ref of r.nameReferences??[]){
    const target=source.nameRows.find(n=>n.row.id===Number(ref.nameId));assert(target);assert.equal(String(target.row.id),ref.nameId);
    const u=roster.preflight.rows.find(row=>row.id===ref.uniqueRowId);assert.equal(u.row[ref.field],ref.nameId);
  }
  const notice=admission.admissions.find(a=>a.englishName==='Alkhazzar II');assert.equal(notice.name,'알카자르 2세');assert.equal(notice.recipe.mode,'NAMED_NOTICE');
  assert(admission.admissions.some(a=>a.recipe.mode==='NAME_PARTS'));assert(admission.admissions.some(a=>a.recipe.keys[0].startsWith('agent_subtypes_onscreen_name_override_')));
});

test('all detail/list surfaces render Korean primary names and faction labels without merging same-name records',()=>{
  for(const a of projection.admissions){
    const type=a.type==='faction'?'faction':a.type.includes('lord')?'lord':'hero';
    const item=current(a.type,a.id),html=render(`/${type==='faction'?'factions':type==='lord'?'lords':'heroes'}/${a.id}`);
    assert(html.includes(`<h1>${escaped(a.name)}</h1>`),a.id);assert(html.includes('local_kr.pack'),a.id);
    if(type!=='faction')assert(html.includes(escaped(game.getFaction(item.factionId).name)),a.id);
    else for(const c of [...game.getFactionLords(a.id),...game.getFactionHeroes(a.id)])assert(html.includes(escaped(c.name)),c.id);
  }
  const list=render('/factions');for(const f of game.listFactions())assert(list.includes(f.name));
  const home=render('/');assert(home.includes(game.getFaction('vampire_counts').name));
  const unit=game.listUnits().find(u=>u.gameVersion!=='sample');assert(render('/units/'+unit.id).includes(game.getFaction(unit.factionId).name));
  for(const file of ['caSkillEffect','caSkillBatch01','caSkillBatch02']){
    const skill=read(`src/data/${file}.json`),owner=game.getLordBySubtype(skill.owner.key);assert(owner,skill.owner.key);
    const html=render('/calculator?unit='+skill.targets[0].unitId);assert(html.includes(escaped(owner.name)),skill.owner.key);
    assert(!html.includes('군주: '+escaped(skill.owner.name)));
  }
  const duplicate=projection.admissions.find(a=>projection.admissions.some(b=>b.type===a.type&&b.name===a.name&&b.id!==a.id));assert(duplicate);
  const ids=projection.admissions.filter(a=>a.type===duplicate.type&&a.name===duplicate.name).map(a=>current(a.type,a.id).id);
  assert.equal(new Set(ids).size,ids.length);
});

test('canonical aliases, legacy URLs and saved personal records retain original stable IDs',async()=>{
  assert.equal(data.characterAliases.length,15);
  for(const a of data.characterAliases){
    assert.strictEqual(current(a.entityType,a.id),current(a.entityType,a.canonicalId));
    assert.equal(game.getEntityName(a.entityType,a.id),current(a.entityType,a.canonicalId).name);
    assert(game.search(a.subtypeKey).some(r=>r.id===a.canonicalId));
  }
  global.indexedDB=memoryIndexedDb();
  const targets=[{entityType:'faction',entityId:data.factions[0].id},{entityType:'lord',entityId:data.lords[0].id},
    {entityType:'hero',entityId:data.heroes[0].id},...data.characterAliases.slice(0,1).map(a=>({entityType:a.entityType,entityId:a.id})),
    ...data.legacyCharacters.map(c=>({entityType:c.entityType,entityId:c.id}))];
  for(const target of targets){await wiki.saveArticle(target,{evaluation:'기존 개인 문서',tactics:'전술',strengths:'',weaknesses:''});await wiki.setBookmark(target,true);await wiki.recordView(target);}
  const backup=await wiki.exportBackup();global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(backup));
  for(const target of targets){assert.equal((await wiki.getArticle(target)).evaluation,'기존 개인 문서');assert(await wiki.hasBookmark(target));assert((await wiki.listRecent()).some(t=>t.entityId===target.entityId));assert.equal(resolveSavedTargetName(target),game.getEntityName(target.entityType,target.entityId));}
});

test('prior Production data, admissions, rosters and identity files remain byte-identical to latest entity13 commit',()=>{
  for(const path of ['units','factions','lords','heroes','legacyCharacters','characterAliases','factionRosters','unitLocalisations','unitAttributeAdmissions','unitPassiveAdmissions','unitEntityAdmissions','unitHpAdmissions','unitSpeedAdmissions','unitSharedIdentities','unitDiagnostics'].map(p=>`src/data/${p}.json`)){
    const old=spawnSync('git',['show',`ba02dee:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
    assert.equal(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
  }
  const units=game.listUnits().filter(u=>u.gameVersion!=='sample');assert.equal(units.length,1110);
  for(const [predicate,count]of [[u=>/[가-힣]/.test(u.name),1110],[u=>u.attributes!==undefined,1107],[u=>u.passiveAbilities!==undefined,1105],[u=>u.entities.count!==undefined,1071],[u=>u.entities.totalHealth!==undefined,986]])assert.equal(units.filter(predicate).length,count);
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});
