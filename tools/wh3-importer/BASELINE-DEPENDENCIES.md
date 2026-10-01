# Representative pilot baseline dependency closure

This follow-up makes the code required by `8ada558cccf824a234f831ed945ed2c2dbe656c9`
available in the repository. It preserves the previously validated local pilot
implementation without redesign, additional coverage, root policies, aliases or
formulas. Full import remains deferred; no game process was launched.

**Code self-containment: YES.** A clean checkout contains the pilot, exports and
test dependencies. Actual CA execution still requires an installed game data
source, RPFM with the WH3 schema, npm dependencies and a generated pilot baseline.
Those are explicit environment/output prerequisites, not hidden local code.
The pilot creates the baseline itself; no historical ignored output needs copying.

## Cause and dependency audit

At the start, HEAD was `8ada558`, with an empty index and 17 existing changed or
untracked files. The companion had been committed separately to respect the prior
instruction to preserve those files. Its CLI dynamically imports `pilot.mjs` and
`pilot-analysis.mjs`, and requires `extract.mjs.openRawSource`. HEAD did not contain
those modules/export. Importing a local working copy therefore hid missing
repository dependencies. No history rewrite is needed to repair the closure.

The audit used static imports/re-exports, literal dynamic imports and requires,
export differences, npm entry points, the TypeScript declaration contract, and
actual CLI/test execution. It inspected 45 module paths from these entry points:

- `blocker-review/cli.mjs` and `pilot-cli.mjs`;
- pilot and blocker-review basic tests;
- existing live CA integration and blocker-review artifact integration tests;
- `tests/fixtures/normalization-contract.ts`.

The only nonliteral code require in that closure is the validator compiled by
`normalization/validation.mjs` from tracked `src/domain/unitValidation.ts` using
the locked TypeScript dependency. The compiler creates an ignored local output;
no pre-existing compiled helper is required. `npm test` similarly compiles its own
`.test-build` before discovering tracked test files.

```text
blocker-review/cli
  -> extract.openRawSource
  -> pilot.runPilot / summarize
       -> extract.openRawSource
       -> trace-unit.traceUnit
       -> pilot-catalog
       -> pilot-discovery -> trace-unit.discoverRoots / inspect
       -> pilot-analysis -> tracked normalization policy/IDs/observation context
       -> normalization.normalizer / validation
  -> pilot-analysis.coverageFor

package script -> pilot-cli -> extract.resolveOptions / pilot.runPilot
pilot tests -> pilot modules + existing tracked fixtures + compiled validator
CA integration -> existing core profiles + pilot subset + new provenance kinds
TypeScript contract -> normalizer.d.mts -> tracked Unit type
```

All fixture/profile/policy/observation/reader/MCP/hash/validator modules referenced
by this graph already existed in HEAD, except the six untracked code/test files
identified below. The existing tracked manual references used by core extraction
also remain available. No new fixtures, profiles, npm packages or lockfile change
is needed.

## Classification of every starting file

Paths below are repository-relative. REQUIRED_BASELINE includes execution code,
the established npm entry point and the existing tests/type contract required to
preserve the verified baseline. OPTIONAL_RELATED files are excluded from staging.
No starting file was classified UNRELATED_USER_CHANGE: all 17 diffs were WH3
related, but relatedness alone was not sufficient for inclusion.

| File | Classification | Reason |
| --- | --- | --- |
| `tools/wh3-importer/pilot.mjs` | REQUIRED_BASELINE | Direct CLI dependency; bounded 24-sample orchestration, persistence, validation and report aggregation. |
| `tools/wh3-importer/pilot-analysis.mjs` | REQUIRED_BASELINE | Direct CLI and pilot dependency; taxonomy, outcome classification and reviewed coverage. |
| `tools/wh3-importer/pilot-discovery.mjs` | REQUIRED_BASELINE | Indirect pilot dependency; generic roots/scopes and bounded missile probes. |
| `tools/wh3-importer/pilot-catalog.mjs` | REQUIRED_BASELINE | Indirect pilot/test dependency; exact representative catalog, existing pilot affiliation aliases and sample bounds. |
| `tools/wh3-importer/extract.mjs` | REQUIRED_BASELINE | Exposes the existing shared `openRawSource` session/reader/schema/localisation/provenance initialization required by both runners. |
| `tools/wh3-importer/trace-unit.mjs` | REQUIRED_BASELINE | Exposes existing `discoverRoots` logic used by pilot discovery while keeping legacy tracing/root-policy behavior. |
| `tools/wh3-importer/normalization/normalizer.mjs` | REQUIRED_BASELINE | Preserves baseline DIRECT/GENERATED/CURATED provenance. Omitting this change would reproduce the wrong report/test contract even if imports resolved. Unit values and omissions are unchanged. |
| `tools/wh3-importer/normalization/normalizer.d.mts` | REQUIRED_BASELINE | Keeps the tracked public result/type declaration consistent with the runtime GENERATED/CURATED values; this is a contract dependency rather than a JS import. |
| `tools/wh3-importer/pilot-cli.mjs` | REQUIRED_BASELINE | Established representative-pilot entry point that generates the ignored baseline required before review. |
| `package.json` | REQUIRED_BASELINE | Only the existing `pilot:wh3-units` script; required for the documented npm entry point. No dependency changes. |
| `tests/wh3-pilot.test.cjs` | REQUIRED_BASELINE | Existing 16 tests prove safety guards, outcomes, omissions, provenance, fault isolation and validation behavior; automatically run by tracked test discovery. |
| `tools/wh3-importer/integration.test.mjs` | REQUIRED_BASELINE | Preserves the five-test live CA contract. Core assertions recognize the baseline provenance kinds; added pilot subset verifies ambiguity, unknown missile evidence and reader reuse. |
| `README.md` | OPTIONAL_RELATED | Pilot introduction only; no execution dependency. |
| `tools/wh3-importer/README.md` | OPTIONAL_RELATED | Pilot documentation additions only, including duplicated paragraphs; excluded and preserved byte-for-byte. |
| `tools/wh3-importer/NORMALIZATION.md` | OPTIONAL_RELATED | Related narrative/provenance totals, including duplicated paragraphs; not required by execution. |
| `tools/wh3-importer/PILOT.md` | OPTIONAL_RELATED | Historical pilot report and examples; not imported/read by either runner. This document supplies the required clean-checkout instructions. |
| `tools/wh3-importer/normalize-cli.mjs` | OPTIONAL_RELATED | Standalone normalizer console formatting only; neither runner invokes it. |

The new document `BASELINE-DEPENDENCIES.md` is included to make the execution order,
audit and external prerequisites reviewable. All 17 original file contents and
SHA-256 hashes were preserved; 12 are now included in the baseline commit and the
five optional files remain outside it. The `8ada558` blocker-review implementation
and its historical report are unchanged. Its comments describe the original
companion commit boundary; this follow-up resolves that boundary.

## Clean-checkout execution order

Use a checkout containing both `8ada558` and this follow-up. Install the locked
npm dependencies, then run the self-contained fixture tests/build:

```powershell
npm ci
npm test
npm run build
# npm test creates .test-build needed by the pilot tests.
node --test tests/wh3-pilot.test.cjs tests/wh3-blocker-review.test.cjs
```

For actual CA execution, install RPFM with the official WH3 schema and start its
MCP server separately. This code reads CA packs, including executable version
metadata on Windows; it does not start the game. Set the game installation root
that contains `data/db.pack` and `data/local_en.pack`, and the RPFM endpoint:

```powershell
$env:WH3_GAME_PATH='<your installed WH3 directory>'
$env:RPFM_MCP_URL='http://127.0.0.1:45127/mcp'
# First create generated/wh3/pilot/ from this checkout.
npm run pilot:wh3-units
# Review imports the completed 24-sample CA baseline and checks source hashes.
node tools/wh3-importer/blocker-review/cli.mjs
# Five live CA integration tests; environment opts in, no fixture fallback.
npm run test:wh3-integration
# Use the exact completed review directory emitted by the CLI.
$env:WH3_BLOCKER_REVIEW_DIR='generated/wh3/blocker-review/<completed-run-id>'
node --test tools/wh3-importer/blocker-review/integration.test.mjs
```

Alternatively provide `--config <path>` to both CLIs and set
`WH3_INTEGRATION_CONFIG` to the same path for live integration. The ignored config
can contain `gamePath` and `rpfmUrl`; there is no requirement to copy a personal
config into the repository. Keep the default output location: the review requires
`generated/wh3/pilot/`, and the pilot refuses outputs outside its generated area.

Without game configuration, both CLIs correctly stop at the environment check.
Without the pilot artifacts, review cannot perform its baseline comparison.
Missing game/RPFM/schema/config/artifacts are not module-resolution failures and
must not be represented as successful actual integration. A changed game version,
schema hash or pack hash requires fresh matching evidence and policy review;
no gate was weakened by this closure repair.

## Validation on 2026-10-01 KST

An equivalent clean tree was created at
`tools/wh3-importer/.local/baseline-dependencies/clean-tree/` with
`git checkout-index --all --prefix=...`, exporting exactly the staged baseline
plus tracked HEAD files. No optional dirty file, ignored config, generated
baseline, compiled helper or parent `node_modules` was copied. All exported source
blobs were checked against the Git index with normal checkout line-ending filters.
The clean tree installed its own 73 npm packages with `npm ci --offline` from the
lockfile; TypeScript resolution was checked to point inside its own node_modules.
This is an index-tree export, not a claim that the dirty main checkout was clean.

| Validation in that tree | Result |
| --- | --- |
| Basic test suite | 92/92, no skips/failures |
| Focused pilot tests | 16/16 |
| Focused blocker-review unit tests | 14/14 |
| Live CA integration, including the three legacy profiles | 5/5, no skips/failures |
| Actual saved blocker-review integration | 4/4, no skips/failures |
| Production build | Passed |
| Module/export smoke | pilot/analysis modules, openRawSource, discoverRoots and review modules resolved |
| CLI startup without external config | Both reached expected missing-game-path validation, not missing modules/exports |
| Clean-tree representative 24-unit pilot | Completed: CLEAN 1 / PARTIAL 14 / BLOCKED 9 |
| Clean-tree existing blocker-review CLI | Completed: same outcomes; validation failures 0 |

Actual runs used the existing absolute config path outside the clean tree and the
already running local RPFM server. Game ProductVersion 9.0.1.0, RPFM 5.1.0 and
schema format 5 were retained. Game files were read only. The clean tree generated
its own pilot baseline and its own review directory
`generated/wh3/blocker-review/2026-10-01T00-53-04.261Z/`.

All 24 clean-tree sample statuses, normalized Unit values, omissions and unmapped
IDs, plus the complete pilot coverage, were compared with the preserved original
local pilot and matched. The complete review comparison matched the prior
verified `2026-09-30T22-39-13.235Z` review. Reviewed provenance remained
DIRECT 374 / GENERATED 15 / CURATED 52; identity ambiguity remained 9, validation
failures 0. No coverage or semantics improvement was claimed by committing the
dependency closure.

## Remaining dependencies and next step

No local-only executable source, fixture, profile or test helper is required.
The five optional working-tree files remain uncommitted. External npm packages,
installed CA packs, RPFM/schema and regenerated ignored artifacts are still
required in the documented order. This follow-up was not pushed.

The next step is to distribute/push this baseline follow-up when requested.
After checkout and environment setup, run pilot before review. Full import still
requires the previously documented catalog identity decisions, composite-role
representation and runtime verification; source reproducibility does not approve
those policies.
