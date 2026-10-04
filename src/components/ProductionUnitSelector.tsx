import { useState } from 'react';
import { comparisonOptions, comparisonUnit } from '../repositories/productionUnitSelection';
import SearchBox from './SearchBox';

export default function ProductionUnitSelector({ label, id, onSelect, disabled = false }: { label: string; id: string; onSelect: (id: string) => void; disabled?: boolean }) {
  const [query, setQuery] = useState('');
  const options = comparisonOptions(query);
  const unit = comparisonUnit(id);
  return <section className="panel comparison-selector" aria-label={label}>
    <h2>{label}</h2>
    <SearchBox value={query} onChange={setQuery} label={`${label} 이름 또는 ID 검색`}/>
    <label className="comparison-select-label">{label} 선택
      <select value={unit?.id ?? ''} disabled={disabled} onChange={event => onSelect(event.target.value)}>
        <option value="">유닛을 선택하세요</option>
        {unit && !options.some(entry => entry.id === unit.id) && <option value={unit.id}>{unit.name} (선택됨)</option>}
        {options.map(entry => <option value={entry.id} key={entry.id}>{entry.name} · {entry.id}</option>)}
      </select>
    </label>
    <p className="data-note" role="status">검색 결과 {options.length}종 · Production만 선택할 수 있습니다.</p>
    {id && !unit && <p className="message error" role="status">이 ID는 비교 가능한 Production 유닛이 아닙니다. 다시 선택하세요.</p>}
  </section>;
}
