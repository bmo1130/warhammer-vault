import { useSearchParams } from 'react-router-dom';
import { unitCatalogFilters, unitCatalogRepository, type UnitCatalogFilter } from '../repositories/unitCatalogRepository';
import PageIntro from '../components/PageIntro';
import SearchBox from '../components/SearchBox';
import UnitCatalogRow from '../components/UnitCatalogRow';
import EmptyState from '../components/EmptyState';

export default function UnitsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const filter: UnitCatalogFilter = unitCatalogFilters.find(item => item.id === params.get('filter'))?.id ?? 'all';
  const entries = unitCatalogRepository.search(query, filter);
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || (name === 'filter' && value === 'all')) next.delete(name);
    else next.set(name, value);
    setParams(next, { replace: name === 'q' });
  };
  return <>
    <PageIntro eyebrow="UNIT ARCHIVE" title="유닛 탐색" description="일반 유닛과 관찰 자료를 찾아보고, 나만의 평가와 운용 메모를 남기세요."/>
    <SearchBox value={query} onChange={value => update('q', value)} label="유닛 이름, ID, source key 검색"/>
    <div className="catalog-filters" role="group" aria-label="유닛 유형 필터">
      {unitCatalogFilters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => update('filter', item.id)}>{item.label}</button>)}
    </div>
    <p className="data-note">Production은 검토된 source의 기본값입니다. Sample은 구조 검증용 예시이며 수치는 미검증입니다. Diagnostic-only는 production 스탯이 없는 관찰 자료입니다. 모두 개인 기록을 사용할 수 있습니다.</p>
    <section className="section" aria-label="유닛 검색 결과">
      <div className="section-head"><h2>유닛 목록</h2><span className="catalog-count" role="status" aria-live="polite">{entries.length}개 항목</span></div>
      {entries.length ? <div className="list-card">{entries.map(entry => <UnitCatalogRow key={entry.id} entry={entry}/>)}</div>
        : unitCatalogRepository.list().length === 0 ? <EmptyState title="아직 유닛 자료가 없습니다" text="등록된 유닛 자료가 생기면 여기에 표시됩니다."/>
        : <><EmptyState title="검색 결과가 없습니다" text="다른 이름이나 ID로 검색하거나 필터를 변경해 보세요."/><button className="text-button" type="button" onClick={() => setParams({})}>검색·필터 초기화</button></>}
    </section>
  </>;
}
