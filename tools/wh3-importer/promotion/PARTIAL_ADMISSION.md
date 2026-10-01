# Bounded admission after the PARTIAL review

2026-10-02, WH3 9.0.2.0. The complete [14-candidate field review](PARTIAL_REVIEW.md)
and `partial-review.json` separate source quality from production admission.
PARTIAL is not a whole-Unit veto. PROMOTABLE means the explicitly listed fields,
not a complete group/profile. No historical pilot/context eligibility is changed.

## Four approved additions

| Unit | Exact main / land (same key) | Primary catalog | Approved subset |
| --- | --- | --- | --- |
| Swordsmen | `wh_main_emp_inf_swordsmen` | `wh_main_group_empire` → `empire` | Direct core/costs, MAN-only size/mass/penetration, reviewed forest attribute |
| Spearmen (Shields) | `wh_main_emp_inf_spearmen_1` | `wh_main_group_empire` → `empire` | Same groups; two exact charge attribute labels |
| Doom-Flayers | `wh2_dlc12_skv_veh_doom_flayer_0` | `wh2_main_skv` → `skaven` | Direct core/weapon/costs, fear attribute; empty entities; passive group omitted |
| The Sternsmen (Grave Guard) | `wh_dlc04_vmp_inf_sternsmen_0` | `wh_main_group_vampire_counts` → `vampire_counts` | Direct core/costs, MAN-only properties; two attribute/three passive name aliases |

IDs use the existing lossless `ca_unit_<exact main>` namespace. Direct core
includes category/tier, armor, attack/defense/leadership/shield/charge, primary
melee base/AP/bonuses/interval/length and supported weapon splash fields.
Weapon splash is a source weapon property, not an inferred representative
entity or expected damage. Unsupported size tokens are omitted.

Every displayed count, scale, total/per-entity health, displayed speed,
resistance conversion, recruitment requirement/cap and unverified formula is
absent. Doom-Flayers MAN=8/ENGINE=8 stays raw, never Unit.entities.count=8.
No missile group is admitted in these four records. Valid source zeros and
false flags are preserved. Existing Dragon Ogres and Sample records are intact.

The scoped mappings retain exact CA membership, reachable localisation and
agreeing passive flags. They add names/IDs only, not phase effects. The base
`normalization/ids.mjs` and normalizer are unchanged. Swordsmen needs no mapping
in this 9.0.2 snapshot. Doom-Flayers retains both raw passive IDs in the review:
`wh2_dlc12_unit_passive_the_best_defence`, `wh2_main_unit_passive_scurry_away`.
Its entire optional passive group is withheld; unknown does not mean absent.

## Gate and remaining candidates

`partial-batch.mjs` admits only four explicit slugs from the pinned actual CA
source. `assertReviewedProductionResult` reuses the first batch's source/identity,
provenance, group/number/omission and app validation checks. The original first
batch stays pinned to Dragon Ogres with its zero-unmapped rule. Partial admission
may retain unknown IDs only with an exact reviewed unknown list and complete
omission of the affected optional groups; deleting any/all unknowns is rejected.
Duplicate IDs, differing existing records/factions and diagnostic collisions
remain fail-fast. No status filter/wildcard can admit the remaining candidates.

The two new faction records are minimal editorial catalog labels backed by
existing reviewed military permission aliases; they do not establish full
rosters, exclusive ownership, lore or effective recruitability. The existing
sample Vampire Counts faction remains unchanged.

Grail Knights, Mounted Yeomen, Pegasus Knights, Royal Altdorf Gryphites and Ratling
Guns are safe core candidates deferred to keep this applied batch bounded. The
other five core candidates overlap exact diagnostic IDs: Black Coach, Skeleton
Chariots, Necrofex, Dread Saurian and Free Company. Their evidence and catalog
entries stay intact pending an explicit shared production/diagnostic connection.
No name matching or fake alternate record is used.

Necrofex primary cannon fields are independently eligible. Unit-wide missile
storage is withheld because rider rifle paths coexist, not because body identity
is composite. Free Company override/Dread source activation remains INCONCLUSIVE.
No new composition schema is needed for any core subset; richer entity or missile
presentation is optional separate work. Doom-Flayers needs no new runtime for
this admitted core/melee/campaign subset. Physical grouping is still unverified.

## Reproduction and validation

```powershell
node scripts/review-partial-units.mjs --check
node scripts/promote-partial-units.mjs --check
node scripts/promote-first-unit.mjs --check
npm test
npm run build
```

The checked-in source projects all 14 actual saved traces and permission evidence,
retains their original file hashes, removes absolute pack paths and shares 35
identical processed schema definitions without changing their fields/references.
Tests replay against the saved original Units/omissions when available. The review
and admission checks work without a game or local ignored generated files.
Review JSON uses row/field provenance pointers into the pinned bundle; complete
processed joins are replayed there rather than duplicated in every review entry.
`--write` regenerates review artifacts or appends only the approved batch after
all gates pass; no overwrite, discovery, runtime ingestion or game access.

- Unit suite: **259 passed**, zero failures/skips; nine new partial review/gate,
  provenance, omission, mapping, rendering and personal backup tests.
- Production build: passed; all three review/admission replay commands passed.
- Saved context materialization: **7 passed**, existing 19 results unchanged.
- Saved runtime/CCO regression: **9 passed**; diagnostic projection byte hash
  unchanged, including UNVERIFIED/INCONCLUSIVE and scoped precedence.
- Browser on a separate localhost origin: 5 Production / 5 Sample / 5
  Diagnostic-only; Doom-Flayers stats and unknowns/source detail, bookmark/article
  save, Zombies Sample and Black Coach Production data unavailable checked.
- Unit/composition and personal/backup schemas unchanged. No game/new probe,
  automatic runtime promotion or BLOCKED review. No push.
