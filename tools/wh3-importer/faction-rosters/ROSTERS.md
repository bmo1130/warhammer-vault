# Reviewed race roster catalogs — WH3 9.0.2.0

Baseline: 0205595380d4dcb95a9df83a2e3b405b518160c9 (101 Production Units, 5 structural Unit Samples, 2 sample Lords, no Heroes, no complete inventories).

## Result and scope

| Race | Status | LL | Generic Lord | Legendary Hero | Generic Hero | Units |
|---|---|---:|---:|---:|---:|---:|
| empire | ROSTER COMPLETE | 6/6 | 5/5 | 7/7 | 13/13 | 75/75 |
| vampire_counts | ROSTER COMPLETE | 7/7 | 9/9 | 7/7 | 8/8 | 43/43 |
| greenskins | ROSTER COMPLETE | 6/6 | 6/6 | 1/1 | 6/6 | 70/70 |
| bretonnia | ROSTER COMPLETE | 4/4 | 4/4 | 2/2 | 4/4 | 30/30 |
| tomb_kings | ROSTER COMPLETE | 4/4 | 12/12 | 0/0 | 8/8 | 45/45 |
| vampire_coast | ROSTER COMPLETE | 4/4 | 12/12 | 1/1 | 6/6 | 36/36 |
| skaven | ROSTER COMPLETE | 7/7 | 10/10 | 2/2 | 6/6 | 67/67 |
| lizardmen | ROSTER COMPLETE | 7/7 | 27/27 | 2/2 | 8/8 | 71/71 |
| kislev | ROSTER COMPLETE | 4/4 | 4/4 | 2/2 | 7/7 | 36/36 |

0 → 9 COMPLETE catalogs. Production Units 101 → 478; Lords 2 Samples → 138 Production (136 new identities plus Kemmler/Vlad promoted with their existing wiki IDs); Heroes 0 → 87. Counts preserve subtype variants separately. Ulrika has three proved race memberships; two Mourngul units have two race memberships. Shared exact identities count in each roster and only once in the global collection.

HP is unknown for 465/478 Production Units, Speed for 397/478. No new HP or Speed is inferred. The original 101 Production Unit facts and five legacy structural samples are unchanged. Those samples remain labelled separately in global search and do not count in faction roster lists or completeness.

COMPLETE means every selected player character/troop identity is present and every other discovered identity has an explicit exclusion. It does not claim complete stats, Research, Buildings, Skills, campaign unlock rules, DLC entitlement or lore. Warriors of Chaos remains PARTIAL, with an unreviewed expected universe.

## Selection from exact source relations

The existing reviewed hotfix snapshot is required: local WH3 9.0.2.0, schema and db/local pack hashes from reviewed-snapshots.mjs. The game is never executed. The pipeline is read-only against the installed game.

1. Start from exact culture keys. Follow culture → subculture → factions; derive the native military group from the matching race catalog faction. Keep native-subculture, nonquest, nonrebel factions using that group, plus verified frontend faction variants. Thus Southern Realms sharing the Empire culture and Greenskin rogue foreign military groups do not become player Empire/Greenskin archetypes.
2. Union all faction-agent subtype permissions and frontend faction leaders. Retain all candidates including disabled, foreign, quest and background rows in the inventory. Starting leaders can qualify even when regular recruitment is false; this retains Isabella, Boris Todbringer and Neferata.
3. General permission or frontend leader defines a Lord. Frontend leader / legendary_lords recruitment category defines LL; the rest are Generic Lords. Hero uniqueness uses unique_agents and actual forename/surname Loc records. A unique auto-generated campaign set-piece character with a single associated subtype also qualifies: the Damned Paladin has exact Vampire Coast campaign-exclusive battle permission and is not discarded just because show_in_ui is false.
4. Other characters require an enabled playable agent permission and recruitable subtype. Nonunique hidden subtypes without a selectable UI or proved unique character definition are explicit unverified-membership exclusions, not invented generic archetypes. These exclusions are not assertions of AI-only status. General visual/magic variants keep distinct CA subtype IDs; no name-based merging occurs.
5. Troop universe is the union of military permissions, race faction battle permissions, and associated character main-unit identities. Character/mount battle forms are accounted for in character inventory, never as separate troops. Nonquest player battle permission admits ordinary, RoR and campaign-exclusive special units; campaign_exclusive is not an exclusion. No exact battle permission means an explicit unverified-membership exclusion. main_units.is_renown preserves RoR identity; base/RoR IDs never merge.
6. Missing units are diffed against the fixed baseline and traced by exact main/land/Loc identity. Table queries are bounded to 24 selected keys; normalization/admission is one candidate at a time. The original trace, normalizer, conservative growth gate, Unit validator and complete optional-group omission policy are reused. Units without military permission use one connected exact faction battle permission; this is the only added core affiliation path. Missile, ability/passive/attribute groups stay absent in full when withheld. No new field mappings or entity/HP/Speed formulas.

## Inventory and exclusions

source.json is one shared source dictionary using the existing expansion-batch-01 lossless format, not a source copy per race. Its single reviewed expanded hash uses the existing decoder contract. admission.json contains every expected entry and exclusion with exact source row IDs, omissions and any admission HOLD. src/data/factionRosters.json is a small display inventory; numeric status is recomputed from actual loaded Production entities, kind, subtype and memberships. Only the display inventory is shipped in the app, not raw source or full admission evidence.

686 exclusion occurrences across race inventories (not 686 unique global entities):

- NO_ENABLED_NONQUEST_PLAYABLE_AGENT_PERMISSION: 14
- NON_RECRUITABLE_SPAWN_OR_BACKGROUND_SUBTYPE: 7
- CHARACTER_BATTLE_FORM: character/mount identity belongs in subtype inventory, not troop roster: 511
- QUEST_BATTLE_FACTION: 58
- FOREIGN_CATALOG_GROUP: 38
- REBEL_FACTION: 16
- PLAYER_ARCHETYPE_NOT_VERIFIED: no UI entry or unique-agent definition: 5
- NO_NONQUEST_PLAYER_BATTLE_PERMISSION: spawn/background membership unverified: 37

Exact hidden subtypes with unverified selectable archetype membership:

- wh2_dlc17_vmp_kevon_lloydstein
- wh3_dlc29_vmp_handmaiden
- wh2_dlc09_tmb_necrotect_ritual
- wh2_main_skv_plague_priest_ritual
- wh2_main_skv_warlock_engineer_ritual

These rows remain in source/admission with exact permissions and flags. They are excluded under the rule above; they are not silently counted as members, renamed, treated as proved AI-only or discarded from accounting. Other concrete exclusions include disabled old/new Gotrek permissions, the disabled gold-wizard general, quest-only Greenskin bosses, ritual/background agent variants, and character mount forms. No admission candidate is currently HOLD; unexplained missing count is zero in all nine complete catalogs.

## Reproduce / extend

- node scripts/review-faction-rosters.mjs --check — offline current source + admission + all app projections, baseline preservation, character identity, duplicate and membership checks.
- node scripts/review-faction-rosters.mjs --preview — same review without writing; includes exact HOLD reasons.
- node scripts/extract-faction-rosters.mjs — local reviewed WH3/RPFM required. Adjust the target culture list to extend a race. Extraction is based on source permissions, not display-name batches. It diffs against the fixed baseline, so rerunning after admission retains the whole evidence batch.
- Review the changed source and update the existing rosterSourceHash pin only after that review. node scripts/review-faction-rosters.mjs --write writes the reviewed baseline-derived projection. It is not automatic admission of a changed snapshot.
- npm run check:data; npm test; npm run build; npm run check:pages.

The existing historical evidence-view architecture remains intact. Live roster admission/projection runs first; current app, storage and roster tests run against current data. The original 623 tests and 17 reports replay their original baseline, preserving their original whole-app byte contracts. Research/Skill/HP/Speed admission and diagnostic artifacts are unchanged; no new manifests, replay architecture or validation-of-validation framework were added. Relevant live app tests now expect the larger catalog, multiple substring name matches and correctly escaped localized names.

## UI and verification

Faction Roster separates LL/GL/LH/GH and all Production units, with source expected/admitted coverage. Lord/Hero detail links provide generic personal ArticleEditor, Bookmark, Recent view and “내 기록으로”. Hero search accepts name, stable ID and exact CA subtype. IndexedDB schema and v1 backup format are unchanged. Kemmler/Vlad keep heinrich_kemmler / vlad_von_carstein and vampire_counts keeps its faction ID.

Mobile smoke uses the isolated 127.0.0.1:4181 origin with built Pages semantics, not the user's dev-origin personal records. 320/430px widths cover roster, Hero links, shared faction membership, article save/reload, bookmarks, recent views and search. Screenshots are in docs/screenshots. The bundle remains above Vite's 500 kB warning threshold (about 197 kB gzip); raw roster source is not bundled.

## Next closure candidate

A read-only source-size comparison of remaining native catalog races found Ogre Kingdoms next: 36 troop candidates + 18 character candidates (54), versus Khorne 56, Chaos Dwarfs/Tzeentch 57 and Warriors of Chaos 229 missing identity candidates. These are discovery estimates, not reviewed COMPLETE inventories; campaign-only special definitions still require the same final identity review. This comparison changes no dataset and introduces no evidence framework.
