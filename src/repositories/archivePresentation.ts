import type { ArticleTarget } from '../domain/types';
import { gameRepository, type SearchResult } from './gameRepository';
import { unitCatalogRepository } from './unitCatalogRepository';

// Home combines existing faction/lord results with the unit display catalog.
// gameRepository remains a production-only source, including its search API.
export function searchArchive(query: string): SearchResult[] {
  if (!query.trim()) return [];
  return [
    ...gameRepository.search(query).filter(result => result.type !== 'unit'),
    ...unitCatalogRepository.search(query).map(entry => ({
      type: 'unit' as const, id: entry.id, name: entry.name, detail: entry.description,
    })),
  ];
}

export function resolveSavedTargetName(target: ArticleTarget): string | undefined {
  return target.entityType === 'unit'
    ? unitCatalogRepository.get(target.entityId)?.name
    : gameRepository.getEntityName(target.entityType, target.entityId);
}
