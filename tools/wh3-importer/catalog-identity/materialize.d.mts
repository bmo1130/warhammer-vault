import type { Unit } from '../../../src/domain/unit';
import type { UnitValidationIssue } from '../../../src/domain/unitValidation';
import type { NormalizedUnitResult, NormalizationContext, RawTrace } from '../normalization/normalizer.mjs';
import type { CatalogCandidate, CatalogDecision, CatalogEvidence, CatalogIdentityReview, SourceIdentity, CatalogPresentation, IdentityFact } from './policy.mjs';

export type CatalogRequest = { mainKey: string; contextId: string };
export type MaterializationStatus = 'MATERIALIZED' | 'BLOCKED_POLICY' | 'BLOCKED_SOURCE_DRIFT' | 'BLOCKED_TRACE' | 'BLOCKED_NORMALIZATION' | 'BLOCKED_VALIDATION' | 'BLOCKED_ID_COLLISION';
export type DiagnosticValidation = { registryIds: string[]; issues: UnitValidationIssue[]; passed: boolean };
export type CatalogRawSource = {
  reader: { tables(name: string): Promise<unknown[]> }; schema: { definitions: Record<string, unknown[]> };
  localisation: { sourcePack: string; path: string; rows: Record<string, unknown>[] };
  metadata: { sourceKind: 'ca-pack' | 'fixture'; [key: string]: unknown }; supplementalLocalisations?: unknown[];
};
export type MaterializationOptions = { decisions?: CatalogDecision[]; diagnosticFactionIds?: readonly string[];
  productionFactionIds?: readonly string[]; usedIds?: Set<string>; idMappings?: NormalizationContext['idMappings'] };
export type MaterializationResult = {
  format: 'warhammer-vault-catalog-materialization-v1'; request: Partial<CatalogRequest>;
  status: MaterializationStatus; quality: 'CLEAN' | 'PARTIAL' | 'BLOCKED'; stage: string;
  plan: { status: 'CATALOG_PLAN_READY'; source: SourceIdentity; presentation: CatalogPresentation; selectedKey: string; unitMaterialized: false } | null;
  planEvidence?: { candidate: CatalogCandidate['candidate']; decision: CatalogCandidate['decision']; evidence: CatalogEvidence; provenance: Record<string, unknown> };
  tracedIdentity: (Pick<SourceIdentity, 'mainKey' | 'landKey' | 'localisationKey' | 'mainFact' | 'landFact' | 'mainToLand'> & { localisationFact: IdentityFact | null }) | null;
  traced: boolean; normalizationCompleted: boolean; dump?: RawTrace;
  normalized: NormalizedUnitResult | null; unit: Unit | null; rejectedNormalization?: NormalizedUnitResult;
  omissions: NormalizedUnitResult['omitted']; unmapped: NormalizedUnitResult['unmapped']; provenance: NormalizedUnitResult['provenance'] | null;
  validation: { diagnostic: DiagnosticValidation | null; production: DiagnosticValidation | null };
  productionEligible: false; productionReasons: string[]; error: { stage: string; reason: string; name: string } | null;
};
export const diagnosticFactionIds: readonly string[];
export function materializeCatalogRequest(source: CatalogRawSource, review: CatalogIdentityReview, request: Partial<CatalogRequest> | undefined,
  validate: (units: readonly Unit[], factionIds: Iterable<string>) => UnitValidationIssue[], options?: MaterializationOptions): Promise<MaterializationResult>;
export function summarizeMaterializations(results: MaterializationResult[]): Record<string, unknown>;
