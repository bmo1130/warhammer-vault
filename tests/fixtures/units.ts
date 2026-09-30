import type { Unit, UnitStatPath } from '../../src/domain/unit';

// Values supplied in the request solely to exercise the schema. Not verified
// WH3 data; these fixtures are never loaded by gameRepository or the app.
const source = { gameVersion: 'schema-fixture', source: '요청에 제시된 스키마 검증 예시 · 실제 게임 수치 미검증', tags: [] };

export const grailKnightsFixture: Unit = {
  ...source, id: 'fixture_grail_knights', name: '성배기사 계열 (검증용)', factionId: 'fixture_bretonnia', summary: '충격 기병 스키마 검증',
  classification: { category: '충격 기병', tier: 4 },
  entities: { count: 48, unitScale: 'large', entitySize: 'medium', totalHealth: 7296, mass: 1200 },
  movement: { speed: 84 },
  defense: { armor: 120, shieldBlockChance: 35, leadership: 80, meleeDefense: 34, projectilePenetrationResistance: 2 },
  melee: { meleeAttack: 38, chargeBonus: 78, damage: { base: 18, armorPiercing: 30, bonusVsLarge: 18 }, attackInterval: 5.1, weaponLength: 1, splash: { maxTargets: 2, maxTargetSize: 'medium' }, attackAttributes: ['magical'] },
  terrainModifiers: [{ terrainId: 'forest', speedPercent: -20, meleeAttackPercent: -20 }],
  abilities: ['lance'], passiveAbilities: ['blessing_of_the_lady'], attributes: ['perfect_vigour', 'stalk_in_forest', 'immune_to_psychology', 'knight'],
  campaign: { recruitmentCost: 1700, upkeep: 462, recruitmentTurns: 2, recruitmentRequirements: [{ buildingId: 'stables', buildingTier: 4 }] },
  customBattle: { cost: 1850 },
};

export const helstormFixture: Unit = {
  ...source, id: 'fixture_helstorm', name: '헬스톰 계열 (검증용)', factionId: 'fixture_empire', summary: '포병 스키마 검증',
  classification: { category: '로켓 포대', tier: 4 },
  entities: { count: 4, unitScale: 'small', entitySize: 'very_large', totalHealth: 4356, mass: 3100 },
  movement: { speed: 20, canRun: false, canSkirmish: false },
  defense: { armor: 20, leadership: 50, meleeDefense: 6 },
  melee: { meleeAttack: 10, chargeBonus: 5, damage: { base: 21, armorPiercing: 3 }, attackInterval: 4.3, weaponLength: 0 },
  missile: {
    ammunition: 22, range: 480,
    projectile: { baseDamage: 30, armorPiercingDamage: 70, shotsPerVolley: 3, trajectory: 'artillery', ignoresShields: true, penetration: { resistanceBudget: 2, stopsAtEntitySize: 'small' } },
    explosion: { baseDamage: 22, armorPiercingDamage: 51, radius: 6 },
    accuracy: { calibrationDistance: 300, accuracy: 20, calibrationArea: 220 },
    reload: { baseTime: 17, reloadSkill: 10 },
  },
  terrainModifiers: [{ terrainId: 'shallow_water', speedPercent: -20, meleeAttackPercent: -20 }],
  attributes: ['siege_attacker'],
  campaign: { recruitmentCost: 1050, upkeep: 263, recruitmentTurns: 2, recruitmentRequirements: [{ buildingId: 'forge', buildingTier: 4 }] },
  customBattle: { cost: 1050 },
};

export const bloodthirsterFixture: Unit = {
  ...source, id: 'fixture_bloodthirster', name: '블러드써스터 계열 (검증용)', factionId: 'fixture_khorne', summary: '단일 비행 괴수 스키마 검증',
  classification: { category: '비행 괴수', tier: 5 },
  entities: { count: 1, unitScale: 'large', entitySize: 'very_large', totalHealth: 7732, mass: 4000, splashTargetingClass: 'threatening', receivesSplashAlone: true },
  movement: { speed: 95, groundSpeed: 55, canFly: true },
  defense: { armor: 70, leadership: 80, meleeDefense: 44, resistances: { physical: 20, spell: 35 } },
  melee: { meleeAttack: 60, chargeBonus: 55, damage: { base: 160, armorPiercing: 380, bonusVsLarge: 35 }, attackInterval: 4, weaponLength: 9, splash: { maxTargets: 5, maxTargetSize: 'large' }, attackAttributes: ['flaming', 'magical'] },
  terrainModifiers: [{ terrainId: 'forest', speedPercent: -20, meleeAttackPercent: -20 }],
  passiveAbilities: ['wounds', 'daemonic_instability', 'banished'], attributes: ['causes_fear', 'causes_terror', 'daemon', 'siege_attacker'],
  campaign: {
    recruitmentCost: 4600, upkeep: 575, recruitmentTurns: 3,
    recruitmentRequirements: [
      { buildingId: 'greater_daemon_servants', buildingTier: 5 },
      { factionId: 'fixture_daemons_of_chaos', buildingId: 'elite_recruitment', buildingTier: 5, conditionIds: ['dedicated_to_khorne'] },
    ],
  },
  customBattle: { cost: 2200 },
};

export const schemaFixtures = [grailKnightsFixture, helstormFixture, bloodthirsterFixture];
export const fixtureFactionIds = ['fixture_bretonnia', 'fixture_empire', 'fixture_khorne', 'fixture_daemons_of_chaos'];

export const exampleModifierStats = ['melee.damage.base', 'defense.resistances.physical', 'missile.reload.baseTime', 'entities.totalHealth'] satisfies UnitStatPath[];
// @ts-expect-error Old flat fields must not remain valid modifier targets.
'speed' satisfies UnitStatPath;
// @ts-expect-error Derived totals are not stored stats and cannot be modified directly.
'melee.damage.total' satisfies UnitStatPath;
