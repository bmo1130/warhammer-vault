import { gameRepository } from '../repositories/gameRepository';
import PageIntro from '../components/PageIntro';
import SectionTitle from '../components/SectionTitle';
import EntityRow from '../components/EntityRow';
import EmptyState from '../components/EmptyState';

export default function FactionsPage() {
  const factions = gameRepository.listFactions();
  return <>
    <PageIntro eyebrow="FACTIONS" title="팩션" description="팩션별 군주와 유닛, 개인 기록을 둘러보세요."/>
    <section className="section">
      <SectionTitle title="팩션 목록" count={factions.length}/>
      <div className="list-card">
        {factions.length ? factions.map((faction) => <EntityRow key={faction.id} type="faction" id={faction.id} name={faction.name} subtitle={faction.subtitle}/>) : <EmptyState title="팩션이 없습니다" text="아직 추가된 팩션 데이터가 없습니다."/>}
      </div>
    </section>
  </>;
}
