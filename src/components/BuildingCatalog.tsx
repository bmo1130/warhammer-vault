import { useState } from 'react';
import { Link } from 'react-router-dom';
import { buildingWikiRepository, bretonniaBuildingScope } from '../repositories/buildingWikiRepository';
import EntityRow from './EntityRow';
import SearchBox from './SearchBox';
import EmptyState from './EmptyState';
import SectionTitle from './SectionTitle';

export default function BuildingCatalog() {
  const [query,setQuery] = useState('');
  const entries = buildingWikiRepository.list(query);
  return <div className="building-wiki">
    <p className="data-note">첫 건물 위키 범위: 브레토니아 6개 체인 · 18개 단계. 기존 모집 레지스트리의 일부이며, 전체 건물 목록이 아닙니다.</p>
    <p className="data-note">단계별 영문명은 기존 CA 표시명을 사용합니다. 체인 분류명은 서고의 탐색용 이름입니다. CA 단계는 0부터 시작하며 Tier로 환산하지 않습니다.</p>
    <p className="data-note">확인된 직접 모집 연결만 표시합니다. 실제 캠페인 건설·모집 가능 여부는 미확인입니다.</p>
    <SearchBox value={query} onChange={setQuery} label="건물 이름, 체인, 영문 ID 검색"/>
    {!entries.length && <EmptyState title="검색 결과가 없습니다" text="다른 이름이나 영문 ID로 검색해 보세요."/>}
    {bretonniaBuildingScope.map(chain=>{
      const stages = entries.filter(entry=>entry.building.chainKey === chain.key);
      return stages.length > 0 && <section className="section" key={chain.key}>
        <SectionTitle title={chain.name} count={stages.length}/>
        <div className="list-card">{stages.map(entry=><EntityRow key={entry.building.key} type="building" id={entry.building.key} name={entry.name}
          subtitle={`CA 단계 ${entry.building.stage} · 주건물 요구 단계 ${entry.building.requiredPrimaryBuildingLevel} · 직접 연결 ${new Set(entry.links.map(link=>link.unit.id)).size} 유닛`}/>)}</div>
      </section>;
    })}
    <Link className="text-button" to="/factions/bretonnia">브레토니아 팩션 보기</Link>
  </div>;
}
