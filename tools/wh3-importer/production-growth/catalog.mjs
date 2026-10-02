// Exact display names observed in the reviewed local_en.pack inventory.
// No CA keys, paid policies or fallback names are discovery inputs.
const definitions=[
  ['02',[
    ['Peasant Mob','bretonnia'],['Men-at-Arms','bretonnia'],['Men-at-Arms (Shields)','bretonnia'],
    ['Spearmen-at-Arms','bretonnia'],['Spearmen-at-Arms (Shields)','bretonnia'],['Battle Pilgrims','bretonnia'],
    ['Peasant Bowmen','bretonnia'],['Peasant Bowmen (Fire Arrows)','bretonnia'],['Peasant Bowmen (Pox Arrows)','bretonnia'],
    ['Knights Errant','bretonnia'],['Grail Guardians','bretonnia'],['Mounted Yeomen Archers','bretonnia'],['Royal Pegasus Knights','bretonnia'],
    ['Field Trebuchets','bretonnia'],['Blessed Field Trebuchets','bretonnia'],
    ['Flagellants','empire'],['Crossbowmen','empire'],['Outriders','empire'],['Hochland Long Rifles','empire'],['Nuln Ironsides','empire'],
    ['Teutogen Guard','empire'],['Warriors of Ulric','empire'],['Wolf-kin','empire'],['Knights of the Black Rose','empire'],
  ]],
  ['03',[
    ['Clanrat Spears','skaven'],['Clanrat Spears (Shields)','skaven'],['Plague Monk Censer Bearers','skaven'],['Eshin Triads','skaven'],['Warp-Grinders','skaven'],
    ['Gutter Runners','skaven'],['Gutter Runners (Poison)','skaven'],['Night Runners','skaven'],['Night Runners (Slings)','skaven'],
    ['Gutter Runner Slingers','skaven'],['Gutter Runner Slingers (Poison)','skaven'],['Warplock Jezzails','skaven'],
    ['Poisoned Wind Globadiers','skaven'],['Death Globe Bombardiers','skaven'],['Poisoned Wind Mortars','skaven'],['Skavenslave Slingers','skaven'],['Warpfire Throwers','skaven'],
    ['Plagueclaw Catapults','skaven'],['Warp Lightning Cannons','skaven'],
    ['Skeleton Archers','tomb_kings'],['Ushabti (Great Bows)','tomb_kings'],['Nehekharan Warriors','tomb_kings'],['Skeleton Horsemen','tomb_kings'],['Screaming Skull Catapults','tomb_kings'],
  ]],
  ['04',[
    ['Saurus Warriors','lizardmen'],['Saurus Spears','lizardmen'],['Saurus Spears (Shields)','lizardmen'],['Red Crested Skinks','lizardmen'],
    ['Skink Cohort','lizardmen'],['Skink Cohort (Javelins)','lizardmen'],['Chameleon Skinks','lizardmen'],['Skink Skirmishers','lizardmen'],
    ['Feral Bastiladon','lizardmen'],['Feral Stegadon','lizardmen'],['Ancient Salamander','lizardmen'],['Cold One Riders','lizardmen'],['Cold One Spear-Riders','lizardmen'],
    ['Black Knights','vampire_counts'],['Blood Knights','vampire_counts'],
    ['Syreens','vampire_coast'],['Animated Hulks','vampire_coast'],['Scurvy Dogs','vampire_coast'],['Deck Gunners','vampire_coast'],
    ['Zombie Pirate Gunnery Mob (Handgunners)','vampire_coast'],['Carronades','vampire_coast'],
    ['Chosen (Halberds)','warriors_of_chaos'],['Forsaken','warriors_of_chaos'],['Chaos Giant','warriors_of_chaos'],
  ]],
];
export const growthCatalogs=Object.fromEntries(definitions.map(([n,names])=>[`expansion-batch-${n}`,names.map(([displayName,expectedFactionId],i)=>({
  slug:`expansion-${n}-${String(i+1).padStart(2,'0')}`,displayName,expectedFactionId}))]));
export function validateGrowthCatalog(catalog) {
  if(!Array.isArray(catalog)||!catalog.length||catalog.length>24)throw Error('Growth batch requires 1–24 exact names');
  for(const key of ['slug','displayName'])if(new Set(catalog.map(c=>c[key])).size!==catalog.length)throw Error('Duplicate growth catalog identity');
  for(const c of catalog)if(!/^expansion-0[2-5]-\d{2}$/.test(c.slug)||!c.displayName?.trim()||!c.expectedFactionId||
    Object.keys(c).some(k=>!['slug','displayName','expectedFactionId'].includes(k)))throw Error('Growth catalog cannot inject CA keys or selection policies');
}
