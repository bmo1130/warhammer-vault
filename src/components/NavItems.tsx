import { NavLink } from 'react-router-dom';
import { entityRoutes } from '../domain/entities';
import Icon from './Icon';
export default function NavItems({ mobile = false }: { mobile?: boolean }) {
  const items = [{ to: '/', label: '탐색', icon: 'search' }, { to: `/${entityRoutes.unit}`, label: '유닛', icon: 'book' }, { to: `/${entityRoutes.faction}`, label: '팩션', icon: 'book' }, { to: '/notes', label: '메모', icon: 'note' }, { to: '/settings', label: '백업', icon: 'settings' }] as const;
  return <>{items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `${mobile ? 'bottom-link' : 'side-link'} ${isActive ? 'active' : ''}`}><Icon name={item.icon}/><span>{item.label}</span></NavLink>)}</>;
}
