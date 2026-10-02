# Expansion batch 01

WH3 9.0.2.0 static pack extraction, 2026-10-02. No game/runtime/CCO probe. Historical representative pilot CLEAN 1 / PARTIAL 14 / BLOCKED 9 is unchanged.

Pinned portable input SHA256 (JSON value): `e10f3727bf00af27f69a0a623247275db62f4137137f1f416baf39fd7754b4e1`. Original result byte hashes are recorded per candidate. Selected processed schema fields/rows only; original extraction is ignored staging.

## All 24 exact-name discoveries

Unique roots 16; ambiguous 6; ROOT_NOT_FOUND 2. CLEAN 0 / PARTIAL 14 / BLOCKED 10. Tomb Guard variants have conflicting Tomb Kings and Vampire Counts recognized primary aliases; neither is selected.

| Name | Exact main roots (land key follows) | Result / blocker |
| --- | --- | --- |
| Halberdiers | `wh2_dlc13_emp_inf_halberdiers_imperial_supply` → `wh_main_emp_inf_halberdiers`<br>`wh_main_emp_inf_halberdiers` → `wh_main_emp_inf_halberdiers` | BLOCKED; IDENTITY_AMBIGUITY: 2 localisation-confirmed roots; no candidate selected. |
| Greatswords | `wh2_dlc13_emp_inf_greatswords_imperial_supply` → `wh_main_emp_inf_greatswords`<br>`wh_main_emp_inf_greatswords` → `wh_main_emp_inf_greatswords` | BLOCKED; IDENTITY_AMBIGUITY: 2 localisation-confirmed roots; no candidate selected. |
| Men-at-Arms (Polearms) | `wh_main_brt_inf_men_at_arms` → `wh_main_brt_inf_men_at_arms` | PARTIAL; reviewed core admitted |
| Knights of the Realm | `wh_main_brt_cav_knights_of_the_realm` → `wh_main_brt_cav_knights_of_the_realm` | PARTIAL; reviewed core admitted |
| Questing Knights | `wh_dlc07_brt_cav_questing_knights_0` → `wh_dlc07_brt_cav_questing_knights_0` | PARTIAL; reviewed core admitted |
| Foot Squires | `wh_dlc07_brt_inf_foot_squires_0` → `wh_dlc07_brt_inf_foot_squires_0` | PARTIAL; reviewed core admitted |
| Clanrats (Shields) | `wh2_main_skv_inf_clanrats_1` → `wh2_main_skv_inf_clanrats_1` | PARTIAL; reviewed core admitted |
| Stormvermin (Halberds) | `wh2_main_skv_inf_stormvermin_0` → `wh2_main_skv_inf_stormvermin_0`<br>`wh2_main_skv_inf_stormvermin_0_quest` → `wh2_main_skv_inf_stormvermin_0_quest`<br>`wh2_main_skv_inf_stormvermin_0_summoned` → `wh2_main_skv_inf_stormvermin_0_summoned` | BLOCKED; IDENTITY_AMBIGUITY: 3 localisation-confirmed roots; no candidate selected. |
| Plague Monks | `wh2_main_skv_inf_plague_monks` → `wh2_main_skv_inf_plague_monks`<br>`wh2_main_skv_inf_plague_monks_summoned` → `wh2_main_skv_inf_plague_monks_summoned` | BLOCKED; IDENTITY_AMBIGUITY: 2 localisation-confirmed roots; no candidate selected. |
| Grave Guard | `wh_main_vmp_inf_grave_guard_0` → `wh_main_vmp_inf_grave_guard_0`<br>`wh_main_vmp_inf_grave_guard_0_summoned` → `wh_main_vmp_inf_grave_guard_0_summoned` | BLOCKED; IDENTITY_AMBIGUITY: 2 localisation-confirmed roots; no candidate selected. |
| Grave Guard (Great Weapons) | `wh_main_vmp_inf_grave_guard_1` → `wh_main_vmp_inf_grave_guard_1` | PARTIAL; reviewed core admitted |
| Black Knights (Lances & Barding) | `wh_main_vmp_cav_black_knights_3` → `wh_main_vmp_cav_black_knights_3` | PARTIAL; reviewed core admitted |
| Vargheists | `wh_main_vmp_mon_vargheists` → `wh_main_vmp_mon_vargheists` | PARTIAL; reviewed core admitted |
| Tomb Guard | `wh2_dlc09_tmb_inf_tomb_guard_0` → `wh2_dlc09_tmb_inf_tomb_guard_0` | BLOCKED; NO_PRIMARY_CATALOG_MAPPING: 2 explicit pilot aliases match verified groups; cannot choose a primary catalog faction. |
| Tomb Guard (Halberds) | `wh2_dlc09_tmb_inf_tomb_guard_1` → `wh2_dlc09_tmb_inf_tomb_guard_1` | BLOCKED; NO_PRIMARY_CATALOG_MAPPING: 2 explicit pilot aliases match verified groups; cannot choose a primary catalog faction. |
| Ushabti | `wh2_dlc09_tmb_mon_ushabti_0` → `wh2_dlc09_tmb_mon_ushabti_0`<br>`wh2_dlc09_tmb_mon_ushabti_0_summoned` → `wh2_dlc09_tmb_mon_ushabti_0_summoned` | BLOCKED; IDENTITY_AMBIGUITY: 2 localisation-confirmed roots; no candidate selected. |
| Saurus Warriors (Shields) | `wh2_main_lzd_inf_saurus_warriors_1` → `wh2_main_lzd_inf_saurus_warriors_1` | PARTIAL; reviewed core admitted |
| Temple Guards | none | BLOCKED; ROOT_NOT_FOUND: 0 localisation-confirmed roots; no candidate selected. |
| Kroxigors | none | BLOCKED; ROOT_NOT_FOUND: 0 localisation-confirmed roots; no candidate selected. |
| Depth Guard | `wh2_dlc11_cst_inf_depth_guard_0` → `wh2_dlc11_cst_inf_depth_guard_0` | PARTIAL; reviewed core admitted |
| Depth Guard (Polearms) | `wh2_dlc11_cst_inf_depth_guard_1` → `wh2_dlc11_cst_inf_depth_guard_1` | PARTIAL; reviewed core admitted |
| Chosen | `wh_main_chs_inf_chosen_0` → `wh_main_chs_inf_chosen_0` | PARTIAL; reviewed core admitted |
| Chosen (Great Weapons) | `wh_main_chs_inf_chosen_1` → `wh_main_chs_inf_chosen_1` | PARTIAL; reviewed core admitted |
| Chaos Knights (Lances) | `wh_main_chs_cav_chaos_knights_1` → `wh_main_chs_cav_chaos_knights_1` | PARTIAL; reviewed core admitted |

## Explicit production admissions

All 14 admit identity, primary affiliation/catalog, classification, movement booleans, defense, melee, campaign base costs/turns and customBattle base cost. PROMOTABLE means listed subset, not complete group. No new ability/attribute mappings, faction records, Unit schema or UI changes.
All omit displayed count, HP/per-entity HP, scale, speed/ground/charge speed, resistance conversion, effective recruitment, caps and unsupported splash semantics. No raw num_men conversion. Missile is omitted for every new Unit: no primary/junction/engine profile found in this bounded inspection; no absence-as-inability claim.

<a id="expansion-01-03"></a>

### Men-at-Arms (Polearms)

- Main: `wh_main_brt_inf_men_at_arms`; land: `wh_main_brt_inf_men_at_arms`; production ID: `ca_unit_wh_main_brt_inf_men_at_arms`.
- Primary catalog: `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":100}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `charge_defense_vs_large`, `charge_reflection`, `peasant`, `wh_dlc07_unit_passive_the_peasants_duty`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-03.result.json`; byte SHA256 `53126b60c8df9787a4320ba293c2021c9e09f580fdc807c84bea3b3c9ef26d09`.

<a id="expansion-01-04"></a>

### Knights of the Realm

- Main: `wh_main_brt_cav_knights_of_the_realm`; land: `wh_main_brt_cav_knights_of_the_realm`; production ID: `ca_unit_wh_main_brt_cav_knights_of_the_realm`.
- Primary catalog: `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; abilities: abilities.0; attributes: attributes.0, attributes.1.
- Withheld groups: passiveAbilities, missile. Mounted representative unresolved: no rider/mount size, mass, resistance or speed selected. Core admission needs no runtime.
- Entity projection: `{}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.entitySize, entities.mass, entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.projectilePenetrationResistance, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-04.result.json`; byte SHA256 `71f41e4bf28d7352e45b45e887b079929101116f2b2bac8d8b21ae0579da6afa`.

<a id="expansion-01-05"></a>

### Questing Knights

- Main: `wh_dlc07_brt_cav_questing_knights_0`; land: `wh_dlc07_brt_cav_questing_knights_0`; production ID: `ca_unit_wh_dlc07_brt_cav_questing_knights_0`.
- Primary catalog: `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; abilities: abilities.0; attributes: attributes.0, attributes.1, attributes.2.
- Withheld groups: passiveAbilities, missile. Mounted representative unresolved: no rider/mount size, mass, resistance or speed selected. Core admission needs no runtime.
- Entity projection: `{}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.entitySize, entities.mass, entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.projectilePenetrationResistance, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `wh_main_lord_passive_the_blessing_of_the_lady_unit_upgrade`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-05.result.json`; byte SHA256 `c7ad50660dae6e7b60fd3d5cdcc308d274ac859b83aa77535ca562d99ff4d41e`.

<a id="expansion-01-06"></a>

### Foot Squires

- Main: `wh_dlc07_brt_inf_foot_squires_0`; land: `wh_dlc07_brt_inf_foot_squires_0`; production ID: `ca_unit_wh_dlc07_brt_inf_foot_squires_0`.
- Primary catalog: `wh_main_group_bretonnia` → `bretonnia` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":120}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `peasant`, `wh_dlc07_unit_passive_the_peasants_duty`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-06.result.json`; byte SHA256 `4dcbd67a0617e51617852228aa5789c6e857208702cd6a8c7407ae10852eba06`.

<a id="expansion-01-07"></a>

### Clanrats (Shields)

- Main: `wh2_main_skv_inf_clanrats_1`; land: `wh2_main_skv_inf_clanrats_1`; production ID: `ca_unit_wh2_main_skv_inf_clanrats_1`.
- Primary catalog: `wh2_main_skv` → `skaven` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; attributes: attributes.0.
- Withheld groups: passiveAbilities, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":100}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `wh2_main_unit_passive_scurry_away`, `wh2_main_unit_passive_strength_in_numbers`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-07.result.json`; byte SHA256 `b5541190406e620f97818ccef6e9568b5bb3dedfeb01c2a125a6b38aca0cb16d`.

<a id="expansion-01-11"></a>

### Grave Guard (Great Weapons)

- Main: `wh_main_vmp_inf_grave_guard_1`; land: `wh_main_vmp_inf_grave_guard_1`; production ID: `ca_unit_wh_main_vmp_inf_grave_guard_1`.
- Primary catalog: `wh_main_group_vampire_counts` → `vampire_counts` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":100}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `undead`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-11.result.json`; byte SHA256 `40ab5d7fbd68c08bc70363feb011ea17bbb77bb4739c35a7d88602f786c4736d`.

<a id="expansion-01-12"></a>

### Black Knights (Lances & Barding)

- Main: `wh_main_vmp_cav_black_knights_3`; land: `wh_main_vmp_cav_black_knights_3`; production ID: `ca_unit_wh_main_vmp_cav_black_knights_3`.
- Primary catalog: `wh_main_group_vampire_counts` → `vampire_counts` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Mounted representative unresolved: no rider/mount size, mass, resistance or speed selected. Core admission needs no runtime.
- Entity projection: `{}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.entitySize, entities.mass, entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.projectilePenetrationResistance, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `strider`, `undead`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-12.result.json`; byte SHA256 `e03f2eef1fb0c201da0e0ab8102c38375b9f6ae87c75d5332a512ad0d6c895ac`.

<a id="expansion-01-13"></a>

### Vargheists

- Main: `wh_main_vmp_mon_vargheists`; land: `wh_main_vmp_mon_vargheists`; production ID: `ca_unit_wh_main_vmp_mon_vargheists`.
- Primary catalog: `wh_main_group_vampire_counts` → `vampire_counts` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish, movement.canFly; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets, melee.splash.maxTargetSize; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"large","mass":1300}`; movement: `{"canSkirmish":false,"canFly":true}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canRun, defense.resistances, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `undead`, `wh2_dlc11_unit_passive_the_hunger`, `wh_main_unit_passive_frenzy`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-13.result.json`; byte SHA256 `e00cb7bcfcb4aa4ffec86d021d4e715ccfae5f1f4a75eca491c981abd05efb84`.

<a id="expansion-01-17"></a>

### Saurus Warriors (Shields)

- Main: `wh2_main_lzd_inf_saurus_warriors_1`; land: `wh2_main_lzd_inf_saurus_warriors_1`; production ID: `ca_unit_wh2_main_lzd_inf_saurus_warriors_1`.
- Primary catalog: `wh2_main_lzd` → `lizardmen` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; attributes: attributes.0.
- Withheld groups: passiveAbilities, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":190}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `wh2_main_unit_passive_primal_instincts`, `wh3_dlc24_unit_passive_predatory_fighter`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-17.result.json`; byte SHA256 `38e6232b76cac76cb07ef03788ad80c9c1e6ff98c75122c0ce27e52aaec46eec`.

<a id="expansion-01-20"></a>

### Depth Guard

- Main: `wh2_dlc11_cst_inf_depth_guard_0`; land: `wh2_dlc11_cst_inf_depth_guard_0`; production ID: `ca_unit_wh2_dlc11_cst_inf_depth_guard_0`.
- Primary catalog: `wh2_dlc11_group_vampire_coast` → `vampire_coast` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":160}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `undead`, `wh2_dlc11_unit_passive_the_hunger`, `wh_main_unit_passive_frenzy`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-20.result.json`; byte SHA256 `310c446d665fcd00d659b7adff9d633d8d549efba7f959acd8b23e07bbaefe08`.

<a id="expansion-01-21"></a>

### Depth Guard (Polearms)

- Main: `wh2_dlc11_cst_inf_depth_guard_1`; land: `wh2_dlc11_cst_inf_depth_guard_1`; production ID: `ca_unit_wh2_dlc11_cst_inf_depth_guard_1`.
- Primary catalog: `wh2_dlc11_group_vampire_coast` → `vampire_coast` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost.
- Withheld groups: passiveAbilities, attributes, missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":160}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: `charge_defense_vs_large`, `charge_reflection`, `undead`, `wh2_dlc11_unit_passive_the_hunger`, `wh_main_unit_passive_frenzy`, `wh_main_unit_passive_unstable`, `wh_main_unit_passive_unstable_mark_ii`. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-21.result.json`; byte SHA256 `87bb7714f0777b17d11236cdc29ded73cdf208c39db9d843bfb2c0c0f189aa70`.

<a id="expansion-01-22"></a>

### Chosen

- Main: `wh_main_chs_inf_chosen_0`; land: `wh_main_chs_inf_chosen_0`; production ID: `ca_unit_wh_main_chs_inf_chosen_0`.
- Primary catalog: `wh_main_group_chaos` → `warriors_of_chaos` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; attributes: attributes.0.
- Withheld groups: missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":160}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: none. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-22.result.json`; byte SHA256 `2168e604cdf2897bcbaf330c23c898600999c2b1398dd806e2f67350fc98b5b8`.

<a id="expansion-01-23"></a>

### Chosen (Great Weapons)

- Main: `wh_main_chs_inf_chosen_1`; land: `wh_main_chs_inf_chosen_1`; production ID: `ca_unit_wh_main_chs_inf_chosen_1`.
- Primary catalog: `wh_main_group_chaos` → `warriors_of_chaos` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; entities: entities.entitySize, entities.mass; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance, defense.projectilePenetrationResistance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; attributes: attributes.0.
- Withheld groups: missile. Unique schema-connected MAN supports only direct per-entity size/mass/resistance. No displayed count/HP/speed/scale inference.
- Entity projection: `{"entitySize":"small","mass":160}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: none. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-23.result.json`; byte SHA256 `cb26449c739405c3712149a2741831926c3fe4bbb6c558246a612fbc98cec90f`.

<a id="expansion-01-24"></a>

### Chaos Knights (Lances)

- Main: `wh_main_chs_cav_chaos_knights_1`; land: `wh_main_chs_cav_chaos_knights_1`; production ID: `ca_unit_wh_main_chs_cav_chaos_knights_1`.
- Primary catalog: `wh_main_group_chaos` → `warriors_of_chaos` (not exclusive ownership/effective recruitment).
- Admitted fields: identity: id, name; affiliation/catalog: factionId; classification: classification.category, classification.tier; movement: movement.canSkirmish; defense: defense.armor, defense.meleeDefense, defense.leadership, defense.shieldBlockChance; melee: melee.meleeAttack, melee.chargeBonus, melee.damage.base, melee.damage.armorPiercing, melee.damage.bonusVsLarge, melee.damage.bonusVsInfantry, melee.attackInterval, melee.weaponLength, melee.splash.maxTargets; campaign: campaign.recruitmentCost, campaign.upkeep, campaign.recruitmentTurns; customBattle: customBattle.cost; attributes: attributes.0, attributes.1.
- Withheld groups: missile. Mounted representative unresolved: no rider/mount size, mass, resistance or speed selected. Core admission needs no runtime.
- Entity projection: `{}`; movement: `{"canSkirmish":false}`.
- All omitted fields: entities.entitySize, entities.mass, entities.totalHealth, entities.healthPerEntity, entities.count, entities.unitScale, movement.speed, movement.groundSpeed, movement.chargeSpeed, movement.canFly, movement.canRun, defense.projectilePenetrationResistance, defense.resistances, melee.splash.maxTargetSize, melee.attackAttributes.flaming, missile.range, missile.projectile.baseDamage, missile.projectile.armorPiercingDamage, missile.projectile.bonusVsLarge, missile.projectile.bonusVsInfantry, missile.projectile.shotsPerVolley, missile.explosion.baseDamage, missile.explosion.armorPiercingDamage, missile.explosion.radius, missile.accuracy.calibrationDistance, missile.accuracy.calibrationArea, missile.reload.baseTime, missile.projectile.penetration.resistanceBudget, missile.projectile.penetration.stopsAtEntitySize, missile.ammunition, missile.accuracy.accuracy, missile.reload.reloadSkill, missile.reload.currentTime, missile.strength, missile.projectile.ignoresShields, missile.projectile.penetration.maxPenetrations, campaign.recruitmentRequirements, campaign.unitCap.
- Remaining raw unknown IDs: none. Unknown optional groups withdrawn in full, including already mapped members.
- Original ignored result: `generated/wh3/expansion-batch-01/units/expansion-01-24.result.json`; byte SHA256 `b4c889422a5279bafd73d294b18c2e518c13d7afb04f972bb3881f72d8473076`.

## Preservation and replay

Previous 15 Production + 5 Sample records preserved with exact value/order equality. Diagnostic and shared identity artifacts unchanged. Personal target IDs/backup v1, faction registry, schema and UI unchanged.
Replay: `node scripts/review-expansion-batch-01.mjs --check`; `node scripts/promote-expansion-batch-01.mjs --check`. Both work without local packs. `project-expansion-batch-01.mjs --check` additionally checks ignored original staging bytes. Live static integration: `node --test tools/wh3-importer/expansion-batch-01/static.integration.test.mjs` with `WH3_RUN_INTEGRATION=1`.
Final collection: Production 29 / Sample 5 / diagnostic evidence 5 / diagnostic-only 0 / unique catalog 34.
