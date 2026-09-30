# WH3 stat semantics investigation

Research findings preceding the first conservative normalizer. **No production app-data import or modifier application.** The bounded direct-value staging pipeline is described in [NORMALIZATION.md](NORMALIZATION.md).
Environment: installed RPFM **5.1.0**, WH3 executable ProductVersion **9.0.1.0**, schema format **5**, directly opened CA `db.pack` / `local_en.pack`. These are not mod-merged or current campaign-session values.

`CONFIRMED` requires a direct definition, raw relationship or current localisation for the stated fact. `STRONGLY SUPPORTED` means consistent evidence with missing executable/runtime validation. `UNRESOLVED` means the proposed interpretation/formula lacks sufficient proof. Subfindings may be confirmed while a topic's formula remains unresolved. Confidence describes the stated scope, not a guarantee about related systems.

## Evidence and reproduction

All paths below are relative to `generated/wh3/`. Raw artifacts are intentionally Git-ignored. Each contains pack/hash/version provenance, original keyed rows, processed schema version/fields, and schema-backed joins. [semantics-findings.json](semantics-findings.json) is the small tracked interpretation record; `research/semantics-evidence.json` holds offline arithmetic inputs with row IDs, fields and source pointers. Neither is consumed by React. The conservative normalizer gate reads the findings topic statuses and reviewed game version; it does not read arithmetic hypotheses or apply a formula from the research evidence.

| Sample | Localisation-discovered main key | Purpose | Rows / table names |
| --- | --- | --- | --- |
| Grail Knights | `wh_main_brt_cav_grail_knights` | Rider + mount | 52 / 21 |
| Helstorm Rocket Battery | `wh_main_emp_art_helstorm_rocket_battery` | Multi-shot artillery | 44 / 23 |
| Bloodthirster | `wh3_main_kho_mon_bloodthirster_0` | Single entity + flight | 70 / 25 |
| Swordsmen | `wh_main_emp_inf_swordsmen` | Ordinary infantry | 42 / 17 |
| Handgunners | `wh_main_emp_inf_handgunners` | Single-shot infantry | 43 / 21 |
| Helblaster Volley Guns | `wh_main_emp_art_helblaster_volley_gun` | Different multi-shot artillery | 28 / 22 |

Additional traces are under `research/`. Display names alone enter [research-profiles.mjs](research-profiles.mjs); keys above are observed results, never discovery shortcuts. Helblaster's actual English name is plural. The initial singular query found no root and was corrected using `research/name-inspection.json` Loc evidence. Handgunners and Helblaster initially failed unique selection with two candidates; ordinary and zero-cost Imperial Supply roots share their land row. Only those research profiles were then given the explicit paid policy.

Three data kinds remain separate:

- **CA raw**: original decoded fields, including zero, false, empty strings and float precision.
- **Synthetic**: test relationships/values in fixtures; never a fallback when CA lookup fails.
- **Manual**: previous user-supplied comparison values, with no recorded patch/rank/campaign context. No independent displayed HP/speed/ammo/reload/accuracy was supplied or observed for the three new samples.

Use the existing local config/path/endpoint workflow in [README.md](README.md). With RPFM running:

```powershell
npm run research:wh3-unit -- swordsmen
npm run research:wh3-unit -- handgunners
npm run research:wh3-unit -- helblaster
npm run inspect:wh3 -- --queries tools/wh3-importer/research-queries/loc.json --output generated/wh3/research/name-inspection.json
npm run inspect:wh3 -- --queries tools/wh3-importer/research-queries/stats.json --output generated/wh3/research/stat-inspection.json
npm run inspect:wh3 -- --queries tools/wh3-importer/research-queries/effects.json --output generated/wh3/research/effect-inspection.json
npm run inspect:wh3 -- --queries tools/wh3-importer/research-queries/experience.json --output generated/wh3/research/experience-inspection.json
npm run inspect:wh3 -- --queries tools/wh3-importer/research-queries/runtime.json --output generated/wh3/research/runtime-inspection.json
npm run research:wh3-report
```

The probe's explicit named-field predicates select bounded evidence, not whole DB dumps. Queries were built from actual schema/inventory and previously observed keys/relations. `--schema-filter` inspects schema/inventory metadata without decoding DB rows. The default row limit is 200 (validated range 1–1000); exceeding it fails without saving a partial result. An initially broad effects probe exceeded 200; it was narrowed to Empire reload / Bretonnian recruitment sets. Selected joins only connect inspected rows by processed `is_reference`; single-key Loc joins also require schema `localised_fields`. Missing matches and out-of-scope endpoints do not prove global absence.

## HP

**Status: UNRESOLVED. Confidence: low for a universal total-HP formula.**

**Evidence:** `main_units.num_men`; `land_units.bonus_hit_points`, `num_mounts`, `num_engines`; separate schema-linked man, mount and engine `battle_entities.hit_points`. No total-HP formula was exposed by the inspected fields, `_kv_rules` health/hit-point predicates or `ui_unit_stats.stat_health`. The latter's `max_value=6000` is a stat-bar maximum according to schema, not the unit's total HP or a health cap.

Raw inputs: B = bonus HP, M = man/rider/crew HP, R = mount HP, E = engine HP, N = num_men, K = num_engines. `—` means absent/inapplicable; it is not substituted with zero. All values in calculation columns are **hypotheses**.

| Sample | B / M / R / E / N / K | B + M×N | (B+M)×N | Mounted (B+M+R)×N | Crew (B+M)×N + E×K | Bonus also on engines (B+M)×N + (B+E)×K | Independent manual HP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Grail | 136 / 8 / 8 / — / 48 / 0 | 520 | 6912 | **7296** | — | — | 7296 |
| Helstorm | 48 / 8 / — / 425 / 44 / 4 | 400 | 2464 | — | **4164** | **4356** | 4356 |
| Bloodthirster | 7724 / 8 / — / — / 1 / 0 | **7732** | **7732** | — | — | — | 7732 |
| Swordsmen | 61 / 8 / — / — / 120 / 0 | 1021 | 8280 | — | — | — | unknown |
| Handgunners | 61 / 8 / — / — / 90 / 0 | 781 | 6210 | — | — | — | unknown |
| Helblaster | 48 / 8 / — / 425 / 44 / 4 | 400 | 2464 | — | 4164 | 4356 | unknown |

**Formula hypothesis:** bonus appears compatible with per-man HP for unmounted units, per-rider/mount pair for cavalry, and additionally per-engine HP for artillery. This is a family of candidates, not one verified rule. Research helper returns null for missing/non-numeric inputs and never uses manual values.

**Counterexamples:** bonus-once fails the cavalry/artillery manual comparisons. Crew HP plus bare engine HP gives 4164, not 4356. Applying bonus independently to both rider and mount would instead give 13824. A single-entity sample cannot distinguish bonus-once from bonus-per-man. The two artillery samples have identical HP inputs, so they do not independently validate aggregation.

**Remaining unknowns:** runtime aggregation, unit-size scaling, reserve crew, chariots/other mixed entities, bonus application, current UI health and strength/health adjustments. Do not write `entities.totalHealth` from these candidates.

## Speed

**Status: STRONGLY SUPPORTED. Confidence: medium; three units and four manual movement comparisons.**

**Evidence:** schema-linked movement fields; UI stat `scalar_speed` localises to Speed. `research/stat-inspection.json` includes the original UI row and its Loc relationship, but no ×10 conversion field. Selected `_kv_rules` speed rows concern collision/camera/movement rules, not a verified UI conversion.

| Source | Raw | ×10 hypothesis | Supplied manual display |
| --- | --- | --- | --- |
| Grail mount run_speed | 8.4 | 84 | 84 |
| Helstorm engine run_speed | 2 | 20 | 20 |
| Bloodthirster run_speed | 5.5 | 55 | 55 |
| Bloodthirster fly_speed | 9.5 | 95 | 95 |
| Swordsmen man run_speed | 3 | 30 | unknown |
| Handgunners man run_speed | 3.3 | 33 | unknown |
| Helblaster engine run_speed | 2 | 20 | unknown |

**Formula hypothesis:** displayed base speed = selected raw speed ×10. New infantry predictions are evidence inputs, not independently verified matches.

**Counterexamples:** none among supplied manual comparisons. Artillery crew run_speed=3 predicts 30, whereas the Helstorm reference is 20; the correct entity/state matters. Charging/flying values must not be collapsed into run_speed.

**Remaining unknowns:** executable conversion, infantry UI validation, chosen entity/state, terrain, fatigue, active ability and campaign effects. Bloodthirster's Wounds phase has `scalar_speed mult 0.90000004`; raw movement is not always effective movement. Keep the conversion out of production.

## Ammo

**Status: UNRESOLVED. Confidence: low for displayed ammunition; high for separate raw fields.**

**Evidence:** actual land → missile/projectile references for Handgunners and land → engine → missile/projectile for both artillery samples.

| Sample | primary_ammo | shots_per_volley | projectile_number | burst_size | ammo / volley hypothesis | Independent manual display |
| --- | --- | --- | --- | --- | --- | --- |
| Helstorm | 66 | 3 | 1 | 1 | 22 | 22 |
| Handgunners | 22 | 1 | 1 | 1 | 22 | unknown |
| Helblaster | 198 | 9 | 1 | 1 | 22 | unknown |

Schema describes `projectile_number` as projectiles per fire position/launch and `burst_size` as shots in one burst (1 means no burst mode). `shots_per_volley` documents multi-fire-point animations and acts as a reference for systems whose usual logic assumes one shot. These definitions confirm different concepts; they do not specify UI ammunition consumption.

**Formula hypothesis:** primary_ammo / shots_per_volley could represent complete volleys. The divisibility pattern across 1/3/9 is supporting raw structure, not three UI validations.

**Counterexamples:** none with independent display data; only one display reference exists. Both other projectile counts equal 1, so the samples cannot distinguish alternative rules involving those fields. Synthetic fractional values deliberately remain fractional; zero divisor remains unknown.

**Remaining unknowns:** UI rounds versus individual shots, incomplete volleys, burst consumption, multiple projectiles/fire points, engine scaling and ammo effects. No display ammo field is normalized.

## Reload

**Status: UNRESOLVED. Confidence: low for final reload formula; high for distinct accuracy/reload inputs.**

**Evidence:** processed land schema describes `reload` as a percentage reduction of projectile reload time. Projectile `marksmanship_bonus` explicitly describes accuracy/calibration, not reload. Current Loc labels `stat_reloading` as Reload Skill and says experience improves it. `unit_experience_bonuses` has `stat_reloading: value=1, growth_rate=0, growth_scalar=2`; the growth algorithm/rank baseline is not described here.

| Sample | base_reload_time | land.reload | marksmanship_bonus | Independent manual reload |
| --- | --- | --- | --- | --- |
| Helstorm | 17 | 0 | 10 | skill 10; time 15.3 |
| Handgunners | 13 | 0 | 10 | unknown |
| Helblaster | 10 | 0 | 20 | unknown |

**Formula hypothesis:** base × (1 − reload/100) follows the percentage description, but is incomplete/unverified as the runtime algorithm. Helstorm's base rows under that candidate give 17, not 15.3. `17×0.9` is arithmetic matching a manual reference, not evidence that marksmanship controls reload.

**Counterexamples:** the schema assigns marksmanship to another stat. Experience and technology/lord effects have independent reload paths. The experience row's 1 must not be replaced by manual skill 10 or treated as a universal base without growth semantics.

**Remaining unknowns:** skill baseline/growth, animation limits, reload floors/caps, modifiers/application order and current firing time. `_kv_rules` additionally has AI reload multiplier low=1/high=2; this proves another parameter exists, not when it applies. No current reload or DPS calculation.

## Accuracy

**Status: STRONGLY SUPPORTED. Confidence: medium for combined calibration influence; low for displayed sum.**

**Evidence:** projectile schema says marksmanship reduces calibration area together with land accuracy. `calibration_distance` is the distance at which area is 100%; `calibration_area` is the possible landing area, scaling with distance and reduced by accuracy/marksmanship. `stat_accuracy` localises to Accuracy; experience row has value=0/growth_rate=0/growth_scalar=3.

| Sample | land accuracy | projectile marksmanship | Sum hypothesis | calibration distance / area | spread | Independent manual accuracy |
| --- | --- | --- | --- | --- | --- | --- |
| Helstorm | 10 | 10 | 20 | 300 / 220 | 0 | 20 |
| Handgunners | 10 | 10 | 20 | 100 / 1.8 | 0 | unknown |
| Helblaster | 10 | 20 | 30 | 275 / 7 | 0 | unknown |

**Formula hypothesis:** UI accuracy = land accuracy + marksmanship is plausible, not established by the schema's statement that both influence area. The exact calibration formula and units were not recovered.

**Counterexamples:** one UI match cannot distinguish an additive display from other runtime combinations. All spread values are zero; schema description is blank, so this investigation cannot establish spread's algorithm or even demonstrate its effect.

**Remaining unknowns:** actual UI derivation, skill/rank modifiers, distribution, area units and spread interactions. Individual raw fields and their proven source separation can be carried forward; a combined UI accuracy cannot.

## Artillery

**Status: UNRESOLVED. Confidence: low for aggregate display semantics; high for separate crew/engine identities.**

**Evidence:** both artillery traces resolve `land.man_entity → battle_entities` independently from `land.engine → battlefield_engines.battle_entity`. Each has num_men=44 and num_engines=4; crew HP/mass/size=8/100/small and engine=425/2000/large. Engine type is `Generic_3_Crew`, linked by schema to `gun_types_enum`, for which no matching table definition/file was available. Do not parse the name into a count. Actual engine fields include `scale=1` and `crew_reserve_distance_offset=0`; schema describes reserve-crew positioning with a hardcoded distance, not reserve counts.

Engine collision is already in `battle_entities`: type=artillery, shape=capsule, radius=1.8, radii_ratio≈0.45. Size schema explicitly describes collision priority/combat. The bounded schema inventory did not identify a separate table mapping these selected engines to aggregate displayed mass/size; that is not proof none exists anywhere.

**Formula hypothesis:** UI artillery count could select num_engines (manual Helstorm count=4). `44/4=11` crew records per engine and `2000+11×100=3100` reproduce manual mass arithmetically. Neither division nor sum proves crew allocation or a UI mass formula. HP alternatives are in the HP table.

**Counterexamples:** Generic_3_Crew differs from the arithmetic 11; active crew, reserve crew and total personnel may be distinct. Raw engine size large differs from manual very_large. The second artillery's equal crew/engine inputs do not provide independent display validation.

**Remaining unknowns:** num_men's exact allocation, scaling/reserves, displayed count/mass/size, aggregate HP and mixed war machines. Preserve separate raw crew and engine properties; do not combine them into a single Vault entity property yet.

## Recruitment tier

**Status: UNRESOLVED. Confidence: low for a universal display-tier rule; high for distinct fields/relations.**

**Evidence:** all selected building levels join `chain → building_chains.key`. Chain rows expose UI ordering/optional icon fields; the inspected definitions provide no universal displayed-tier formula. The following are actual level/requirement pairs, not additional observed UI values:

| Building key | Chain | raw level | primary-slot building requirement | Manual UI |
| --- | --- | --- | --- | --- |
| wh_main_brt_stables_4 / _5 | Bretonnia stables | 3 / 4 | 4 / 5 | Grail: tier-4 stables |
| wh_main_emp_barracks_1 / _2 / _3 | Empire barracks | 0 / 1 / 2 | 1 / 2 / 3 | unknown |
| wh3_dlc25_emp_shooting_range_2 / _3 | Empire shooting range | 1 / 2 | 2 / 3 | unknown |
| wh_main_emp_forges_3 / _4 | Empire forges | 2 / 3 | **4 / 5** | unknown |
| wh3_main_kho_bloodthirster_2 | Khorne Bloodthirster | **1** | **5** | unknown |

**Formula hypothesis:** `level` behaves like a zero-based position within several chains. A chain's stage, settlement requirement and effective recruitment unlock must remain separate. Key suffixes are observed labels, not authoritative displayed-tier formulas.

**Counterexamples:** forges level+1=3 but requirement=4; Bloodthirster level+1=2 but requirement=5. Rogue/horde rows in original traces differ again. Many selected recruitment junctions have enabled=false with no explanatory schema description. It is unsafe to conclude that all those recruitable units are disabled or to invert the flag.

The `building_units_allowed.unit` schema says to include units unlocked by earlier levels as well, so repeated membership across higher levels is cumulative evidence, not multiple independent unlocks. Junction conditions/faction plus effect-based recruitment locks remain raw. Bloodthirster has actual `effect_bonus_value_unit_record_junctions` rows with `bonus_value_id=recruitment_disabled`.

**Remaining unknowns:** enabled=false consumer semantics, current UI number/label, campaign/faction/technology permissions and how to derive minimal effective unlock requirements. No `campaign.recruitmentRequirements` normalization from raw junctions alone.

## Resistances

**Status: STRONGLY SUPPORTED. Confidence: medium for damage_mod-to-stat mapping; high for current UI labels.**

**Evidence:** Bloodthirster raw physical=20/magic=35/flame=0/missile=0/all=0. Current UI → stat localisation relationships plus schema-declared Loc keys are in `research/stat-inspection.json`:

| UI stat | Current English display | Raw candidate | Scope proved |
| --- | --- | --- | --- |
| stat_resistance_physical | Physical Resistance | damage_mod_physical | UI label confirmed; raw mapping supported |
| stat_resistance_missile | Missile Resistance | damage_mod_missile | UI label confirmed; raw mapping supported |
| stat_resistance_magic | **Spell Resistance** | damage_mod_magic | Current label confirmed; raw mapping supported |
| stat_resistance_flame | Flame Resistance | damage_mod_flame | UI label confirmed; raw mapping supported |
| stat_resistance_all | Damage Resistance; ward-save icon | damage_mod_all | Current label/icon confirmed; raw mapping supported |

**Formula hypothesis:** matching raw modifiers feed corresponding resistance stats, with percentage-like values. The 20/35 manual comparison and current labels support this interpretation. There is no declarative schema reference from a land numeric damage_mod field to its UI stat in the inspected data, so that runtime mapping is not upgraded to confirmed.

**Counterexamples:** land schema describes damage_mod_magic as reducing magical damage, whereas current Loc explicitly says Spell Resistance. A historical description cannot establish current magical-weapon protection. Bloodthirster's ability phase effects are distinct from base land modifiers; they must not be summed or treated as always active.

**Remaining unknowns:** current engine distinction between magical attacks/spells, stacking/caps, negative values, damage type overlap, ward-save application and effective phase values. Confirmed labels may be mapped independently; no resistance damage calculator.

## Cost discrepancies

**Status: UNRESOLVED. Confidence: low for causes of supplied discrepancies.**

**Evidence:** recruitment and multiplayer costs are distinct fields. Helblaster's current base values are 1050 versus 1000, directly demonstrating they can differ within one pack/version. `research/experience-inspection.json` has rank-0/1/9 rows with multiplayer multipliers 1/1.03/1.2700001 and fixed costs 0/11/99; schema describes a rounded cost expression, but rounding/rank selection remains unimplemented.

Grail is explicitly in brt_horse_knights / brt_knights unit sets. The pasture building effect joins to `cost_mod` and brt_horse_knights; source building rows have -20/-25/-30 values, province scope and different damaged/ruined values. These confirm a cost-modifying path, not that any specific building was active for manual 1700.

**Formula hypothesis:** observed layers may modify base cost; no combination is selected to fit the manual numbers. Bloodthirster's 575/500=1.15 is arithmetic, not evidence for a +15% difficulty effect. Selected human campaign-difficulty upkeep rows are **0**, while selected nonhuman rows have 10/40 and a campaign key.

**Counterexamples:** Grail raw1850/manual1700, charge75/78 and AP28/30 cannot be assigned a patch or campaign cause without the manual source version/context. Bloodthirster raw multiplayer2000/manual2200, recruitment2000/4600 and upkeep500/575 likewise remain unexplained. Known override paths do not prove an override occurred. Distinct recruit and battle cost fields alone do not explain those manual differences.

**Remaining unknowns:** manual date/patch, rank, unit-size settings, faction/lord/technology/building state, global/local recruitment context, active effects, session rules or source errors. No runtime balance patch/mod precedence was established.

## Runtime overrides

**Status: CONFIRMED. Confidence: high for existence and schema paths only.**

**Evidence:** `research/runtime-inspection.json` has **118 selected original rows and 100 recorded joins**. These are bounded examples, not all applicable effects for a unit:

| Layer | Actual observed path/example |
| --- | --- |
| Technology | technology_effects → effects → effect_bonus_value_ids_unit_sets → unit_sets → unit_set_to_unit; Empire missile reload technology values 10/15 |
| Building | building_effects → effects → bonus/set → Grail membership; pasture cost values -20/-25/-30 with damaged/ruined variants |
| Lord skill | character_skill_level_to_effects → same effect/set mechanism; sharpshooter level1 value10, general_to_force_own, veteran set min/max rank7/9 |
| Difficulty | campaign_difficulty_handicap_effects → effects; human, campaign key and scope retained separately |
| Experience | unit_experience_bonuses → modifiable_unit_stats → unit_stat_localisations; independent accuracy/reloading growth inputs |
| Custom battle experience cost | unit_stats_land_experience_bonuses multiplier/fixed cost, separately from recruitment base |
| Ability phase | Bloodthirster unit ability → special ability → phase → stat effect; Wounds speed×0.90000004 and base/AP damage×0.8 |
| Recruitment permission | effect_bonus_value_unit_record → main_units, including Bloodthirster recruitment_disabled records |
| Terrain and battle rules | Existing ground group effects plus selected _kv_rules AI reload/accuracy parameters |

The schema exposes `unit_stat_modifiers` / class-stat-modifier references, but bounded reload/accuracy/resistance/hit-point key queries matched zero rows there; that does not establish a live class override route for these samples. Symbolic reference targets such as `campaign_bonus_value_ids_unit_sets` and `gun_types_enum` lack matching table definitions/files in this inspected schema; they are not fabricated as DB tables.

**Formula hypothesis:** there are multiple source layers over base stats. No ordering, stacking or final value algorithm is assumed; nothing applies modifiers in this change.

**Counterexamples:** an effect's name is not enough to prove its current producer. The effect named `...tech_recruitment...horse_units` was found on a building row, with no selected technology match. Set membership is not canonical identity: Empire missile sets also contain free Imperial Supply variants. in_encyclopedia=true includes those free variants, whereas both Bloodthirster roots are false. No single inspected flag replaces profile-specific root selection.

**Remaining unknowns:** activation/scope evaluation, owner/faction and rank resolution, aggregation order, recruitment state, campaign-only multipliers beyond selected rows, script/compiled-engine overrides, multiplayer balance application and load order. No current campaign save/state was read.

**Root selection:** `paid-recruitment is a profile-specific disambiguation rule, not a universal playable-unit rule.` The selected unit's localisation/main/land relation, recruit locks, building and set membership, rank scope, encyclopedia/renown flags are candidates for future identity research, not a canonical classifier. Unique profiles can select zero-cost roots; ambiguity remains an error.

## Code changes and normalization gate

`report.mjs` retains presentation and compatibility exports; raw selectors moved to `observations/{context,base,entity,missile,index}.mjs`, with uncertainty declarations separate. Existing Grail/Helstorm/Bloodthirster observations and entire summaries were compared byte-for-byte against actual pre-refactor artifacts. Fixed synthetic observation/summary snapshots also guard regression without requiring CA data. Additional missile research profiles reuse these modules and the same tracer.

Pack SHA-256 uses `createReadStream → hash.update(chunk) → digest`; test buffers cover empty, UTF-8 and multiple stream chunks. Actual baseline pack digests are compared separately. No entire pack is loaded for hashing. RPFM still decodes individual explicitly requested tables; that is separate from hash memory use.

Start a **restricted raw-field mapping** design with provenance/unknown handling after reviewing these distinctions. Do not start a complete Unit normalizer with inferred HP, display speed/ammo/accuracy, effective recruitment or campaign costs. Current UI label mapping and independently sourced raw armor/damage/cost fields are candidates for narrowly defined mappings; entity selection, percentages and role/context contracts still need field-by-field review. The subsequent conservative normalizer maps reviewed direct facts into ignored staging outputs only; this research does not authorize formulas or production app-data changes.

| Topic | Status | Confidence | Evidence | Safe to normalize? |
| --- | --- | --- | --- | --- |
| Total HP | UNRESOLVED | Low | Six raw samples; only three manual HP references | NO |
| Display speed | STRONGLY SUPPORTED | Medium | Three units/four manual matches; new infantry raw only | NO |
| Display ammo | UNRESOLVED | Low | 1/3/9-shot raw patterns; one display reference | NO |
| Reload time | UNRESOLVED | Low | Reload description, experience and effect paths | NO |
| Accuracy | STRONGLY SUPPORTED | Medium for field roles | Calibration descriptions; three projectiles | PARTIAL |
| Artillery | UNRESOLVED | Low for aggregates | Separate entities/collision fields confirmed | PARTIAL |
| Recruitment tier | UNRESOLVED | Low for universal rule | Chain/requirement counterexamples | PARTIAL |
| Resistances | STRONGLY SUPPORTED | Medium for mapping | Current labels confirmed; runtime join missing | PARTIAL |
| Cost discrepancies | UNRESOLVED | Low | Layers exist; manual campaign context absent | PARTIAL |
| Override paths | CONFIRMED | High for existence | 118 rows/100 joins plus ability/XP evidence | PARTIAL |
