import { spawnSync } from 'node:child_process';
import { prepareEvidenceView } from './evidence-view.mjs';
const speedRules = spawnSync(process.execPath, ['scripts/promote-unit-speed-rules.mjs', '--check'], {stdio:'inherit'});
if (speedRules.error) throw speedRules.error;
if (speedRules.status !== 0) process.exit(speedRules.status ?? 1);
const hpEntityRules = spawnSync(process.execPath, ['scripts/promote-unit-hp-entity-rules.mjs', '--check'], {stdio:'inherit'});
if (hpEntityRules.error) throw hpEntityRules.error;
if (hpEntityRules.status !== 0) process.exit(hpEntityRules.status ?? 1);
const archiveNames = spawnSync(process.execPath, ['scripts/promote-archive-localisation.mjs', '--check'], {stdio:'inherit'});
if (archiveNames.error) throw archiveNames.error;
if (archiveNames.status !== 0) process.exit(archiveNames.status ?? 1);
const entities = spawnSync(process.execPath, ['scripts/promote-unit-entities.mjs', '--check'], {stdio:'inherit'});
if (entities.error) throw entities.error;
if (entities.status !== 0) process.exit(entities.status ?? 1);
const passives = spawnSync(process.execPath, ['scripts/promote-unit-passives.mjs', '--check'], {stdio:'inherit'});
if (passives.error) throw passives.error;
if (passives.status !== 0) process.exit(passives.status ?? 1);
const attributes = spawnSync(process.execPath, ['scripts/promote-unit-attributes.mjs', '--check'], {stdio:'inherit'});
if (attributes.error) throw attributes.error;
if (attributes.status !== 0) process.exit(attributes.status ?? 1);
const localisation = spawnSync(process.execPath, ['scripts/promote-unit-localisation.mjs', '--check'], {stdio:'inherit'});
if (localisation.error) throw localisation.error;
if (localisation.status !== 0) process.exit(localisation.status ?? 1);
const roster = spawnSync(process.execPath, ['scripts/review-faction-rosters.mjs', '--check'], {stdio:'inherit'});
if (roster.error) throw roster.error;
if (roster.status !== 0) process.exit(roster.status ?? 1);
const cwd = prepareEvidenceView();
const commands = [
  ['scripts/review-production-growth.mjs', '--check'], ['scripts/promote-production-growth.mjs', '--check'],
  ['scripts/promote-ultra-hp.mjs', '--check'], ['scripts/promote-static-speed.mjs', '--check'],
  ['scripts/review-bretonnia-research.mjs', '--check'], ['scripts/classify-bretonnia-research.mjs'],
  ['scripts/scan-bretonnia-research.mjs'], ['scripts/review-research-mappings.mjs'],
  ['scripts/review-research-scopes.mjs'], ['scripts/admit-bretonnia-research.mjs'],
  ['scripts/review-skill-production-bretonnia.mjs'], ['scripts/review-skill-slice-01.mjs'],
  ['scripts/review-skill-batch-01.mjs'], ['scripts/review-skill-batch-02.mjs'],
  ['scripts/review-skill-rank-runtime-resolution.mjs'],
  ['tools/wh3-importer/skill-rank-runtime-parent-stats/replay.mjs'],
  ['tools/wh3-importer/skill-stance-preview-research/replay.mjs'],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) { process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
  console.log(`PASS node ${args.join(' ')}`);
}
console.log(`PASS live roster admission/projection and ${commands.length} historical replays; protected evidence and unrelated datasets unchanged.`);
