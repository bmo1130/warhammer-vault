import { Link } from 'react-router-dom';
import Icon from './Icon';
export default function SectionTitle({ title, count, to, action, onAction }: { title: string; count?: number; to?: string; action?: string; onAction?: () => void }) { return <div className="section-head"><h2>{title}{count !== undefined && <span className="count">{count}</span>}</h2>{to && <Link to={to}>{action ?? '전체 보기'} <Icon name="arrow"/></Link>}{!to && onAction && <button type="button" className="text-button" onClick={onAction}>{action ?? '전체 보기'} <Icon name="arrow"/></button>}</div>; }
