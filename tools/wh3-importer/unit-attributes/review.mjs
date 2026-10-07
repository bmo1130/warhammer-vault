import assert from 'node:assert/strict';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';
import {rosterSourceHash,discoverRoster} from '../production-growth/roster.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {factSelectors} from '../observations/facts.mjs';
import {observationContext} from '../observations/context.mjs';
import {koreanPackHash,unitsHash} from '../unit-localisation/review.mjs';
import {attributeMappings,exclusions,holds} from './policy.mjs';

export const sourceHash='7d99580858e1b5ebaebd0561be0603d67abde8984cb6903aae39e435fe495044';
const unique=xs=>[...new Set(xs)].sort();
const one=(rows,table,field,value)=>{const found=rows.filter(r=>r.table===table&&r.row[field]===value);assert.equal(found.length,1,`Missing/ambiguous ${table}.${field}=${value}`);return found[0];};
export function attributeLoc(source,pack,key,stack=[],titleOnly=false){
 assert(!stack.includes(key),'Cyclic attribute Loc');
 const r=one(source.localisations.filter(r=>r.sourcePack===pack),'Loc','key',key);
 assert.equal(r.key.key,key);assert.equal(r.id,`${pack}:${r.path}:${key}`);
 const rowIds=[r.id];
 // Title admission never resolves/interprets the tooltip effect body. Its
 // runtime tokens remain raw evidence and cannot change numeric Unit fields.
 const input=titleOnly?r.row.text.split('||')[0]:r.row.text;
 const text=input.replace(/\{\{tr:([^}]+)\}\}/g,(_,child)=>{const v=attributeLoc(source,pack,child,[...stack,key],titleOnly);rowIds.push(...v.rowIds);return v.text;});
 return {text,rowIds:unique(rowIds)};
}
const plain=text=>text.replace(/\[\[img:[\s\S]*?\]\]\[\[\/img\]\]/g,'').replace(/\[\[[^\]]+\]\]/g,'').trim();
export function classifyAttribute(source,key){
 const definition=one(source.rows,'unit_attributes_tables','key',key);
 const semanticRows=source.localisations.filter(r=>['local_en.pack','local_kr.pack'].includes(r.sourcePack)&&['bullet_text','imued_effect_text'].some(f=>r.row.key===`unit_attributes_${f}_${key}`));
 const semanticEvidence=[definition.id,...semanticRows.map(r=>r.id)];
 if(exclusions[key])return {key,status:'EXCLUDED',kind:exclusions[key][0],reason:exclusions[key][1],sourceRowIds:semanticEvidence};
 if(holds[key])return {key,status:'HOLD',reason:holds[key],sourceRowIds:semanticEvidence};
 const mapping=attributeMappings[key];
 if(!mapping)return {key,status:'HOLD',reason:'No exact reviewed CA attribute mapping.',sourceRowIds:semanticEvidence};
 const schema=source.schemas.find(s=>s.table===definition.table&&s.version===definition.tableVersion);
 assert(schema?.localisedFields.some(f=>f.name===mapping.field),'Unverified attribute Loc field');
 const locKey=`unit_attributes_${mapping.field}_${key}`;
 const en=attributeLoc(source,'local_en.pack',locKey,[],true),ko=attributeLoc(source,'local_kr.pack',locKey,[],true);
 const englishLabel=plain(en.text.split('||')[0]),label=plain(ko.text.split('||')[0]);
 assert.equal(englishLabel,mapping.title,`Attribute meaning drift: ${key}`);
 assert(/[가-힣]/.test(label)&&!label.includes('{{'),'Unresolved Korean attribute name');
 const ui=source.rows.filter(r=>r.table==='attribute_to_ui_collection_junctions_tables'&&r.row.unit_attribute===key);
 assert(ui.every(r=>r.row.hidden===false),'Hidden UI collection is not automatically displayable');
 // A UI collection can combine abilities and attributes. It is presentation,
 // never ability ownership or a reason to merge fear/terror, skink/kroxigor etc.
 ui.forEach(r=>one(source.rows,'ability_ui_collections_tables','ability_collection',r.row.collection));
 return {key,status:'ADMITTED',canonicalId:mapping.canonicalId,label,englishLabel,kind:ui.length?'CA_ATTRIBUTE_WITH_UI_COLLECTION':'CA_UNIT_ATTRIBUTE',sourceRowIds:unique([...semanticEvidence,...en.rowIds,...ko.rowIds,...ui.map(r=>r.id)]),localisationKey:locKey};
}

export function reviewUnitAttributes(source,roster,units){
 assert.equal(evidenceHash(source),sourceHash,'Attribute source hash drift');
 assert.equal(evidenceHash(units),unitsHash,'Existing Unit baseline drift');
 assert.equal(source.unitsHash,unitsHash);assert.equal(source.rosterSourceHash,rosterSourceHash);
 assert.equal(source.koreanPackHash,koreanPackHash);assert.equal(source.gameExecuted,false);
 assert.equal(source.format,'warhammer-vault-unit-attributes-source-v1');
 assert(isReviewedSource(source.provenance,''));assert.deepEqual(source.provenance,roster.provenance);
 assert.equal(new Set(source.rows.map(r=>r.id)).size,source.rows.length,'Duplicate source rows');
 for(const coverage of source.coverage){
   const rows=source.rows.filter(r=>r.table===coverage.query.table&&coverage.query.where.every(w=>w.value.includes(r.row[w.field])));
   assert.equal(rows.length,coverage.matchedRows,'Incomplete bounded query');assert.equal(coverage.tableFiles,1,'Pack precedence not reviewed');
 }
 const schemaField=(table,field,ref)=>{const defs=source.schemas.filter(s=>s.table===table);assert.equal(defs.length,1);assert.deepEqual(defs[0].fields.find(f=>f.name===field)?.is_reference,ref,'Attribute reference schema drift');};
 schemaField('unit_attributes_to_groups_junctions_tables','attribute',['unit_attributes','key']);
 schemaField('unit_attributes_to_groups_junctions_tables','attribute_group',['unit_attributes_groups','group_name']);
 schemaField('attribute_to_ui_collection_junctions_tables','unit_attribute',['unit_attributes','key']);
 schemaField('land_units_to_unit_abilites_junctions_tables','ability',['unit_abilities','key']);
 const classifications=source.rows.filter(r=>r.table==='unit_attributes_tables').map(r=>classifyAttribute(source,r.row.key));
 const abilityKeys=new Set(source.rows.filter(r=>r.table==='unit_abilities_tables').map(r=>r.row.key));
 assert(classifications.every(c=>!abilityKeys.has(c.key)),'Native ability/attribute key overlap requires separate review');
 const decisions=new Map(classifications.map(c=>[c.key,c]));
 const labels=Object.fromEntries(classifications.filter(c=>c.status==='ADMITTED').map(c=>[c.canonicalId,c.label]));
 const production=units.filter(u=>u.gameVersion!=='sample');
 assert.deepEqual(source.requests.map(r=>r.id),production.map(u=>u.id),'Incomplete request inventory');
 const entries=new Map(discoverRoster(roster).flatMap(r=>r.units).map(e=>[e.id,e]));
 const admissions=[];
 for(const [i,u]of production.entries()){
   const r=source.requests[i],e=entries.get(u.id);
   assert(e&&r.mainKey===e.mainKey&&r.landKey===e.landKey&&u.gameVersion===source.provenance.gameVersion);
   const main=one(roster.preflight.rows,'main_units_tables','unit',r.mainKey),land=one(roster.preflight.rows,'land_units_tables','key',r.landKey);
   assert.equal(main.row.land_unit,r.landKey);assert.equal(land.row.attribute_group,r.group);
   const landSchema=roster.schemas.find(s=>s.table===land.table&&s.version===land.tableVersion);
   assert.deepEqual(landSchema.fields.find(f=>f.name==='attribute_group').is_reference,['unit_attributes_groups','group_name']);
   const group=one(source.rows,'unit_attributes_groups_tables','group_name',r.group);
   const junctions=source.rows.filter(j=>j.table==='unit_attributes_to_groups_junctions_tables'&&j.row.attribute_group===r.group);
   assert(source.coverage.some(c=>c.query.table==='unit_attributes_to_groups_junctions_tables'&&c.query.where[0].value.includes(r.group)),'Unqueried reverse group');
   // Replay schema-connected facts for every saved roster trace. The supplemental
   // full reverse query must agree; saved omission/mapping status is never authority.
   const candidate=roster.candidates.find(c=>c.id===u.id);
   if(candidate){const dump=restoreTrace(roster,candidate.trace),selectors=factSelectors(dump),c=observationContext(dump,selectors);assert.equal(selectors.fact(c.land,'attribute_group')?.value,r.group);const keys=dump.rows.filter(j=>j.table==='unit_attributes_to_groups_junctions_tables'&&j.row.attribute_group===r.group&&selectors.reachable(j)).map(j=>selectors.fact(selectors.follow(j,'attribute'),'key')?.value);assert.deepEqual(unique(keys),unique(junctions.map(j=>j.row.attribute)),'Saved attribute trace/full group differs');}
   const facts=[],withheld=[],excluded=[];
   for(const j of junctions){const d=decisions.get(j.row.attribute);assert(d,'Undefined CA attribute');const evidence={rawKey:d.key,sourceRowIds:[main.id,land.id,group.id,j.id,...d.sourceRowIds]};if(d.status==='ADMITTED')facts.push({...evidence,canonicalId:d.canonicalId,kind:'CA_GROUP_MEMBERSHIP'});else if(d.status==='HOLD')withheld.push({...evidence,reason:d.reason});else excluded.push({...evidence,kind:d.kind,reason:d.reason});}
   const mainSchema=roster.schemas.find(s=>s.table===main.table&&s.version===main.tableVersion);
   assert(mainSchema.fields.find(f=>f.name==='can_siege')?.description.includes('can attack the turn a settlement is besieged'),'Unreviewed siege flag meaning');
   assert.equal(typeof main.row.can_siege,'boolean');
   if(main.row.can_siege){assert.equal(decisions.get('can_siege')?.status,'ADMITTED');facts.push({canonicalId:'siege_attacker',rawKey:'can_siege',kind:'MAIN_UNIT_FLAG',field:'can_siege',sourceRowIds:[main.id,...decisions.get('can_siege').sourceRowIds]});}
   const derived=unique(facts.map(f=>f.canonicalId));
   for(const old of u.attributes??[])assert(derived.includes(old),`Previous attribute not proved: ${u.id}/${old}`);
   const attributes=[...(u.attributes??[]),...derived.filter(a=>!u.attributes?.includes(a))];
   const status=withheld.length?'PARTIAL':'COMPLETE';
   admissions.push({...r,originalAttributes:u.attributes??null,attributes,status,facts,withheld,excluded});
 }
 // Native ability membership is retained only as exclusion evidence. No active,
 // passive, spell or unit-source entry is copied into Unit.attributes.
 const abilities=source.rows.filter(r=>r.table==='unit_abilities_tables').map(r=>{one(source.rows,'unit_ability_source_types_tables','key',r.row.source_type);return {key:r.row.key,sourceType:r.row.source_type,sourceRowId:r.id,reason:'CA_UNIT_ABILITY_NOT_ATTRIBUTE'};});
 const known=admissions.filter(a=>a.attributes.length||a.status==='COMPLETE');
 const summary={before:production.filter(u=>u.attributes!==undefined).length,after:known.length,unknownBefore:production.filter(u=>u.attributes===undefined).length,unknownAfter:production.length-known.length,complete:admissions.filter(a=>a.status==='COMPLETE').length,partial:admissions.filter(a=>a.status==='PARTIAL').length,knownEmpty:admissions.filter(a=>!a.attributes.length&&a.status==='COMPLETE').length,canonicalAttributes:unique(admissions.flatMap(a=>a.attributes)),promotedCanonicalAttributes:unique(admissions.flatMap(a=>a.attributes.filter(id=>!a.originalAttributes?.includes(id)))),rawKeys:classifications.length,groups:unique(admissions.map(a=>a.group)).length,junctions:source.rows.filter(r=>r.table==='unit_attributes_to_groups_junctions_tables').length,abilityKeys:abilities.length};
 const metadata={format:'warhammer-vault-unit-attribute-admission-v1',gameVersion:source.provenance.gameVersion,sourceHash,rosterSourceHash,unitsHash,koreanPackHash};
 const review={...metadata,summary,classifications,admissions,excludedAbilities:abilities};
 const projection={...metadata,labels,admissions:admissions.map(({id,originalAttributes,attributes,status,withheld})=>({id,originalAttributes,...(attributes.length||status==='COMPLETE'?{attributes}:{}),status,heldKeys:withheld.map(w=>w.rawKey)}))};
 return {review,projection};
}
