import type { Unit } from '../../../src/domain/unit';

export type MappingKind = 'DIRECT' | 'GENERATED' | 'CURATED' | 'DERIVED_CONFIRMED' | 'UNRESOLVED';
export type RawRow = { id: string; table: string; key: Record<string, unknown>; sourcePack: string; sourcePackPath: string; path: string; tableVersion: number; row: Record<string, unknown> };
export type RawSchema = { table: string; version: number; fields: { name: string; is_key?: boolean; is_reference?: [string, string] | null }[] };
export type RawJoin = { from: string; field: string; to: string; targetField: string; value: unknown; direction?: string; evidence: string; traversal?: string };
export type RawTrace = {
  format: string; sourceKind: 'ca-pack' | 'fixture'; rootRow: string;
  unit: { caKey: string; gameVersion: string; displayName: string; extractedAt: string };
  discovery?: { profile: string; policy: string; candidates: unknown[] };
  rows: RawRow[]; schemas: RawSchema[]; relationships: RawJoin[]; provenance: Record<string, unknown>;
};
export type RawInspection = Pick<RawTrace, 'format' | 'sourceKind' | 'rows' | 'schemas' | 'relationships' | 'provenance'>;
export type FieldSource = {
  rowId: string; table: string; rowKey: Record<string, unknown>; field: string;
  sourcePack: string; sourcePackPath: string; path: string; schemaVersion: number; joins: RawJoin[];
};
export type RawFact = { value: unknown; source: FieldSource };
export type FieldProvenance = { field: string; value: unknown; rawValue: unknown; kind: Exclude<MappingKind, 'UNRESOLVED'>; source: FieldSource; note: string; evidence: RawFact[] };
export type NormalizedUnitResult = {
  format: 'warhammer-vault-normalized-unit-v1'; mode: 'conservative'; sourceKind: RawTrace['sourceKind']; unit: Unit;
  provenance: {
    identity: { internalId: string; caMainUnitKey: string; caLandUnitKey: string; primaryCatalogGroup: string; candidateMilitaryGroups: string[] };
    rawTrace: Record<string, unknown>; affiliationEvidence: Record<string, unknown>;
    fields: FieldProvenance[]; generatedMetadata: { field: string; value: unknown; origin: string }[]; baseValuesOnly: true;
  };
  facts: RawFact[];
  omitted: { field: string; kind: 'UNRESOLVED'; semanticsStatus: string; reason: string }[];
  warnings: { code: string; reason: string }[];
  unmapped: { kind: 'ability' | 'attribute'; caId: string; reason: string; source: FieldSource }[];
};
export type NormalizationContext = {
  factionId: string; militaryGroup: string; permissionTrace: RawInspection;
  idMappings?: { abilities: Record<string, string>; attributes: Record<string, string>; movement: Record<string, { field: string; value: boolean }> };
};
export function normalizeUnit(dump: RawTrace, context: NormalizationContext): NormalizedUnitResult;
