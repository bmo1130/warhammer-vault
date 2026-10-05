import { Link } from 'react-router-dom';
import { pathFor } from '../domain/entities';
import { gameRepository } from '../repositories/gameRepository';

// Alias routes show canonical game data while keeping their original personal
// ArticleTarget. Multiple pre-existing documents are never merged/overwritten.
export default function CharacterRecords({ type, canonicalId, currentId }: { type: 'lord' | 'hero'; canonicalId: string; currentId: string }) {
  const aliases = gameRepository.getCharacterAliases(type, canonicalId);
  if (gameRepository.getLegacyCharacterReason(type, currentId)) return <section className="section"><h2>이전 항목의 기록</h2><p className="data-note">Source 검토에서 플레이어 군주·영웅에 해당하지 않는 전투용 캐릭터로 확인되어 roster에서 제외했습니다. 이 주소의 개인 기록은 그대로 보존됩니다.</p></section>;
  if (!aliases.length) return null;
  return <section className="section">
    <h2>캐릭터 통합 전 기록</h2>
    <p className="data-note">같은 캐릭터의 이전 항목에서도 개인 문서와 즐겨찾기를 그대로 열 수 있습니다. 각 항목의 기록은 별도로 보존됩니다.</p>
    <div className="list-card">
      <Link className="entity-row" to={pathFor(type, canonicalId)}>대표 항목의 기록{currentId === canonicalId ? ' · 현재' : ''}</Link>
      {aliases.map((a, i) => <Link className="entity-row" key={a.id} to={pathFor(type, a.id)}>이전 항목 {i + 1}의 기록{currentId === a.id ? ' · 현재' : ''}</Link>)}
    </div>
  </section>;
}
