import { isDeepStrictEqual } from 'node:util';
import { evidenceHash,assertReviewedProductionResult } from '../promotion/first-batch.mjs';
import { reviewExpansion,expansionReviewArtifact,expandedReviewArtifact,expansionSourceHash } from './review.mjs';

export const expansionReviewHash='2a1f6203c07bba010ae3cbe862dbd01c0eb1597ac04333f7281a2e7fe47919b0';
export const compactReviewHash='95753b14285985e009380f9dbc1fdea312dd34cc80d7c8409d6df79e5935d7a0';
export const baselineUnitsHash='75e7c3ea866b774c6d8856079e438f151a9183b55b84cb65ab411984d1fa949d';
export const baselineFactionsHash='1bde13f1cf3a25026d55d6385102f3c2912e644c8e035ea578d5bcea66ca20ac';
export const preservedBytes={
  'src/data/unitDiagnostics.json':'1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f',
  'src/data/unitSharedIdentities.json':'3e256bf5c850df65e70a539062a5109a36c75757f8f3a34bc75d8b492aa9d13e',
  'src/data/factions.json':'a0868547e7a96b69649e470bb024eaa9bb55813139df04d3ff01d5d94e8d650e',
  'tools/wh3-importer/pilot-catalog.mjs':'5e78204136b74d7bb112f394e5bce9601162f16c0f30048229e6c0d16e0162fb',
  'tools/wh3-importer/PILOT.md':'1179b33824005a3a45af1cf84af10c94c1704fc48db47ddce9061d2bfd96bb79',
  'tools/wh3-importer/promotion/partial-review.json':'b4fd68d50e031b77567e01547a3eccbb8d094339bec6f6d3085d58e01130afef',
};
const gate=(ok,reason)=>{if(!ok)throw new Error(`Expansion admission refused: ${reason}`);};

export function buildExpansionBatch({bundle,committedReview,units,factions,diagnosticIds,validate}) {
  gate(evidenceHash(committedReview)===compactReviewHash,'pinned committed review hash differs');
  const reviews=reviewExpansion(bundle);
  gate(evidenceHash(expandedReviewArtifact(bundle,reviews))===expansionReviewHash,'historical expanded review hash differs');
  gate(isDeepStrictEqual(expansionReviewArtifact(bundle,reviews),committedReview),'review replay differs');
  gate(evidenceHash(units.slice(0,20))===baselineUnitsHash,'existing Production 15 / Sample 5 changed');
  gate(evidenceHash(factions)===baselineFactionsHash,'existing faction catalog changed');
  gate(new Set(units.map(u=>u.id)).size===units.length,'duplicate existing identity');
  const next=structuredClone(units),admitted=[];
  for(const review of reviews) {
    const identity=review.identity;
    gate(!diagnosticIds.includes(identity.internalId),'unapproved production/diagnostic collision');
    const omittedGroups=review.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field);
    assertReviewedProductionResult(review.normalized,validate,factions.map(f=>f.id),{
      mainKey:identity.caMainUnitKey,landKey:identity.caLandUnitKey,id:identity.internalId,
      name:review.name,factionId:review.affiliation.factionId,militaryGroup:review.affiliation.militaryGroup,
    },{expected:review.remainingUnmapped,omittedGroups});
    const unit=structuredClone(review.normalized.unit);
    unit.source=`CA base DB · WH3 ${unit.gameVersion} · reviewed expansion batch 01 · tools/wh3-importer/expansion-batch-01/EXPANSION_BATCH_01.md#${review.slug}`;
    unit.sources.publicStats+=`; reviewed source SHA256 ${expansionSourceHash}; original candidate SHA256 ${review.source.sha256}; committed review SHA256 ${expansionReviewHash}`;
    const existing=next.find(u=>u.id===unit.id);
    gate(!existing || isDeepStrictEqual(existing,unit),'existing record differs; will not overwrite');
    if(!existing)next.push(unit);
    admitted.push({id:unit.id,name:unit.name,mainKey:identity.caMainUnitKey,landKey:identity.caLandUnitKey,
      factionId:unit.factionId,militaryGroup:review.affiliation.militaryGroup,source:review.source,
      admittedGroups:Object.entries(review.groups).filter(([,g])=>g.status==='PROMOTABLE').map(([g])=>g),
      withheldGroups:review.withdrawals.map(w=>w.field),unit});
  }
  gate(new Set(next.map(u=>u.id)).size===next.length,'duplicate resulting identity');
  gate(validate(next,factions.map(f=>f.id)).length===0,'app collection validator rejected output');
  return {units:next,added:next.length-units.length,admitted,storageProof:{sourceCompactSha256:evidenceHash(bundle),reviewCompactSha256:compactReviewHash}};
}
export function expansionAdmissionReport(batch) {
  return {format:'warhammer-vault-expansion-01-admission-v1',sourceSha256:expansionSourceHash,reviewSha256:expansionReviewHash,
    storageProof:batch.storageProof,
    preservedBaseline:{units:baselineUnitsHash,factions:baselineFactionsHash,bytes:preservedBytes},
    admitted:batch.admitted.map(({unit,...entry})=>entry),
    note:'Explicit 14-ID admission. Existing records require exact equality. No diagnostic data, runtime, migration, new mapping, faction, schema or UI change.'};
}
