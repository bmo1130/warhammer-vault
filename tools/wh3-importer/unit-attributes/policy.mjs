// Exact, reviewed CA attribute keys and title meanings. No prefix/name aliases.
// The existing canonical IDs remain stable, including hide_forest's older ID.
const rows = [
 ['armoured_vehicle','armoured_vehicle','Directional Shield'],
 ['bound_fire_daemon','bound_fire_daemon','Bound Fire Daemon'],
 ['can_block_missiles_360','can_block_missiles_360','360 Missile Block'],
 ['can_siege','siege_attacker','Siege Attacker'],
 ['causes_fear','causes_fear','Causes Fear'],['causes_terror','causes_terror','Causes Terror'],
 ['charge_defense','charge_defense','Expert Charge Defence'],['charge_defense_vs_large','charge_defense_vs_large','Charge Defence vs. Large'],['charge_reflection','charge_reflection','Charge Reflection'],
 ['construct','construct','Construct'],['contempt','contempt','Contempt'],['daemonic','daemon','Daemonic'],
 ['devastating_flanker','devastating_flanker','Devastating Flanker'],['elemental','elemental','Elemental'],['encourages','encourages','Encourage'],['expendable','expendable','Expendable'],
 ['fatigue_immune','perfect_vigour','Perfect Vigour'],['flanking_immune','flanking_immune','Immune to Flanking'],['formed_attack','formed_attack','Formation Attack'],['glorious_charge','glorious_charge','Glorious Charge'],
 ['gunship','gunship','Gunship'],['hellforged','hellforged','Hell-Forged'],['hide_forest','stalk_in_forest','Hide (forest)'],
 ['ignore_imbue_contact_effects_enemy','ignore_imbue_contact_effects_enemy','Immune to Contact Effects'],['ignore_trees','ignore_trees','Woodsman'],['immune_to_psychology','immune_to_psychology','Immune to Psychology'],
 ['knight','knight','Knight'],['kroxigor','kroxigor','Kroxigor'],
 ['mark_khorne','mark_khorne','Mark of Khorne'],['mark_nurgle','mark_nurgle','Mark of Nurgle'],['mark_slaanesh','mark_slaanesh','Mark of Slaanesh'],['mark_tzeentch','mark_tzeentch','Mark of Tzeentch'],
 ['moulder_monster','moulder_monster','Moulder Monster'],['mounted_fire_move','fire_while_moving','Fire Whilst Moving'],['ogre_charge','ogre_charge','Ogre Charge'],['peasant','peasant','Peasant'],
 ['skink','skink','Skink'],['slayer','slayer','Slayer'],['snipe','snipe','Snipe'],['spell_mastery','spell_mastery','Mastery of Elemental Winds'],
 ['stalk','stalk','Stalk'],['strider','strider','Strider'],['tiger_warrior','tiger_warrior','Tiger Warrior'],['unbreakable','unbreakable','Unbreakable'],
 ['undead','undead','Undead','imued_effect_text'],['unspottable','unspottable','Unspottable'],['unyielding_assault','unyielding_assault','Unyielding Assault'],['wallbreaker','wallbreaker','Wallbreaker'],['yang','yang','Yang'],['yin','yin','Yin'],
];
export const attributeMappings=Object.fromEntries(rows.map(([key,canonicalId,title,field='bullet_text'])=>[key,{canonicalId,title,field}]));
export const exclusions={
 flying:['STRUCTURED_MOVEMENT','Flight is already represented by movement.canFly; this slice does not change movement.'],
 always_flying:['STRUCTURED_MOVEMENT','Always-flying state must not become a duplicate generic attribute or change movement.'],
 cant_run:['STRUCTURED_MOVEMENT','Running state belongs to movement.canRun; this slice does not change movement.'],
 squig:['TARGETING_ONLY','CA bullet text only identifies Squig for ability targeting, not a user-facing combat trait.'],
 gorger:['TARGETING_ONLY','CA bullet text only identifies Gorger for ability targeting, not a user-facing combat trait.'],
};
export const holds={
 guerrilla_deploy:'Both CA name texts are {{tr:guerrilla_deployment}}; the exact referenced Loc key is absent. No guessed key expansion or guessed Vanguard label.',
 rampage:'The CA text describes the active uncontrollable Rampaging state. Static membership does not establish when that state activates.',
 underground:'The CA text describes a currently underground Dread Maw state. Static membership does not establish activation/current state.',
};
