import { observationContext } from './context.mjs';
import { baseEntries } from './base.mjs';
import { addEntityEntries } from './entity.mjs';
import { missileEntries } from './missile.mjs';
import { unitProfiles } from '../profiles.mjs';
import { researchProfiles } from '../research-profiles.mjs';

// Observation modules only select named raw fields; they never convert stats.
export function observations(dump) {
  const context = observationContext(dump);
  const entries = baseEntries(context);
  const name = dump.discovery?.profile;
  if (name && name !== 'grail-knights') addEntityEntries(entries, context);
  const profile = unitProfiles[name] ?? researchProfiles[name];
  if (profile?.scopes.includes('missile')) entries.push(...missileEntries(context));
  return entries.map(([label, record, field]) => ({
    label,
    value: record && Object.hasOwn(record.row, field) ? record.row[field] : null,
    status: record && Object.hasOwn(record.row, field) ? 'raw' : 'unresolved',
    source: record ? { rowId: record.id, table: record.table, path: record.path, key: record.key, field } : null,
  }));
}

