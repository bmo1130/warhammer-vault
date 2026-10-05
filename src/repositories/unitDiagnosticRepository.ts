import data from '../data/unitDiagnostics.json';

export type DiagnosticCase = typeof data.entries[number]['cases'][number];
// JSON inference gives empty projectile arrays a separate never[] branch.
// Expose one array of the case union so callbacks accept every preserved case.
export type UnitDiagnostic = Omit<typeof data.entries[number], 'cases'> & { cases: DiagnosticCase[] };

// Exact diagnostic catalog IDs only. No display-name, suffix, or faction matching
// to production Units; null context remains a preserved diagnostic source.
const entries = new Map<string, UnitDiagnostic>(data.entries.map(entry => [entry.id, entry]));
export const unitDiagnosticRepository = {
  get: (id: string) => entries.get(id),
  list: () => data.entries,
  snapshot: data,
};
