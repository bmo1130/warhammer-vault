import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { wikiRepository } from '../repositories/wikiRepository';
import { searchArchive } from '../repositories/archivePresentation';
import { unitCatalogRepository } from '../repositories/unitCatalogRepository';
import type { Bookmark, RecentView } from '../domain/types';
import { pathFor, typeName } from '../domain/entities';
import PageIntro from '../components/PageIntro';
import SearchBox from '../components/SearchBox';
import SectionTitle from '../components/SectionTitle';
import EntityRow from '../components/EntityRow';
import UnitCatalogRow from '../components/UnitCatalogRow';
import SavedTargetRow from '../components/SavedTargetRow';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentView[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([wikiRepository.listRecent(), wikiRepository.listBookmarks()]).then(([views, saved]) => {
      if (active) { setRecent(views); setBookmarks(saved); }
    }).catch(() => { if (active) setError('저장된 항목을 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, []);
  const results = searchArchive(query);
  return <>
    <PageIntro eyebrow="PERSONAL FIELD ARCHIVE" title="전쟁 서고" description="읽고, 기록하고, 다음 전투를 준비하는 나만의 햄탈워 기록장."/>
    <SearchBox value={query} onChange={setQuery}/>
    {query.trim() ? <section className="section">
      <SectionTitle title="검색 결과" count={results.length}/>
      <div className="list-card">{results.length ? results.map(result => {
        const unit = result.type === 'unit' ? unitCatalogRepository.get(result.id) : undefined;
        return unit ? <UnitCatalogRow key={`unit:${unit.id}`} entry={unit}/>
          : <EntityRow key={`${result.type}:${result.id}`} type={result.type} id={result.id} name={result.name} subtitle={`${typeName(result.type)} · ${result.detail}`}/>;
      }) : <EmptyState title="검색 결과가 없습니다" text="다른 이름이나 영문 ID로 다시 검색해 보세요."/>}</div>
    </section> : <>
      <section className="section">
        <SectionTitle title="유닛 탐색" count={unitCatalogRepository.list().length}/>
        <div className="panel archive-start"><p>일반 유닛과 diagnostic-only 자료를 찾고, 즐겨찾기와 나만의 기록으로 다시 이어가세요.</p>
          <div className="archive-links"><Link className="button button-primary" to="/units">전체 유닛 보기 <Icon name="arrow"/></Link><Link className="text-button" to="/units?filter=evidence">관찰 자료가 있는 유닛 <Icon name="arrow"/></Link></div>
        </div>
      </section>
      <div className="two-columns">
        <section className="section"><SectionTitle title="즐겨찾기" count={bookmarks.length}/>
          <div className="list-card">{bookmarks.length ? bookmarks.map(entry => <SavedTargetRow key={entry.id} target={entry}/>) : <EmptyState title="아직 즐겨찾기가 없습니다" text="자주 보는 팩션, 군주, 유닛을 상세 화면에서 저장하세요."/>}</div>
        </section>
        <section className="section"><SectionTitle title="최근 본 항목" count={recent.length}/>
          <div className="list-card">{recent.length ? recent.map(entry => <SavedTargetRow key={entry.id} target={entry}/>) : <EmptyState title="최근 본 항목이 없습니다" text="항목을 열면 이곳에서 빠르게 다시 찾을 수 있습니다."/>}</div>
        </section>
      </div>
      {error && <p className="message error" role="status">{error}</p>}
      <section className="section"><SectionTitle title="팩션 탐색" count={gameRepository.listFactions().length}/>
        <div className="feature-card"><div className="feature-top"><span className="feature-label">샘플 팩션</span><span className="feature-symbol">☾</span></div><h3>뱀파이어 카운트</h3><p>죽음의 군세와 전설 군주, 유닛 기록을 둘러보세요.</p><Link className="button button-primary" to={pathFor('faction', 'vampire_counts')}>팩션 보기 <Icon name="arrow"/></Link></div>
      </section>
    </>}
  </>;
}
