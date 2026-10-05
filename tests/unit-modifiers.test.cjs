const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { applyModifiers, applyModifiersWithBreakdown, getStatValue } = require('../.test-build/src/domain/unitModifiers.js');
const { getMeleeWeaponDamage } = require('../.test-build/src/domain/unitCalculations.js');
const { compareUnits } = require('../.test-build/src/domain/unitComparison.js');
const { grailKnightsFixture: base } = require('../.test-build/tests/fixtures/units.js');
const { modifierTestProfiles: profiles } = require('../.test-build/tests/fixtures/modifiers.js');
const modifier = (id, operation, value, stat = 'melee.meleeAttack') => ({ id, operation, value, stat });
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

test('flat, percent, SET and additive-percent stacking follow SET -> summed ADD -> summed PERCENT', () => {
  assert.equal(applyModifiers(base, [modifier('a', 'add', 8)]).melee.meleeAttack, 46);
  close(applyModifiers(base, [modifier('p', 'multiply', 10)]).melee.meleeAttack, 41.8);
  assert.equal(applyModifiers(base, [modifier('s', 'set', 100)]).melee.meleeAttack, 100);
  const mods = [modifier('a', 'add', 5), modifier('b', 'add', 3), modifier('c', 'multiply', 10), modifier('d', 'multiply', 20), modifier('e', 'set', 30)];
  const result = applyModifiersWithBreakdown(base, mods);
  close(result.unit.melee.meleeAttack, 49.4);
  assert.equal(result.breakdown[0].flat, 8);
  assert.equal(result.breakdown[0].percent, 30);
  assert.equal(result.breakdown[0].set, 30);
  for (const permutation of [mods.slice().reverse(), [mods[3], mods[0], mods[4], mods[2], mods[1]]]) assert.deepEqual(applyModifiersWithBreakdown(base, permutation), result);
  const floats = [modifier('c', 'add', 1e16), modifier('a', 'add', -1e16), modifier('b', 'add', 1)];
  assert.deepEqual(applyModifiers(base, floats), applyModifiers(base, floats.slice().reverse()));
});

test('unknown fields and absent optional groups remain absent even with SET; actual zero is modified', () => {
  const unknown = { ...base, movement: {}, campaign: undefined, missile: undefined };
  for (const operation of ['add', 'multiply', 'set']) {
    const { unit, breakdown } = applyModifiersWithBreakdown(unknown, [modifier('a', operation, 10, 'movement.speed'), modifier('b', operation, 10, 'missile.range')]);
    assert.deepEqual(unit.movement, {});
    assert.equal(unit.missile, undefined);
    assert(breakdown.every(row => row.status === 'unknown' && row.result === undefined));
  }
  const zero = { ...base, defense: { armor: 0 } };
  assert.equal(applyModifiers(zero, [modifier('a', 'add', 10, 'defense.armor')]).defense.armor, 10);
  assert.equal(applyModifiers(zero, [modifier('a', 'set', 0, 'defense.armor')]).defense.armor, 0);
});

test('input Unit and modifiers are immutable; returned nested structures and breakdown are independent', () => {
  const input = freeze(structuredClone(base));
  const mods = freeze(structuredClone(profiles.offensive));
  const before = JSON.stringify(input), modsBefore = JSON.stringify(mods);
  const { unit, breakdown } = applyModifiersWithBreakdown(input, mods);
  assert.notEqual(unit, input); assert.notEqual(unit.melee.damage, input.melee.damage);
  unit.tags.push('modified-only');
  breakdown[0].modifiers[0].value = 999;
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(mods), modsBefore);
  assert.notEqual(applyModifiers(input, []), input);
});

test('synthetic profiles update multiple nested stats without rounding or changing stored derived totals', () => {
  const result = applyModifiers(base, [...profiles.offensive, ...profiles.defensive, ...profiles.economy, ...profiles.mobility]);
  assert.equal(result.melee.meleeAttack, 46);
  assert.equal(result.defense.armor, 130); assert.equal(result.defense.meleeDefense, 40);
  close(result.melee.chargeBonus, 89.7);
  close(result.entities.totalHealth, 8390.4);
  close(result.movement.speed, 88.2);
  close(result.campaign.recruitmentCost, 1530); close(result.campaign.upkeep, 392.7);
  close(getMeleeWeaponDamage(result), 52.8);
  assert.equal(Object.hasOwn(result.melee.damage, 'total'), false);
  const comparison = compareUnits(base, result);
  assert.equal(comparison.find(row => row.label === '장갑').delta, -10);
  close(comparison.find(row => row.label === '총 무기 피해').right, 52.8);
  const partial = { ...base, melee: { damage: { base: 10 } } };
  const modified = applyModifiers(partial, profiles.offensive);
  assert.equal(modified.melee.damage.armorPiercing, undefined);
  assert.equal(getMeleeWeaponDamage(modified), undefined);
});

test('deep numeric paths support original missile, resistance and campaign fields only', () => {
  const unit = { ...base, defense: { resistances: { physical: 0 } }, missile: { projectile: { penetration: { resistanceBudget: 2 } } } };
  const result = applyModifiers(unit, [modifier('a', 'add', 10, 'defense.resistances.physical'), modifier('b', 'multiply', 25, 'missile.projectile.penetration.resistanceBudget'), modifier('c', 'add', 1, 'campaign.recruitmentTurns')]);
  assert.equal(getStatValue(result, 'defense.resistances.physical'), 10);
  assert.equal(getStatValue(result, 'missile.projectile.penetration.resistanceBudget'), 2.5);
  assert.equal(result.campaign.recruitmentTurns, 3);
});

test('invalid/non-numeric/derived/prototype paths and invalid operations/amounts are rejected safely', () => {
  for (const stat of ['speed', 'movement.canFly', 'entities.entitySize', 'abilities.0', 'tags', 'classification.tier', 'melee.damage.total', '__proto__.polluted', 'defense.constructor', 'campaign.recruitmentRequirements.0.buildingTier']) {
    assert.throws(() => applyModifiers(base, [modifier('a', 'add', 1, stat)]), /Invalid numeric UnitStatPath/);
    assert.throws(() => getStatValue(base, stat), /Invalid numeric UnitStatPath/);
  }
  for (const value of [NaN, Infinity, -Infinity, '10', null]) assert.throws(() => applyModifiers(base, [modifier('a', 'add', value)]), /Invalid modifier/);
  assert.throws(() => applyModifiers(base, [modifier('a', 'divide', 10)]), /Invalid modifier/);
  assert.throws(() => applyModifiers(base, [modifier('', 'add', 10)]), /IDs/);
  assert.throws(() => applyModifiers(base, [modifier('a', 'add', 1), modifier('a', 'add', 1)]), /IDs/);
  for (const value of ['38', null, NaN, Infinity]) assert.throws(() => applyModifiers({ ...base, melee: { ...base.melee, meleeAttack: value } }, [modifier('a', 'add', 1)]), /Invalid numeric base/);
  assert.equal({}.polluted, undefined);
});

test('conflicting SET and arithmetic overflow fail closed; identical SET is deterministic', () => {
  const mods = [modifier('a', 'set', 10), modifier('b', 'set', 20)];
  assert.throws(() => applyModifiers(base, mods), /Conflicting SET/);
  assert.throws(() => applyModifiers(base, mods.slice().reverse()), /Conflicting SET/);
  assert.equal(applyModifiers(base, [modifier('a', 'set', 10), modifier('b', 'set', 10)]).melee.meleeAttack, 10);
  assert.throws(() => applyModifiers(base, [modifier('a', 'add', Number.MAX_VALUE), modifier('b', 'add', Number.MAX_VALUE)]), /overflow/);
  assert.throws(() => applyModifiers(base, [modifier('a', 'set', Number.MAX_VALUE), modifier('b', 'multiply', 100)]), /overflow/);
});

test('Production fixtures stay separate; Speed/HP admission byte hashes remain unchanged', () => {
  const expected = {
    unitSpeedAdmissions: '2c397f2677e78c92bf9fc91c6c82c1dc43c19798e5c43335872b954f29a1e8dd',
    unitHpAdmissions: '2d4e0e79e755086170358325427bfa6d6395f2d6162ba250f83b0404b21a17bd',
  };
  for (const [name, hash] of Object.entries(expected)) assert.equal(createHash('sha256').update(readFileSync(`src/data/${name}.json`)).digest('hex'), hash);
  const units = require('../src/data/units.json');
  assert.equal(units.filter(u => u.gameVersion !== 'sample').length, 478);
  assert.equal(units.filter(u => u.gameVersion === 'sample').length, 5);
  assert(!units.some(u => u.id.startsWith('fixture_') || u.id.startsWith('test_')));
  const before = JSON.stringify(units);
  for (const unit of units) applyModifiers(unit, profiles.offensive);
  assert.equal(JSON.stringify(units), before);
});
