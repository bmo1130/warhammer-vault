import { Link } from 'react-router-dom';
import type { AbilityDetail } from '../domain/ability';
import { abilityCategoryName, abilityPath } from '../domain/ability';
import { abilityDictionary } from '../repositories/abilityDictionary';
const kinds: Record<string, string> = { INVALID_USAGE: '사용 불가 조건', DEACTIVATE: '자동 해제 조건', INVALID_TARGET: '선택 불가 대상', RECHARGE: '재충전 조건' };
const duration = (value: number) => value === -1 ? '시간 제한 없음 (발동 조건은 별도)' : `${value}초`;
function parameter(value: number, unit: string) { return value === -1 ? '특수 값 (-1) · 사용 가능 여부 별도' : `${value} ${unit}`; }
export default function AbilityDetails({ability, documentLink = false}: {ability: AbilityDetail; documentLink?: boolean}) {
  const source = abilityDictionary.provenance;
  const shownParameters = ability.parameters.filter(p => ability.category === 'PASSIVE' ? p.value > 0 : ['active_time','recharge_time','num_uses','effect_range','target_intercept_range'].includes(p.field) || p.value > 0);
  return <div className="ability-detail">
    <p className="ability-kind">{abilityCategoryName[ability.category]} · {ability.englishName}</p>
    <section aria-label="공식 게임 설명">
      <h3>공식 게임 설명</h3>
      {ability.description ? <><p className="ability-description">{ability.description.text}</p><small>{ability.description.language === 'ko' ? '공식 한국어 설명' : '공식 영어 설명 · 한국어 설명 미확인'}</small></> : <p>공식 효과 설명 미확인 · 이름만 확인되었습니다.</p>}
    </section>
    {shownParameters.length > 0 && <section aria-label="지속시간 및 적용 범위"><h3>지속시간 · 적용 범위</h3><dl className="ability-parameters">{shownParameters.map(p => <div key={p.field}><dt>{p.label}</dt><dd>{p.field === 'active_time' ? duration(p.value) : parameter(p.value, p.unit)}</dd></div>)}</dl></section>}
    {ability.category !== 'ATTRIBUTE' && <section aria-label="발동 및 대상 조건"><h3>발동 · 대상 조건</h3>
      {ability.conditions.length ? <ul>{ability.conditions.map((c,i) => <li key={i}><strong>{kinds[c.kind] ?? c.kind}</strong>: {c.text ?? `문구 미확인 (${c.rawFlag})`}</li>)}</ul> : <p>명시적으로 연결된 제한 조건이 없습니다. 보유만으로 현재 발동 상태를 판단하지 않습니다.</p>}
      <p className="data-note">자동 해제 조건은 효과가 멈추는 조건입니다. 전투 상황·회복 상한·강도에 따른 실제 활성 상태는 별도입니다.</p>
    </section>}
    {ability.phases.length > 0 && <section aria-label="확인된 효과"><h3>확인된 효과</h3>
      {ability.activation?.intensityBased && <p>강도에 따라 활성화되는 능력입니다. 아래 수치는 원본 기준이며 현재 강도에 따른 변화를 계산하지 않았습니다.</p>}
      {ability.activation?.ownedTargetsOnly && <p>자신이 소유한 유닛에만 효과를 적용합니다.</p>}
      <p className="data-note">능력이 발동했을 때의 효과입니다. 각 단계를 별도로 표시하며 기본 유닛 수치에 합산하지 않습니다. 보정값은 원본 값으로, 최종 스탯이나 표시 부호로 환산하지 않았습니다.</p>
      {ability.phases.map((p,i) => <article className="ability-phase" key={`${p.id}:${i}`}>
        <h4>{p.relationship === 'DIRECT' ? `단계 ${p.order}` : '접촉 시 부여되는 효과'}{p.hidden ? ' · 게임 UI 숨김 단계' : ''}</h4>
        <p>대상: {p.relationship !== 'DIRECT' ? '공격 접촉 대상 (직접 범위 효과와 구분)' : [p.targets.self && '자신', p.targets.friends && '아군', p.targets.enemies && '적'].filter(Boolean).join(' · ') || '원본 대상 연결 미지정'} · 지속: {duration(p.duration)}</p>
        {(!p.affectsAllies || !p.affectsEnemies) && <p className="data-note">단계 대상 제한: {p.affectsAllies ? '아군 허용' : '아군 제외'} · {p.affectsEnemies ? '적 허용' : '적 제외'}</p>}
        {p.effects.some(e => ['heal_amount','damage_amount','barrier_heal_amount'].includes(e.field)) && <p>적용 주기: {p.interval}초 · 주기당 개체 제한: {p.maxAffectedEntities < 0 ? '제한 없음' : p.maxAffectedEntities === 0 ? '원본 0 (회복 대상 제한 의미 별도)' : p.maxAffectedEntities}</p>}
        {p.effects.length ? <ul>{p.effects.map((e,j) => <li key={j}><strong>{e.label}</strong>: {typeof e.value === 'boolean' ? (e.value ? '적용' : '적용하지 않음') : String(e.value)} {e.unit}{e.method && ` · ${e.method}`}</li>)}</ul> : <p className="data-note">이 단계에서 확인된 수치·특성 보정 없음. 외부 효과 참조는 별도 검토합니다.</p>}
      </article>)}
    </section>}
    {ability.contextDescriptions.map(c => <section key={c.key} aria-label="관련 공식 메커니즘"><h3>관련 공식 메커니즘</h3><p className="ability-description">{c.text}</p><small>공식 게임 설명 · 해당 능력의 발동 조건과 구분</small></section>)}
    {ability.references.length > 0 && <p className="data-note">투사체·소환·행동 등 외부 참조가 있습니다. 전체 효과 계산은 아직 확인되지 않았습니다.</p>}
    <section aria-label="검증 상태"><h3>검증 상태</h3><p>설명: {ability.description ? '공식 Loc 확인' : '미확인'} · 수치 효과: {ability.verification.numericEffects ? '원본 확인' : '별도 수치 미확인'} · 조건: {ability.verification.conditions === 'CA_FLAGS' ? '원본 flag·공식 문구 확인' : '별도 조건 판정 미완료'}</p><p className="data-note">CA {source.gameVersion} 원본 검증 · 전투 UI 실측 없음 · 전체 메커니즘 PARTIAL</p></section>
    {documentLink && <Link className="ability-document-link" to={abilityPath(ability.id)}>독립 능력 문서에서 보기 →</Link>}
    <details className="data-note ability-evidence"><summary>원본 데이터 · 검증 근거</summary>
      <p>canonical ID: {ability.id}</p><p>CA key: {ability.rawKeys.join(', ')}</p>
      {ability.description && <p>공식 설명: {ability.description.key}</p>}
      <p>source SHA256: {source.sourceHash}</p><p>한국어 Loc pack SHA256: {source.koreanPackHash}</p>
      <p>unit_attributes 또는 unit_abilities → unit_special_abilities → phase junction → phases → stat/attribute effects · db.pack / local_kr.pack / local_en.pack</p>
      <a href={source.reference} target="_blank" rel="noreferrer">회복 비율 해석: CA 생성 CCO API 문서</a>
      {ability.held.length > 0 && <><h4>미완료 참조</h4><ul>{ability.held.map((h,i) => <li key={i}>{h.rawKey}: {h.reason}</li>)}</ul></>}
      <ul>{ability.sourceRowIds.map(id => <li key={id}>{id}</li>)}</ul>
    </details>
  </div>;
}
