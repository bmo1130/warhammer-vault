import type { Unit } from '../domain/unit';
import { getMeleeWeaponDamage } from '../domain/unitCalculations';
import SectionTitle from './SectionTitle';
import { unitLocalisation } from '../repositories/unitLocalisation';
import { unitAttributeAdmission } from '../repositories/unitAttributes';
import { getUnitAttributeLabel, getUnitPassiveAbilityLabel } from '../domain/unitLabels';
import { unitPassiveAdmission } from '../repositories/unitPassives';
import { unitEntityAdmission } from '../repositories/unitEntities';
import { unitSpeedAdmission } from '../repositories/unitSpeed';

// Read stored fields only; the optional total uses the existing approved sum.
export default function UnitProductionDetails({ unit }: { unit: Unit }) {
  const total = getMeleeWeaponDamage(unit);
  const localisation = unitLocalisation(unit);
  const attributes = unitAttributeAdmission(unit);
  const passives = unitPassiveAdmission(unit);
  const entities = unitEntityAdmission(unit);
  const speed = unitSpeedAdmission(unit);
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
      <SectionTitle title="개체 수 · 생명력"/>
      <div className="stats-card">
        <div className="stat"><span>전투 개체 수{entities ? ' (Ultra)' : ''}</span><strong>{unit.entities.count ?? '미확인'}</strong></div>
        <div className="stat"><span>부대 총 생명력{entities ? ' (Ultra)' : ''}</span><strong>{unit.entities.totalHealth ?? '미확인'}</strong></div>
        <div className="stat"><span>개체당 생명력</span><strong>{unit.entities.healthPerEntity ?? '미확인'}</strong></div>
      </div>
      {entities && <p className="data-note">Ultra 기준 기본값입니다. 개체 수는 전투 개체를 세며 포병 승무원이나 탑승자를 별도로 더하지 않습니다. 총 생명력을 개체 수로 나눈 값은 개체당 생명력으로 확정하지 않습니다.</p>}
    </section>
    <section className="section">
      <SectionTitle title="특성"/>
      {unit.attributes?.length ? <ul>{unit.attributes.map(id => <li key={id}>{getUnitAttributeLabel(id)}</li>)}</ul>
        : <p className="data-note">{unit.attributes === undefined ? '미입력 · 특성 미확인' : '검토된 기본 특성 없음'}</p>}
      {attributes?.status === 'PARTIAL' && <p className="data-note">확인된 특성만 표시합니다. 추가 특성은 미확인입니다.</p>}
    </section>
    <section className="section">
      <SectionTitle title="지속 능력"/>
      {unit.passiveAbilities?.length ? <ul>{unit.passiveAbilities.map(id => <li key={id} title={id}>{getUnitPassiveAbilityLabel(id)}</li>)}</ul>
        : <p className="data-note">{unit.passiveAbilities === undefined ? '미입력 · 지속 능력 미확인' : '검토된 기본 지속 능력 없음'}</p>}
      {passives?.status === 'PARTIAL' && <p className="data-note">확인된 보유 능력만 표시합니다. 추가 능력은 보류 중입니다.</p>}
      <p className="data-note">기본 유닛 기록의 보유 목록입니다. 보유가 항상 활성화됨을 뜻하지 않습니다. 발동 조건과 효과 수치는 계산하지 않습니다.</p>
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
        {speed && <p>기본 속도: CA {speed.selectedRole === 'man' ? '본체' : speed.selectedRole === 'mount' ? '탈것' : '포병 엔진'} run_speed {speed.rawRunSpeed} × 10 = {speed.value} · {speed.kind === 'PRESERVED_STATIC_SPEED' ? '기존 검증값 보존' : '검증된 구조 규칙으로 추론'}{speed.directCardReference ? ' · 게임 카드 확인 표본' : ''} · source SHA256 {speed.sourceHash}</p>}
        {localisation && <p>한국어 유닛명: CA {localisation.sourcePack} · {localisation.localisationKey} · pack SHA256 {localisation.packHash}</p>}
        {attributes && <p>특성: CA attribute 그룹 및 검토된 공성 플래그 · {attributes.status === 'PARTIAL' ? '일부 보류' : '검토 완료'} · source SHA256 {attributes.sourceHash}</p>}
        {passives && <>
          <p>지속 능력: CA 기본 land-unit 연결 및 passive 분류 · {passives.status === 'PARTIAL' ? '일부 보류' : '보유 목록 검토 완료'} · source SHA256 {passives.sourceHash}</p>
          {!!unit.passiveAbilities?.length && <p>능력 식별자: {unit.passiveAbilities.join(', ')}</p>}
          {!!passives.rawKeys.length && <p>원본 CA ability key: {passives.rawKeys.join(', ')}</p>}
        </>}
        {entities && <p>개체 수·총 HP: Ultra · {entities.kind === 'DIRECT_ULTRA_RUNTIME' ? '기본 전투 원본 측정' : entities.kind === 'EMPIRICAL_CATEGORY_RULE' ? '실측으로 검증한 동일 원본 구조의 계산값' : '기존 검증된 동일 profile'} · {entities.status === 'PARTIAL' ? '개체 수 확인 · 총 HP 미확인' : '개체 수·총 HP 확인'} · {entities.reviewReference} · {entities.references.join(', ')} · source SHA256 {entities.sourceHash}</p>}
        <p>미입력은 미확인입니다. 개체 수·HP·속도·저항 변환·모집 조건 등 미확인 값은 생략했습니다. 사격 자료가 없다는 사실만으로 사격 불가능을 확정하지 않습니다.</p>
      </div>
    </details>
  </>;
}
