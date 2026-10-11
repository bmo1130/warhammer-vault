export type AbilityCategory = 'ATTRIBUTE' | 'PASSIVE' | 'ACTIVE' | 'TOGGLE' | 'BOUND';
export interface AbilityText { text: string; language: string; key: string; rowIds: string[] }
export interface AbilityEffect {
  field: string; label: string; value: number | string | boolean; rawValue: number | string | boolean;
  unit: string; method?: string; sourceRowIds: string[];
  attributeOperation?: 'GRANT' | 'REMOVE'; description?: AbilityText;
}
export interface AbilityPhase {
  id: string; order: number; relationship: string; targets: {self: boolean; friends: boolean; enemies: boolean};
  duration: number; hidden: boolean; interval: number; maxAffectedEntities: number;
  affectsAllies: boolean; affectsEnemies: boolean; effects: AbilityEffect[]; sourceRowIds: string[];
}
export interface AbilityDetail {
  id: string; category: AbilityCategory; name: string; englishName: string; rawKeys: string[];
  description: AbilityText | null; englishDescription: AbilityText | null;
  contextDescriptions: AbilityText[];
  activation: {intensityBased: boolean; ownedTargetsOnly: boolean; updateTargetsEveryFrame: boolean} | null;
  phases: AbilityPhase[];
  conditions: {kind: string; rawFlag: string; text?: string; oppositeText?: string; language?: string; sourceRowIds: string[]}[];
  parameters: {field: string; label: string; value: number; unit: string}[];
  references: {field: string; key: string}[];
  verification: {description: string; numericEffects: boolean; conditions: string; activation: string; mechanics: string};
  held: {rawKey: string; reason: string}[]; sourceRowIds: string[];
}
export const abilityCategoryName: Record<AbilityCategory, string> = {
  ATTRIBUTE: '특성', PASSIVE: '지속 능력', ACTIVE: '액티브 능력', TOGGLE: '토글 능력', BOUND: '귀속 주문·능력',
};
// Independent documents do not extend the personal backup EntityType contract.
export const abilityPath = (id: string) => `/abilities/${encodeURIComponent(id)}`;
