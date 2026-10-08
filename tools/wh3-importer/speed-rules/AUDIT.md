# Speed exceptions for the next UNKNOWN pass

202 Unit identities remain without a stored card Speed. This audit does not admit values. See RULES.md for validated scope and report.json for complete raw facts, processed-schema joins, source pointers and candidate comparisons.

- Flight (117): obtain an unmodified card reading that distinguishes run_speed and fly_speed for each man/mount flight topology. Flying charge is separate.
- Synchronized locomotion (3): obtain a card reading for sync_locomotion=true; establish whether shared movement changes the displayed base stat.
- Untrained engines (3): Doom-Flayers war-machine topology, Generic_2_Crew artillery and Generic_5_Crew artillery need a separate anchor. Crew count is not assumed to determine speed.
- Complete articulation (2): establish mount/engine/articulation precedence. Equal vehicle speeds alone do not prove selection against the slower man entity.
- Missing source (77): recover exact engine/articulated entity joins for 61 articulated identities and engine joins for 16 others. Do not copy a similarly named unit.
- Characters: Karl Franz and Empire Captain audit entries remain separate from the 1,110 Unit records; canonical/alias IDs and character mount contexts are unchanged.

All admitted run_speed values are positive. Zero flight fields are retained and tested as nonflight evidence. No selected zero run_speed occurs, so no zero-card meaning has been inferred. Nonintegral ×10 results would require new rounding evidence and remain held.

| ID | Unit | Structure | Raw run speeds by role | Exact hold reason |
| --- | --- | --- | --- | --- |
| ca_unit_wh2_dlc12_skv_veh_doom_flayer_0 | Doom-Flayers | ENGINE | man=4.2, engine=7.2 | UNVALIDATED_ENGINE_STRUCTURE |
| ca_unit_wh_main_brt_cav_pegasus_knights | Pegasus Knights | MOUNTED | man=3.3, mount=8.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_vmp_veh_black_coach | Black Coach | ARTICULATED | man=3, mount=7.8, engine=7.8, articulation=7.8 | ARTICULATION_PRECEDENCE_UNVALIDATED |
| ca_unit_wh2_dlc09_tmb_veh_skeleton_chariot_0 | Skeleton Chariots | ARTICULATED | man=2.8, mount=7.4, engine=7.4, articulation=7.4 | ARTICULATION_PRECEDENCE_UNVALIDATED |
| ca_unit_wh_main_vmp_mon_vargheists | Vargheists | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc07_brt_cav_royal_pegasus_knights_0 | Royal Pegasus Knights | MOUNTED | man=3.3, mount=8.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc04_emp_veh_templehof_luminark_0 | Templehof Luminark (Luminark of Hysh) | ARTICULATED | man=3, mount=5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_main_emp_veh_luminark_of_hysh_0 | Luminark of Hysh | ARTICULATED | man=3, mount=5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_main_emp_veh_steam_tank | Steam Tank | ARTICULATED | man=4, mount=4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc13_emp_veh_steam_tank_ror_0 | The Emperor's Wrath (Steam Tank) | ARTICULATED | man=4, mount=4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc13_emp_veh_war_wagon_0 | War Wagons | ARTICULATED | man=3.3, mount=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc13_emp_veh_war_wagon_1 | War Wagons (Mortars) | ARTICULATED | man=3.3, mount=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc13_emp_veh_war_wagon_ror_0 | The Black Lions (War Wagons – Helblasters) | ARTICULATED | man=3.3, mount=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc13_huntmarshall_veh_obsinite_gyrocopter_0 | Obsinite Gyrocopters | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc25_emp_veh_marienburg_land_ship | Land Ship | ARTICULATED | man=3.3, mount=5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc25_emp_veh_marienburg_land_ship_morr | Amethyst Land Ship | ARTICULATED | man=3.3, mount=5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc25_emp_veh_marienburg_land_ship_ror | The Wonder of the Age (Land Ship) | ARTICULATED | man=3.3, mount=5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc25_emp_veh_steam_tank_volley_gun | Steam Tank (Volley Gun) | ARTICULATED | man=4, mount=4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc29_emp_veh_celestial_hurricanum_0 | Celestial Hurricanum | ARTICULATED | man=3, mount=5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc04_vmp_inf_konigstein_stalkers_0 | The Konigstein Stalkers (Skeleton Warriors) | MAN_ONLY | man=3.1 | UNVALIDATED_SYNC_OR_DRAUGHT |
| ca_unit_wh_dlc04_vmp_mon_devils_swartzhafen_0 | The Devils of Swartzhafen (Vargheists) | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc04_vmp_veh_claw_of_nagash_0 | The Claw of Nagash (Mortis Engine) | ENGINE | man=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc04_vmp_veh_corpse_cart_0 | Corpse Cart | ARTICULATED | man=3, mount=2.3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc04_vmp_veh_corpse_cart_1 | Corpse Cart (Balefire) | ARTICULATED | man=3, mount=2.3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc04_vmp_veh_corpse_cart_2 | Corpse Cart (Unholy Lodestone) | ARTICULATED | man=3, mount=2.3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc04_vmp_veh_mortis_engine_0 | Mortis Engine | ENGINE | man=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh_main_vmp_inf_skeleton_warriors_0 | Skeleton Warriors | MAN_ONLY | man=3.1 | UNVALIDATED_SYNC_OR_DRAUGHT |
| ca_unit_wh_main_vmp_inf_skeleton_warriors_1 | Skeleton Spearmen | MAN_ONLY | man=3.1 | UNVALIDATED_SYNC_OR_DRAUGHT |
| ca_unit_wh_main_vmp_mon_fell_bats | Fell Bats | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_vmp_mon_terrorgheist | Terrorgheist | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc29_vmp_mon_zombie_dragon | Zombie Dragon | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc29_vmp_veh_coven_throne | Coven Throne | ENGINE | man=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc06_grn_cav_teef_robbers_0 | Teef Robbers (Goblin Wolf Chariots) | ARTICULATED | man=3.3, mount=11 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_main_grn_cav_goblin_wolf_chariot | Goblin Wolf Chariots | ARTICULATED | man=3.3, mount=9 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_main_grn_cav_orc_boar_chariot | Orc Boar Chariots | ARTICULATED | man=3.3, mount=7 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc15_grn_mon_wyvern_waaagh_0 | Feral Wyvern | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_grn_veh_snotling_pump_wagon_0 | Snotling Pump Wagons | ENGINE | man=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc15_grn_veh_snotling_pump_wagon_flappas_0 | Snotling Pump Wagons (Flappas) | ENGINE | man=7 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc15_grn_veh_snotling_pump_wagon_roller_0 | Snotling Pump Wagons (Spiky Rollers) | ENGINE | man=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc15_grn_veh_snotling_pump_wagon_ror_0 | Logey Bogey’s Spore ‘Splodaz (Snotling Pump Wagons) | ENGINE | man=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_twa03_grn_mon_wyvern_0 | Feral Wyvern | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc07_brt_cav_royal_hippogryph_knights_0 | Royal Hippogryph Knights | MOUNTED | man=3.3, mount=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc09_tmb_art_casket_of_souls_0 | Casket of Souls | ENGINE | man=2.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc09_tmb_mon_carrion_0 | Carrion | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc09_tmb_mon_carrion_ror | The Flock of Djaf (Carrion) | MAN_ONLY | man=9 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc09_tmb_mon_fell_bats | Fell Bats | MAN_ONLY | man=7.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc09_tmb_mon_morghast_archai | Morghast Archai | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc09_tmb_mon_morghast_harbingers | Morghast Harbingers | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc09_tmb_veh_skeleton_archer_chariot_0 | Skeleton Archer Chariots | ARTICULATED | man=3.3, mount=7.4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc11_cst_cav_deck_droppers_0 | Deck Droppers | MOUNTED | man=2.3, mount=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc11_cst_cav_deck_droppers_1 | Deck Droppers (Bombers) | MOUNTED | man=2.3, mount=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc11_cst_cav_deck_droppers_2 | Deck Droppers (Handgunners) | MOUNTED | man=2.3, mount=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc11_cst_cav_deck_droppers_ror_0 | Salt Lord Scuttlers (Deck Droppers – Bombers) | MOUNTED | man=2.3, mount=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc11_cst_mon_fell_bats | Fell Bats | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc11_cst_mon_terrorgheist | Death Shriek Terrorgheist | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc12_skv_veh_doom_flayer_ror_0 | Dwarf-Thing Menace (Doom-Flayers) | ENGINE | man=4.2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc12_skv_veh_doom_flayer_ror_tech_lab_0 | Blackhole Flayers (Doom-Flayers) | ENGINE | man=4.2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc12_skv_veh_doomwheel_ror_0 | Wheelz of Dooom (Doomwheel) | ENGINE | man=4.2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc12_skv_veh_doomwheel_ror_tech_lab_0 | Warpfire's Wheel (Doomwheel) | ENGINE | man=4.2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_main_skv_veh_doomwheel | Doomwheel | ENGINE | man=4.2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc29_skv_art_warp_doom_magma_cannon | Warp-Doom Magma-Cannon | ENGINE | man=4.2, engine=2 | UNVALIDATED_ENGINE_STRUCTURE |
| ca_unit_wh2_dlc12_lzd_cav_ripperdactyl_riders_0 | Ripperdactyl Riders | MOUNTED | man=4.8, mount=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc12_lzd_cav_ripperdactyl_riders_0_blessed | Blessed Ripperdactyl Riders | MOUNTED | man=4.8, mount=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc12_lzd_cav_ripperdactyl_riders_ror_0 | Colossadon Hunters (Ripperdactyl Riders) | MOUNTED | man=4.8, mount=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc12_lzd_cav_terradon_riders_ror_0 | Pahaux Sentinels (Terradon Riders) | MOUNTED | man=4.8, mount=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc17_lzd_mon_coatl_0 | Coatl | MAN_ONLY | man=4.6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc17_lzd_mon_coatl_ror_0 | Spirit of Tepok (Coatl) | MAN_ONLY | man=4.6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_lzd_cav_terradon_riders_0 | Terradon Riders | MOUNTED | man=4.8, mount=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_lzd_cav_terradon_riders_0_blessed | Blessed Terradon Riders | MOUNTED | man=4.8, mount=8.4 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_lzd_cav_terradon_riders_1 | Terradon Riders (Fireleech Bolas) | MOUNTED | man=4.8, mount=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_lzd_cav_terradon_riders_blessed_1 | Blessed Terradon Riders (Fireleech Bolas) | MOUNTED | man=4.8, mount=8.4 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc16_wef_mon_cave_bats | Cave Bats | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_ksl_veh_heavy_war_sled_0 | Heavy War Sleds | ARTICULATED | man=3.3, mount=6.6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_ksl_veh_light_war_sled_0 | Light War Sleds | ARTICULATED | man=3.3, mount=7.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_ksl_veh_little_grom_0 | Little Grom | ARTICULATED | man=3, mount=3.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc26_ogr_mon_blood_vultures | Blood Vultures | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_ogr_veh_gnoblar_scraplauncher_0 | Gnoblar Scraplauncher | ARTICULATED | man=3, mount=6.6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_ogr_veh_ironblaster_0 | Ironblaster | ARTICULATED | man=3, mount=6.6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc20_chs_cav_chaos_chariot_mkho | Chaos Chariots of Khorne | ARTICULATED | man=3.3, mount=7.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_kho_cav_gorebeast_chariot | Gorebeast Chariots of Khorne | ARTICULATED | man=3.3, mount=6.6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_kho_inf_chaos_furies_0 | Chaos Furies (Khorne) | MAN_ONLY | man=10 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_kho_mon_bloodthirster_0 | Bloodthirster | MAN_ONLY | man=5.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_twa08_kho_mon_bloodthirster_0_ror | Khorne’s Bloody Fist (Bloodthirster) | MAN_ONLY | man=5.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc23_chd_mon_bale_taurus | Bale Taurus | MAN_ONLY | man=7.4 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc23_chd_mon_great_taurus | Great Taurus | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc23_chd_mon_lammasu | Lammasu | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc23_chd_veh_deathshrieker_rocket_launcher | Deathshrieker Rocket Launcher | ENGINE | man=1.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_dreadquake_mortar | Dreadquake Mortar | ARTICULATED | man=1.5, mount=2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_iron_daemon | Iron Daemon | ARTICULATED | man=1.5, mount=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_iron_daemon_1dreadquake | Iron Daemon – Dreadquake Mortar | ARTICULATED | man=1.5, mount=5.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_iron_daemon_3payload_qb | Supply Train | ARTICULATED | man=1.5, mount=5.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_iron_daemon_ror | The Daemon's Tongue (Iron Daemon) | ARTICULATED | man=1.5, mount=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_iron_daemon_ror_1dreadquake | The Daemon's Tongue – Dreadquake Mortar | ARTICULATED | man=1.5, mount=5.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_magma_cannon | Magma Cannon | ENGINE | man=1.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_skullcracker | Skullcracker | ARTICULATED | man=1.5, mount=6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc23_chd_veh_skullcracker_1dreadquake | Skullcracker – Dreadquake Mortar | ARTICULATED | man=1.5, mount=5.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc20_chs_cav_chaos_chariot_mtze | Chaos Chariots of Tzeentch | ARTICULATED | man=3.3, mount=7.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc24_tze_mon_cockatrice | Cockatrice | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_tze_mon_flamers_changebringers | Changebringers | MAN_ONLY | man=9.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_tze_mon_screamers_ror | Shrieking Skyrays (Screamers of Tzeentch) | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_nor_cav_chaos_chariot_ror | Followers of the Great Eagle (Marauder Chariots) | ARTICULATED | man=3.3, mount=7.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_tze_cav_doom_knights_0 | Doom Knights of Tzeentch | MAN_ONLY | man=9.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_tze_inf_chaos_furies_0 | Chaos Furies (Tzeentch) | MAN_ONLY | man=10 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_tze_mon_lord_of_change_0 | Lord of Change | MAN_ONLY | man=5.4 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_tze_mon_screamers_0 | Screamers of Tzeentch | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_tze_veh_burning_chariot_0 | Burning Chariot of Tzeentch | MOUNTED | man=5, mount=8.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_twa07_tze_cav_doom_knights_ror_0 | Knights of Immolation (Doom Knights of Tzeentch) | MAN_ONLY | man=9.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_twa08_tze_mon_lord_of_change_0_ror | The Golden Griffin of Theurgy (Lord of Change) | MAN_ONLY | man=5.4 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc20_chs_cav_chaos_chariot_msla | Chaos Chariots of Slaanesh | ARTICULATED | man=3.3, mount=8.3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc20_chs_cav_chaos_chariot_msla_ror | The Sibilant Slaughtercade (Chaos Chariots) | ARTICULATED | man=3.3, mount=10 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc27_sla_mon_preyton | Preyton | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_sla_mon_preyton_ror | Scourge of Arden (Preyton) | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_sla_veh_seeker_chariot_ror | Heralds of Excess (Seeker Chariots) | ARTICULATED | man=3.3, mount=10 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_sla_inf_chaos_furies_0 | Chaos Furies (Slaanesh) | MAN_ONLY | man=10 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_sla_veh_exalted_seeker_chariot_0 | Exalted Seeker Chariot | ARTICULATED | man=3.3, mount=10 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_sla_veh_hellflayer_0 | Hellflayers | ARTICULATED | man=3.3, mount=10 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_sla_veh_seeker_chariot_0 | Seeker Chariots | ARTICULATED | man=3.3, mount=10 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc03_bst_cav_razorgor_chariot_0 | Razorgor Chariots | ARTICULATED | man=3.8, mount=7 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc03_bst_feral_manticore | Feral Manticore | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc05_bst_mon_harpies_0 | Harpies | MAN_ONLY | man=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc17_bst_cav_tuskgor_chariot_0 | Tuskgor Chariots | ARTICULATED | man=3.8, mount=7 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc24_bst_mon_cockatrice | Cockatrice | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_bst_mon_chimera | Chimera | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_bst_mon_chimera_ror | Bloodshriek Chimera (Chimera) | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_bst_mon_preyton | Preyton | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_bst_mon_preyton_ror | Scourge of Arden (Preyton) | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc10_def_cav_raven_heralds_ror_0 | Raven Heralds (Dark Riders) | MOUNTED | man=3.3, mount=8.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc10_def_mon_feral_manticore_0 | Feral Manticore | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc14_def_cav_scourgerunner_chariot_0 | Scourgerunner Chariots | ARTICULATED | man=3.3, mount=8.4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc14_def_cav_scourgerunner_chariot_ror_0 | Ravagers of Rakarth (Scourgerunner Chariots) | ARTICULATED | man=3.3, mount=8.4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_dlc14_def_inf_harpies_ror_0 | The Crows of Khaine (Harpies) | MAN_ONLY | man=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc14_def_veh_bloodwrack_shrine_0 | Bloodwrack Shrine | ENGINE | man=5.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING |
| ca_unit_wh2_main_def_cav_cold_one_chariot | Cold One Chariots | ARTICULATED | man=3.3, mount=6.6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_main_def_inf_harpies | Harpies | MAN_ONLY | man=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_def_mon_black_dragon | Black Dragon | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc05_wef_cav_hawk_riders_0 | Hawk Riders | MOUNTED | man=3.3, mount=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc05_wef_forest_dragon_0 | Forest Dragon | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc05_wef_mon_great_eagle_0 | Great Eagle | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc16_wef_mon_ceithin_har_summoned | Ceithin-Har | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc16_wef_mon_feral_manticore | Feral Manticore | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc16_wef_mon_gwindalor_summoned | Gwindalor | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc16_wef_mon_hawks_0 | Great Hawks | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc06_dwf_veh_skyhammer_0 | Skyhammer Squadron (Gyrobombers) | MAN_ONLY | man=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_dwf_veh_gyrobomber | Gyrobombers | MAN_ONLY | man=6 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_dwf_veh_gyrocopter_0 | Gyrocopters | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_dwf_veh_gyrocopter_1 | Gyrocopters (Brimstone Guns) | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_dwf_veh_gyrocopter_1_grudge_reward | Gyrocopters (Trollhammers – Grudge Settlers) | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc25_dwf_art_goblin_hewer | Goblin Hewers | ENGINE | man=4, engine=4 | UNVALIDATED_ENGINE_STRUCTURE |
| ca_unit_wh3_dlc25_dwf_veh_thunderbarge | Thunderbarge | MOUNTED | man=3, mount=3 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc25_dwf_veh_thunderbarge_grungni_mp | The Spirit of Grungni | MOUNTED | man=3, mount=3 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc20_chs_cav_chaos_chariot_mnur | Chaos Chariots of Nurgle | ARTICULATED | man=3.3, mount=7.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc25_nur_cav_plague_drones_1_ror | The Angels of Decay (Plague Drones – Death's Heads) | MOUNTED | man=4.8, mount=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc25_nur_chieftain_mon_frost_wyrm_0 | Chaos Frost Dragon | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc25_nur_chieftain_veh_dreadquake_mortar | Dreadquake Mortar | ARTICULATED | man=1.5, mount=2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_nur_cav_plague_drones_0 | Plague Drones of Nurgle | MOUNTED | man=3.3, mount=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_nur_cav_plague_drones_1 | Plague Drones of Nurgle (Death's Heads) | MOUNTED | man=4.8, mount=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_nur_inf_chaos_furies_0 | Chaos Furies (Nurgle) | MAN_ONLY | man=10 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_nur_mon_rot_flies_0 | Rot Flies | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc08_nor_feral_manticore | Feral Manticore | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc08_nor_mon_frost_wyrm_0 | Chaos Frost Dragon | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc08_nor_mon_frost_wyrm_ror_0 | The Cold-Voider (Chaos Frost Dragon) | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc08_nor_veh_marauder_warwolves_chariot_0 | Marauder Ice Wolf Chariots | ARTICULATED | man=3.3, mount=9.5 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_main_nor_cav_chaos_chariot | Marauder Chariots | ARTICULATED | man=3.3, mount=7.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc27_nor_mon_chimera | Chimera | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_nor_mon_chimera_ror | Bloodshriek Chimera (Chimera) | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_inf_mistwalkers_griffon_knights_0 | Knights of Tor Gaval | MOUNTED | man=3.4, mount=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_arcane_phoenix_0 | Arcane Phoenix | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_arcane_phoenix_ror_0 | Omen of Asuryan (Arcane Phoenix) | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_black_dragon_imrik | Shackolot the Calamity | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_forest_dragon_imrik | Bruwor, Protector of Life | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_moon_dragon_imrik | Lamoureux the Frozen Breath | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_star_dragon_imrik | Ymwrath the Eternal | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_mon_sun_dragon_imrik | Gordinar, Champion of the Flame | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_dlc15_hef_veh_lion_chariot_of_chrace_0 | Lion Chariots of Chrace | ARTICULATED | man=7.2, mount=8.2 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_main_hef_cav_ithilmar_chariot | Ithilmar Chariots | ARTICULATED | man=3.3, mount=8.4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_main_hef_cav_tiranoc_chariot | Tiranoc Chariots | ARTICULATED | man=3.3, mount=8.4 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh2_main_hef_mon_great_eagle | Great Eagle | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_hef_mon_moon_dragon | Moon Dragon | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_hef_mon_phoenix_flamespyre | Flamespyre Phoenix | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_hef_mon_phoenix_frostheart | Frostheart Phoenix | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_hef_mon_star_dragon | Star Dragon | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh2_main_hef_mon_sun_dragon | Sun Dragon | MAN_ONLY | man=6.5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_hef_veh_skycutter_bolt_thrower | Lothern Skycutters (Bolt Throwers) | MOUNTED | man=3.3, mount=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc27_hef_veh_skycutter_bows | Lothern Skycutters | MOUNTED | man=3.3, mount=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_cth_inf_onyx_crowmen | Onyx Crowmen | MAN_ONLY | man=4.8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_cth_inf_onyx_crowmen_ror | Empress Crowmen (Onyx Crowmen) | MAN_ONLY | man=5 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_cth_mon_celestial_lion | Celestial Lion | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_cth_mon_great_moon_bird | Great Moon Bird | MAN_ONLY | man=8 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_dlc24_cth_veh_zhangu_war_drum | Zhangu War Drum | ARTICULATED | man=3.4, mount=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc24_cth_veh_zhangu_war_drum_ror | The Jade War Drum (Zhangu War Drum) | ARTICULATED | man=3.4, mount=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_cth_art_fire_rain_rocket_battery_0 | Fire Rain Rocket Battery | ARTICULATED | man=3, mount=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_cth_art_grand_cannon_0 | Grand Cannons | ARTICULATED | man=3, mount=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_main_cth_cav_jade_longma_riders_0 | Great Longma Riders | MOUNTED | man=3.3, mount=9.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_cth_veh_sky_junk_0 | Sky-junk | MOUNTED | man=3.3, mount=3 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_cth_veh_sky_lantern_0 | Sky Lantern | MOUNTED | man=3.3, mount=3 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_cth_veh_war_compass_0 | Wu Xing War Compass | ARTICULATED | man=3.4, mount=3 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_twa07_cth_cav_jade_longma_riders_ror_0 | Righteous Lances of Wei-Jin (Great Longma Riders) | MOUNTED | man=3.3, mount=9.2 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh3_main_dae_inf_chaos_furies_0 | Chaos Furies | MAN_ONLY | man=10 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_dlc01_chs_cav_gorebeast_chariot | Gorebeast Chariots | ARTICULATED | man=3.3, mount=6.6 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh_dlc06_chs_feral_manticore | Chaos Feral Manticore | MAN_ONLY | man=7 | UNVALIDATED_FLIGHT_DISPLAY |
| ca_unit_wh_main_chs_cav_chaos_chariot | Chaos Chariots | ARTICULATED | man=3.3, mount=7.8 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING,articulation.EXACT_JOIN_MISSING |
| ca_unit_wh3_dlc27_woc_mon_chimera_ror | Bloodshriek Chimera (Chimera) | MAN_ONLY | man=6.2 | UNVALIDATED_FLIGHT_DISPLAY |
