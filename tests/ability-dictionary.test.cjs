const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter,Routes,Route}=require('react-router-dom');
const {abilityDictionary:dictionary}=require('../.test-build/src/repositories/abilityDictionary.js');
const {abilityPath}=require('../.test-build/src/domain/ability.js');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const Details=require('../.test-build/src/components/AbilityDetails.js').default;
const UnitDetails=require('../.test-build/src/components/UnitProductionDetails.js').default;
const Page=require('../.test-build/src/pages/AbilityPage.js').default;
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/ability-dictionary/';
const args=()=>({attributes:read('tools/wh3-importer/unit-attributes/source.json'),passives:read('tools/wh3-importer/unit-passives/source.json'),actives:read('tools/wh3-importer/unit-actives/source.json'),attributeAdmission:read('tools/wh3-importer/unit-attributes/admission.json'),passiveAdmission:read('tools/wh3-importer/unit-passives/admission.json'),activeProjection:read('src/data/unitActiveAdmissions.json'),supplement:read(folder+'source.json')});
const html=ability=>renderToString(React.createElement(MemoryRouter,null,React.createElement(Details,{ability,documentLink:true}))).replace(/<!--.*?-->/g,'');
const effect=(id,field)=>dictionary.get(id).phases.flatMap(p=>p.effects).find(e=>e.field===field);

test('dictionary is exactly the 446 owned canonical identities, never culture-only candidates or samples',()=>{
 const units=game.listUnits().filter(u=>u.gameVersion!=='sample'),owned=new Set(units.flatMap(u=>[...(u.attributes??[]),...(u.passiveAbilities??[]),...(u.abilities??[]),...(u.boundAbilities??[])]));
 assert.equal(units.length,1110);assert.equal(owned.size,446);assert.deepEqual([...owned].sort(),dictionary.list().map(e=>e.id).sort());
 assert.equal(dictionary.get('wh3_dlc29_unit_abilities_stormfiend_seismic_snare'),undefined);
 assert.equal(new Set(dictionary.list().map(e=>e.id)).size,446);
 assert.deepEqual(dictionary.summary,{total:446,korean:446,englishOnly:0,nameOnly:0,numeric:290,conditions:235,categories:{ATTRIBUTE:{total:50,korean:50,englishOnly:0,nameOnly:0,numeric:0,conditions:0},PASSIVE:{total:252,korean:252,englishOnly:0,nameOnly:0,numeric:219,conditions:174},ACTIVE:{total:93,korean:93,englishOnly:0,nameOnly:0,numeric:40,conditions:44},TOGGLE:{total:10,korean:10,englishOnly:0,nameOnly:0,numeric:10,conditions:0},BOUND:{total:41,korean:41,englishOnly:0,nameOnly:0,numeric:21,conditions:17}}});
});
test('all official descriptions are substantive and safely resolved with exact bilingual provenance',()=>{
 for(const e of dictionary.list()){assert(e.description.text.trim().length>0,e.id);assert.notEqual(e.description.text,e.name);assert.equal(e.description.language,'ko');assert(!/\{\{|\[\[|%[+\-]?[nsdf]/.test(e.description.text),e.id);assert(e.englishDescription);assert(e.description.rowIds.length);assert(e.sourceRowIds.length);assert(e.rawKeys.length);assert.equal(e.verification.activation,'NOT_EVALUATED');}
 const undead=dictionary.get('undead');assert.match(undead.description.text,/패주/);assert(undead.description.rowIds.some(id=>id.includes('ui_text_replacements_localised_text_wh2_dlc09_undead_description')));
 // Generic description is not silently replaced by a culture-specific variant.
 assert(!undead.description.rowIds.some(id=>id.includes('_wh_main_sc_vmp_vampire_counts')));
});
test('priority attributes expose official effects and conditions without fabricated numeric stats',()=>{
 assert.match(dictionary.get('causes_fear').description.text,/리더십/);assert.match(dictionary.get('causes_fear').description.text,/누적되지/);
 assert.match(dictionary.get('charge_defense').description.text,/대비 중/);assert.match(dictionary.get('charge_defense').description.text,/모든 공격자/);
 assert.match(dictionary.get('stalk_in_forest').description.text,/너무 가까이/);
 for(const id of ['causes_fear','charge_defense','stalk_in_forest','undead'])assert.deepEqual(dictionary.get(id).phases,[]);
});
test('regeneration separates per-tick fractional healing, resurrection and raw flame modifiers from activation',()=>{
 assert.equal(effect('regeneration','heal_amount').rawValue,0.001);assert.equal(effect('regeneration','heal_amount').value,0.1);assert.equal(dictionary.get('regeneration').phases[0].interval,1);
 assert.equal(effect('regeneration','resurrect').value,false);assert.equal(effect('regeneration','stat_weakness_flame').value,-20);assert.equal(effect('regeneration','stat_weakness_flame').method,'add');
 assert.deepEqual(dictionary.get('regeneration').conditions,[]);assert(dictionary.get('regeneration').contextDescriptions.length===1);assert.match(dictionary.get('regeneration').contextDescriptions[0].text,/화염/);
 const rendered=html(dictionary.get('regeneration')).replace(/<[^>]+>/g,'');assert.match(rendered,/최대 생명력 회복: 0.1 % \/ 적용 주기/);assert.match(rendered,/사망 개체 부활: 적용하지 않음/);
});
test('crumbling and disintegrating preserve distinct damage, period, entity cap and stopping flags',()=>{
 const a=dictionary.get('crumbling'),b=dictionary.get('disintegrating');
 assert.equal(effect('crumbling','damage_amount').value,28);assert.equal(a.phases[0].interval,1);assert.equal(a.phases[0].maxAffectedEntities,1);
 assert.equal(effect('disintegrating','damage_amount').value,133);assert.equal(b.phases[0].interval,0.2);assert.equal(b.phases[0].maxAffectedEntities,5);
 assert.equal(a.conditions[0].kind,'DEACTIVATE');assert.equal(a.conditions[0].rawFlag,'morale_is_higher_than_broken');assert.equal(b.conditions[0].rawFlag,'morale_is_higher_than_shattered');
 assert.match(html(a),/자동 해제 조건/);assert.match(html(b),/0.2초/);
});
test('ordered multi-phase and imbued contact relations retain targeting, hidden phases and modifier methods',()=>{
 const es=dictionary.list();assert(es.some(e=>e.phases.length>1));assert(es.some(e=>e.phases.some(p=>p.relationship.startsWith('CONTACT:'))));
 for(const e of es){const direct=e.phases.filter(p=>p.relationship==='DIRECT');assert.deepEqual(direct.map(p=>p.order),direct.map(p=>p.order).sort((a,b)=>a-b));for(const p of e.phases){assert.equal(typeof p.targets.self,'boolean');for(const v of p.effects){assert(v.value!==undefined);assert(v.sourceRowIds.length);if(v.method)assert(['add','mult'].includes(v.method));}}}
});
test('intensity-dependent effects warn that current intensity is not evaluated',()=>{
 const e=dictionary.get('wh3_dlc29_unit_passive_doom_of_many');assert.equal(e.activation.intensityBased,true);assert.match(html(e),/현재 강도에 따른 변화를 계산하지/);assert(e.held.some(h=>h.reason.includes('Intensity')));
});
test('same-name effects remain separate while reviewed raw aliases share one document',()=>{
 const sameNames=new Map();for(const e of dictionary.list()){const list=sameNames.get(e.name)??[];list.push(e);sameNames.set(e.name,list);}
 assert([...sameNames.values()].some(es=>es.length>1&&new Set(es.map(e=>abilityPath(e.id))).size===es.length));
 const alias=dictionary.list().find(e=>e.rawKeys.length===3);assert(alias);assert.equal(alias.category,'PASSIVE');assert.equal(dictionary.list().filter(e=>e.id===alias.id).length,1);
});
test('missing and unresolved descriptions use English fallback or explicit name-only status without inventing text',async()=>{
 const {buildDictionary}=await import('../tools/wh3-importer/ability-dictionary/rules.mjs'),input=args(),key='unit_abilities_tooltip_text_wh_main_unit_passive_regeneration';
 for(const s of [input.attributes,input.passives,input.actives,input.supplement])s.localisations=s.localisations.filter(r=>!(r.row.key===key&&r.sourcePack==='local_kr.pack'));
 let e=buildDictionary(input).entries.find(e=>e.id==='regeneration');assert.equal(e.verification.description,'OFFICIAL_EN');assert.equal(e.description.language,'en');
 for(const s of [input.attributes,input.passives,input.actives,input.supplement])s.localisations=s.localisations.filter(r=>r.row.key!==key);
 e=buildDictionary(input).entries.find(e=>e.id==='regeneration');assert.equal(e.description,null);assert.equal(e.verification.description,'NAME_ONLY');assert(e.phases.length>0);
});
test('Loc resolution rejects ambiguous text and cycles; text replacement wins over a recursive random alias',async()=>{
 const {resolveLoc}=await import('../tools/wh3-importer/ability-dictionary/rules.mjs');const source=args().supplement;
 assert.equal(resolveLoc(source,'local_kr.pack','morale').text,'리더십');
 assert.throws(()=>resolveLoc({localisations:[{id:'x',sourcePack:'local_kr.pack',row:{key:'x',text:'{{tr:x}}'}}]},'local_kr.pack','x'),/Cyclic/);
 assert.throws(()=>resolveLoc({localisations:[{id:'x',sourcePack:'local_kr.pack',row:{key:'x',text:'a'}},{id:'y',sourcePack:'local_kr.pack',row:{key:'x',text:'b'}}]},'local_kr.pack','x'),/Ambiguous/);
});
test('fresh representative raw rows agree with prior snapshot and incomplete queries are rejected',async()=>{
 const {buildDictionary}=await import('../tools/wh3-importer/ability-dictionary/rules.mjs'),input=args();assert(input.supplement.rows.filter(r=>r.table==='special_ability_phases_tables').length===3);
 buildDictionary(input);input.supplement.rows.find(r=>r.table==='special_ability_phases_tables').row.damage_amount+=1;assert.throws(()=>buildDictionary(input),/Fresh representative/);
 const broken=args();broken.supplement.coverage[0].matchedRows+=1;assert.throws(()=>buildDictionary(broken),/Truncated/);
 const badReference=args();badReference.supplement.schemas.find(s=>s.table==='modifiable_unit_stats_tables').fields.find(f=>f.name==='localisation').is_reference=['other','key'];assert.throws(()=>buildDictionary(badReference),/Unverified reference/);
});
test('all previous data files and admissions retain pinned bytes after Git line-ending normalization',()=>{
 for(const {file,hash}of read(folder+'manifest.json').inputs)assert.equal(createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,file);
});
test('every owned production ability is a keyboard button; mobile lists omit effect bodies until selected',()=>{
 for(const u of game.listUnits().filter(u=>u.gameVersion!=='sample')){const markup=renderToString(React.createElement(MemoryRouter,null,React.createElement(UnitDetails,{unit:u}))),ids=[...(u.attributes??[]),...(u.passiveAbilities??[]),...(u.abilities??[]),...(u.boundAbilities??[])];assert.equal((markup.match(/aria-haspopup="dialog"/g)??[]).length,ids.length,u.id);assert(!markup.includes('ability-dialog-header'));assert(!markup.includes('role="dialog"'));}
});
test('independent document route and panel render the same dictionary with provenance; missing id is not found',()=>{
 const render=id=>renderToString(React.createElement(MemoryRouter,{initialEntries:[abilityPath(id)]},React.createElement(Routes,null,React.createElement(Route,{path:'/abilities/:id',element:React.createElement(Page)}))));
 assert.match(render('regeneration'),/재生|재생/);assert(render('regeneration').includes(dictionary.get('regeneration').description.text));assert.match(html(dictionary.get('regeneration')),/href="\/abilities\/regeneration"/);assert.match(render('not-a-real-ability'),/찾을 수/);
 // React escapes source text; game markup never becomes executable HTML.
 assert(!html({...dictionary.get('regeneration'),description:{...dictionary.get('regeneration').description,text:'<script>alert(1)</script>'}}).includes('<script>'));
});
