import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getProfile } from './profiles.mjs';
import { normalizeUnit } from './normalization/normalizer.mjs';
import { normalizationTargets } from './normalization/catalog.mjs';
import { loadUnitValidator } from './normalization/validation.mjs';
import { renderNormalizationSummary } from './normalization/report.mjs';

try {
  const argv = process.argv.slice(2), profile = getProfile(argv.shift());
  const flags = {};
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index], value = argv[++index];
    if (!['--raw-dir', '--identity-evidence'].includes(flag) || !value || value.startsWith('--')) throw new Error('Supported flags: --raw-dir DIR, --identity-evidence FILE.');
    flags[flag] = value;
  }
  const rawDir = path.resolve(flags['--raw-dir'] ?? fileURLToPath(new URL('../../generated/wh3/', import.meta.url)));
  const outputDir = path.join(rawDir, 'normalized');
  const sourceDir = fileURLToPath(new URL('../../src/', import.meta.url));
  const sourceRelative = path.relative(sourceDir, outputDir);
  if (!sourceRelative.startsWith('..') && !path.isAbsolute(sourceRelative)) throw new Error('Normalization artifacts must not be written under production src/.');
  const dump = JSON.parse(await readFile(path.join(rawDir, `${profile.slug}.raw.json`), 'utf8'));
  if (dump.sourceKind !== 'ca-pack' || dump.discovery?.profile !== profile.slug) throw new Error('CLI requires the selected actual CA artifact; no fixture/manual fallback.');
  const permissionTrace = JSON.parse(await readFile(flags['--identity-evidence'] ?? path.join(rawDir, 'research', 'normalization-identity.json'), 'utf8'));
  const result = normalizeUnit(dump, { ...normalizationTargets[profile.slug], permissionTrace });
  const validateUnits = await loadUnitValidator();
  const validation = validateUnits([result.unit], Object.values(normalizationTargets).map((target) => target.factionId));
  if (validation.length) throw new Error(`Normalized unit failed validateUnits: ${JSON.stringify(validation)}`);
  // Comparison is deliberately downstream of the pure normalizer/validator.
  const manualFile = profile.slug === 'grail-knights' ? 'manual-reference.json' : `manual-references/${profile.slug}.json`;
  const manual = JSON.parse(await readFile(new URL(manualFile, import.meta.url), 'utf8'));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, `${profile.slug}.result.json`), JSON.stringify(result, null, 2) + '\n');
  await writeFile(path.join(outputDir, `${profile.slug}.summary.md`), renderNormalizationSummary(result, manual));
  console.log(`${profile.displayName}: ${result.provenance.fields.length} DIRECT mappings; ${result.omitted.length} omitted; ${result.unmapped.length} unmapped. Validation passed.\n${path.join(outputDir, `${profile.slug}.result.json`)}`);
} catch (error) { console.error(`WH3 normalization failed: ${error.message}`); process.exitCode = 1; }
