import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
// Payloads and join edges already live in the pinned source dictionary. Keep
// exact row pointers here rather than copying them into every derived report.
function pointers(value){
 if(Array.isArray(value))return value.map(pointers);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['raw','joins','join','selectorJoin','scope'].includes(k)).map(([k,v])=>[k,pointers(v)]));
 return value;
}
export function compactInventory(inventory,sourceSha256){
 const relations=[],indices=new Map();
 const skills=inventory.skills.map(s=>{
  const refs=s.foreignOwners.map(o=>{const tuple=[o.subtypeKey,o.nodeRowId,o.itemRowId,o.setRowId];const key=JSON.stringify(tuple);if(!indices.has(key)){indices.set(key,relations.length);relations.push(tuple);}return indices.get(key);});
  const {foreignOwners,...rest}=s;return {...pointers(rest),effects:s.effects.map(e=>({...pointers(e),scopeKey:e.scope.key})),foreignOwnerRefs:refs};
 });
 const {format,skills:unused,...header}=inventory;
 return {format:'wh3-bretonnia-skill-inventory-pointers-v1',formatExpanded:format,sourceSha256,expandedSha256:sha256(JSON.stringify(inventory)),payloadAndJoinLookup:'source.json row IDs and edges; replay reconstructs and hashes the complete inventory',foreignRelationFields:['subtypeKey','nodeRowId','itemRowId','setRowId'],foreignRelations:relations,...pointers(header),skills};
}
export function compactClassification(classification,sourceSha256){
 const targets={},skills=classification.skills.map(s=>({...s,effects:s.effects.map(e=>{for(const t of e.targets){if(targets[t.unitId])assert.deepEqual(targets[t.unitId],t);else targets[t.unitId]=t;}const {targets:unused,...rest}=e;return {...rest,targetRefs:e.targets.map(t=>t.unitId)};})}));
 return {...classification,format:'wh3-bretonnia-skill-classification-target-dictionary-v1',sourceSha256,expandedSha256:sha256(JSON.stringify(classification)),targets,skills};
}
export function compactMemberProofs(membership){return {...membership,proofLookup:'Exact member, branch and join identities resolve through pinned source rows/edges; no base-unit substitution',members:Object.fromEntries(Object.entries(membership.members).map(([k,v])=>[k,pointers(v)])),selectors:membership.selectors.map(s=>pointers(s))};}
export function serializeCompact(value){
 // One object per line for large parallel collections; header remains readable.
 return '{\n'+Object.entries(value).map(([k,v])=>'  '+JSON.stringify(k)+': '+(Array.isArray(v)?'[\n'+v.map(x=>'    '+JSON.stringify(x)).join(',\n')+'\n  ]':JSON.stringify(v,null,2).replaceAll('\n','\n  '))).join(',\n')+'\n}\n';
}
