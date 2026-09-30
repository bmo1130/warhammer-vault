import factionsJson from '../data/factions.json';
import lordsJson from '../data/lords.json';
import unitsJson from '../data/units.json';
import type { EntityType, Faction, Lord, Unit } from '../domain/types';

const factions = factionsJson as Faction[];
const lords = lordsJson as Lord[];
const units = unitsJson as Unit[];

export type SearchResult = { type: 'faction' | 'lord' | 'unit'; id: string; name: string; detail: string };

export const gameRepository = {
  listFactions: () => factions,
  getFaction: (id: string) => factions.find((item) => item.id === id),
  getLord: (id: string) => lords.find((item) => item.id === id),
  getUnit: (id: string) => units.find((item) => item.id === id),
  getFactionLords: (id: string) => lords.filter((item) => item.factionId === id),
  getFactionUnits: (id: string) => units.filter((item) => item.factionId === id),
  getEntityName: (type: EntityType, id: string) => {
    if (type === 'faction') return factions.find((item) => item.id === id)?.name;
    if (type === 'lord') return lords.find((item) => item.id === id)?.name;
    if (type === 'unit') return units.find((item) => item.id === id)?.name;
    return undefined;
  },
  search: (query: string): SearchResult[] => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return [
      ...factions.map((item) => ({ type: 'faction' as const, id: item.id, name: item.name, detail: item.subtitle })),
      ...lords.map((item) => ({ type: 'lord' as const, id: item.id, name: item.name, detail: '군주' })),
      ...units.map((item) => ({ type: 'unit' as const, id: item.id, name: item.name, detail: item.category })),
    ].filter((item) => `${item.name} ${item.id} ${item.detail}`.toLocaleLowerCase().includes(term));
  },
};
