// Requested localisation names only. No CA key, root selection or name fallback.
export const expansionCatalog = Object.freeze([
  ['Halberdiers','empire'],['Greatswords','empire'],
  ['Men-at-Arms (Polearms)','bretonnia'],['Knights of the Realm','bretonnia'],['Questing Knights','bretonnia'],['Foot Squires','bretonnia'],
  ['Clanrats (Shields)','skaven'],['Stormvermin (Halberds)','skaven'],['Plague Monks','skaven'],
  ['Grave Guard','vampire_counts'],['Grave Guard (Great Weapons)','vampire_counts'],['Black Knights (Lances & Barding)','vampire_counts'],['Vargheists','vampire_counts'],
  ['Tomb Guard','tomb_kings'],['Tomb Guard (Halberds)','tomb_kings'],['Ushabti','tomb_kings'],
  ['Saurus Warriors (Shields)','lizardmen'],['Temple Guards','lizardmen'],['Kroxigors','lizardmen'],
  ['Depth Guard','vampire_coast'],['Depth Guard (Polearms)','vampire_coast'],
  ['Chosen','warriors_of_chaos'],['Chosen (Great Weapons)','warriors_of_chaos'],['Chaos Knights (Lances)','warriors_of_chaos'],
].map(([displayName,expectedFactionId],i)=>Object.freeze({slug:`expansion-01-${String(i+1).padStart(2,'0')}`,displayName,expectedFactionId})));
export function validateExpansionCatalog(catalog) {
  if (!Array.isArray(catalog) || !catalog.length || catalog.length>24) throw new Error('Expansion requires 1–24 bounded candidates');
  for (const key of ['slug','displayName']) if(new Set(catalog.map(c=>c[key])).size!==catalog.length) throw new Error(`Duplicate expansion ${key}`);
  for (const c of catalog) if(!/^expansion-01-\d{2}$/.test(c.slug) || !c.displayName?.trim() || !c.expectedFactionId ||
    Object.keys(c).some(k=>!['slug','displayName','expectedFactionId'].includes(k))) throw new Error('Expansion catalog cannot inject CA keys, profiles or selection policies');
}
