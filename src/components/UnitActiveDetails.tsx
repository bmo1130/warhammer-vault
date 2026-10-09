import type { Unit } from '../domain/unit';
import { unitActiveAdmission, unitActiveDefinition } from '../repositories/unitActives';
import SectionTitle from './SectionTitle';
import AbilityButton from './AbilityButton';
function AbilityList({ids}: {ids: string[]}) {
  return <ul>{ids.map(id => {
    const d = unitActiveDefinition(id);
    if (!d) return <li key={id}>{id}</li>;
    return <li key={id} title={d.rawKeys.join(', ')}><AbilityButton id={id} fallback={d.name}/> · {d.kind === 'BOUND' ? '귀속 (BOUND)' : d.kind === 'TOGGLE' ? '토글' : '액티브'} · {d.typeLabel}
      <div className="data-note">{d.englishName}</div>
    </li>;
  })}</ul>;
}
export default function UnitActiveDetails({unit}: {unit: Unit}) {
  const admission = unitActiveAdmission(unit);
  return <section className="section">
    <SectionTitle title="액티브 능력"/>
    {unit.abilities?.length ? <AbilityList ids={unit.abilities}/> : <p className="data-note">{unit.abilities === undefined ? '기본 액티브 능력 목록 미확인' : admission?.status === 'PARTIAL' ? '일반 액티브·토글 후보 추가 검토 중' : '확인된 일반 액티브·토글 능력 없음'}</p>}
    <h3>귀속 주문·능력 (BOUND)</h3>
    {unit.boundAbilities?.length ? <AbilityList ids={unit.boundAbilities}/> : <p className="data-note">{unit.boundAbilities === undefined ? '기본 귀속 주문 목록 미확인' : admission?.status === 'PARTIAL' ? '귀속 주문 후보 추가 검토 중' : '확인된 귀속 주문 없음'}</p>}
    {admission && <p className="data-note">목록 검증: {admission.status === 'COMPLETE' ? 'COMPLETE · 기본 보유 목록 확인' : admission.status === 'PARTIAL' ? 'PARTIAL · 확인된 능력만 표시 · 추가 후보 보류' : 'UNKNOWN · 후보 분류 미확정'}</p>}
    <p className="data-note">기본 유닛의 보유 목록입니다. 현재 사용 가능 여부는 판단하지 않습니다. 발동 조건·해금·전투 상황에 따른 효과는 별도입니다.</p>
    {admission && <details className="data-note"><summary>능력 원본·검증 근거</summary>
      <p>CA {unit.gameVersion} · 기본 land-unit 연결 · source_type 및 passive 분류 · 공식 한·영 이름 · CA 원본 검증, 게임 UI 실측과 구분</p>
      <p>source SHA256 {admission.sourceHash}</p>
      {admission.rawKeys.length > 0 && <p>원본 CA key: {admission.rawKeys.join(', ')}</p>}
      {admission.heldKeys.length > 0 && <p>보류 후보: {admission.heldKeys.join(', ')}</p>}
    </details>}
  </section>;
}
