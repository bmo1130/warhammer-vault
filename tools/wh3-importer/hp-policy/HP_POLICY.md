# ULTRA HP admission

## Existing source chain (inspection before implementation)

The conservative static normalizer follows processed-schema main_units.land_unit
to land_units, then man_entity, mount.entity, and engine.battle_entity. Its shared
fact selectors retain row ID/key, pack/path, schema version and verified joins.
Observations retain main.num_men, land.bonus_hit_points, man/mount/engine.hit_points
and raw engine counts. Normalization retains these facts but omits totalHealth,
healthPerEntity, count and unitScale. No reviewed static formula establishes
which HP inputs form combat-entity HP or which count means ULTRA entities.

| Exact static subject | num_men | bonus_hit_points | man HP | mount HP | engine HP | Observed combat entities / total HP |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Swordsmen | 120 | 61 | 8 | absent | absent | 120 / 8,280 (original log) |
| Mounted Yeomen | 60 | 76 | 8 | 8 | absent | 60 / 5,520 (original log) |
| Dragon Ogres | 16 | 608 | 8 | absent | absent | 16 / 9,856 (original log) |
| Dread Saurian | 12 | 14,984 | 8 | 8 | absent | 1 / 15,088 (original log) |
| Skeleton Chariots | 24 | 538 | 8 | 8 | 8 | 12 / 7,032 (original log) |

These named raw fields are provenance inputs, not individually proven final HP
terms. In particular Dread Saurian num_men=12 and chariot num_men=24 do not mean
their runtime combat-entity counts (1 and 12). Numerical agreement in the simple
units does not authorize a general static formula.

Consequently this change authorizes no static derivation. The existing static
normalizer, its omission records and all historical review hashes stay intact.

## Scoped policy

HP uses NumEntitiesInitial as its combat-entity basis, never sums or selects
ManList/MountList/EngineList/EntityList cardinalities as a multiplier. The supplied
five observations validate this meaning; they do not establish a static DB
formula. HealthMax / NumEntitiesInitial is an explanatory observed ratio, not
an independently sourced Production healthPerEntity field.

Direct runtime HP requires a completed, clean parsed capture, exact schema-backed
main/land identity, matching game/schema/pack snapshot, ULTRA on every record and
DECLARED_SETUP on every record. HealthMax and NumEntitiesInitial must be positive
integer VALUE cells. Identity drift, missing cells, malformed/conflicting input,
size mismatch and conflicting HP/count observations withhold admission. Multiple
eligible captures must agree; there is no preferred run or automatic correction.
MEDIUM observations remain separate historical evidence and are never scaled.

Static derivation remains withheld until separately proven combat-entity HP and
ULTRA count semantics exist in the exact static source chain. Matching a few
numbers or field names does not prove those semantics.

Only explicit manifest approvals may set entities.totalHealth. The deterministic
review records DIRECT_ULTRA_RUNTIME versus withheld STATIC_DERIVATION. No count,
healthPerEntity, speed, missile or other field is written. Admission pins each
unchanged static Unit digest; static replay removes only the exact approved HP
overlay and restores it after the original unchanged static gates succeed.

## Available evidence

The two original Desktop logs and three subsequently supplied raw logs from
`generated/wh3/runtime-evidence/manual-ultra-hp/ultra_hp_raw_logs_3` are copied
byte-for-byte into inputs with original paths, file names, SHA256 and event/line
references. Logs are treated as bytes by Git. Existing MEDIUM files and installed
probe are read only. The original USER_REPORTED semantic fixtures stay separate;
all five admissions now use actual raw captures, never those fixtures.

Replay: `node scripts/promote-ultra-hp.mjs --check`. No game, RPFM, ignored bundle
or newly measured evidence is required. `--write` applies only the approved HP
fields after source/review equality checks. Historical promotion replay commands
still verify their original static outputs and preserve the exact HP overlay.

## Result and verification

- Production 101 / Sample 5 unchanged in number, IDs and order.
- Five admitted totals: Swordsmen 8280, Mounted Yeomen 5520, Dragon Ogres 9856,
  Dread Saurian 15088, Skeleton Chariots 7032. Three new HP fields are the only
  differences from the preceding two-HP Production file. Removing just those
  fields restores byte SHA256
  `077fc0ca25e6926817ed57d5e7e9e0c37ea1abbef31ec5b38c8445b2e1eb5bfa`.
  Removing all five approved HP fields restores the original static baseline hash
  `c6f5d9aa1eb13e8b011d618781691f2627904b5da73657bd50869f6862f3e244`.
- 96 Production HP values remain absent: no eligible direct ULTRA captures and
  no proven static combat-entity HP/count formula.
- The app uses the small unitHpAdmissions.json projection solely to verify the
  approved field differences against the unchanged shared identity record.
  Diagnostic/shared identity JSON, all old source/reviews, MEDIUM evidence,
  factions, Unit schema, speed and missile policies are unchanged.
- Initial two-capture implementation: full tests 308/308; HP tests 7/7; build PASS. All six historical Production
  admission replays and the HP review/admission/projection replay PASS.
- Actual RPFM static integration 6/6; stored context/runtime/CCO 16/16.
  Historical capture replay retained exact comparison/runtime/validation/proposal
  outputs (5,200 events, 51 captures, 316 observations); original 51 files stayed
  byte-identical. No original evidence was regenerated or written.
- Initial two-capture clean source snapshot without .local or generated: all admission/review replay
  checks PASS; tests 307 PASS / 1 optional local display-projection test skipped;
  build PASS with `--configLoader runner` (the shared dependency junction prevents
  Vite's default temporary-config write in the sandbox; output bundle identical).
  Only installed npm dependencies were shared, not game/staging evidence.
- The initial HP commit included the previously completed explicit Unit Size
  installer/probe/ingest changes as the prerequisite for size-bound evidence.
  No game executable was launched and no new runtime measurements were requested.

## Files in the initial HP commit

- `.gitattributes`
- `README.md`
- `scripts/promote-deferred-units.mjs`
- `scripts/promote-evidence-linked-units.mjs`
- `scripts/promote-expansion-batch-01.mjs`
- `scripts/promote-first-unit.mjs`
- `scripts/promote-partial-units.mjs`
- `scripts/promote-production-growth.mjs`
- `scripts/promote-ultra-hp.mjs`
- `src/data/unitHpAdmissions.json`
- `src/data/units.json`
- `src/repositories/unitSharedIdentity.ts`
- `tests/deferred-promotion.test.cjs`
- `tests/evidence-linked-promotion.test.cjs`
- `tests/expansion-compact.test.cjs`
- `tests/expansion-promotion.test.cjs`
- `tests/partial-promotion.test.cjs`
- `tests/production-growth.test.cjs`
- `tests/production-promotion.test.cjs`
- `tests/wh3-cco-probe.test.cjs`
- `tests/wh3-hp-policy.test.cjs`
- `tools/wh3-importer/CCO-RUNTIME-PROBE.md`
- `tools/wh3-importer/hp-policy/HP_POLICY.md`
- `tools/wh3-importer/hp-policy/inputs/dread-saurian-ultra.log`
- `tools/wh3-importer/hp-policy/inputs/skeleton-chariots-ultra.log`
- `tools/wh3-importer/hp-policy/manifest.json`
- `tools/wh3-importer/hp-policy/overlay.cjs`
- `tools/wh3-importer/hp-policy/policy.mjs`
- `tools/wh3-importer/hp-policy/review.json`
- `tools/wh3-importer/hp-policy/semantic-fixtures.json`
- `tools/wh3-importer/runtime-evidence/cco-probe/batch.mjs`
- `tools/wh3-importer/runtime-evidence/cco-probe/candidates.mjs`
- `tools/wh3-importer/runtime-evidence/cco-probe/cli.mjs`
- `tools/wh3-importer/runtime-evidence/cco-probe/exec_battle.lua`
- `tools/wh3-importer/runtime-evidence/cco-probe/ingest.mjs`
- `tools/wh3-importer/runtime-evidence/cco-probe/install.ps1`
- `tools/wh3-importer/runtime-evidence/cco-probe/jobs.mjs`
