import type { ArticleTarget } from '../domain/types';
import { useBookmark } from '../hooks/useBookmark';
import Icon from './Icon';
export default function BookmarkButton({ target }: { target: ArticleTarget }) {
  const { bookmarked, toggle, loading, error } = useBookmark(target);
  return <div>
    <button className={`bookmark-button ${bookmarked ? 'saved' : ''}`} disabled={loading} onClick={() => void toggle()} aria-label={bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'} aria-pressed={bookmarked}><Icon name="star"/><span>{bookmarked ? '저장됨' : '즐겨찾기'}</span></button>
    {error && <p className="message error" role="status">{error}</p>}
  </div>;
}
