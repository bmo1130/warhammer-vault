import { isDeepStrictEqual } from 'node:util';
import { reviewPartialCandidates, reviewArtifact, partialSourceSha256, diagnosticSha256 } from './partial-review.mjs';
import { committedPartialReviewSha256 } from './partial-batch.mjs';
import { assertReviewedProductionResult, evidenceHash } from './first-batch.mjs';
import { hotfixSnapshot } from '../reviewed-snapshots.mjs';

export const evidenceLinkedSlugs = Object.freeze(['sample-07','sample-12','sample-14','sample-15','sample-24']);
const requireGate = (ok, reason) => { if (!ok) throw new Error(`Evidence-linked admission refused: ${reason}`); };
export function buildEvidenceLinkedBatch({ evidence, committedReview, diagnostics, units, factions, validate }) {
  requireGate(evidenceHash(evidence) === partialSourceSha256, 'pinned candidate sources differ');
  requireGate(evidenceHash(committedReview) === committedPartialReviewSha256, 'committed partial review differs');
  const reviews = reviewPartialCandidates(evidence, diagnostics);
  requireGate(isDeepStrictEqual(reviewArtifact(reviews,evidence.contextInventory),committedReview), 'review replay differs');
  requireGate(diagnostics.batchId === 'runtime-2026-10-01-9.0.2' && diagnostics.gameVersion === hotfixSnapshot.gameVersion && diagnostics.snapshot.gameVersion === hotfixSnapshot.gameVersion &&
    diagnostics.staticSnapshotId === 'c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5' &&
    diagnostics.snapshot.schemaSha256 === hotfixSnapshot.schemaSha256 &&
    isDeepStrictEqual(Object.fromEntries(diagnostics.snapshot.packs.map(p=>[p.name,p.sha256])), hotfixSnapshot.packs), 'diagnostic snapshot incompatible');
  for (const collection of [units,factions,diagnostics.entries]) requireGate(new Set(collection.map(x=>x.id)).size === collection.length,'duplicate identity');
  const selected = evidenceLinkedSlugs.map(slug=>reviews.find(c=>c.slug===slug));
  for (const u of units) if (diagnostics.entries.some(d=>d.id===u.id)) requireGate(selected.some(c=>c.unit.id===u.id),'unapproved collision');
  const nextUnits=structuredClone(units),nextFactions=structuredClone(factions),links=[],admitted=[];
  const labels={vampire_coast:'Vampire Coast',tomb_kings:'Tomb Kings',lizardmen:'Lizardmen'};
  for (const c of selected) {
    const {factionId,militaryGroup}=c.affiliation;
    if (labels[factionId]) {
      const addition={id:factionId,name:labels[factionId],subtitle:`Primary catalog · ${militaryGroup}`,
        description:'검토된 military permission의 기본 catalog 분류입니다. 승인된 production 부분집합만 포함하며, 전체 roster나 캠페인 모집 가능성을 뜻하지 않습니다.',
        gameVersion:hotfixSnapshot.gameVersion,source:`Reviewed primary catalog alias: ${militaryGroup} → ${factionId}; promotion/EVIDENCE_LINKED_ADMISSION.md`,tags:[]};
      const existing=nextFactions.find(f=>f.id===factionId);
      requireGate(!existing || isDeepStrictEqual(existing,addition),'existing faction differs');
      if (!existing) nextFactions.push(addition);
    }
    const d=diagnostics.entries.find(d=>d.id===c.identity.internalId);
    requireGate(d && d.id===c.unit.id && d.sourceMainKey===c.identity.caMainUnitKey && d.sourceLandKey===c.identity.caLandUnitKey && d.contextId===null && d.productionEligible===false,'exact diagnostic identity differs');
    const review={id:c.unit.id,mainKey:c.identity.caMainUnitKey,landKey:c.identity.caLandUnitKey,name:c.name,factionId,militaryGroup};
    assertReviewedProductionResult(c.normalized,validate,nextFactions.map(f=>f.id),review,
      {expected:c.remainingUnmapped,omittedGroups:c.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field)});
    requireGate(!c.composite || Object.keys(c.unit.entities).length===0,'composite representative');
    const unit=structuredClone(c.unit);
    unit.source=`CA base DB · WH3 ${unit.gameVersion} · reviewed field subset · tools/wh3-importer/promotion/EVIDENCE_LINKED_ADMISSION.md#${c.slug}`;
    unit.sources.publicStats+=`; pinned PARTIAL source SHA256 ${partialSourceSha256}; original ${c.source.reference} SHA256 ${c.source.sha256}; omissions reviewed separately; incomplete optional ID groups omitted, not absent in-game`;
    const existing=nextUnits.find(u=>u.id===unit.id);
    requireGate(!existing || isDeepStrictEqual(existing,unit),'existing production record differs');
    if (!existing) nextUnits.push(unit);
    links.push({productionId:unit.id,diagnosticId:d.id,mainKey:review.mainKey,landKey:review.landKey,
      partialReviewSlug:c.slug,partialReviewIdentity:c.identity,candidateSource:c.source,
      diagnosticSourceMainKey:d.sourceMainKey,diagnosticSourceLandKey:d.sourceLandKey,gameVersion:unit.gameVersion,
      productionRecord:unit});
    admitted.push({slug:c.slug,unit,withdrawals:c.withdrawals,remainingUnmapped:c.remainingUnmapped});
  }
  requireGate(validate(nextUnits,nextFactions.map(f=>f.id)).length===0,'app validator failed');
  return {units:nextUnits,factions:nextFactions,admitted,registry:{format:'reviewed-unit-shared-identities-v1',
    partialReviewSha256:committedPartialReviewSha256,partialSourceSha256,diagnosticSha256,
    diagnosticBatchId:diagnostics.batchId,staticSnapshotId:diagnostics.staticSnapshotId,snapshot:diagnostics.snapshot,links},
    added:{units:nextUnits.length-units.length,factions:nextFactions.length-factions.length}};
}
