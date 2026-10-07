import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { prepareEvidenceView } from './evidence-view.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const archiveNames = spawnSync(process.execPath, ['scripts/promote-archive-localisation.mjs', '--check'], {cwd:root,stdio:'inherit'});
if (archiveNames.error) throw archiveNames.error;
if (archiveNames.status !== 0) process.exit(archiveNames.status ?? 1);
const entities = spawnSync(process.execPath, ['scripts/promote-unit-entities.mjs', '--check'], {cwd:root,stdio:'inherit'});
if (entities.error) throw entities.error;
if (entities.status !== 0) process.exit(entities.status ?? 1);
const passives = spawnSync(process.execPath, ['scripts/promote-unit-passives.mjs', '--check'], {cwd:root,stdio:'inherit'});
if (passives.error) throw passives.error;
if (passives.status !== 0) process.exit(passives.status ?? 1);
const attributes = spawnSync(process.execPath, ['scripts/promote-unit-attributes.mjs', '--check'], {cwd:root,stdio:'inherit'});
if (attributes.error) throw attributes.error;
if (attributes.status !== 0) process.exit(attributes.status ?? 1);
const localisation = spawnSync(process.execPath, ['scripts/promote-unit-localisation.mjs', '--check'], {cwd:root,stdio:'inherit'});
if (localisation.error) throw localisation.error;
if (localisation.status !== 0) process.exit(localisation.status ?? 1);
const roster = spawnSync(process.execPath, ['scripts/review-faction-rosters.mjs', '--check'], {cwd:root,stdio:'inherit'});
if (roster.error) throw roster.error;
if (roster.status !== 0) process.exit(roster.status ?? 1);
const require = createRequire(import.meta.url);
// Compile with the project's existing TypeScript dependency, then run Node's
// built-in tests. No framework, custom module loader, or runtime dependency.
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.test.json'], { cwd: root, stdio: 'inherit' });
if (compiled.error) throw compiled.error;
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
mkdirSync(new URL('../.test-build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.test-build/package.json', import.meta.url), '{"type":"commonjs"}\n');
const liveTests = new Set(['app.test.cjs', 'manual-calculator.test.cjs', 'unit-catalog.test.cjs',
  'unit-comparison.test.cjs', 'unit-diagnostics.test.cjs', 'unit-modifiers.test.cjs',
  'unit.test.cjs', 'wiki-workflow.test.cjs', 'ca-research.test.cjs', 'mobile-mvp.test.cjs']);
// Future tests must run in the current app, even if they are not in this list.
const historical = spawnSync('git', ['ls-tree', '-r', '--name-only', '93130d543cc927cdd69cb8b920dc3553538b69f0', '--', 'tests'], { cwd: root, encoding: 'utf8' });
if (historical.status !== 0) throw new Error('Historical test inventory unavailable; fetch full Git history.');
const historicalTests = new Set(historical.stdout.trim().split('\n'));
const files = readdirSync(new URL('../tests/', import.meta.url)).filter(file => file.endsWith('.test.cjs') && (liveTests.has(file) || !historicalTests.has(`tests/${file}`))).map(file => `tests/${file}`);
const tested = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
if (tested.error) throw tested.error;
if (tested.status !== 0) process.exit(tested.status ?? 1);
// Existing CLI tests compile a shared local validator. Run historical test
// files serially so fresh evidence views cannot race on that emitted file.
const evidenceRoot = prepareEvidenceView();
const historicalCompiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.test.json'], { cwd: evidenceRoot, stdio: 'inherit' });
if (historicalCompiled.error) throw historicalCompiled.error;
if (historicalCompiled.status !== 0) process.exit(historicalCompiled.status ?? 1);
mkdirSync(resolve(evidenceRoot, '.test-build'), { recursive: true });
writeFileSync(resolve(evidenceRoot, '.test-build/package.json'), '{"type":"commonjs"}\n');
const evidenceFiles = readdirSync(resolve(evidenceRoot, 'tests')).filter(file => file.endsWith('.test.cjs')).map(file => `tests/${file}`);
const evidence = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...evidenceFiles], { cwd: evidenceRoot, stdio: 'inherit' });
if (evidence.error) throw evidence.error;
process.exit(evidence.status ?? 1);
