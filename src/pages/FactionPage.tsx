import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { entityRoutes } from '../domain/entities';
import { useRecordView } from '../hooks/useRecordView';
import NotFound from './NotFound';
import Icon from '../components/Icon';
import SectionTitle from '../components/SectionTitle';
import EntityRow from '../components/EntityRow';
import EmptyState from '../components/EmptyState';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
export default function FactionPage() {
  const { id = '' } = useParams(); const faction = gameRepository.getFaction(id);
  const [tab, setTab] = useState<'overview' | 'units' | 'lords' | 'research' | 'buildings'>('overview');
  useEffect(() => setTab('overview'), [id]);
  useRecordView(faction ? { entityType: 'faction', entityId: id } : null);
  if (!faction) return <NotFound/>;
  const units = gameRepository.getFactionUnits(id), lords = gameRepository.getFactionLords(id);
  const tabs = [{ id: 'overview', label: '개요' }, { id: 'units', label: `유닛 ${units.length}` }, { id: 'lords', label: `군주 ${lords.length}` }, { id: 'research', label: '연구' }, { id: 'buildings', label: '건물' }] as const;
  return <><div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to={`/${entityRoutes.faction}`}>팩션</Link></div><div className="detail-hero"><div><div className="eyebrow">FACTION · {faction.subtitle.toUpperCase()}</div><h1>{faction.name}</h1><p>{faction.description}</p><div className="tag-row">{faction.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div><div className="detail-actions"><a className="button button-secondary" href="#my-record" onClick={() => { setTab('overview'); requestAnimationFrame(() => document.getElementById('my-record')?.scrollIntoView()); }}>내 기록으로</a><BookmarkButton target={{ entityType: 'faction', entityId: id }}/></div></div><div className="tabs" role="tablist" aria-label="팩션 정보">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>{tab === 'overview' && <><div className="two-columns"><section className="section"><SectionTitle title="유닛" count={units.length} action="모두 보기" onAction={() => setTab('units')}/><div className="list-card">{units.slice(0, 3).map((unit) => <EntityRow key={unit.id} type="unit" id={unit.id} name={unit.name} subtitle={unit.classification.category}/>)}</div></section><section className="section"><SectionTitle title="군주" count={lords.length}/><div className="list-card">{lords.map((lord) => <EntityRow key={lord.id} type="lord" id={lord.id} name={lord.name} subtitle={lord.title}/>)}</div></section></div><ArticleEditor key={id} target={{ entityType: 'faction', entityId: id }} label={faction.name}/></>}{tab === 'units' && <section className="section"><SectionTitle title="유닛 목록" count={units.length}/><div className="list-card">{units.map((unit) => <EntityRow key={unit.id} type="unit" id={unit.id} name={unit.name} subtitle={unit.classification.category}/>)}</div></section>}{tab === 'lords' && <section className="section"><SectionTitle title="군주 목록" count={lords.length}/><div className="list-card">{lords.map((lord) => <EntityRow key={lord.id} type="lord" id={lord.id} name={lord.name} subtitle={lord.title}/>)}</div></section>}{(tab === 'research' || tab === 'buildings') && <section className="section"><EmptyState title="샘플 데이터가 없습니다" text="공식 데이터를 검증한 뒤 이 항목을 채울 수 있습니다."/></section>}</>;
}
