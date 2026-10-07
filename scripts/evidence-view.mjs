import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, symlinkSync, existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const baseline = '93130d543cc927cdd69cb8b920dc3553538b69f0';
// Historical evidence reports pin the whole former app, including its CSS.
// Replay that app in isolation; verify all evidence/policies/current game data
// still match. Current UI/storage/engine tests run separately in the real tree.
const evolving = new Set(['README.md', '.gitignore', 'package.json', 'scripts/test.mjs', 'scripts/data-status.mjs',
  'index.html', 'vite.config.ts', 'tsconfig.test.json', 'src/main.tsx', 'src/style.css',
  'src/components/ArticleEditor.tsx', 'src/pages/NotesPage.tsx',
  'src/pages/UnitPage.tsx', 'src/pages/FactionPage.tsx', 'src/pages/LordPage.tsx',
  'src/pages/SettingsPage.tsx', 'src/pages/CalculatorPage.tsx']);
// Reviewed roster projections are checked in the live tree before replay.
for (const path of ['src/App.tsx','src/domain/types.ts','src/domain/unit.ts','src/domain/unitValidation.ts',
  'src/domain/unitLabels.ts','src/repositories/gameRepository.ts','src/repositories/unitSharedIdentity.ts','src/repositories/unitCatalogRepository.ts','src/components/UnitProductionDetails.tsx','src/repositories/unitDiagnosticRepository.ts','src/components/EntityRow.tsx','src/pages/FactionsPage.tsx','src/pages/HomePage.tsx',
  'src/components/SearchBox.tsx','src/pages/LordPage.tsx','src/pages/HeroPage.tsx',
  'src/data/units.json','src/data/factions.json','src/data/lords.json',
  'tools/wh3-importer/normalization/normalizer.mjs','tools/wh3-importer/promotion/first-batch.mjs',
  'tests/app.test.cjs','tests/unit-catalog.test.cjs','tests/unit-comparison.test.cjs','tests/wiki-workflow.test.cjs',
  'tests/unit-modifiers.test.cjs','tests/ca-research.test.cjs',
  'tests/manual-calculator.test.cjs','tests/unit-diagnostics.test.cjs']) evolving.add(path);
const normalized = (path, bytes) => /\.(?:mjs|cjs|mts|cts|ts|tsx|ps1|md|css|html|json|yml|svg|lua|gitattributes|gitignore)$/.test(path) ? bytes.toString().replace(/\r\n/g, '\n') : bytes;
export function prepareEvidenceView() {
  const archive = spawnSync('git', ['archive', baseline], { cwd: root, maxBuffer: 128 * 1024 * 1024 });
  if (archive.error) throw archive.error;
  assert.equal(archive.status, 0, 'Historical commit unavailable; fetch full Git history before replay.');
  mkdirSync(resolve(root, 'generated'), { recursive: true });
  const directory = mkdtempSync(resolve(root, 'generated/mobile-evidence-'));
  const unpack = spawnSync('tar', ['-xf', '-', '-C', directory], { input: archive.stdout });
  if (unpack.error) throw unpack.error;
  assert.equal(unpack.status, 0, unpack.stderr?.toString());
  const listing = spawnSync('git', ['ls-tree', '-r', '--name-only', baseline], { cwd: root, encoding: 'utf8' });
  assert.equal(listing.status, 0);
  let protectedCount = 0;
  for (const path of listing.stdout.trim().split('\n')) {
    if (evolving.has(path)) {
      writeFileSync(resolve(directory, path), normalized(path, readFileSync(resolve(directory, path))));
      continue;
    }
    assert.deepEqual(normalized(path, readFileSync(resolve(root, path))),
      normalized(path, readFileSync(resolve(directory, path))), `Unreviewed evidence/data/policy change: ${path}`);
    copyFileSync(resolve(root, path), resolve(directory, path));
    protectedCount++;
  }
  // Recent historical reports pin raw bytes, including Windows/mixed EOLs.
  // Recreate only line endings of the verified Git baseline, then require the
  // original manifest SHA. This also works on a clean Linux Pages runner.
  const manifest = JSON.parse(readFileSync(resolve(directory, 'tools/wh3-importer/skill-stance-preview-research/manifest.json')));
  const mixed = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/mobile-baseline-line-endings.json')));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const [path, expected] of Object.entries(manifest.files)) {
    const bytes = readFileSync(resolve(directory, path));
    if (sha(bytes) === expected) continue;
    const lf = bytes.toString().replace(/\r\n/g, '\n');
    let line = 0;
    const candidates = [Buffer.from(lf), Buffer.from(lf.replace(/\n/g, '\r\n'))];
    if (mixed[path]) candidates.push(Buffer.from(lf.replace(/\n/g, () => mixed[path].includes(line++) ? '\r\n' : '\n')));
    const exact = candidates.find(candidate => sha(candidate) === expected);
    assert(exact, `Cannot reproduce historical byte contract: ${path}`);
    writeFileSync(resolve(directory, path), exact);
  }
  symlinkSync(resolve(root, 'node_modules'), resolve(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  // Optional local extraction checks use existing ignored artifacts. This does
  // not generate new evidence or write to an installed game.
  for (const path of ['wh3']) if (existsSync(resolve(root, 'generated', path))) {
    mkdirSync(resolve(directory, 'generated'), { recursive: true });
    symlinkSync(resolve(root, 'generated', path), resolve(directory, 'generated', path), process.platform === 'win32' ? 'junction' : 'dir');
  }
  console.log(`Evidence view: ${baseline}; ${protectedCount} current baseline files unchanged; ${evolving.size} app/build/doc paths may evolve.`);
  return directory;
}
