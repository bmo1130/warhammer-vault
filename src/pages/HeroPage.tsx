import { Link, useParams } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { pathFor } from '../domain/entities';
import { useRecordView } from '../hooks/useRecordView';
import NotFound from './NotFound';
import Icon from '../components/Icon';
import SectionTitle from '../components/SectionTitle';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
import CharacterRecords from '../components/CharacterRecords';

export default function HeroPage() {
  const { id = '' } = useParams();
  const hero = gameRepository.getHero(id);
  useRecordView(hero ? { entityType: 'hero', entityId: id } : null);
  if (!hero) return <NotFound/>;
  const factionIds = hero.factionIds ?? [hero.factionId];
  return <>
    <div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to={pathFor('faction', hero.factionId)}>{gameRepository.getFaction(hero.factionId)?.name}</Link><Icon name="arrow"/>영웅</div>
    <div className="detail-hero">
      <div><div className="eyebrow">HERO · {hero.category}</div><h1>{hero.name}</h1><p>검토된 캐릭터 identity입니다. 스킬·효과·mount와 세부 스탯은 미입력입니다.</p></div>
      <div className="detail-actions"><a className="button button-secondary" href="#my-record">내 기록으로</a><BookmarkButton target={{ entityType: 'hero', entityId: id }}/></div>
    </div>
    <section className="section"><SectionTitle title="기본 정보"/>
      <div className="info-card">
        <div><span>소속 팩션</span><span>{factionIds.map(f => <Link className="character-faction" key={f} to={pathFor('faction', f)}>{gameRepository.getFaction(f)?.name}</Link>)}</span></div>
        <div><span>분류</span><strong>{hero.category}</strong></div>
        <div><span>고유 스킬 / 효과</span><strong>미입력</strong></div>
      </div>
      <details className="character-source"><summary>데이터 출처 · WH3 {hero.gameVersion}</summary><p className="data-note">{hero.source}</p><dl><dt>CA subtype</dt><dd>{hero.subtypeKey}</dd><dt>CA subtype aliases</dt><dd>{hero.subtypeAliases.join(" / ") || "없음"}</dd><dt>Main / Land</dt><dd>{hero.mainKey} / {hero.landKey}</dd></dl></details>
    </section>
    <CharacterRecords type="hero" canonicalId={hero.id} currentId={id}/>
    <ArticleEditor key={id} target={{ entityType: 'hero', entityId: id }} label={hero.name}/>
  </>;
}
