# Regular Tournaments · first reviewed CA research slice

Status: **VERIFIED for this exact Grail Knights calculator target**. Local and
remote `main` baseline: `cf432e7ec9cd396817b2fcae552df12a84121af9`.
This is one real CA research, not a synthetic fixture or a faction research importer.

## Selected identity and source

- Technology: `wh_dlc07_tech_brt_economy_industry_tournaments`.
- Name: **Regular Tournaments**, exact
  `technologies_onscreen_name_wh_dlc07_tech_brt_economy_industry_tournaments`,
  `local_en.pack:text/db/technologies__.loc`.
- Technology node → `technology_node_sets_tables.key=brt_mil` →
  `cultures_tables.key=wh_main_brt_bretonnia` through processed schema references.
  Node and node-set campaign/faction restrictions are empty. Selecting the
  checkbox declares that the owning Bretonnian faction completed the research;
  it does not infer campaign unlocks, save state or ownership.
- Selected because the complete technology junction query returns exactly two
  numeric combat effects, both using the same explicit scope and unit set.
  There are no omitted technology effects in this slice.

| Exact effect | Bonus ID | Raw value | Reviewed Modifier |
| --- | --- | ---: | --- |
| `wh2_main_effect_force_stat_melee_attack_brt_knights` | `melee_attack_mod` | 5 | `melee.meleeAttack`, `add`, 5 |
| `wh2_main_effect_force_stat_melee_defence_brt_knights` | `melee_defence_mod` | 5 | `defense.meleeDefense`, `add`, 5 |

Both are `effects_tables.category=battle`. Chain:
`technologies_tables` ← `technology_effects_junction_tables.technology` →
`effects_tables.effect` ← `effect_bonus_value_ids_unit_sets_tables.effect` →
`unit_sets_tables.key=brt_knights` ← `unit_set_to_unit_junctions_tables.unit_set`
→ `main_units_tables.unit=wh_main_brt_cav_grail_knights`
→ `land_units_tables.key=wh_main_brt_cav_grail_knights`.

The complete set query retains all 11 memberships. Grail Knights has one exact
membership with `exclude=false`, empty caste/category/class selectors, and no
experience-range or special-category restriction on the set. No name/category
inference is used. Other set members are not exposed by this bounded app slice.

## Scope and operation review

Both technology junctions use `faction_to_force_own_unseen`. Its actual row is
`location=factionwide`, `ownership=yours`, `source=faction`, `target=force`,
`territory=any`. This establishes the owning faction's forces, rather than a
local province or a selected lord's army. The app's modifiers carry
`scope=faction`, `targetType=unit` and the exact Grail Knights app ID.

The ADD review uses exact CA localisation, not just the bonus identifier's name:

- `Melee attack: %+n for Knights units`
- `Melee defence: %+n for Knight units`
- Contrast retained as source-only semantic evidence:
  `Charge bonus: %+n% for Knight units`.

`%+n` is the numeric substitution token; the percentage description includes a
second, literal trailing `%`. The reviewed melee stat descriptions therefore
specify flat +5 rather than +5%. The contrast effect is not projected/applied.
The referenced engine enumeration `campaign_bonus_value_ids_unit_sets` is not
available as a decoded schema/DB table. An attempted lookup of these bonus IDs
in `unit_stat_modifiers_tables` returned no rows; no false join to that table
is invented. This review authorizes only these exact descriptions/bonus IDs.
It does not authorize a generic bonus-ID mapper or game-wide stacking semantics.

## Evidence and deterministic replay

Game **9.0.2.0**, RPFM **5.1.0**, processed schema format **5**.

| Source | SHA256 |
| --- | --- |
| Processed schema | `5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4` |
| `db.pack` | `d0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723` |
| `local_en.pack` | `f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a` |
| Original ignored bounded extraction | `463a5a665ff82505eb74122061b7fd8c3297c31c306159c22b9a127f2d50fc84` |
| Committed source bytes | `27b33c07a14d7de90f23aef9db4eaad9e1423b3c736addb38f13f213ecfa9f97` |

Static snapshot:
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.

`source.json` contains 29 bounded rows, 13 shared processed schema definitions,
exact source packs/paths/row IDs, reference/localisation relationships and query
coverage. Schema definitions retain named field/type/key/reference metadata;
irrelevant repeated defaults/editor metadata are not copied. Raw selected rows
remain intact. This is 72,944 bytes rather than the 133,457-byte verbose result.
The source-only percentage contrast does not add a second admitted research.

`admission.json` pins source bytes, original extraction identity, static snapshot
and exact research/main/land/app identities. `review.mjs` validates these, row
identities, schema references, coverage, localisation, scope and membership,
then deterministically creates `review.json` and `src/data/caResearchEffect.json`.
The projection carries `CA_RESEARCH`, full existing `Modifier[]`, and source /
review / snapshot hashes. The app does not load raw rows or use RPFM at runtime.

Clean checkout commands (no game, RPFM or generated files required):

```powershell
node scripts/review-bretonnia-research.mjs --check
npm test
npm run build
```

`--write` recreates the exact reviewed artifacts; it cannot refresh source pins
or silently accept drift. Local optional source inspection uses the existing
bounded inspector with `research-slice/queries.json`, writing only ignored output.
Re-extraction timestamps are not the deterministic replay contract.

## Calculator behavior and limits

- Grail Knights base attack **38 → 43**, defence **34 → 39**.
- Manual attack +8 and research +5 stack through the existing engine: **51**.
  Unchecking research returns manual-only **46**.
- Breakdown labels distinguish **WH3 Research · Regular Tournaments** and **Manual**.
- Research is read-only and available only for the exact reviewed unit/version.
  Profile saves contain manual modifiers only. Research selection is ephemeral;
  unit changes, profile reset/load and URL unit changes clear it.
- Unknown base remains unknown; invalid manual input blocks the entire result.
  Units and source modifiers are not mutated.
- No unresolved scope/operation ambiguity for these two projected modifiers.
  Other units/effects and actual mixed-effect game stacking remain outside scope.

## Validation

Tests **394/394**, build **PASS**. New tests cover replay, 15 source mutations,
admission hash/identity/snapshot mutations, exact mapping, unknown/immutable
behavior, manual stacking, deselection, UI and manual-only Profile storage.
Existing Profile CRUD/backup/comparison/static production/runtime tests pass.
Browser confirms 43/39, 51 with manual +8, then 46 after deselection, source labels,
and a 320px viewport including expanded provenance without page overflow.
Clean source-only snapshot replay/build: **PASS**, tests **392 passed / 2 skipped**.
The existing optional local diagnostic-source and saved speed-trace checks skip
because ignored materialized inputs are intentionally absent in that snapshot.

Production 101 / Sample 5, units.json bytes, HP/Speed admissions, diagnostic and
shared identities are unchanged. Existing runtime/MEDIUM evidence, engine,
IndexedDB and backup contracts are unchanged. No game or runtime probe was run.
