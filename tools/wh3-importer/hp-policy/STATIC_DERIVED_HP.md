# Explicit three-unit static ULTRA HP admission

Scope: exactly three user-approved identities from the confident subset of
`hp-research/black-coach.json`. This is an explicit field admission, not a new
formula, a broader structural classifier or permission for other units.

| Production subject | Exact main and land key | Profile / runtime anchor | Inputs and result |
| --- | --- | --- | --- |
| Spearmen (Shields) | `wh_main_emp_inf_spearmen_1` | MAN_ONLY / Swordsmen | `(61+8)*120 = 8280` |
| Battle Pilgrims | `wh_dlc07_brt_inf_battle_pilgrims_0` | MAN_ONLY / Swordsmen | `(61+8)*120 = 8280` |
| Blessed Field Trebuchets | `wh_dlc07_brt_art_blessed_field_trebuchet_0` | ARTILLERY / Field Trebuchets | `(45+8)*44+(45+500)*4 = 4512` |

Both MAN_ONLY chains have `man_entity` =
`wh_main_infantry_standard_blood_dismembers`, HP 8, no mount/engine/articulation,
and ULTRA logical count 120. Blessed's man is
`wh2_dlc16_infantry_standard_crew_blood_dismembers`, HP 8; its exact engine record
is `wh_dlc07_brt_art_field_blessed_trebuchet`, which joins to battle entity
`wh_main_brt_art_trebuchet`, HP 500. The intermediary engine record differs from
Field Trebuchets; the existing researched profile deliberately compares exact
HP endpoint keys, values, processed join paths and structural flags instead.
Both artillery profiles have Generic_3_Crew, empty attachment points, no mount
or articulation, no extra joined HP roles, N=44, G=4 and ULTRA logical count 4.
G is a verified static multiplicity here, not a sum of runtime component lists.

All chains use game 9.0.2.0, static snapshot
`c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`.
`static-review.json` retains schema/pack hashes, row IDs, exact main/land,
field source paths, processed join provenance, component references and keys,
profile hashes, formula inputs, logical count and validation anchor references.
Spearmen reads the existing partial source; the other two read the existing
compact batch 02 with its original extraction SHA256. No raw evidence is copied.

`static-manifest.json` pins the latest research and original direct review,
approves only the three identities and pins their unchanged base Unit digests.
`static-derived.mjs` deterministically replays that research and exact source
traces with existing decoders, selectors, assessment and scoped calculations.
It requires all six confidence checks, equal validated profiles, no competing
numeric result, positive integer HP/count and no existing Production conflict.
Missing fields/joins, snapshot or identity drift, changed profiles or evidence,
extra identities and unsupported results fail closed. There is no fallback.

Derived admissions use `STATIC_DERIVED_HP`, `unitSize: ULTRA` and
`unitSizeSource: RUNTIME_VALIDATED_EXACT_PROFILE`. Anchor observations remain
`DIRECT_ULTRA_RUNTIME` / `DECLARED_SETUP`; the derived Unit has no claimed raw
runtime observation. Research itself still marks its results non-admissible;
only the separate explicit approvals authorize these three projections.

Replay, without game/generated inputs:

```powershell
node tools/wh3-importer/hp-policy/static-derived.mjs --check
node scripts/promote-ultra-hp.mjs --check
```

The promotion command checks both reviews before writing or checking the merged
HP overlay and sidecar. Existing historical promotion gates strip only pinned
admitted HP fields, validate their original static outputs and restore the HP.
Production remains 101, Sample remains 5, direct runtime HP remains 10.
Populated HP: 10 → 13; missing: 91 → 88. Removing only these three HP fields
restores the preceding file byte SHA256
`3b3b2d84c55db5ff48be01a20fcf269eef0384e6a9eeb83ca571b7ed37b3818a`.
Every non-HP value, ID, order and Sample byte therefore remains unchanged.
The original direct policy/review/raw captures, MEDIUM evidence, probe, schema,
speed, missile, UI and research reports remain unchanged. The research byte guard
is updated only for the authorized data/sidecar/overlay changes.

Validation: tests 340/340, build PASS, 13 existing/new promotion/source/research
replays PASS, stored context/runtime/CCO 16/16 PASS. The 51 historical capture
files remain byte-identical; 5,200 events and 316 observations replay with exact
equality. A source-only snapshot without generated or local evidence passes
both HP replays and 339 tests; one optional local display test is skipped.

Changed files:

- `README.md`
- `scripts/promote-ultra-hp.mjs`
- `src/data/units.json`, `src/data/unitHpAdmissions.json`
- `tools/wh3-importer/hp-policy/static-derived.mjs`
- `tools/wh3-importer/hp-policy/static-manifest.json`
- `tools/wh3-importer/hp-policy/static-review.json`
- `tools/wh3-importer/hp-policy/overlay.cjs`
- `tools/wh3-importer/hp-policy/HP_POLICY.md`, `STATIC_DERIVED_HP.md`
- `tools/wh3-importer/hp-research/baseline.json`
- `tests/wh3-static-hp.test.cjs`
- `tests/wh3-hp-policy.test.cjs`, `tests/wh3-hp-research.test.cjs`
- `tests/wh3-hp-followup.test.cjs`, `tests/wh3-black-coach-hp.test.cjs`
