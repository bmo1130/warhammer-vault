import data from '../data/unitDiagnostics.json';

export type UnitDiagnostic = typeof data.entries[number];
export type DiagnosticCase = UnitDiagnostic['cases'][number];

// Exact diagnostic catalog IDs only. No display-name, suffix, or faction matching
// to production Units; null context remains a preserved diagnostic source.
const entries = new Map(data.entries.map(entry => [entry.id, entry]));
export const unitDiagnosticRepository = {
  get: (id: string) => entries.get(id),
  list: () => data.entries,
  snapshot: data,
};
