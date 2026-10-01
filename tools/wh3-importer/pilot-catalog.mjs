// Selection intent, never CA roots or expected values. Names were checked in
// actual local_en.pack before choosing the final 24; raw results live separately.
export const representativeCatalog = [
  ['Grail Knights', 'heavy cavalry / core regression', ['mount', 'melee']],
  ['Helstorm Rocket Battery', 'multi-shot artillery / shared-name variant', ['engine', 'missile', 'identity']],
  ['Bloodthirster', 'flying monster / summoned candidate', ['battle_entity', 'ability', 'identity']],
  ['Swordsmen', 'ordinary shield infantry', ['shield', 'melee']],
  ['Spearmen (Shields)', 'shield and anti-large infantry', ['shield', 'melee']],
  ['Handgunners', 'ranged infantry / Imperial Supply candidate', ['missile', 'identity']],
  ['Free Company Militia', 'melee and missile infantry', ['melee', 'missile']],
  ['Mounted Yeomen', 'light mounted cavalry', ['mount', 'battle_entity']],
  ['Pegasus Knights', 'flying mounted cavalry', ['mount', 'attribute']],
  ['Crypt Horrors', 'monstrous infantry / cross-faction and summoned variants', ['battle_entity', 'identity']],
  ['Dragon Ogres', 'large multi-entity infantry', ['battle_entity', 'melee']],
  ['Necrofex Colossus', 'composite monster with rider missile', ['mount', 'missile']],
  ['Steam Tank', 'mobile war machine / multiple identity candidates', ['mount', 'engine', 'missile']],
  ['Black Coach', 'single engine chariot with draught mount', ['mount', 'engine', 'ability']],
  ['Skeleton Chariots', 'multiple chariots and riders', ['mount', 'engine']],
  ['Ratling Guns', 'burst-fire weapon team candidate', ['missile', 'battle_entity']],
  ['Doom-Flayers', 'engine and crew melee machine', ['engine', 'battle_entity']],
  ['Chaos Warhounds', 'small fast entities / cross-family identity', ['battle_entity', 'identity']],
  ['Hexwraiths', 'special movement / mounted cross-faction variants', ['mount', 'attribute', 'identity']],
  ['Flamers of Tzeentch', 'special missile / prologue variant candidate', ['missile', 'identity']],
  ['The Royal Altdorf Gryphites (Demigryph Knights)', 'RoR mounted variant', ['mount', 'variant']],
  ['The Sternsmen (Grave Guard)', 'RoR infantry variant', ['ability', 'variant']],
  ['Zombies', 'summoned and ordinary shared localisation', ['identity', 'ability']],
  ['Dread Saurian', 'large composite monster / positive ammo without primary weapon', ['mount', 'missile', 'battle_entity']],
].map(([displayName, reason, expectedCoverage], index) => ({ slug: `sample-${String(index + 1).padStart(2, '0')}`, displayName, reason, expectedCoverage }));

// Explicit editorial aliases of permission groups observed in preflight. These
// are pilot-only and do not add production factions. Never choose the first
// recognized group when more than one alias is present.
export const pilotAffiliations = {
  wh_main_group_bretonnia: 'bretonnia', wh_main_group_empire: 'empire',
  wh3_main_kho: 'khorne', wh_main_group_chaos: 'warriors_of_chaos',
  wh2_dlc11_group_vampire_coast: 'vampire_coast',
  wh_main_group_vampire_counts: 'vampire_counts',
  wh2_dlc09_tomb_kings: 'tomb_kings', wh2_main_skv: 'skaven',
  wh2_main_lzd: 'lizardmen',
};

export function validateCatalog(catalog) {
  if (!Array.isArray(catalog) || !catalog.length || catalog.length > 30) throw new Error('Pilot requires 1–30 samples; full import is forbidden.');
  for (const key of ['slug', 'displayName']) if (new Set(catalog.map(x => x[key])).size !== catalog.length) throw new Error(`Duplicate catalog ${key}.`);
  for (const item of catalog) {
    if (!/^[a-z0-9-]+$/.test(item.slug) || !item.displayName?.trim() || !item.reason || !Array.isArray(item.expectedCoverage)) throw new Error('Invalid pilot catalog entry.');
    if (Object.keys(item).some(key => !['slug', 'displayName', 'reason', 'expectedCoverage'].includes(key))) throw new Error('Catalog cannot inject keys, root policies or profiles.');
  }
}
