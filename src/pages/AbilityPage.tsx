import { Link, useParams } from 'react-router-dom';
import { abilityDictionary } from '../repositories/abilityDictionary';
import AbilityDetails from '../components/AbilityDetails';
import NotFound from './NotFound';
export default function AbilityPage() {
  const {id} = useParams();
  const ability = id ? abilityDictionary.get(id) : undefined;
  if (!ability) return <NotFound/>;
  return <div className="ability-page"><Link to="/units">← 유닛 도감</Link><h1>{ability.name}</h1><AbilityDetails ability={ability}/></div>;
}
