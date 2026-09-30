// Entity keys also define EntityType and the accepted backup target types.
export const entityRoutes = {
  faction: 'factions',
  lord: 'lords',
  hero: 'heroes',
  unit: 'units',
  research: 'research',
  building: 'buildings',
  landmark: 'landmarks',
} as const;

export type EntityType = keyof typeof entityRoutes;

export const pathFor = (type: EntityType, id: string) => `/${entityRoutes[type]}/${encodeURIComponent(id)}`;
export const typeName = (type: EntityType) => ({ faction: '팩션', lord: '군주', hero: '영웅', unit: '유닛', research: '연구', building: '건물', landmark: '랜드마크' })[type];
