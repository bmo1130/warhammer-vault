// Bounded 9.0.2 refresh only. See SNAPSHOT-9.0.2.md for the raw-row/graph
// comparison. This approves no new mapping, formula or runtime semantics.
export const hotfixSnapshot = Object.freeze({
  gameVersion: '9.0.2.0',
  schemaSha256: '5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4',
  packs: Object.freeze({
    'db.pack': 'd0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723',
    'local_en.pack': 'f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a',
  }),
});

export function isReviewedSource(provenance, legacyVersion) {
  // Preserve the pre-existing historical policy and saved 9.0.1 replay.
  if (provenance?.gameVersion === legacyVersion) return true;
  if (provenance?.gameVersion !== hotfixSnapshot.gameVersion || provenance.schemaSha256 !== hotfixSnapshot.schemaSha256) return false;
  const packs = provenance.packs;
  return Array.isArray(packs) && packs.length === 2 &&
    packs.every(p => p && Object.hasOwn(hotfixSnapshot.packs, p.file_name) && hotfixSnapshot.packs[p.file_name] === p.sha256) &&
    new Set(packs.map(p => p.file_name)).size === 2;
}
