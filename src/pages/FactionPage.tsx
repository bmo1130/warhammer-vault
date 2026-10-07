import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gameRepository, type RosterCategory } from '../repositories/gameRepository';
import { entityRoutes } from '../domain/entities';
import { useRecordView } from '../hooks/useRecordView';
import NotFound from './NotFound';
import Icon from '../components/Icon';
import SectionTitle from '../components/SectionTitle';
import EntityRow from '../components/EntityRow';
import EmptyState from '../components/EmptyState';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
import LocalisationSource from '../components/LocalisationSource';

const labels: Record<RosterCategory, string> = { legendaryLords: '전설 군주', genericLords: '일반 군주', specialLords: '특수 군주', legendaryHeroes: '전설 영웅', genericHeroes: '일반 영웅', specialHeroes: '특수 영웅', units: '유닛' };
export default function FactionPage() {
  const { id = '' } = useParams();
  const faction = gameRepository.getFaction(id);
  const [tab, setTab] = useState<'overview' | 'units' | 'lords' | 'heroes' | 'research' | 'buildings'>('overview');
  useEffect(() => setTab('overview'), [id]);
  useRecordView(faction ? { entityType: 'faction', entityId: id } : null);
  if (!faction) return <NotFound/>;
  const units = gameRepository.getFactionUnits(id).filter(u => u.gameVersion !== 'sample');
  const lords = gameRepository.getFactionLords(id), heroes = gameRepository.getFactionHeroes(id);
  const coverage = gameRepository.getRosterCoverage(id);
  const groups = [
    { key: 'legendaryLords', items: lords.filter(c => c.characterKind === 'legendary_lord'), type: 'lord' },
    { key: 'genericLords', items: lords.filter(c => c.characterKind === 'generic_lord'), type: 'lord' },
    { key: 'specialLords', items: lords.filter(c => c.characterKind === 'special_lord'), type: 'lord' },
    { key: 'legendaryHeroes', items: heroes.filter(c => c.characterKind === 'legendary_hero'), type: 'hero' },
    { key: 'genericHeroes', items: heroes.filter(c => c.characterKind === 'generic_hero'), type: 'hero' },
    { key: 'specialHeroes', items: heroes.filter(c => c.characterKind === 'special_hero'), type: 'hero' },
  ] as const;
  const tabs = [{ id: 'overview', label: 'Roster' }, { id: 'units', label: `유닛 ${units.length}` }, { id: 'lords', label: `군주 ${lords.length}` }, { id: 'heroes', label: `영웅 ${heroes.length}` }, { id: 'research', label: '연구' }, { id: 'buildings', label: '건물' }] as const;
  return <>
    <div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to={`/${entityRoutes.faction}`}>팩션</Link></div>
    <div className="detail-hero"><div><div className="eyebrow">FACTION · {faction.subtitle.toUpperCase()}</div><h1>{faction.name}</h1><p>{faction.description}</p></div><div className="detail-actions"><a className="button button-secondary" href="#my-record" onClick={() => { setTab('overview'); requestAnimationFrame(() => document.getElementById('my-record')?.scrollIntoView()); }}>내 기록으로</a><BookmarkButton target={{ entityType: 'faction', entityId: id }}/></div></div>
    <details className="character-source"><summary>한국어 이름 출처</summary><LocalisationSource item={faction} type="faction"/></details>
    <section className="roster-coverage" aria-label="Roster coverage">
      <strong className="tag">{coverage?.status ?? 'ROSTER PARTIAL'}</strong>
      <p className="data-note">캐릭터·유닛 entry coverage입니다. 연구·건물·스킬과 개별 스탯의 완성을 뜻하지 않습니다.</p>
      {coverage ? <><div className="coverage-grid">{coverage.counts.map(c => <div key={c.category}><span>{labels[c.category]}</span><strong>{c.admitted} / {c.expected}</strong></div>)}</div><p className="data-note">{coverage.sourceStatus} · WH3 {coverage.gameVersion} · 명시적 제외 {coverage.exclusions}개 · 검토된 source inventory 기준</p></> : <p className="data-note">유닛 {units.length}개 등록 · 전체 expected roster 미검토</p>}
    {coverage?.holds.length ? <details className="character-source"><summary>검토 보류 {coverage.holds.length}개</summary>{coverage.holds.map(h => <p className="data-note" key={h.id}>{h.reason}</p>)}</details> : null}</section>
    <div className="tabs" role="tablist" aria-label="팩션 정보">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    {(tab === 'overview' || tab === 'lords' || tab === 'heroes') && <div className="two-columns">{groups.filter(g => tab === 'overview' || (tab === 'lords' ? g.type === 'lord' : g.type === 'hero')).map(group => <section className="section" key={group.key}><SectionTitle title={labels[group.key]} count={group.items.length}/><div className="list-card">{group.items.length ? group.items.map(c => <EntityRow key={c.id} type={group.type} id={c.id} name={c.name} subtitle={labels[group.key]}/>) : <EmptyState title={coverage ? '검토된 roster에 해당 entry가 없습니다' : '아직 검토되지 않았습니다'} text="이 분류의 등록 상태를 표시합니다."/>}</div></section>)}</div>}
    {(tab === 'overview' || tab === 'units') && <section className="section"><SectionTitle title="유닛 목록" count={units.length}/><div className="list-card">{units.map(u => <EntityRow key={u.id} type="unit" id={u.id} name={u.name} subtitle={u.classification.category}/>)}</div></section>}
    {tab === 'overview' && <ArticleEditor key={id} target={{ entityType: 'faction', entityId: id }} label={faction.name}/>}
    {(tab === 'research' || tab === 'buildings') && <section className="section"><EmptyState title="등록된 데이터가 없습니다" text="이 항목은 roster 완료 범위에 포함되지 않습니다."/></section>}
  </>;
}
