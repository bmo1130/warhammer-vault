// Small, purpose-selected research samples; separate from the three supported
// unit profiles. No CA key/stat expectation and no all-unit loop.
export const researchProfiles = {
  swordsmen: { displayName: 'Swordsmen', slug: 'swordsmen', scopes: [], rootSelection: 'unique', research: true },
  // Actual discovery found ordinary and zero-cost Imperial Supply roots.
  // This policy is specific to this sample, never a playable-unit definition.
  handgunners: { displayName: 'Handgunners', slug: 'handgunners', scopes: ['missile'], rootSelection: 'paid-recruitment', research: true },
  helblaster: { displayName: 'Helblaster Volley Guns', slug: 'helblaster', scopes: ['missile'], rootSelection: 'paid-recruitment', research: true },
};
export function getResearchProfile(name) {
  if (!Object.hasOwn(researchProfiles, name)) throw new Error(`Unknown research profile: ${name}. Choose ${Object.keys(researchProfiles).join(', ')}.`);
  return researchProfiles[name];
}
