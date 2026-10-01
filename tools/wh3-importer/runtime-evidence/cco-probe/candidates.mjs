import { EvidenceProbe, connected, rawFact } from '../../blocker-review/evidence.mjs';
import { verifyIndex } from '../static-index.mjs';
import { digest, snapshotIdentity } from '../contract.mjs';

export const P0 = Object.freeze([
  'wh_main_vmp_veh_black_coach', 'wh2_dlc09_tmb_veh_skeleton_chariot_0',
  'wh2_dlc13_lzd_mon_dread_saurian_1', 'wh2_dlc11_cst_mon_necrofex_colossus_0',
]);
// These are processed-schema relationships, not key/suffix matching.
export async function inspectExtraComponents(source, index) {
  verifyIndex(index);
  if (digest(snapshotIdentity(source.metadata)) !== index.snapshotId) throw new Error('CA source snapshot differs from prepared runtime evidence.');
  const p = new EvidenceProbe(source, { maxRows: 500, maxQueries: 100 });
  await p.select('main_units_tables', 'unit', P0);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  await p.reverse('land_units_to_extra_engines_tables', 'land_unit', 'land_units_tables');
  await p.forward('land_units_to_extra_engines_tables', 'battle_engine', 'battlefield_engines_tables');
  await p.forward('land_units_tables', 'engine', 'battlefield_engines_tables');
  await p.forward('land_units_tables', 'articulated_record', 'land_unit_articulated_vehicles_tables');
  await p.forward('battlefield_engines_tables', 'battle_entity', 'battle_entities_tables');
  await p.forward('battlefield_engines_tables', 'missile_weapon', 'missile_weapons_tables');
  // Follow every actual entity reference on the selected articulated rows.
  for (const table of await source.reader.tables('land_unit_articulated_vehicles_tables')) {
    for (const f of table.fields.filter(f => f.is_reference?.[0]?.replace(/_tables$/, '') === 'battle_entities'))
      await p.forward('land_unit_articulated_vehicles_tables', f.name, 'battle_entities_tables');
  }
  await p.forward('missile_weapons_tables', 'default_projectile', 'projectiles_tables');
  await p.reverse('missile_weapons_to_projectiles_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.forward('missile_weapons_to_projectiles_tables', 'projectile', 'projectiles_tables');
  return p.artifact();
}

export function buildCandidateManifest(index, extraEvidence) {
  verifyIndex(index);
  if (digest(snapshotIdentity(extraEvidence?.provenance)) !== index.snapshotId) throw new Error('Supplemental evidence snapshot drift.');
  const units = P0.map(mainKey => {
    const matches = index.subjects.filter(s => s.sourceMainKey === mainKey && s.contextId === null);
    if (matches.length !== 1 || !matches[0].entity || !matches[0].missile) throw new Error(`Missing exact P0 subject ${mainKey}.`);
    const subject = structuredClone(matches[0]);
    const roots = extraEvidence.rows.filter(r => r.table === 'main_units_tables' && r.row.unit === mainKey);
    const lands = roots.length === 1 ? connected(extraEvidence, roots[0], 'land_unit', 'land_units_tables') : [];
    if (lands.length !== 1 || lands[0].row.row.key !== subject.sourceLandKey) throw new Error(`P0 main/land identity drift ${mainKey}.`);
    const land = lands[0].row;
    const extraRows = extraEvidence.rows.filter(r => r.table === 'land_units_to_extra_engines_tables' && connected(extraEvidence, r, 'land_unit', 'land_units_tables').some(x => x.row.id === land.id));
    const extraEngines = extraRows.map(row => {
      const engines = connected(extraEvidence, row, 'battle_engine', 'battlefield_engines_tables');
      return { origin: row, attachArticulation: rawFact(extraEvidence, row, 'attach_articulation'), edges: engines.map(x => x.edge),
        engines: engines.map(({ row: engine, edge }) => ({ row: engine, entity: connected(extraEvidence, engine, 'battle_entity', 'battle_entities_tables'),
          weapons: connected(extraEvidence, engine, 'missile_weapon', 'missile_weapons_tables').map(({ row: weapon, edge: weaponEdge }) => ({
            pathId: JSON.stringify([mainKey, 'EXTRA_ENGINE', row.id, engine.id, weapon.id]), weaponKey: weapon.row.key, row: weapon,
            edges: [lands[0].edge, ...connected(extraEvidence, row, 'land_unit', 'land_units_tables').map(x => x.edge), edge, weaponEdge],
            Precursor: rawFact(extraEvidence, weapon, 'precursor'), UseSecondaryAmmoPool: rawFact(extraEvidence, weapon, 'use_secondary_ammo_pool'),
            ProjectileContextList: [
              ...connected(extraEvidence, weapon, 'default_projectile', 'projectiles_tables'),
              ...extraEvidence.rows.filter(r => r.table === 'missile_weapons_to_projectiles_tables' && connected(extraEvidence, r, 'missile_weapon', 'missile_weapons_tables').some(x => x.row.id === weapon.id))
                .flatMap(r => connected(extraEvidence, r, 'projectile', 'projectiles_tables')),
            ].map(x => ({ key: x.row.row.key, row: x.row, edge: x.edge })),
          })),
        })),
      };
    });
    const entityPaths = subject.entity.paths;
    const missilePaths = subject.missile.paths;
    const extraEntityPaths = extraEngines.flatMap(x => x.engines.flatMap(engine => engine.entity.map(e => ({
      pathId: JSON.stringify([mainKey, 'EXTRA_ENGINE', x.origin.id, engine.row.id, e.row.id]), role: 'EXTRA_ENGINE', entityKey: e.row.row.key,
      origin: x.origin, entity: e.row, edges: [lands[0].edge, ...connected(extraEvidence, x.origin, 'land_unit', 'land_units_tables').map(x => x.edge), ...x.edges, e.edge], provenance: { kind: 'DIRECT', evidence: 'Processed CA schema references' },
    }))));
    const extraMissilePaths = extraEngines.flatMap(x => x.engines.flatMap(engine => engine.weapons.map(w => ({
      ...w, role: 'EXTRA_ENGINE', sourceMainKey: mainKey, sourceLandKey: subject.sourceLandKey,
      activation: { active: 'UNKNOWN', precedence: 'UNRESOLVED', combination: 'UNRESOLVED' },
    }))));
    const views = {
      ManEntityContext: entityPaths.filter(p => p.role === 'MAN'), MountRecordContext: entityPaths.filter(p => p.role === 'MOUNT'),
      EngineRecordContext: entityPaths.filter(p => p.role === 'ENGINE'), ExtraEnginesList: extraEngines,
      ArticulatedRecordContext: entityPaths.filter(p => p.role === 'ARTICULATED'),
      Attachments: entityPaths.filter(p => p.role === 'PERSONALITY_ATTACHMENT'),
      AllEntitySources: [...entityPaths, ...extraEntityPaths],
      PrimaryMissileWeaponContext: missilePaths.filter(p => p.role === 'LAND_PRIMARY'),
      EngineMissileWeaponContext: missilePaths.filter(p => p.role === 'ENGINE'),
      AllMissileSources: [...missilePaths.map(p => ({ ...p, ProjectileContextList: p.projectilePaths,
        Precursor: p.rawWeaponFlags.precursor, UseSecondaryAmmoPool: p.rawWeaponFlags.use_secondary_ammo_pool })), ...extraMissilePaths],
      PrimaryAmmo: subject.missile.ammo.primary_ammo, SecondaryAmmo: subject.missile.ammo.secondary_ammo,
    };
    const incomplete = extraEvidence.issues.length || [subject.entity.completeness, subject.missile.completeness].includes('INCOMPLETE_DB_CHAIN') ||
      extraEngines.some(x => x.engines.length !== 1 || x.engines.some(e => e.entity.length !== 1 || (e.row.row.missile_weapon && !e.weapons.length) || e.weapons.some(w => !w.ProjectileContextList.length)));
    return { sourceMainKey: mainKey, sourceLandKey: subject.sourceLandKey, contextId: null, displayName: subject.displayName, subject, views,
      extraEngineCoverage: extraEvidence.coverage.filter(c => c.query.table === 'land_units_to_extra_engines_tables'),
      status: incomplete ? 'INCOMPLETE_DB_CHAIN' : 'STATIC_CANDIDATES_PRESERVED', productionEligible: false };
  });
  const body = { format: 'warhammer-vault-cco-candidates-v1', snapshotId: index.snapshotId, snapshot: index.snapshot, units, extraEvidence,
    productionEligible: false, fieldAdmission: 'DISABLED' };
  return { ...body, integrity: digest(body) };
}
export function verifyCandidates(manifest) {
  const { integrity, ...body } = manifest ?? {};
  if (body.format !== 'warhammer-vault-cco-candidates-v1' || digest(body) !== integrity || !Array.isArray(body.units) ||
      body.units.length !== P0.length || new Set(body.units.map(u => u.sourceMainKey)).size !== P0.length || body.units.some(u => !P0.includes(u.sourceMainKey))) throw new Error('Invalid/changed P0 candidate manifest.');
  return manifest;
}
