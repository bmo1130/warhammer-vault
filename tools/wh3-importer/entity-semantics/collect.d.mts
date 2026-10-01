import type { CatalogRawSource } from '../catalog-identity/materialize.mjs';
import type { RawTrace } from '../normalization/normalizer.mjs';
import type { EntityInspection } from './contract.mjs';
export function inspectEntityStructure(source: CatalogRawSource, dump: RawTrace): Promise<EntityInspection>;
export function inspectUnitSizeEvidence(source: CatalogRawSource): Promise<{ status: 'UNRESOLVED'; evidence: EntityInspection['evidence']; applicationToSourceCounts: 'UNRESOLVED'; reason: string }>;
