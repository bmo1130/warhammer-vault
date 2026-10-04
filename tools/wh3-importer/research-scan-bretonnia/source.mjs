import assert from 'node:assert/strict';
import { pins } from '../research-classifier/policy.mjs';
import { sha256 } from '../research-classifier/classify.mjs';
import { digest, snapshotIdentity } from '../runtime-evidence/contract.mjs';

export const affiliationRoot = 'wh_main_brt_bretonnia';
export const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export const sortRows = rows => [...rows].sort((a, b) => compare(a.id, b.id));
export function projectExtraction(rawBytes) {
  const raw = JSON.parse(rawBytes);
  assert.equal(raw.format, 'wh3-bretonnia-tree-extraction-v1');
  assert.equal(raw.affiliationRoot, affiliationRoot);
  assert.equal(digest(snapshotIdentity(raw.provenance)), pins.snapshotId, 'Snapshot drift');
  return { format: 'wh3-research-tree-source-v1', affiliationRoot,
    originalExtraction: { path: 'generated/wh3/research-scan-bretonnia/raw.json', sha256: sha256(rawBytes), extractedAt: raw.extractedAt },
    provenance: raw.provenance, relationTables: [...raw.relationTables].sort(compare),
    schemas: raw.schemas.map(s => ({ table: s.table, version: s.version,
      fields: s.fields.map(({ name, field_type, is_key, is_reference }) => ({ name, field_type, is_key, is_reference })),
      localisedFields: s.localisedFields.map(f => f.name) })).sort((a,b) => compare(`${a.table}:${a.version}`, `${b.table}:${b.version}`)),
    rows: sortRows(raw.rows), relationships: [...raw.relationships].sort((a,b) => compare(JSON.stringify(a), JSON.stringify(b))),
    coverage: [...raw.coverage].sort((a,b) => compare(JSON.stringify(a.query), JSON.stringify(b.query))) };
}

export function sourceGraph(source) {
  const rows = (table, field, value) => source.rows.filter(r => r.table === table && (field === undefined || r.row[field] === value));
  const one = (table, field, value) => { const matches = rows(table,field,value); assert.equal(matches.length,1,`Non-exact ${table}.${field}=${value}`); return matches[0]; };
  const definition = row => { const found = source.schemas.filter(s => s.table === row.table && s.version === row.tableVersion); assert.equal(found.length,1); return found[0]; };
  const join = (from, field, to, targetField) => {
    assert.deepEqual(definition(from).fields.find(f => f.name === field)?.is_reference, [to.table.replace(/_tables$/, ''),targetField]);
    assert.equal(from.row[field],to.row[targetField]);
    assert(source.relationships.some(r => r.from === from.id && r.field === field && r.to === to.id && r.targetField === targetField && r.value === from.row[field]),'Missing exact relationship');
    return [from.id,field,to.id];
  };
  const covered = (table, field, value, matches) => assert(source.coverage.some(c => c.query.table === table && c.query.where.length === 1 &&
    c.query.where[0].field === field && c.query.where[0].op === 'eq' && c.query.where[0].value === value && c.matchedRows === matches && c.tableFiles > 0), 'Incomplete discovery coverage');
  return { rows, one, definition, join, covered };
}

export function discoverTree(source) {
  const g=sourceGraph(source), root=g.one('cultures_tables','key',affiliationRoot);
  const subcultures=g.rows('cultures_subcultures_tables','culture',affiliationRoot);
  const factions=g.rows('factions_tables').filter(f => subcultures.some(s=>s.row.subculture===f.row.subculture));
  g.covered('cultures_tables','key',affiliationRoot,1);
  g.covered('cultures_subcultures_tables','culture',affiliationRoot,subcultures.length);
  const subProof=new Map(subcultures.map(s=>[s.row.subculture,[g.join(s,'culture',root,'key')]]));
  const factionProof=new Map(factions.map(f=>[f.row.key,[g.join(f,'subculture',g.one('cultures_subcultures_tables','subculture',f.row.subculture),'subculture'),...subProof.get(f.row.subculture)]]));
  const treeSets=g.rows('technology_node_sets_tables').map(set=>{
    const proofs=[];
    if(set.row.culture===affiliationRoot) proofs.push(g.join(set,'culture',root,'key'));
    if(subProof.has(set.row.subculture)) proofs.push(g.join(set,'subculture',g.one('cultures_subcultures_tables','subculture',set.row.subculture),'subculture'),...subProof.get(set.row.subculture));
    if(factionProof.has(set.row.faction_key)) proofs.push(g.join(set,'faction_key',g.one('factions_tables','key',set.row.faction_key),'key'),...factionProof.get(set.row.faction_key));
    assert(proofs.length,'Tree set has no exact Bretonnia affiliation');
    return { key:set.row.key,rowId:set.id,proofs,campaignKey:set.row.campaign_key,factionKey:set.row.faction_key };
  }).sort((a,b)=>compare(a.key,b.key));
  assert(treeSets.length,'No affiliated technology tree');
  // Prove every discovery arm was queried, including empty arms. Prefixes are not used.
  const arm = (field, op, values) => assert(source.coverage.some(c=>c.query.table==='technology_node_sets_tables' &&
    c.query.where.length===1 && c.query.where[0].field===field && c.query.where[0].op===op &&
    JSON.stringify(c.query.where[0].value)===JSON.stringify(values) && c.tableFiles>0 &&
    c.matchedRows===treeSets.filter(t=>op==='eq' ? g.one('technology_node_sets_tables','key',t.key).row[field]===values :
      values.includes(g.one('technology_node_sets_tables','key',t.key).row[field])).length),'Missing affiliation discovery arm');
  arm('culture','eq',affiliationRoot);
  arm('subculture','oneOf',subcultures.map(s=>s.row.subculture).sort(compare));
  arm('faction_key','oneOf',factions.map(f=>f.row.key).sort(compare));
  const nodes=g.rows('technology_nodes_tables');
  for(const set of treeSets) g.covered('technology_nodes_tables','technology_node_set',set.key,nodes.filter(n=>n.row.technology_node_set===set.key).length);
  const technologies=[...new Set(nodes.map(n=>n.row.technology_key))].sort(compare).map(key=>{
    const technology=g.one('technologies_tables','key',key);
    const loc=g.one('Loc','key',`technologies_onscreen_name_${key}`);
    assert(g.definition(technology).localisedFields.includes('onscreen_name'));
    assert(source.relationships.some(r=>r.from===technology.id&&r.field==='onscreen_name'&&r.to===loc.id),'Missing technology Loc trace');
    const memberships=nodes.filter(n=>n.row.technology_key===key).map(node=>{
      const set=treeSets.find(s=>s.key===node.row.technology_node_set); assert(set,'Foreign node set');
      return { nodeKey:node.row.key,nodeRowId:node.id,treeSetKey:set.key,treeSetRowId:set.rowId,
        proofs:[g.join(node,'technology_key',technology,'key'),g.join(node,'technology_node_set',g.one('technology_node_sets_tables','key',set.key),'key'),...set.proofs] };
    }).sort((a,b)=>compare(a.nodeKey,b.nodeKey));
    const effects=g.rows('technology_effects_junction_tables','technology',key);
    g.covered('technology_effects_junction_tables','technology',key,effects.length);
    return { key,name:loc.row.text,sourceRowId:technology.id,localisationRowId:loc.id,isHidden:technology.row.is_hidden,memberships,
      effectRowIds:sortRows(effects).map(r=>r.id) };
  });
  assert.equal(technologies.length,g.rows('technologies_tables').length,'Unlinked technology in projection');
  assert(g.rows('technology_effects_junction_tables').every(e=>technologies.some(t=>t.key===e.row.technology)),'Foreign effect junction');
  return { rootRowId:root.id,subcultureRowIds:sortRows(subcultures).map(r=>r.id),factionRowIds:sortRows(factions).map(r=>r.id),treeSets,nodeCount:nodes.length,technologies };
}

export function verifySource(sourceBytes, unitsBytes, manifest) {
  assert.equal(sha256(sourceBytes),manifest.sourceSha256,'Scan source hash drift');
  assert.equal(sha256(unitsBytes),pins.unitsSha256,'Production registry drift');
  const s=JSON.parse(sourceBytes);
  assert.equal(s.format,'wh3-research-tree-source-v1'); assert.equal(s.affiliationRoot,affiliationRoot);
  assert.equal(s.originalExtraction.sha256,manifest.originalExtractionSha256);
  assert.match(s.originalExtraction.sha256,/^[a-f0-9]{64}$/);
  assert.equal(digest(snapshotIdentity(s.provenance)),pins.snapshotId,'Snapshot drift');
  for(const field of ['gameVersion','schemaSha256','rpfmVersion','schemaFormatVersion']) assert.equal(s.provenance[field],pins[field]);
  assert.equal(sha256(JSON.stringify(s.schemas)),manifest.processedSchemasSha256);
  const ids=new Map();
  for(const row of s.rows) {
    assert(!ids.has(row.id),'Duplicate row ID');ids.set(row.id,row);
    assert.equal(row.id,`${row.table}:${sha256(JSON.stringify([row.sourcePack,row.path,row.key,row.row])).slice(0,20)}`,'Conflicting row payload');
    const pack=s.provenance.packs.find(p=>p.file_name===row.sourcePack);
    assert.equal(pack?.file_path,row.sourcePackPath); assert.equal(row.sourcePack,row.table==='Loc'?'local_en.pack':'db.pack');
  }
  const g=sourceGraph(s);
  for(const c of s.coverage) {
    const table=c.query.table.startsWith('Loc:')?'Loc':c.query.table;
    const found=g.rows(table).filter(r=>(!c.query.table.startsWith('Loc:')||r.path===c.query.table.slice(4)) &&
      c.query.where.every(q=>q.op==='eq'?r.row[q.field]===q.value:q.op==='oneOf'&&q.value.includes(r.row[q.field])));
    assert.equal(found.length,c.matchedRows,'Query coverage/source mismatch');
  }
  for(const r of s.relationships) {
    const a=ids.get(r.from),b=ids.get(r.to);assert(a&&b,'Missing referenced row');
    if(b.table==='Loc') {
      assert(g.definition(a).localisedFields.includes(r.field));
      assert.equal(r.value,`${a.table.replace(/_tables$/, '')}_${r.field}_${Object.values(a.key)[0]}`);
      assert.equal(b.row.key,r.value);
    } else g.join(a,r.field,b,r.targetField);
  }
  return s;
}
