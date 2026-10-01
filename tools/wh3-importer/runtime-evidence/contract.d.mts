/** Runtime observations never belong to CA DIRECT/GENERATED/CURATED field provenance. */
export type UnitSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'ULTRA' | 'NOT_RECORDED';
export type ObservationType = 'CARD_MODEL_COUNT' | 'CARD_HEALTH' | 'VISIBLE_COMPONENT_COUNT' | 'TARGETABLE_COMPONENT' | 'COMPONENT_CASUALTY' | 'COMPONENT_DEATH' | 'COMPONENT_WEAPON_DISABLE' | 'UNIT_SIZE_COMPARISON'
  | 'PROJECTILE_PROFILE_ACTIVE' | 'WEAPON_PATH_ACTIVE' | 'WEAPON_REPLACEMENT' | 'WEAPON_COEXISTENCE' | 'OVERRIDE_PRECEDENCE' | 'AMMO_POOL_CONSUMPTION' | 'AMMO_POOL_SHARING' | 'FIRE_IN_MELEE' | 'RIDER_LOSS_WEAPON_DISABLE'
  | 'RECRUITMENT_AVAILABLE' | 'SUMMONED_MAIN_IDENTITY' | 'SUMMONED_DURATION' | 'SUPPLY_VARIANT_AVAILABILITY' | 'ARKHAN_VARIANT_AVAILABILITY' | 'NONSTANDARD_SCENARIO_AVAILABILITY';
export interface ConditionState { status: 'KNOWN' | 'NOT_RECORDED'; activeKeys: string[]; labels: string[] }
export interface RuntimeSetup {
  battleMode: 'CUSTOM_BATTLE' | 'CAMPAIGN_BATTLE' | 'CAMPAIGN' | 'PROLOGUE' | 'NOT_RECORDED'; factionId: string; lord: string;
  skills: ConditionState; rituals: ConditionState; effects: ConditionState; technologies: ConditionState; buildings: ConditionState;
  summoned: 'YES' | 'NO' | 'UNKNOWN'; supplyVariant: 'YES' | 'NO' | 'UNKNOWN'; difficulty: string;
  mods: { status: 'NONE' | 'ENABLED' | 'NOT_RECORDED'; ids: string[] }; rank: number | null; saveReference: string; sessionPhase: string;
}
export type RuntimeResult = { result: 'INCONCLUSIVE'; notes?: string } | ({ result: 'CONCLUSIVE'; notes?: string } & (
  { value: number; unit: 'models' | 'hp' | 'seconds' } | { state: 'ACTIVE' | 'INACTIVE' | 'YES' | 'NO' | 'OBSERVED' | 'NOT_OBSERVED' } |
  { description: string } | { relationship: 'REPLACES' | 'COEXISTS' | 'PRECEDES' | 'SHARES' | 'SEPARATE' | 'DISABLES' | 'UNCHANGED' } |
  { before: number; after: number; poolLabel: string } | { settings: { unitSize: UnitSize; value: number }[] }));
export interface RuntimeObservation {
  id: string; jobId?: string; gameVersion: string; staticSnapshotId: string; sourceMainKey: string; sourceLandKey: string; contextId: string | null; catalogEntryId: string;
  scenarioId: string; trialId: string; observationType: ObservationType; unitSize: UnitSize; setup: RuntimeSetup; samplePoint: string; subjectLabel: string;
  entityPathIds: string[]; missilePathIds: string[]; identityVerification: { level: 'EXACT_SOURCE_OBSERVED' | 'CONTEXT_ONLY' | 'NOT_RECORDED'; reference: string | null };
  pathBinding: 'EXACT_PATH_OBSERVED' | 'COMPONENT_ROLE_ONLY' | 'NOT_RECORDED'; observation: RuntimeResult;
  confidence: 'OBSERVED_ONCE' | 'REPEATED' | 'CROSS_SETTING_CONFIRMED' | 'INCONCLUSIVE'; repetitions: number;
  provenance: { kind: 'RUNTIME_MANUAL'; observer: string; observedAt: string | null; references: string[]; notes?: string };
}
export interface RuntimeEvidence { format: 'warhammer-vault-runtime-evidence-v1'; observations: RuntimeObservation[] }
export const FORMAT: RuntimeEvidence['format'];
export const UNIT_SIZES: readonly UnitSize[];
export const OBSERVATION_TYPES: Readonly<Record<ObservationType, string>>;
export const CONFIDENCE: readonly RuntimeObservation['confidence'][];
export function canonical(value: unknown): unknown;
export function stable(value: unknown): string;
export function digest(value: unknown): string;
export function sourceContextKey(main: string, context: string | null): string;
export function snapshotIdentity(provenance: { gameVersion: string; schemaSha256: string; packs: { file_name: string; sha256: string }[] }): unknown;
export function blankSetup(factionId?: string): RuntimeSetup;
export function observationTemplate(subject: { sourceMainKey: string; sourceLandKey: string; contextId: string | null; catalogEntryId: string; factionId: string; gameVersion: string; staticSnapshotId: string }, job: { id: string; unitSize: UnitSize }, type: ObservationType, suffix?: string): RuntimeObservation;
