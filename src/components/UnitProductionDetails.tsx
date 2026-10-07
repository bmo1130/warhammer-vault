import type { Unit } from '../domain/unit';
import { getMeleeWeaponDamage } from '../domain/unitCalculations';
import SectionTitle from './SectionTitle';
import { unitLocalisation } from '../repositories/unitLocalisation';
import { unitAttributeAdmission } from '../repositories/unitAttributes';
import { getUnitAttributeLabel } from '../domain/unitLabels';

// Read stored fields only; the optional total uses the existing approved sum.
export default function UnitProductionDetails({ unit }: { unit: Unit }) {
  const total = getMeleeWeaponDamage(unit);
  const localisation = unitLocalisation(unit);
  const attributes = unitAttributeAdmission(unit);
  const damage = [
    ['기본 피해', unit.melee.damage.base], ['관통 피해', unit.melee.damage.armorPiercing],
    ['총 무기 피해', total], ['대형 보너스', unit.melee.damage.bonusVsLarge],
    ['보병 보너스', unit.melee.damage.bonusVsInfantry], ['공격 주기 (초)', unit.melee.attackInterval],
  ] as const;
  const missile = unit.missile;
  const missileStats = ([
    ['사거리', missile?.range],
    ['발사체 기본 피해', missile?.projectile.baseDamage],
    ['발사체 관통 피해 (AP)', missile?.projectile.armorPiercingDamage],
    ['발사체 대대형 보너스', missile?.projectile.bonusVsLarge],
    ['발사체 대보병 보너스', missile?.projectile.bonusVsInfantry],
    ['일제 사격당 발사 수 (shots per volley, raw)', missile?.projectile.shotsPerVolley],
    ['보정 거리 (calibration distance)', missile?.accuracy?.calibrationDistance],
    ['보정 영역 (calibration area)', missile?.accuracy?.calibrationArea],
    ['기본 재장전 시간 (초, raw/base)', missile?.reload?.baseTime],
    ['관통 저항 예산 (resistance budget)', missile?.projectile.penetration?.resistanceBudget],
  ] as const).filter(([, value]) => value !== undefined);
  return <>
    <section className="section">
      <SectionTitle title="특성"/>
      {unit.attributes?.length ? <ul>{unit.attributes.map(id => <li key={id}>{getUnitAttributeLabel(id)}</li>)}</ul>
        : <p className="data-note">{unit.attributes === undefined ? '미입력 · 특성 미확인' : '검토된 기본 특성 없음'}</p>}
      {attributes?.status === 'PARTIAL' && <p className="data-note">확인된 특성만 표시합니다. 추가 특성은 미확인입니다.</p>}
    </section>
    {damage.some(([, value]) => value !== undefined) && <section className="section">
      <SectionTitle title="근접 피해"/>
      <div className="stats-card">{damage.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value ?? '미입력'}</strong></div>)}</div>
      <p className="data-note">총 무기 피해는 기본 + 관통의 합입니다. 조건부 보너스와 전투·캠페인 효과는 포함하지 않습니다.</p>
    </section>}
    {missileStats.length > 0 && <section className="section">
      <SectionTitle title="사격 · 검증된 정적 필드"/>
      <div className="stats-card">{missileStats.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <p className="data-note">저장된 기본값입니다. 실제 장전시간·발사 간격·DPS로 환산하지 않습니다. 관통 저항 예산은 관통 개체 수가 아닙니다.</p>
    </section>}
    <details className="production-source panel">
      <summary>출처·버전·생략 범위</summary>
      <div><p>WH3 {unit.gameVersion} · 검토된 정적 source의 기본값입니다. 현재 전투나 캠페인에서의 최종 수치가 아닙니다.</p>
        <p>팩션은 검토된 기본 catalog 분류입니다. 다른 permission을 배제하거나 전체 roster·캠페인 모집 가능성을 확정하지 않습니다.</p>
        <p>{unit.source}</p>
        <p>{unit.sources?.publicStats}</p>
        {localisation && <p>한국어 유닛명: CA {localisation.sourcePack} · {localisation.localisationKey} · pack SHA256 {localisation.packHash}</p>}
        {attributes && <p>특성: CA attribute 그룹 및 검토된 공성 플래그 · {attributes.status === 'PARTIAL' ? '일부 보류' : '검토 완료'} · source SHA256 {attributes.sourceHash}</p>}
        <p>미입력은 미확인입니다. 개체 수·HP·속도·저항 변환·모집 조건 등 미확인 값은 생략했습니다. 사격 자료가 없다는 사실만으로 사격 불가능을 확정하지 않습니다.</p>
      </div>
    </details>
  </>;
}
