import { useEffect, useState } from 'react';
import type { ArticleTarget } from '../domain/types';
import { wikiRepository } from '../repositories/wikiRepository';

export function useBookmark(target: ArticleTarget) {
  const { entityType, entityId } = target;
  const key = `${entityType}:${entityId}`;
  const [state, setState] = useState({ key, bookmarked: false, loading: true, error: '' });
  const bookmarked = state.key === key && state.bookmarked;
  const loading = state.key !== key || state.loading;

  useEffect(() => {
    let active = true;
    setState({ key, bookmarked: false, loading: true, error: '' });
    wikiRepository.hasBookmark({ entityType, entityId }).then((value) => {
      if (active) setState({ key, bookmarked: value, loading: false, error: '' });
    }).catch(() => {
      if (active) setState({ key, bookmarked: false, loading: false, error: '즐겨찾기를 불러오지 못했습니다.' });
    });
    return () => { active = false; };
  }, [entityType, entityId, key]);

  const toggle = async () => {
    if (loading) return;
    setState({ key, bookmarked, loading: true, error: '' });
    try {
      await wikiRepository.setBookmark({ entityType, entityId }, !bookmarked);
      setState((current) => current.key === key ? { key, bookmarked: !bookmarked, loading: false, error: '' } : current);
    } catch {
      setState((current) => current.key === key ? { key, bookmarked, loading: false, error: '즐겨찾기를 저장하지 못했습니다.' } : current);
    }
  };

  return { bookmarked, toggle, loading, error: state.key === key ? state.error : '' };
}
