import type { UnitMissile } from '../domain/unit';
import type { UnitMissileProfile } from '../repositories/unitMissiles';
import SectionTitle from './SectionTitle';

export default function UnitMissileDetails({missile,status,profiles=[]}:{missile?:UnitMissile;status?:string;profiles?:UnitMissileProfile[]}) {
  if(!status&&!missile)return null;
  const stats=[['사거리',missile?.range],['발사체 기본 피해',missile?.projectile.baseDamage],
    ['발사체 관통 피해 (AP)',missile?.projectile.armorPiercingDamage],['기본 재장전 시간 (초, raw/base)',missile?.reload?.baseTime]] as const;
  return <section className="section">
    <SectionTitle title="사격 · 검증된 정적 필드"/>
    {status==='N/A'?<p className="data-note">정규 사격 무기 없음 (N/A). 능력이나 주문의 원거리 공격은 별도입니다.</p>:<>
      <div className="stats-card">{stats.map(([label,value])=><div className="stat" key={label}><span>{label}</span><strong>{value??'미확인'}</strong></div>)}</div>
      <p className="data-note">직격 피해는 발사체 1발의 기본/AP 수치입니다. 폭발 피해와 발사 수를 합산하지 않으며, 유닛 카드의 집계 사격 위력과 다를 수 있습니다. 기본 재장전은 실제 장전시간·발사 간격·DPS로 환산하지 않습니다.</p>
      {(status==='PARTIAL'||status==='UNKNOWN')&&<p className="data-note">{status==='PARTIAL'?'일부 사격 필드 확인 (PARTIAL).':'정규 사격 무기 있음 · 기본 수치 미확인 (UNKNOWN).'} 복수 무기나 특수 발사체에서 검증하지 못한 값은 미확인으로 표시합니다.</p>}
      {profiles.length>0&&<details className="panel">
        <summary>무기별 사격 원본 · {profiles.length}개 프로필</summary>
        <p className="data-note">각 무기의 발사체 1발 기준입니다. 조건부 무기와 전환 모드·탑승자 무기를 각각 보존했습니다. 실제 게임 카드에서 선택된 프로필과 표시 피해는 미측정입니다. COMPLETE는 위 네 필드의 확인 상태입니다.</p>
        {profiles.map((p,i)=><div key={i}>
          <p><strong>{p.kind==='ALTERNATE'?'추가 발사 모드':'기본 발사체'}</strong> · {p.activation==='REQUIRES_ENABLE_EFFECT'?'효과로 활성화되는 교체 무기':p.activation==='UNRESOLVED_JUNCTION'?'활성 상태 미확인':p.activation==='REPLACEMENT_TARGET'?'교체 대상의 기존 무기':'기본 참조 무기'}
            {p.precursor?' · precursor 공격':''}{p.uiVisibility==='HIDDEN_BY_WEAPON_FLAG'?' · 게임 카드 사격 표시 숨김':''}
            {p.damageKind==='EXPLOSION_ONLY'?' · 직격 없음, 폭발 전용':''}</p>
          <div className="stats-card">
            <div className="stat"><span>직격 기본 / AP 피해</span><strong>{p.baseDamage??'미확인'} / {p.armorPiercingDamage??'미확인'}</strong></div>
            {p.explosion&&<div className="stat"><span>폭발 기본 / AP 피해 (별도)</span><strong>{p.explosion.baseDamage??'미확인'} / {p.explosion.armorPiercingDamage??'미확인'}</strong></div>}
            <div className="stat"><span>발사 위치당 발사체 수</span><strong>{p.projectileNumber??'미확인'}</strong></div>
            <div className="stat"><span>volley 발사 수 / burst 발사 수</span><strong>{p.shotsPerVolley??'미확인'} / {p.burstSize??'미확인'}</strong></div>
          </div>
          {(p.scalingDamage||p.spawnedVortex)&&<p className="data-note">추가 scaling/vortex 효과가 있습니다. 실제 합계 피해는 미확인입니다.</p>}
          <details><summary>원본 식별자·조건</summary><p className="data-note">무기: {p.weaponKey}<br/>발사체: {p.projectileKey}<br/>발사 유형: {p.shotType} · 표시: {p.shotDisplay}<br/>소유 경로: {[...new Set(p.owners.map(o=>o.role))].join(', ')}
            {!!p.enableEffects.length&&<><br/>활성화 효과: {p.enableEffects.join(', ')}</>}
            {p.scalingDamage&&<><br/>scaling_damage: {p.scalingDamage}</>}{p.spawnedVortex&&<><br/>spawned_vortex: {p.spawnedVortex}</>}</p></details>
        </div>)}
      </details>}
    </>}
  </section>;
}
