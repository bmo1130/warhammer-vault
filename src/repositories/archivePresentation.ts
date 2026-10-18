import type { ArticleTarget } from '../domain/types';
import { gameRepository, type SearchResult } from './gameRepository';
import { unitCatalogRepository } from './unitCatalogRepository';
import { buildingWikiRepository } from './buildingWikiRepository';

// Home combines existing faction/lord results with the unit display catalog.
// gameRepository remains a production-only source, including its search API.
export function searchArchive(query: string): (SearchResult | {type:'building';id:string;name:string;detail:string})[] {
  if (!query.trim()) return [];
  return [
    ...gameRepository.search(query).filter(result => result.type !== 'unit'),
    ...unitCatalogRepository.search(query).map(entry => ({
      type: 'unit' as const, id: entry.id, name: entry.name, detail: entry.description,
    })),
    ...buildingWikiRepository.list(query).map(entry=>({type:'building' as const,id:entry.building.key,name:entry.name,detail:`브레토니아 · ${entry.chainName} · CA 단계 ${entry.building.stage}`})),
  ];
}

export function resolveSavedTargetName(target: ArticleTarget): string | undefined {
  if (target.entityType === 'building') return buildingWikiRepository.get(target.entityId)?.name;
  return target.entityType === 'unit'
    ? unitCatalogRepository.get(target.entityId)?.name
    : gameRepository.getEntityName(target.entityType, target.entityId);
}
