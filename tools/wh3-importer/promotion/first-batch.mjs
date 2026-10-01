import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { hotfixSnapshot, isReviewedSource } from '../reviewed-snapshots.mjs';

// One reviewed static source, not a general promotion/import policy.
export const firstProductionReview = Object.freeze({
  mainKey: 'wh_dlc01_chs_mon_dragon_ogre', landKey: 'wh_dlc01_chs_mon_dragon_ogre',
  id: 'ca_unit_wh_dlc01_chs_mon_dragon_ogre', factionId: 'warriors_of_chaos',
  militaryGroup: 'wh_main_group_chaos', name: 'Dragon Ogres',
  evidenceSha256: '40329e1e26ca6e946c9fe1f911406211dbd9ec840c097229cf7104d4fa614ba9',
  snapshotId: 'c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5',
  reference: 'tools/wh3-importer/promotion/PROMOTION.md',
});
export const evidenceHash = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const get = (object, field) => field.split('.').reduce((value, key) => value?.[key], object);
const requireGate = (condition, reason) => { if (!condition) throw new Error(`Production promotion refused: ${reason}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function leaves(value, prefix = '') {
  return object(value) || Array.isArray(value)
    ? Object.entries(value).flatMap(([key, item]) => leaves(item, prefix ? `${prefix}.${key}` : key))
    : [[prefix, value]];
}

// Check the normalizer result again at the production boundary. Uncertainty
// records stay in the source/review; their Unit paths must remain absent.
export function assertReviewedProductionResult(result, validate, factionIds, review, unmappedPolicy = null) {
  const unit = result?.unit, identity = result?.provenance?.identity;
  requireGate(result?.format === 'warhammer-vault-normalized-unit-v1' && result.mode === 'conservative' && result.sourceKind === 'ca-pack', 'not a conservative CA static result');
  requireGate(identity?.caMainUnitKey === review.mainKey && identity.caLandUnitKey === review.landKey && identity.internalId === review.id, 'exact source identity mismatch');
  requireGate(unit?.id === review.id && unit.name === review.name && unit.factionId === review.factionId, 'presentation identity mismatch');
  requireGate(identity.primaryCatalogGroup === review.militaryGroup && !result.provenance.catalog, 'not the reviewed primary static catalog affiliation');
  requireGate(unit.gameVersion === hotfixSnapshot.gameVersion && isReviewedSource(result.provenance.rawTrace, '') && isReviewedSource(result.provenance.affiliationEvidence, ''), 'unreviewed game/schema/pack snapshot');
  requireGate(result.provenance.baseValuesOnly === true, 'non-base values');
  requireGate(unmappedPolicy ? isDeepStrictEqual(result.unmapped, unmappedPolicy.expected) &&
    (result.unmapped.length === 0 || (unmappedPolicy.omittedGroups.length > 0 && unmappedPolicy.omittedGroups.every(field => get(unit, field) === undefined))) :
    result.unmapped.length === 0, 'unmapped IDs need exact retained review and complete group omission');
  requireGate(!unit.missile, 'missile promotion is outside this first batch');
  for (const group of ['classification', 'entities', 'movement', 'defense', 'melee']) requireGate(object(unit[group]), `missing required ${group} group`);
  requireGate(object(unit.melee.damage) && unit.classification.category.length > 0 && typeof unit.source === 'string' && unit.source.length > 0, 'missing damage/category/source');
  const fields = new Map(result.provenance.fields.map(entry => [entry.field, entry]));
  requireGate(fields.size === result.provenance.fields.length, 'duplicate field provenance');
  for (const entry of fields.values()) {
    requireGate(['DIRECT', 'CURATED', 'GENERATED'].includes(entry.kind), `unapproved provenance kind at ${entry.field}`);
    requireGate(entry.kind !== 'GENERATED' || entry.field === 'id', 'generated game value');
    requireGate(typeof entry.value !== 'number' || entry.kind === 'DIRECT', `non-direct numeric value at ${entry.field}`);
    requireGate(['db.pack', 'local_en.pack'].includes(entry.source?.sourcePack), `non-static source at ${entry.field}`);
    requireGate(isDeepStrictEqual(get(unit, entry.field), entry.value), `value/provenance mismatch at ${entry.field}`);
  }
  const metadata = new Set(['gameVersion', 'source', 'sources.publicStats', 'sources.hiddenStats', 'sources.campaign']);
  for (const [field, value] of leaves(unit)) {
    requireGate(value !== null && value !== undefined, `null/undefined at ${field}`);
    requireGate(typeof value !== 'number' || (Number.isFinite(value) && value >= 0), `invalid number at ${field}`);
    requireGate(!['UNVERIFIED', 'INCONCLUSIVE', 'UNRESOLVED'].includes(value), `diagnostic status at ${field}`);
    requireGate(metadata.has(field) || (field === 'summary' && value === '') || fields.has(field), `unproven field ${field}`);
  }
  for (const omitted of result.omitted) requireGate(get(unit, omitted.field) === undefined || (omitted.field === 'summary' && unit.summary === ''), `omitted field populated: ${omitted.field}`);
  for (const field of ['classification.tier', 'melee.splash.maxTargets']) {
    const value = get(unit, field);
    requireGate(value === undefined || (Number.isInteger(value) && value > 0), `invalid positive integer at ${field}`);
  }
  requireGate(validate([unit], factionIds).length === 0, 'app Unit validator rejected the production record');
}

export function assertFirstProductionResult(result, validate, factionIds) {
  return assertReviewedProductionResult(result, validate, factionIds, firstProductionReview);
}

const productionFaction = () => ({
  id: firstProductionReview.factionId, name: 'Warriors of Chaos',
  subtitle: 'Primary catalog · wh_main_group_chaos',
  description: '검토된 military permission의 기본 catalog 분류입니다. 현재 첫 production 유닛 1개만 포함하며, 전체 roster나 캠페인 모집 가능성을 뜻하지 않습니다.',
  gameVersion: hotfixSnapshot.gameVersion,
  source: 'Reviewed primary catalog alias: wh_main_group_chaos → warriors_of_chaos; promotion/PROMOTION.md', tags: [],
});

export function buildFirstProductionBatch({ evidence, units, factions, diagnosticIds, validate }) {
  const review = firstProductionReview;
  requireGate(evidenceHash(evidence) === review.evidenceSha256, 'reviewed static input hash differs; no automatic refresh');
  requireGate(evidence.format === 'warhammer-vault-first-production-source-v1' && evidence.reviewedSource.pilotStatus === 'CLEAN' && evidence.reviewedSource.candidateCount === 1, 'not the reviewed unique CLEAN pilot');
  requireGate(evidence.affiliation.factionId === review.factionId && evidence.affiliation.militaryGroup === review.militaryGroup, 'affiliation differs from review');
  requireGate(!diagnosticIds.includes(review.id), 'production/diagnostic ID collision needs an explicit identity review');
  requireGate(new Set(units.map(unit => unit.id)).size === units.length && new Set(factions.map(faction => faction.id)).size === factions.length, 'duplicate existing identity');
  const normalized = normalizeUnit(evidence.dump, { ...evidence.affiliation, permissionTrace: evidence.permissionTrace });
  const faction = productionFaction(), existingFaction = factions.find(item => item.id === faction.id);
  requireGate(!existingFaction || isDeepStrictEqual(existingFaction, faction), 'existing faction differs; will not overwrite');
  const nextFactions = existingFaction ? structuredClone(factions) : [...structuredClone(factions), faction];
  assertFirstProductionResult(normalized, validate, nextFactions.map(item => item.id));
  const unit = structuredClone(normalized.unit);
  unit.source = `CA base DB · WH3 ${unit.gameVersion} · reviewed static source · ${review.reference}`;
  unit.sources.publicStats += `; reviewed snapshot ${review.snapshotId}; schema ${hotfixSnapshot.schemaSha256}; db.pack ${hotfixSnapshot.packs['db.pack']}; local_en.pack ${hotfixSnapshot.packs['local_en.pack']}; source input SHA256 ${review.evidenceSha256}`;
  const existingUnit = units.find(item => item.id === unit.id);
  requireGate(!existingUnit || isDeepStrictEqual(existingUnit, unit), 'existing production record differs; will not overwrite');
  const nextUnits = existingUnit ? structuredClone(units) : [...structuredClone(units), unit];
  requireGate(validate(nextUnits, nextFactions.map(item => item.id)).length === 0, 'resulting production collection is invalid');
  return { units: nextUnits, factions: nextFactions, unit, normalized,
    added: { units: existingUnit ? 0 : 1, factions: existingFaction ? 0 : 1 } };
}
