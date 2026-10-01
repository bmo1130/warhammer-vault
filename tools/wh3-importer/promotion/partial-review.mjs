import { isDeepStrictEqual } from 'node:util';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { idMappings } from '../normalization/ids.mjs';
import { factSelectors } from '../observations/facts.mjs';
import { observationContext } from '../observations/context.mjs';
import { evidenceHash } from './first-batch.mjs';

export const partialSourceSha256 = '9f4dd0f3890d6d07804ff6e075e02c346178f316b0c5d388e0e82c4e935a2b65';
export const diagnosticSha256 = '1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f';
// Exact reviewed identities. No discovery, wildcard or quality-label admission.
export const partialCandidates = [
  ['01','wh_main_brt_cav_grail_knights'], ['04','wh_main_emp_inf_swordsmen'],
  ['05','wh_main_emp_inf_spearmen_1'], ['07','wh_dlc04_emp_inf_free_company_militia_0'],
  ['08','wh_main_brt_cav_mounted_yeomen_0'], ['09','wh_main_brt_cav_pegasus_knights'],
  ['12','wh2_dlc11_cst_mon_necrofex_colossus_0'], ['14','wh_main_vmp_veh_black_coach'],
  ['15','wh2_dlc09_tmb_veh_skeleton_chariot_0'], ['16','wh2_dlc12_skv_inf_ratling_gun_0'],
  ['17','wh2_dlc12_skv_veh_doom_flayer_0'], ['21','wh_dlc04_emp_cav_royal_altdorf_gryphites_0'],
  ['22','wh_dlc04_vmp_inf_sternsmen_0'], ['24','wh2_dlc13_lzd_mon_dread_saurian_1'],
].map(([n, mainKey]) => ({ slug: `sample-${n}`, mainKey, landKey: mainKey, id: `ca_unit_${mainKey}` }));
export const reviewGroups = ['identity','affiliation/catalog','classification','entities','movement','defense','melee','missile','campaign','customBattle','abilities','passiveAbilities','attributes','composition/runtime structure'];
const mappingReview = {
  'sample-05': { attributes: { charge_defense_vs_large: 'Charge Defence vs. Large', charge_reflection: 'Charge Reflection' } },
  'sample-22': { attributes: { charge_defense: 'Expert Charge Defence', undead: 'Undead' }, abilities: {
    wh_main_unit_passive_regeneration: ['regeneration','Regeneration'],
    wh_main_unit_passive_unstable: ['crumbling','Crumbling'],
    wh_main_unit_passive_unstable_mark_ii: ['disintegrating','Disintegrating'],
  } },
};
const get = (object, field) => field.split('.').reduce((value, key) => value?.[key], object);
export function removeField(object, field) {
  const parts = field.split('.'); const owner = get(object, parts.slice(0,-1).join('.'));
  if (parts.length === 1) delete object[field]; else if (owner) delete owner[parts.at(-1)];
}
export const restoreTrace = (bundle, trace) => ({ ...trace, schemas: trace.schemaRefs.map(ref => {
  const found = bundle.schemas.filter(s => `${s.table}:${s.version}` === ref);
  if (found.length !== 1) throw new Error(`Missing/duplicate reviewed schema ${ref}`);
  return found[0];
}) });

// Candidate-scoped ID labels only. No phase effects, stat conversion or global
// normalizer alias change. Every new label requires a reachable CA Loc row.
function scopedAliases(candidate, dump) {
  const aliases = structuredClone(idMappings), review = mappingReview[candidate.slug] ?? {}, added = [];
  const selectors = factSelectors(dump);
  for (const [kind, ids] of Object.entries(review)) for (const [caId, label] of Object.entries(ids)) {
    const ability = kind === 'abilities';
    const alias = ability ? label[0] : caId, expected = ability ? label[1] : label;
    const key = ability ? `unit_abilities_onscreen_name_${caId}` : `unit_attributes_imued_effect_text_${caId}`;
    const rows = dump.rows.filter(r => r.table === 'Loc' && r.row.key === key && selectors.reachable(r));
    const loc = rows.length === 1 ? selectors.fact(rows[0], 'text') : null;
    const plain = loc?.value.replace(/\[\[img:[^]*?\]\]\[\[\/img\]\]/g, '').trim();
    if (plain !== expected || !candidate.originalUnmapped.some(x => x.caId === caId)) throw new Error(`Scoped alias lacks reviewed exact localisation: ${caId}`);
    if (ability) {
      const record = dump.rows.filter(r=>r.table==='unit_abilities_tables' && r.row.key===caId && selectors.reachable(r));
      const special = dump.rows.filter(r=>r.table==='unit_special_abilities_tables' && r.row.key===caId && selectors.reachable(r));
      if(record.length!==1 || special.length!==1 || selectors.fact(record[0],'source_type')?.value!=='passive' || selectors.fact(special[0],'passive')?.value!==true) throw new Error(`Passive flags disagree: ${caId}`);
    }
    aliases[kind][caId] = alias;
    added.push({caId, alias, kind, label:expected, localisation:loc, scope:candidate.identity.caMainUnitKey, note:'Membership/name alias only; conditional effects not applied.'});
  }
  return { aliases, added };
}

function unknownGroup(input, dump) {
  if(input.kind==='attribute') return 'attributes';
  const row = dump.rows.find(r=>r.id===input.source.rowId);
  const type = factSelectors(dump).fact(row,'source_type')?.value;
  return type==='passive' ? 'passiveAbilities' : 'abilities';
}
const prefix = group => group==='identity' ? ['id','name'] : group==='affiliation/catalog' ? ['factionId'] : [group];
const inGroup = (field, group) => prefix(group).some(p=>field===p || field.startsWith(`${p}.`));

export function reviewPartialCandidates(bundle, diagnostics) {
  if(evidenceHash(bundle)!==partialSourceSha256 || bundle.format!=='warhammer-vault-partial-review-source-v1') throw new Error('Partial review source hash differs; explicit review required.');
  if(!isDeepStrictEqual(bundle.candidates.map(c=>c.slug),partialCandidates.map(c=>c.slug))) throw new Error('Review requires exactly the 14 allowlisted PARTIAL candidates.');
  return bundle.candidates.map((candidate,index) => {
    const expected = partialCandidates[index], dump=restoreTrace(bundle,candidate.dump), permissionTrace=restoreTrace(bundle,candidate.permissionTrace);
    if(candidate.reviewedSource.status!=='PARTIAL' || candidate.reviewedSource.candidateCount!==1 ||
      candidate.identity.caMainUnitKey!==expected.mainKey || candidate.identity.caLandUnitKey!==expected.landKey || candidate.identity.internalId!==expected.id) throw new Error('Partial candidate identity/status differs.');
    const baseline=normalizeUnit(dump,{...candidate.affiliation,permissionTrace});
    if(!isDeepStrictEqual(baseline.unmapped,candidate.originalUnmapped)) throw new Error('Historical unknown IDs differ; do not silently discard them.');
    const {aliases,added}=scopedAliases(candidate,dump);
    const normalized=normalizeUnit(dump,{...candidate.affiliation,permissionTrace,idMappings:aliases});
    const selectors=factSelectors(dump), context=observationContext(dump,selectors);
    const composite=['mount','engine','articulated_record'].some(field=>selectors.fact(context.land,field)?.value);
    const diagnostic=diagnostics.entries.find(e=>e.id===expected.id);
    if(diagnostic && (diagnostic.sourceMainKey!==expected.mainKey || diagnostic.sourceLandKey!==expected.landKey || diagnostic.contextId!==null)) throw new Error('Diagnostic exact identity differs.');
    const groups=Object.fromEntries(reviewGroups.slice(0,-1).map(group=>{
      const fields=normalized.provenance.fields.filter(f=>inGroup(f.field,group));
      const unknown=normalized.unmapped.filter(x=>unknownGroup(x,dump)===group);
      return [group,{ status:unknown.length?'NEEDS_MAPPING':fields.length?'PROMOTABLE':'OMIT',
        promotableFields:fields, omitted:normalized.omitted.filter(x=>inGroup(x.field,group)), unmapped:unknown,
        note:'PROMOTABLE means the listed subset only. Missing fields stay omitted; absence never proves inability.' }];
    }));
    groups.melee.note='Land/main/primary melee weapon direct fields survive composite omissions. Splash here is the named weapon target-size/max-attacks field, not representative entity size or expected hits; unsupported sizes stay omitted.';
    if(groups.missile.status==='OMIT') groups.missile.note='No verified missile profile in this bounded base trace. Absence remains unknown, never proof that the unit cannot shoot.';
    const missileRoles=diagnostic?.missiles.map(m=>({role:m.role,weaponKey:m.weaponKey,projectileKeys:m.projectileKeys,activationStatuses:m.activationStatuses})) ?? [];
    if(candidate.slug==='sample-07' || candidate.slug==='sample-24') {
      groups.missile.status='NEEDS_RUNTIME';
      groups.missile.note='Unit.missile omitted: override/attachment source activation remains INCONCLUSIVE. Existing scoped precedence cannot select a universal active profile. An explicit source-aware presentation is an alternative to further runtime; core admission does not need either.';
    } else if(candidate.slug==='sample-12') {
      groups.missile.note='Listed fields are PROMOTABLE for the exact LAND_PRIMARY cannon static chain. Unit.missile storage is withheld because rider rifle candidates also exist; this is a primary-profile scope/presentation issue, independent of composite body identity. Runtime does not supply or generalize these numbers.';
    } else if(candidate.slug==='sample-16') {
      groups.missile.note='Direct primary projectile values are eligible individually. shotsPerVolley is the raw stored field, never multiplied into damage/DPS/ammo. very_small penetration cap remains omitted, not converted to tiny.';
    }
    groups.missile.sourcePaths=missileRoles;
    groups.missile.storage=groups.missile.status==='OMIT' || ['sample-07','sample-12','sample-24'].includes(candidate.slug)?'OMIT':'PROMOTABLE_SUBSET';
    const rawCardinality = {numMen:selectors.fact(context.root,'num_men'),numMounts:selectors.fact(context.land,'num_mounts'),numEngines:selectors.fact(context.land,'num_engines')};
    groups['composition/runtime structure']={status:composite?'NEEDS_RUNTIME':'OMIT',
      note:composite?'Static placement exists; representative size/mass/HP/speed and physical grouping are withheld. Runtime can clarify physical grouping only; no list/count summing, parent inference or stat promotion. Core admission needs no new runtime.':'No composite representative is selected. MAN-only size/mass may be retained as existing scoped per-entity fields; displayed counts/HP/speed remain unresolved.',
      rawCardinality, diagnosticId:diagnostic?.id??null,
      runtimeCases:diagnostic?.cases.map(c=>({id:c.id,interpretation:c.interpretation,confidenceStatuses:c.confidenceStatuses,validationStatuses:c.validationStatuses,
        observedLogicalCount:c.fields.NumEntities,views:c.views,
        entityIndexContinuity:c.entityIndexContinuity,simultaneousSources:c.simultaneousSources}))??[]};
    if(composite) groups.entities.note='Empty production entities group required by Unit contract. No mount/man/engine representative, raw count conversion or runtime HP.';
    const projected=structuredClone(normalized), withdrawals=[];
    function withdraw(field,reason) {
      const stored=normalized.provenance.fields.filter(f=>f.field===field || f.field.startsWith(`${field}.`));
      removeField(projected.unit,field);
      projected.provenance.fields=projected.provenance.fields.filter(f=>f.field!==field && !f.field.startsWith(`${field}.`));
      projected.omitted.push({field,kind:'UNRESOLVED',semanticsStatus:'REVIEW_WITHHELD',reason});
      withdrawals.push({field,reason,fields:stored});
    }
    for(const group of ['abilities','passiveAbilities','attributes']) if(groups[group].status==='NEEDS_MAPPING') withdraw(group,'Incomplete ID group intentionally omitted in full; every remaining raw ID stays in this review.');
    if(groups.missile.storage==='OMIT') withdraw('missile',groups.missile.note);
    if(composite && Object.keys(projected.unit.entities).length) throw new Error('Composite representative leaked from normalizer.');
    const core=['classification','defense','melee','campaign','customBattle'];
    if(core.some(g=>!groups[g].promotableFields.length)) throw new Error('Reviewed direct core group missing.');
    return {slug:candidate.slug,name:candidate.name,identity:normalized.provenance.identity,affiliation:candidate.affiliation,
      originalStatus:'PARTIAL',overall:'PROMOTABLE_WITH_OMISSIONS',
      admission:diagnostic?'EXACT_DIAGNOSTIC_CONNECTION_REQUIRED':'REVIEWED_ALLOWLIST_REQUIRED',
      source:candidate.reviewedSource,materializedContexts:bundle.contextInventory.matches[candidate.slug],
      groups,scopedMappings:added,originalUnmapped:candidate.originalUnmapped,remainingUnmapped:normalized.unmapped,
      withdrawals,composite,unit:projected.unit,normalized:projected};
  });
}

export function reviewArtifact(reviews, contextInventory) {
  // Row/field pointers resolve into the pinned source bundle. Do not repeat
  // each full schema-join path in every group/unknown/withdrawal entry.
  const compact = value => JSON.parse(JSON.stringify(value, (key, item) => {
    if(key!=='source' || !item?.rowId) return item;
    const {rowId,table,rowKey,field,sourcePack,path,schemaVersion}=item;
    return {rowId,table,rowKey,field,sourcePack,path,schemaVersion};
  }));
  return {format:'warhammer-vault-partial-field-review-v1',reviewDate:'2026-10-02',gameVersion:'9.0.2.0',
    sourceSha256:partialSourceSha256,diagnosticSha256,excluded:'BLOCKED 9 and CLEAN Dragon Ogres are not re-reviewed.',
    materializedContextInventory:{...contextInventory,
      note:'Saved 19 contexts target the identity-blocked discovery subjects. None matches these 14 exact PARTIAL main keys. No historical status/eligibility changed.'},
    candidates:reviews.map(({normalized,unit,...review})=>compact({...review,productionProjection:unit}))};
}

export function renderPartialReview(artifact) {
  const groups=reviewGroups;
  return ['# PARTIAL field-group production review','',
    'WH3 9.0.2.0, 2026-10-02. Exact saved static source replay; no game, extraction or new probe.',
    'PROMOTABLE = listed verified subset, **not every field in the group**. OMIT = withheld/unknown, not inability. NEEDS_MAPPING = raw IDs retained; the incomplete optional group is omitted in full. NEEDS_RUNTIME concerns an unresolved physical/activation question, never a prerequisite for verified core stats. BLOCKED 9 excluded.',
    '',`Pinned source: \`${artifact.sourceSha256}\`. Diagnostic bytes: \`${artifact.diagnosticSha256}\`.`,
    '',`| Unit | ${groups.join(' | ')} | Overall |`,`| --- | ${groups.map(()=>'---').join(' | ')} | --- |`,
    ...artifact.candidates.map(c=>`| ${c.name} | ${groups.map(g=>c.groups[g].status).join(' | ')} | ${c.overall} |`),'',
    'No PARTIAL-wide veto exists in this review. All 14 have safe core subsets. Admission and optional enrichment are separate. Five exact diagnostic IDs require an explicit shared-page/catalog connection before actual production admission; no identity merging occurs in this batch.',
    ...artifact.candidates.flatMap(c=>['',`<a id="${c.slug}"></a>`,`## ${c.name}`,`- Exact main / land: \`${c.identity.caMainUnitKey}\` / \`${c.identity.caLandUnitKey}\`; primary catalog \`${c.affiliation.militaryGroup}\` → \`${c.affiliation.factionId}\` (not exclusive ownership/effective recruitment).`,
      `- Evidence: [saved source](../../../${c.source.reference}); source SHA256 \`${c.source.sha256}\`. Portable input: partial-sources.json. Materialized context: none. Runtime diagnostic: ${c.groups['composition/runtime structure'].diagnosticId??'none'}.`,
      `- Original unknown IDs: ${c.originalUnmapped.map(x=>`\`${x.caId}\``).join(', ')||'none'}. Scoped aliases reviewed: ${c.scopedMappings.map(x=>`\`${x.caId}\` → \`${x.alias}\` (${x.label})`).join(', ')||'none'}.`,
      `- Remaining mapping enrichment: ${c.remainingUnmapped.map(x=>`\`${x.caId}\``).join(', ')||'none'}. Unknown optional groups are absent in productionProjection, never silently resolved.`,
      `- Core projection: armor ${c.productionProjection.defense.armor}, attack/defense ${c.productionProjection.melee.meleeAttack}/${c.productionProjection.defense.meleeDefense}, base/AP ${c.productionProjection.melee.damage.base}/${c.productionProjection.melee.damage.armorPiercing}, recruitment/upkeep ${c.productionProjection.campaign.recruitmentCost}/${c.productionProjection.campaign.upkeep}.`,
      `- Entity/movement: ${c.groups['composition/runtime structure'].note}`,
      ...(c.groups['composition/runtime structure'].runtimeCases.length ? [`- Existing scoped runtime: ${c.groups['composition/runtime structure'].runtimeCases.map(r=>`${r.id}: logical NumEntities ${r.observedLogicalCount?.value??'unknown'}, ${r.views.map(v=>`${v.list} ${v.size}`).join(' / ')}. ${r.interpretation?.text??''}`).join(' ')}`] : []),
      `- Missile: ${c.groups.missile.note} Storage: ${c.groups.missile.storage}.`,
      `- Admission: ${c.admission}. Detailed fields, provenance, omissions and runtime interpretation references: partial-review.json.`]),'',
    '## Next actions and schema boundary','',
    '- Immediate safe core subsets: all 14, with explicit omission and allowlist review. Actual bounded batch: Swordsmen, Spearmen (Shields), The Sternsmen, Doom-Flayers.',
    '- Additional mapping enriches optional groups for Mounted Yeomen, Pegasus Knights, Free Company, Necrofex, Black Coach, Skeleton Chariots, Ratling Guns, Doom-Flayers, Royal Altdorf Gryphites and Dread Saurian. It does not block core admission.',
    '- Doom-Flayers needs **no runtime for core/melee/campaign**. MAN=8 / ENGINE=8 remain raw. Only physical crew/engine grouping or a representative entity would need new evidence; not attempted.',
    '- Mounted/composite entity representation stays in diagnostics/review. No composition schema is required for any core projection.',
    '- Necrofex cannon direct chain is eligible as a primary source profile; a source-scoped missile presentation must distinguish rider rifles before treating it as Unit-wide missile. FCM override and Dread attachment activation remain INCONCLUSIVE. Current Unit.missile is withheld for all three; no schema is added.',
    '- Next small batch: Grail Knights and Mounted Yeomen core subsets; then Ratling Guns with reviewed primary missile subset. The five diagnostic identities need an explicit exact connection policy first.',
    '- Grail Knights, Mounted Yeomen, Pegasus Knights, Royal Altdorf Gryphites and Ratling Guns are safe-core candidates deferred to keep this actual batch bounded, not rejected for PARTIAL or unmapped optional groups.',
    '- Swordsmen has no unknown ID in the saved 9.0.2 pilot. Its unsupported weapon splash-size field stays omitted. Spearmen/Sternsmen use seven exact scoped labels; no source ID is guessed or globally mapped.',
    '', 'Reproduce: `node scripts/review-partial-units.mjs --check`. Regenerate the JSON/Markdown only: `--write`. Source stays pinned; runtime and production collections are never written by this review command.',''].join('\n');
}
