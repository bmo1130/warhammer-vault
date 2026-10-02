import { pathFor } from '../domain/entities';
import type { Unit } from '../domain/unit';
import { gameRepository } from './gameRepository';
import { unitDiagnosticRepository, type UnitDiagnostic } from './unitDiagnosticRepository';
import { assertSharedUnitIdentity } from './unitSharedIdentity';

export const unitCatalogFilters = [
  { id: 'all', label: '전체' },
  { id: 'unit', label: '일반 Unit' },
  { id: 'evidence', label: 'Diagnostic evidence 있음' },
  { id: 'diagnostic-only', label: 'Diagnostic-only' },
] as const;
export type UnitCatalogFilter = typeof unitCatalogFilters[number]['id'];
export type UnitCatalogEntry = Readonly<{
  id: string; name: string; kind: 'unit' | 'diagnostic-only'; isSample: boolean;
  hasProduction: boolean; hasDiagnostic: boolean; route: string;
  description: string; searchText: string;
}>;

// Display metadata only; both source repositories remain independent.
export function createUnitCatalog(
  units: readonly Unit[],
  diagnostics: readonly UnitDiagnostic[],
  snapshot = unitDiagnosticRepository.snapshot,
): readonly UnitCatalogEntry[] {
  for (const collection of [units, diagnostics]) {
    const ids = new Set<string>();
    for (const item of collection) {
      if (ids.has(item.id)) throw new Error(`Unit catalog ID collision: ${item.id}`);
      ids.add(item.id);
    }
  }
  const shared = new Set<string>();
  for (const unit of units) {
    const diagnostic = diagnostics.find(entry=>entry.id===unit.id);
    if (diagnostic) { assertSharedUnitIdentity(unit,diagnostic,snapshot); shared.add(unit.id); }
  }
  const entries: UnitCatalogEntry[] = [
    ...units.map(unit => ({
      id: unit.id, name: unit.name, kind: 'unit' as const, isSample: unit.gameVersion === 'sample',
      hasProduction: true, hasDiagnostic: shared.has(unit.id), route: pathFor('unit', unit.id),
      description: unit.classification.category,
      searchText: `${unit.name} ${unit.id} ${unit.classification.category}`.toLocaleLowerCase(),
    })),
    ...diagnostics.filter(entry=>!shared.has(entry.id)).map(entry => ({
      id: entry.id, name: entry.name, kind: 'diagnostic-only' as const, isSample: false,
      hasProduction: false, hasDiagnostic: true, route: pathFor('unit', entry.id),
      description: '정적 구성·런타임 관찰 자료',
      searchText: `${entry.name} ${entry.id} ${entry.sourceMainKey} ${entry.sourceLandKey}`.toLocaleLowerCase(),
    })),
  ];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Unit catalog ID collision: ${entry.id}. Production and diagnostic identities must not be merged.`);
    ids.add(entry.id);
    Object.freeze(entry);
  }
  return Object.freeze(entries);
}

export function filterUnitCatalog(entries: readonly UnitCatalogEntry[], query = '', filter: UnitCatalogFilter = 'all') {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(entry =>
    (filter === 'all' || (filter === 'evidence' ? entry.hasDiagnostic : entry.kind === filter)) &&
    (!term || entry.searchText.includes(term)));
}

const entries = createUnitCatalog(gameRepository.listUnits(), unitDiagnosticRepository.list());
const byId = new Map(entries.map(entry => [entry.id, entry]));
export const unitCatalogRepository = {
  list: () => entries,
  get: (id: string) => byId.get(id),
  search: (query: string, filter: UnitCatalogFilter = 'all') => filterUnitCatalog(entries, query, filter),
};
