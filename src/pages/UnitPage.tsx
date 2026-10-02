import { Link, useParams } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { pathFor } from '../domain/entities';
import { useRecordView } from '../hooks/useRecordView';
import NotFound from './NotFound';
import Icon from '../components/Icon';
import SectionTitle from '../components/SectionTitle';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
import UnitDiagnosticSection from '../components/UnitDiagnosticSection';
import { unitDiagnosticRepository } from '../repositories/unitDiagnosticRepository';
import { unitCatalogRepository } from '../repositories/unitCatalogRepository';
import UnitDiagnosticSummary from '../components/UnitDiagnosticSummary';
import UnitProductionDetails from '../components/UnitProductionDetails';
export default function UnitPage() {
  const { id = '' } = useParams(); const unit = gameRepository.getUnit(id);
  const diagnostic = unitDiagnosticRepository.get(id);
  const entry = unitCatalogRepository.get(id);
  useRecordView(entry ? { entityType: 'unit', entityId: id } : null);
  if (!unit) {
    if (!diagnostic) return <NotFound/>;
    return <>
      <div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to="/units">유닛</Link><Icon name="arrow"/>diagnostic-only</div>
      <div className="detail-hero"><div><div className="eyebrow">UNIT · DIAGNOSTIC ONLY</div><h1>{diagnostic.name}</h1>
        <p>확보된 구성·발사체 관찰 자료를 확인하는 항목입니다.</p><div className="tag-row"><span className="tag">Diagnostic-only entry · production 미승격</span></div>
      </div><BookmarkButton target={{ entityType: 'unit', entityId: id }}/></div>
      <p className="data-note">Production data unavailable · 기본 스탯과 production 유닛 정보가 없습니다.</p>
      {gameRepository.getFaction(diagnostic.factionId) && <p className="data-note">자료의 팩션: <Link to={pathFor('faction', diagnostic.factionId)}>{gameRepository.getFaction(diagnostic.factionId)?.name}</Link> · production roster 등재를 뜻하지 않습니다.</p>}
      <UnitDiagnosticSummary evidence={diagnostic}/>
      <UnitDiagnosticSection evidence={diagnostic}/>
      <ArticleEditor key={`unit:${id}`} target={{ entityType: 'unit', entityId: id }} label={diagnostic.name}/>
    </>;
  }
  const faction = gameRepository.getFaction(unit.factionId);
  const stats = [
    { key: 'meleeAttack', label: '근접 공격', value: unit.melee.meleeAttack },
    { key: 'meleeDefense', label: '근접 방어', value: unit.defense.meleeDefense },
    { key: 'speed', label: '속도', value: unit.movement.speed },
    { key: 'armor', label: '장갑', value: unit.defense.armor },
    { key: 'leadership', label: '리더십', value: unit.defense.leadership },
    { key: 'health', label: '생명력', value: unit.entities.totalHealth },
    { key: 'chargeBonus', label: '돌격 보너스', value: unit.melee.chargeBonus },
  ];
  return <><div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to={pathFor('faction', unit.factionId)}>{faction?.name}</Link><Icon name="arrow"/><Link to="/units">유닛</Link></div><div className="detail-hero"><div><div className="eyebrow">UNIT · {unit.id.toUpperCase()}</div><h1>{unit.name}</h1><p>{unit.summary}</p><div className="tag-row"><span className="tag">{unit.gameVersion === 'sample' ? 'Sample' : 'Production'}</span>{diagnostic && <span className="tag">Evidence</span>}<span className="tag accent">{unit.classification.category}</span>{unit.classification.tier !== undefined && <span className="tag">T{unit.classification.tier}</span>}{unit.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div><BookmarkButton target={{ entityType: 'unit', entityId: id }}/></div><div className="detail-grid"><section className="section"><SectionTitle title="기본 스탯"/><div className="stats-card">{stats.map((stat) => <div className="stat" key={stat.key}><span>{stat.label}</span><strong>{stat.value ?? '미입력'}</strong></div>)}</div><p className="data-note">읽기 전용 원본 데이터 · {unit.source}</p></section><section className="section"><SectionTitle title="기본 정보"/><div className="info-card"><div><span>{unit.gameVersion === 'sample' ? '소속 팩션' : '기본 팩션 분류'}</span><Link to={pathFor('faction', unit.factionId)}>{faction?.name}</Link></div><div><span>분류</span><strong>{unit.classification.category}</strong></div><div><span>티어</span><strong>{unit.classification.tier !== undefined ? `T${unit.classification.tier}` : '미입력'}</strong></div><div><span>모집비 / 유지비</span><strong>{unit.campaign?.recruitmentCost ?? '미입력'} / {unit.campaign?.upkeep ?? '미입력'}</strong></div></div></section></div>{unit.gameVersion !== 'sample' && <UnitProductionDetails unit={unit}/>}{diagnostic && <UnitDiagnosticSummary evidence={diagnostic}/>}<UnitDiagnosticSection evidence={diagnostic}/><ArticleEditor key={`unit:${id}`} target={{ entityType: 'unit', entityId: id }} label={unit.name}/></>;
}
