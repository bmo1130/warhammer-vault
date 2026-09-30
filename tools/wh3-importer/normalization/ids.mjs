// Explicit aliases for CA IDs observed in the actual traces. No prefix/name
// guessing. Unknown IDs remain in result.unmapped with their original source.
export const idMappings = {
  abilities: {
    wh_dlc07_unit_formation_lance: 'lance',
    wh_main_lord_passive_the_blessing_of_the_lady: 'blessing_of_the_lady',
    wh3_main_unit_passive_single_entity: 'wounds',
    wh3_main_unit_passive_daemonic_instability_khorne: 'daemonic_instability',
    // Current Loc is Banished!, distinct from the Banishment spell.
    wh3_main_unit_passive_daemonic_instability_khorne_ii: 'banished',
  },
  attributes: {
    fatigue_immune: 'perfect_vigour', hide_forest: 'stalk_in_forest',
    immune_to_psychology: 'immune_to_psychology', knight: 'knight',
    causes_fear: 'causes_fear', causes_terror: 'causes_terror', daemonic: 'daemon',
  },
  movement: {
    flying: { field: 'movement.canFly', value: true },
    cant_run: { field: 'movement.canRun', value: false },
  },
};
