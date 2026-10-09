# Speed second audit

202 original holds; 191 promoted; 11 held. Source distinction: 9.0.2 stored raw vs 9.0.3 fresh comparison vs independently derived website cards.

## Remaining holds

All remaining holds lack the selected engine battle_entities row in the stored 9.0.2 snapshot. The native engine record/key is known; its target entity was not captured. Fresh 9.0.3 exact joins exist but cannot prove absent original-version values. No alias, rider fallback or cross-version value is admitted. For 60 newly COMPLETE cards, non-selected engine/articulation gaps remain recorded separately in report.json, not fabricated.

| Main raw key | Land raw key | Original blocker | Remaining blocker | References / missing rows |
| --- | --- | --- | --- | --- |
| wh_dlc04_vmp_veh_claw_of_nagash_0 | wh_dlc04_vmp_veh_claw_of_nagash_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh_dlc04_vmp_veh_claw_of_nagash -> wh_dlc04_vehicle_vmp_mortis_engine |
| wh_dlc04_vmp_veh_mortis_engine_0 | wh_dlc04_vmp_veh_mortis_engine_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh_dlc04_vmp_veh_mortis_engine -> wh_dlc04_vehicle_vmp_mortis_engine |
| wh3_dlc29_vmp_veh_coven_throne | wh3_dlc29_vmp_veh_coven_throne | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh3_dlc29_vmp_veh_coven_throne -> wh3_dlc29_vehicle_vmp_coven_throne |
| wh2_dlc09_tmb_art_casket_of_souls_0 | wh2_dlc09_tmb_art_casket_of_souls_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh2_dlc09_tmb_veh_casket_of_souls -> wh2_dlc09_tmb_inf_casket_of_souls |
| wh2_dlc12_skv_veh_doom_flayer_ror_0 | wh2_dlc12_skv_veh_doom_flayer_ror_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh2_dlc12_skv_veh_doom_flayer_ror -> wh2_dlc12_skv_vehicle_doom_flayer_ror |
| wh2_dlc12_skv_veh_doomwheel_ror_0 | wh2_dlc12_skv_veh_doomwheel_ror_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh2_dlc12_skv_veh_doomwheel_ror -> wh2_dlc12_skv_vehicle_doomwheel_ror |
| wh2_dlc12_skv_veh_doomwheel_ror_tech_lab_0 | wh2_dlc12_skv_veh_doomwheel_ror_tech_lab_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh2_dlc12_skv_veh_doomwheel_tech_lab_ror -> wh2_main_skv_vehicle_doomwheel |
| wh2_main_skv_veh_doomwheel | wh2_main_skv_veh_doomwheel | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh2_main_skv_veh_doomwheel -> wh2_main_skv_vehicle_doomwheel |
| wh3_dlc23_chd_veh_deathshrieker_rocket_launcher | wh3_dlc23_chd_veh_deathshrieker_rocket_launcher | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh3_dlc23_chd_veh_deathshrieker_rocket_launcher -> wh3_dlc23_chd_veh_deathshrieker_rocket_launcher |
| wh3_dlc23_chd_veh_magma_cannon | wh3_dlc23_chd_veh_magma_cannon | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh3_dlc23_chd_veh_magma_cannon -> wh3_dlc23_chd_veh_magma_cannon |
| wh2_dlc14_def_veh_bloodwrack_shrine_0 | wh2_dlc14_def_veh_bloodwrack_shrine_0 | MISSING_EXACT_SOURCE:engine.EXACT_JOIN_MISSING | MISSING_EXACT_9_0_2_SOURCE | engine.EXACT_9_0_2_ENTITY_MISSING:wh2_dlc14_def_veh_bloodwrack_shrine -> wh2_dlc14_vehicle_bloodwrack_shrine |

## Newly admitted identities

| Main key | Original status | Rule | Selected entity | Raw field | Raw | Production |
| --- | --- | --- | --- | --- | --- | --- |
| wh2_dlc12_skv_veh_doom_flayer_0 | PARTIAL | ENGINE_CARD | wh2_dlc12_skv_vehicle_doom_flayer | run_speed | 7.2 | 72 |
| wh_main_brt_cav_pegasus_knights | PARTIAL | FLIGHT_MOUNT_FLY | wh_main_flying_pegasus_blood | fly_speed | 10.5 | 105 |
| wh_main_vmp_veh_black_coach | PARTIAL | ARTICULATED_MOUNT_CARD | wh_main_vehicle_vmp_black_coach_chariot_nightmare_draught | run_speed | 7.8 | 78 |
| wh2_dlc09_tmb_veh_skeleton_chariot_0 | PARTIAL | ARTICULATED_MOUNT_CARD | wh2_dlc09_tmb_cav_skeletal_steed_chariot | run_speed | 7.4 | 74 |
| wh_main_vmp_mon_vargheists | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_vargheists_blood | fly_speed | 9.2 | 92 |
| wh_dlc07_brt_cav_royal_pegasus_knights_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh_main_flying_pegasus_hero_blood | fly_speed | 10.5 | 105 |
| wh_dlc04_emp_veh_templehof_luminark_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_emp_luminark_war_altar_draught_blood | run_speed | 5 | 50 |
| wh_main_emp_veh_luminark_of_hysh_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_emp_luminark_war_altar_draught_blood | run_speed | 5 | 50 |
| wh_main_emp_veh_steam_tank | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc25_emp_veh_hidden_mount_steam_tank | run_speed | 4 | 40 |
| wh2_dlc13_emp_veh_steam_tank_ror_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc25_emp_veh_hidden_mount_steam_tank | run_speed | 4 | 40 |
| wh2_dlc13_emp_veh_war_wagon_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_emp_war_wagon_horse | run_speed | 6 | 60 |
| wh2_dlc13_emp_veh_war_wagon_1 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_emp_war_wagon_horse | run_speed | 6 | 60 |
| wh2_dlc13_emp_veh_war_wagon_ror_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_emp_war_wagon_horse | run_speed | 6 | 60 |
| wh2_dlc13_huntmarshall_veh_obsinite_gyrocopter_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_dwf_flying_gyrocopter | fly_speed | 10 | 100 |
| wh3_dlc25_emp_veh_marienburg_land_ship | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc25_emp_veh_hidden_mount_land_ship | run_speed | 5 | 50 |
| wh3_dlc25_emp_veh_marienburg_land_ship_morr | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc25_emp_veh_hidden_mount_land_ship | run_speed | 5 | 50 |
| wh3_dlc25_emp_veh_marienburg_land_ship_ror | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc25_emp_veh_hidden_mount_land_ship | run_speed | 5 | 50 |
| wh3_dlc25_emp_veh_steam_tank_volley_gun | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc25_emp_veh_hidden_mount_steam_tank | run_speed | 4 | 40 |
| wh3_dlc29_emp_veh_celestial_hurricanum_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc29_vehicle_hurricanum_war_altar | run_speed | 5 | 50 |
| wh_dlc04_vmp_inf_konigstein_stalkers_0 | PARTIAL | SYNCHRONIZED_MAN_RUN | wh_main_vmp_skeleton | run_speed | 3.1 | 31 |
| wh_dlc04_vmp_mon_devils_swartzhafen_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_vargheists_blood | fly_speed | 9.2 | 92 |
| wh_dlc04_vmp_veh_corpse_cart_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc04_vehicle_zombie_corpse_cart | run_speed | 2.3 | 23 |
| wh_dlc04_vmp_veh_corpse_cart_1 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc04_vehicle_zombie_corpse_cart | run_speed | 2.3 | 23 |
| wh_dlc04_vmp_veh_corpse_cart_2 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc04_vehicle_zombie_corpse_cart | run_speed | 2.3 | 23 |
| wh_main_vmp_inf_skeleton_warriors_0 | PARTIAL | SYNCHRONIZED_MAN_RUN | wh_main_vmp_skeleton | run_speed | 3.1 | 31 |
| wh_main_vmp_inf_skeleton_warriors_1 | PARTIAL | SYNCHRONIZED_MAN_RUN | wh_main_vmp_skeleton | run_speed | 3.1 | 31 |
| wh_main_vmp_mon_fell_bats | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_fell_bat_blood | fly_speed | 11 | 110 |
| wh_main_vmp_mon_terrorgheist | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_terrorgheist_blood | fly_speed | 9 | 90 |
| wh3_dlc29_vmp_mon_zombie_dragon | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_dragon_blood | fly_speed | 9.5 | 95 |
| wh_dlc06_grn_cav_teef_robbers_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_grn_wolf_mount_chariot_fast_blood | run_speed | 11 | 110 |
| wh_main_grn_cav_goblin_wolf_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_grn_wolf_mount_chariot_blood | run_speed | 9 | 90 |
| wh_main_grn_cav_orc_boar_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_main_grn_cav_boar_blood | run_speed | 7 | 70 |
| wh2_dlc15_grn_mon_wyvern_waaagh_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_wyvern_blood | fly_speed | 11 | 110 |
| wh2_dlc15_grn_veh_snotling_pump_wagon_0 | UNKNOWN | ENGINE_CARD | wh2_dlc15_grn_vehicle_snotling_pump_wagon | run_speed | 6 | 60 |
| wh2_dlc15_grn_veh_snotling_pump_wagon_flappas_0 | UNKNOWN | ENGINE_CARD | wh2_dlc15_grn_vehicle_snotling_pump_wagon_flappas | run_speed | 7 | 70 |
| wh2_dlc15_grn_veh_snotling_pump_wagon_roller_0 | UNKNOWN | ENGINE_CARD | wh2_dlc15_grn_vehicle_snotling_pump_wagon_roller | run_speed | 6 | 60 |
| wh2_dlc15_grn_veh_snotling_pump_wagon_ror_0 | UNKNOWN | ENGINE_CARD | wh2_dlc15_grn_vehicle_snotling_pump_wagon | run_speed | 6 | 60 |
| wh2_twa03_grn_mon_wyvern_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_wyvern_blood | fly_speed | 11 | 110 |
| wh_dlc07_brt_cav_royal_hippogryph_knights_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh_dlc07_brt_mnt_hippogryph_blood | fly_speed | 9 | 90 |
| wh2_dlc09_tmb_mon_carrion_0 | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc09_tmb_flying_carrion | fly_speed | 10 | 100 |
| wh2_dlc09_tmb_mon_carrion_ror | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc09_tmb_flying_carrion_ror | fly_speed | 12 | 120 |
| wh2_dlc09_tmb_mon_fell_bats | PARTIAL | FLIGHT_MAN_FLY | wh3_main_arkhan_tmb_flying_fell_bat_blood | fly_speed | 12.3 | 123 |
| wh2_dlc09_tmb_mon_morghast_archai | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc29_vmp_mon_morghast | fly_speed | 8 | 80 |
| wh2_dlc09_tmb_mon_morghast_harbingers | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc29_vmp_mon_morghast | fly_speed | 8 | 80 |
| wh2_dlc09_tmb_veh_skeleton_archer_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_dlc09_tmb_cav_skeletal_steed_chariot | run_speed | 7.4 | 74 |
| wh2_dlc11_cst_cav_deck_droppers_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc11_cst_mon_deck_dropper_bat | fly_speed | 8 | 80 |
| wh2_dlc11_cst_cav_deck_droppers_1 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc11_cst_mon_deck_dropper_bat | fly_speed | 8 | 80 |
| wh2_dlc11_cst_cav_deck_droppers_2 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc11_cst_mon_deck_dropper_bat | fly_speed | 8 | 80 |
| wh2_dlc11_cst_cav_deck_droppers_ror_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc11_cst_mon_deck_dropper_bat | fly_speed | 8 | 80 |
| wh2_dlc11_cst_mon_fell_bats | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_fell_bat_blood | fly_speed | 11 | 110 |
| wh2_dlc11_cst_mon_terrorgheist | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc11_cst_terrorgheist_blood | fly_speed | 9 | 90 |
| wh2_dlc12_skv_veh_doom_flayer_ror_tech_lab_0 | UNKNOWN | ENGINE_CARD | wh2_dlc12_skv_vehicle_doom_flayer | run_speed | 7.2 | 72 |
| wh3_dlc29_skv_art_warp_doom_magma_cannon | PARTIAL | ENGINE_CARD | wh3_dlc29_skv_art_warp_doom_magma_cannon | run_speed | 2 | 20 |
| wh2_dlc12_lzd_cav_ripperdactyl_riders_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc12_lzd_ripperdactyl_blood | fly_speed | 9 | 90 |
| wh2_dlc12_lzd_cav_ripperdactyl_riders_0_blessed | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc12_lzd_ripperdactyl_blood | fly_speed | 9 | 90 |
| wh2_dlc12_lzd_cav_ripperdactyl_riders_ror_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_dlc12_lzd_ripperdactyl_blood | fly_speed | 9 | 90 |
| wh2_dlc12_lzd_cav_terradon_riders_ror_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_main_lzd_terradon_blood | fly_speed | 9 | 90 |
| wh2_dlc17_lzd_mon_coatl_0 | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc17_lzd_mon_coatl | fly_speed | 8 | 80 |
| wh2_dlc17_lzd_mon_coatl_ror_0 | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc17_lzd_mon_coatl_ror | fly_speed | 8 | 80 |
| wh2_main_lzd_cav_terradon_riders_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_main_lzd_terradon_blood | fly_speed | 9 | 90 |
| wh2_main_lzd_cav_terradon_riders_0_blessed | PARTIAL | FLIGHT_MOUNT_FLY | wh2_main_lzd_terradon_blessed_blood | fly_speed | 11 | 110 |
| wh2_main_lzd_cav_terradon_riders_1 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_main_lzd_terradon_blood | fly_speed | 9 | 90 |
| wh2_main_lzd_cav_terradon_riders_blessed_1 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_main_lzd_terradon_blessed_blood | fly_speed | 11 | 110 |
| wh2_dlc16_wef_mon_cave_bats | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_fell_bat_blood | fly_speed | 11 | 110 |
| wh3_main_ksl_veh_heavy_war_sled_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_ksl_cav_war_bear_draught_heavy_war_sled_blood | run_speed | 6.6 | 66 |
| wh3_main_ksl_veh_light_war_sled_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_ksl_cav_war_bear_draught_light_war_sled_blood | run_speed | 7.5 | 75 |
| wh3_main_ksl_veh_little_grom_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_ksl_cav_war_bear_draught_little_grom_blood | run_speed | 3.5 | 35 |
| wh3_dlc26_ogr_mon_blood_vultures | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc26_ogr_blood_vultures | fly_speed | 10 | 100 |
| wh3_main_ogr_veh_gnoblar_scraplauncher_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_ogr_veh_rhinox_draught | run_speed | 6.6 | 66 |
| wh3_main_ogr_veh_ironblaster_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_ogr_veh_rhinox_draught | run_speed | 6.6 | 66 |
| wh3_dlc20_chs_cav_chaos_chariot_mkho | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_mkho_chariots | run_speed | 7.8 | 78 |
| wh3_main_kho_cav_gorebeast_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc01_mnt_chs_chariot_gorebeast | run_speed | 6.6 | 66 |
| wh3_main_kho_inf_chaos_furies_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_infantry_kho_furies_blood | fly_speed | 11 | 110 |
| wh3_main_kho_mon_bloodthirster_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_kho_mon_bloodthirster | fly_speed | 9.5 | 95 |
| wh3_twa08_kho_mon_bloodthirster_0_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_twa08_kho_mon_bloodthirster_ror | fly_speed | 9.5 | 95 |
| wh3_dlc23_chd_mon_bale_taurus | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc23_chd_mon_bale_taurus | fly_speed | 9 | 90 |
| wh3_dlc23_chd_mon_great_taurus | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc23_chd_mon_great_taurus | fly_speed | 8 | 80 |
| wh3_dlc23_chd_mon_lammasu | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc23_chd_mon_lammasu | fly_speed | 8.5 | 85 |
| wh3_dlc23_chd_veh_dreadquake_mortar | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_dreadquake | run_speed | 2 | 20 |
| wh3_dlc23_chd_veh_iron_daemon | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_locomotive | run_speed | 6 | 60 |
| wh3_dlc23_chd_veh_iron_daemon_1dreadquake | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_train | run_speed | 5.5 | 55 |
| wh3_dlc23_chd_veh_iron_daemon_3payload_qb | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_train | run_speed | 5.5 | 55 |
| wh3_dlc23_chd_veh_iron_daemon_ror | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_locomotive | run_speed | 6 | 60 |
| wh3_dlc23_chd_veh_iron_daemon_ror_1dreadquake | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_train | run_speed | 5.5 | 55 |
| wh3_dlc23_chd_veh_skullcracker | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_locomotive | run_speed | 6 | 60 |
| wh3_dlc23_chd_veh_skullcracker_1dreadquake | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_train | run_speed | 5.5 | 55 |
| wh3_dlc20_chs_cav_chaos_chariot_mtze | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_mtze_chariots | run_speed | 7.8 | 78 |
| wh3_dlc24_tze_mon_cockatrice | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc22_tze_mon_cockatrice | fly_speed | 9 | 90 |
| wh3_dlc24_tze_mon_flamers_changebringers | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc24_tze_mon_flamers_changebringers_disc | fly_speed | 9.5 | 95 |
| wh3_dlc24_tze_mon_screamers_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc24_tze_mon_flying_screamer_ror | fly_speed | 8.5 | 85 |
| wh3_dlc27_nor_cav_chaos_chariot_ror | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_chariots | run_speed | 7.8 | 78 |
| wh3_main_tze_cav_doom_knights_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_cavalry_tze_disc_knight_blood | fly_speed | 9.5 | 95 |
| wh3_main_tze_inf_chaos_furies_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_infantry_tze_furies_blood | fly_speed | 11 | 110 |
| wh3_main_tze_mon_lord_of_change_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_chs_lord_of_change_blood | fly_speed | 9 | 90 |
| wh3_main_tze_mon_screamers_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_tze_flying_screamer | fly_speed | 8.5 | 85 |
| wh3_main_tze_veh_burning_chariot_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_flying_tze_burning_chariot | fly_speed | 8.5 | 85 |
| wh3_twa07_tze_cav_doom_knights_ror_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_cavalry_tze_disc_knight_blood | fly_speed | 9.5 | 95 |
| wh3_twa08_tze_mon_lord_of_change_0_ror | PARTIAL | FLIGHT_MAN_FLY | wh_main_chs_lord_of_change_blood_ror | fly_speed | 9 | 90 |
| wh3_dlc20_chs_cav_chaos_chariot_msla | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_msla_chariots | run_speed | 8.3 | 83 |
| wh3_dlc20_chs_cav_chaos_chariot_msla_ror | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_sla_cavalry_steed_of_slaanesh_blood | run_speed | 10 | 100 |
| wh3_dlc27_sla_mon_preyton | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_sla_mon_preyton | fly_speed | 9 | 90 |
| wh3_dlc27_sla_mon_preyton_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_sla_mon_preyton_ror | fly_speed | 9 | 90 |
| wh3_dlc27_sla_veh_seeker_chariot_ror | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_sla_cavalry_steed_of_slaanesh_chariot_blood | run_speed | 10 | 100 |
| wh3_main_sla_inf_chaos_furies_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_infantry_sla_furies_blood | fly_speed | 11 | 110 |
| wh3_main_sla_veh_exalted_seeker_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_sla_cavalry_steed_of_slaanesh_chariot_exalted_blood | run_speed | 10 | 100 |
| wh3_main_sla_veh_hellflayer_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_sla_cavalry_steed_of_slaanesh_chariot_blood | run_speed | 10 | 100 |
| wh3_main_sla_veh_seeker_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_sla_cavalry_steed_of_slaanesh_chariot_blood | run_speed | 10 | 100 |
| wh_dlc03_bst_cav_razorgor_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc03_bst_mnt_razorgor_chariot | run_speed | 7 | 70 |
| wh_dlc03_bst_feral_manticore | PARTIAL | FLIGHT_MAN_FLY | wh_dlc01_flying_manticore_blood | fly_speed | 8.5 | 85 |
| wh_dlc05_bst_mon_harpies_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc05_bst_inf_harpy | fly_speed | 8.2 | 82 |
| wh2_dlc17_bst_cav_tuskgor_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_dlc17_mnt_bst_tuskgor_chariot_blood | run_speed | 7 | 70 |
| wh3_dlc24_bst_mon_cockatrice | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc22_tze_mon_cockatrice | fly_speed | 9 | 90 |
| wh3_dlc27_bst_mon_chimera | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_nor_mon_chimera | fly_speed | 8.5 | 85 |
| wh3_dlc27_bst_mon_chimera_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_nor_mon_chimera | fly_speed | 8.5 | 85 |
| wh3_dlc27_bst_mon_preyton | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_sla_mon_preyton | fly_speed | 9 | 90 |
| wh3_dlc27_bst_mon_preyton_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_sla_mon_preyton_ror | fly_speed | 9 | 90 |
| wh2_dlc10_def_cav_raven_heralds_ror_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh2_main_def_mnt_dark_pegasus | fly_speed | 10.5 | 105 |
| wh2_dlc10_def_mon_feral_manticore_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc01_flying_manticore_blood | fly_speed | 8.5 | 85 |
| wh2_dlc14_def_cav_scourgerunner_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_dlc14_def_scourgerunner_draught | run_speed | 8.4 | 84 |
| wh2_dlc14_def_cav_scourgerunner_chariot_ror_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_dlc14_def_scourgerunner_draught | run_speed | 8.4 | 84 |
| wh2_dlc14_def_inf_harpies_ror_0 | PARTIAL | FLIGHT_MAN_FLY | wh2_main_infantry_harpies_blood_ror | fly_speed | 8.2 | 82 |
| wh2_main_def_cav_cold_one_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_main_def_cold_one_chariot_draught | run_speed | 6.6 | 66 |
| wh2_main_def_inf_harpies | PARTIAL | FLIGHT_MAN_FLY | wh2_main_infantry_harpies_blood | fly_speed | 8.2 | 82 |
| wh2_main_def_mon_black_dragon | PARTIAL | FLIGHT_MAN_FLY | wh2_main_def_black_dragon_blood | fly_speed | 9.5 | 95 |
| wh_dlc05_wef_cav_hawk_riders_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh_dlc05_wef_hawk_blood | fly_speed | 11 | 110 |
| wh_dlc05_wef_forest_dragon_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_dragon_blood | fly_speed | 9.5 | 95 |
| wh_dlc05_wef_mon_great_eagle_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc05_wef_mon_great_eagle_blood | fly_speed | 11 | 110 |
| wh2_dlc16_wef_mon_ceithin_har_summoned | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_dragon_blood | fly_speed | 9.5 | 95 |
| wh2_dlc16_wef_mon_feral_manticore | PARTIAL | FLIGHT_MAN_FLY | wh_dlc01_flying_manticore_blood | fly_speed | 8.5 | 85 |
| wh2_dlc16_wef_mon_gwindalor_summoned | PARTIAL | FLIGHT_MAN_FLY | wh_dlc05_wef_mon_great_eagle_blood | fly_speed | 11 | 110 |
| wh2_dlc16_wef_mon_hawks_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc05_wef_hawk_blood | fly_speed | 11 | 110 |
| wh_dlc06_dwf_veh_skyhammer_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_dwf_flying_gyrobomber | fly_speed | 9 | 90 |
| wh_main_dwf_veh_gyrobomber | PARTIAL | FLIGHT_MAN_FLY | wh_main_dwf_flying_gyrobomber | fly_speed | 9 | 90 |
| wh_main_dwf_veh_gyrocopter_0 | PARTIAL | FLIGHT_MAN_FLY | wh_main_dwf_flying_gyrocopter | fly_speed | 10 | 100 |
| wh_main_dwf_veh_gyrocopter_1 | PARTIAL | FLIGHT_MAN_FLY | wh_main_dwf_flying_gyrocopter | fly_speed | 10 | 100 |
| wh_main_dwf_veh_gyrocopter_1_grudge_reward | PARTIAL | FLIGHT_MAN_FLY | wh_main_dwf_flying_gyrocopter | fly_speed | 10 | 100 |
| wh3_dlc25_dwf_art_goblin_hewer | PARTIAL | ENGINE_CARD | wh3_dlc25_dwf_art_goblin_hewer | run_speed | 4 | 40 |
| wh3_dlc25_dwf_veh_thunderbarge | PARTIAL | FLIGHT_MOUNT_FLY | wh3_dlc25_dwf_mnt_veh_thunderbarge | fly_speed | 3 | 30 |
| wh3_dlc25_dwf_veh_thunderbarge_grungni_mp | PARTIAL | FLIGHT_MOUNT_FLY | wh3_dlc25_dwf_mnt_veh_thunderbarge_grungni | fly_speed | 3 | 30 |
| wh3_dlc20_chs_cav_chaos_chariot_mnur | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_mnur_chariots | run_speed | 7.8 | 78 |
| wh3_dlc25_nur_cav_plague_drones_1_ror | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_flying_rot_fly_blood | fly_speed | 9 | 90 |
| wh3_dlc25_nur_chieftain_mon_frost_wyrm_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc08_flying_chaos_frost_dragon_blood | fly_speed | 9 | 90 |
| wh3_dlc25_nur_chieftain_veh_dreadquake_mortar | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc23_chd_veh_hidden_mount_dreadquake | run_speed | 2 | 20 |
| wh3_main_nur_cav_plague_drones_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_flying_rot_fly_blood | fly_speed | 9 | 90 |
| wh3_main_nur_cav_plague_drones_1 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_flying_rot_fly_blood | fly_speed | 9 | 90 |
| wh3_main_nur_inf_chaos_furies_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_infantry_nur_furies_blood | fly_speed | 11 | 110 |
| wh3_main_nur_mon_rot_flies_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_flying_rot_fly_blood | fly_speed | 9 | 90 |
| wh_dlc08_nor_feral_manticore | PARTIAL | FLIGHT_MAN_FLY | wh_dlc01_flying_manticore_blood | fly_speed | 8.5 | 85 |
| wh_dlc08_nor_mon_frost_wyrm_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc08_flying_chaos_frost_dragon_blood | fly_speed | 9 | 90 |
| wh_dlc08_nor_mon_frost_wyrm_ror_0 | PARTIAL | FLIGHT_MAN_FLY | wh_dlc08_flying_chaos_frost_dragon_blood | fly_speed | 9 | 90 |
| wh_dlc08_nor_veh_marauder_warwolves_chariot_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc08_nor_war_wolf_blood_draught | run_speed | 9.5 | 95 |
| wh_main_nor_cav_chaos_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_chariots | run_speed | 7.8 | 78 |
| wh3_dlc27_nor_mon_chimera | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_nor_mon_chimera | fly_speed | 8.5 | 85 |
| wh3_dlc27_nor_mon_chimera_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_nor_mon_chimera | fly_speed | 8.5 | 85 |
| wh2_dlc15_hef_inf_mistwalkers_griffon_knights_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh_main_flying_griffon_blood | fly_speed | 9 | 90 |
| wh2_dlc15_hef_mon_arcane_phoenix_0 | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc15_hef_mon_arcane_phoenix_0 | fly_speed | 12 | 120 |
| wh2_dlc15_hef_mon_arcane_phoenix_ror_0 | PARTIAL | FLIGHT_MAN_FLY | wh2_dlc15_hef_mon_arcane_phoenix_0 | fly_speed | 12 | 120 |
| wh2_dlc15_hef_mon_black_dragon_imrik | PARTIAL | FLIGHT_MAN_FLY | wh2_main_def_black_dragon_blood | fly_speed | 9.5 | 95 |
| wh2_dlc15_hef_mon_forest_dragon_imrik | PARTIAL | FLIGHT_MAN_FLY | wh_main_flying_dragon_blood | fly_speed | 9.5 | 95 |
| wh2_dlc15_hef_mon_moon_dragon_imrik | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_moon_dragon_blood | fly_speed | 9.5 | 95 |
| wh2_dlc15_hef_mon_star_dragon_imrik | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_star_dragon | fly_speed | 8.5 | 85 |
| wh2_dlc15_hef_mon_sun_dragon_imrik | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_sun_dragon_blood | fly_speed | 10 | 100 |
| wh2_dlc15_hef_veh_lion_chariot_of_chrace_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_dlc15_hef_war_lion_chariot_draught | run_speed | 8.2 | 82 |
| wh2_main_hef_cav_ithilmar_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_main_hef_ithilmar_chariot_draught | run_speed | 8.4 | 84 |
| wh2_main_hef_cav_tiranoc_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh2_main_hef_tiranoc_chariot_draught | run_speed | 8.4 | 84 |
| wh2_main_hef_mon_great_eagle | PARTIAL | FLIGHT_MAN_FLY | wh_dlc05_wef_mon_great_eagle_blood | fly_speed | 11 | 110 |
| wh2_main_hef_mon_moon_dragon | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_moon_dragon_blood | fly_speed | 9.5 | 95 |
| wh2_main_hef_mon_phoenix_flamespyre | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_phoenix | fly_speed | 12 | 120 |
| wh2_main_hef_mon_phoenix_frostheart | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_phoenix_frostheart | fly_speed | 10 | 100 |
| wh2_main_hef_mon_star_dragon | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_star_dragon | fly_speed | 8.5 | 85 |
| wh2_main_hef_mon_sun_dragon | PARTIAL | FLIGHT_MAN_FLY | wh2_main_hef_mon_sun_dragon_blood | fly_speed | 10 | 100 |
| wh3_dlc27_hef_veh_skycutter_bolt_thrower | PARTIAL | FLIGHT_MOUNT_FLY | wh3_dlc27_hef_mnt_skycutter_bolt | fly_speed | 9 | 90 |
| wh3_dlc27_hef_veh_skycutter_bows | PARTIAL | FLIGHT_MOUNT_FLY | wh3_dlc27_hef_mnt_skycutter | fly_speed | 9 | 90 |
| wh3_dlc24_cth_inf_onyx_crowmen | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc24_cth_inf_onyx_crowmen | fly_speed | 9 | 90 |
| wh3_dlc24_cth_inf_onyx_crowmen_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc24_cth_inf_onyx_crowmen_ror | fly_speed | 9 | 90 |
| wh3_dlc24_cth_mon_celestial_lion | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc24_cth_mon_celestial_lion | fly_speed | 8.5 | 85 |
| wh3_dlc24_cth_mon_great_moon_bird | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc24_cth_mon_great_moon_bird | fly_speed | 12 | 120 |
| wh3_dlc24_cth_veh_zhangu_war_drum | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_cth_veh_oxen_draught_compass | run_speed | 3 | 30 |
| wh3_dlc24_cth_veh_zhangu_war_drum_ror | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_cth_veh_oxen_draught_compass | run_speed | 3 | 30 |
| wh3_main_cth_art_fire_rain_rocket_battery_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_cth_veh_oxen_draught_artillery | run_speed | 3 | 30 |
| wh3_main_cth_art_grand_cannon_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_cth_veh_oxen_draught_artillery | run_speed | 3 | 30 |
| wh3_main_cth_cav_jade_longma_riders_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_flying_jade_longma_blood | fly_speed | 10.5 | 105 |
| wh3_main_cth_veh_sky_junk_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_cth_flying_sky_junk | fly_speed | 3 | 30 |
| wh3_main_cth_veh_sky_lantern_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_cth_flying_sky_lantern | fly_speed | 6 | 60 |
| wh3_main_cth_veh_war_compass_0 | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_main_cth_veh_oxen_draught_compass | run_speed | 3 | 30 |
| wh3_twa07_cth_cav_jade_longma_riders_ror_0 | PARTIAL | FLIGHT_MOUNT_FLY | wh3_main_flying_jade_longma_blood | fly_speed | 10.5 | 105 |
| wh3_main_dae_inf_chaos_furies_0 | PARTIAL | FLIGHT_MAN_FLY | wh3_main_infantry_dae_furies_blood | fly_speed | 11 | 110 |
| wh_dlc01_chs_cav_gorebeast_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh_dlc01_mnt_chs_chariot_gorebeast | run_speed | 6.6 | 66 |
| wh_dlc06_chs_feral_manticore | PARTIAL | FLIGHT_MAN_FLY | wh_dlc01_flying_manticore_blood | fly_speed | 8.5 | 85 |
| wh_main_chs_cav_chaos_chariot | UNKNOWN | ARTICULATED_MOUNT_CARD | wh3_dlc20_chs_mnt_chaos_steed_chariots | run_speed | 7.8 | 78 |
| wh3_dlc27_woc_mon_chimera_ror | PARTIAL | FLIGHT_MAN_FLY | wh3_dlc27_nor_mon_chimera | fly_speed | 8.5 | 85 |

Missing non-selected components of COMPLETE cards stay in report.json.catalog[].missing. Every source row/file, raw component value, reference expected/actual, fresh-version and independent-version comparison is retained in report.json and the lossless source envelopes.
