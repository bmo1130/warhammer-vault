import { Link } from 'react-router-dom';
import type { EntityType } from '../domain/types';
import { pathFor, typeName } from '../domain/entities';
import Icon from './Icon';
export default function EntityRow({ type, id, name, subtitle }: { type: EntityType; id: string; name: string; subtitle?: string }) { return <Link className="entity-row" to={pathFor(type, id)}><span className="entity-glyph">{type === 'faction' ? 'F' : type === 'lord' ? 'L' : 'U'}</span><span className="entity-text"><strong>{name}</strong><small>{subtitle ?? typeName(type)}</small></span><Icon name="arrow"/></Link>; }
