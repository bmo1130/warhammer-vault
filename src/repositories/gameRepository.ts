import factionsJson from '../data/factions.json';
import lordsJson from '../data/lords.json';
import unitsJson from '../data/units.json';
import type { EntityType, Faction, Lord, Unit } from '../domain/types';

const factions: Faction[] = factionsJson;
const lords: Lord[] = lordsJson;
// JSON imports widen enum strings. The promotion gate and dataset tests run the
// actual Unit validator; this assertion only restores the declared enum types.
const units: Unit[] = unitsJson as Unit[];

const factionById = new Map(factions.map((item) => [item.id, item]));
const lordById = new Map(lords.map((item) => [item.id, item]));
const unitById = new Map(units.map((item) => [item.id, item]));

// Membership is stored only on the child entity, including future entity kinds.
function indexByFaction<T extends { factionId: string }>(items: T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const item of items) {
    const entries = index.get(item.factionId);
    if (entries) entries.push(item);
    else index.set(item.factionId, [item]);
  }
  return index;
}
const lordsByFaction = indexByFaction(lords);
const unitsByFaction = indexByFaction(units);

export type SearchResult = { type: 'faction' | 'lord' | 'unit'; id: string; name: string; detail: string };

export const gameRepository = {
  listFactions: () => factions,
  getFaction: (id: string) => factionById.get(id),
  getLord: (id: string) => lordById.get(id),
  getUnit: (id: string) => unitById.get(id),
  listUnits: (): readonly Unit[] => units,
  getFactionLords: (id: string) => lordsByFaction.get(id) ?? [],
  getFactionUnits: (id: string) => unitsByFaction.get(id) ?? [],
  getEntityName: (type: EntityType, id: string) => {
    if (type === 'faction') return factionById.get(id)?.name;
    if (type === 'lord') return lordById.get(id)?.name;
    if (type === 'unit') return unitById.get(id)?.name;
    return undefined;
  },
  search: (query: string): SearchResult[] => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return [
      ...factions.map((item) => ({ type: 'faction' as const, id: item.id, name: item.name, detail: item.subtitle })),
      ...lords.map((item) => ({ type: 'lord' as const, id: item.id, name: item.name, detail: '군주' })),
      ...units.map((item) => ({ type: 'unit' as const, id: item.id, name: item.name, detail: item.classification.category })),
    ].filter((item) => `${item.name} ${item.id} ${item.detail}`.toLocaleLowerCase().includes(term));
  },
};
