import type { UnitStatPath } from './unit';

export const modifierStatLabels: Record<UnitStatPath, string> = {
  'entities.count': '개체 수', 'entities.totalHealth': '총 생명력', 'entities.healthPerEntity': '개체당 생명력', 'entities.mass': '질량',
  'movement.speed': '속도', 'movement.groundSpeed': '지상 속도', 'movement.chargeSpeed': '돌격 속도',
  'defense.armor': '장갑', 'defense.meleeDefense': '근접 방어', 'defense.leadership': '리더십',
  'defense.shieldBlockChance': '방패 방어 확률 (%)', 'defense.barrier': '방벽', 'defense.projectilePenetrationResistance': '발사체 관통 저항',
  'defense.resistances.physical': '물리 저항 (%)', 'defense.resistances.missile': '사격 저항 (%)',
  'defense.resistances.spell': '주문 저항 (%)', 'defense.resistances.fire': '화염 저항 (%)', 'defense.resistances.ward': '와드 저항 (%)',
  'melee.meleeAttack': '근접 공격', 'melee.chargeBonus': '돌격 보너스', 'melee.attackInterval': '공격 주기 (초)', 'melee.weaponLength': '무기 길이',
  'melee.damage.base': '기본 무기 피해', 'melee.damage.armorPiercing': '관통 무기 피해', 'melee.damage.bonusVsLarge': '대형 보너스',
  'melee.damage.bonusVsInfantry': '보병 보너스', 'melee.splash.maxTargets': '스플래시 최대 대상 수',
  'missile.ammunition': '탄약', 'missile.range': '사거리',
  'missile.projectile.baseDamage': '발사체 기본 피해', 'missile.projectile.armorPiercingDamage': '발사체 관통 피해',
  'missile.projectile.bonusVsLarge': '발사체 대형 보너스', 'missile.projectile.bonusVsInfantry': '발사체 보병 보너스', 'missile.projectile.shotsPerVolley': '일제 사격당 발사 수',
  'missile.projectile.penetration.resistanceBudget': '관통 저항 예산', 'missile.projectile.penetration.maxPenetrations': '최대 관통 수',
  'missile.explosion.baseDamage': '폭발 기본 피해', 'missile.explosion.armorPiercingDamage': '폭발 관통 피해', 'missile.explosion.radius': '폭발 반경',
  'missile.accuracy.calibrationDistance': '보정 거리', 'missile.accuracy.accuracy': '정확도', 'missile.accuracy.calibrationArea': '보정 영역',
  'missile.reload.baseTime': '기본 재장전 시간', 'missile.reload.reloadSkill': '재장전 스킬',
  'campaign.recruitmentCost': '캠페인 모집비', 'campaign.upkeep': '유지비', 'campaign.recruitmentTurns': '모집 턴', 'campaign.unitCap': '유닛 상한',
  'customBattle.cost': '커스텀 전투 비용',
};
