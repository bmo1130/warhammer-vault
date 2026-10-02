import { isDeepStrictEqual } from 'node:util';
import { reviewPartialCandidates, reviewArtifact, partialSourceSha256 } from './partial-review.mjs';
import { assertReviewedProductionResult, evidenceHash } from './first-batch.mjs';
import { hotfixSnapshot } from '../reviewed-snapshots.mjs';

// Separate explicit admissions; neither uses a pilot-status filter.
export const partialBatchSlugs = Object.freeze(['sample-04','sample-05','sample-17','sample-22']);
export const deferredBatchSlugs = Object.freeze(['sample-01','sample-08','sample-09','sample-21','sample-16']);
export const committedPartialReviewSha256 = 'dfec6a1bb671e3031cfaaf61786c6b78179ef53d022cde2e0fe3a87c573b49d0';
export const ratlingMissileFields = Object.freeze([
  'missile.range','missile.projectile.baseDamage','missile.projectile.armorPiercingDamage',
  'missile.projectile.bonusVsLarge','missile.projectile.bonusVsInfantry','missile.projectile.shotsPerVolley',
  'missile.accuracy.calibrationDistance','missile.accuracy.calibrationArea','missile.reload.baseTime',
  'missile.projectile.penetration.resistanceBudget',
]);
const requireGate = (condition, reason) => { if(!condition) throw new Error(`Partial production refused: ${reason}`); };
function faction(id,name,group) {
  return {id,name,subtitle:`Primary catalog · ${group}`,
    description:'검토된 military permission의 기본 catalog 분류입니다. 승인된 production 부분집합만 포함하며, 전체 roster나 캠페인 모집 가능성을 뜻하지 않습니다.',
    gameVersion:hotfixSnapshot.gameVersion, source:`Reviewed primary catalog alias: ${group} → ${id}; promotion/PARTIAL_REVIEW.md`,tags:[]};
}
const factionAdditions=[faction('empire','Empire','wh_main_group_empire'),faction('skaven','Skaven','wh2_main_skv')];

function buildReviewedBatch({evidence,diagnostics,units,factions,validate,committedReview},slugs,additions) {
  requireGate(evidenceHash(evidence)===partialSourceSha256,'pinned source differs');
  const reviews=reviewPartialCandidates(evidence,diagnostics);
  if(slugs===deferredBatchSlugs) {
    requireGate(committedReview && evidenceHash(committedReview)===committedPartialReviewSha256,'committed review differs; no automatic refresh');
    requireGate(isDeepStrictEqual(reviewArtifact(reviews,evidence.contextInventory),committedReview),'source replay differs from committed review');
  }
  requireGate(new Set(units.map(u=>u.id)).size===units.length && new Set(factions.map(f=>f.id)).size===factions.length,'duplicate existing identity');
  const nextUnits=structuredClone(units), nextFactions=structuredClone(factions), admitted=[];
  for(const addition of additions) {
    const existing=nextFactions.find(f=>f.id===addition.id);
    requireGate(!existing || isDeepStrictEqual(existing,addition),'existing faction differs; will not overwrite');
    if(!existing) nextFactions.push(addition);
  }
  for(const slug of slugs) {
    const candidate=reviews.find(c=>c.slug===slug);
    requireGate(candidate && !diagnostics.entries.some(d=>d.id===candidate.unit.id),'exact diagnostic connection required before shared production admission');
    requireGate(candidate.overall==='PROMOTABLE_WITH_OMISSIONS','candidate is outside reviewed eligibility');
    const review={mainKey:candidate.identity.caMainUnitKey,landKey:candidate.identity.caLandUnitKey,id:candidate.unit.id,
      name:candidate.name,factionId:candidate.affiliation.factionId,militaryGroup:candidate.affiliation.militaryGroup};
    const omittedGroups=candidate.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field);
    assertReviewedProductionResult(candidate.normalized,validate,nextFactions.map(f=>f.id),review,
      {expected:candidate.remainingUnmapped,omittedGroups},
      slugs===deferredBatchSlugs && slug==='sample-16' ? ratlingMissileFields : null);
    requireGate(!candidate.composite || Object.keys(candidate.unit.entities).length===0,'composite representative must be absent');
    const unit=structuredClone(candidate.unit);
    unit.source=`CA base DB · WH3 ${unit.gameVersion} · reviewed field subset · tools/wh3-importer/promotion/PARTIAL_REVIEW.md#${slug}`;
    unit.sources.publicStats+=`; pinned PARTIAL source SHA256 ${partialSourceSha256}; original ${candidate.source.reference} SHA256 ${candidate.source.sha256}; omissions reviewed separately; incomplete optional ID groups omitted, not absent in-game`;
    const existing=nextUnits.find(u=>u.id===unit.id);
    requireGate(!existing || isDeepStrictEqual(existing,unit),'existing Unit differs; will not overwrite');
    if(!existing) nextUnits.push(unit);
    admitted.push({slug,unit,remainingUnmapped:candidate.remainingUnmapped,withdrawals:candidate.withdrawals});
  }
  requireGate(validate(nextUnits,nextFactions.map(f=>f.id)).length===0,'resulting collection validation failed');
  return {units:nextUnits,factions:nextFactions,admitted,added:{units:nextUnits.length-units.length,factions:nextFactions.length-factions.length}};
}

export function buildPartialProductionBatch(options) {
  return buildReviewedBatch(options,partialBatchSlugs,factionAdditions);
}

export function buildDeferredProductionBatch(options) {
  return buildReviewedBatch(options,deferredBatchSlugs,[faction('bretonnia','Bretonnia','wh_main_group_bretonnia')]);
}
