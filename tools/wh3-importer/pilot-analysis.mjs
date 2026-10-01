import { directMappings, blockedMappings } from './normalization/policy.mjs';
import { idMappings } from './normalization/ids.mjs';
import { observationContext } from './observations/context.mjs';

export const categories = [
  'IDENTITY_AMBIGUITY', 'UNKNOWN_ENTITY_ROLE', 'MULTI_ENTITY_STRUCTURE', 'MOUNT_STRUCTURE', 'ARTILLERY_STRUCTURE',
  'UNKNOWN_MISSILE_CHAIN', 'MULTIPLE_MISSILE_WEAPONS', 'UNKNOWN_PROJECTILE_STRUCTURE', 'UNKNOWN_ABILITY', 'UNKNOWN_ATTRIBUTE',
  'ABILITY_CLASSIFICATION_CONFLICT', 'UNKNOWN_ENUM_VALUE', 'UNSUPPORTED_SIZE', 'UNSUPPORTED_RAW_SHAPE',
  'MULTI_FACTION_PERMISSION', 'NO_PRIMARY_CATALOG_MAPPING', 'MISSING_REQUIRED_JOIN', 'MULTIPLE_REQUIRED_JOIN',
  'SEMANTICS_BLOCKED', 'VALIDATION_FAILURE', 'NORMALIZED_WITH_OMISSIONS', 'NORMALIZED_CLEAN',
  'ROOT_NOT_FOUND', 'RESOURCE_LIMIT', 'SOURCE_FAILURE', 'UNMAPPED_FIELD', 'OUTSIDE_TRACE_SCOPE',
];
export function exception(sample, category, severity, fieldOrRelation, reason, evidence = [], caKey = null) {
  if (!categories.includes(category) || !['INFO', 'OMISSION', 'BLOCKING'].includes(severity)) throw new Error('Invalid exception taxonomy.');
  return { unit: sample.displayName, caKey, category, severity, fieldOrRelation, reason, evidence };
}
export function classify(exceptions, normalized, validation = []) {
  if (!normalized || validation.length || exceptions.some(e => e.severity === 'BLOCKING')) return 'BLOCKED';
  return exceptions.some(e => e.severity === 'OMISSION' && e.category !== 'SEMANTICS_BLOCKED') ? 'PARTIAL' : 'CLEAN';
}

const semanticFields = new Set(blockedMappings.map(x => x[0]));
const entityFields = ['entities.entitySize', 'entities.mass', 'defense.projectilePenetrationResistance'];
// Leaf/group paths include every Unit contract member. Array item details are
// retained in provenance; coverage evaluates the containing list once/sample.
export const fields = [...new Set([
  ...directMappings.map(x => x[0]), ...blockedMappings.map(x => x[0]), ...entityFields,
  'id', 'name', 'factionId', 'summary', 'gameVersion', 'source', 'tags', 'updatedAt', 'classification.category', 'classification.role',
  'entities.splashTargetingClass', 'entities.receivesSplashAlone', 'movement.canFly', 'movement.canRun',
  'defense.barrier', ...['physical', 'missile', 'spell', 'fire', 'ward'].map(x => `defense.resistances.${x}`),
  'melee.attackAttributes', 'missile.projectile.trajectory', 'abilities', 'passiveAbilities', 'attributes',
  'strengthsAndWeaknesses', 'sources.publicStats', 'sources.hiddenStats', 'sources.campaign',
  'terrainModifiers.terrainId', 'terrainModifiers.speedPercent', 'terrainModifiers.meleeAttackPercent', 'terrainModifiers.meleeDefensePercent',
  'campaign.recruitmentRequirements.buildingId', 'campaign.recruitmentRequirements.buildingTier',
  'campaign.recruitmentRequirements.factionId', 'campaign.recruitmentRequirements.conditionIds',
])];
export const get = (obj, field) => field.split('.').reduce((value, key) => value?.[key], obj);

export function coverageFor(result) {
  const { normalized, dump } = result;
  const c = dump ? observationContext(dump) : undefined;
  const missileRequired = !!(c?.land?.row.primary_missile_weapon || c?.engine?.row.missile_weapon || result.discovery?.evidence?.rows.some(r => r.table === 'unit_missile_weapon_junctions_tables') || c?.land?.row.primary_ammo > 0 || c?.land?.row.secondary_ammo > 0);
  const output = {};
  for (const field of fields) {
    if (!normalized || result.status === 'BLOCKED') { output[field] = { status: 'FAILED', reason: 'No validated trustworthy Unit; applicability not established.', structural: true }; continue; }
    if (field.startsWith('missile.') && !missileRequired) { output[field] = { status: 'NOT_APPLICABLE', reason: 'No primary/engine/junction missile in inspected base scope; not a global runtime absence claim.' }; continue; }
    if (field.startsWith('missile.explosion.') && c?.projectile?.row.explosion_type === '') { output[field] = { status: 'NOT_APPLICABLE', reason: 'Verified projectile explosion reference is empty.' }; continue; }
    if (field.startsWith('missile.projectile.penetration.') && c?.projectile?.row.projectile_penetration === '') { output[field] = { status: 'NOT_APPLICABLE', reason: 'Verified projectile penetration reference is empty.' }; continue; }
    const semantic = semanticFields.has(field) || ['defense.resistances.', 'terrainModifiers.', 'campaign.recruitmentRequirements.'].some(prefix => field.startsWith(prefix));
    const uncertainList = (field === 'attributes' && normalized.unmapped.some(x => x.kind === 'attribute')) || (['abilities', 'passiveAbilities'].includes(field) && normalized.unmapped.some(x => x.kind === 'ability'));
    if (uncertainList) output[field] = { status: 'UNMAPPED', reason: 'List is incomplete because CA IDs/classification are unreviewed.', structural: true };
    else if (field.startsWith('missile.') && !semantic && result.exceptions?.some(e => ['MULTIPLE_MISSILE_WEAPONS', 'UNKNOWN_PROJECTILE_STRUCTURE'].includes(e.category))) output[field] = { status: 'UNMAPPED', reason: 'Default-chain value may exist, but multiple weapon/projectile modes are not fully represented.', primaryValueMapped: get(normalized.unit, field) !== undefined, structural: true };
    else if (get(normalized.unit, field) !== undefined && !['summary', 'tags'].includes(field)) output[field] = { status: 'MAPPED', reason: 'Value present in validated conservative output.' };
    else if (semantic) output[field] = { status: 'OMITTED', reason: 'Conservative semantics gate; no derived formula approved.', semanticsBlocked: true };
    else if (['abilities', 'passiveAbilities', 'attributes'].includes(field) && !dump.rows.some(r => r.table === (field === 'attributes' ? 'unit_attributes_tables' : 'unit_abilities_tables'))) output[field] = { status: 'NOT_APPLICABLE', reason: 'No membership in bounded trace; runtime grants outside scope.' };
    else {
      const omitted = normalized.omitted.find(x => x.field === field);
      output[field] = { status: omitted ? 'OMITTED' : 'UNMAPPED', reason: omitted?.reason ?? 'No reviewed mapping in current normalizer.', structural: entityFields.includes(field) || directMappings.some(x => x[0] === field) };
    }
  }
  return output;
}

export function analyzeNormalized(sample, dump, normalized, extras) {
  const issues = [], c = observationContext(dump), caKey = dump.unit.caKey;
  const add = (category, severity, field, reason, evidence = []) => issues.push(exception(sample, category, severity, field, reason, evidence, caKey));
  const scopedCoverage = coverageFor({ normalized, dump, status: 'CLEAN' });
  for (const omitted of normalized.omitted) if (semanticFields.has(omitted.field) && scopedCoverage[omitted.field]?.semanticsBlocked) add('SEMANTICS_BLOCKED', 'OMISSION', omitted.field, omitted.reason, [{ semanticsStatus: omitted.semanticsStatus }]);
  if (c.land.row.mount) add('MOUNT_STRUCTURE', 'INFO', 'land_units.mount', 'Separate mount/rider roles retained; no aggregate chosen.', [c.land, c.mountEntity].filter(Boolean));
  if (c.land.row.engine) add('ARTILLERY_STRUCTURE', 'INFO', 'land_units.engine', 'Engine structure also occurs in melee chariots; this category is not proof of artillery firing.', [c.land, c.engine].filter(Boolean));
  if ([c.rider, c.mountEntity, c.engineEntity].filter(Boolean).length > 1) {
    add('MULTI_ENTITY_STRUCTURE', 'INFO', 'entities', 'Multiple role rows cannot be reduced to a representative entity automatically.', [c.rider, c.mountEntity, c.engineEntity].filter(Boolean));
  }
  if (entityFields.some(field => get(normalized.unit, field) === undefined)) add('UNKNOWN_ENTITY_ROLE', 'OMISSION', 'entities', 'Representative size/mass/penetration resistance is ambiguous or unavailable; roles and missing joins require review.', [c.land]);
  for (const row of dump.rows.filter(r => r.table === 'battle_entities_tables')) if (!['tiny', 'small', 'medium', 'large', 'very_large'].includes(row.row.size)) add('UNSUPPORTED_SIZE', 'OMISSION', 'battle_entities.size', 'Raw size has no Unit entity-size mapping.', [row]);
  for (const u of normalized.unmapped) add(u.reason.includes('classification') ? 'ABILITY_CLASSIFICATION_CONFLICT' : u.kind === 'ability' ? 'UNKNOWN_ABILITY' : 'UNKNOWN_ATTRIBUTE', 'OMISSION', `${u.kind}:${u.caId}`, u.reason, [u.source]);
  const temporary = { normalized, dump, status: 'CLEAN', discovery: { evidence: { rows: [] } } };
  for (const [field, value] of Object.entries(coverageFor(temporary))) {
    if (value.structural && directMappings.some(x => x[0] === field)) {
      const mapping = directMappings.find(x => x[0] === field), raw = c[mapping[1]]?.row[mapping[2]];
      add(mapping[3] === 'size' && raw !== undefined ? 'UNKNOWN_ENUM_VALUE' : 'UNSUPPORTED_RAW_SHAPE', 'OMISSION', field, value.reason, [{ rawValue: raw ?? null, sourceRow: c[mapping[1]]?.id ?? null }]);
    }
  }
  for (const issue of dump.unresolved) add(issue.reason.includes('Multiple raw rows') ? 'MULTIPLE_REQUIRED_JOIN' : issue.reason.includes('No source row') ? 'MISSING_REQUIRED_JOIN' : 'UNSUPPORTED_RAW_SHAPE', 'OMISSION', issue.field, issue.reason);
  const missileRows = extras.rows.filter(r => r.table === 'missile_weapons_tables');
  if (new Set(missileRows.map(r => r.row.key)).size > 1) add('MULTIPLE_MISSILE_WEAPONS', 'OMISSION', 'missile', 'Unit has one missile profile; raw primary/engine/override weapons are not merged. Any normalized missile values describe only the current selector.', missileRows);
  const alternates = extras.rows.filter(r => r.table === 'missile_weapons_to_projectiles_tables');
  if (alternates.length) add('UNKNOWN_PROJECTILE_STRUCTURE', 'OMISSION', 'missile_weapons_to_projectiles', 'Alternate projectile modes cannot fit one default projectile safely.', alternates);
  if ((c.land.row.primary_missile_weapon || c.engine?.row.missile_weapon || c.land.row.primary_ammo > 0 || c.land.row.secondary_ammo > 0) && !c.projectile) add('UNKNOWN_MISSILE_CHAIN', 'OMISSION', 'missile', 'Weapon reference or positive raw ammo has no unique projectile chain; do not mark missile fields not applicable or infer a weapon.', [c.land]);
  const combatPaths = new Set(['land_unit_articulated_vehicles', 'battle_entity_stats', 'projectile_shrapnels', 'projectile_homing_params', 'projectiles_scaling_damages', 'battle_vortexs']);
  for (const reference of dump.skippedReferences) if (combatPaths.has(reference.targetTable.replace(/_tables$/, ''))) add('OUTSIDE_TRACE_SCOPE', 'OMISSION', reference.field, 'Potential combat structure is outside the reviewed trace allowlist; preserved for review.', [reference]);
  return issues;
}

export function collectIds(dump, normalized) {
  if (!dump) return [];
  const out = [];
  for (const record of dump.rows.filter(r => ['unit_abilities_tables', 'unit_attributes_tables'].includes(r.table))) {
    const kind = record.table === 'unit_abilities_tables' ? 'ability' : 'attribute';
    const caId = record.row.key;
    const membershipTable = kind === 'ability' ? 'land_units_to_unit_abilites_junctions_tables' : 'unit_attributes_to_groups_junctions_tables';
    if (!dump.rows.some(r => r.table === membershipTable && r.row[kind === 'ability' ? 'ability' : 'attribute'] === caId)) continue;
    const loc = dump.rows.filter(r => r.table === 'Loc' && dump.relationships.some(e => e.direction === 'localisation' && e.from === r.id && e.to === record.id));
    const names = loc.filter(r => r.row.key === `${record.table.replace(/_tables$/, '')}_${kind === 'ability' ? 'onscreen_name' : 'bullet_text'}_${caId}`);
    out.push({ kind, caId, locName: names.length === 1 ? names[0].row.text : null, loc: loc.map(r => ({ key: r.row.key, text: r.row.text, rowId: r.id })), sourceTable: record.table, sourceRow: record.id,
      mappingExists: !!(kind === 'ability' ? idMappings.abilities[caId] : idMappings.attributes[caId] || idMappings.movement[caId]),
      unmapped: normalized?.unmapped.some(u => u.caId === caId && u.kind === kind) ?? null,
      activePassiveEvidence: kind === 'ability' ? { sourceType: record.row.source_type, specialRows: dump.rows.filter(r => r.table === 'unit_special_abilities_tables' && r.row.key === caId).map(r => ({ rowId: r.id, passive: r.row.passive })) } : null });
  }
  return out;
}

export function aggregateIds(results) {
  const map = new Map();
  for (const result of results) for (const item of result.ids ?? []) {
    const key = `${item.kind}:${item.caId}`;
    const record = map.get(key) ?? { ...item, units: [], evidence: [] };
    if (!record.units.includes(result.sample.slug)) { record.units.push(result.sample.slug); record.evidence.push({ sample: result.sample.slug, ...item }); }
    map.set(key, record);
  }
  return [...map.values()].map(r => ({ ...r, frequency: r.units.length })).sort((a, b) => b.frequency - a.frequency || a.caId.localeCompare(b.caId));
}

export function aggregateCoverage(results) {
  const byField = {};
  for (const field of fields) {
    const counts = { MAPPED: 0, OMITTED: 0, UNMAPPED: 0, NOT_APPLICABLE: 0, FAILED: 0, semanticsBlocked: 0, structuralFailure: 0 };
    for (const r of results) { const v = r.coverage[field]; counts[v.status]++; if (v.semanticsBlocked) counts.semanticsBlocked++; if (v.structural) counts.structuralFailure++; }
    byField[field] = counts;
  }
  const groups = {};
  for (const group of ['classification', 'entities', 'movement', 'defense', 'melee', 'missile', 'campaign', 'customBattle', 'abilities', 'passiveAbilities', 'attributes']) {
    const groupFields = fields.filter(f => f === group || f.startsWith(`${group}.`));
    const currentTargets = new Set([...directMappings.map(x => x[0]), ...entityFields, 'classification.category', 'abilities', 'passiveAbilities', 'attributes']);
    const counts = { applicableSamples: 0, fullyMapped: 0, allContractFieldsMapped: 0, semanticsBlocked: 0, structuralFailure: 0, unknownApplicability: 0 };
    for (const r of results) {
      if (r.status === 'BLOCKED') { counts.unknownApplicability++; counts.structuralFailure++; continue; }
      const values = groupFields.map(f => r.coverage[f]).filter(v => v.status !== 'NOT_APPLICABLE');
      if (!values.length) continue;
      counts.applicableSamples++;
      const targets = groupFields.filter(f => currentTargets.has(f)).map(f => r.coverage[f]).filter(v => v.status !== 'NOT_APPLICABLE');
      if (targets.length && targets.every(v => v.status === 'MAPPED')) counts.fullyMapped++;
      if (values.every(v => v.status === 'MAPPED')) counts.allContractFieldsMapped++;
      if (values.some(v => v.semanticsBlocked)) counts.semanticsBlocked++;
      if (values.some(v => v.structural)) counts.structuralFailure++;
    }
    groups[group] = counts;
  }
  const mappingKinds = Object.fromEntries(['DIRECT', 'GENERATED', 'CURATED'].map(kind => [kind, results.reduce((n, r) => n + (r.normalized?.provenance.fields.filter(f => f.kind === kind).length ?? 0), 0)]));
  return { denominator: results.length, byField, groups, mappingKinds, note: 'Groups count samples, columns can overlap. Fully mapped means all applicable current direct/alias targets, not all optional contract fields; allContractFieldsMapped is also recorded. BLOCKED applicability is unknown and separately counted; structuralFailure includes blocked attempts and incomplete applicable direct fields. NOT_APPLICABLE is bounded-base-scope only. currentTime/strength are diagnostic policy paths, not stored Unit fields.' };
}
