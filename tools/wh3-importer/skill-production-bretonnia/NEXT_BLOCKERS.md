# Next blocker: multi-rank application semantics

Recommend **MULTI_RANK_UNKNOWN**, subject to engine/runtime proof of incremental vs replacement values and previous-rank deactivation. Risk is **HIGH**: choosing the wrong contract changes every selected-rank calculation. Static numeric rows and node ownership do not resolve it.

The deterministic full coverage counterfactual removes only that blocker and preserves the whole-Skill, owner, scope, selector, path and operation gates:

| Measure | Count |
| --- | ---: |
| Affected Skills / junctions | 80 / 546 |
| Newly reviewable complete Skills | 2 |
| Newly reviewable numeric junctions | 12 |
| Distinct effect keys among those junctions | 5 |
| Junctions inside complete Skill candidates | 10 |

Complete candidates are `wh2_dlc11_skill_brt_army_buff_low_born_militia` and `wh2_dlc11_skill_brt_army_buff_worshippers_of_the_grail`. Two additional weapon-strength junctions in `wh2_dlc11_skill_brt_army_buff_glorfinials_progeny` become interpretable, but its flat-charge operation still blocks whole-Skill admission. Exact junction IDs are in `coverage.json.nextBlocker.effectJunctionIds`.

Other single semantic-blocker removals produce zero complete Skills / zero already-mapped numeric junctions under the current policy. This is a conservative review opportunity, not a promised admission count; unproved paths/operations/targets remain closed. Character-self has more affected junctions (596), but removing self scope alone leaves the character domain, owner, rank or mapping blockers.

Partial admission is a separate policy exposure: three held Skills contain four DIRECT junctions. Opening those would require proving every independent-effect/omission condition and introducing reviewed UI/provenance behavior. The semantic-blocker ranking holds the whole-Skill policy fixed; it does not silently assume that broader policy change.

Next work should preserve the prior multi-rank artifact and add new exact evidence at rank 1, rank 2, rank 3 and deactivation. It must then pass a new reviewed gate and Calculator projection, including exact shared-owner lists and real overlapping targets. No rank accumulation or replacement rule is inferred in this commit.
