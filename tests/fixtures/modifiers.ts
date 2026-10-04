import type { UnitStatModifier } from '../../src/domain/unitModifiers';

// Synthetic calculation fixtures only. Never imported by the application.
export const modifierTestProfiles = {
  offensive: [
    { id: 'test_attack', stat: 'melee.meleeAttack', operation: 'add', value: 8 },
    { id: 'test_charge', stat: 'melee.chargeBonus', operation: 'multiply', value: 15 },
    { id: 'test_base_damage', stat: 'melee.damage.base', operation: 'multiply', value: 10 },
    { id: 'test_ap_damage', stat: 'melee.damage.armorPiercing', operation: 'multiply', value: 10 },
  ],
  defensive: [
    { id: 'test_armor', stat: 'defense.armor', operation: 'add', value: 10 },
    { id: 'test_defense', stat: 'defense.meleeDefense', operation: 'add', value: 6 },
    { id: 'test_hp', stat: 'entities.totalHealth', operation: 'multiply', value: 15 },
  ],
  economy: [
    { id: 'test_recruitment', stat: 'campaign.recruitmentCost', operation: 'multiply', value: -10 },
    { id: 'test_upkeep', stat: 'campaign.upkeep', operation: 'multiply', value: -15 },
  ],
  mobility: [{ id: 'test_speed', stat: 'movement.speed', operation: 'multiply', value: 5 }],
} satisfies Record<string, UnitStatModifier[]>;

// Compile-time rejection complements runtime validation of JavaScript inputs.
// @ts-expect-error derived totals are not original numeric Unit stats
const derived: UnitStatModifier = { id: 'invalid', stat: 'melee.damage.total', operation: 'add', value: 1 };
void derived;
