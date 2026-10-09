export function renderDocuments(r){
  const s=r.summary,table=(heads,rows)=>['| '+heads.join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(a=>'| '+a.join(' | ')+' |')].join('\n');
  const rules=`# Ultra HP/count second slice

Baseline ${r.baselineCommit}; Production ${r.gameVersion}; snapshot ${r.snapshotId}. Original rules, admissions and raw Units are immutable. New values are provided by a second overlay.

${table(['Measure','Before','After'],[['Count',s.countBefore,s.countAfter],['Total HP',s.hpBefore,s.hpAfter],['COMPLETE',986,s.COMPLETE],['PARTIAL',85,s.PARTIAL],['UNKNOWN',39,s.UNKNOWN]])}

## Verified scope

N = main_units.num_men; U = land_units.num_mounts; G = land_units.num_engines; B = bonus_hit_points. M/H/E/A are exact man/mount/engine/articulation battle_entities.hit_points.

- Preserve all original MAN, RIDER_MOUNT and other verified recipes. No existing 986 total HP or 1,071 count changes.
- ARTILLERY: unmounted warmachine/artillery, engine entity type artillery, Generic_2/3/5_Crew, M=8, exact positive E and integer component counts. Total = (B+M)*N+(B+E)*G; card count G. All crew and guns get bonus B. The prior Generic_3_Crew restriction is extended only to independently verified 2/5 crew structures.
- ENGINE_CREW: unmounted chariot/war_machine, Generic_No_Crew_Rotate, engine entity type chariot, M=E=8, integer N/G. Total = B*G+M*N+E*G; card count G. This reproduces the original Doom-Flayers at N=G and four newly corroborated Pump Wagon structures at N=2*G. Applying bonus B to every rider incorrectly doubles the bonus in the latter cohort.
- ARTICULATED_N: reuse B*G+M*N+H*U*G+(E+A)*G only inside the original verified chariot shape with M=H=E=A=8 and all exact original rows. One newly recovered Skeleton Archer Chariot chain qualifies. The Black Coach ground truth continues to reject replacing N by U*G.
- Count can be independent of HP: exact native engine reference plus explicit positive G and known Generic engine type selects G for the independently validated engine card branch. Missing engine HP or articulation HP does not remove this known count. 22 new count-only cards stay PARTIAL; no missing HP is treated as zero.
- Mounted nonintegral N/U remains withheld. Two independent references use incompatible N versus U cardinalities and bonus ownership on the same raw fields. No name/key exception or averaging is permitted.
- Ultra only; require safe positive count/HP and nonnegative integer raw contributions. No Small/Medium/Large scaling or rounding rule is introduced. Composite total/count is not healthPerEntity; that field remains UNKNOWN for all 1,110.

${table(['Recipe','Units','New count','New HP'],r.structures.map(g=>[g.rule,g.units,g.newCount,g.newHP]))}

## Sources and limits

Production values come only from stored exact CA 9.0.2 rows. The prior Speed pooling method recovers already extracted rows across pinned sources; 53/124 full chains now exist. No new original-version pack extraction is claimed. Both archived original captures add zero further rows. ${s.exactHPChainsRecovered} full HP chains are newly completed relative to the old HP audit: 34 artillery chains plus the same six vehicle/articulation chains completed in the Speed slice. Compare report.json catalog.originalMissing and missing.

Fresh CA ${r.confidence.freshVersion}: ${r.confidence.freshRows} bounded rows, separate snapshot, comparison only. Independent Shazbot fixed-commit export is 9.0.0. All selected original count/HP/reference/type fields are compared; version differences are not copied. TW Database 9.0.2 supplies key-matched derived cards, but its stated upstream commit returns HTTP 422. Its data is not sufficient alone for an admission. TWW Stats public count/HP implementation supplies the second recipe comparison and observed website cards. These are derived cards, not new direct game measurements.

No new direct game UI measurement. Historical training is 10 direct Ultra CCO captures + 3 dependent exact-profile baselines. Existing MEDIUM Necrofex/Free Company numerical checks are corroboration only.
`;
  const held=r.catalog.filter(c=>c.status!=='COMPLETE');
  const audit=`# HP/count second audit

124 original holds: 85 count-known PARTIAL examined first, then 39 UNKNOWN. ${s.newIdentities} identities improved. ${held.length} still lack total HP; ${s.UNKNOWN} of these also lack count.

${table(['Original status','Before','New count','New HP','COMPLETE','PARTIAL','UNKNOWN'],r.groups.map(g=>[g.originalStatus,g.before,g.newCount,g.newHP,g.COMPLETE,g.PARTIAL,g.UNKNOWN]))}

## Remaining identities and exact blockers

Missing rows below mean absent from stored original 9.0.2 extraction, not proven absent from CA's database. Additional data needed: exact original-version engine/articulation rows and HP, or an Ultra card/runtime observation resolving mounted N/U ownership. Fresh 9.0.3 targets are recorded separately in report.json and never substitute for original HP. Native main/land, refs, each captured component HP, all eleven tested formulas, publisher candidates and independent candidates are in report.json for every held identity.

${table(['Main / land key','Shape','N / U / G / B','Known component HP','Count / HP','Blocker / exact reference failure'],held.map(c=>[
  c.mainKey+' / '+c.landKey,c.shape,['main.num_men','land.num_mounts','land.num_engines','land.bonus_hit_points'].map(k=>c.rawValues[k]).join(' / '),
  ['man','mount','engine','articulation'].map(k=>k+'='+String(c.rawValues[k+'.hit_points'])).join('; '),
  String(c.prediction.count)+' / '+String(c.prediction.totalHealth),c.prediction.reasons.join('; ')]))}

## Formula trials for held structures

${table(['Main key','Native role keys','Computed formula trials','Independent count / HP','Publisher count / HP'],held.map(c=>[
  c.mainKey,Object.entries(c.roleReferences).filter(([,v])=>v).map(([k,v])=>k+'='+v).join('; '),
  Object.entries(c.candidates).map(([k,v])=>k+'='+String(v)).join('; '),
  c.independentCandidate.count+' / '+String(c.independentCandidate.totalHealth),c.publisherCard.count+' / '+c.publisherCard.totalHealth]))}

## Newly improved identities

${table(['Main key','Previous','Count','Total HP','Count rule','HP formula'],r.catalog.filter(c=>c.prediction.totalHealth!==null||c.originalPrediction.count===null&&c.prediction.count!==null).map(c=>[c.mainKey,c.originalStatus,c.prediction.count,String(c.prediction.totalHealth),c.prediction.countRule,c.prediction.hpRule??'UNKNOWN']))}
`;
  const validation=`# HP/count second validation

## Separate evidence classes

- Original 986 HP and 1,071 counts unchanged; 13 baseline count/HP tuples reproduced (10 direct CCO + 3 dependent exact-profile).
- Existing MEDIUM numerical checks: Necrofex 1/9507 and Free Company 60/3660, all archived frames match; no size scaling inferred.
- ${r.rowChecks.length} original source rows compared to independent 9.0.0 export for count/HP/type/native-reference fields. Conflicts block admissions.
- Publisher-derived 9.0.2 card expectations are compared independently for both count and total HP. Existing 986 agree; mounted reference conflicts remain held.
- Fresh CA ${r.confidence.freshVersion}: ${r.confidence.freshRows} bounded rows, separate snapshot and exe/pack hashes; comparison only. Re-extraction is not a game card measurement.
- New direct game UI measurements: 0. New website observations: five matching cards + one contradictory mounted sample. Full URLs, version and setup: browser-card-evidence.json. Queen Bess is a RoR card with no displayed Rank 0 label; base HP/count recipe does not use rank.

## New independent website samples

${table(['Main key','Expected count / HP','Website actual count / HP','Result'],r.browserValidation.map(c=>[c.mainKey,c.expected.count+' / '+c.expected.totalHealth,c.actual.count+' / '+c.actual.totalHealth,c.result]))}

## Reproduction

Run node scripts/promote-unit-entities-second.mjs --check. Source envelopes, manifest pins, all selected source snapshots, native references and independent raw/card checks must replay exactly. The old 13-case and MEDIUM evidence is unchanged. Tests cover source drift, unknown HP versus zero, count-only admission, missing contributors, bonus multiplicity, nonintegral mounted conflict, overflow and both inverse overlay drift guards.

TW Database stated commit c773c6d0 returned HTTP 422. Independent export commit 8a4f7e64714cf971b44988a4b59f218af6d04ff2 and published TWW Stats implementation are separately pinned. No reference value supplies missing original raw HP. See RESULTS.md for executed tests/build and Production UI verification.
`;
  return {'RULES.md':rules,'AUDIT.md':audit,'VALIDATION.md':validation};
}
