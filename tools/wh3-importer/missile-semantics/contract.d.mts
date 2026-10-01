import type { RawInspection, RawTrace } from '../normalization/normalizer.mjs';

export type MissileRole = 'LAND_PRIMARY' | 'ENGINE' | 'RIDER' | 'MAIN_SPECIFIC_JUNCTION' | 'JUNCTION_STATS_OVERRIDE';
export type MissileCompleteness = 'COMPLETE_STATIC_SINGLE' | 'STRUCTURE_KNOWN_RUNTIME_UNRESOLVED' | 'INCOMPLETE_DB_CHAIN' | 'NO_MISSILE_PATH' | 'UNKNOWN_APPLICABILITY';
export type MissileSourceContract = {
  format: 'warhammer-vault-missile-sources-v1'; source: { mainKey: string; landKey: string; mainFact: unknown; landFact: unknown; mainToLand: unknown };
  sourceKind: RawInspection['sourceKind']; provenance: RawInspection['provenance'];
  paths: { pathId: string; role: MissileRole; sourceMainKey: string; sourceLandKey: string;
    origin: { rowId: string; table: string; raw: Record<string, unknown> }; owner: Record<string, unknown>;
    weaponKey: string | null; weaponRowId: string | null; projectilePaths: { kind: string; key: string; rowId: string; edges: unknown[] }[];
    edges: unknown[]; rawWeaponFlags: Record<string, unknown> | null; condition: unknown;
    activation: { placement: 'STATIC_PRIMARY' | 'STATIC_COMPONENT' | 'CONDITIONAL' | 'RUNTIME_UNRESOLVED'; active: 'UNKNOWN'; precedence: 'UNRESOLVED'; combination: 'UNRESOLVED' };
    provenance: { kind: 'DIRECT'; evidence: string } }[];
  ammo: Record<string, unknown>; rawCounts: { weaponReferencePaths: number; attachmentRows: number; policy: string };
  ammoSemantics: { displayConversion: 'UNRESOLVED'; consumption: 'UNRESOLVED'; poolSharing: 'UNRESOLVED'; attachmentScaling: 'NOT_AUTHORIZED' };
  issues: unknown[]; completeness: MissileCompleteness; structure: 'INCOMPLETE' | 'COMPLETE_IN_BOUNDED_SCOPE';
  staticMultiplicity: 'NONE' | 'SINGLE' | 'MULTI'; runtimeRequired: boolean;
  presentation: { singleBlockSafe: boolean; reason: string }; policy: string;
  conditionEvidence: { rowIds: string[]; edges: unknown[]; unavailableSources: unknown[]; scope: string };
};
export type MissileInspection = { evidence: RawInspection & { coverage: unknown[]; issues: unknown[] }; contract: MissileSourceContract };
export function missileSourceContract(evidence: MissileInspection['evidence'], expected: { mainKey: string; landKey: string }): MissileSourceContract;
export function verifyMissileInspection(inspection: MissileInspection, dump: RawTrace): MissileSourceContract;
export function summarizeMissileSources(contracts: MissileSourceContract[]): Record<string, unknown>;
