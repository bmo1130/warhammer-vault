import { gameRepository } from '../repositories/gameRepository';
import PageIntro from '../components/PageIntro';
import SectionTitle from '../components/SectionTitle';
import EntityRow from '../components/EntityRow';
import EmptyState from '../components/EmptyState';

export default function FactionsPage() {
  const factions = gameRepository.listFactions();
  return <>
    <PageIntro eyebrow="FACTIONS" title="팩션" description="Race별 군주·영웅·유닛 roster와 개인 기록을 둘러보세요. Roster 완료는 연구·건물·스킬 완성과 별개입니다."/>
    <section className="section">
      <SectionTitle title="팩션 목록" count={factions.length}/>
      <div className="list-card">
        {factions.length ? factions.map((faction) => <EntityRow key={faction.id} type="faction" id={faction.id} name={faction.name} subtitle={gameRepository.getRosterCoverage(faction.id)?.status ?? 'ROSTER PARTIAL · 전체 expected 미검토'}/>) : <EmptyState title="팩션이 없습니다" text="아직 추가된 팩션 데이터가 없습니다."/>}
      </div>
    </section>
  </>;
}
