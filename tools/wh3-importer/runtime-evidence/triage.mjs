import { digest, stable } from './contract.mjs';

export const BUCKETS = Object.freeze(['RUNTIME_REQUIRED', 'STATIC_DB_FOLLOWUP', 'POLICY_REQUIRED', 'MAPPING_REQUIRED', 'OUT_OF_SCOPE', 'BLOCKED_UNKNOWN']);
export function bucketFor({ category = '', field = '', reason = '', evidence = [] }) {
  if (['IDENTITY_AMBIGUITY', 'NO_PRIMARY_CATALOG_MAPPING', 'MULTI_FACTION_PERMISSION'].includes(category)) return 'POLICY_REQUIRED';
  if (category === 'UNKNOWN_ENUM_VALUE' && Array.isArray(evidence) && evidence.some(e => e.rawValue === '')) return 'POLICY_REQUIRED';
  if (['UNKNOWN_ABILITY', 'UNKNOWN_ATTRIBUTE', 'UNKNOWN_ENUM_VALUE', 'UNSUPPORTED_SIZE'].includes(category)) return 'MAPPING_REQUIRED';
  if (['ABILITY_CLASSIFICATION_CONFLICT', 'MISSING_REQUIRED_JOIN', 'MULTIPLE_REQUIRED_JOIN', 'ROOT_NOT_FOUND', 'SOURCE_FAILURE', 'RESOURCE_LIMIT', 'ENTITY_STRUCTURE_INCOMPLETE', 'INCOMPLETE_MISSILE_SOURCE_GRAPH', 'UNKNOWN_MISSILE_CHAIN'].includes(category)) return 'STATIC_DB_FOLLOWUP';
  if (['ENTITY_PRESENTATION_UNRESOLVED', 'MISSILE_PRESENTATION_UNRESOLVED', 'MULTIPLE_MISSILE_WEAPONS', 'UNKNOWN_ENTITY_ROLE', 'MULTI_ENTITY_STRUCTURE', 'MOUNT_STRUCTURE', 'ARTILLERY_STRUCTURE'].includes(category)) return 'RUNTIME_REQUIRED';
  if (category === 'VALIDATION_FAILURE') return 'BLOCKED_UNKNOWN';
  if (/No positive reviewed attribute evidence/.test(reason)) return 'STATIC_DB_FOLLOWUP';
  if (/No reviewed mapping in current normalizer/.test(reason)) return 'MAPPING_REQUIRED';
  if (/single-profile presentation|multiple weapon\/projectile modes/.test(reason)) return 'RUNTIME_REQUIRED';
  if (['missile.projectile.ignoresShields', 'defense.projectilePenetrationResistance'].includes(field)) return 'RUNTIME_REQUIRED';
  if (['summary'].includes(field) || /description localisation|No schema-backed|No raw fact|missing.*(?:row|reference|chain)/i.test(reason)) return 'STATIC_DB_FOLLOWUP';
  if (['tags', 'updatedAt', 'strengthsAndWeaknesses', 'missile.strength'].includes(field) || /^sources\./.test(field)) return 'OUT_OF_SCOPE';
  if (['campaign.unitCap', 'terrainModifiers', 'classification.category', 'classification.role'].includes(field)) return 'POLICY_REQUIRED';
  if (/alias|unknown enum|unmapped.*(?:ability|attribute)|valid size|valid trajectory/i.test(reason) || ['abilities', 'passiveAbilities', 'attributes', 'melee.splash.maxTargetSize', 'missile.projectile.trajectory', 'entities.splashTargetingClass'].includes(field)) return 'MAPPING_REQUIRED';
  if (category === 'SEMANTICS_BLOCKED' || /^(entities\.|movement\.(speed|groundSpeed|chargeSpeed)|missile\.(ammunition|accuracy|reload)|defense\.resistances|campaign\.recruitmentRequirements)/.test(field) || /runtime|display|effective|activation|override|count|HP|health|pool|casualty|unit.size|flaming/i.test(reason)) return 'RUNTIME_REQUIRED';
  if (category === 'OUTSIDE_TRACE_SCOPE') return 'STATIC_DB_FOLLOWUP';
  return 'BLOCKED_UNKNOWN';
}
const next = {
  RUNTIME_REQUIRED: 'Collect scoped observation jobs; retain withheld fields until separately reviewed resolution.', STATIC_DB_FOLLOWUP: 'Follow the explicit schema/localisation relation in a separate bounded review.',
  POLICY_REQUIRED: 'Review catalog/presentation scope or exact context request; do not use runtime to choose editorial policy.', MAPPING_REQUIRED: 'Review exact CA ID/enum and existing localisation; propose an internal mapping without guessing gameplay semantics.',
  OUT_OF_SCOPE: 'Leave omitted until the Unit schema/editorial scope needs this field.', BLOCKED_UNKNOWN: 'Investigate the recorded evidence and classify before admission.',
};
export function generateTriage(channels, index) {
  const items = [], backlog = new Map();
  for (const source of channels) {
    const r = source.value, n = r.normalized;
    const identity = { sourceMainKey: r.request?.mainKey ?? r.dump?.unit.caKey ?? null, contextId: r.request?.contextId ?? null,
      sampleId: r.sample?.slug ?? source.file, displayName: r.sample?.displayName ?? r.dump?.unit.displayName ?? null };
    function add(channel, category, field, reason, evidence) {
      const entry = { channel: `${source.channel}/${channel}`, artifact: source.file, identity, category, field, reason, evidence };
      entry.bucket = bucketFor(entry); entry.nextAction = next[entry.bucket]; entry.id = digest(entry); items.push(entry);
    }
    for (const o of n?.omitted ?? []) add('omission', o.semanticsStatus === 'BLOCKED' ? 'SEMANTICS_BLOCKED' : 'OMITTED_FIELD', o.field, o.reason, o);
    for (const u of n?.unmapped ?? []) add('unmapped', u.kind === 'ability' ? 'UNKNOWN_ABILITY' : u.kind === 'attribute' ? 'UNKNOWN_ATTRIBUTE' : 'UNMAPPED_ID', u.field ?? u.kind, u.reason ?? 'Exact CA ID has no internal mapping.', u);
    for (const e of r.exceptions ?? []) if (!['INFO'].includes(e.severity) && !['NORMALIZED_CLEAN', 'NORMALIZED_WITH_OMISSIONS'].includes(e.category)) add('exception', e.category, e.fieldOrRelation ?? '', e.reason, e.evidence);
    for (const [field, c] of Object.entries(r.coverage ?? {})) if (['OMITTED', 'UNMAPPED', 'FAILED'].includes(c.status)) {
      // Identity failure is the dependency for unattempted fields, not evidence
      // that every stat/enum separately needs a runtime or mapping investigation.
      const identityBlocked = c.status === 'FAILED' && r.exceptions?.some(e => e.category === 'IDENTITY_AMBIGUITY');
      add('coverage', identityBlocked ? 'IDENTITY_AMBIGUITY' : c.semanticsBlocked ? 'SEMANTICS_BLOCKED' : c.status, field, c.reason, { ...c, dependency: identityBlocked ? 'NAME_ONLY_IDENTITY_BLOCKED' : null });
    }
    for (const id of source.ids ?? []) if (id.unmapped || !id.mappingExists) {
      const key = stable([id.kind, id.caId]);
      if (!backlog.has(key)) backlog.set(key, { kind: id.kind, caId: id.caId, internalId: null, localisationAvailable: !!id.loc?.some(l => l.text), localisation: id.loc ?? [],
        activePassiveEvidence: id.activePassiveEvidence ?? null, gameplaySemantics: 'NOT_INFERRED_FROM_LOCALISATION', units: [], status: id.loc?.some(l => l.text) ? 'LABEL_AVAILABLE_MAPPING_REVIEW_REQUIRED' : 'STATIC_LOCALISATION_FOLLOWUP_REQUIRED', productionMappingAdded: false });
      backlog.get(key).units.push(identity);
    }
  }
  // Separate sidecar semantic facets from omission events; path multiplicity is
  // not a volley/model multiplier. These events remain visible even when a field is absent.
  for (const s of index.subjects) {
    for (const [kind, facets] of [['entity', s.entity?.runtime], ['missileAmmo', s.missile?.ammoSemantics]]) for (const [field, status] of Object.entries(facets ?? {})) if (status === 'UNRESOLVED') {
      const entry = { channel: 'SIDECAR/facet', artifact: s.staticArtifacts[0].file, identity: { sourceMainKey: s.sourceMainKey, contextId: s.contextId }, category: 'RUNTIME_FACET', field: `${kind}.${field}`, reason: 'Static graph does not confirm player-facing/runtime semantics.', evidence: status, bucket: 'RUNTIME_REQUIRED', nextAction: next.RUNTIME_REQUIRED };
      entry.id = digest(entry); items.push(entry);
    }
    for (const p of s.missile?.paths ?? []) if (p.activation?.placement !== 'STATIC_PRIMARY') {
      const entry = { channel: 'SIDECAR/activation', artifact: s.staticArtifacts[0].file, identity: { sourceMainKey: s.sourceMainKey, contextId: s.contextId }, category: 'RUNTIME_ACTIVATION', field: 'missile.activation', reason: 'Path existence does not confirm active/precedence/combination.', evidence: { pathId: p.pathId, activation: p.activation }, bucket: 'RUNTIME_REQUIRED', nextAction: next.RUNTIME_REQUIRED };
      entry.id = digest(entry); items.push(entry);
    }
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  const buckets = Object.fromEntries(BUCKETS.map(b => [b, { count: items.filter(x => x.bucket === b).length,
    representativeFields: [...new Set(items.filter(x => x.bucket === b).map(x => x.field))].sort(),
    affectedUnits: [...new Set(items.filter(x => x.bucket === b).map(x => stable(x.identity)))].sort().map(x => JSON.parse(x)), nextAction: next[b] }]));
  const mappingProposals = [...backlog.values()].sort((a, b) => stable([a.kind, a.caId]).localeCompare(stable([b.kind, b.caId])));
  for (const p of mappingProposals) p.units = [...new Map(p.units.map(x => [stable(x), x])).values()].sort((a, b) => stable(a).localeCompare(stable(b)));
  const enums = new Map();
  for (const event of items.filter(x => x.category === 'UNKNOWN_ENUM_VALUE')) for (const fact of event.evidence ?? []) if (Object.hasOwn(fact, 'rawValue')) {
    const key = stable([event.field, fact.rawValue]);
    if (!enums.has(key)) enums.set(key, { field: event.field, rawValue: fact.rawValue, status: fact.rawValue === '' ? 'EMPTY_SENTINEL_POLICY_REQUIRED' : 'EXACT_RAW_ENUM_REVIEW_REQUIRED', internalValue: null, sources: [] });
    enums.get(key).sources.push({ identity: event.identity, sourceRow: fact.sourceRow });
  }
  const enumBacklog = [...enums.values()].sort((a, b) => stable([a.field, a.rawValue]).localeCompare(stable([b.field, b.rawValue])));
  for (const e of enumBacklog) e.sources.sort((a, b) => stable(a).localeCompare(stable(b)));
  return { format: 'warhammer-vault-unresolved-triage-v1', denominator: 'All omission, unmapped, non-info exception, omitted/unmapped/failed coverage events present in 24 name + 19 context + 25 entity + 24 missile diagnostic results; plus inspected sidecar runtime facets. Channels deliberately overlap; counts are events, not unique bugs.',
    total: items.length, channelCounts: Object.fromEntries([...new Set(items.map(x => x.channel))].sort().map(c => [c, items.filter(x => x.channel === c).length])), buckets, items, mappingProposals, enumBacklog, productionModified: false };
}
export function triageMarkdown(report) {
  return `# Unresolved triage\n\n${report.denominator}\n\n| Bucket | Events | Next action |\n| --- | ---: | --- |\n${Object.entries(report.buckets).map(([k, v]) => `| ${k} | ${v.count} | ${v.nextAction} |`).join('\n')}\n\nTotal: ${report.total}. Exact-ID mapping proposals: ${report.mappingProposals.length}. No production mapping is added. See JSON for every event, source and affected unit.\n`;
}
export function admissionDraft(index, triage, productionFactionIds) {
  const subjects = index.subjects.map(s => ({ sourceMainKey: s.sourceMainKey, contextId: s.contextId, productionEligible: false,
    conditions: { identityResolved: s.contextId !== null, sourceValidated: true, diagnosticValidationPassed: true,
      requiredFactionRegistered: productionFactionIds.includes(s.factionId), noIncompleteEntityGraph: !!s.entity && s.entity.structure !== 'INCOMPLETE',
      noIncompleteMissileGraph: !!s.missile && s.missile.completeness !== 'INCOMPLETE_DB_CHAIN',
      requiredPresentationSemanticsResolved: false, noBlockingUnknowns: false, admissionPolicyApproved: false },
    runtimeRequirement: s.entity?.completeness === 'COMPLETE_SINGLE_ENTITY' && ['NO_MISSILE_PATH', 'COMPLETE_STATIC_SINGLE'].includes(s.missile?.completeness) ? 'NO_COMPOSITE_RUNTIME_REQUIREMENT; optional field omissions still require approved policy' : 'COMPOSITE_OR_MISSILE_RUNTIME_CONFIRMATION_OR_EXPLICIT_WITHHELD_PRESENTATION_POLICY_REQUIRED' }));
  return { format: 'warhammer-vault-admission-gates-draft-v1', status: 'DRAFT_NOT_APPROVED', productionEligible: false, subjects,
    omissionPolicy: { allowedCandidates: ['tags', 'updatedAt', 'strengthsAndWeaknesses', 'sources.*'], requiredDecision: 'Optional omitted fields need an explicit admission policy; zero omissions is not inherently required.',
      blocking: ['identity ambiguity in exact mode', 'snapshot drift', 'validation failure', 'incomplete entity/missile graph', 'unreviewed mandatory field mappings/presentation semantics'],
      runtimeEvidence: 'A simple single MAN source need not supply composite evidence. A runtime proposal never changes a production Unit.' },
    fullImportGate: { allowed: false, conditions: { sourceContextCoverageReviewed: false, productionFactionRegistryReady: subjects.every(s => s.conditions.requiredFactionRegistered),
      schemaGamePackConsistentInReviewedScope: true, exactContextIdentityResolved: subjects.filter(s => s.contextId !== null).every(s => s.conditions.identityResolved),
      allRequiredEntityMissileGraphsComplete: subjects.every(s => s.conditions.noIncompleteEntityGraph && s.conditions.noIncompleteMissileGraph),
      complexRuntimeSemanticsPolicyApproved: false, validatorPassedForDiagnosticScope: true, productionAdmissionPolicyPassed: false },
      reason: 'Bounded diagnostic evidence is not whole-catalog coverage or production admission.' }, triageEvents: triage.total };
}
