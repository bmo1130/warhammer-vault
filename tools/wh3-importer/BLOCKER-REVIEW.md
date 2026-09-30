# Representative pilot blocker review — 2026-10-01 KST

The full importer is **not ready and was not run**. This review adds a bounded,
DB-backed companion to the existing representative pilot. It emits evidence
sidecars and conservative coverage corrections; it does not select canonical
roots or add display statistics to `Unit`. No game process was launched. RPFM
5.1.0 read the installed CA packs for game ProductVersion 9.0.1.0, schema format 5.

The starting HEAD was `ae721cfd03d4d80536e7d6809f119f746c01f23b`.
The 17 pre-existing changed/untracked files, including the pilot implementation,
PILOT.md and package scripts, were preserved. This companion intentionally depends
on that existing pilot working tree; its commit does not include those earlier
changes. UI, `src/data/units.json`, aliases and normalization formulas are unchanged.

## Evidence and reproduction

The completed run is `generated/wh3/blocker-review/2026-09-30T22-39-13.235Z/`.
It contains the unchanged 24-unit rerun under `pilot/`, per-sample identity,
structure and override JSON, `review.json`, `comparison.json`, reviewed coverage
and exceptions, and a source-fingerprinted `manifest.json`. Original
`generated/wh3/pilot/` and `pilot-first-pass/` remain separate. Generated CA rows
are local ignored artifacts, not committed game-data dumps.

```powershell
# Requires the existing complete CA pilot baseline and local RPFM server.
node tools/wh3-importer/blocker-review/cli.mjs
npm test
$env:WH3_INTEGRATION_CONFIG='tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
$env:WH3_BLOCKER_REVIEW_DIR='generated/wh3/blocker-review/2026-09-30T22-39-13.235Z'
node --test tools/wh3-importer/blocker-review/integration.test.mjs
npm run build
```

`cli.mjs` invokes only the existing bounded representative runner. No full import
entry point is used. It requires the same game version, schema hash and pack hashes
as the baseline, and fails on changed evidence. It creates a fresh output directory
and records RUNNING/COMPLETE/FAILED rather than overwriting the baseline.

`EvidenceProbe` follows explicit processed-schema references only: at most 100
seed values, 400 retained rows (250 for structures), 80 query steps per probe.
Missing/ambiguous forward edges are recorded. There is no recursive graph crawl,
reverse expansion from shared weapons/entities to other units, or guessed join.
Each artifact retains raw rows, table/field schemas, row keys, source pack/path,
schema version, relationship edges, query steps and source hashes. These limits
bound the selected evidence, not the internal decoding of a CA table by RPFM.

## Identity: A=0, B=9, C=0; all nine remain BLOCKED

A means a safe deterministic identity rule. B means distinguishable DB identities
need an explicit catalog scope/canonical mapping. C means insufficient static
evidence, requiring further investigation/runtime verification. All 19 discovered
roots below are retained. These are all candidates from the pilot's exact English
localisation discovery in this snapshot, not a claim of completeness for every
spelling, locale or scripted alias.

For every row below the localisation relationship is
`main_units.land_unit -> land_units.key -> land_units_onscreen_name_<land key>`.
The displayed English text is the sample name. Main and land keys coincide except
for the three shared-land cases explicitly listed. All 19 have `is_renown=false`;
none is identified as RoR by that flag. Visual variant rows, unit-set membership,
campaign/MP caps, recruitment overrides, faction restrictions, permission groups
and custom-battle flags are saved per candidate, not flattened into one identity.

| Sample | Every plausible main key | Land key | Decision and distinguishing evidence |
| --- | --- | --- | --- |
| Helstorm | `wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply`; `wh_main_emp_art_helstorm_rocket_battery` | Both `wh_main_emp_art_helstorm_rocket_battery` | **B**. Supply candidate has allowed Huntmarshal faction restriction and Imperial Supply unit-set membership; normal candidate has Empire custom-battle/permission evidence. Recruitment 0/1050, MP cost both 1050; encyclopedia both true. Shared land/localisation cannot choose campaign identity. |
| Bloodthirster | `wh3_main_kho_mon_bloodthirster_0`; `wh3_main_kho_mon_bloodthirster_summoned_0` | Respective main keys | **B**. Normal candidate has Khorne/Daemons/other groups and three custom-battle rows; summoned-named candidate has none in the inspected permission/custom/building relations. Recruitment and MP cost 2000/0. **Both encyclopedia false**. Existing narrow Khorne regression provides evidence for a scoped mapping, not a universal name rule. |
| Handgunners | `wh2_dlc13_emp_inf_handgunners_imperial_supply`; `wh_main_emp_inf_handgunners` | Both `wh_main_emp_inf_handgunners` | **B**. Supply has allowed Huntmarshal restriction; normal has Empire and other groups plus Empire custom battle. Recruitment 0/600, MP both 600, encyclopedia both true. Same land stats do not make the main identities interchangeable. |
| Crypt Horrors | `wh2_dlc09_tmb_mon_crypt_horrors`; `wh_main_vmp_mon_crypt_horrors`; `wh_main_vmp_mon_crypt_horrors_summoned` | Respective main keys | **B**. Arkhan group/campaign-exclusive custom row versus Vampire Counts/Nagash/other groups and non-campaign-exclusive custom rows versus no such memberships. Recruitment 0/800/0, MP 900/900/0, num_men 20/16/16. All encyclopedia true. Arkhan is not safely discarded as a zero-cost summon. |
| Steam Tank | `wh2_dlc13_emp_veh_steam_tank_imperial_supply`; `wh_main_emp_veh_steam_tank` | Both `wh_main_emp_veh_steam_tank_driver` | **B**. Supply has allowed Huntmarshal restriction. Normal has Empire custom battle, Empire/Tzeentch groups and an allowed Deceivers faction restriction. Recruitment 0/2100, MP both 2400, encyclopedia both true. Even faction ownership is not exclusive. |
| Chaos Warhounds | `wh_dlc03_bst_inf_chaos_warhounds_0`; `wh_main_chs_mon_chaos_warhounds_0` | Respective main keys | **B**. Beastmen versus Chaos permission/custom-battle roots, both non-campaign-exclusive. Recruitment 0/400, MP both 400, encyclopedia both true. Two legitimate faction contexts; positive-cost selection would erase Beastmen. |
| Hexwraiths | `wh2_dlc09_tmb_cav_hexwraiths`; `wh_main_vmp_cav_hexwraiths` | Respective main keys | **B**. Arkhan permission with Tomb Kings campaign-exclusive custom row versus Vampire Counts/Nagash custom rows. Recruitment 0/1400, MP 1475/1400, encyclopedia both true. Explicit faction/context mapping needed. |
| Flamers | `wh3_main_pro_tze_mon_flamers_0`; `wh3_main_tze_mon_flamers_0` | Respective main keys | **B**. Pro candidate has `wh3_main_pro_tze` group; normal candidate has that **same group** plus Tzeentch/Daemons/Vilitch and three custom rows. Recruitment/MP 850/800, encyclopedia both true. Name prefix, cost or shared pro group cannot establish a universal canonical root. |
| Zombies | `wh_main_vmp_inf_zombie`; `wh_main_vmp_inf_zombie_summoned` | Respective main keys | **B**. Normal has Vampire Counts/Nagash permission/custom rows; summoned candidate has explicit `summoned_zombies`/`undead_units_summoned` set memberships and no permission/custom/building rows in scope. Recruitment/MP 100/0, encyclopedia both true. A catalog that excludes summoned variants must say so explicitly. |

Counts of building rows are evidence of table membership only: `enabled`, faction
and conditions must be retained, and some rows have `enabled=false`. Absence from
these tables does not prove impossibility of scripted grants or runtime recruitment.
Likewise `campaign_exclusive` is the recorded flag, not a verified live menu result.
Suffixes such as `_summoned`, `_imperial_supply` and `_pro_` are stable key text;
runtime behavior is not inferred from suffixes alone.

The current representative catalog supplies display names/reasons, not canonical
keys or variant scope. The existing normalization catalog explicitly associates
Helstorm with `wh_main_group_empire` and Bloodthirster with `wh3_main_kho`; the
legacy three-profile integration verifies their normal roots. This supports a
future **scoped** curated mapping for those profiles. It does not authorize
injecting roots into the broader name-based pilot. The other seven lack an
equivalent explicit target mapping. Existing pilot faction aliases are membership
labels and cannot resolve shared-name roots or exclusive ownership.

A future curated mapping should store catalog ID, intended faction/mode/variant
scope, exact `mainKey`, expected `landKey` and localisation key, observed permission
or restriction evidence, source fingerprint and review rationale. Resolve the
exact key and assert those invariants on each extraction; fail closed on drift.
Do not identify by row order, key prefix, visual variant name or English name alone.
This review records stable keys but installs **zero mappings**. Runtime is not
needed just to distinguish these DB identities; catalog intent is an editorial
decision. Runtime remains necessary for effective availability and behavior.

### Rejected deterministic rules and counterexamples

The machine-readable rule audit includes the nine ambiguous groups and the 15
unique-root pilot samples where the relevant evidence is available. No ambiguous
case is classified A and no tested filter is approved for selection.

- `recruitment_cost > 0`: loses the unique Skeleton Chariots root, Beastmen
  Warhounds and Arkhan Crypt Horrors/Hexwraiths. Both Flamers candidates survive.
- `in_encyclopedia=true`: loses the normal Bloodthirster as well as its alternative;
  keeps both Imperial Supply/normal candidates and the Zombies alternatives.
- Permission presence: retains both Warhounds, both Hexwraiths and both Flamers.
  The shared pro-Tzeentch membership is a direct counterexample to choosing by one
  group. Supply's separate faction restriction shows why no military group does
  not mean an invalid unit.
- Non-campaign-exclusive custom battle: can define a deliberately scoped custom
  battle view, but would discard Arkhan campaign entries and supply/pro contexts.
  Both Warhounds still survive. Custom-battle evidence was collected for the nine
  ambiguous samples only; no wider generalization is claimed.

## Composite entity contract

| Sample | Raw main.num_men / land.num_mounts / land.num_engines | Additional DB attachment slots |
| --- | --- | --- |
| Necrofex Colossus | 5 / 1 / 0 | 5, with zombie entity and rifle stats |
| Dread Saurian | 12 / 1 / 0 | 12, with two rider weapon/stat families |
| Black Coach | 1 / 2 / 1 | 1; articulated coach entity also present |
| Skeleton Chariots | 24 / 2 / 12 | 2; articulated chariot entity also present |

These columns belong to different relations: `num_men` is on the main row;
`man_entity`, mount/engine references and their numeric fields are on the land row.
Mount -> entity and engine -> battle_entity are separate edges. Articulated and
ammo-caisson entities are another role. A land-unit/personality junction is a DB
attachment slot with attachment-point fields; personality -> entity and
personality -> stats are distinct edges. The schema does not establish the raw
counts as a universally additive total or the number of live bodies per slot.

For Necrofex the man and mount roles even reference the same entity row. They
must remain separate roles without deduplicating by target or counting the shared
entity twice. Skeleton Chariots' two attachment records are not proof of two live
riders in the entire unit; multiplying them by 12 is also unverified. Mass/size on
a crew or mounted entity is not necessarily the unit-card value. Hit points do
not justify a summed unit-health formula.

`warhammer-vault-entity-roles-v1` is an evidence sidecar, requiring exactly one
schema-connected main/land root. It stores role/reference, raw count with exact
field provenance, unresolved cardinality semantics, all target identities and
paths, raw per-role mass/size/health fields and attachment records. The raw graph
also retains articulated/ammo-caisson roles. No `Unit` type extension is needed.

Display count and total health remain omitted under the existing semantics gate.
For composite structures mass and size are also omitted; no representative man,
mount or engine is selected. Missing or ambiguous role targets also require
omission. For a non-composite man-only case the sidecar delegates to the existing
validated policy; it does not introduce a new conversion.

A future schema needs a stable role-instance/attachment ID, parent role/root,
entity and stats keys, source count plus its explicitly verified scope and scale,
weapon list and ammo-pool binding, and per-field provenance/unknown state.
Separately model display projection policy and runtime conditions. Do not use one
`count`, `mass` or `size` to encode all roles. Runtime observations must be tied to
patch, unit size and modifiers before any projection can be approved.

## Bounded missile findings

### Dread Saurian: a real missing reader edge

The root is `wh2_dlc13_lzd_mon_dread_saurian_1`: primary_ammo=80,
secondary_ammo=180, but land.primary_missile_weapon is empty. The existing primary
selector does not cover the following actual schema-connected branch:

```text
main -> land
  <- land_units_to_battle_personalities_junctions.land_unit
  -> battle_personalities -> battle_entity_stats
  -> missile_weapons -> default_projectile
```

| Slots | Stats key | Missile weapon | Default projectile | use_secondary_ammo_pool |
| --- | --- | --- | --- | --- |
| 2 | `wh2_main_lzd_mon_ancient_stegadon_rider` | `wh2_main_lzd_mon_stegadon_blowpipe` | `wh2_main_lzd_mon_stegadon_giant_blowpipe` | false |
| 10 | `wh2_main_lzd_mon_skink_rider_secondary_ammo` | `wh2_main_lzd_javelin_rider` | `wh2_main_lzd_javelin_mounted` | true |

The attachment type is `autonomous_rider`; raw can-shoot-in-melee is true and
hide-secondary-statistics is false on these paths. Both pool flags, including
false, are preserved as facts. They do not prove per-rider/shared expenditure,
simultaneous firing, displayed ammunition or a combined damage/range formula.
The probe also follows engine missile references, alternate projectile junctions,
projectile explosions and penetration references within these selected weapons.
It does not claim to exhaust runtime scripts or every possible modifier.

Source status is now `DB_CHAIN_FOUND_UNREPRESENTED`, not missing source or
NOT_APPLICABLE. The original `UNKNOWN_MISSILE_CHAIN` remains as the unresolved
primary-selector/Unit representation omission, with the better diagnosis in the
sidecar. A further MULTIPLE_MISSILE_WEAPONS omission prevents false completeness.

Necrofex has an additional five rider paths to `wh2_dlc11_cst_rifle_rider` ->
`wh2_cst_rifle_bullet` (secondary pool true), alongside its existing cannon.
Its previously fully-mapped missile group is therefore corrected to incomplete
in reviewed coverage. No rider-shot multiplication or choice of one weapon occurs.

### Free Company Militia: two explicit enable chains

Root `wh_dlc04_emp_inf_free_company_militia_0` has default weapon
`wh_dlc04_emp_free_company_pistol`. Both additional unit-missile junctions are
preserved, including their default projectiles/explosion references. Their
`battle_entity_stats_override` fields are empty.

1. Junction `156410515` -> `wh2_dlc17_emp_free_company_pistol_blessed`.
   `effect_bonus_value_missile_weapon_junctions` binds it with bonus `enable` to
   `wh2_dlc17_projectile_replacement_free_company_ap_bullet`. A skill-level effect
   binds `wh2_dlc17_skill_emp_volkmar_unique_mere_mortal_men`, level 1/value 1,
   scope `general_to_force_own`. Skill-node/set edges reach
   `wh_dlc04_skill_node_set_emp_volkmar` and agent subtype `wh_dlc04_emp_volkmar`.
   The scope row records character -> force, forcewide_when_commanding, yours.
2. Junction `1972226706` -> `wh_dlc04_emp_free_company_pistol_upgraded`.
   The enable effect is
   `wh3_dlc25_effect_ritual_gunnery_school_gunnery_infantry_exploding_bullets`.
   Bundle `wh3_dlc25_ritual_emp_don_inf_guns_3` binds value 1, scope
   `faction_to_force_own_unseen`, advancement stage `start_turn_completed`.
   Payload/ritual edges reach the same-key ritual, category `DON_GUNNERY_SCHOOL`,
   completion_payload matching that bundle. Scope records faction -> force,
   factionwide, yours. Payload duration=0 and scale_effects=0 are raw values,
   not an inferred permanence or activation rule.

This establishes static skill/bundle enabling paths. It does not establish live
active effects, overlap precedence, weapon replacement timing or whether weapons
fire together. Both overrides remain active=UNKNOWN and precedence=UNRESOLVED.
Only direct schema-connected conditions are accepted, not matching strings.
The probe examines selected effect links in skill, bundle, technology and building
tables; optional frontend data absent from this snapshot is explicitly bounded,
not interpreted as global absence. Basic weapon coverage is never whole-unit
missile completeness.

## Before / after and validation

The unmodified 24-unit pilot rerun matches the original metrics exactly. The new
review overlay only **adds** omissions; it does not mutate normalized units,
remove existing exceptions, downgrade BLOCKED, or certify production eligibility.

| Metric | Before | Reviewed after |
| --- | ---: | ---: |
| CLEAN / PARTIAL / BLOCKED | 1 / 14 / 9 | 1 / 14 / 9 |
| Identity ambiguity | 9 | 9 (all B) |
| Non-semantic omission events / affected units | 76 / 14 | 78 / 14 |
| UNKNOWN_ENTITY_ROLE | 9 | 9 |
| UNKNOWN_MISSILE_CHAIN | 1 | 1, source diagnosis refined |
| MULTIPLE_MISSILE_WEAPONS | 1 | 3 |
| Missile structural omission events | 17 | 19 |
| Fully mapped missile groups | 1 | 0 |
| Unit DIRECT / GENERATED / CURATED | 374 / 15 / 52 | 374 / 15 / 52 |
| Validation failures | 0 | 0 |
| SEMANTICS_BLOCKED | 208 | 208 |

The structural-event metric is all OMISSION events excluding SEMANTICS_BLOCKED;
it also includes unknown IDs/enums and is **not** a count of composite entities.
Missile events are its missile-related subset. Raw sidecar facts are not new Unit
DIRECT mappings. The increase is Necrofex/Dread multiweapon coverage corrections,
not a regression in imported Unit values. Unknown ability/attribute/enum backlog
was not expanded or hidden.

Validation: 92/92 basic tests (78 existing + 14 focused review tests), 5/5 live CA
integration tests, 4/4 saved actual-CA review tests, and production build.
The three legacy profiles (Grail Knights, Helstorm, Bloodthirster) retain their
existing regression assertions. The actual review tests additionally compare all
24 rerun normalized units and omission lists against the preserved baseline.
New tests cover bounded probes, schema-only joins, missing targets, A/B/C policy,
counterexamples, shared-entity roles, unowned attachments, broken projectile edges,
ammo flags, raw provenance identity, unresolved effect precedence and additive
coverage corrections. No game/runtime verification was performed.

## Full-import decision

**Do not start full import.** First establish catalog scope and reviewed canonical
mappings for the nine B cases; approve a representation/display policy for
composite roles and multiple weapons; verify ammo behavior and conditional
override precedence; and retain the existing semantics gate until its own
evidence requirements are met. A DB-only diagnostic pass may continue within
explicit bounds. CLEAN here means structurally clean under the existing pilot
definition, not permission to bypass semantic omissions or import all units.

See [the separate runtime checklist](blocker-review/RUNTIME-CHECKLIST.md).
