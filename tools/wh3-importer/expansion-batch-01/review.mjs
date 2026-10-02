import { isDeepStrictEqual } from 'node:util';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { factSelectors } from '../observations/facts.mjs';
import { observationContext } from '../observations/context.mjs';
import { reviewGroups, restoreTrace, removeField } from '../promotion/partial-review.mjs';
import { evidenceHash } from '../promotion/first-batch.mjs';
import { isReviewedSource } from '../reviewed-snapshots.mjs';
import { expansionCatalog, validateExpansionCatalog } from './catalog.mjs';
import { portable } from './projection.mjs';
import { decodeSource } from './compact.mjs';
import { missileSourceContract } from '../missile-semantics/contract.mjs';

export const expansionSourceHash='e10f3727bf00af27f69a0a623247275db62f4137137f1f416baf39fd7754b4e1';
// Discovered first, then independently admitted. Never root-selection inputs.
export const expansionAllowlist=[
  ['03','wh_main_brt_inf_men_at_arms','53126b60c8df9787a4320ba293c2021c9e09f580fdc807c84bea3b3c9ef26d09'],
  ['04','wh_main_brt_cav_knights_of_the_realm','71f41e4bf28d7352e45b45e887b079929101116f2b2bac8d8b21ae0579da6afa'],
  ['05','wh_dlc07_brt_cav_questing_knights_0','c7ad50660dae6e7b60fd3d5cdcc308d274ac859b83aa77535ca562d99ff4d41e'],
  ['06','wh_dlc07_brt_inf_foot_squires_0','4dcbd67a0617e51617852228aa5789c6e857208702cd6a8c7407ae10852eba06'],
  ['07','wh2_main_skv_inf_clanrats_1','b5541190406e620f97818ccef6e9568b5bb3dedfeb01c2a125a6b38aca0cb16d'],
  ['11','wh_main_vmp_inf_grave_guard_1','40ab5d7fbd68c08bc70363feb011ea17bbb77bb4739c35a7d88602f786c4736d'],
  ['12','wh_main_vmp_cav_black_knights_3','e03f2eef1fb0c201da0e0ab8102c38375b9f6ae87c75d5332a512ad0d6c895ac'],
  ['13','wh_main_vmp_mon_vargheists','e00cb7bcfcb4aa4ffec86d021d4e715ccfae5f1f4a75eca491c981abd05efb84'],
  ['17','wh2_main_lzd_inf_saurus_warriors_1','38e6232b76cac76cb07ef03788ad80c9c1e6ff98c75122c0ce27e52aaec46eec'],
  ['20','wh2_dlc11_cst_inf_depth_guard_0','310c446d665fcd00d659b7adff9d633d8d549efba7f959acd8b23e07bbaefe08'],
  ['21','wh2_dlc11_cst_inf_depth_guard_1','87bb7714f0777b17d11236cdc29ded73cdf208c39db9d843bfb2c0c0f189aa70'],
  ['22','wh_main_chs_inf_chosen_0','2168e604cdf2897bcbaf330c23c898600999c2b1398dd806e2f67350fc98b5b8'],
  ['23','wh_main_chs_inf_chosen_1','cb26449c739405c3712149a2741831926c3fe4bbb6c558246a612fbc98cec90f'],
  ['24','wh_main_chs_cav_chaos_knights_1','b4c889422a5279bafd73d294b18c2e518c13d7afb04f972bb3881f72d8473076'],
].map(([n,key,sha256])=>({slug:`expansion-01-${n}`,mainKey:key,landKey:key,id:`ca_unit_${key}`,sha256}));
const prefixes=g=>g==='identity'?['id','name']:g==='affiliation/catalog'?['factionId']:[g];
const inGroup=(field,g)=>prefixes(g).some(p=>field===p || field.startsWith(`${p}.`));
const requireReview=(ok,reason)=>{if(!ok)throw new Error(`Expansion review refused: ${reason}`);};

export const batch01Policy={sourceHash:expansionSourceHash,catalog:expansionCatalog,validateCatalog:validateExpansionCatalog,allowlist:expansionAllowlist,allowMissile:false};
export function reviewExpansion(compactBundle, policy=batch01Policy) {
  const bundle=decodeSource(compactBundle,policy.sourceHash);
  requireReview(evidenceHash(bundle)===policy.sourceHash,'pinned source hash differs');
  requireReview(bundle.format==='warhammer-vault-expansion-01-source-v1' && bundle.gameExecuted===false && isReviewedSource(bundle.provenance,''),'source snapshot differs');
  policy.validateCatalog(bundle.catalog);
  requireReview(isDeepStrictEqual(bundle.catalog,policy.catalog) && bundle.preflight.length===policy.catalog.length,'exact bounded catalog differs');
  if(!policy.reviewSubset)requireReview(isDeepStrictEqual(bundle.candidates.map(c=>c.slug),policy.allowlist.map(c=>c.slug)),'explicit admission allowlist differs');
  requireReview(new Set(policy.allowlist.map(c=>c.slug)).size===policy.allowlist.length,'duplicate admission slug');
  return policy.allowlist.map(expected=>{
    const candidate=bundle.candidates.find(c=>c.slug===expected.slug);
    requireReview(candidate && candidate.status!=='BLOCKED','explicit candidate unavailable/blocked');
    const entry=bundle.preflight.find(e=>e.sample.slug===candidate.slug);
    requireReview(entry.roots.length===1 && entry.localisationMatches.every(l=>l.text===entry.sample.displayName),'non-unique exact localisation root');
    const root=entry.roots[0];
    requireReview(root.mainKey===expected.mainKey && root.landKey===expected.landKey &&
      candidate.identity.caMainUnitKey===expected.mainKey && candidate.identity.caLandUnitKey===expected.landKey &&
      candidate.identity.internalId===expected.id && candidate.name===entry.sample.displayName &&
      candidate.source.sha256===expected.sha256 && entry.source.sha256===expected.sha256,'exact identity/original source hash differs');
    requireReview(root.primaryAliases.length===1 && root.primaryAliases[0].factionId===entry.sample.expectedFactionId &&
      candidate.affiliation.factionId===entry.sample.expectedFactionId && candidate.affiliation.militaryGroup===root.primaryAliases[0].militaryGroup,'primary catalog alias differs/conflicts');
    const dump=restoreTrace(bundle,candidate.dump),permissionTrace=restoreTrace(bundle,entry.permissionTrace);
    const original=portable(normalizeUnit(dump,{...candidate.affiliation,permissionTrace}));
    requireReview(isDeepStrictEqual(original.unmapped,candidate.originalUnmapped),'remaining unknown IDs differ');
    const missileEvidence=policy.allowMissile && candidate.missileInspection?restoreTrace(bundle,candidate.missileInspection):null;
    const missileInspection=missileEvidence?{evidence:missileEvidence,contract:missileSourceContract(missileEvidence,{mainKey:expected.mainKey,landKey:expected.landKey})}:null;
    requireReview(!policy.allowMissile || missileInspection,'missing bounded missile source graph');
    const normalized=missileInspection?portable(normalizeUnit(dump,{...candidate.affiliation,permissionTrace,missileInspection})):original;
    requireReview(isDeepStrictEqual(normalized.unmapped,candidate.originalUnmapped),'missile inspection changed unknown IDs');
    const selectors=factSelectors(dump),c=observationContext(dump,selectors);
    const composite=['mount','engine','articulated_record'].some(f=>selectors.fact(c.land,f)?.value);
    const unknownGroup=input=>input.kind==='attribute'?'attributes':
      selectors.fact(selectors.byId.get(input.source.rowId),'source_type')?.value==='passive'?'passiveAbilities':'abilities';
    const groups=Object.fromEntries(reviewGroups.slice(0,-1).map(g=>{
      const fields=normalized.provenance.fields.filter(f=>inGroup(f.field,g)),unknown=normalized.unmapped.filter(u=>unknownGroup(u)===g);
      return [g,{status:unknown.length?'NEEDS_MAPPING':fields.length?'PROMOTABLE':'OMIT',promotableFields:fields,
        omitted:normalized.omitted.filter(o=>inGroup(o.field,g)),unmapped:unknown,
        note:'Only listed direct/curated fields; missing values remain unknown.'}];
    }));
    // Batch 01 has no missile profile; subsequent batches supply the existing
    // bounded missile graph and contract instead of flattening extra paths.
    if(!policy.allowMissile)requireReview(!root.missile.primary && !root.missile.junctions.length && !candidate.missileExtras.rows.length && !normalized.unit.missile,'unexpected missile path requires independent review');
    const missileSafe=missileInspection?.contract.presentation.singleBlockSafe===true &&
      missileInspection.contract.paths.every(p=>['precursor','use_secondary_ammo_pool','hide_secondary_range_ammo_statistics_ui'].every(f=>p.rawWeaponFlags?.[f]?.value===false)) &&
      missileInspection.contract.ammo.secondary_ammo?.value===0 && missileInspection.contract.ammo.infinite_secondary_ammo?.value===false;
    groups.missile.note=policy.allowMissile?`Bounded missile graph: ${missileInspection.contract.completeness}. Only a complete static single profile permits direct base fields; ammo/DPS/runtime precedence remain unresolved.`:'No missile relation in the bounded primary/junction/engine inspection. Unit.missile omitted; absence does not prove inability to shoot.';
    groups['composition/runtime structure']={status:composite?'NEEDS_RUNTIME':'OMIT',
      note:composite?'Mounted representative unresolved: no rider/mount size, mass, resistance or speed selected. Core admission needs no runtime.':'Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.',
      rawCardinality:{numMen:selectors.fact(c.root,'num_men'),numMounts:selectors.fact(c.land,'num_mounts'),numEngines:selectors.fact(c.land,'num_engines')}};
    const projected=structuredClone(normalized),withdrawals=[];
    for(const group of ['abilities','passiveAbilities','attributes','missile'])if((group==='missile' && !missileSafe) || groups[group].status==='NEEDS_MAPPING') {
      removeField(projected.unit,group);
      const fields=projected.provenance.fields.filter(f=>inGroup(f.field,group));
      projected.provenance.fields=projected.provenance.fields.filter(f=>!inGroup(f.field,group));
      const reason=group==='missile'?groups.missile.note:'Incomplete optional ID group omitted in full; raw unknown IDs retained.';
      projected.omitted.push({field:group,kind:'UNRESOLVED',semanticsStatus:'REVIEW_WITHHELD',reason});
      withdrawals.push({field:group,fields,reason});
    }
    requireReview(!composite || !Object.keys(projected.unit.entities).length,'mounted representative leaked');
    requireReview(['identity','affiliation/catalog','classification','movement','defense','melee','campaign','customBattle'].every(g=>groups[g].status==='PROMOTABLE'),'safe core group missing');
    return {slug:candidate.slug,name:candidate.name,identity:normalized.provenance.identity,affiliation:candidate.affiliation,
      originalStatus:candidate.status,overall:'PROMOTABLE_WITH_OMISSIONS',source:candidate.source,
      groups,scopedMappings:[],remainingUnmapped:normalized.unmapped,withdrawals,composite,normalized:projected,
      ...(missileInspection?{missileReview:{completeness:missileInspection.contract.completeness,
        paths:missileInspection.contract.paths.map(p=>({role:p.role,weaponKey:p.weaponKey,projectiles:p.projectilePaths.map(x=>x.key)})),
        ammoSemantics:missileInspection.contract.ammoSemantics,
        admittedFields:missileSafe?projected.provenance.fields.filter(f=>f.field.startsWith('missile.')).map(f=>f.field):[]}}:{})};
  });
}

export function expandedReviewArtifact(compactBundle,reviews,policy=batch01Policy) {
  const bundle=decodeSource(compactBundle,policy.sourceHash);
  const compact=value=>JSON.parse(JSON.stringify(value,(key,item)=>{
    if(key!=='source' || !item?.rowId)return item;
    const {rowId,table,rowKey,field,sourcePack,path,schemaVersion}=item;return {rowId,table,rowKey,field,sourcePack,path,schemaVersion};
  }));
  return {format:'warhammer-vault-expansion-01-review-v1',reviewDate:'2026-10-02',gameVersion:'9.0.2.0',sourceSha256:policy.sourceHash,
    counts:{uniqueRoot:bundle.preflight.filter(e=>e.roots.length===1).length,ambiguous:bundle.preflight.filter(e=>e.roots.length>1).length,rootNotFound:bundle.preflight.filter(e=>!e.roots.length).length,
      CLEAN:bundle.preflight.filter(e=>e.status==='CLEAN').length,PARTIAL:bundle.preflight.filter(e=>e.status==='PARTIAL').length,BLOCKED:bundle.preflight.filter(e=>e.status==='BLOCKED').length},
    preflight:bundle.preflight.map(({permissionTrace,...entry})=>entry),
    candidates:reviews.map(({normalized,...review})=>compact({...review,productionProjection:normalized.unit}))};
}
export function expansionReviewArtifact(bundle,reviews,policy=batch01Policy) {
  const expanded=expandedReviewArtifact(bundle,reviews,policy),reasons={},omissions={};
  const reason=text=> {
    const id=`reason-${evidenceHash(text).slice(0,16)}`;
    if (Object.hasOwn(reasons,id) && reasons[id]!==text) throw new Error('Review reason hash collision');
    reasons[id]=text; return id;
  };
  const pointer=source=>source?.rowId?{rowId:source.rowId,field:source.field}:null;
  const omission=o=> {
    const record={field:o.field,kind:o.kind,semanticsStatus:o.semanticsStatus,reason:reason(o.reason)};
    const id=`${o.field}:${evidenceHash(record).slice(0,16)}`;
    if (Object.hasOwn(omissions,id) && !isDeepStrictEqual(omissions[id],record)) throw new Error('Review omission hash collision');
    omissions[id]=record; return id;
  };
  return {format:'warhammer-vault-expansion-01-review-v2',reviewDate:expanded.reviewDate,
    sourceCompactSha256:evidenceHash(bundle),sourceExpandedSha256:policy.sourceHash,
    expandedReviewSha256:evidenceHash(expanded),counts:expanded.counts,
    preflight:expanded.preflight.map((e,i)=>({slug:e.sample.slug,sourcePointer:`data.preflight.${i}`,
      status:e.status,roots:e.roots.map(r=>({mainKey:r.mainKey,landKey:r.landKey})),
      blockers:e.blockers.map(b=>({category:b.category,reason:reason(b.reason)}))})),
    candidates:expanded.candidates.map(c=>({slug:c.slug,sourcePointer:`data.candidates.${bundle.data.candidates.findIndex(s=>s.slug===c.slug)}`,
      originalStatus:c.originalStatus,overall:c.overall,composite:c.composite,
      groups:Object.fromEntries(Object.entries(c.groups).map(([name,g])=>[name,{status:g.status,note:reason(g.note),
        ...(g.promotableFields?{admittedFields:g.promotableFields.map(f=>f.field)}:{}),
        ...(g.omitted?{omitted:g.omitted.map(omission)}:{})}])),
      unknownIds:c.remainingUnmapped.map(u=>({kind:u.kind,caId:u.caId,source:pointer(u.source)})),
      withdrawals:c.withdrawals.map(w=>({field:w.field,reason:reason(w.reason)})),
      productionProjectionSha256:evidenceHash(c.productionProjection),...(c.missileReview?{missileReview:c.missileReview}:{})})),omissions,reasons};
}
export function renderExpansionReview(artifact) {
  return ['# Expansion batch 01','',
    'WH3 9.0.2.0 static pack extraction, 2026-10-02. No game/runtime/CCO probe. Historical representative pilot CLEAN 1 / PARTIAL 14 / BLOCKED 9 is unchanged.',
    '',`Pinned portable input SHA256 (JSON value): \`${artifact.sourceSha256}\`. Original result byte hashes are recorded per candidate. Selected processed schema fields/rows only; original extraction is ignored staging.`,
    '', '## All 24 exact-name discoveries','',
    'Unique roots 16; ambiguous 6; ROOT_NOT_FOUND 2. CLEAN 0 / PARTIAL 14 / BLOCKED 10. Tomb Guard variants have conflicting Tomb Kings and Vampire Counts recognized primary aliases; neither is selected.',
    '', '| Name | Exact main roots (land key follows) | Result / blocker |', '| --- | --- | --- |',
    ...artifact.preflight.map(e=>`| ${e.sample.displayName} | ${e.roots.map(r=>`\`${r.mainKey}\` → \`${r.landKey}\``).join('<br>')||'none'} | ${e.status}; ${e.blockers.map(b=>`${b.category}: ${b.reason}`).join('; ')||'reviewed core admitted'} |`),
    '', '## Explicit production admissions','',
    'All 14 admit identity, primary affiliation/catalog, classification, movement booleans, defense, melee, campaign base costs/turns and customBattle base cost. PROMOTABLE means listed subset, not complete group. No new ability/attribute mappings, faction records, Unit schema or UI changes.',
    'All omit displayed count, HP/per-entity HP, scale, speed/ground/charge speed, resistance conversion, effective recruitment, caps and unsupported splash semantics. No raw num_men conversion. Missile is omitted for every new Unit: no primary/junction/engine profile found in this bounded inspection; no absence-as-inability claim.',
    ...artifact.candidates.flatMap(c=>['',`<a id="${c.slug}"></a>`,'',`### ${c.name}`,'',
      `- Main: \`${c.identity.caMainUnitKey}\`; land: \`${c.identity.caLandUnitKey}\`; production ID: \`${c.identity.internalId}\`.`,
      `- Primary catalog: \`${c.affiliation.militaryGroup}\` → \`${c.affiliation.factionId}\` (not exclusive ownership/effective recruitment).`,
      `- Admitted fields: ${Object.entries(c.groups).filter(([g,s])=>s.status==='PROMOTABLE').map(([g,s])=>`${g}: ${s.promotableFields.map(f=>f.field).join(', ')}`).join('; ')}.`,
      `- Withheld groups: ${c.withdrawals.map(w=>w.field).join(', ')}. ${c.groups['composition/runtime structure'].note}`,
      `- Entity projection: \`${JSON.stringify(c.productionProjection.entities)}\`; movement: \`${JSON.stringify(c.productionProjection.movement)}\`.`,
      `- All omitted fields: ${[...new Set(Object.values(c.groups).flatMap(g=>(g.omitted??[]).map(o=>o.field)))].join(', ')}.`,
      `- Remaining raw unknown IDs: ${c.remainingUnmapped.map(u=>`\`${u.caId}\``).join(', ')||'none'}. Unknown optional groups withdrawn in full, including already mapped members.`,
      `- Original ignored result: \`${c.source.reference}\`; byte SHA256 \`${c.source.sha256}\`.`,
    ]),
    '', '## Preservation and replay','',
    'Previous 15 Production + 5 Sample records preserved with exact value/order equality. Diagnostic and shared identity artifacts unchanged. Personal target IDs/backup v1, faction registry, schema and UI unchanged.',
    'Replay: `node scripts/review-expansion-batch-01.mjs --check`; `node scripts/promote-expansion-batch-01.mjs --check`. Both work without local packs. `project-expansion-batch-01.mjs --check` additionally checks ignored original staging bytes. Live static integration: `node --test tools/wh3-importer/expansion-batch-01/static.integration.test.mjs` with `WH3_RUN_INTEGRATION=1`.',
    'Storage: `sources.json` is the lossless v2 dictionary bundle; `review.json` contains decisions and source pointers, shared omission definitions and reason vocabulary. Expanded source/review hashes above remain verified. `node scripts/review-expansion-batch-01.mjs --verbose` writes the full historical review to ignored `generated/wh3/expansion-batch-01/review.verbose.json`; production replay never reads it. Measurements, format details and future batch estimates: [COMPACT_FORMAT.md](COMPACT_FORMAT.md).',
    'Final collection: Production 29 / Sample 5 / diagnostic evidence 5 / diagnostic-only 0 / unique catalog 34.', ''].join('\n');
}
