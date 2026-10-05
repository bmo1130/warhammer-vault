import factionsJson from '../data/factions.json';
import lordsJson from '../data/lords.json';
import heroesJson from '../data/heroes.json';
import rostersJson from '../data/factionRosters.json';
import unitsJson from '../data/units.json';
import type { EntityType, Faction, Lord, Hero, Unit } from '../domain/types';

const factions: Faction[] = factionsJson;
const lords: Lord[] = lordsJson as Lord[];
const heroes: Hero[] = heroesJson as Hero[];
// JSON imports widen enum strings. The promotion gate and dataset tests run the
// actual Unit validator; this assertion only restores the declared enum types.
const units: Unit[] = unitsJson as Unit[];

const factionById = new Map(factions.map((item) => [item.id, item]));
const lordById = new Map(lords.map((item) => [item.id, item]));
const heroById = new Map(heroes.map((item) => [item.id, item]));
const unitById = new Map(units.map((item) => [item.id, item]));

// Membership is stored only on the child entity, including future entity kinds.
function indexByFaction<T extends { factionId: string; factionIds?: string[] }>(items: T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const item of items) {
    for (const factionId of item.factionIds ?? [item.factionId]) {
      const entries = index.get(factionId);
      if (entries) entries.push(item);
      else index.set(factionId, [item]);
    }
  }
  return index;
}
const lordsByFaction = indexByFaction(lords);
const unitsByFaction = indexByFaction(units);
const heroesByFaction = indexByFaction(heroes);
const rosterByFaction = new Map(rostersJson.rosters.map(r => [r.factionId, r]));
export const rosterCategories = ['legendaryLords', 'genericLords', 'legendaryHeroes', 'genericHeroes', 'units'] as const;
export type RosterCategory = typeof rosterCategories[number];

export type SearchResult = { type: 'faction' | 'lord' | 'hero' | 'unit'; id: string; name: string; detail: string };

export const gameRepository = {
  listFactions: () => factions,
  getFaction: (id: string) => factionById.get(id),
  getLord: (id: string) => lordById.get(id),
  getHero: (id: string) => heroById.get(id),
  getUnit: (id: string) => unitById.get(id),
  listUnits: (): readonly Unit[] => units,
  getFactionLords: (id: string) => lordsByFaction.get(id) ?? [],
  getFactionHeroes: (id: string) => heroesByFaction.get(id) ?? [],
  getFactionUnits: (id: string) => unitsByFaction.get(id) ?? [],
  getRosterCoverage: (id: string) => {
    const roster = rosterByFaction.get(id);
    if (!roster) return undefined;
    const counts = rosterCategories.map(category => {
      const entries = roster[category];
      const admitted = entries.filter(e => {
        const item = category === 'units' ? unitById.get(e.id) : category.endsWith('Lords') ? lordById.get(e.id) : heroById.get(e.id);
        return item && item.gameVersion !== 'sample' && (item.factionIds ?? [item.factionId]).includes(id) && (category === 'units' || ('characterKind' in item && 'characterKind' in e && item.characterKind === e.characterKind && 'subtypeKey' in e && item.subtypeKey === e.subtypeKey));
      }).length;
      return { category, admitted, expected: entries.length };
    });
    return { status: counts.every(c => c.admitted === c.expected) && roster.holds.length === 0 ? 'ROSTER COMPLETE' : 'HOLD', counts, exclusions: roster.explicitlyExcludedCount, gameVersion: rostersJson.gameVersion };
  },
  getEntityName: (type: EntityType, id: string) => {
    if (type === 'faction') return factionById.get(id)?.name;
    if (type === 'lord') return lordById.get(id)?.name;
    if (type === 'hero') return heroById.get(id)?.name;
    if (type === 'unit') return unitById.get(id)?.name;
    return undefined;
  },
  search: (query: string): SearchResult[] => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return [
      ...factions.map((item) => ({ type: 'faction' as const, id: item.id, name: item.name, detail: item.subtitle })),
      ...lords.map((item) => ({ type: 'lord' as const, id: item.id, name: item.name, detail: '군주' })),
      ...heroes.map((item) => ({ type: 'hero' as const, id: item.id, name: item.name, detail: item.category })),
      ...units.map((item) => ({ type: 'unit' as const, id: item.id, name: item.name, detail: item.classification.category })),
    ].filter((item) => {
      const character = item.type === 'lord' ? lordById.get(item.id) : item.type === 'hero' ? heroById.get(item.id) : undefined;
      return `${item.name} ${item.id} ${item.detail} ${character?.subtypeKey ?? ''} ${character?.subtypeAliases.join(' ') ?? ''}`.toLocaleLowerCase().includes(term);
    });
  },
};
