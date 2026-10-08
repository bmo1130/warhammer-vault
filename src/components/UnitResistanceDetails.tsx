import type { UnitResistances } from '../domain/unit';
import SectionTitle from './SectionTitle';

const labels={physical:'물리 저항',missile:'사격 저항',spell:'주문 저항',fire:'화염 저항',ward:'와드 세이브'} as const;
export default function UnitResistanceDetails({resistances}:{resistances?:UnitResistances}) {
  return <section className="section" aria-label="기본 피해 저항">
    <SectionTitle title="기본 피해 저항"/>
    <div className="stats-card">{(Object.keys(labels) as (keyof UnitResistances)[]).map(kind=>{
      const value=resistances?.[kind];
      const weakness=kind==='fire'&&value!==undefined&&value<0;
      return <div className="stat" key={kind}><span>{weakness?'화염 취약성':labels[kind]}</span><strong>{value===undefined?'미확인':`${weakness?Math.abs(value):value}%`}</strong></div>;
    })}</div>
    <p className="data-note">원본 유닛의 기본값입니다. 0%는 확인된 무저항이며 미확인은 자료가 없는 값입니다. 화염 취약성은 원본의 음수 저항입니다. 능력·스킬·아이템·연구 등 추가 효과와 전투 중 최종 저항은 포함하지 않습니다.</p>
  </section>;
}
