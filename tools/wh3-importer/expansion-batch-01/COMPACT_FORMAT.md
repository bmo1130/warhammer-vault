# Expansion evidence storage analysis and format

## Measurement before implementation

Baseline: `7dd54664d57e60ba5cc47feb63b44e2f808f1a72`. Measurements use UTF-8 bytes and newline counts, not Git added-line totals. `measure.mjs` inventories exact objects by property; the byte columns below use compact object encodings to measure structural repetition independently of whitespace. Nested categories overlap and must not be summed.

| Artifact | Bytes | Lines |
| --- | ---: | ---: |
| sources.json | 3,099,986 | 78,916 |
| review.json | 843,729 | 22,077 |
| Total | 3,943,715 | 100,993 |

| Source category | Occurrences | Unique exact objects | Occurrence bytes | Unique bytes |
| --- | ---: | ---: | ---: | ---: |
| DB/Loc/permission row envelopes | 1,560 | 1,178 | 924,923 | 708,368 |
| Row payloads | 1,560 | 1,124 | 476,197 | 307,321 |
| Relationships | 1,821 | 1,520 | 470,853 | 388,937 |
| Skipped references | 1,108 | 716 | 227,996 | 145,761 |
| Provenance | 37 | 2 | 34,021 | 1,865 |
| Schema definitions | 31 | 31 | 40,883 | 40,883 |

There are 1,178 unique row IDs and no conflicting same-ID envelopes. Some discovery and full-trace rows have different IDs even when their payloads coincide: preserve those IDs and envelope differences. Existing schemaRefs already eliminate candidate schema copies. Common table/pack/path/version metadata still repeats in every row, and relationship evidence/reason sentences repeat even in otherwise unique edges.

Old review inventory: 24 copied discovery summaries (156,010 bytes of compact objects), 545 source objects (411 unique), 378 field objects (330 unique), and 500 omissions (38 unique; 82,205 occurrence bytes versus 6,330 unique bytes). There are 32 withdrawals but only five distinct exact objects. These counts distinguish actual repeated content from the unique source proof that must stay committed.

Required committed evidence: every selected raw row and its ID/table/key/payload/schema/pack/path; localisation and military permissions; exact-name discovery including zero/multiple roots and conflicting primary aliases; relationship direction/fields/evidence; coverage, skipped and unresolved references; missile/entity evidence; unknown IDs; game/schema/pack hashes; original ignored extraction byte hashes and references. Timestamps and trace metadata are retained for lossless audit, although they do not drive admission.

Deterministically derived information: normalized field values/provenance, group statuses, raw-cardinality fact objects, omissions, withdrawals, production projection, and the verbose review's copied discovery summary. Admission needs exact identity, pinned source proof, explicit allowlist, primary affiliation, validated safe fields, unknown/full-group omission policy and collection equality. Coverage/skipped references and detailed raw evidence are audit/debug inputs retained in sources, not duplicated in review.

The old review copies all 24 discovery summaries except permissionTrace, then repeats normalized source field objects in groups and withdrawals, raw unknowns, omission objects and full production projections. Markdown repeats identities, admitted field paths and unknown IDs intentionally for human review; it does not need raw field objects or DB rows. Repeated omission sentences can be represented by content-derived stable reason IDs without merging distinct candidate-specific meanings.

## Chosen design

Use one expansion-only compact source codec, with dictionaries for row envelopes, shared row metadata, relationship/skipped-reference objects and repeated strings; one batch provenance block and the existing schema dictionary. Candidate traces keep ordered references. Dictionary keys are stable source row IDs or content hashes. Decode restores the exact previously reviewed source JSON value, including array and property order, and verifies its historical value hash. Same row ID with a differing envelope fails closed. No historical artifact reader or migration framework is introduced.

Review stores decisions and source pointers: candidate slug, statuses, admitted field paths, omission path/reason IDs, unknown IDs, withdrawals, blockers and a production projection hash. Raw provenance and values are reconstructed from sources. Keep compact review committed because it offers reviewable decision diffs and an independent pinned gate; generate verbose review on demand in ignored staging. Verify the reconstructed historical verbose review hash so production source strings and all 29 Production/5 Sample values remain byte-for-byte unchanged.

Record dictionaries may use one readable named record per line. This is a diff convention for normalized records, not whole-file minification. Report structural byte reduction separately from formatting.

## Implemented source v2

- `provenance`: single gameVersion/schema/RPFM/MCP/pack hash block. Trace provenance references it and retains its extractionSource difference.
- `schemas`: 31 processed schema definitions keyed by table/version. Ordered trace schemaRefs are checked against them.
- `rowMetadata`: 32 shared table/pack/path/version blocks, with a named default payload per row shape. Each default field is the most frequent exact JSON value among unique row IDs; ties use lexical JSON order, independent of locale.
- `rows`: 1,178 source row IDs, each storing metadata ID, ordered key field names and named payload deltas. Defaults plus deltas reconstruct all fields, including false/zero/empty values. Keys reconstruct from the full row. Different IDs remain separate even when payloads coincide; conflicting same-ID envelopes are rejected before interning.
- `edgeMetadata`: 96 shared relationship/skipped-reference metadata records. `relationships` holds 1,520 distinct edges and `skippedReferences` 716 distinct records. Ordered trace arrays reference them. Direction, evidence, target fields and reason text are preserved.
- `reasons`: 10 exact source evidence/reason strings with content-derived IDs. `data` retains the 24 catalog/preflight entries and 14 candidates with ordered trace references, coverage, timestamps, unknown raw IDs and original extraction SHA256s. Exact unit-set/recruitment row projections point to their source rows instead of copying payloads.

Dictionary IDs use original row IDs or truncated content hashes. Every interning operation checks equal payloads on a matching ID; no hash collision merges different evidence. Decoder checks row/schema references, duplicate trace row references, metadata/edge hashes, the full expanded source hash, and exact canonical re-encoding (including unused dictionary records). Definitions are local to this batch; the normalizer and existing historical evidence formats are unchanged.

Review v2 retains 14 candidate decisions and 24 discovery statuses/blockers with source pointers, group statuses, admitted field paths, unknown IDs with row/field pointers, withdrawal decisions and production projection hashes. Its 38 shared omission definitions retain field/kind/semanticsStatus/reason; 30 exact reason/note strings retain candidate-specific meanings. Human Markdown is rendered from the deterministic expanded review, so it displays exact IDs and readable omission language without duplicating raw row/provenance objects. Compact review remains committed for decision diffs and a pinned admission gate.

## Sizes and scalability

All figures use LF UTF-8 committed representation, excluding ignored verbose staging.

| Artifact | Old bytes | New bytes | Byte reduction | Old lines | New lines | Line reduction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sources.json | 3,099,986 | 1,411,340 | 54.47% | 78,916 | 18,602 | 76.43% |
| review.json | 843,729 | 115,284 | 86.34% | 22,077 | 3,494 | 84.17% |
| Total | 3,943,715 | 1,526,624 | **61.29%** | 100,993 | 22,096 | **78.12%** |

To isolate structural reduction from whitespace, encode both old and new values with the same `JSON.stringify` formatting. Old source/review total: 2,484,457 bytes; normalized total: 1,237,544 bytes, **50.19% structural reduction** (source 41.36%, review 84.68%). Even ordinary two-space pretty JSON for both new values totals approximately 1.77 MB. The final source record-per-line convention keeps named DB rows/metadata/edges individually diffable while the rest remains pretty JSON; review remains fully pretty JSON. The improvement is not a one-line JSON conversion or deletion of source proof.

Simple linear estimates use 1,526,624 bytes / 24 queried candidates (including blocked candidates). They assume similar evidence depth and admission ratio, without additional cross-candidate dedup gains:

| Candidates | Source + review growth | Including current admission + human summary ratio |
| --- | ---: | ---: |
| 100 | 6.36 MB | 6.60 MB |
| 500 | 31.80 MB | 32.99 MB |
| 1,000 | 63.61 MB | 65.97 MB |

These are uncompressed decimal MB, excluding fixed code/tests/validation/format docs and Git history. Current admission is 12,949 bytes and human summary 43,715 bytes. Hundreds to a thousand units are practical as bounded committed batches; shared schemas/metadata do not grow per candidate. Evidence-heavy missile/composite batches can exceed this ratio, and decoding recreates verbose objects in memory, so this storage estimate does not claim a performance benchmark or unlimited single-batch memory. Future batches should preserve the bounded review/admission boundaries rather than accumulate all units into one global artifact.

## Replay and hash chain

`original CA extraction result bytes → compact source → decoded historical source → deterministic expanded/compact review → explicit admission → exact production Unit`

Original ignored result SHA256s remain unchanged for all 24 preflights and 14 candidates. Source `expandedSha256` is the original portable source JSON-value SHA256 `e10f3727bf00af27f69a0a623247275db62f4137137f1f416baf39fd7754b4e1`; decoding verifies exact old array/property order and all values, not just an evidence summary. Compact source JSON-value SHA256: `6dbaadd32eaad3c908c5f690872ff21d52f7235b81ef23573f4b1d013c577799`.

Review records both source hashes and the recreated historical verbose review hash `2a1f6203c07bba010ae3cbe862dbd01c0eb1597ac04333f7281a2e7fe47919b0`. Compact review JSON-value SHA256: `95753b14285985e009380f9dbc1fdea312dd34cc80d7c8409d6df79e5935d7a0`, pinned independently in admission. Admission `storageProof` links both compact hashes while its historical source/review hashes stay unchanged. Existing production source strings remain valid because their exact historical evidence/review values are still regenerated and verified. All 34 Unit records retain exact values/order and file bytes.

No game files, RPFM, `.local` config or generated extraction/verbose artifacts are required for:

```sh
node scripts/review-expansion-batch-01.mjs --check
node scripts/promote-expansion-batch-01.mjs --check
node scripts/promote-first-unit.mjs --check
node scripts/review-partial-units.mjs --check
node scripts/promote-partial-units.mjs --check
node scripts/promote-deferred-units.mjs --check
node scripts/promote-evidence-linked-units.mjs --check
npm test
npm run build
```

Normal installed project dependencies are required for validation/build. Optional `node scripts/review-expansion-batch-01.mjs --verbose` recreates the full 843,729-byte historical review at `generated/wh3/expansion-batch-01/review.verbose.json`. `project-expansion-batch-01.mjs --check` verifies the original local staging byte-hash-to-compact projection. Actual static pack integration remains a separate explicit check; it reads RPFM packs and never executes the game.

An isolated source snapshot without `.local` or generated evidence passed all seven replay commands, `npm test` (288 pass, one pre-existing diagnostic test that requires local extraction skipped) and `npm run build`. The full working checkout passed 289/289, including that diagnostic check. Clean checkout success does not depend on recreating the ignored verbose review.
