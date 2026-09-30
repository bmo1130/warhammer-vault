// Return a diagnostic wrapper, never mutate the preserved pilot or normalize
// additional raw stats. This prevents newly found rider weapons from being
// silently described as complete default-weapon coverage.
export function applyReviewOverlay(results, structures) {
  return results.map(result => {
    const structure = structures.find(s => s.sample.slug === result.sample.slug);
    const next = { ...result, exceptions: [...result.exceptions], productionEligible: false };
    if (!structure) return next;
    const contract = structure.missileContract;
    next.additionalReview = { entityContract: structure.entityContract.format, missileSourceStatus: contract.status, unitMissileComplete: false };
    const keys = [...new Set(contract.weapons.map(w => w.key))];
    if (contract.paths.length && keys.length > 1) {
      next.exceptions.push({ unit: result.sample.displayName, caKey: result.dump.unit.caKey, category: 'MULTIPLE_MISSILE_WEAPONS', severity: 'OMISSION', fieldOrRelation: 'missile',
        reason: 'Additional schema-connected autonomous rider weapon(s) are not represented by the current Unit missile block. Original omissions remain; no derived/default replacement values emitted.',
        evidence: [{ weapons: keys, riderPaths: contract.paths, evidenceFormat: structure.evidence.format }] });
      if (next.status === 'CLEAN') next.status = 'PARTIAL';
    }
    return next;
  });
}
