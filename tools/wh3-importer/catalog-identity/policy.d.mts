import type { RawInspection, RawJoin } from '../normalization/normalizer.mjs';

export type CatalogClassification = 'PRIMARY_CATALOG_ENTRY' | 'CONTEXT_VARIANT' | 'SEPARATE_FACTION_ENTRY' | 'SUMMONED_OR_SCRIPTED_VARIANT' | 'PROLOGUE_OR_NONSTANDARD_CONTEXT';
export type CatalogContext = { contextId: string; factionId: string; context: string; classification: CatalogClassification; defaultVisible: boolean };
export type CatalogDecision = { mainKey: string; expectedLandKey: string; expectedLocalisationKey: string; presentations: CatalogContext[];
  checks: { table: string; via: string; target: 'main' | 'land'; equals: Record<string, string | number | boolean> }[];
  rule: 'EXPLICIT_FACTION_ROSTER' | 'EXPLICIT_CONTEXT_ONLY'; rationale: string;
  relationship?: { kind: 'EDITORIAL_CONTEXT_OF'; mainKey: string } };
export type SourceCandidate = { mainKey: string; landKey: string; localisation: { key: string; text: string; [field: string]: unknown }; [field: string]: unknown };
export type CatalogEvidence = Pick<RawInspection, 'sourceKind' | 'rows' | 'schemas' | 'relationships' | 'provenance'> & { issues?: unknown[] };
export type IdentityFact = { value: unknown; kind: 'DIRECT'; source: { rowId: string; table: string; field: string; rowKey: Record<string, unknown>; schemaVersion: number; sourcePack: string; path: string } };
export type SourceIdentity = { mainKey: string; landKey: string; localisationKey: string | null; displayName: string | null;
  mainFact: IdentityFact | null; landFact: IdentityFact | null; mainToLand: RawJoin | null };
export type CatalogPresentation = CatalogContext & { id: string; idKind: 'GENERATED'; sourceMainKey: string; kind: 'CURATED' };
export type CatalogCandidate = { candidate: SourceCandidate; source: SourceIdentity;
  statIdentity: { landKey: string; referenceVerified: boolean; sharedWithMainKeys: string[]; fullBattleProfileEquivalence: 'NOT_ESTABLISHED' };
  policyStatus: 'RESOLVED' | 'POLICY_STILL_UNRESOLVED'; reasons: string[]; presentations: CatalogPresentation[];
  decision: (CatalogDecision & { kind: 'CURATED'; checkedEvidence: unknown[] }) | null;
  relationship: CatalogDecision['relationship'] | null };
export type CatalogIdentityReview = { format: 'warhammer-vault-catalog-identity-v1'; policy: typeof catalogPolicy; candidates: CatalogCandidate[];
  evidence: CatalogEvidence; provenance: Record<string, unknown>; policyResolution: 'RESOLVED' | 'POLICY_STILL_UNRESOLVED';
  resolvedCandidates: number; unresolvedCandidates: number; importStatus: 'BLOCKED'; selectedKey: null; reason: string };
export const catalogPolicy: Readonly<{ id: string; defaultScope: string; contextScope: string; nameSelection: 'FORBIDDEN'; landMerge: 'FORBIDDEN'; runtimeAvailability: 'NOT_VERIFIED' }>;
export function catalogEntryId(mainKey: string, contextId: string): string;
export function validateDecisions(decisions: CatalogDecision[]): void;
export function classifyCatalogCandidates(candidates: SourceCandidate[], evidence: CatalogEvidence, decisions?: CatalogDecision[]): CatalogIdentityReview;
export function resolveCatalogRequest(review: CatalogIdentityReview, request?: { mainKey?: string; contextId?: string }):
  | { status: 'BLOCKED'; reason: string; selectedKey: null }
  | { status: 'CATALOG_PLAN_READY'; source: SourceIdentity; presentation: CatalogPresentation; selectedKey: string; unitMaterialized: false };
