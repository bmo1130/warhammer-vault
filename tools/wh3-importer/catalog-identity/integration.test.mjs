import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { classifyCatalogCandidates, resolveCatalogRequest } from './policy.mjs';
import { requireSameSource } from '../blocker-review/evidence.mjs';

const directory = process.env.WH3_BLOCKER_REVIEW_DIR;
const options = { skip: directory ? false : 'Generate an actual review and set WH3_BLOCKER_REVIEW_DIR.' };
const read = async file => JSON.parse(await readFile(path.join(directory, file), 'utf8'));
async function actualReview() {
  const manifest = await read('manifest.json'), r = await read('review.json');
  assert.equal(manifest.status, 'COMPLETE'); assert.equal(r.sourceKind, 'ca-pack');
  requireSameSource(manifest.provenance, r.provenance);
  return r;
}

test('actual catalog review retains all 19 sources, verifies guards, and leaves name imports blocked', options, async () => {
  const r = await actualReview();
  assert.deepEqual(r.comparison.catalogIdentity, { scope: 'Nine ambiguous sample groups; candidate classification is independent of Unit import outcomes.', resolvedSamples: 9, unresolvedSamples: 0, retainedCandidates: 19, resolvedCandidates: 19, unresolvedCandidates: 0, unitImportsResolved: 0 });
  for (const group of r.identities) {
    assert.equal(group.classification, 'B'); assert.equal(group.selectedKey, null);
    const c = group.catalogIdentity;
    assert.deepEqual(c, classifyCatalogCandidates(group.candidates, group.evidence));
    assert.equal(c.importStatus, 'BLOCKED'); assert.equal(c.selectedKey, null);
    assert.equal(resolveCatalogRequest(c).status, 'BLOCKED');
    assert.deepEqual(c.candidates.map(x => x.candidate).sort((a, b) => a.mainKey.localeCompare(b.mainKey)), [...group.candidates].sort((a, b) => a.mainKey.localeCompare(b.mainKey)));
    for (const candidate of c.candidates) {
      assert(candidate.decision.checkedEvidence.every(check => check.rows.length > 0));
      assert(candidate.source.mainFact && candidate.source.landFact && candidate.source.mainToLand);
      assert(candidate.presentations.every(p => p.kind === 'CURATED' && p.idKind === 'GENERATED'));
    }
  }
});
test('actual shared-land Empire candidates retain distinct supply and roster presentation identities', options, async () => {
  const r = await actualReview();
  for (const name of ['Helstorm Rocket Battery', 'Handgunners', 'Steam Tank']) {
    const cs = r.identities.find(g => g.sample.displayName === name).catalogIdentity.candidates;
    assert.equal(new Set(cs.map(c => c.source.landKey)).size, 1);
    assert.equal(new Set(cs.map(c => c.source.mainKey)).size, 2);
    assert.equal(new Set(cs.flatMap(c => c.presentations.map(p => p.id))).size, 2);
    assert(cs.some(c => c.presentations[0].classification === 'PRIMARY_CATALOG_ENTRY'));
    const supply = cs.find(c => c.presentations[0].classification === 'CONTEXT_VARIANT');
    assert.equal(supply.presentations[0].defaultVisible, false);
    assert(supply.decision.checkedEvidence.some(e => e.check.equals.unit_set === 'wh2_dlc13_emp_imperial_supply'));
    assert(cs.every(c => c.statIdentity.sharedWithMainKeys.length === 1 && c.statIdentity.fullBattleProfileEquivalence === 'NOT_ESTABLISHED'));
  }
});
test('actual ability-spawn classifications require real spawn edges; cross-faction roster roots survive', options, async () => {
  const r = await actualReview();
  for (const name of ['Bloodthirster', 'Crypt Horrors', 'Zombies']) {
    const cs = r.identities.find(g => g.sample.displayName === name).catalogIdentity.candidates;
    const spawned = cs.find(c => c.presentations[0].classification === 'SUMMONED_OR_SCRIPTED_VARIANT');
    assert.equal(spawned.presentations[0].defaultVisible, false);
    assert(spawned.decision.checkedEvidence.some(e => e.rows.some(row => row.edge.field === 'spawned_unit' && row.facts.spawn_is_decoy.value === false)));
  }
  const hounds = r.identities.find(g => g.sample.displayName === 'Chaos Warhounds').catalogIdentity.candidates;
  assert(hounds.every(c => c.presentations[0].classification === 'SEPARATE_FACTION_ENTRY' && c.presentations[0].defaultVisible));
  assert.deepEqual(hounds.map(c => c.presentations[0].factionId).sort(), ['beastmen', 'warriors_of_chaos']);
  for (const name of ['Crypt Horrors', 'Hexwraiths']) {
    const cs = r.identities.find(g => g.sample.displayName === name).catalogIdentity.candidates;
    assert(cs.some(c => c.presentations[0].contextId === 'tomb_kings_arkhan_roster' && c.presentations[0].defaultVisible));
    assert(cs.some(c => c.presentations[0].contextId === 'vampire_counts_roster' && c.presentations[0].defaultVisible));
  }
});
test('actual Flamers keep both pro-group memberships without auto-merging their contexts', options, async () => {
  const r = await actualReview();
  const cs = r.identities.find(g => g.sample.displayName === 'Flamers of Tzeentch').catalogIdentity.candidates;
  assert(cs.every(c => c.candidate.permissionGroups.includes('wh3_main_pro_tze')));
  assert(cs.some(c => c.presentations[0].classification === 'PROLOGUE_OR_NONSTANDARD_CONTEXT' && !c.presentations[0].defaultVisible));
  assert(cs.some(c => c.presentations[0].classification === 'PRIMARY_CATALOG_ENTRY' && c.presentations[0].defaultVisible));
});
test('actual identity policy changes no Unit values, omissions, unmapped IDs or field provenance', options, async () => {
  const r = await actualReview(), manifest = await read('pilot/manifest.json');
  assert.deepEqual(r.comparison.before, r.comparison.unmodifiedPilotRerun);
  assert.equal(r.comparison.after.validationFailures, 0);
  for (const item of manifest.results) {
    const current = await read(`pilot/${item.result}`);
    const original = JSON.parse(await readFile(path.join(directory, '..', '..', 'pilot', item.result), 'utf8'));
    assert.equal(current.status, original.status);
    for (const field of ['unit', 'omitted', 'unmapped']) assert.deepEqual(current.normalized?.[field], original.normalized?.[field], `${item.slug}.${field}`);
    assert.deepEqual(current.normalized?.provenance.fields, original.normalized?.provenance.fields, `${item.slug}.provenance`);
  }
});
