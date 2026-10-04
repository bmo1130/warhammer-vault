import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { unitCatalogRepository } from '../repositories/unitCatalogRepository';
import { pathFor } from '../domain/entities';
import { compareUnits, formatComparisonValue } from '../domain/unitComparison';
import PageIntro from '../components/PageIntro';
import SearchBox from '../components/SearchBox';

export function comparisonOptions(query = '') {
  return unitCatalogRepository.search(query, 'unit').filter(entry => !entry.isSample);
}
export function comparisonUnit(id: string) {
  const entry = unitCatalogRepository.get(id);
  return entry?.hasProduction && !entry.isSample ? gameRepository.getUnit(id) : undefined;
}

function UnitSelector({ side, id, onSelect }: { side: 'left' | 'right'; id: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const label = side === 'left' ? '왼쪽 유닛' : '오른쪽 유닛';
  const options = comparisonOptions(query);
  const unit = comparisonUnit(id);
  return <section className="panel comparison-selector" aria-label={label}>
    <h2>{label}</h2>
    <SearchBox value={query} onChange={setQuery} label={`${label} 이름 또는 ID 검색`}/>
    <label className="comparison-select-label">{label} 선택
      <select value={unit?.id ?? ''} onChange={event => onSelect(event.target.value)}>
        <option value="">유닛을 선택하세요</option>
        {unit && !options.some(entry => entry.id === unit.id) && <option value={unit.id}>{unit.name} (선택됨)</option>}
        {options.map(entry => <option value={entry.id} key={entry.id}>{entry.name} · {entry.id}</option>)}
      </select>
    </label>
    <p className="data-note" role="status">검색 결과 {options.length}종 · Production만 선택할 수 있습니다.</p>
    {id && !unit && <p className="message error" role="status">이 ID는 비교 가능한 Production 유닛이 아닙니다. 다시 선택하세요.</p>}
  </section>;
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const leftId = params.get('left') ?? '', rightId = params.get('right') ?? '';
  const left = comparisonUnit(leftId), right = comparisonUnit(rightId);
  const select = (side: 'left' | 'right', id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set(side, id); else next.delete(side);
    setParams(next);
  };
  return <>
    <PageIntro eyebrow="BASE UNIT COMPARISON" title="유닛 비교" description="검증되어 저장된 기본 스탯을 나란히 확인하세요."/>
    <div className="comparison-selectors">
      <UnitSelector side="left" id={leftId} onSelect={id => select('left', id)}/>
      <UnitSelector side="right" id={rightId} onSelect={id => select('right', id)}/>
    </div>
    <p className="data-note">—는 미확인 값이며 0과 다릅니다. HP·개체 수·속도를 추정하지 않습니다. 차이는 왼쪽 − 오른쪽이며 우열을 뜻하지 않습니다. 총 무기 피해는 기본 + 관통이며 조건부 보너스를 제외합니다.</p>
    {left && right ? <section className="section" aria-label="기본 스탯 비교">
      <div className="comparison-scroll" tabIndex={0} role="region" aria-label="유닛 비교 표 · 좁은 화면에서는 가로로 스크롤">
        <table className="comparison-table">
          <caption>기본 원본 스탯 · 전투·캠페인 효과 미적용</caption>
          <thead><tr><th scope="col">스탯</th>{[left, right].map((unit, index) => <th scope="col" key={index}>
            <span>{index === 0 ? '왼쪽' : '오른쪽'}</span><Link to={pathFor('unit', unit.id)}>{unit.name}</Link>
            <small>{gameRepository.getFaction(unit.factionId)?.name ?? unit.factionId}</small>
          </th>)}<th scope="col">차이<br/>왼쪽 − 오른쪽</th></tr></thead>
          <tbody>{compareUnits(left, right).map(row => <tr key={row.label}>
            <th scope="row">{row.label}</th><td>{formatComparisonValue(row.left)}</td><td>{formatComparisonValue(row.right)}</td>
            <td className="comparison-delta">{row.delta === undefined ? '—' : `${row.delta > 0 ? '+' : ''}${Number(row.delta.toFixed(6))}`}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section> : <p className="comparison-prompt">두 Production 유닛을 선택하면 비교 표가 표시됩니다.</p>}
  </>;
}
