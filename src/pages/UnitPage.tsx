import { Link, useParams } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { pathFor } from '../domain/entities';
import { useRecordView } from '../hooks/useRecordView';
import NotFound from './NotFound';
import Icon from '../components/Icon';
import SectionTitle from '../components/SectionTitle';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
export default function UnitPage() {
  const { id = '' } = useParams(); const unit = gameRepository.getUnit(id);
  useRecordView(unit ? { entityType: 'unit', entityId: id } : null);
  if (!unit) return <NotFound/>;
  const faction = gameRepository.getFaction(unit.factionId);
  const stats = [{ key: 'meleeAttack', label: '근접 공격' }, { key: 'meleeDefense', label: '근접 방어' }, { key: 'speed', label: '속도' }, { key: 'armor', label: '장갑' }, { key: 'leadership', label: '리더십' }, { key: 'health', label: '생명력' }, { key: 'chargeBonus', label: '돌격 보너스' }] as const;
  return <><div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to={pathFor('faction', unit.factionId)}>{faction?.name}</Link><Icon name="arrow"/>유닛</div><div className="detail-hero"><div><div className="eyebrow">UNIT · {unit.id.toUpperCase()}</div><h1>{unit.name}</h1><p>{unit.summary}</p><div className="tag-row"><span className="tag accent">{unit.category}</span>{unit.tier && <span className="tag">T{unit.tier}</span>}{unit.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div><BookmarkButton target={{ entityType: 'unit', entityId: id }}/></div><div className="detail-grid"><section className="section"><SectionTitle title="기본 스탯"/><div className="stats-card">{stats.map((stat) => <div className="stat" key={stat.key}><span>{stat.label}</span><strong>{unit.stats[stat.key] ?? '미입력'}</strong></div>)}</div><p className="data-note">읽기 전용 원본 데이터 · {unit.source}</p></section><section className="section"><SectionTitle title="기본 정보"/><div className="info-card"><div><span>소속 팩션</span><Link to={pathFor('faction', unit.factionId)}>{faction?.name}</Link></div><div><span>분류</span><strong>{unit.category}</strong></div><div><span>티어</span><strong>{unit.tier ? `T${unit.tier}` : '미입력'}</strong></div><div><span>모집비 / 유지비</span><strong>{unit.recruitmentCost ?? '미입력'} / {unit.upkeep ?? '미입력'}</strong></div></div></section></div><ArticleEditor target={{ entityType: 'unit', entityId: id }} label={unit.name}/></>;
}
