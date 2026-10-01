const { test } = require('node:test');
const assert = require('node:assert/strict');
const reviewed = import('../tools/wh3-importer/reviewed-snapshots.mjs');
async function current() {
  const { hotfixSnapshot } = await reviewed;
  return { gameVersion: hotfixSnapshot.gameVersion, schemaSha256: hotfixSnapshot.schemaSha256,
    packs: Object.entries(hotfixSnapshot.packs).map(([file_name, sha256]) => ({ file_name, sha256 })) };
}
test('reviewed hotfix requires exact version, schema and both unique named CA packs', async () => {
  const { isReviewedSource } = await reviewed, p = await current();
  assert(isReviewedSource(p, '9.0.1.0'));
  assert(isReviewedSource({ ...p, packs: [...p.packs].reverse() }, '9.0.1.0'));
  for (const bad of [undefined, { ...p, gameVersion: '9.0.3.0' }, { ...p, schemaSha256: 'changed' },
    { ...p, packs: p.packs.slice(0, 1) }, { ...p, packs: [p.packs[0], p.packs[0]] },
    { ...p, packs: [null, p.packs[0]] }, { ...p, packs: [{ file_name: 'unknown' }, { file_name: 'other' }] },
    { ...p, packs: [...p.packs, { file_name: 'mod.pack', sha256: 'extra' }] },
    ...p.packs.map((_, i) => ({ ...p, packs: p.packs.map((pack, n) => n === i ? { ...pack, sha256: 'changed' } : pack) }))])
    assert.equal(isReviewedSource(bad, '9.0.1.0'), false);
});
test('historical reviewed version stays available without relabelling its artifacts', async () => {
  const { isReviewedSource } = await reviewed;
  const old = { gameVersion: '9.0.1.0' }, before = JSON.stringify(old);
  assert(isReviewedSource(old, '9.0.1.0')); assert.equal(JSON.stringify(old), before);
});
test('normalizer admits exact hotfix snapshot without changing mapping or withholding policy', async () => {
  const { normalizeUnit } = await import('../tools/wh3-importer/normalization/normalizer.mjs');
  const { syntheticNormalizationInput } = await import('../tools/wh3-importer/fixtures/normalization.mjs');
  const { dump, context } = await syntheticNormalizationInput('grail-knights');
  dump.sourceKind = 'ca-pack'; dump.unit.gameVersion = '9.0.1.0'; dump.provenance = { ...await current(), gameVersion: '9.0.1.0' };
  context.permissionTrace.sourceKind = 'ca-pack'; context.permissionTrace.provenance = structuredClone(dump.provenance);
  const original = normalizeUnit(dump, context);
  dump.unit.gameVersion = '9.0.2.0'; dump.provenance = await current();
  context.permissionTrace.provenance = structuredClone(dump.provenance);
  const result = normalizeUnit(dump, context);
  const strip = unit => { unit = structuredClone(unit); delete unit.gameVersion; delete unit.source; return unit; };
  assert.deepEqual(strip(result.unit), strip(original.unit));
  assert.deepEqual(result.omitted, original.omitted); assert.deepEqual(result.provenance.fields, original.provenance.fields);
  for (const mutation of [p => p.schemaSha256 = 'changed', p => p.packs[0].sha256 = 'changed', p => p.gameVersion = '9.0.3.0']) {
    const input = structuredClone(dump); mutation(input.provenance);
    assert.throws(() => normalizeUnit(input, context), /reviewed normalization policy/);
  }
});
