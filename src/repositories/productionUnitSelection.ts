import { gameRepository } from './gameRepository';
import { unitCatalogRepository } from './unitCatalogRepository';

export function comparisonOptions(query = '') {
  return unitCatalogRepository.search(query, 'unit').filter(entry => !entry.isSample);
}
export function comparisonUnit(id: string) {
  const entry = unitCatalogRepository.get(id);
  return entry?.hasProduction && !entry.isSample ? gameRepository.getUnit(id) : undefined;
}
