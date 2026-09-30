import { useEffect } from 'react';
import type { ArticleTarget } from '../domain/types';
import { wikiRepository } from '../repositories/wikiRepository';

export function useRecordView(target: ArticleTarget | null) {
  const entityType = target?.entityType;
  const entityId = target?.entityId;
  useEffect(() => {
    if (entityType && entityId) {
      void wikiRepository.recordView({ entityType, entityId }).catch(() => undefined);
    }
  }, [entityType, entityId]);
}
