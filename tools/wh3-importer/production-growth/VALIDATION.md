# Conservative production growth — WH3 9.0.2.0

Baseline: `f5214b8e25d2e34e64e6cc3dbf5dccfa71eaaf0f`. Reviewed 2026-10-02.

Production **29 → 101**, Sample **5 → 5**, unique catalog **34 → 106**.
Shared diagnostic evidence remains 5; diagnostic-only remains 0.
Three bounded catalogs of 24 exact English localisation names each produced 72
unique main/land roots with one verified primary affiliation alias. All 72
source results are PARTIAL; each has an explicit core admission with omissions.
No new candidate is BLOCKED. Batch 01's 10 blocked discoveries remain blocked.
PARTIAL describes unresolved fields, rather than permission to admit those fields.

## Selection and admission quality

The local static main/land/permission/localisation inventory supplied names;
catalogs contain only slug, exact display name and expected existing faction.
CA keys, cost policies and fallback names are not discovery inputs. Each batch
has its own bounded extraction/review; explicit main/land/result SHA256 allowlists
were recorded after discovery. No renown-name substitution,
ambiguous-name selection, faction registry expansion or new mapping was used.
Uncertain identities and complex chariots/attachments were not pursued to reach
the count. Existing blocked subjects were not resolved.

| Existing faction | New core admissions |
| --- | ---: |
| Bretonnia | 15 |
| Empire | 9 |
| Skaven | 19 |
| Tomb Kings | 5 |
| Lizardmen | 13 |
| Vampire Counts | 2 |
| Vampire Coast | 6 |
| Warriors of Chaos | 3 |

Existing CA category values: Melee Infantry 29, Missile Infantry 26,
Cavalry 11, Siege Engine 6. These are the current normalizer's source
classification, including monster records classified under infantry in CA DB;
no alternative presentation taxonomy was inferred.

- All 72 new units omit count, HP, unitScale and displayed/ground/charge speed.
  All 101 Production units currently omit HP and displayed speed. No Medium
  runtime value, entity multiplier or Ultra conversion is admitted.
- A unique schema-connected MAN contributes only already supported direct
  entity fields. Mounted/engine/articulated records retain an empty entities
  group; no representative entity or physical composition is chosen.
- 16 units admit existing direct static missile fields. The existing bounded
  missile graph/contract must report COMPLETE_STATIC_SINGLE / singleBlockSafe;
  every weapon's precursor and secondary-pool/UI flags must be false, and
  secondary ammo must be zero with infinite secondary ammo false. Range,
  projectile/weapon/reload base fields keep their row/field provenance; ammo,
  reload formulas and DPS remain omitted. Four of six artillery records retain
  missile fields. No activation or Free Company precedence is generalized.
- 18 units retain STRUCTURE_KNOWN_RUNTIME_UNRESOLVED missile graphs, with the
  entire missile group withheld: Hochland Long Rifles, Nuln Ironsides;
  Gutter Runners, Gutter Runners (Poison), Night Runners, Night Runners (Slings),
  Gutter Runner Slingers, Gutter Runner Slingers (Poison), Poisoned Wind
  Globadiers, Death Globe Bombardiers, Poisoned Wind Mortars, Warpfire Throwers,
  Skeleton Archers, Screaming Skull Catapults; Skink Cohort (Javelins),
  Chameleon Skinks, Skink Skirmishers, Carronades. Their safe core is admitted.
  The other 38 report NO_MISSILE_PATH within the bounded inspection, without a
  claim that runtime shooting is impossible.
- 227 candidate-scoped unknown ID entries retain exact raw IDs and source
  pointers. Incomplete ability/passive/attribute groups are withheld in full;
  mapped fragments are not presented as a complete group.

Each batch's `EXPANSION_BATCH.md` lists exact identities, admitted field paths,
unknown IDs, omitted paths, graph status and original result byte SHA256.

## Replay contract and hash chain

The existing [compact format](../expansion-batch-01/COMPACT_FORMAT.md) is reused:
row/schema/relationship/provenance dictionaries and reason vocabulary, with
lossless deterministic references. No compression algorithm, binary storage,
numeric dictionary or new evidence framework was added. Format identifiers
retain their original expansion-01 names because the format is shared unchanged.
Batch identity is explicit in catalogs, source pointers and pinned allowlists.

`actual CA extraction result bytes → compact source → deterministic review →
explicit admission → production equality` remains the only promotion path.
Every original result byte SHA256 is preserved in source preflight/candidate
and admission pointers. Staging projection verifies those bytes against the
committed source; source rows, schemas and joins remain committed so replay
needs no packs. Compact and expanded source hashes, compact/expanded review
hashes and each production projection hash are verified deterministically.
`production-growth/admissions.json` pins the three source/review hashes and 72
exact main/land/result identities; its value hash is pinned in `batch.mjs`.
Admission writes no unreviewed identity and rejects changed source, schema,
unknown IDs, review, snapshot, catalog, collisions and existing values/order.

Only small parameters were added to the existing expansion projection/review
for catalog, batch name, pinned hash and the existing missile contract. A
projection bug exposed by actual missile junctions was corrected: machine-local
sourcePackPath is removed consistently before dictionary deduplication, just
as in other traces. Conflicting row envelopes still fail closed. No DB payload,
schema or source hash is substituted; batch 01 artifact hashes remain unchanged.
Scoped review pointers now use the candidate's source index, preserving exact
references even for a smaller explicit allowlist. Existing full reviews are
unchanged. `.gitattributes` fixes audited artifact/data line endings to UTF-8/LF
so Windows core.autocrlf=true cannot invalidate serialized byte checks; it
changes no existing payload or hash.

New output order is batch name then explicit slug. Request batch order does not
affect output; existing records must be an exact prefix and cannot be reordered.
Repeated source projection, review and admission reproduce identical bytes;
repeat promotion adds zero. Full verbose review stays ignored and is optional.

```powershell
# Clean checkout: no game, RPFM, .local or generated evidence required
node scripts/review-production-growth.mjs --check
node scripts/promote-production-growth.mjs --check
node scripts/promote-first-unit.mjs --check
node scripts/promote-partial-units.mjs --check
node scripts/promote-deferred-units.mjs --check
node scripts/promote-evidence-linked-units.mjs --check
node scripts/review-expansion-batch-01.mjs --check
node scripts/promote-expansion-batch-01.mjs --check
npm test
npm run build

# Optional development views; never production dependencies
node scripts/review-production-growth.mjs --verbose

# Local installed RPFM + reviewed static packs; run batches sequentially
node scripts/extract-production-growth.mjs expansion-batch-02
node scripts/project-production-growth.mjs expansion-batch-02 --check
# Repeat extraction/projection for expansion-batch-03 and expansion-batch-04
$env:WH3_RUN_INTEGRATION='1'
node --test tools/wh3-importer/production-growth/static.integration.test.mjs
node --test tools/wh3-importer/expansion-batch-01/static.integration.test.mjs
```

Re-extraction is a development operation; a changed original byte hash requires
review, rather than automatic regeneration of the pinned allowlist. Full raw
results and local inventory remain ignored under `generated/wh3/`.

## Existing records and validation

The first 34 records reproduce all original 29 Production and 5 Sample values,
IDs, ordering and standalone serialized bytes exactly. The baseline file-byte
SHA256 remains `289f36b0f3df093eaf200fbe8397f8429bdd2a6d3b497847e02a9ac9e8dba416`.
The full units file changes only by appending 72 records. Factions, diagnostic
artifact, shared identity, historical sources/reviews, runtime/CCO and precedence
are unchanged; the existing preserved-file byte gates continue to pass.

- `npm test`: **295/295 PASS**; six focused growth regressions added.
- `npm run build`: PASS. Vite reports a 572.14 kB JS chunk (125.25 kB gzip)
  and its informational >500 kB chunk warning; no build error.
- Five historical production replays, batch 01 review/projection, three new
  staging projections and new review/admission byte checks: PASS.
- Actual installed RPFM/static packs: new growth **3/3 PASS** (all 72 discovery,
  trace, missile, field/unknown/omission comparisons); old batch 01 **3/3 PASS**.
  No game executable or runtime probe was run.
- Stored context **7/7 PASS**, runtime/CCO **9/9 PASS**, using existing saved
  inputs. Their contracts and artifacts were not changed.
- Clean snapshot of repository files, without generated evidence or local
  game/RPFM configuration: all production/review replays PASS, build PASS,
  tests **294 PASS / 1 SKIP / 0 FAIL**. The skip is the pre-existing optional
  diagnostic comparison against local original generated artifacts. Dependencies
  were shared through a node_modules junction; replay data came from the snapshot.
  A second snapshot exported directly from the final Git index with
  core.autocrlf=true also passed the same replays, build and 294/1 test result,
  verifying committed file contents and the LF byte contract on Windows.
- Browser smoke on a separate localhost origin: `/units` shows 106 entries;
  Men-at-Arms, Peasant Bowmen, Knights Errant, Feral Bastiladon, Field Trebuchets,
  Black Coach and Sample Zombies render successfully. Missing HP/speed display
  as 미입력; static missile fields and base-value disclaimers remain intact.
  Black Coach's expanded evidence still separates MEDIUM runtime HP 5980 from
  empty production HP and does not sum overlapping context views. No browser
  console errors/warnings; no article/bookmark/backup writes or deletions.

## Artifact measurements

UTF-8 file bytes and newline counts, without minifying or changing compact
format. Shared dictionaries remain batch-local as before.

| Candidates | Source bytes / lines | Review bytes / lines | Combined bytes / lines |
| --- | ---: | ---: | ---: |
| batch 02: 24 | 1,713,231 / 27,215 | 193,551 / 5,856 | 1,906,782 / 33,071 |
| batch 03: 24 | 2,432,473 / 39,008 | 211,674 / 6,437 | 2,644,147 / 45,445 |
| batch 04: 24 | 2,340,533 / 34,609 | 204,410 / 6,233 | 2,544,943 / 40,842 |
| New total: 72 | **6,486,237 / 100,832** | **609,635 / 18,526** | **7,095,872 / 119,358** |
| Historical batch 01: 24 | 1,411,340 / 18,602 | 115,284 / 3,494 | 1,526,624 / 22,096 |
| All four: 96 | 7,897,577 / 119,434 | 724,919 / 22,020 | 8,622,496 / 141,454 |

The previous batch-01 estimate for 72 candidates was ~4.58 MB; the observed
7.10 MB is ~55% larger. This sample also retains bounded missile graphs for
every candidate and more traced projectile/entity/ability relationships.
Nothing was deleted to meet a size target. Linear extrapolation of this new
sample (decimal MB, source + review only) is **100 ≈ 9.86 MB, 500 ≈ 49.28 MB,
1000 ≈ 98.55 MB**. Shared-schema batch overhead and different candidate graphs
make this approximate. It is practical for the current expansion; storage is
measured rather than redesigned. Admission, Markdown and app data are additional
small files and are excluded from this like-for-like source/review estimate.

Schema/UI/runtime architecture changes: none. Remaining manual work: **NONE**.
ARCHITECTURAL FOLLOW-UP: **NONE**.
