import projection from '../data/archiveLocalisations.json';
type Named = {id: string; name: string; gameVersion: string};
export type ArchiveNameType = 'faction' | 'lord' | 'hero' | 'legacy_lord' | 'legacy_hero';
const byId = new Map(projection.admissions.map(a => [`${a.type}:${a.id}`, a]));

export function localiseArchiveName<T extends Named>(item: T, type: ArchiveNameType): T {
  const a = byId.get(`${type}:${item.id}`);
  if (!a) return item;
  if (item.gameVersion !== projection.gameVersion || item.name !== a.originalName) throw new Error(`Archive localisation identity drift: ${item.id}`);
  return {...item, name: a.name, ...(type === 'faction' && 'subtitle' in item && item.subtitle === a.originalName ? {subtitle: a.name} : {})};
}

export function archiveLocalisation(item: Named, type: ArchiveNameType) {
  const a = byId.get(`${type}:${item.id}`);
  return a && item.gameVersion === projection.gameVersion && item.name === a.name
    ? {...a, sourceHash: projection.sourceHash, sourcePack: projection.koreanPack.file_name, packHash: projection.koreanPack.sha256} : undefined;
}
export function archiveSearchNames(item: Named, type: ArchiveNameType) {
  const a = archiveLocalisation(item,type);
  return a ? `${a.englishName} ${a.originalName}` : '';
}
