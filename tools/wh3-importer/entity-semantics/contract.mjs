import { connected, rawFact, requireSameSource } from '../blocker-review/evidence.mjs';

const T = { main: 'main_units_tables', land: 'land_units_tables', entity: 'battle_entities_tables',
  stats: 'battle_entity_stats_tables', attachment: 'land_units_to_battle_personalities_junctions_tables', junction: 'unit_missile_weapon_junctions_tables' };
const nonempty = v => v !== '' && v !== null && v !== undefined;
const sorted = xs => [...xs].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const sizes = new Set(['tiny', 'small', 'medium', 'large', 'very_large']);
export const entityPresentationFields = ['entities.entitySize', 'entities.mass', 'defense.projectilePenetrationResistance'];

export function entityStructureContract(evidence, expected) {
  evidence = { ...evidence, rows: [...evidence.rows].sort((a, b) => a.id.localeCompare(b.id)), relationships: sorted(evidence.relationships) };
  const issues = [...(evidence.issues ?? [])], paths = [];
  const rows = table => evidence.rows.filter(r => r.table === table);
  const mains = rows(T.main);
  if (!expected?.mainKey || mains.length !== 1 || rawFact(evidence, mains[0], 'unit')?.value !== expected.mainKey) throw new Error('Entity contract requires one exact source main key.');
  const main = mains[0];
  const links = (row, field, target) => {
    const input = rawFact(evidence, row, field), found = connected(evidence, row, field, target);
    const ref = evidence.schemas.find(s => s.table === row?.table && s.version === row.tableVersion)?.fields.find(f => f.name === field)?.is_reference;
    if (!input || !ref || `${ref[0].replace(/_tables$/, '')}_tables` !== target || (nonempty(input.value) && found.length !== 1)) {
      issues.push({ rowId: row?.id ?? null, field, target, reason: 'Required processed reference/unique target missing; raw key matching cannot repair it.' });
    }
    if (ref && found.some(x => !rawFact(evidence, x.row, ref[1]))) issues.push({ rowId: row?.id ?? null, field, target, reason: 'Target row/key or processed target field identity invalid.' });
    return found;
  };
  const landLinks = links(main, 'land_unit', T.land), land = landLinks.length === 1 ? landLinks[0].row : null;
  if (!land || rawFact(evidence, land, 'key')?.value !== expected.landKey) throw new Error('Entity source land identity drift.');
  const prefix = [landLinks[0].edge];
  const facts = row => Object.fromEntries(Object.keys(row?.row ?? {}).sort().map(field => [field, rawFact(evidence, row, field)]));
  const record = row => row ? { ...row, fields: facts(row) } : null;
  const reverse = (table, field, target, targetField) => {
    if (!evidence.coverage?.some(c => c.tableFiles > 0 && c.query.table === table && c.query.where.some(w => w.field === field &&
      (w.op === 'oneOf' ? w.value.includes(target.row[targetField]) : w.value === target.row[targetField])))) issues.push({ table, field, reason: 'Reverse scope not closed; missing rows are not evidence of absence.' });
    return rows(table).filter(row => {
      const owned = links(row, field, target.table).some(x => x.row.id === target.id);
      if (!owned) issues.push({ rowId: row.id, field, reason: 'Selected reverse row lacks the exact source owner.' });
      return owned;
    });
  };
  const rawCount = (row, field, role) => {
    const fact = rawFact(evidence, row, field);
    if (!fact || !Number.isInteger(fact.value) || fact.value < 0) issues.push({ rowId: row.id, field, reason: 'Raw cardinality field missing or invalid.' });
    return { fact, role, semanticsStatus: 'RAW_COUNT_ONLY', cardinalityMeaning: 'UNRESOLVED' };
  };
  const rawCardinality = { numMen: rawCount(main, 'num_men', 'MAN'), numMounts: rawCount(land, 'num_mounts', 'MOUNT'), numEngines: rawCount(land, 'num_engines', 'ENGINE') };
  const add = (role, origin, referenceField, edges, entityLink, count, owner = {}, statsLinks = []) => {
    const entity = entityLink?.row ?? null;
    if (entity && !rawFact(evidence, entity, 'key')) issues.push({ rowId: entity.id, reason: 'Entity target lacks verified row/key identity.' });
    const allEdges = [...edges, ...(entityLink ? [entityLink.edge] : [])];
    const locomotion = entity ? links(entity, 'locomotion_constants', 'battle_entity_locomotion_constants_tables') : [];
    paths.push({ pathId: JSON.stringify([expected.mainKey, role, origin.id, referenceField, allEdges.map(e => [e.from, e.field, e.to])]), role,
      sourceMainKey: expected.mainKey, sourceLandKey: expected.landKey,
      origin: record(origin), reference: rawFact(evidence, origin, referenceField), owner, edges: allEdges,
      entityKey: entity ? rawFact(evidence, entity, 'key')?.value ?? null : null, entity: record(entity),
      stats: statsLinks.map(s => ({ key: rawFact(evidence, s.row, 'key')?.value ?? null, row: record(s.row), edges: [...edges, s.edge] })),
      locomotion: locomotion.map(l => ({ row: record(l.row), edges: [...allEdges, l.edge] })),
      rawCardinality: count, cardinalityMeaning: 'UNRESOLVED',
      health: { entityHitPoints: rawFact(evidence, entity, 'hit_points'), status: 'RAW_ENTITY_HEALTH', displayRelation: 'UNRESOLVED' },
      provenance: { kind: 'DIRECT', evidence: 'Processed CA schema edges; role denotes placement, not a displayed/targetable model.' } });
  };
  const from = (role, origin, field, edges, count, owner, stats) => {
    const found = links(origin, field, T.entity);
    if (nonempty(origin.row[field]) && !found.length) add(role, origin, field, edges, null, count, owner, stats);
    for (const link of found) add(role, origin, field, edges, link, count, owner, stats);
  };
  from('MAN', land, 'man_entity', prefix, rawCardinality.numMen);
  for (const [role, field, table, entityField, count] of [
    ['MOUNT', 'mount', 'mounts_tables', 'entity', rawCardinality.numMounts],
    ['ENGINE', 'engine', 'battlefield_engines_tables', 'battle_entity', rawCardinality.numEngines],
  ]) {
    const owners = links(land, field, table);
    if (nonempty(land.row[field]) && !owners.length) add(role, land, field, prefix, null, count);
    for (const owner of owners) from(role, owner.row, entityField, [...prefix, owner.edge], count, { row: record(owner.row) });
  }
  const articulated = links(land, 'articulated_record', 'land_unit_articulated_vehicles_tables');
  for (const owner of articulated) for (const [role, field] of [['ARTICULATED', 'articulated_entity'], ['AMMO_CAISSON', 'ammo_caisson_entity']]) {
    from(role, owner.row, field, [...prefix, owner.edge], null, { row: record(owner.row), relation: facts(owner.row) });
  }
  const attachments = reverse(T.attachment, 'land_unit', land, 'key');
  for (const attachment of attachments) {
    const membership = connected(evidence, attachment, 'land_unit', T.land).find(x => x.row.id === land.id);
    for (const personality of links(attachment, 'battle_personality', 'battle_personalities_tables')) {
      const stats = links(personality.row, 'battle_entity_stats', T.stats);
      from('PERSONALITY_ATTACHMENT', personality.row, 'battle_entity', [...prefix, membership.edge, personality.edge], null,
        { attachment: record(attachment), personality: record(personality.row), attachType: { fact: rawFact(evidence, attachment, 'attach'), interpretation: 'UNRESOLVED' },
          slot: rawFact(evidence, attachment, 'riders_attachment_point'), articulationIndex: rawFact(evidence, attachment, 'engine_articulation_index') }, stats);
    }
  }
  const statsOverrides = [];
  for (const junction of reverse(T.junction, 'unit', main, 'unit')) {
    const membership = connected(evidence, junction, 'unit', T.main).find(x => x.row.id === main.id);
    for (const stats of links(junction, 'battle_entity_stats_override', T.stats)) statsOverrides.push({ role: 'MAIN_SPECIFIC_STATS_OVERRIDE',
      sourceMainKey: expected.mainKey, origin: record(junction), stats: record(stats.row), edges: [membership.edge, stats.edge], activation: 'UNKNOWN' });
  }
  const rowCount = (selected, role) => ({ value: selected.length, role, rowIds: selected.map(r => r.id).sort(),
    semanticsStatus: 'RAW_COUNT_ONLY', cardinalityMeaning: 'UNRESOLVED', kind: 'GENERATED', origin: 'Bounded schema-connected DB rows only; not live entities.' });
  rawCardinality.attachmentRows = rowCount(attachments, 'PERSONALITY_ATTACHMENT');
  rawCardinality.articulatedRows = rowCount(articulated.map(x => x.row), 'ARTICULATED');
  rawCardinality.attachmentSlots = { ...rowCount(attachments.filter(r => nonempty(rawFact(evidence, r, 'riders_attachment_point')?.value)), 'PERSONALITY_ATTACHMENT'),
    slots: attachments.map(r => rawFact(evidence, r, 'riders_attachment_point')), meaning: 'Rows with nonempty raw slot fields, not unique live riders.' };
  const finalIssues = sorted([...new Map(issues.map(i => [JSON.stringify(i), i])).values()]);
  const single = !finalIssues.length && paths.length === 1 && paths[0].role === 'MAN' && paths[0].entityKey;
  const entity = single ? paths[0].entity : null;
  const safeNumber = field => typeof entity?.fields[field]?.value === 'number' && Number.isFinite(entity.fields[field].value) && entity.fields[field].value >= 0;
  const completeness = finalIssues.length ? 'INCOMPLETE_DB_CHAIN' : !paths.length ? 'UNKNOWN_APPLICABILITY' : single ? 'COMPLETE_SINGLE_ENTITY' : 'COMPLETE_MULTI_ROLE';
  return { format: 'warhammer-vault-entity-structure-v1', sourceKind: evidence.sourceKind, provenance: evidence.provenance,
    source: { mainKey: expected.mainKey, landKey: expected.landKey, mainFact: rawFact(evidence, main, 'unit'), landFact: rawFact(evidence, land, 'key'), mainToLand: landLinks[0].edge,
      main: record(main), land: record(land) },
    paths: paths.sort((a, b) => a.pathId.localeCompare(b.pathId)), attachments: attachments.map(record), articulated: articulated.map(x => record(x.row)), statsOverrides,
    rawCardinality, issues: finalIssues, completeness, structure: finalIssues.length ? 'INCOMPLETE' : 'COMPLETE_IN_BOUNDED_SCOPE',
    health: { landBonusHitPoints: rawFact(evidence, land, 'bonus_hit_points'), status: 'RAW_LAND_BONUS_ONLY',
      landTotalHealth: null, displayRelation: 'UNRESOLVED', reason: 'bonus_hit_points is not proven total/card health. Entity and land facts are never combined.' },
    presentation: { status: 'DISPLAY_RELATION_UNRESOLVED', countSafe: false, hpSafe: false,
      massSafe: !!single && safeNumber('mass'), sizeSafe: !!single && sizes.has(entity?.fields.size?.value),
      penetrationSafe: !!single && safeNumber('projectile_penetration_resistance'),
      propertiesMeaning: 'Only existing single MAN per-entity properties may map; never aggregate mass/size or card HP/count.' },
    runtime: { unitSizeScaling: 'UNRESOLVED', displayedModelCount: 'UNRESOLVED', displayedHealth: 'UNRESOLVED',
      targetableEntityCount: 'UNRESOLVED', casualtyUnit: 'UNRESOLVED', componentDeath: 'UNRESOLVED', articulatedHitTargets: 'UNRESOLVED' },
    scope: { excluded: ['Attachment type vocabulary (referenced table is not exposed in the reviewed schema)', 'Animations/visual variants, collision simulation, scripts and runtime entity allocation'],
      attachmentRole: 'PERSONALITY_ATTACHMENT follows the junction placement; raw attach string never determines model count or a new role.' },
    policy: 'No count/HP/mass/size aggregation, representative selection, or scaling formula. Same keys retain separate role/path identities. Completeness describes only the explicit bounded graph.' };
}

export function verifyEntityInspection(inspection, dump) {
  requireSameSource(inspection.evidence.provenance, dump.provenance);
  if (inspection.evidence.sourceKind !== dump.sourceKind) throw new Error('Entity evidence source kind drift.');
  const main = dump.rows.find(r => r.id === dump.rootRow);
  const replay = entityStructureContract(inspection.evidence, { mainKey: dump.unit.caKey, landKey: main?.row.land_unit });
  if (JSON.stringify(replay) !== JSON.stringify(inspection.contract)) throw new Error('Entity contract differs from schema evidence replay.');
  for (const row of dump.rows.filter(r => [T.main, T.land, T.entity, T.stats, 'mounts_tables', 'battlefield_engines_tables'].includes(r.table))) {
    const matches = inspection.evidence.rows.filter(r => r.table === row.table && JSON.stringify(r.key) === JSON.stringify(row.key));
    if (!matches.length && ![T.main, T.land].includes(row.table) && replay.structure === 'INCOMPLETE') continue;
    if (matches.length !== 1 || ['sourcePack', 'path', 'tableVersion'].some(k => matches[0][k] !== row[k]) ||
      JSON.stringify(sorted(Object.entries(matches[0].row))) !== JSON.stringify(sorted(Object.entries(row.row)))) throw new Error('Entity evidence and trace raw row/pointer drift.');
  }
  return replay;
}

export function summarizeEntityStructures(contracts) {
  const paths = contracts.flatMap(c => c.paths);
  return { unitsInspected: contracts.length, entityPaths: paths.length,
    roles: Object.fromEntries([...new Set(paths.map(p => p.role))].sort().map(role => [role, paths.filter(p => p.role === role).length])),
    distinctEntityKeys: new Set(paths.map(p => p.entityKey).filter(Boolean)).size,
    distinctStatsKeys: new Set([...paths.flatMap(p => p.stats.map(s => s.key)), ...contracts.flatMap(c => c.statsOverrides.map(s => s.stats.row.key))].filter(Boolean)).size,
    rawCardinalityFieldsObserved: contracts.reduce((n, c) => n + ['numMen', 'numMounts', 'numEngines'].filter(k => c.rawCardinality[k].fact).length, 0),
    completeSingle: contracts.filter(c => c.completeness === 'COMPLETE_SINGLE_ENTITY').length,
    completeMultiRole: contracts.filter(c => c.completeness === 'COMPLETE_MULTI_ROLE').length,
    presentationUnresolved: contracts.filter(c => c.presentation.status === 'DISPLAY_RELATION_UNRESOLVED').length,
    incompleteChains: contracts.filter(c => c.completeness === 'INCOMPLETE_DB_CHAIN').length,
    ...Object.fromEntries(['count', 'hp', 'mass', 'size', 'penetration'].map(k => [`${k}Safe`, contracts.filter(c => c.presentation[`${k}Safe`]).length])) };
}
