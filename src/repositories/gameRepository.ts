import factionsJson from '../data/factions.json';
import lordsJson from '../data/lords.json';
import heroesJson from '../data/heroes.json';
import rostersJson from '../data/factionRosters.json';
import characterAliases from '../data/characterAliases.json';
import legacyCharacters from '../data/legacyCharacters.json';
import unitsJson from '../data/units.json';
import type { EntityType, Faction, Lord, Hero, Unit } from '../domain/types';
import { localiseUnit, originalUnitName } from './unitLocalisation';
import { applyUnitAttributes } from './unitAttributes';
import { applyUnitPassives } from './unitPassives';
import { applyUnitEntities } from './unitEntities';
import { applyUnitSpeed } from './unitSpeed';
import { localiseArchiveName, archiveSearchNames } from './archiveLocalisation';

const factions: Faction[] = factionsJson.map(f => localiseArchiveName(f,'faction'));
const lords: Lord[] = (lordsJson as Lord[]).map(c => localiseArchiveName(c,'lord'));
const heroes: Hero[] = (heroesJson as Hero[]).map(c => localiseArchiveName(c,'hero'));
// JSON imports widen enum strings. The promotion gate and dataset tests run the
// actual Unit validator; this assertion only restores the declared enum types.
const units: Unit[] = (unitsJson as Unit[]).map(localiseUnit).map(applyUnitAttributes).map(applyUnitPassives).map(applyUnitEntities).map(applyUnitSpeed);

const factionById = new Map(factions.map((item) => [item.id, item]));
const lordById = new Map(lords.map((item) => [item.id, item]));
const heroById = new Map(heroes.map((item) => [item.id, item]));
const unitById = new Map(units.map((item) => [item.id, item]));
const legacyLords = new Map((legacyCharacters.filter(c => c.entityType === 'lord') as unknown as Lord[]).map(c => [c.id, localiseArchiveName(c,'legacy_lord')]));
const legacyHeroes = new Map((legacyCharacters.filter(c => c.entityType === 'hero') as unknown as Hero[]).map(c => [c.id, localiseArchiveName(c,'legacy_hero')]));
const lordBySubtype = new Map(lords.flatMap(c => [c.subtypeKey,...c.subtypeAliases].map(key => [key,c] as const)));

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
// Newly reviewed race membership may include an existing Unit. Its admitted
// facts remain immutable; the reviewed inventory supplies this membership.
for (const roster of rostersJson.rosters) for (const entry of roster.units) {
  const item = unitById.get(entry.id);
  if (item && !(unitsByFaction.get(roster.factionId) ?? []).some(u => u.id === item.id)) {
    const items = unitsByFaction.get(roster.factionId) ?? [];
    items.push(item); unitsByFaction.set(roster.factionId, items);
  }
}
const heroesByFaction = indexByFaction(heroes);
const rosterByFaction = new Map(rostersJson.rosters.map(r => [r.factionId, r]));
export const rosterCategories = ['legendaryLords', 'genericLords', 'specialLords', 'legendaryHeroes', 'genericHeroes', 'specialHeroes', 'units'] as const;
export type RosterCategory = typeof rosterCategories[number];

export type SearchResult = { type: 'faction' | 'lord' | 'hero' | 'unit'; id: string; name: string; detail: string };

export const gameRepository = {
  listFactions: () => factions,
  listLords: () => lords,
  listHeroes: () => heroes,
  getLordBySubtype: (key: string) => lordBySubtype.get(key),
  getFaction: (id: string) => factionById.get(id),
  getLord: (id: string) => lordById.get(characterAliases.find(a => a.id === id && a.entityType === 'lord')?.canonicalId ?? id) ?? legacyLords.get(id),
  getHero: (id: string) => heroById.get(characterAliases.find(a => a.id === id && a.entityType === 'hero')?.canonicalId ?? id) ?? legacyHeroes.get(id),
  getLegacyCharacterReason: (type: 'lord' | 'hero', id: string) => legacyCharacters.find(c => c.entityType === type && c.id === id)?.exclusionReason,
  getCharacterAliases: (type: 'lord' | 'hero', canonicalId: string) => characterAliases.filter(a => a.entityType === type && a.canonicalId === canonicalId),
  getUnit: (id: string) => unitById.get(id),
  getUnitFactionIds: (id: string) => [...new Set([...(unitById.get(id)?.factionIds ?? (unitById.get(id) ? [unitById.get(id)!.factionId] : [])), ...rostersJson.rosters.filter(r => r.units.some(u => u.id === id)).map(r => r.factionId)])],
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
        return item && item.gameVersion !== 'sample' && (category === 'units' || (item.factionIds ?? [item.factionId]).includes(id)) && (category === 'units' || ('characterKind' in item && 'characterKind' in e && item.characterKind === e.characterKind && 'subtypeKey' in e && 'subtypeAliases' in e && item.subtypeKey === e.subtypeKey && JSON.stringify(item.subtypeAliases) === JSON.stringify(e.subtypeAliases) && !item.name.includes('{{tr:')));
      }).length;
      return { category, admitted, expected: entries.length };
    });
    return { status: counts.every(c => c.admitted === c.expected) && roster.holds.length === 0 ? 'ROSTER COMPLETE' : 'HOLD', sourceStatus: roster.sourceStatus, holds: roster.holds, counts, exclusions: roster.explicitlyExcludedCount, gameVersion: rostersJson.gameVersion };
  },
  getEntityName: (type: EntityType, id: string) => {
    if (type === 'faction') return factionById.get(id)?.name;
    if (type === 'lord') return (lordById.get(characterAliases.find(a => a.id === id && a.entityType === type)?.canonicalId ?? id) ?? legacyLords.get(id))?.name;
    if (type === 'hero') return (heroById.get(characterAliases.find(a => a.id === id && a.entityType === type)?.canonicalId ?? id) ?? legacyHeroes.get(id))?.name;
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
      const originalName = item.type === 'unit' ? originalUnitName(unitById.get(item.id)!) : '';
      const originalArchiveName = item.type === 'faction' ? archiveSearchNames(factionById.get(item.id)!,'faction') : character ? archiveSearchNames(character,item.type as 'lord'|'hero') : '';
      return `${item.name} ${originalName ?? ''} ${originalArchiveName} ${item.id} ${item.detail} ${character?.subtypeKey ?? ''} ${character?.subtypeAliases.join(' ') ?? ''}`.toLocaleLowerCase().includes(term);
    });
  },
};
