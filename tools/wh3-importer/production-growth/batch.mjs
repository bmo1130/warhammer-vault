import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {growthCatalogs,validateGrowthCatalog} from './catalog.mjs';
import {reviewExpansion,expansionReviewArtifact,expandedReviewArtifact} from '../expansion-batch-01/review.mjs';
import {evidenceHash,assertReviewedProductionResult} from '../promotion/first-batch.mjs';

export const growthAdmissions=JSON.parse(readFileSync(new URL('./admissions.json',import.meta.url),'utf8'));
export const admissionsHash='275dd9489e91f4792ca405a9f7ea496221cd9ff4c8e6c53afd1fa093fa34e772';
export const baselineUnitsHash='ff930ee3ffcf5674e25a4ee7d2731169c109a1dafdb08a8945bab009dcf18ea4';
export const baselineUnitsBytesHash='289f36b0f3df093eaf200fbe8397f8429bdd2a6d3b497847e02a9ac9e8dba416';
export const baselineFactionsHash='1bde13f1cf3a25026d55d6385102f3c2912e644c8e035ea578d5bcea66ca20ac';
const gate=(ok,message)=>{if(!ok)throw Error(`Production growth refused: ${message}`);};
export function growthPolicy(name) {
  gate(evidenceHash(growthAdmissions)===admissionsHash,'explicit admissions changed');
  const config=growthAdmissions[name],catalog=growthCatalogs[name];
  gate(config&&catalog,'unknown batch');
  return {sourceHash:config.sourceHash,catalog,validateCatalog:validateGrowthCatalog,
    allowlist:[...config.allowlist].sort((a,b)=>a.slug<b.slug?-1:a.slug>b.slug?1:0),allowMissile:true,reviewSubset:true};
}
export function replayGrowthReview(name,bundle) {
  const policy=growthPolicy(name),config=growthAdmissions[name];
  gate(evidenceHash(bundle)===config.compactSourceHash,'compact source hash differs');
  const reviews=reviewExpansion(bundle,policy),artifact=expansionReviewArtifact(bundle,reviews,policy);
  gate(evidenceHash(artifact)===config.reviewHash,'pinned review replay differs');
  return {reviews,artifact,expanded:expandedReviewArtifact(bundle,reviews,policy)};
}
export function buildProductionGrowth({batches,units,factions,diagnosticIds,validate}) {
  gate(evidenceHash(units.slice(0,34))===baselineUnitsHash,'existing 29 Production / 5 Sample changed');
  gate(evidenceHash(factions)===baselineFactionsHash,'existing factions changed');
  gate(new Set(units.map(u=>u.id)).size===units.length,'duplicate existing identity');
  gate(isDeepStrictEqual([...batches].map(b=>b.name).sort(),Object.keys(growthAdmissions).sort()),'all exact reviewed batches required');
  const next=structuredClone(units.slice(0,34)),admitted=[];
  for(const input of [...batches].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)) {
    const config=growthAdmissions[input.name],{reviews,artifact}=replayGrowthReview(input.name,input.bundle);
    gate(isDeepStrictEqual(input.review,artifact),'committed review differs');
    for(const review of reviews) {
      const identity=review.identity;
      gate(!next.some(u=>u.id===identity.internalId)&&!diagnosticIds.includes(identity.internalId),'identity collision requires independent review');
      const omittedGroups=review.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field);
      const missileFields=review.normalized.unit.missile?review.missileReview.admittedFields:null;
      assertReviewedProductionResult(review.normalized,validate,factions.map(f=>f.id),{
        mainKey:identity.caMainUnitKey,landKey:identity.caLandUnitKey,id:identity.internalId,
        name:review.name,factionId:review.affiliation.factionId,militaryGroup:review.affiliation.militaryGroup,
      },{expected:review.remainingUnmapped,omittedGroups},missileFields);
      const unit=structuredClone(review.normalized.unit);
      unit.source=`CA base DB · WH3 ${unit.gameVersion} · reviewed ${input.name} · tools/wh3-importer/${input.name}/EXPANSION_BATCH.md#${review.slug}`;
      unit.sources.publicStats+=`; reviewed source SHA256 ${config.sourceHash}; original candidate SHA256 ${review.source.sha256}; compact review SHA256 ${config.reviewHash}`;
      next.push(unit);admitted.push({batch:input.name,slug:review.slug,unit,review});
    }
  }
  // Canonical new order is batch name then explicit slug; existing prefix is immutable.
  // Reordered requests replay identically; reordered/unknown existing records fail closed.
  gate(isDeepStrictEqual(units,next.slice(0,units.length)),'existing record/order differs; no overwrite or unknown identity');
  gate(validate(next,factions.map(f=>f.id)).length===0,'app collection validator rejected output');
  return {units:next,added:next.length-units.length,admitted};
}
export function growthAdmissionReport(name,batch) {
  const config=growthAdmissions[name];
  return {format:'warhammer-vault-expansion-01-admission-v1',sourceSha256:config.sourceHash,reviewSha256:config.reviewHash,
    storageProof:{sourceCompactSha256:config.compactSourceHash,reviewCompactSha256:config.reviewHash},
    preservedBaseline:{units:baselineUnitsHash,factions:baselineFactionsHash},
    admitted:batch.admitted.filter(a=>a.batch===name).map(a=>({slug:a.slug,id:a.unit.id,name:a.unit.name,
      mainKey:a.review.identity.caMainUnitKey,landKey:a.review.identity.caLandUnitKey,factionId:a.unit.factionId,
      militaryGroup:a.review.affiliation.militaryGroup,source:a.review.source})),blocked:config.blocked,
    note:'Explicit exact identities only. Base static fields; count/HP/scale/speed/ammo and ambiguous missile profiles remain omitted. No runtime evidence admission.'};
}
export function renderGrowthReview(name,{reviews,expanded}) {
  return [`# ${name}`,'','WH3 9.0.2.0 actual static pack extraction. Same compact source v2 and field/admission gates; no game/runtime probe.',
    '',`Reviewed ${expanded.preflight.length}; ${reviews.length} explicit core admissions with omissions. Discovery counts: ${JSON.stringify(expanded.counts)}.`,
    `Expanded source SHA256: \`${expanded.sourceSha256}\`; original extraction byte SHA256s remain in source and admission.`,
    '', 'HP/count/scale/speed/ammo/DPS are unresolved and stay absent. Missile fields require one complete static path, false precursor/secondary flags and no secondary ammo. Mounted/engine representatives remain unresolved.',
    '', '| Name | Exact main → land roots | Source status/blocker |','| --- | --- | --- |',
    ...expanded.preflight.map(e=>`| ${e.sample.displayName} | ${e.roots.map(r=>`\`${r.mainKey}\` → \`${r.landKey}\``).join('<br>')||'none'} | ${e.status}; ${e.blockers.map(b=>b.category+': '+b.reason).join('; ')||'core reviewed'} |`),
    ...reviews.flatMap(r=>['',`<a id="${r.slug}"></a>`,'',`## ${r.name}`,'',
      `- Exact ID: \`${r.identity.internalId}\`; affiliation \`${r.affiliation.militaryGroup}\` → \`${r.affiliation.factionId}\`.`,
      `- Admitted fields: ${Object.entries(r.groups).filter(([,g])=>g.status==='PROMOTABLE').map(([name,g])=>`${name}: ${g.promotableFields.map(f=>f.field).join(', ')}`).join('; ')}.`,
      `- Missile: ${r.missileReview.completeness}; admitted paths: ${r.missileReview.admittedFields.join(', ')||'none'}. Graph preserved in sources; no runtime precedence generalized.`,
      `- Withheld groups: ${r.withdrawals.map(w=>w.field).join(', ')}. ${r.groups['composition/runtime structure'].note}`,
      `- Omitted fields: ${[...new Set(r.normalized.omitted.map(o=>o.field))].join(', ')}. See compact review's reason vocabulary for exact meanings.`,
      `- Raw unknown IDs: ${r.remainingUnmapped.map(u=>'`'+u.caId+'`').join(', ')||'none'}; incomplete optional groups omitted in full.`,
      `- Original result byte SHA256: \`${r.source.sha256}\`; \`${r.source.reference}\`.`,
    ]),'','Replay without game/staging: `node scripts/review-production-growth.mjs --check`; `node scripts/promote-production-growth.mjs --check`.',
    'Optional full review: `node scripts/review-production-growth.mjs --verbose`. Static/staging checks remain separate. Existing 29 Production / 5 Sample prefix, factions, diagnostics/shared identity/runtime/CCO and UI unchanged.',''].join('\n');
}
