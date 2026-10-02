import hpOverlay from '../tools/wh3-importer/hp-policy/overlay.cjs';
import { readFile, writeFile } from 'node:fs/promises';
import { buildFirstProductionBatch } from '../tools/wh3-importer/promotion/first-batch.mjs';
import { loadUnitValidator } from '../tools/wh3-importer/normalization/validation.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--write'].includes(args[0])) throw new Error('Use --check (read-only replay) or --write (apply the one reviewed static production Unit). No discovery or game access.');
const root = new URL('../', import.meta.url);
const paths = ['src/data/units.json', 'src/data/factions.json'];
const originals = await Promise.all(paths.map(path => readFile(new URL(path, root), 'utf8')));
const [currentUnits, factions] = originals.map(JSON.parse);
const units = hpOverlay.staticProductionView(currentUnits);
const evidence = JSON.parse(await readFile(new URL('tools/wh3-importer/promotion/dragon-ogres.source.json', root), 'utf8'));
const diagnostics = JSON.parse(await readFile(new URL('src/data/unitDiagnostics.json', root), 'utf8'));
const validate = await loadUnitValidator();
const batch = buildFirstProductionBatch({ evidence, units, factions, diagnosticIds: diagnostics.entries.map(entry => entry.id), validate });
const outputs = [hpOverlay.applyProductionHP(batch.units), batch.factions].map(value => JSON.stringify(value, null, 2) + '\n');
if (args[0] === '--write') {
  try { for (let index = 0; index < paths.length; index++) if (outputs[index] !== originals[index]) await writeFile(new URL(paths[index], root), outputs[index]); }
  catch (error) { for (let index = 0; index < paths.length; index++) await writeFile(new URL(paths[index], root), originals[index]); throw error; }
} else {
  if (batch.added.units || batch.added.factions) throw new Error('Reviewed batch replay passed, but production files do not contain it yet. Use --write to apply.');
}
console.log(JSON.stringify({ mode: args[0], id: batch.unit.id, gameVersion: batch.unit.gameVersion,
  directFields: batch.normalized.provenance.fields.filter(field => field.kind === 'DIRECT').length,
  omitted: batch.normalized.omitted.length, unmapped: batch.normalized.unmapped.length, added: batch.added }, null, 2));
