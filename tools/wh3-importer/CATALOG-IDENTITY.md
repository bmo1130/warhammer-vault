# Catalog identity policy — faction roster v1

**Display name is not identity. `main_units.unit` is CA source identity.**
This policy classifies source candidates into explicit presentation contexts. It
does not choose a global canonical root by name, merge candidates, materialize new
Units, or approve full import. The source-level B decisions and nine BLOCKED pilot
samples remain intact even though their editorial classifications are now recorded.

## Current app and minimum model

`Unit.id` is the global record/route/reference identifier: gameRepository indexes
it, detail routes use it, and bookmarks/articles/recent views refer to it. Current
sample IDs are editorial strings; the importer generates `ca_unit_<exact main key>`.
Changing an existing ID would also affect those persistent user references.
`Unit.name` is a display/search label. Unit validation prohibits duplicate IDs,
not duplicate names. Search returns matching records without deduplicating names;
React keys and detail lookups use IDs. Duplicate labels therefore need no UI change
for correctness, although future context views should show useful context labels.

`Unit.factionId` supplies one primary display membership, faction indexing and the
detail breadcrumb. It does not express exclusive CA ownership or all permissions.
Only Vampire Counts is present in the production sample faction data. New planned
faction/context labels below are metadata, not injected production factions.

The normalizer already preserves exact main/land identity and permission evidence
in field provenance outside Unit. No Unit or UI schema change is required for this
diagnostic phase. The new `policy.d.mts` defines a separate catalog identity contract
and a compile-time consumer exercises it. Multiple presentations for one source
are supported there without duplicating or overwriting a source candidate.

| Layer | Identity | Meaning |
| --- | --- | --- |
| Source | Exact CA main key, within the CA game namespace | Distinct campaign/recruitment source root; never replaced by a label or land key. |
| Stat reference | Schema-connected land key | Records sharing of that DB record, preserving each main root. Complete battle-profile equivalence is NOT_ESTABLISHED because main-specific weapon/context overrides may differ. |
| Presentation | Losslessly encoded `(mainKey, contextId)` tuple | Editorial entry/context. It references the source, has a planned faction and classification, and is not an existing Unit route. |

Presentation IDs are `ca_catalog:<encoded main key>:<encoded context ID>`.
Percent encoding makes the tuple unambiguous even if future keys contain separators.
Classification/context decisions are CURATED; tuple IDs are GENERATED; raw identity
facts are DIRECT with row/table/field/key/schema/pack/path pointers. These metadata
facts are not counted as newly mapped Unit fields.

Same land does not imply same main identity, same recruitment cost, or complete
stat equivalence. Stat-reference reuse may be useful later, but a whole normalized
Unit must not be cached or merged by land key. Aliases could eventually be additional
search/display labels; none is added and aliases must never select a CA root.

## Explicit editorial scope

The default catalog covers **reviewed player faction-roster contexts**, including
independent equivalents in different faction contexts. Zero-cost roster records
are eligible when explicitly reviewed; cost is not an admission predicate.
Arkhan/Tomb Kings Crypt Horrors and Hexwraiths are default roster contexts alongside
their Vampire Counts counterparts. Beastmen and Chaos Warhounds are both independent
default entries. Neither is a fake variant of the other.

Imperial Supply, ability-spawn and nonstandard roots remain individually
addressable context records outside the default roster view. They are retained
in the source set, not discarded because they are not default-visible. This rule
defines product presentation scope; it does not establish effective recruitment,
script activation, current availability or exclusive ownership.

The registry records the reviewed primary contexts for these 19 roots. Other
permission groups and campaign/custom-battle/recruitment memberships remain in
the original evidence. This is not a claim that every other faction's use of a
shared main root has been exhaustively classified. Adding another presentation
context requires another explicit reviewed declaration; membership alone must
not generate entries or silently choose a primary faction. RoR and new source
families likewise require explicit context decisions rather than suffix parsing.

## Generic evaluator versus curated decisions

`catalog-identity/policy.mjs` contains no special case for a sample name. It:

1. Preserves every source candidate and its original data/evidence.
2. Checks unique exact main and schema-connected land identity, expected land/Loc
   keys, the reviewed game version and evidence completeness.
3. Looks up an exact-key decision and checks every declared DB condition using
   processed-schema edges and field facts. Matching strings without those edges
   are insufficient. Drift, missing guards, duplicate keys/contexts and unknown
   decisions fail closed into POLICY_STILL_UNRESOLVED.
4. Emits explicit contexts without merging sources. Shared land references are
   independently recorded for verified source identities.
5. Keeps name-only importStatus=BLOCKED and selectedKey=null. An explicit
   `(mainKey, contextId)` request can return CATALOG_PLAN_READY only when the
   candidate set is classified and that exact curated context is unique. This is
   a plan, not tracing/normalization or a materialized Unit.

`catalog-identity/decisions.mjs` is the reviewed editorial registry. Its data
records exact main/land/Loc keys, context/faction labels, rule, rationale, optional
editorial counterpart and required evidence guards. Small roster/supply/spawn
constructors express recurring record shapes; they do not discover or select roots.
The registry is explicitly reviewed for game version 9.0.1.0. Applied evidence keeps
its actual schema/pack fingerprint and raw checked facts. Updating normalization
policy alone cannot approve this catalog registry for a new game version.

Forbidden global selection heuristics: positive recruitment cost, encyclopedia
visibility, any permission presence, custom-battle presence, first candidate,
candidate order, or `_summoned`/`_pro`/`_imperial_supply` substring parsing. Such raw
data is retained as evidence but never substitutes for an exact-key decision.
The existing blocker-review counterexample audit remains unchanged and still
rejects these generalizations (including free Skeleton Chariots, both normal
Warhounds and both encyclopedia-hidden Bloodthirsters).

## All nine samples: all 19 candidate classifications

P = PRIMARY_CATALOG_ENTRY; F = SEPARATE_FACTION_ENTRY;
C = CONTEXT_VARIANT; S = SUMMONED_OR_SCRIPTED_VARIANT;
N = PROLOGUE_OR_NONSTANDARD_CONTEXT. P/F are default-visible; C/S/N are retained
context entries. Every disposition is CURATED; its DB guard is a checked invariant,
not an automatic universal classification rule.

| Sample | Exact main key | Class / context | Checked DB guard and policy |
| --- | --- | --- | --- |
| Helstorm | `wh_main_emp_art_helstorm_rocket_battery` | P / empire_roster | `wh_main_group_empire` membership -> explicit Empire roster decision. |
| Helstorm | `wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply` | C / empire_imperial_supply | Supply unit-set membership + allowed Huntmarshal restriction -> context-only decision. |
| Bloodthirster | `wh3_main_kho_mon_bloodthirster_0` | P / khorne_roster | `wh3_main_kho` membership -> explicit Khorne roster decision; other groups retained. |
| Bloodthirster | `wh3_main_kho_mon_bloodthirster_summoned_0` | S / khorne_ability_spawn | `wh3_main_character_abilities_greater_gate_of_khorne.spawned_unit` -> its land; transformation/decoy false -> ability-spawn context. |
| Handgunners | `wh_main_emp_inf_handgunners` | P / empire_roster | Empire group -> explicit roster decision. |
| Handgunners | `wh2_dlc13_emp_inf_handgunners_imperial_supply` | C / empire_imperial_supply | Supply set + allowed Huntmarshal restriction -> context-only decision. |
| Crypt Horrors | `wh_main_vmp_mon_crypt_horrors` | P / vampire_counts_roster | `wh_main_group_vampire_counts` membership -> explicit roster decision. |
| Crypt Horrors | `wh2_dlc09_tmb_mon_crypt_horrors` | F / tomb_kings_arkhan_roster | `wh2_dlc09_tomb_kings_arkhan` membership -> separate default faction/context entry. |
| Crypt Horrors | `wh_main_vmp_mon_crypt_horrors_summoned` | S / vampire_counts_ability_spawn | `wh_dlc04_spell_vampires_raise_dead_upgraded_strigoi.spawned_unit` -> its land; transformation/decoy false. |
| Steam Tank | `wh_main_emp_veh_steam_tank` | P / empire_roster | Empire group -> explicit roster decision; Tzeentch/Deceivers evidence also retained. |
| Steam Tank | `wh2_dlc13_emp_veh_steam_tank_imperial_supply` | C / empire_imperial_supply | Supply set + allowed Huntmarshal restriction -> context-only decision. |
| Chaos Warhounds | `wh_dlc03_bst_inf_chaos_warhounds_0` | F / beastmen_roster | `wh_dlc03_group_beastmen` -> separate roster entry, despite recruitment cost 0. |
| Chaos Warhounds | `wh_main_chs_mon_chaos_warhounds_0` | F / warriors_of_chaos_roster | `wh_main_group_chaos` -> separate roster entry; no source relation/merge with Beastmen inferred. |
| Hexwraiths | `wh_main_vmp_cav_hexwraiths` | P / vampire_counts_roster | Vampire Counts group -> explicit roster decision. |
| Hexwraiths | `wh2_dlc09_tmb_cav_hexwraiths` | F / tomb_kings_arkhan_roster | Arkhan group -> separate default faction/context entry. |
| Flamers | `wh3_main_tze_mon_flamers_0` | P / tzeentch_roster | `wh3_main_tze` -> explicit normal roster decision. |
| Flamers | `wh3_main_pro_tze_mon_flamers_0` | N / tzeentch_nonstandard | `wh3_main_pro_tze` -> explicit nonstandard decision. Actual prologue scenario usage is NOT_VERIFIED. |
| Zombies | `wh_main_vmp_inf_zombie` | P / vampire_counts_roster | Vampire Counts group -> explicit roster decision. |
| Zombies | `wh_main_vmp_inf_zombie_summoned` | S / vampire_counts_ability_spawn | `wh_main_spell_vampires_raise_dead.spawned_unit` -> its land; transformation/decoy false. |

The three Empire pairs share their land records: Helstorm's normal land,
Handgunners' normal land and `wh_main_emp_veh_steam_tank_driver`. All other main/land
keys in this table coincide. Each localisation key is
`land_units_onscreen_name_<land key>`; all original display names and Loc pack/path
metadata remain stored. Sharing is limited to the proved land reference.

Supply guards specifically use `wh2_dlc13_emp_imperial_supply` with exclude=false
and `wh2_dlc13_emp_the_huntmarshals_expedition` with allowed=true. Original custom
battle, building, recruitment override, visual variant, unit-set and permission
evidence remains in each review graph/candidate. Absence or disabled building rows
do not prove that a root cannot be granted or recruited through other mechanisms.

Additional bounded evidence follows only
`unit_special_abilities.spawned_unit -> selected land_units.key`. This establishes
the three ability-spawn land bindings without parsing root names. Spawn fields,
including false transformation/decoy flags and raw spawn_type, are preserved.
No spawn-type interpretation, effect execution, duration or runtime main-root
resolution is inferred. In particular an ability references land, not main identity.
Both Flamers roots have the pro-Tzeentch permission; that group cannot select one.

## Integration, metrics and remaining BLOCKED identities

The representative pilot runner and normalizer are unchanged. `inspectIdentity`
adds bounded spawn evidence and a `catalogIdentity` sidecar; the review CLI/report
persists the metadata, dispositions and separate counters. It does not feed the
classification back as an override to generic root discovery or remove any old
exceptions. No candidate is deleted and no new Unit values are emitted.

| Metric | Before | After |
| --- | ---: | ---: |
| CLEAN / PARTIAL / BLOCKED | 1 / 14 / 9 | 1 / 14 / 9 |
| Source/name IDENTITY_AMBIGUITY | 9 | 9 |
| Ambiguous groups with explicit catalog classification | 0 | 9 |
| Catalog-policy-unresolved ambiguous groups | 9 | 0 |
| Classified / retained ambiguous source candidates | 0 / 19 | 19 / 19 |
| Context-resolved Unit imports | 0 | 0 |
| Unit validation failures | 0 | 0 |
| Unit DIRECT / GENERATED / CURATED | 374 / 15 / 52 | 374 / 15 / 52 |
| Reviewed non-semantic / missile omission events | 78 / 19 | 78 / 19 |
| Unit values / omissions / unmapped IDs / field provenance | baseline | unchanged |

The policy counters concern these nine groups only, not every permission context
or all WH3 units. There are 8 P + 4 F + 3 C + 3 S + 1 N presentations. Metadata's
19 curated context decisions/19 generated presentation IDs are separate from
Unit mapping counts. Original 24-unit discovery contains 34 main candidates in
total, of which these 19 belong to the nine ambiguous groups.

All nine **name-based imports** remain BLOCKED because they lack an explicit
source/context request; Crypt Horrors, Hexwraiths and Warhounds also deliberately
have multiple legitimate default roster contexts. A context-aware materialization
adapter is not implemented here, and the current single-faction Unit model cannot
silently reuse one ID for multiple presentation entries. These are import-interface
limitations, not unresolved editorial classification or automatic runtime tasks.
Unregistered/drifted future candidates remain POLICY_STILL_UNRESOLVED and cannot
obtain a plan. Expanding the exact-key registry requires reviewed evidence.

Validation on installed CA game 9.0.1.0 / RPFM 5.1.0 / schema format 5:
106/106 basic tests, including 14 new catalog tests, existing 16 pilot and 14
blocker-review tests; 5/5 live CA integration; 9/9 saved actual review tests
(existing 4 + new 5); build passed. The legacy three core regressions passed.
All 24 rerun normalized Units/omissions/unmapped IDs/field provenance matched the
preserved baseline. Old counterexample audit and all existing before/after metrics
matched the previous review. No game or full importer was run.

Reproduction, with the existing environment/config and a completed baseline:

```powershell
npm test
npm run build
# Separate representative rerun, preserving generated/wh3/pilot baseline.
npm run pilot:wh3-units -- --output-dir generated/wh3/catalog-identity/policy-2026-10-01
node tools/wh3-importer/blocker-review/cli.mjs
$env:WH3_INTEGRATION_CONFIG='tools/wh3-importer/.local/config.json'
npm run test:wh3-integration
$env:WH3_BLOCKER_REVIEW_DIR='generated/wh3/blocker-review/2026-10-01T01-26-03.278Z'
node --test tools/wh3-importer/blocker-review/integration.test.mjs tools/wh3-importer/catalog-identity/integration.test.mjs
```

That review directory contains the new metadata and all raw guards. On a fresh
checkout, create the default baseline first as documented in
[BASELINE-DEPENDENCIES.md](BASELINE-DEPENDENCIES.md). Use the new completed review
directory emitted on that machine for the saved-result tests.

## Runtime and full-import boundary

Arkhan presentation, preservation of both Warhounds and exclusion of context-only
entries from the default view are product decisions already recorded. Runtime
does not decide those policies. Verify actual recruitment/grants, scenario use,
spawned main/land key behavior, duration and active effects separately; do not
convert those observations into a global name selector.

See [RUNTIME-CHECKLIST.md](blocker-review/RUNTIME-CHECKLIST.md), including the existing
composite counts, Dread/Necrofex ammo and Free Company override checks. Full import
is **not approved**: it still needs reviewed context-aware materialization and
faction registration, composite/multiweapon representation, runtime evidence where
needed, and the existing semantics gates. This implementation establishes safe
identity metadata and planning; it does not certify complete Unit coverage.
