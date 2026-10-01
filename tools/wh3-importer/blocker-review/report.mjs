export function pilotMetrics(manifest, exceptions, coverage) {
  const issues = exceptions.issues;
  const structural = issues.filter(e => e.severity === 'OMISSION' && e.category !== 'SEMANTICS_BLOCKED');
  return { counts: manifest.counts, identityAmbiguity: issues.filter(e => e.category === 'IDENTITY_AMBIGUITY').length,
    structuralOmissionEvents: structural.length, structuralOmissionUnits: new Set(structural.map(e => e.unit)).size,
    unknownEntityRole: issues.filter(e => e.category === 'UNKNOWN_ENTITY_ROLE').length,
    unknownMissileChain: issues.filter(e => e.category === 'UNKNOWN_MISSILE_CHAIN').length,
    multipleMissileWeapons: issues.filter(e => e.category === 'MULTIPLE_MISSILE_WEAPONS').length,
    missileStructuralEvents: structural.filter(e => e.fieldOrRelation.startsWith('missile') || ['UNKNOWN_MISSILE_CHAIN', 'MULTIPLE_MISSILE_WEAPONS', 'UNKNOWN_PROJECTILE_STRUCTURE'].includes(e.category)).length,
    provenance: coverage.mappingKinds, validationFailures: issues.filter(e => e.category === 'VALIDATION_FAILURE').length,
    semanticsBlocked: issues.filter(e => e.category === 'SEMANTICS_BLOCKED').length };
}

export function comparePilots(before, after, reviews) {
  return { before, after, originalPilotMetricsReclassified: false,
    identityReview: Object.fromEntries(['A', 'B', 'C'].map(k => [k, reviews.identities.filter(r => r.classification === k).length])),
    catalogIdentity: { scope: 'Nine ambiguous sample groups; candidate classification is independent of Unit import outcomes.',
      resolvedSamples: reviews.identities.filter(r => r.catalogIdentity?.policyResolution === 'RESOLVED').length,
      unresolvedSamples: reviews.identities.filter(r => r.catalogIdentity?.policyResolution !== 'RESOLVED').length,
      retainedCandidates: reviews.identities.reduce((n, r) => n + (r.catalogIdentity?.candidates.length ?? 0), 0),
      resolvedCandidates: reviews.identities.reduce((n, r) => n + (r.catalogIdentity?.resolvedCandidates ?? 0), 0),
      unresolvedCandidates: reviews.identities.reduce((n, r) => n + (r.catalogIdentity?.unresolvedCandidates ?? r.candidates.length), 0),
      unitImportsResolved: 0 },
    additionalEvidence: reviews.structures.map(r => ({ sample: r.sample.displayName, attachmentSlots: r.entityContract.attachments.length,
      riderMissilePaths: r.missileContract.paths.length, missileSourceStatus: r.missileContract.status,
      distinctRiderWeapons: [...new Set(r.missileContract.paths.map(p => p.weaponKey))], unitMissileComplete: false })),
    note: 'Baseline and unmodified pilot rerun are preserved. Reviewed after metrics add newly discovered rider-weapon completeness exceptions; they do not erase earlier omissions or emit new Unit values.' };
}

export function renderReview(report) {
  const lines = ['# DB-only blocker review', '', 'No game execution, root selection, derived formula, app-data write or full import.', '',
    '| Sample | Identity class | Root candidates | Selected |', '| --- | --- | --- | --- |',
    ...report.identities.map(r => `| ${r.sample.displayName} | ${r.classification} | ${r.candidates.map(c => c.mainKey).join('; ')} | ${r.selectedKey ?? 'none'} |`),
    '', '## Explicit catalog contexts (classification only)',
    '| Source main key | Policy status | Catalog context | Classification |', '| --- | --- | --- | --- |',
    ...report.identities.flatMap(r => (r.catalogIdentity?.candidates ?? []).map(c => `| ${c.source.mainKey} | ${c.policyStatus} | ${c.presentations.map(p => p.contextId).join('; ') || 'unresolved'} | ${c.presentations.map(p => p.classification).join('; ') || c.reasons.join('; ')} |`)),
    '', '## Structures', ...report.structures.map(r => `- ${r.sample.displayName}: ${r.entityContract.attachments.length} DB attachment slots; ${r.missileContract.paths.length} missile paths; ${r.missileContract.status}. Display values remain omitted.`),
    '', '## Before / after', '```json', JSON.stringify(report.comparison, null, 2), '```', '',
    '## Runtime boundary', '- Confirm display entity counts/scale and damage/loss allocation separately from raw role slots.', '- Dread Saurian: observe primary/secondary ammo consumption and simultaneous/melee firing.', '- Free Company: compare skill-only, ritual-only, both, and neither; establish precedence.', '- Campaign/scripted availability of variants is not implied by static permission or building memberships.', '',
  ];
  return lines.join('\n');
}
