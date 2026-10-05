import { Link, useParams } from 'react-router-dom';
import { gameRepository } from '../repositories/gameRepository';
import { pathFor } from '../domain/entities';
import { useRecordView } from '../hooks/useRecordView';
import NotFound from './NotFound';
import Icon from '../components/Icon';
import SectionTitle from '../components/SectionTitle';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
export default function LordPage() {
  const { id = '' } = useParams(); const lord = gameRepository.getLord(id);
  useRecordView(lord ? { entityType: 'lord', entityId: id } : null);
  if (!lord) return <NotFound/>;
  const faction = gameRepository.getFaction(lord.factionId);
  return <><div className="breadcrumbs"><Link to="/">탐색</Link><Icon name="arrow"/><Link to={pathFor('faction', lord.factionId)}>{faction?.name}</Link><Icon name="arrow"/>군주</div><div className="detail-hero"><div><div className="eyebrow">LORD · {lord.title}</div><h1>{lord.name}</h1><p>{lord.summary}</p><div className="tag-row">{lord.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div><div className="detail-actions"><a className="button button-secondary" href="#my-record">내 기록으로</a><BookmarkButton target={{ entityType: 'lord', entityId: id }}/></div></div><section className="section"><SectionTitle title="기본 정보"/><div className="info-card"><div><span>소속 팩션</span><Link to={pathFor('faction', lord.factionId)}>{faction?.name}</Link></div><div><span>칭호</span><strong>{lord.title}</strong></div><div><span>고유 스킬 / 효과</span><strong>추후 입력</strong></div></div><details className="character-source"><summary>데이터 출처 · WH3 {lord.gameVersion}</summary><p className="data-note">{lord.source}</p><dl><dt>CA subtype</dt><dd>{lord.subtypeKey}</dd><dt>Main / Land</dt><dd>{lord.mainKey} / {lord.landKey}</dd></dl></details></section><ArticleEditor key={id} target={{ entityType: 'lord', entityId: id }} label={lord.name}/></>;
}
