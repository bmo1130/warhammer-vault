export function renderReport(r) {
  const s=r.summary;
  const table=(headers,rows)=>[headers.join(' | '),headers.map(()=> '---').join(' | '),...rows.map(row=>row.join(' | '))].map(l=>'| '+l+' |').join('\n');
  return `# Base unit-card Speed: empirical promotion

Production Speed ${s.before} → ${s.after}; missing values ${s.unknownBefore} → ${s.unknownAfter}; newly promoted ${s.promoted}. Speed-only status: COMPLETE ${s.COMPLETE}, PARTIAL ${s.PARTIAL}, UNKNOWN ${s.UNKNOWN}. PARTIAL means the raw chain is present but display semantics are unvalidated; both PARTIAL and UNKNOWN have no stored Speed.

## Evidence and confidence

${r.confidenceLimit}

All 81 previous admissions are STATIC_DERIVED_SPEED. Only six of those identities also have direct user-reported card readings. The original Swordsmen, Mounted Yeomen and Field Trebuchets fit the three source-selection rules. Knights of the Realm, Cold One Riders and Grail Knights are separate historical mounted holdouts: 3/3 match. They cross-check both horse and Cold One mount entities. No new live-game observation was fabricated. Generalizing the infantry and artillery topology has only one directly measured anchor each; category samples below are structural forecasts unless a card reference is present.

## Sources and rules

Pinned CA WH3 ${r.gameVersion}, snapshot ${r.snapshotId}. The source pack and schema hashes in manifest/source evidence match the existing reviewed snapshot. Exact processed-schema reference joins:

- main_units.land_unit → land_units.key → man_entity → battle_entities.key
- land_units.mount → mounts.key → mounts.entity → battle_entities.key
- land_units.engine → battlefield_engines.key → battle_entity → battle_entities.key
- land_units.articulated_record → land_unit_articulated_vehicles.key → articulated_entity → battle_entities.key (audited, held)

${table(['Rule','Formula','Stored','Previous','New'],r.rules.map(v=>[v.id,'selected run_speed × 10',v.stored,v.previous,v.promoted]))}

Ground MAN_ONLY selects man; ground MOUNTED selects mount, never the rider. Artillery selects engine only for Generic_3_Crew / wheeled_entity / artillery category. Every required component is nonflying, all exact joins must be present, and sync_locomotion and mounted_draughts must be false. Additional speed entities are held. Rules contain no unit-name or CA-key exceptions. Direct card readings remain manual evidence; newly stored values are EMPIRICAL_STRUCTURE_SPEED, not measurements.

Conversion is exactly raw run_speed × 10. No extra unit multiplier is supported by the six readings. The observed ×10 products are integral; rounding, floor and ceil tie on the evidence. Therefore rounding is not determined and nonintegral products are held. Positive run values were found for every admitted source. Zero fly_speed/flying_charge_speed means no positive flight movement in this chain; it does not mean a zero card Speed. No selected run_speed=0 occurs in this catalog.

walk_speed is walking movement, charge_speed/flying_charge_speed are charge movement, fly_speed is airborne movement. Acceleration/deceleration and locomotion constants affect motion behavior; they are not card Speed inputs in these validated structures. Processed schema descriptions and references are retained in schema-inventory.json. Terrain scalar_speed entries (for example small entities in shallow_water ×0.8) are conditional and are not multiplied into the basic card. Skills, items, research, rank, difficulty and active conditions are not applied. Zero and unusual movement values are retained in the audit, rather than replaced with guessed card values.

## Candidate comparison

${table(['Candidate','Direct cards matched','Legacy values matched'],r.candidateSummary.map(v=>[v.candidate,v.manualMatches+'/'+v.manualTotal,v.legacyMatches+'/'+v.legacyTotal]))}

MIN_RUN_X10 matches 2/6 direct cards and MAX_RUN_X10 matches 5/6; both fail as universal component-selection rules. The separately validated role rules restrict generalization, rather than guessing max/min on articulated or vehicle chains. Artillery walk/run/charge are equal on the measured trebuchet, so those paths are not separately identified by that card alone; engine run inherits the run-field interpretation established by the other movement structures.

${table(['Manual card','Phase','Expected','Selected run ×10','Man run ×10','Walk ×10','Charge ×10'],r.validation.map(v=>[v.name,v.phase,v.value,v.candidates.SELECTED_RUN_X10.actual,v.candidates.MAN_RUN_X10.actual,v.candidates.SELECTED_WALK_X10.actual,v.candidates.SELECTED_CHARGE_X10.actual]))}

report.json contains the expected/actual/delta table for every candidate and all 81 legacy entries, with their original admission profile and manual anchor provenance.

## Coverage by CA category

${table(['Category','COMPLETE','PARTIAL','UNKNOWN','New'],r.categories.map(v=>[v.category,v.COMPLETE,v.PARTIAL,v.UNKNOWN,v.promoted]))}

## Representative structures

${table(['Unit','Profile','Result','Speed','Reason / evidence'],r.samples.map(v=>[v.name,v.profile,v.status,v.prediction.value??'—',v.independentCardReference??(v.prediction.reasons.join('; ')||'Structural forecast; no independent UI reading')]))}

These cover ordinary and elite infantry, cavalry, monstrous infantry/cavalry, single bodies with crew, mounted vehicles, artillery, war machines, chariots, flight and swarms. Lords/heroes have separate Character records/canonical mount contexts and remain outside the Unit Speed projection; the two preserved character audit entries are recorded in report.json.

## Holds

${table(['Exact reason','Units'],Object.entries(r.reasonCounts).map(([k,v])=>[k,v]))}

The complete per-identity hold list is report.json#/catalog (prediction.reasons). Flight, synchronized movement, missing engine/articulation joins, articulated precedence, unsupported engines and alternative artillery crew types require later evidence. Equal mount/engine/articulation speeds do not identify which component the UI selects. No missing source is filled from a similar unit's name.

The fresh bounded artillery extraction has ${r.supplements.length} exact roots. ${r.supplements.filter(v=>v.previousMissing).length} restore absent engine chains. Every overlapping existing speed field matches and the complete pack/schema snapshot is identical. This is independent extraction corroboration, not an independent UI measurement.

## Scope and verification

Only movement.speed is overlaid. Raw units.json, old speed admissions, HP/count projections and all other source data remain unchanged. Runtime repository, audit and shared-identity restoration use the same checked projection. Existing Speed 81/81 survives; HP 986, count 1,071, Korean Unit names 1,110 and 23 complete rosters are protected by tests. See VALIDATION.md for executed checks and the local commit.
`;
}

export function renderAudit(r) {
  const held=r.catalog.filter(t=>t.prediction.value===null);
  return `# Speed exceptions for the next UNKNOWN pass

${held.length} Unit identities remain without a stored card Speed. This audit does not admit values. See RULES.md for validated scope and report.json for complete raw facts, processed-schema joins, source pointers and candidate comparisons.

- Flight (117): obtain an unmodified card reading that distinguishes run_speed and fly_speed for each man/mount flight topology. Flying charge is separate.
- Synchronized locomotion (3): obtain a card reading for sync_locomotion=true; establish whether shared movement changes the displayed base stat.
- Untrained engines (3): Doom-Flayers war-machine topology, Generic_2_Crew artillery and Generic_5_Crew artillery need a separate anchor. Crew count is not assumed to determine speed.
- Complete articulation (2): establish mount/engine/articulation precedence. Equal vehicle speeds alone do not prove selection against the slower man entity.
- Missing source (77): recover exact engine/articulated entity joins for 61 articulated identities and engine joins for 16 others. Do not copy a similarly named unit.
- Characters: Karl Franz and Empire Captain audit entries remain separate from the 1,110 Unit records; canonical/alias IDs and character mount contexts are unchanged.

All admitted run_speed values are positive. Zero flight fields are retained and tested as nonflight evidence. No selected zero run_speed occurs, so no zero-card meaning has been inferred. Nonintegral ×10 results would require new rounding evidence and remain held.

| ID | Unit | Structure | Raw run speeds by role | Exact hold reason |
| --- | --- | --- | --- | --- |
${held.map(t=>'| '+[t.id,t.name,t.profile,Object.entries(t.roles).map(([role,r])=>role+'='+r.run_speed).join(', '),t.prediction.reasons.join('; ')].join(' | ')+' |').join('\n')}
`;
}
