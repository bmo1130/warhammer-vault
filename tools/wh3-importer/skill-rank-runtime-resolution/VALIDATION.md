# Validation — 2026-10-05

- `node scripts/review-skill-rank-runtime-resolution.mjs`: PASS. All 498 baseline files unchanged; predictions replay; eight states NOT_OBSERVED; verdict E UNKNOWN.
- `node --test tests/skill-rank-runtime-resolution.test.cjs`: 27 / 27 PASS.
- `node scripts/verify-skill-production-bretonnia.mjs`: all 13 existing replay commands PASS, `npm test` 560 / 560 PASS (0 skipped), production build PASS.
- Vite retained its existing >500 kB chunk advisory; no build failure.
- Actual Lua collector executed with a mock CCO context graph in Fengari. Verified read-only identity/rank/stat capture and inaccessible-API failure.
- CLI prepare / bind / ingest tested with synthetic temporary files, exact raw-byte retention, output overwrite refusal and malformed-input quarantine.
- Windows PowerShell installer tested in a temporary fake game directory. Existing campaign script replacement requires the explicit backup switch; original bytes restore exactly; modified probe prevents removal; owned console marker is removed on uninstall. No real game files changed.
- No actual campaign capture, baseline save, learned rank observation, independent runtime repetition or live campaign CCO verification occurred. Synthetic tests are not runtime evidence.
- No new model/admission: application-level multi-rank removal/stacking regressions remain conditional on later runtime proof. Existing rank-1 Skills, Skill batch/full pipeline, Research/Manual engine, persistence/backup/comparison regressions continue to pass unchanged.

## Added files

All changes are additions. No historical artifact or application file changed.

- `scripts/review-skill-rank-runtime-resolution.mjs`
- `tests/skill-rank-runtime-resolution.test.cjs`
- `tools/wh3-importer/skill-rank-runtime-resolution/README.md`
- `tools/wh3-importer/skill-rank-runtime-resolution/VALIDATION.md`
- `tools/wh3-importer/skill-rank-runtime-resolution/api-contract.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/capability-audit.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/cli.mjs`
- `tools/wh3-importer/skill-rank-runtime-resolution/exec.lua`
- `tools/wh3-importer/skill-rank-runtime-resolution/experiment-setup.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/experiment.mjs`
- `tools/wh3-importer/skill-rank-runtime-resolution/install.ps1`
- `tools/wh3-importer/skill-rank-runtime-resolution/manifest.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/observation-status.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/predictions.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/resolution.json`
- `tools/wh3-importer/skill-rank-runtime-resolution/resolve.mjs`
- `tools/wh3-importer/skill-rank-runtime-resolution/review.mjs`
