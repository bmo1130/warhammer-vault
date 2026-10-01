import { EvidenceProbe, requireSameSource, rawFact } from './evidence.mjs';
import { classifyCatalogCandidates } from '../catalog-identity/policy.mjs';

export async function inspectIdentity(source, result) {
  requireSameSource(source.metadata, result.discovery.evidence.provenance);
  const p = new EvidenceProbe(source);
  await p.select('main_units_tables', 'unit', result.discovery.candidates.map(c => c.mainKey));
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  for (const [table, field, target] of [
    ['units_to_groupings_military_permissions_tables', 'unit', 'main_units_tables'],
    ['units_custom_battle_permissions_tables', 'unit', 'main_units_tables'],
    ['units_to_exclusive_faction_permissions_tables', 'key', 'main_units_tables'],
    ['unit_set_to_unit_junctions_tables', 'unit_record', 'main_units_tables'],
    ['unit_recruitment_source_overrides_tables', 'unit', 'main_units_tables'],
    ['building_units_allowed_tables', 'unit', 'main_units_tables'],
    ['unit_variants_tables', 'unit', 'land_units_tables'],
  ]) await p.reverse(table, field, target);
  await p.forward('units_custom_battle_permissions_tables', 'faction', 'factions_tables');
  // Bounded context evidence: spawning references point to land identity, not
  // automatically to a canonical main root. Preserve raw spawn conditions.
  await p.reverse('unit_special_abilities_tables', 'spawned_unit', 'land_units_tables');
  // No reverse traversal from a group to all factions: only explicitly selected
  // custom-battle faction records are inspected.
  const evidence = p.artifact();
  const candidates = result.discovery.candidates.map(candidate => {
    const root = p.rows('main_units_tables').find(r => r.row.unit === candidate.mainKey);
    return { ...candidate,
      stableIdentity: { mainKey: candidate.mainKey, landKey: candidate.landKey, localisationKey: candidate.localisation.key },
      flags: Object.fromEntries(['is_renown', 'in_encyclopedia', 'caste', 'ui_unit_group_land', 'recruitment_cost', 'multiplayer_cost', 'campaign_cap', 'multiplayer_cap'].map(f => [f, rawFact(evidence, root, f)])),
      customBattle: p.rows('units_custom_battle_permissions_tables').filter(r => r.row.unit === candidate.mainKey),
      factionRestrictions: p.rows('units_to_exclusive_faction_permissions_tables').filter(r => r.row.key === candidate.mainKey),
      buildingMembership: p.rows('building_units_allowed_tables').filter(r => r.row.unit === candidate.mainKey),
      visualVariants: p.rows('unit_variants_tables').filter(r => r.row.unit === candidate.landKey),
      canonicalProposal: null,
    };
  });
  return { sample: result.sample, ...assessIdentity(candidates, evidence.issues), candidates, evidence,
    catalogIdentity: classifyCatalogCandidates(candidates, evidence),
    catalogDecision: 'Exact-key editorial contexts classified separately; no name-based canonical root selected and no Unit materialized.',
    runtimeBoundary: 'Effective recruitment, scripted grants and in-session availability are not established by static memberships.' };
}

export function assessIdentity(candidates, issues = []) {
  const identity = candidates.map(c => c.mainKey);
  if (issues.length || !candidates.length || new Set(identity).size !== identity.length || candidates.some(c => !c.landKey || !c.localisation?.key)) return { classification: 'C', reason: 'Evidence is incomplete/inconsistent; more source inspection and, if unavailable in DB, runtime identity verification is required.', selectedKey: null };
  if (candidates.length === 1) return { classification: 'A', reason: 'Unique exact-localisation, schema-connected root in this source snapshot; no variant preference applied.', selectedKey: candidates[0].mainKey };
  return { classification: 'B', reason: 'DB distinguishes stable main roots but does not prescribe one global canonical root for a shared display name. A scoped, explicit catalog decision is required.', selectedKey: null };
}

// Counterexample report only. These predicates are NEVER used to select a root.
export function auditIdentityRules(reviews, normalResults) {
  const inputs = [...reviews.map(r => ({ sample: r.sample.displayName, candidates: r.candidates })), ...normalResults.filter(r => r.discovery?.candidates.length === 1).map(r => ({ sample: r.sample.displayName, candidates: r.discovery.candidates }))];
  const predicates = {
    positiveRecruitment: c => typeof c.main.recruitment_cost === 'number' && c.main.recruitment_cost > 0,
    encyclopedia: c => c.main.in_encyclopedia === true,
    hasPermission: c => c.permissionGroups.length > 0,
    nonCampaignCustomBattle: c => (c.customBattle ?? []).some(r => r.row.campaign_exclusive === false),
  };
  return Object.entries(predicates).map(([rule, predicate]) => ({ rule, approved: false,
    limitation: rule === 'nonCampaignCustomBattle' ? 'Custom-battle evidence was collected for the nine ambiguous names only. A custom-battle view is not a general campaign catalog.' : 'Cost, encyclopedia visibility and permissions are not universal canonical identity policies.',
    samples: inputs.filter(x => rule !== 'nonCampaignCustomBattle' || x.candidates.every(c => Array.isArray(c.customBattle))).map(x => ({ sample: x.sample, survivingKeys: x.candidates.filter(predicate).map(c => c.mainKey), rejectedKeys: x.candidates.filter(c => !predicate(c)).map(c => c.mainKey), erasesUniqueRoot: x.candidates.length === 1 && !predicate(x.candidates[0]) })) }));
}
