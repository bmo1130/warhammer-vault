import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { comparisonUnit } from '../repositories/productionUnitSelection';
import { wikiRepository } from '../repositories/wikiRepository';
import { type DraftModifierRow, type ManualModifierProfile } from '../domain/manualModifierProfile';
import { researchesForUnit } from '../domain/caResearchEffect';
import { calculateWithSkills, calculatorSourceLabel, skillsForUnit, type SkillSelection } from '../domain/caSkillEffect';
import { getStatValue, modifierStatPaths } from '../domain/unitModifiers';
import { modifierStatLabels } from '../domain/modifierStatLabels';
import { getMeleeWeaponDamage } from '../domain/unitCalculations';
import { formatComparisonValue } from '../domain/unitComparison';
import { pathFor } from '../domain/entities';
import type { UnitStatPath } from '../domain/unit';
import ProductionUnitSelector from '../components/ProductionUnitSelector';
import PageIntro from '../components/PageIntro';

const display = (value?: number) => formatComparisonValue(value === undefined ? undefined : Number(value.toFixed(6)));
const signed = (value: number) => `${value >= 0 ? '+' : ''}${display(value)}`;
const operationLabels = { add: '+ Flat', multiply: '%', set: 'Set' };
const primary: UnitStatPath[] = ['defense.armor', 'defense.meleeDefense', 'defense.leadership', 'melee.meleeAttack', 'melee.chargeBonus', 'melee.damage.base', 'melee.damage.armorPiercing', 'entities.totalHealth', 'entities.count', 'movement.speed', 'customBattle.cost', 'campaign.recruitmentCost', 'campaign.upkeep', 'campaign.recruitmentTurns'];

export default function CalculatorPage() {
  const [params, setParams] = useSearchParams();
  const unitId = params.get('unit') ?? '';
  const unit = comparisonUnit(unitId);
  const [draftUnitId, setDraftUnitId] = useState(unitId);
  const [rows, setRows] = useState<DraftModifierRow[]>([]);
  const [name, setName] = useState(''), [profileId, setProfileId] = useState('');
  const [profiles, setProfiles] = useState<ManualModifierProfile[]>([]);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [invalidCount, setInvalidCount] = useState(0);
  const [selectedResearch, setSelectedResearch] = useState<string[]>([]);
  const [skillRank, setSkillRank] = useState(0);
  const availableResearch = unit ? researchesForUnit(unit) : [];
  const availableSkills = unit ? skillsForUnit(unit) : [];
  const selectedSkills: SkillSelection[] = skillRank && availableSkills.length ? [{skillKey:availableSkills[0].skillKey,ownerKey:availableSkills[0].owner.key,rank:skillRank}] : [];
  const calculation = unit && unitId === draftUnitId ? calculateWithSkills(unit, rows, selectedResearch, selectedSkills) : undefined;
  const modified = calculation?.unit;
  const breakdown = calculation?.breakdown ?? [];
  const refresh = async () => {
    const list = await wikiRepository.listManualProfiles();
    setProfiles(list.profiles); setInvalidCount(list.invalidCount);
  };
  useEffect(() => {
    let active = true;
    wikiRepository.listManualProfiles().then(list => { if (active) { setProfiles(list.profiles); setInvalidCount(list.invalidCount); } }).catch(() => { if (active) setMessage('Profile 목록을 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, []);
  // Browser back/forward must not silently apply another unit's saved rows.
  useEffect(() => {
    if (unitId !== draftUnitId) { setRows([]); setName(''); setProfileId(''); setMessage(''); setSelectedResearch([]); setSkillRank(0); setDraftUnitId(unitId); }
  }, [unitId, draftUnitId]);
  const reset = () => { setRows([]); setName(''); setProfileId(''); setMessage(''); setSelectedResearch([]); setSkillRank(0); };
  const selectUnit = (id: string) => { reset(); setDraftUnitId(id); setParams(id ? { unit: id } : {}); };
  const updateRow = (id: string, update: Partial<DraftModifierRow>) => setRows(current => current.map(row => row.id === id ? { ...row, ...update } : row));
  const load = async (id: string) => {
    if (!id) { reset(); return; }
    setBusy(true);
    try {
      const profile = await wikiRepository.getManualProfile(id);
      if (!profile) throw new Error('저장된 Profile을 찾을 수 없습니다.');
      setDraftUnitId(profile.unitId); setParams({ unit: profile.unitId }); setProfileId(profile.id); setName(profile.name);
      setRows(profile.modifiers.map(m => ({ ...m, value: String(m.value) })));
      setSelectedResearch([]);
      setSkillRank(0);
      setMessage('Profile을 불러왔습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Profile을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!unit || !calculation?.unit || !name.trim()) return;
    setBusy(true);
    try {
      const profile = await wikiRepository.saveManualProfile({ id: profileId || undefined, name, unitId: unit.id, modifiers: calculation.modifiers });
      setProfileId(profile.id); setName(profile.name); await refresh(); setMessage('Profile을 저장했습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Profile을 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!profileId) return;
    setBusy(true);
    try { await wikiRepository.deleteManualProfile(profileId); reset(); await refresh(); setMessage('Profile을 삭제했습니다.'); }
    catch { setMessage('Profile을 삭제하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const shownStats = unit ? modifierStatPaths.filter(stat => primary.includes(stat) || rows.some(row => row.stat === stat) || getStatValue(unit, stat) !== undefined) : [];
  return <>
    <PageIntro eyebrow="MODIFIER CALCULATOR" title="스탯 계산기" description="수동 Modifier와 검토된 WH3 연구·캐릭터 스킬을 선택해 기본값과 계산 결과를 확인하세요."/>
    <ProductionUnitSelector label="계산할 유닛" id={unitId} onSelect={selectUnit} disabled={busy}/>
    {availableResearch.length > 0 && <section className="panel calculator-research section" aria-label="WH3 Research">
      <h2>WH3 Research</h2>
      <p className="data-note">선택한 exact 유닛에 검토된 숫자 효과만 표시합니다. 소유한 브레토니아 팩션에서 연구를 완료한 조건이며, 선택은 Profile에 저장되지 않습니다.</p>
      {availableResearch.map(research => <div className="research-entry" key={research.researchKey}>
        <label><input type="checkbox" checked={selectedResearch.includes(research.researchKey)} disabled={busy} onChange={event => setSelectedResearch(current => event.target.checked ? [...current, research.researchKey] : current.filter(key => key !== research.researchKey))}/> {research.name}</label>
        {research.partial && <p className="data-note">부분 적용 · 검증된 효과만 적용</p>}
        <p className="data-note">{research.modifiers.map(m => `${modifierStatLabels[m.stat as UnitStatPath]} ${signed(m.value)}${m.operation === 'multiply' ? '%' : ''}`).join(' · ')}</p>
        <details><summary>{research.name} · CA source · read-only</summary><p className="data-note">{research.researchKey}<br/>main: {research.mainKey}<br/>land: {research.landKey}<br/>Scope: factionwide · own forces<br/>WH3 {research.gameVersion}<br/>Reviewed source SHA256: {research.sourceSha256}<br/>Snapshot: {research.snapshotId}</p>
          {research.modifiers.map(m => <p className="data-note" key={m.id}>{m.source}<br/>{modifierStatLabels[m.stat as UnitStatPath]} · {operationLabels[m.operation as keyof typeof operationLabels]} · {signed(m.value)}{m.operation === 'multiply' ? '%' : ''}</p>)}
          {research.omittedEffects?.map(effect => <p className="data-note" key={effect.effectKey}>계산 제외: {effect.effectKey} · {effect.classification} · {effect.reason}</p>)}
        </details>
      </div>)}
    </section>}
    {availableSkills.length > 0 && <section className="panel calculator-research section" aria-label="Character Skills">
      <h2>Character Skills</h2>
      {availableSkills.map(skill => <div className="research-entry" key={skill.skillKey}>
        <h3>{skill.name}</h3>
        <p className="data-note">Owner: {skill.owner.name} · Legendary Lord<br/>{skill.owner.key}<br/>이 exact 군주가 본인 군대를 지휘하는 조건입니다. 선택은 Profile에 저장되지 않습니다.</p>
        <label>{skill.name} Rank <select value={skillRank} disabled={busy} onChange={event => setSkillRank(Number(event.target.value))}><option value={0}>0 · 비활성</option><option value={1}>1 · 활성</option></select></label>
        <p className="data-note">{skill.ranks[0].effects.map(e => `${modifierStatLabels[e.stat as UnitStatPath]} ${signed(e.value)}`).join(' · ')}</p>
        <details><summary>{skill.name} · CA_SKILL · read-only</summary><p className="data-note">{skill.skillKey}<br/>Rank 1 · 단일 level의 exact 값 (누적 없음)<br/>Scope: forcewide_when_commanding · own force<br/>WH3 {skill.gameVersion}<br/>Source SHA256: {skill.provenance.sourceSha256}<br/>Snapshot: {skill.provenance.snapshotId}</p>
          {skill.ranks[0].effects.map(e => <p className="data-note" key={e.effectKey}>CA_SKILL · {e.effectKey}<br/>{modifierStatLabels[e.stat as UnitStatPath]} · {operationLabels[e.operation as keyof typeof operationLabels]} · {signed(e.value)}</p>)}
        </details>
      </div>)}
    </section>}
    <section className="panel calculator-profile section" aria-label="수동 Profile">
      <h2>수동 Modifier Profile</h2>
      <p className="data-note">이 Profile은 선택한 한 유닛에 연결되며 이 브라우저의 개인 데이터로 저장됩니다. 계산 결과는 Production 원본을 수정하지 않습니다.</p>
      <label>저장된 Profile 불러오기<select value={profileId} disabled={busy} onChange={event => void load(event.target.value)}>
        <option value="">새 Profile</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {comparisonUnit(p.unitId)?.name ?? p.unitId}</option>)}
      </select></label>
      <label>Profile 이름<input value={name} onChange={event => setName(event.target.value)} placeholder="예: 성배기사 수동 테스트" disabled={busy}/></label>
      <div className="editor-actions">
        <button className="button button-secondary" disabled={busy} onClick={reset}>새 Profile</button>
        <button className="button button-primary" disabled={busy || !modified || !name.trim()} onClick={() => void save()}>{profileId ? '수정 후 저장' : '저장'}</button>
        <button className="button button-danger" disabled={busy || !profileId} onClick={() => void remove()}>Profile 삭제</button>
      </div>
      {invalidCount > 0 && <p className="message error" role="status">손상되었거나 유닛 ID가 유효하지 않은 Profile {invalidCount}개를 제외했습니다. 원본 저장 자료는 삭제하지 않았습니다.</p>}
      {message && <p className="message" role="status">{message}</p>}
    </section>
    <section className="section" aria-label="Modifier 입력">
      <div className="section-head"><h2>Modifier 입력</h2><button className="button button-secondary" disabled={!unit || busy} onClick={() => setRows(current => [...current, { id: crypto.randomUUID(), stat: 'melee.meleeAttack', operation: 'add', value: '' }])}>Modifier 추가</button></div>
      {rows.map((row, index) => <fieldset className="panel calculator-row" key={row.id} disabled={busy}>
        <legend>Modifier {index + 1}</legend>
        <label>스탯<select value={row.stat} onChange={event => updateRow(row.id, { stat: event.target.value as UnitStatPath })}>{modifierStatPaths.map(stat => <option value={stat} key={stat}>{modifierStatLabels[stat]}</option>)}</select></label>
        <label>연산<select value={row.operation} onChange={event => updateRow(row.id, { operation: event.target.value as DraftModifierRow['operation'] })}>{Object.entries(operationLabels).map(([operation, label]) => <option key={operation} value={operation}>{label}</option>)}</select></label>
        <label>값<input type="text" inputMode="decimal" value={row.value} onChange={event => updateRow(row.id, { value: event.target.value })} placeholder="음수·소수 허용"/></label>
        <button className="button button-danger" onClick={() => setRows(current => current.filter(m => m.id !== row.id))}>행 삭제</button>
        {unit && getStatValue(unit, row.stat) === undefined && <p className="data-note">기본값 미확인 · 이 행은 값을 만들지 않습니다.</p>}
      </fieldset>)}
      <p className="data-note">SET → Flat 합산 → Percent 합산. %의 15는 +15%입니다. 미확인은 —이며, 실제 0은 계산합니다. 이는 내부 계산 모델이며 게임의 실제 stacking 규칙을 확정하지 않습니다.</p>
      {calculation?.error && <p className="message error" role="alert">{calculation.error} 계산 결과를 적용하지 않았습니다.</p>}
    </section>
    {unit && <section className="section" aria-label="계산 결과">
      <div className="section-head"><h2>Base / Result</h2><Link to={pathFor('unit', unit.id)}>{unit.name} 상세</Link></div>
      <div className="comparison-scroll" tabIndex={0} role="region" aria-label="계산 결과 표 · 가로 스크롤 가능">
        <table className="comparison-table calculator-table"><caption>표시만 소수점 6자리까지 · 내부 계산은 반올림하지 않습니다.</caption>
          <thead><tr><th scope="col">스탯</th><th scope="col">Base</th><th scope="col">Modifier</th><th scope="col">Result</th></tr></thead>
          <tbody>{shownStats.map(stat => {
            const detail = breakdown?.find(b => b.stat === stat);
            return <tr key={stat}><th scope="row">{modifierStatLabels[stat]}</th><td>{display(getStatValue(unit, stat))}</td>
              <td>{detail ? <details><summary>{detail.set !== undefined ? `SET ${display(detail.set)} · ` : ''}Flat {signed(detail.flat)} · {signed(detail.percent)}%{detail.status === 'unknown' ? ' · 기본값 미확인' : ''}</summary>
                <div className="calculator-breakdown">Base {display(detail.base)}<br/>SET {display(detail.set)}<br/>Flat {signed(detail.flat)}<br/>Percent {signed(detail.percent)}%<br/>Result {display(detail.result)}
                  <ul>{detail.modifiers.map(m => <li key={m.id}>{calculatorSourceLabel(m.id, selectedResearch, selectedSkills)} · {modifierStatLabels[m.stat]} {operationLabels[m.operation]} {m.value}<small>ID: {m.id}</small></li>)}</ul>
                </div></details> : '—'}</td><td>{modified ? display(getStatValue(modified, stat)) : '—'}</td></tr>;
          })}<tr><th scope="row">총 무기 피해 (derived)</th><td>{display(getMeleeWeaponDamage(unit))}</td><td>수정된 기본 + 관통</td><td>{modified ? display(getMeleeWeaponDamage(modified)) : '—'}</td></tr></tbody>
        </table>
      </div>
    </section>}
  </>;
}
