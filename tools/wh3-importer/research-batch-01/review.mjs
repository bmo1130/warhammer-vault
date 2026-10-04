import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const statuses = ['DIRECT_SUPPORTED', 'SUPPORTED_WITH_LIMITATION', 'AMBIGUOUS', 'UNSUPPORTED', 'NON_UNIT_STAT'];
// Only bonus IDs actually reviewed in this batch. Not a discovery/mapping registry.
const admittedMappings = {
  melee_attack_mod: ['melee.meleeAttack','add'], melee_defence_mod: ['defense.meleeDefense','add'],
  morale: ['defense.leadership','add'], charge_bonus: ['melee.chargeBonus','multiply'],
  melee_damage_mod_mult: ['melee.damage.base','multiply'], melee_damage_ap_mod_mult: ['melee.damage.armorPiercing','multiply'],
  cost_mod: ['campaign.recruitmentCost','multiply'],
};

// Eight frozen review candidates; no effect-key classifier, scope resolver or
// automatic unit-set expansion. policy.json is a reviewed explicit allowlist.
export function reviewBatch(sourceBytes, policyBytes, admission, unitsBytes, baseline) {
  assert.equal(hash(sourceBytes), admission.sourceSha256, 'Source drift: re-review required');
  assert.equal(hash(policyBytes), admission.policySha256, 'Interpretation drift: re-review required');
  assert.equal(hash(unitsBytes), admission.unitsSha256, 'Production identity drift');
  assert.equal(admission.unitsSha256, 'da22d7eb4d6af13856274e3f81fe18c789ed6588b6e0c956cbf97583f1350dc1');
  assert.equal(admission.snapshotId, baseline.snapshotId);
  assert.equal(admission.baselineResearchKey, baseline.researchKey);
  const s = JSON.parse(sourceBytes), policy = JSON.parse(policyBytes), units = JSON.parse(unitsBytes);
  assert.equal(s.format, 'wh3-reviewed-research-source-v1');
  assert.equal(policy.format, 'wh3-research-bounded-batch-policy-v1');
  assert.equal(policy.admissionGranularity, 'DIRECT_SUPPORTED_EFFECT_AND_EXACT_PRODUCTION_TARGET');
  assert.equal(s.originalExtraction.sha256, admission.originalExtractionSha256);
  assert.match(admission.originalExtractionSha256, /^[a-f0-9]{64}$/);
  assert.equal(s.provenance.gameVersion, baseline.gameVersion);
  assert.equal(s.provenance.schemaSha256, '5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4');
  assert.equal(s.provenance.packs.length, 2);
  assert.equal(s.provenance.packs.find(p => p.file_name === 'db.pack')?.sha256, 'd0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723');
  assert.equal(s.provenance.packs.find(p => p.file_name === 'local_en.pack')?.sha256, 'f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a');
  const ids = new Set();
  for (const r of s.rows) {
    assert(!ids.has(r.id), 'Duplicate row reference'); ids.add(r.id);
    assert.equal(r.id, `${r.table}:${hash(JSON.stringify([r.sourcePack, r.path, r.key, r.row])).slice(0,20)}`, 'Conflicting row payload');
    assert.equal(r.sourcePack, r.table === 'Loc' ? 'local_en.pack' : 'db.pack');
  }
  const rows = (table, field, value) => s.rows.filter(r => r.table === table && r.row[field] === value);
  const one = (table, field, value) => { const matches = rows(table,field,value); assert.equal(matches.length,1, `Non-exact ${table}.${field}=${value}`); return matches[0]; };
  const schema = r => { const matches = s.schemas.filter(d => d.table === r.table && d.version === r.tableVersion); assert.equal(matches.length,1); return matches[0]; };
  const join = (a, field, b, targetField) => {
    assert.deepEqual(schema(a).fields.find(f => f.name === field)?.is_reference, [b.table.replace(/_tables$/, ''),targetField], 'Schema relationship drift');
    assert.equal(a.row[field], b.row[targetField]);
    assert(s.relationships.some(j => j.from === a.id && j.field === field && j.to === b.id && j.targetField === targetField && j.value === a.row[field]), 'Missing relationship');
    return { from: a.id, field, to: b.id, targetField };
  };
  const loc = (r, field, expected) => {
    assert(schema(r).localisedFields.includes(field));
    const l = one('Loc','key',`${r.table.replace(/_tables$/, '')}_${field}_${Object.values(r.key)[0]}`);
    assert.equal(l.row.text, expected, 'Localisation/operation interpretation drift');
    assert.equal(l.path, r.table === 'technologies_tables' ? 'text/db/technologies__.loc' : 'text/db/effects__.loc');
    assert(s.relationships.some(j => j.from === r.id && j.to === l.id && j.field === field));
    return l;
  };
  const covered = (table, field, value, count) => assert(s.coverage.some(c => c.query.table === table && c.query.where.length === 1 && c.query.where[0].field === field && c.query.where[0].op === 'eq' && c.query.where[0].value === value && c.matchedRows === count && c.tableFiles > 0), 'Incomplete query coverage');
  const unitSetNames = [...new Set(s.rows.filter(r => r.table === 'unit_sets_tables').map(r => r.row.key))];
  const unitSets = unitSetNames.map(key => {
    const definition = one('unit_sets_tables','key',key), members = rows('unit_set_to_unit_junctions_tables','unit_set',key);
    covered('unit_set_to_unit_junctions_tables','unit_set',key,members.length);
    return { key, definitionRowId: definition.id, memberships: members.map(r => ({ rowId: r.id, mainKey: r.row.unit_record, exclude: r.row.exclude,
      selectors: { caste: r.row.unit_caste, category: r.row.unit_category, class: r.row.unit_class } })),
      explicitProductionMembers: members.filter(r => !r.row.exclude && r.row.unit_record && units.some(u => u.id === `ca_unit_${r.row.unit_record}` && u.gameVersion !== 'sample')).map(r => `ca_unit_${r.row.unit_record}`) };
  });
  const uniqueResearch = new Set(), projections = [], candidates = [];
  assert.equal(policy.candidates.length, 8);
  for (const p of policy.candidates) {
    assert(!uniqueResearch.has(p.key)); uniqueResearch.add(p.key); assert(statuses.includes(p.classification));
    const tech = one('technologies_tables','key',p.key), name = loc(tech,'onscreen_name',p.name);
    assert.equal(tech.row.is_hidden,false);
    const node = one('technology_nodes_tables','technology_key',p.key), nodeSet = one('technology_node_sets_tables','key','brt_mil'), culture = one('cultures_tables','key','wh_main_brt_bretonnia');
    for (const r of [node,nodeSet]) { assert.equal(r.row.campaign_key,''); assert.equal(r.row.faction_key,''); }
    assert.equal(nodeSet.row.subculture,'');
    const availability = [join(node,'technology_key',tech,'key'),join(node,'technology_node_set',nodeSet,'key'),join(nodeSet,'culture',culture,'key')];
    const junctions = rows('technology_effects_junction_tables','technology',p.key);
    assert.equal(junctions.length,p.effects.length); covered('technology_effects_junction_tables','technology',p.key,junctions.length);
    const effects = p.effects.map(e => {
      assert(statuses.includes(e.classification)); assert.equal(typeof e.reason,'string');
      const j = junctions.filter(j => j.row.effect === e.effectKey); assert.equal(j.length,1);
      assert.equal(j[0].row.value,e.value); assert(Number.isFinite(e.value)); assert.equal(j[0].row.effect_scope,e.scope);
      const effect = one('effects_tables','effect',e.effectKey), description = loc(effect,'description',e.description), scope = one('campaign_effect_scopes_tables','key',e.scope);
      const chains = [join(j[0],'technology',tech,'key'),join(j[0],'effect',effect,'effect'),join(j[0],'effect_scope',scope,'key')];
      const targetRows = s.rows.filter(r => ['effect_bonus_value_ids_unit_sets_tables','effect_bonus_value_basic_junction_tables'].includes(r.table) && r.row.effect === e.effectKey);
      assert.deepEqual(targetRows.map(r => ({table:r.table,...r.row})), e.targets, 'Bonus/target drift');
      for (const t of targetRows) {
        chains.push(join(t,'effect',effect,'effect'));
        if (t.table === 'effect_bonus_value_ids_unit_sets_tables') chains.push(join(t,'unit_set',one('unit_sets_tables','key',t.row.unit_set),'key'));
      }
      if (e.classification === 'DIRECT_SUPPORTED') {
        assert.equal(e.scope,'faction_to_force_own_unseen'); assert.deepEqual(scope.row, baseline.scope);
        assert(targetRows.length && targetRows.every(r => r.table === 'effect_bonus_value_ids_unit_sets_tables'), 'No exact unit set');
        assert(e.mapping.length);
        for (const m of e.mapping) {
          assert(['add','multiply'].includes(m.operation)); assert(targetRows.some(r => r.row.bonus_value_id === m.bonus));
          assert(e.description.includes(m.operation === 'multiply' ? '%+n%' : '%+n') && (m.operation !== 'add' || !e.description.includes('%+n%')), 'Wrong flat/percent interpretation');
          assert.deepEqual([m.stat,m.operation],admittedMappings[m.bonus], 'Wrong stat/operation interpretation');
        }
      } else assert.equal(e.mapping.length,0, 'Unsupported effect cannot provide modifiers');
      return { ...e, sourceRowId:j[0].id, localisationRowId:description.id, scopeRow:scope.row, chains, targetRowIds:targetRows.map(r=>r.id) };
    });
    const selectedTargets = new Set();
    const targetReviews = p.admittedTargets.map(t => {
      assert(!selectedTargets.has(t.unitId)); selectedTargets.add(t.unitId);
      assert.equal(t.unitId,`ca_unit_${t.mainKey}`);
      const production = units.filter(u=>u.id===t.unitId); assert.equal(production.length,1); assert.equal(production[0].gameVersion,s.provenance.gameVersion); assert.equal(production[0].factionId,'bretonnia');
      const main = one('main_units_tables','unit',t.mainKey), land = one('land_units_tables','key',t.landKey);
      const identity = join(main,'land_unit',land,'key');
      const modifiers = [], applicability = [];
      for (const e of effects.filter(e=>e.classification==='DIRECT_SUPPORTED')) for (const m of e.mapping) {
        const links = e.targets.filter(link=>link.bonus_value_id===m.bonus);
        const memberships = links.flatMap(link=>rows('unit_set_to_unit_junctions_tables','unit_set',link.unit_set).filter(r=>r.row.unit_record===t.mainKey).map(member=>({link,member})));
        assert.equal(memberships.length,1,'Competing/absent/overlapping target membership');
        const { link,member } = memberships[0], set = one('unit_sets_tables','key',link.unit_set);
        assert.equal(member.row.exclude,false,'Excluded unit');
        assert.equal(set.row.use_unit_exp_level_range,false); assert.equal(set.row.special_category,'');
        for (const field of ['unit_caste','unit_category','unit_class']) assert.equal(member.row[field],'');
        assert(rows('unit_set_to_unit_junctions_tables','unit_set',link.unit_set).every(r=>!r.row.unit_caste&&!r.row.unit_category&&!r.row.unit_class), 'Selector interpretation is not admitted');
        applicability.push({effectKey:e.effectKey,bonus:m.bonus,unitSet:link.unit_set,membershipRowId:member.id,chain:[join(member,'unit_set',set,'key'),join(member,'unit_record',main,'unit')]});
        modifiers.push({id:`ca-research:${p.key}:${e.effectKey}:${m.stat}`,sourceType:'research',sourceId:p.key,targetType:'unit',targetId:t.unitId,stat:m.stat,operation:m.operation,value:e.value,scope:'faction',gameVersion:s.provenance.gameVersion,source:`CA_RESEARCH · ${e.effectKey}`,tags:[]});
      }
      assert(modifiers.length, 'No DIRECT modifier for target');
      return {...t,identity,applicability,modifiers};
    });
    const candidate = {key:p.key,name:p.name,classification:p.classification,localisationRowId:name.id,availability,effects,admittedTargets:targetReviews,
      omittedEffects:effects.filter(e=>e.classification!=='DIRECT_SUPPORTED').map(e=>({effectKey:e.effectKey,classification:e.classification,reason:e.reason})),
      grailKnights: targetReviews.some(t=>t.unitId===baseline.unitId) ? 'ADMITTED_EXACT_TARGET' : effects.some(e=>e.targets.some(t=>t.unit_set==='brt_knights')) ? 'UNPROJECTED' : 'NOT_ADMITTED_NO_EXACT_REVIEWED_APPLICABILITY'};
    candidates.push(candidate);
  }
  const review = {format:'wh3-reviewed-research-batch-v1',sourceKind:'CA_RESEARCH',admissionGranularity:policy.admissionGranularity,
    sourceSha256:admission.sourceSha256,originalExtractionSha256:admission.originalExtractionSha256,policySha256:admission.policySha256,snapshotId:admission.snapshotId,provenance:s.provenance,unitSets,candidates,
    exclusionWitness:s.rows.filter(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_record===baseline.mainKey&&r.row.exclude).map(r=>({rowId:r.id,mainKey:r.row.unit_record,unitSet:r.row.unit_set,exclude:r.row.exclude})),
    limitations:['Only reviewed DIRECT effects/exact Production targets are projected; mixed technologies expose their numeric subset and omitted effects explicitly.','No caste/class/category selectors, engine-wide all-land recruitment, conditional battle effects, overlapping same-bonus sets or raw missile-strength/reload interpretations are admitted.','Percent/flat mapping uses exact CA descriptions and specific bonus rows; no generic effect-name parser.','The existing internal stacking contract is used; no claim of universal in-game stacking semantics.']};
  const reviewSha256 = hash(JSON.stringify(review));
  for (const c of candidates) for (const t of c.admittedTargets) {
    if (c.key===baseline.researchKey) {
      assert.equal(c.admittedTargets.length,1); assert.equal(t.unitId,baseline.unitId);
      assert.deepEqual(t.modifiers.map(m=>[m.stat,m.operation,m.value]),baseline.modifiers.map(m=>[m.stat,m.operation,m.value]));
      projections.push(baseline); // Original source hashes, IDs and provenance stay exact.
    } else projections.push({sourceKind:'CA_RESEARCH',researchKey:c.key,name:c.name,unitId:t.unitId,mainKey:t.mainKey,landKey:t.landKey,
      sourceSha256:admission.sourceSha256,reviewSha256,snapshotId:admission.snapshotId,gameVersion:s.provenance.gameVersion,scope:baseline.scope,modifiers:t.modifiers,
      omittedEffects:c.omittedEffects.map(e=>({effectKey:e.effectKey,classification:e.classification,reason:e.reason}))});
  }
  return {review,projections};
}
