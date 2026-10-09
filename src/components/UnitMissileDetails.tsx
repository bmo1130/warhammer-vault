import type { UnitMissile } from '../domain/unit';
import SectionTitle from './SectionTitle';

export default function UnitMissileDetails({missile,status}:{missile?:UnitMissile;status?:string}) {
  if(!status&&!missile)return null;
  const stats=[['사거리',missile?.range],['발사체 기본 피해',missile?.projectile.baseDamage],
    ['발사체 관통 피해 (AP)',missile?.projectile.armorPiercingDamage],['기본 재장전 시간 (초, raw/base)',missile?.reload?.baseTime]] as const;
  return <section className="section">
    <SectionTitle title="사격 · 검증된 정적 필드"/>
    {status==='N/A'?<p className="data-note">정규 사격 무기 없음 (N/A). 능력이나 주문의 원거리 공격은 별도입니다.</p>:<>
      <div className="stats-card">{stats.map(([label,value])=><div className="stat" key={label}><span>{label}</span><strong>{value??'미확인'}</strong></div>)}</div>
      <p className="data-note">직격 피해는 발사체 1발의 기본/AP 수치입니다. 폭발 피해와 발사 수를 합산하지 않으며, 유닛 카드의 집계 사격 위력과 다를 수 있습니다. 기본 재장전은 실제 장전시간·발사 간격·DPS로 환산하지 않습니다.</p>
      {(status==='PARTIAL'||status==='UNKNOWN')&&<p className="data-note">{status==='PARTIAL'?'일부 사격 필드 확인 (PARTIAL).':'정규 사격 무기 있음 · 기본 수치 미확인 (UNKNOWN).'} 복수 무기나 특수 발사체에서 검증하지 못한 값은 미확인으로 표시합니다.</p>}
    </>}
  </section>;
}
