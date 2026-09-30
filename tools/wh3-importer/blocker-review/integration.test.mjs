import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireSameSource } from './evidence.mjs';

// Opt-in assertions against the explicitly selected real CA review run. Never
// fall back to fixtures, a different/latest directory, or a failed manifest.
const directory = process.env.WH3_BLOCKER_REVIEW_DIR;
const options = { skip: directory ? false : 'Run blocker-review/cli.mjs and set WH3_BLOCKER_REVIEW_DIR to its COMPLETE directory.' };
const read = async file => JSON.parse(await readFile(path.join(directory, file), 'utf8'));
async function review() {
  const manifest = await read('manifest.json'), report = await read('review.json');
  assert.equal(manifest.status, 'COMPLETE'); assert.equal(manifest.sourceKind, 'ca-pack');
  assert.equal(report.sourceKind, 'ca-pack');
  requireSameSource(manifest.provenance, report.provenance);
  return report;
}

test('actual review: all nine identities retain every candidate, no canonical key injected', options, async () => {
  const r = await review();
  assert.equal(r.identities.length, 9);
  assert.equal(r.identities.reduce((n, x) => n + x.candidates.length, 0), 19);
  for (const x of r.identities) {
    assert.equal(x.classification, 'B'); assert.equal(x.selectedKey, null);
    assert.deepEqual(x.evidence.issues, []);
    for (const c of x.candidates) assert(c.stableIdentity.mainKey && c.localisation.key && c.canonicalProposal === null);
  }
  const paid = r.ruleAudit.find(x => x.rule === 'positiveRecruitment');
  assert(paid.samples.find(x => x.sample === 'Skeleton Chariots').erasesUniqueRoot);
  assert(paid.samples.find(x => x.sample === 'Chaos Warhounds').rejectedKeys.includes('wh_dlc03_bst_inf_chaos_warhounds_0'));
});
test('actual review: Dread and Necrofex rider weapons are schema-connected without display arithmetic', options, async () => {
  const r = await review();
  const dread = r.structures.find(x => x.sample.displayName === 'Dread Saurian');
  assert.equal(dread.missileContract.status, 'DB_CHAIN_FOUND_UNREPRESENTED');
  assert.equal(dread.missileContract.paths.length, 12);
  assert.equal(dread.missileContract.paths.filter(x => x.useSecondaryAmmoPool.value === false).length, 2);
  assert.equal(dread.missileContract.paths.filter(x => x.useSecondaryAmmoPool.value === true).length, 10);
  assert.equal(new Set(dread.missileContract.paths.map(x => x.weaponKey)).size, 2);
  const necrofex = r.structures.find(x => x.sample.displayName === 'Necrofex Colossus');
  assert.equal(necrofex.missileContract.paths.length, 5);
  assert.equal(necrofex.missileContract.weapons.length, 2);
  for (const s of r.structures) {
    assert.deepEqual(s.evidence.issues, []);
    assert.equal(s.entityContract.displayPolicy.count, 'OMIT');
    assert.equal(s.entityContract.displayPolicy.mass, 'OMIT');
    assert.equal(s.missileContract.unitMissileComplete, false);
  }
});
test('actual review: Free Company has skill/bundle enabling evidence but unknown runtime precedence', options, async () => {
  const r = await review(), fc = r.overrides[0];
  assert.equal(fc.contract.entries.length, 2);
  const conditions = fc.contract.entries.flatMap(x => x.enablingEffects.flatMap(e => e.conditions));
  assert(conditions.some(x => x.table === 'character_skill_level_to_effects_junctions_tables' && x.raw.level === 1 && x.raw.effect_scope === 'general_to_force_own'));
  assert(conditions.some(x => x.table === 'effect_bundles_to_effects_junctions_tables' && x.raw.effect_scope === 'faction_to_force_own_unseen'));
  assert(fc.evidence.rows.some(x => x.table === 'rituals_tables' && x.row.category === 'DON_GUNNERY_SCHOOL'));
  assert(fc.contract.entries.every(x => x.active === 'UNKNOWN' && x.precedence === 'UNRESOLVED'));
});
test('actual review: comparable pilot metrics and Unit values remain unchanged; extra omissions are explicit', options, async () => {
  const r = await review();
  assert.deepEqual(r.comparison.before, r.comparison.unmodifiedPilotRerun);
  assert.deepEqual(r.comparison.after.counts, { CLEAN: 1, PARTIAL: 14, BLOCKED: 9 });
  assert.equal(r.comparison.after.multipleMissileWeapons, 3);
  assert.equal(r.comparison.after.unknownMissileChain, 1);
  assert.equal(r.comparison.after.validationFailures, 0);
  const manifest = await read('pilot/manifest.json');
  for (const item of manifest.results) {
    const current = await read(`pilot/${item.result}`);
    const original = JSON.parse(await readFile(path.join(directory, '..', '..', 'pilot', item.result), 'utf8'));
    assert.deepEqual(current.normalized?.unit, original.normalized?.unit, item.slug);
    assert.deepEqual(current.normalized?.omitted, original.normalized?.omitted, item.slug);
  }
  const coverage = await read('reviewed-coverage.json');
  assert.equal(coverage.groups.missile.fullyMapped, 0);
});
