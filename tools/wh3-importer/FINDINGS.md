# Three-unit CA raw investigation

These are actual local RPFM 5.1.0 `PackFile` decodes of CA `db.pack` and `local_en.pack`. Game executable ProductVersion: **9.0.1.0**; schema format: **5**. Pack/schema hashes, extraction times, table versions and every source row/field are preserved in the ignored generated artifacts. Values here are observations, not normalized Vault data or final in-game stats after runtime/campaign overrides.

| Profile | Discovered main CA key | Persisted rows | Distinct tables including Loc |
| --- | --- | ---: | ---: |
| Grail Knights | `wh_main_brt_cav_grail_knights` | 52 | 21 |
| Helstorm | `wh_main_emp_art_helstorm_rocket_battery` | 44 | 23 |
| Bloodthirster | `wh3_main_kho_mon_bloodthirster_0` | 70 | 25 |

Grail's raw rows, processed schemas, relationships, skipped references and observations were compared with the prior actual output and were identical. Its original scope remains unchanged.

## Root evidence and selection

The actual `land_units__.loc` keys are discovered by exact English text and the verified schema localisation convention, then joined through `main_units.land_unit → land_units.key`.

- Helstorm has one matching land row, but two main rows: `wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply` (`recruitment_cost=0`, tier 3) and `wh_main_emp_art_helstorm_rocket_battery` (`recruitment_cost=1050`, tier 4).
- Bloodthirster has two matching Loc/land/main candidates: `wh3_main_kho_mon_bloodthirster_0` (`recruitment_cost=2000`) and `wh3_main_kho_mon_bloodthirster_summoned_0` (`recruitment_cost=0`).
- Each profile explicitly uses the verified positive-recruitment-cost qualifier. It selects exactly one root in this version. This is not an all-unit rule, does not match key substrings or manual expected costs, and does not pick the first candidate. Candidates and acceptance evidence are retained in `discovery`; remaining ambiguity fails.

## Newly connected DB tables and joins

Helstorm's missile scope adds actual connected tables:

```text
battlefield_engines_tables
missile_weapons_tables
projectiles_tables
projectiles_explosions_tables
projectile_penetration_junctions_tables
projectile_shot_type_enum_tables
```

```text
land_units.engine → battlefield_engines.key
battlefield_engines.battle_entity → battle_entities.key
battlefield_engines.missile_weapon → missile_weapons.key
missile_weapons.default_projectile → projectiles.key
projectiles.explosion_type → projectiles_explosions.key
projectiles.projectile_penetration → projectile_penetration_junctions.key
projectile_penetration_junctions.entity_size_cap → battle_entities_size_enums.key
projectiles.shot_type → projectile_shot_type_enum.key
```

The actual engine schema describes `missile_weapon` as the field used by classic artillery. Helstorm's land `primary_missile_weapon` is empty; using only that land field would miss its weapon.

Bloodthirster's ability-phase scope adds these actual connected tables:

```text
special_ability_to_special_ability_phase_junctions_tables
special_ability_phases_tables
special_ability_phase_stat_effects_tables
special_ability_behaviour_groups_tables
special_ability_behaviour_groups_to_types_tables
```

```text
special_ability_to_special_ability_phase_junctions.special_ability → unit_special_abilities.key
special_ability_to_special_ability_phase_junctions.phase → special_ability_phases.id
special_ability_phase_stat_effects.phase → special_ability_phases.id
unit_special_abilities.behaviour → special_ability_behaviour_groups.group
special_ability_behaviour_groups_to_types.group → special_ability_behaviour_groups.group
```

These extend the existing land-unit ability/attribute junctions. `special_ability_phase_attribute_effects_tables` was also inspected and its phase reference verified; no rows match these selected Bloodthirster phases. It is scoped to phases and tested synthetically, never reverse-traversed from a shared attribute.

References whose target is absent from the installed schema, such as Helstorm's gun-type/projectile-category metadata and the behaviour-type target, are left in raw rows/skipped references. No replacement names or crew-count enums are invented. No separate flight table is needed: actual entity fields and the `flying` attribute provide the flight evidence.

## Helstorm actual raw values

| Source | Raw fields / values |
| --- | --- |
| `main_units` | tier 4; `num_men=44`; multiplayer/recruitment 1050/1050; upkeep 263; create time 2; `can_siege=true` |
| `land_units` | melee attack/defence 10/6; morale 50; charge 5; `primary_ammo=66`; `num_engines=4`; `accuracy=10`; `reload=0`; `bonus_hit_points=48`; `can_skirmish=false` |
| armour / melee weapon | armour 20; damage/AP 21/3; interval 4.3; length 0 |
| crew `man_entity` | `wh2_dlc16_infantry_standard_crew_blood_dismembers`: HP 8, mass 100, size `small`, run/charge 3/3.8 |
| engine `battle_entity` | `wh_main_emp_art_helstorm`: HP 425, mass 2000, size `large`, run/charge 2/2, penetration resistance 5 |
| `battlefield_engines` | engine key `wh_main_emp_art_helstorm_rocket_battery`; type `Generic_3_Crew`; missile key `wh_main_emp_rocket_battery` |
| `missile_weapons` | `default_projectile=wh_emp_rocket` |
| `projectiles` | range 480; minimum range 40; direct damage/AP 30/70; `projectile_number=1`; `shots_per_volley=3`; `burst_size=1`; base reload 17 |
| projectile accuracy | marksmanship bonus 10; calibration distance 300; calibration area 220; spread 0 |
| projectile category/type | `artillery` / `artillery_explosive` |
| explosion | `wh_main_emp_rocket_explosion`: damage/AP 22/51, radius 6 |
| penetration | key `low`: `max_penetration=2`, `entity_size_cap=small` |
| attribute | group membership contains `cant_run` |

The schema calls `max_penetration` a penetration-points stat and describes the stopping-size cap. It is not a count of pierced entities. The projectile category schema provides evidence about artillery ignoring shields, but no normalized bypass flag is generated.

Manual values requiring separate interpretation: displayed 4 pieces versus `num_men=44` and `num_engines=4`; ammunition 22 versus `primary_ammo=66`; accuracy 20 versus separate land accuracy 10 and marksmanship bonus 10; reload skill 10 versus land reload 0; mass 3100/very large versus engine mass 2000/large and crew 100/small. These are differences in the recorded source values/roles, not proof of an in-game error. Crew allocation, reserve crew, scaling, ammo UI convention, effective accuracy/reload and entity-size semantics remain unresolved. No division, summation or tier conversion is used to match the reference.

## Bloodthirster actual raw values

| Source | Raw fields / values |
| --- | --- |
| `main_units` | tier 5; `num_men=1`; multiplayer/recruitment 2000/2000; upkeep 500; create time 3; `can_siege=true`; `is_monstrous=true`; `is_high_threat=true` |
| `land_units` | melee attack/defence 60/44; morale 80; charge 55; `bonus_hit_points=7724` |
| armour | 70 |
| battle entity | `wh3_main_kho_mon_bloodthirster`: type `giant`, HP 8, mass 4000, size `very_large`, penetration resistance 5 |
| movement | ground `run_speed=5.5`, `charge_speed=9.5`; `fly_speed=9.5`, `flying_charge_speed=15` |
| melee weapon | `wh3_main_kho_bloodthirster_axe`: damage/AP 160/380; large/infantry bonus 35/0; interval 4; length 9; splash 5 / `large`; `ignition_amount=1`; `is_magical=true` |
| base damage modifiers | physical 20, magic 35, flame 0, missile 0, all 0 |
| attributes | `causes_fear`, `causes_terror`, `daemonic`, `flying` |

Actual passive keys and English localisation (child Loc rows are retained):

- `wh3_main_unit_passive_single_entity`: **Wounds**.
- `wh3_main_unit_passive_daemonic_instability_khorne`: **Daemonic Instability**.
- `wh3_main_unit_passive_daemonic_instability_khorne_ii`: **Banished!**, not the separate Banishment spell.

All three have `passive=true`. The first/second instability phases preserve damage amounts 66/133 and other raw phase fields; activation thresholds are not inferred. Wounds links to `scalar_speed` multiplier **0.90000004** and base/AP melee damage multipliers **0.8**. These are raw floats and are not applied to stats. Shared phases do not reverse-link other abilities into the artifact.

Manual discrepancies: multiplayer **2000 vs 2200**, recruitment **2000 vs 4600**, upkeep **500 vs 575**. The raw `damage_mod_magic=35` numerically matches the supplied spell-resistance value, but the schema describes magical damage. Current displayed spell-resistance semantics, activation conditions, conditional phase effects and final resistance are unresolved. Fire/missile/all zeros are actual source fields, not assumed absence of every possible modifier.

## HP and speed evidence across the three units

| Unit | `num_men` | land bonus HP | man/rider HP | mount HP | engine HP / count | Manual total HP |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Grail Knights | 48 | 136 | 8 | 8 | none | 7296 |
| Helstorm | 44 | 48 | 8 | none | 425 / 4 | 4356 |
| Bloodthirster | 1 | 7724 | 8 | none | none | 7732 |

These are separate raw inputs. Their aggregation, crew/equipment contribution and unit-size scaling have not been verified; **no total HP is computed or stored**.

| Source speed | Raw | Manual display reference |
| --- | ---: | ---: |
| Grail mount run | 8.4 | 84 |
| Helstorm engine run | 2 | 20 |
| Bloodthirster ground run | 5.5 | 55 |
| Bloodthirster flight | 9.5 | 95 |

The matching ratios are evidence only. Schema descriptions distinguish ground/air speed, but do not establish the UI display conversion in this investigation. **No x10 production logic exists.** Missile strength 339, current reload 15.3 and total weapon damage 540 likewise remain manual comparison values, not calculated raw fields.

## Outputs, tests and remaining work

Raw JSON and summaries: `generated/wh3/{grail-knights,helstorm,bloodthirster}.{raw.json,summary.md}` (ignored by Git). Full exact join paths, table versions, values and source keys are in each summary/JSON.

- `npm test`: **33 passed** (original 21 preserved, 12 new synthetic tests).
- Opt-in `npm run test:wh3-integration`: **3 actual CA-pack tests passed**; without opt-in variables, all 3 skip.
- `npm run build`: TypeScript and Vite passed. No `src/` code/data/schema/UI changes.

Before normalization: confirm HP/count aggregation, speed display units, artillery ammo/crew/mass/size interpretation, accuracy/reload formula and animation limits, projectile shield/penetration semantics, current spell resistance, ability activation, effective recruitment and runtime/patch/campaign balance precedence.

Data separation: these findings/generated artifacts are **actual CA rows**; `fixtures/` contains **synthetic test data**; `manual-reference.json` and `manual-references/` contain **user manual comparisons only**. Neither fixture nor manual values are used to fill extraction results.

## Follow-up semantics research

The next investigation is recorded in [SEMANTICS.md](SEMANTICS.md) and [semantics-findings.json](semantics-findings.json). It adds Swordsmen, Handgunners and Helblaster Volley Guns through the common tracer, current UI/stat localisation, experience and bounded campaign effect paths. The original three-unit extraction remains a historical raw record. Follow-up interpretations distinguish confirmed field/relationship facts from unverified HP, display, recruitment and cost formulas; no production normalization is implemented.
