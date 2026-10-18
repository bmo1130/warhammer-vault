import type {BuildingEffect,BuildingFacts,BuildingField} from '../domain/building';
import {buildingFactsSource} from '../repositories/buildingFacts';

export function buildingNumber(field:BuildingField<number>|undefined,unit:string):string {
  return field?.status==='VERIFIED' ? `${field.value.toLocaleString('ko-KR')} ${unit}` : '미확인 (UNKNOWN)';
}
function EffectList({items}:{items:BuildingEffect[]}) {
  const units={gold:'골드',percent:'%',turns:'턴',raw:'(원본 값)'};
  return <ul className="building-effects">{items.map(effect=><li key={effect.reference.rowId}>
    <strong>{effect.hidden?'게임 UI 숨김 효과':effect.text??'공식 한국어 효과명 미확인'}{effect.unit==='gold'&&' 골드'}</strong>
    {(!effect.text?.includes(String(effect.value))||effect.hidden)&&<span>{effect.value===null?'수치 미확인':`원본 값 ${effect.value.toLocaleString('ko-KR')} ${units[effect.unit]}`}</span>}
    <span>적용 범위: {effect.scope??'미확인'}</span>
    {effect.condition&&<span>조건: {effect.condition}</span>}
  </li>)}</ul>;
}
export default function BuildingCoreDetails({facts,recruitmentCount}:{facts:BuildingFacts|undefined;recruitmentCount:number}) {
  const incomeEffects=facts?.effects.items.filter(effect=>effect.kind==='INCOME')??[];
  const otherEffects=facts?.effects.items.filter(effect=>effect.kind!=='INCOME'&&!effect.hidden)??[];
  const hiddenEffects=facts?.effects.items.filter(effect=>effect.hidden)??[];
  const effectsComplete=facts?.effects.status==='COMPLETE';
  return <section className="section building-core" aria-label="건물 핵심 정보">
    <h2>건물 기본 정보</h2>
    <dl className="building-core-grid">
      <div><dt>건설 비용</dt><dd>{buildingNumber(facts?.constructionCost,'골드')}</dd></div>
      <div><dt>기본 건설 시간</dt><dd>{buildingNumber(facts?.constructionTurns,'턴')}</dd></div>
      <div><dt>기본 수입 효과</dt><dd>{incomeEffects.length?<><EffectList items={incomeEffects}/>{facts?.income.baseGold===0&&<p className="data-note">직접 정액 수입 0 골드 · 위 수입 증감 효과를 제공</p>}</>:facts?.income.status==='COMPLETE'?'0 골드 · 직접 수입 효과 없음':'미확인 (UNKNOWN)'}</dd></div>
      <div><dt>기타 건물 효과</dt><dd>{otherEffects.length?<EffectList items={otherEffects}/>:effectsComplete?'확인된 기타 효과 없음':'미확인 (UNKNOWN)'}</dd></div>
      <div><dt>직접 모집 유닛</dt><dd><a href="#building-recruitment">{recruitmentCount}개 유닛 연결 보기</a></dd></div>
    </dl>
    {hiddenEffects.length>0&&<details className="building-hidden-effects"><summary>게임 UI 숨김 효과 {hiddenEffects.length}개 · 전체 목록에 포함</summary><EffectList items={hiddenEffects}/></details>}
    <p className="data-note">WH3 {buildingFactsSource.gameVersion} 건물 기본값입니다. 연구·군주·진영·캠페인 조건으로 수정된 비용·턴·수입은 계산하지 않습니다.</p>
    <p className="data-note">정상 건물의 효과입니다. 손상·폐허 상태의 값과 원본 근거는 하단에서 확인할 수 있습니다.</p>
    {!effectsComplete&&<p className="message">건물 효과 전체 목록과 수입의 적용 범위는 원본 확보 전까지 미확인입니다. 효과 없음이나 수입 0으로 판정하지 않습니다.</p>}
    {facts?.koreanName.status!=='VERIFIED'&&<p className="data-note">공식 한국어 건물명 확인 보류 · 기존 영문명을 임시 표시합니다.</p>}
  </section>;
}
