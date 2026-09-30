import { traceSelectors } from './context.mjs';

// Shared named-field access for normalization. Never trust serialized
// observations as input; check the raw row, processed schema and join path.
export function factSelectors(dump) {
  if (!Array.isArray(dump.rows) || !Array.isArray(dump.schemas) || !Array.isArray(dump.relationships) || dump.rows.length > 250) throw new Error('Expected a bounded raw trace with rows, processed schemas and relationships.');
  const { byId, root } = traceSelectors(dump);
  if (!root || byId.size !== dump.rows.length) throw new Error('Missing root or duplicate raw row IDs.');
  const definition = (record) => dump.schemas.find((schema) => schema.table === record?.table && schema.version === record?.tableVersion);
  const validEdge = (edge) => {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to || !edge.evidence) return false;
    if (edge.direction === 'localisation') {
      const suffix = `_${to.row[edge.targetField]}`;
      return from.table === 'Loc' && typeof from.row.key === 'string' && from.row.key.startsWith(`${to.table.replace(/_tables$/, '')}_`) && from.row.key.endsWith(suffix) && edge.value === to.row[edge.targetField] && edge.evidence.includes('localised_fields');
    }
    const ref = definition(from)?.fields.find((field) => field.name === edge.field)?.is_reference;
    return Array.isArray(ref) && (ref[0].endsWith('_tables') ? ref[0] : `${ref[0]}_tables`) === to.table && ref[1] === edge.targetField && Object.hasOwn(from.row, edge.field) && Object.hasOwn(to.row, edge.targetField) && from.row[edge.field] === to.row[edge.targetField] && edge.value === from.row[edge.field] && edge.evidence.includes('is_reference');
  };
  const paths = new Map([[root.id, []]]);
  const edges = dump.relationships.filter(validEdge);
  const queue = [root.id];
  for (let index = 0; index < queue.length; index++) for (const edge of edges) {
    const current = queue[index];
    const target = edge.from === current ? edge.to : edge.to === current ? edge.from : undefined;
    if (target && !paths.has(target)) {
      paths.set(target, [...paths.get(current), { ...edge, traversal: edge.from === current ? 'from-to' : 'to-from' }]);
      queue.push(target);
    }
  }
  const follow = (record, field) => {
    const targets = edges.filter((edge) => edge.from === record?.id && edge.field === field && edge.direction === 'forward').map((edge) => byId.get(edge.to));
    return targets.length === 1 ? targets[0] : undefined;
  };
  const facts = new Map();
  const fact = (record, field) => {
    const schema = definition(record);
    if (!record || !paths.has(record.id) || !schema?.fields.some((entry) => entry.name === field) || !Object.hasOwn(record.row, field) || record.row[field] === undefined) return undefined;
    if (Object.entries(record.key).some(([name, value]) => record.row[name] !== value)) throw new Error('Raw row key disagrees with its named fields.');
    const value = {
      value: record.row[field],
      source: { rowId: record.id, table: record.table, rowKey: record.key, field, sourcePack: record.sourcePack, sourcePackPath: record.sourcePackPath, path: record.path, schemaVersion: record.tableVersion, joins: paths.get(record.id) },
    };
    facts.set(`${record.id}.${field}`, value);
    return value;
  };
  return { byId, root, follow, fact, facts, reachable: (record) => paths.has(record?.id) };
}
