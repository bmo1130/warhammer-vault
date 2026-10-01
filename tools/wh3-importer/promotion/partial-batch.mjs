import { isDeepStrictEqual } from 'node:util';
import { reviewPartialCandidates, partialSourceSha256 } from './partial-review.mjs';
import { assertReviewedProductionResult, evidenceHash } from './first-batch.mjs';
import { hotfixSnapshot } from '../reviewed-snapshots.mjs';

// Four explicit source identities only. Other eligible core subsets stay in the
// review; this is neither a pilot-status filter nor a bulk importer.
export const partialBatchSlugs = Object.freeze(['sample-04','sample-05','sample-17','sample-22']);
const requireGate = (condition, reason) => { if(!condition) throw new Error(`Partial production refused: ${reason}`); };
function faction(id,name,group) {
  return {id,name,subtitle:`Primary catalog · ${group}`,
    description:'검토된 military permission의 기본 catalog 분류입니다. 승인된 production 부분집합만 포함하며, 전체 roster나 캠페인 모집 가능성을 뜻하지 않습니다.',
    gameVersion:hotfixSnapshot.gameVersion, source:`Reviewed primary catalog alias: ${group} → ${id}; promotion/PARTIAL_REVIEW.md`,tags:[]};
}
const factionAdditions=[faction('empire','Empire','wh_main_group_empire'),faction('skaven','Skaven','wh2_main_skv')];

export function buildPartialProductionBatch({evidence,diagnostics,units,factions,validate}) {
  requireGate(evidenceHash(evidence)===partialSourceSha256,'pinned source differs');
  const reviews=reviewPartialCandidates(evidence,diagnostics);
  requireGate(new Set(units.map(u=>u.id)).size===units.length && new Set(factions.map(f=>f.id)).size===factions.length,'duplicate existing identity');
  const nextUnits=structuredClone(units), nextFactions=structuredClone(factions), admitted=[];
  for(const addition of factionAdditions) {
    const existing=nextFactions.find(f=>f.id===addition.id);
    requireGate(!existing || isDeepStrictEqual(existing,addition),'existing faction differs; will not overwrite');
    if(!existing) nextFactions.push(addition);
  }
  for(const slug of partialBatchSlugs) {
    const candidate=reviews.find(c=>c.slug===slug);
    requireGate(candidate && !diagnostics.entries.some(d=>d.id===candidate.unit.id),'exact diagnostic connection required before shared production admission');
    const review={mainKey:candidate.identity.caMainUnitKey,landKey:candidate.identity.caLandUnitKey,id:candidate.unit.id,
      name:candidate.name,factionId:candidate.affiliation.factionId,militaryGroup:candidate.affiliation.militaryGroup};
    const omittedGroups=candidate.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field);
    assertReviewedProductionResult(candidate.normalized,validate,nextFactions.map(f=>f.id),review,
      {expected:candidate.remainingUnmapped,omittedGroups});
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
