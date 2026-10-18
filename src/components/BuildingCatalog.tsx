import { useState } from 'react';
import { Link } from 'react-router-dom';
import { buildingWikiRepository, bretonniaBuildingScope } from '../repositories/buildingWikiRepository';
import EntityRow from './EntityRow';
import SearchBox from './SearchBox';
import EmptyState from './EmptyState';
import SectionTitle from './SectionTitle';
import {buildingFacts,buildingFactsSource} from '../repositories/buildingFacts';
import {buildingNumber} from './BuildingCoreDetails';

export default function BuildingCatalog() {
  const [query,setQuery] = useState('');
  const entries = buildingWikiRepository.list(query);
  return <div className="building-wiki">
    <p className="data-note">첫 건물 위키 범위: 브레토니아 6개 체인 · 18개 단계. 기존 모집 레지스트리의 일부이며, 전체 건물 목록이 아닙니다.</p>
    <p className="data-note">공식 한국어 건물명 · 비용·기본 턴·건물 효과: WH3 {buildingFactsSource.gameVersion}. 체인 분류명은 서고의 탐색용 이름입니다. CA 단계는 0부터 시작하며 Tier로 환산하지 않습니다.</p>
    <p className="data-note">확인된 직접 모집 연결만 표시합니다. 실제 캠페인 건설·모집 가능 여부는 미확인입니다.</p>
    <SearchBox value={query} onChange={setQuery} label="건물 이름, 체인, 영문 ID 검색"/>
    {!entries.length && <EmptyState title="검색 결과가 없습니다" text="다른 이름이나 영문 ID로 검색해 보세요."/>}
    {bretonniaBuildingScope.map(chain=>{
      const stages = entries.filter(entry=>entry.building.chainKey === chain.key);
      return stages.length > 0 && <section className="section" key={chain.key}>
        <SectionTitle title={chain.name} count={stages.length}/>
        <div className="list-card">{stages.map(entry=>{const facts=buildingFacts(entry.building);return <EntityRow key={entry.building.key} type="building" id={entry.building.key} name={entry.name}
          subtitle={`${buildingNumber(facts?.constructionCost,'골드')} · ${buildingNumber(facts?.constructionTurns,'턴')} · 직접 연결 ${new Set(entry.links.map(link=>link.unit.id)).size} 유닛`}/>;})}</div>
      </section>;
    })}
    <Link className="text-button" to="/factions/bretonnia">브레토니아 팩션 보기</Link>
  </div>;
}
