import data from '../data/abilityDictionary.json';
import type { AbilityDetail } from '../domain/ability';
const entries = data.entries as AbilityDetail[];
const byId = new Map(entries.map(e => [e.id, e]));
export const abilityDictionary = {
  get: (id: string): AbilityDetail | undefined => byId.get(id),
  list: (): readonly AbilityDetail[] => entries,
  summary: data.summary,
  provenance: data.provenance,
};
