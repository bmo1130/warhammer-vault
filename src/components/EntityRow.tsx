import { Link } from 'react-router-dom';
import type { EntityType } from '../domain/types';
import { pathFor, typeName } from '../domain/entities';
import Icon from './Icon';
export default function EntityRow({ type, id, name, subtitle, badge }: { type: EntityType; id: string; name: string; subtitle?: string; badge?: string }) { return <Link className="entity-row" to={pathFor(type, id)}><span className="entity-glyph" aria-hidden="true">{type === 'faction' ? 'F' : type === 'lord' ? 'L' : 'U'}</span><span className="entity-text"><span className="entity-name"><strong>{name}</strong>{badge && <span className="tag">{badge}</span>}</span><small>{subtitle ?? typeName(type)}</small></span><Icon name="arrow"/></Link>; }
