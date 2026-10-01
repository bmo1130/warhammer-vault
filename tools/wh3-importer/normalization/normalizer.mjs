import { observationContext } from '../observations/context.mjs';
import { factSelectors } from '../observations/facts.mjs';
import { observations } from '../observations/index.mjs';
import { directMappings, blockedMappings, topicStatus, normalizationMode, supportedGameVersion } from './policy.mjs';
import { idMappings } from './ids.mjs';

const sizes = new Set(['tiny', 'small', 'medium', 'large', 'very_large']);
const valid = (value, type) => type === 'boolean' ? typeof value === 'boolean' : type === 'size' ? sizes.has(value) : type === 'string' ? typeof value === 'string' && value.length > 0 : typeof value === 'number' && Number.isFinite(value) && (type !== 'integer' || Number.isInteger(value));
const set = (object, field, value) => {
  const parts = field.split('.');
  for (const part of parts.slice(0, -1)) object = object[part] ??= part === 'missile' ? { projectile: {} } : {};
  object[parts.at(-1)] = value;
};

/** @returns {import('./normalizer.mjs').NormalizedUnitResult} */
export function normalizeUnit(dump, context) {
  if (dump.format !== 'warhammer-vault-wh3-raw-v1' || !['ca-pack', 'fixture'].includes(dump.sourceKind)) throw new Error('Normalizer accepts CA raw traces or explicitly synthetic fixtures, never manual references.');
  if (dump.sourceKind === 'ca-pack' && dump.unit.gameVersion !== supportedGameVersion) throw new Error('Game version is outside the reviewed normalization policy; review semantics before mapping.');
  const selectors = factSelectors(dump);
  const c = observationContext(dump, selectors), { fact } = selectors;
  const mainKey = fact(c.root, 'unit'), landKey = fact(c.land, 'key');
  if (!valid(mainKey?.value, 'string') || !valid(landKey?.value, 'string') || mainKey.value !== dump.unit.caKey || c.root.table !== 'main_units_tables' || c.land.table !== 'land_units_tables') throw new Error('A unique schema-connected main/land identity is required.');

  const permissions = context.permissionTrace;
  if (!permissions || permissions.sourceKind !== dump.sourceKind) throw new Error('Matching raw military permission evidence is required for the explicit catalog affiliation.');
  if (dump.sourceKind === 'ca-pack') {
    const packHashes = (data) => JSON.stringify(data.provenance.packs.map((pack) => [pack.file_name, pack.sha256]).sort());
    if (permissions.provenance.gameVersion !== dump.unit.gameVersion || permissions.provenance.schemaSha256 !== dump.provenance.schemaSha256 || packHashes(permissions) !== packHashes(dump)) throw new Error('Identity evidence and unit trace differ in game/schema/pack version. Re-extract both.');
  }
  const roots = permissions.rows.filter((row) => row.table === 'main_units_tables' && row.row.unit === mainKey.value);
  if (roots.length !== 1 || !/^[a-z][a-z0-9_]*$/.test(context.factionId)) throw new Error('Unique permission root and an explicit internal faction ID are required.');
  const permissionSelectors = factSelectors({ ...permissions, rootRow: roots[0].id });
  const candidates = permissions.rows.filter((row) => row.table === 'units_to_groupings_military_permissions_tables' && permissionSelectors.reachable(row) && row.row.unit === mainKey.value);
  const affiliations = candidates.filter((row) => row.row.military_group === context.militaryGroup);
  if (affiliations.length !== 1) throw new Error('The curated primary catalog group has no unique verified permission relation for this unit.');
  const affiliation = permissionSelectors.fact(affiliations[0], 'military_group');
  if (!affiliation) throw new Error('Military affiliation lacks processed schema evidence.');

  const unit = {
    id: `ca_unit_${mainKey.value}`, name: '', factionId: context.factionId, summary: '',
    gameVersion: dump.unit.gameVersion, source: `${dump.sourceKind === 'ca-pack' ? 'Current CA base DB' : 'Synthetic fixture'} via verified raw trace; no runtime/campaign effects applied`, tags: [],
    classification: { category: '' }, entities: {}, movement: {}, defense: {}, melee: { damage: {} },
  };
  const result = {
    format: 'warhammer-vault-normalized-unit-v1', mode: normalizationMode, sourceKind: dump.sourceKind, unit,
    provenance: { identity: { internalId: unit.id, caMainUnitKey: mainKey.value, caLandUnitKey: landKey.value, primaryCatalogGroup: context.militaryGroup, candidateMilitaryGroups: candidates.map((row) => row.row.military_group) }, rawTrace: dump.provenance, affiliationEvidence: permissions.provenance, fields: [], generatedMetadata: [], baseValuesOnly: true },
    facts: [], omitted: [], warnings: [{ code: 'base-values-only', reason: 'Mapped costs/stats are CA base DB values, never effective campaign or battle-session values.' }, { code: 'primary-catalog-affiliation', reason: 'factionId is an explicit primary catalog alias of one verified military group; other permissions are retained. It is not exclusive ownership/effective recruitment.' }], unmapped: [],
  };
  const omit = (field, reason, semanticsStatus = 'UNRESOLVED') => result.omitted.push({ field, kind: 'UNRESOLVED', semanticsStatus, reason });
  const mapped = (field, value, input, note, evidence = [], kind = 'DIRECT') => {
    set(unit, field, value);
    result.provenance.fields.push({ field, value, kind, source: input.source, rawValue: input.value, note, evidence });
  };
  mapped('id', unit.id, mainKey, 'Stable internal namespace alias ca_unit_<exact CA main key>; not the CA key itself.', [], 'GENERATED');
  mapped('factionId', context.factionId, affiliation, 'Explicit primary catalog alias; validated military permission membership.', [], 'CURATED');
  const locRows = dump.rows.filter((row) => row.table === 'Loc' && row.row.key === `land_units_onscreen_name_${landKey.value}` && selectors.reachable(row));
  const name = locRows.length === 1 ? fact(locRows[0], 'text') : undefined;
  if (!valid(name?.value, 'string')) throw new Error('Unique raw onscreen_name localisation is required; profile/manual names are not substitutes.');
  mapped('name', name.value, name, 'Actual CA localisation.');
  const category = fact(selectors.follow(c.land, 'category'), 'localised_name') ?? fact(c.land, 'category');
  if (valid(category?.value, 'string')) mapped('classification.category', category.value, category, 'CA DB category, not an inferred role/monster classification.');
  else omit('classification.category', 'Category unavailable; required text remains empty.');
  omit('summary', 'No description localisation is present in this bounded trace; required text remains empty.');
  fact(c.land, 'short_description_text');
  fact(c.land, 'historical_description_text');

  // Preserve original observation facts, including every prohibited formula
  // input. Serialized observations, hypotheses and manual data are ignored.
  for (const observation of observations(dump)) if (observation.source) fact(selectors.byId.get(observation.source.rowId), observation.source.field);
  for (const [field, recordName, rawField, type] of directMappings) {
    const input = fact(c[recordName], rawField);
    if (valid(input?.value, type) && (!(type === 'number' || type === 'integer') || input.value >= 0)) mapped(field, input.value, input, 'Named raw field copied without arithmetic or runtime effects.');
    else omit(field, input ? `Raw field is not a valid ${type} for this Unit field; no substitute used.` : 'Missing/ambiguous source row, named field or verified join.');
  }
  // A man-only entity is unambiguous. Mounted/artillery units never choose a
  // rider, mount, crew or engine as the representative automatically.
  const mountKey = fact(c.land, 'mount'), engineKey = fact(c.land, 'engine');
  const manOnly = mountKey?.value === '' && engineKey?.value === '';
  for (const [field, rawField, type] of [['entities.entitySize', 'size', 'size'], ['entities.mass', 'mass', 'number'], ['defense.projectilePenetrationResistance', 'projectile_penetration_resistance', 'number']]) {
    const input = manOnly ? fact(c.rider, rawField) : undefined;
    if (valid(input?.value, type) && (type !== 'number' || input.value >= 0)) mapped(field, input.value, input, 'The verified land unit has a man entity and no mount/engine; per-entity raw property.');
    else omit(field, 'Representative entity is ambiguous or its raw property is unavailable; no crew/mount/engine aggregation.');
  }
  for (const [field, topic, reason] of blockedMappings) omit(field, reason, topicStatus(topic));

  const aliases = context.idMappings ?? idMappings;
  const append = (field, id, input, note, evidence = []) => {
    if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error('Internal ability/attribute alias must be a stable snake_case ID.');
    const existing = field.split('.').reduce((object, key) => object?.[key], unit) ?? [];
    if (existing.includes(id)) return;
    const values = [...existing, id];
    mapped(`${field}.${existing.length}`, id, input, note, evidence, 'CURATED');
    // Numeric paths use arrays, not objects, for Unit's list properties.
    set(unit, field, values);
  };
  const unknown = (kind, input, reason) => result.unmapped.push({ kind, caId: input.value, reason, source: input.source });
  const group = selectors.follow(c.land, 'attribute_group');
  const attributeIds = new Set(dump.rows.filter((row) => row.table === 'unit_attributes_to_groups_junctions_tables' && row.row.attribute_group === group?.row.group_name && selectors.reachable(row)).map((row) => selectors.follow(row, 'attribute')?.id));
  const abilityIds = new Set(dump.rows.filter((row) => row.table === 'land_units_to_unit_abilites_junctions_tables' && row.row.land_unit === landKey.value && selectors.reachable(row)).map((row) => selectors.follow(row, 'ability')?.id));
  for (const record of dump.rows.filter((row) => row.table === 'unit_attributes_tables' && attributeIds.has(row.id))) {
    const input = fact(record, 'key'); if (!input) continue;
    const movement = aliases.movement[input.value];
    if (movement && ['movement.canFly', 'movement.canRun', 'movement.canSkirmish'].includes(movement.field) && typeof movement.value === 'boolean') mapped(movement.field, movement.value, input, 'Explicit attribute-to-structured-state mapping; no duplicate generic attribute.', [], 'CURATED');
    else if (aliases.attributes[input.value]) append('attributes', aliases.attributes[input.value], input, 'Explicit CA attribute alias.');
    else unknown('attribute', input, 'No reviewed CA-to-internal attribute mapping.');
  }
  for (const record of dump.rows.filter((row) => row.table === 'unit_abilities_tables' && abilityIds.has(row.id))) {
    const input = fact(record, 'key'); if (!input) continue;
    const alias = aliases.abilities[input.value];
    if (!alias) { unknown('ability', input, 'No reviewed CA-to-internal ability mapping.'); continue; }
    const type = fact(record, 'source_type');
    const special = dump.rows.filter((row) => row.table === 'unit_special_abilities_tables' && row.row.key === input.value && selectors.reachable(row));
    const passive = special.length === 1 ? fact(special[0], 'passive') : undefined;
    if (!['active', 'passive'].includes(type?.value) || typeof passive?.value !== 'boolean' || passive.value !== (type.value === 'passive')) { unknown('ability', input, 'Active/passive classification missing, ambiguous or conflicting.'); continue; }
    append(passive.value ? 'passiveAbilities' : 'abilities', alias, input, 'Explicit ability alias and agreeing raw active/passive flags; phase effects not applied.', [type, passive]);
  }
  const siege = fact(c.root, 'can_siege');
  if (siege?.value === true) append('attributes', 'siege_attacker', siege, 'Verified main-unit siege-attacker flag.');
  fact(c.weapon, 'ignition_amount');
  const magical = fact(c.weapon, 'is_magical');
  if (magical?.value === true) append('melee.attackAttributes', 'magical', magical, 'Verified magical melee weapon flag.');
  for (const field of ['movement.canFly', 'movement.canRun']) if (!result.provenance.fields.some((entry) => entry.field === field)) omit(field, 'No positive reviewed attribute evidence; absence never implies false/true.');
  if (result.unmapped.length) result.warnings.push({ code: 'unmapped-ids', reason: `${result.unmapped.length} source IDs/classifications remain unmapped; raw facts and sources retained.` });
  unit.sources = {
    publicStats: unit.source + '; public fields: land_units, armour/shield, melee_weapons and verified projectile/explosion rows',
    hiddenStats: unit.source + '; hidden fields: unambiguous battle_entity properties, weapon splash, projectile calibration/reload/penetration',
    campaign: unit.source + '; main_units recruitment_cost/upkeep_cost/create_time and multiplayer_cost are base values only',
  };
  result.provenance.generatedMetadata = [
    { field: 'gameVersion', value: unit.gameVersion, origin: 'rawTrace.unit.gameVersion (executable version resource)' },
    { field: 'tags', value: [], origin: 'Required empty display-tag container; not evidence of no CA attributes' },
    ...['source', 'sources.publicStats', 'sources.hiddenStats', 'sources.campaign'].map((field) => ({ field, value: field.split('.').reduce((object, key) => object[key], unit), origin: 'Description of this raw trace/group; field-level sources are in provenance.fields' })),
  ];
  result.facts = [...selectors.facts.values(), ...permissionSelectors.facts.values()];
  return result;
}
