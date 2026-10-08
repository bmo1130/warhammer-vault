import { entitySizes, type Unit } from './unit';

export type UnitValidationIssue = { unitId: string; field: string; message: string };

// Small integrity check for typed datasets, not a parser for arbitrary JSON.
// Unknown optional fields are allowed; a future importer must validate shape too.
export function validateUnits(units: readonly Unit[], factionIds: Iterable<string>): UnitValidationIssue[] {
  const factions = new Set(factionIds);
  const ids = new Set<string>();
  const issues: UnitValidationIssue[] = [];
  for (const unit of units) {
    const issue = (field: string, message: string) => issues.push({ unitId: unit.id, field, message });
    const nonNegative = (field: string, value?: number) => {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) issue(field, '유한한 0 이상의 값이어야 합니다.');
    };
    const size = (field: string, value?: string) => {
      if (value !== undefined && !(entitySizes as readonly string[]).includes(value)) issue(field, '지원하지 않는 개체 크기입니다.');
    };
    const stableIds = (field: string, values?: readonly string[]) => {
      values?.forEach((value, index) => {
        if (!/^[a-z][a-z0-9_]*$/.test(value)) issue(`${field}.${index}`, '소문자 snake_case ID를 사용해야 합니다.');
      });
    };
    if (!unit.id || ids.has(unit.id)) issue('id', '유닛 ID가 비었거나 중복되었습니다.');
    ids.add(unit.id);
    if (!factions.has(unit.factionId)) issue('factionId', '존재하지 않는 팩션입니다.');
    if (unit.factionIds) {
      if (!unit.factionIds.includes(unit.factionId) || new Set(unit.factionIds).size !== unit.factionIds.length) issue('factionIds', '대표 소속을 포함한 중복 없는 소속 목록이어야 합니다.');
      unit.factionIds.forEach(id => { if (!factions.has(id)) issue('factionIds', '존재하지 않는 팩션입니다.'); });
    }
    const count = unit.entities.count;
    if (count !== undefined && (!Number.isSafeInteger(count) || count <= 0)) issue('entities.count', '확인된 개체 수는 양의 정수여야 합니다.');
    if (unit.entities.unitScale !== undefined && !['small', 'large'].includes(unit.entities.unitScale)) issue('entities.unitScale', '지원하지 않는 부대 규모입니다.');
    size('entities.entitySize', unit.entities.entitySize);
    size('melee.splash.maxTargetSize', unit.melee.splash?.maxTargetSize);
    size('missile.projectile.penetration.stopsAtEntitySize', unit.missile?.projectile.penetration?.stopsAtEntitySize);
    for (const kind of ['physical', 'missile', 'spell', 'ward'] as const) {
      nonNegative(`defense.resistances.${kind}`, unit.defense.resistances?.[kind]);
    }
    const fire = unit.defense.resistances?.fire;
    if (fire !== undefined && !Number.isFinite(fire)) issue('defense.resistances.fire', '화염 저항·취약성은 유한한 값이어야 합니다.');
    for (const [field, value] of [
      ['entities.totalHealth', unit.entities.totalHealth],
      ['entities.healthPerEntity', unit.entities.healthPerEntity],
      ['entities.mass', unit.entities.mass],
      ['campaign.recruitmentCost', unit.campaign?.recruitmentCost],
      ['campaign.upkeep', unit.campaign?.upkeep],
      ['campaign.recruitmentTurns', unit.campaign?.recruitmentTurns],
      ['campaign.unitCap', unit.campaign?.unitCap],
      ['customBattle.cost', unit.customBattle?.cost],
      ['melee.damage.base', unit.melee.damage.base],
      ['melee.damage.armorPiercing', unit.melee.damage.armorPiercing],
      ['missile.projectile.baseDamage', unit.missile?.projectile.baseDamage],
      ['missile.projectile.armorPiercingDamage', unit.missile?.projectile.armorPiercingDamage],
      ['missile.explosion.baseDamage', unit.missile?.explosion?.baseDamage],
      ['missile.explosion.armorPiercingDamage', unit.missile?.explosion?.armorPiercingDamage],
    ] as const) nonNegative(field, value);
    stableIds('abilities', unit.abilities);
    stableIds('passiveAbilities', unit.passiveAbilities);
    if (unit.passiveAbilities && new Set(unit.passiveAbilities).size !== unit.passiveAbilities.length) issue('passiveAbilities', '지속 능력 ID는 중복될 수 없습니다.');
    unit.passiveAbilities?.forEach((ability, index) => {
      if (ability === 'lance' || unit.abilities?.includes(ability)) issue(`passiveAbilities.${index}`, '액티브 능력과 지속 능력은 구분해야 합니다.');
      if (unit.attributes?.includes(ability)) issue(`passiveAbilities.${index}`, '특성과 지속 능력은 중복 저장할 수 없습니다.');
    });
    stableIds('attributes', unit.attributes);
    if (unit.attributes && new Set(unit.attributes).size !== unit.attributes.length) issue('attributes', '특성 ID는 중복될 수 없습니다.');
    unit.attributes?.forEach((attribute, index) => {
      if (['can_fly', 'cannot_run', 'can_run', 'can_skirmish', 'cannot_skirmish', 'flying', 'always_flying', 'cant_run'].includes(attribute)) issue(`attributes.${index}`, '이동 상태는 movement의 구조화 필드에만 저장해야 합니다.');
      if (['squig', 'gorger', 'guerrilla_deploy', 'rampage', 'underground'].includes(attribute)) issue(`attributes.${index}`, '대상 판정 전용 또는 의미 미확정 CA 키는 특성으로 승격할 수 없습니다.');
      if (['lance', 'blessing_of_the_lady', 'wounds', 'daemonic_instability', 'banished', 'regeneration', 'crumbling', 'disintegrating'].includes(attribute)) issue(`attributes.${index}`, '능력은 attributes에 저장할 수 없습니다.');
    });
    stableIds('melee.attackAttributes', unit.melee.attackAttributes);
    unit.campaign?.recruitmentRequirements?.forEach((requirement, index) => {
      const field = `campaign.recruitmentRequirements.${index}`;
      if (requirement.factionId !== undefined && !factions.has(requirement.factionId)) issue(`${field}.factionId`, '존재하지 않는 팩션입니다.');
      stableIds(`${field}.conditionIds`, requirement.conditionIds);
    });
  }
  return issues;
}
