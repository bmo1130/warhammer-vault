# Evidence-linked static admission

2026-10-02 · WH3 9.0.2.0. Five explicit identities only; no new probe or game execution.

This admission supersedes the previous connection-required status for the five
identities below. Historical partial reviews and diagnostic artifacts remain unchanged.
`productionEligible=false` describes the diagnostic batch, not this separate static admission.

## Identity and source boundary

`src/data/unitSharedIdentities.json` is the bounded reviewed projection, generated
by `scripts/promote-evidence-linked-units.mjs --write` and verified by `--check`.
Each link records production and diagnostic IDs, CA main/land keys, partial review
slug and identity, original candidate reference/hash, diagnostic main/land keys,
game version and the independently admitted production record. The registry pins
the diagnostic batch, schema/pack snapshot and review/source hashes.

The catalog accepts a collision only when this exact link, diagnostic context,
snapshot and complete production record agree. Record equality binds existing
Unit metadata to reviewed CA identity without adding identity fields to Unit.
Names never select a link. Unlisted collisions and duplicate IDs still throw.
An altered main key, land key, provenance, production record or snapshot fails closed.
The registry is build/replay validated; it is not an arbitrary identity resolver.

Both repositories remain independent. The catalog projects display flags and one
`/units/:id` route, without copying diagnostic stats into production. No runtime
HP, NumEntities, entity list count or projectile observation is promoted.

## Exact allowlist and fields

All five retain reviewed identity, primary affiliation/catalog, classification,
movement state (`canSkirmish`), defense, melee, campaign and customBattle subsets.

| Review / unit | Exact CA main = land key | Additional retained entity fields |
| --- | --- | --- |
| <a id="sample-07"></a>sample-07 · Free Company Militia | `wh_dlc04_emp_inf_free_company_militia_0` | MAN `entitySize=small`, `mass=90` |
| <a id="sample-12"></a>sample-12 · Necrofex Colossus | `wh2_dlc11_cst_mon_necrofex_colossus_0` | None |
| <a id="sample-14"></a>sample-14 · Black Coach | `wh_main_vmp_veh_black_coach` | None |
| <a id="sample-15"></a>sample-15 · Skeleton Chariots | `wh2_dlc09_tmb_veh_skeleton_chariot_0` | None |
| <a id="sample-24"></a>sample-24 · Dread Saurian | `wh2_dlc13_lzd_mon_dread_saurian_1` | None |

Production ID and diagnostic ID are both `ca_unit_` followed by the exact key
above. The prefix is descriptive here, never an authorization rule in the catalog.

All five omit count, HP, scale, displayed/ground/charge speed and Unit.missile.
Abilities/passiveAbilities/attributes remain absent under their existing review:
incomplete groups are withdrawn in full, with every unknown CA ID retained in
the unchanged partial review. The four composite units retain empty entities.

- Free Company: default pistol, blessed and alternate overrides and scoped
  precedence remain diagnostic evidence. No universal active missile is selected.
- Necrofex: reviewed primary cannon direct fields remain in partial-review.json;
  cannon/rider paths remain in diagnostics. A single Unit.missile cannot represent
  both, so the whole production missile group is withheld.
- Dread Saurian: primary/secondary ammo, rider candidates and runtime contexts
  remain evidence; failed ActiveProjectileContext capture and INCONCLUSIVE source
  activation do not authorize any representative missile.
- Black Coach and Skeleton Chariots: runtime component/list observations and
  human interpretations remain diagnostic. No representative entity or parent
  mapping is inferred; Skeleton Chariot parent mapping remains UNVERIFIED.

## Admission gates and preservation

The batch checks the committed review hash, pinned source hash (covering exact
candidate identities and original source hashes), complete review replay,
five-slug allowlist, exact diagnostic identities, compatible snapshot, static
provenance, omissions, unknown preservation, full-group withdrawal, app validator,
existing record equality and refusal of every unapproved collection collision.
The CLI checks diagnostic bytes before building or writing any output.

- Partial review SHA256 (canonical JSON): `dfec6a1bb671e3031cfaaf61786c6b78179ef53d022cde2e0fe3a87c573b49d0`
- Partial sources SHA256 (canonical JSON): `9f4dd0f3890d6d07804ff6e075e02c346178f316b0c5d388e0e82c4e935a2b65`
- Diagnostic SHA256 (unchanged bytes): `1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f`

Added minimal primary military catalog records: Vampire Coast, Tomb Kings and
Lizardmen. Existing Empire and Vampire Counts records are unchanged. Catalog
membership means neither a complete roster nor exclusive ownership, effective
campaign recruitment or lore.

Unit schema and personal backup v1 are unchanged. Personal article/bookmark/recent
targets remain `unit:<exact id>`; no migration or version bump is needed.

## Catalog and presentation

Unique total 20; non-sample Production 15; Sample 5; evidence 5; diagnostic-only 0.
The existing `unit` filter includes samples and production, so returns 20.
Each shared row has hasProduction=true, hasDiagnostic=true, isSample=false and
the badge Production · Evidence. Free Company and Black Coach each search once.

Detail order: production hero/stats, production details, short diagnostic summary,
collapsed diagnostic evidence, personal records. Runtime statuses retain
OBSERVED_RUNTIME, OBSERVED_ONCE, UNVERIFIED and INCONCLUSIVE as applicable.

## Reproduction

```
node scripts/review-partial-units.mjs --check
node scripts/promote-first-unit.mjs --check
node scripts/promote-partial-units.mjs --check
node scripts/promote-deferred-units.mjs --check
node scripts/promote-evidence-linked-units.mjs --check
npm test
npm run build
```

Stored context integration: set WH3_CONTEXT_MATERIALIZATION_DIR to
`generated/wh3/refresh-9.0.2/context-materialization/2026-10-01T10-25-28.824Z`
and run `node --test tools/wh3-importer/catalog-identity/materialize.integration.test.mjs`.
Runtime/CCO regression uses WH3_RUNTIME_BUNDLE_DIR
`generated/wh3/runtime-evidence/evening-9.0.2` and WH3_CCO_BUNDLE_DIR
`generated/wh3/runtime-evidence/cco-p0-9.0.2` with their respective integration tests.
These commands replay stored evidence and never launch the game.

Validation on 2026-10-02: 272/272 app/importer tests, build, all five replay
checks, stored context 7/7 and runtime/CCO 9/9 passed. Browser checked /units,
all five shared details, Ratling Guns and the zombie sample at desktop and
375px viewport widths. Shared evidence stayed collapsed by default, retained
its observation statuses when expanded, and produced no horizontal overflow.
Free Company/Black Coach searches each returned one row; evidence returned five,
diagnostic-only zero. Bookmark/article persistence after reload was verified.
The legacy diagnostic target and backup v1 continuity are covered by an isolated
IndexedDB fixture. No application confirmation or personal-storage behavior changed.
