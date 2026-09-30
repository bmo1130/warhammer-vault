import { inspectTables } from '../inspect.mjs';
import { resolveReferenceTable } from '../trace-unit.mjs';

// Explicit, finite investigation plan. Never recurse automatically or reverse
// from a shared entity/weapon to discover unrelated units.
export class EvidenceProbe {
  constructor(source, { maxRows = 400, maxQueries = 80 } = {}) {
    if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 500 || !Number.isInteger(maxQueries) || maxQueries < 1 || maxQueries > 100) throw new Error('Invalid bounded review limits.');
    this.source = source; this.maxRows = maxRows; this.maxQueries = maxQueries;
    this.queries = []; this.steps = []; this.issues = [];
    this.data = { rows: [], schemas: [], relationships: [], coverage: [] };
  }
  rows(table) { return this.data.rows.filter(r => r.table === table); }
  async select(table, field, values, reason = 'Explicit seed') {
    const unique = [...new Set(values.filter(v => v !== '' && v !== null && v !== undefined))];
    if (unique.length > 100) throw new Error('Review seed exceeded 100 values.');
    if (this.steps.length >= this.maxQueries) throw new Error('Review exceeded query/step budget.');
    this.steps.push({ table, field, values: unique, reason });
    if (!unique.length) return;
    const query = { table, where: [{ field, op: 'oneOf', value: unique }] };
    // Commit the query only after the complete bounded selection succeeds.
    const next = await inspectTables(this.source.reader, this.source.schema, [...this.queries, query], this.maxRows);
    this.queries.push(query); this.data = next;
    if (!next.coverage.at(-1).tableFiles) this.issues.push({ table, field, reason: 'Table unavailable; no-match is not evidence of absence.' });
  }
  async reference(table, field, target) {
    const tables = await this.source.reader.tables(table);
    const refs = tables.map(t => t.fields.find(f => f.name === field)?.is_reference);
    if (!tables.length || refs.some(ref => !ref || resolveReferenceTable(ref[0], this.source.schema) !== target) || new Set(refs.map(ref => ref?.[1])).size !== 1) throw new Error(`Missing/inconsistent processed reference ${table}.${field} -> ${target}.`);
    return refs[0][1];
  }
  async forward(table, field, target) {
    if (!this.rows(table).length) return;
    const targetField = await this.reference(table, field, target);
    const values = this.rows(table).map(r => r.row[field]);
    await this.select(target, targetField, values, `Forward schema reference ${table}.${field}`);
    for (const value of new Set(values.filter(v => v !== '' && v !== undefined && v !== null))) {
      const matches = this.rows(target).filter(r => r.row[targetField] === value);
      if (matches.length !== 1) this.issues.push({ table, field, target, targetField, value, matches: matches.length, reason: 'Required forward target is missing or ambiguous; never select first.' });
    }
  }
  async reverse(table, field, target) {
    const targetField = await this.reference(table, field, target);
    await this.select(table, field, this.rows(target).map(r => r.row[targetField]), `Bounded reverse schema reference to selected ${target}.${targetField}`);
  }
  artifact() {
    return { format: 'warhammer-vault-blocker-evidence-v1', sourceKind: this.source.metadata.sourceKind, provenance: this.source.metadata,
      limits: { maxRows: this.maxRows, maxQueries: this.maxQueries }, steps: this.steps, issues: this.issues, ...this.data };
  }
}

export function sourceIdentity(provenance) {
  return JSON.stringify([provenance.gameVersion, provenance.schemaSha256, provenance.packs.map(p => [p.file_name, p.sha256]).sort()]);
}
export function requireSameSource(a, b) {
  if (sourceIdentity(a) !== sourceIdentity(b)) throw new Error('Game/schema/pack evidence changed; do not combine investigations.');
}

// Return facts only when row identity and processed field metadata agree.
export function rawFact(evidence, record, field) {
  if (!record || !Object.hasOwn(record.row, field) || Object.entries(record.key).some(([k, v]) => record.row[k] !== v)) return null;
  const schema = evidence.schemas.find(s => s.table === record.table && s.version === record.tableVersion);
  if (!schema?.fields.some(f => f.name === field)) return null;
  return { value: record.row[field], source: { rowId: record.id, table: record.table, field, rowKey: record.key, schemaVersion: record.tableVersion, sourcePack: record.sourcePack, path: record.path }, kind: 'DIRECT' };
}

export function connected(evidence, from, field, targetTable) {
  if (!from) return [];
  const schema = evidence.schemas.find(s => s.table === from.table && s.version === from.tableVersion);
  const ref = schema?.fields.find(f => f.name === field)?.is_reference;
  if (!ref || `${ref[0].replace(/_tables$/, '')}_tables` !== targetTable) return [];
  return evidence.relationships.filter(e => e.from === from.id && e.field === field && e.targetField === ref[1] && e.value === from.row[field])
    .map(edge => ({ edge, row: evidence.rows.find(r => r.id === edge.to) }))
    .filter(x => x.row?.table === targetTable && x.row.row[ref[1]] === from.row[field]);
}
