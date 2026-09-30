const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getTotalDamage, getMeleeWeaponDamage, getMissileDirectDamage, getExplosionDamage } = require('../.test-build/src/domain/unitCalculations.js');
const { validateUnits } = require('../.test-build/src/domain/unitValidation.js');
const { getUnitAttributeLabel, getUnitAbilityLabel, getAttackAttributeLabel } = require('../.test-build/src/domain/unitLabels.js');
const { schemaFixtures, fixtureFactionIds, grailKnightsFixture, helstormFixture, bloodthirsterFixture } = require('../.test-build/tests/fixtures/units.js');
const units = require('../.test-build/src/data/units.json');
const factions = require('../.test-build/src/data/factions.json');

test('known base and AP damage are summed without conditional bonuses', () => {
  assert.equal(getTotalDamage({ base: 18, armorPiercing: 30, bonusVsLarge: 18 }), 48);
  assert.equal(getMeleeWeaponDamage(grailKnightsFixture), 48);
  assert.equal(getMeleeWeaponDamage(helstormFixture), 24);
  assert.equal(getMeleeWeaponDamage(bloodthirsterFixture), 540);
});

test('unknown damage is not converted to zero, but confirmed zeros are preserved', () => {
  for (const profile of [undefined, {}, { base: 18 }, { armorPiercing: 30 }, { base: 0 }, { base: NaN, armorPiercing: 0 }, { base: 0, armorPiercing: Infinity }]) assert.equal(getTotalDamage(profile), undefined);
  assert.equal(getTotalDamage({ base: 0, armorPiercing: 0 }), 0);
  assert.equal(getTotalDamage({ base: 18, armorPiercing: 0 }), 18);
  assert.equal(getTotalDamage({ base: 0, armorPiercing: 30 }), 30);
  for (const unit of units) {
    assert.equal(getMeleeWeaponDamage(unit), undefined);
    assert.equal(getMissileDirectDamage(unit), undefined);
    assert.equal(getExplosionDamage(unit.missile?.explosion), undefined);
  }
});

test('missile direct and explosion damage remain separate', () => {
  assert.equal(getMissileDirectDamage(helstormFixture), 100);
  assert.equal(getExplosionDamage(helstormFixture.missile.explosion), 73);
  assert.equal(getExplosionDamage({ baseDamage: 22 }), undefined);
  assert.equal(getExplosionDamage({ baseDamage: 0, armorPiercingDamage: 0 }), 0);
  assert.equal(helstormFixture.missile.reload.baseTime, 17);
  assert.equal(helstormFixture.missile.reload.currentTime, undefined);
});

test('three distinct schema fixtures are valid and stay outside production data', () => {
  assert.deepEqual(validateUnits(schemaFixtures, fixtureFactionIds), []);
  assert.equal(grailKnightsFixture.entities.unitScale, 'large');
  assert.equal(grailKnightsFixture.entities.entitySize, 'medium');
  assert.equal(helstormFixture.entities.unitScale, 'small');
  assert.equal(helstormFixture.entities.entitySize, 'very_large');
  assert.equal(helstormFixture.missile.projectile.penetration.resistanceBudget, 2);
  assert.equal(helstormFixture.missile.projectile.penetration.maxPenetrations, undefined);
  assert.equal(grailKnightsFixture.defense.projectilePenetrationResistance, 2);
  assert.equal(bloodthirsterFixture.movement.groundSpeed, 55);
  assert.equal(bloodthirsterFixture.campaign.recruitmentRequirements.length, 2);
  assert(!units.some((unit) => unit.id.startsWith('fixture_')));
});

test('migrated samples preserve IDs and metadata without fabricated numbers', () => {
  assert.deepEqual(units.map((unit) => unit.id), ['zombies', 'grave_guard', 'hexwraiths', 'blood_knights', 'varghulf']);
  assert.deepEqual(units.map((unit) => unit.classification.category), ['보병', '보병', '기병', '기병', '괴수']);
  assert.deepEqual(validateUnits(units, factions.map((faction) => faction.id)), []);
  for (const unit of units) {
    assert.equal(unit.gameVersion, 'sample');
    assert(unit.source.includes('미입력'));
    for (const key of ['entities', 'movement', 'defense']) assert.deepEqual(unit[key], {});
    assert.deepEqual(unit.melee, { damage: {} });
    for (const key of ['stats', 'category', 'tier', 'recruitmentCost', 'upkeep', 'campaign', 'missile']) assert.equal(Object.hasOwn(unit, key), false);
  }
});

test('integrity checks identify invalid counts, costs, health, sizes, IDs and factions', () => {
  for (const count of [0, -1, 1.5, NaN, Infinity]) {
    const unit = { ...units[0], entities: { count } };
    assert(validateUnits([unit], ['vampire_counts']).some((issue) => issue.field === 'entities.count'));
  }
  const unit = {
    ...units[0], factionId: 'unknown', entities: { totalHealth: -1, healthPerEntity: NaN, entitySize: 'gigantic' },
    melee: { damage: {}, splash: { maxTargetSize: 'gigantic' } },
    missile: { projectile: { penetration: { stopsAtEntitySize: 'gigantic' } } },
    campaign: { recruitmentCost: -1, upkeep: -1 }, customBattle: { cost: -1 }, attributes: ['완벽한 활력'],
  };
  const fields = validateUnits([unit], ['vampire_counts']).map((issue) => issue.field);
  for (const field of ['factionId', 'entities.totalHealth', 'entities.healthPerEntity', 'entities.entitySize', 'melee.splash.maxTargetSize', 'missile.projectile.penetration.stopsAtEntitySize', 'campaign.recruitmentCost', 'campaign.upkeep', 'customBattle.cost', 'attributes.0']) assert(fields.includes(field), field);
  assert(validateUnits([units[0], units[0]], ['vampire_counts']).some((issue) => issue.field === 'id'));
  assert.deepEqual(validateUnits([{ ...units[0], campaign: { recruitmentCost: 0, upkeep: 0 }, entities: { count: 1, totalHealth: 0 } }], ['vampire_counts']), []);
});

test('ID-based labels allow new IDs without inventing localized names', () => {
  assert.equal(getUnitAttributeLabel('perfect_vigour'), '완벽한 활력');
  assert.equal(getAttackAttributeLabel('magical'), '마법 공격');
  assert.equal(getUnitAbilityLabel('lance'), '랜스');
  assert.equal(getUnitAttributeLabel('new_unknown_attribute'), 'new_unknown_attribute');
});
