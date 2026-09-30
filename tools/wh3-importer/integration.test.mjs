import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveOptions, extractGrailKnights } from './extract.mjs';

test('opt-in: read Grail Knights from actual CA packs through installed RPFM', { skip: !process.env.WH3_GAME_PATH && !process.env.WH3_INTEGRATION_CONFIG ? 'Set WH3_GAME_PATH or WH3_INTEGRATION_CONFIG and start RPFM to opt in.' : false }, async () => {
  const args = ['--output-dir', fileURLToPath(new URL('.local/integration/', import.meta.url))];
  if (process.env.WH3_INTEGRATION_CONFIG) args.push('--config', process.env.WH3_INTEGRATION_CONFIG);
  const result = await extractGrailKnights(await resolveOptions(args), () => {});
  const persisted = JSON.parse(await readFile(result.jsonPath, 'utf8'));
  assert.equal(persisted.sourceKind, 'ca-pack');
  assert.equal(persisted.unit.caKey, 'wh_main_brt_cav_grail_knights');
  assert(persisted.rows.some((row) => row.table === 'main_units_tables'));
  assert(persisted.rows.some((row) => row.table === 'melee_weapons_tables'));
  assert(persisted.provenance.packs.every((pack) => ['Release', 'Patch'].includes(pack.pfh_file_type)));
  assert.equal(persisted.rows.filter((row) => row.table === 'main_units_tables').length, 1);
  assert(!persisted.rows.some((row) => row.sourcePack === 'synthetic-fixture.pack'));
  assert((await readFile(result.summaryPath, 'utf8')).includes('Manual reference comparison'));
});
