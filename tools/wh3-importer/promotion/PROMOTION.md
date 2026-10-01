# First static production batch

Review date: 2026-10-02. One Unit: **Dragon Ogres**, WH3 **9.0.2.0**.
This is the first-batch historical approval. Subsequent PARTIAL field-group
eligibility and four explicit additions are reviewed in [PARTIAL_REVIEW.md](PARTIAL_REVIEW.md).
The first source remains pinned; CLEAN is not a universal production requirement.
This approval is for the verified base fields of this exact saved source, not a
complete battle profile, runtime generalization or automatic admission rule.

## Selection and gate

The saved 24-name 9.0.2 pilot has CLEAN 1 / PARTIAL 14 / BLOCKED 9. Dragon Ogres
is the sole CLEAN result, with one exact main/land identity, no unmapped IDs and
no conditional missile or composite entity selection. CLEAN allows documented
semantics omissions; it does not mean that HP/count/speed are known.

1. Accept only the committed, SHA256-pinned bounded CA source below. Fixture,
   materialized context, runtime evidence and alternative snapshots are refused.
2. Reuse `normalizeUnit` with its existing conservative policy, named processed
   schema fields, verified join paths and exact military permission evidence.
3. Require exact main/land/name/internal ID and the reviewed game/schema/pack
   fingerprints. Only this reviewed primary catalog affiliation is admitted.
4. Require provenance for every non-metadata leaf, direct static numeric values,
   no unresolved status in Unit fields, no populated omitted path, no unknown ID,
   and valid required groups/finite nonnegative numbers. Keep real 0/false.
5. Reuse the app validator against the actual resulting faction registry. Reject
   duplicate IDs, diagnostic ID collisions and any differing existing record.
6. Append the one Unit and a minimal catalog faction. Preserve sample records,
   runtime/precedence/diagnostic data, personal storage and v1 backup format.

No status on an old artifact is rewritten. The 19 context results remain
MATERIALIZED/PARTIAL and `productionEligible=false`; the 5 runtime diagnostic
entries also remain diagnostic-only. This is a separate explicit static review.

## Exact identity and source

| Item | Value |
| --- | --- |
| Production ID | `ca_unit_wh_dlc01_chs_mon_dragon_ogre` |
| CA main / land | `wh_dlc01_chs_mon_dragon_ogre` / `wh_dlc01_chs_mon_dragon_ogre` |
| Localisation | `land_units_onscreen_name_wh_dlc01_chs_mon_dragon_ogre` → `Dragon Ogres` |
| Primary catalog | `wh_main_group_chaos` → `warriors_of_chaos` (existing reviewed pilot alias) |
| Other retained permissions | `wh3_dlc29_group_chs_archaon`, `wh3_dlc29_group_endgame_chaos`, `wh3_main_group_belakor` |
| Static snapshot | `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5` |
| Schema SHA256 | `5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4` |
| db.pack SHA256 | `d0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723` |
| local_en.pack SHA256 | `f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a` |

`dragon-ogres.source.json` is actual evidence projected from the saved
`generated/wh3/refresh-9.0.2/pilot/units/sample-11.result.json`, not synthetic
fixture data. Its reviewedSource records the original file SHA256. It retains
all 46 traced rows, 21 identity/permission rows and their recorded references.
The processed schema projection retains named types/keys/references used by the
normalizer; unused schema descriptions and filesystem paths are removed. Pack
paths become filenames; in-pack paths and pack hashes are retained. Replaying
this projection reproduces the original Unit, all 36 omissions and zero unmapped
IDs. Canonical input SHA256 (JSON.stringify parsed evidence):
`40329e1e26ca6e946c9fe1f911406211dbd9ec840c097229cf7104d4fa614ba9`.

The minimal faction's display name is an editorial catalog label, not newly
extracted faction localisation. The permission-backed primary grouping is not
exclusive ownership, a full roster or effective campaign recruitability. No lore
or faction game statistics are added.

## Promoted fields and omissions

The normalizer supplies 30 sourced fields: 25 DIRECT, one GENERATED exact ID and
four CURATED affiliation/attribute aliases. Metadata and empty required text are
documented separately. The app Unit remains the existing schema.

- Category `Melee Infantry`, tier 4; entity size `large`, per-entity mass 1700.
- Armor 60, melee defense 40, leadership 72, shield 0, penetration resistance 4.
- Melee attack 32, charge 42; base/AP 33/77, large/infantry bonus 26/0;
  interval 4, length 2, splash maximum 4/medium.
- `canSkirmish=false`; reviewed fear/forest hiding/siege attacker aliases.
- Base custom battle/recruitment cost 1550, upkeep 387, recruitment turns 2.

Count (raw num_men=16), health, health per entity, troop scale, displayed speed,
charge speed, resistance conversions, effective recruitment/requirements/caps,
terrain modifiers, canFly/canRun, role, lore/description and missile profile are
not filled. Empty summary and tags are required containers, not inferred facts.
No DPS/reload/HP formula or stored derived total is added.

## Other candidates and next boundary

Grail Knights and mounted/composite/weapon-team samples retain structural or
mapping omissions. Helstorm, Bloodthirster, Handgunners, Crypt Horrors, Steam
Tank, Chaos Warhounds, Hexwraiths, Flamers and Zombies are BLOCKED in name-based
discovery. Their exact reviewed contexts can be materialized, but those results
still have separate PARTIAL quality and no production approval. Ordinary
Swordsmen/Spearmen and The Sternsmen also retain unmapped abilities/attributes.
Black Coach, Skeleton Chariots, Dread Saurian, Necrofex and Free Company stay in
the existing diagnostic batch; no runtime observation resolves their production
representation here. Do not bypass these gates to reach three units.

The next batch can reuse the normalizer/validator and this small replay pattern,
after an explicit source/identity/field review for each added candidate. This
one-source gate intentionally refuses every other input. No automatic expansion.

## Reproduction without a game or local generated files

```powershell
node scripts/promote-first-unit.mjs --check
npm test
npm run build
```

`--check` replays the checked-in source and verifies the current production
records. `--write` is the explicitly bounded append step, is idempotent and
refuses overwrite/source drift. Both complete all gates before data writes.
They never access the game, RPFM, runtime ingestion or the network.

## Verification record (2026-10-02)

- `npm test`: 250 passed, no failures or skips; includes seven production gate,
  source-value, omission, boundary and rendering tests.
- `npm run build`: TypeScript and Vite production build passed.
- `--check`: idempotent replay, 25 DIRECT fields, 36 omissions, zero unmapped IDs.
- Saved context materialization integration: 7 passed for 19 existing results.
  Historical faction validation is checked against its recorded registry;
  current faction validation is checked separately. No artifact was rewritten.
- Saved runtime/CCO integration: 9 passed. Diagnostic source and projection,
  precedence, normalizer, sample records and personal/backup contracts unchanged.
- Local browser: `/units` shows 1 Production / 5 Sample / 5 Diagnostic-only.
  Dragon Ogres shows verified stats, the existing 33 + 77 sum, unknown HP/speed
  and collapsed source fingerprints. Zombies remains Sample; Dread Saurian
  retains Production data unavailable and UNVERIFIED / INCONCLUSIVE evidence.
  Production bookmark, article save and home recent/favorite links worked on a
  separate localhost test origin. No game or new source extraction was used.
