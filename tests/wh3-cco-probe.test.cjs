const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require('fengari');
const modules = Promise.all([
  import('../tools/wh3-importer/runtime-evidence/cco-probe/candidates.mjs'),
  import('../tools/wh3-importer/runtime-evidence/cco-probe/ingest.mjs'),
  import('../tools/wh3-importer/runtime-evidence/contract.mjs'),
  import('../tools/wh3-importer/runtime-evidence/cco-probe/jobs.mjs'),
  import('../tools/wh3-importer/runtime-evidence/validate.mjs'),
]);
const V = value => ({ status: 'VALUE', value });
async function fixture() {
  const [c, i, contract, jobs, validator] = await modules;
  const snapshot = { gameVersion: 'test-v1', schemaSha256: 'schema', packs: [{ name: 'db.pack', sha256: 'pack' }] }, snapshotId = contract.digest(snapshot);
  const subjects = c.P0.map(main => ({ sourceMainKey: main, sourceLandKey: `land:${main}`, contextId: null, catalogEntryId: `diag:${main}`, displayName: 'Same display name', factionId: 'fixture', gameVersion: snapshot.gameVersion, staticSnapshotId: snapshotId,
    entity: { paths: [{ pathId: `${main}:man`, role: 'MAN', entityKey: 'crew', edges: [] }, { pathId: `${main}:rider`, role: 'PERSONALITY_ATTACHMENT', entityKey: 'crew', edges: [] }] },
    missile: { paths: [{ pathId: `${main}:weapon1`, role: 'LAND_PRIMARY', weaponKey: 'gun', projectilePaths: [{ key: 'projectile1' }], rawWeaponFlags: { precursor: { value: false }, use_secondary_ammo_pool: { value: false } } },
      { pathId: `${main}:weapon2`, role: 'RIDER', weaponKey: 'gun', projectilePaths: [{ key: 'projectile2' }], rawWeaponFlags: { precursor: { value: false }, use_secondary_ammo_pool: { value: true } } }], ammo: { primary_ammo: { value: 10 }, secondary_ammo: { value: 20 } } }, knownConditionKeys: [] }));
  const body = { format: 'warhammer-vault-runtime-static-index-v1', snapshot, snapshotId, subjects }, index = { ...body, integrity: contract.digest(body) };
  const provenance = { gameVersion: snapshot.gameVersion, schemaSha256: snapshot.schemaSha256, packs: [{ file_name: 'db.pack', sha256: 'pack' }] };
  const rows = subjects.flatMap(s => [{ id: `main:${s.sourceMainKey}`, table: 'main_units_tables', tableVersion: 1, row: { unit: s.sourceMainKey, land_unit: s.sourceLandKey } },
    { id: s.sourceLandKey, table: 'land_units_tables', tableVersion: 1, row: { key: s.sourceLandKey } }]);
  const evidence = { provenance, rows, schemas: [{ table: 'main_units_tables', version: 1, fields: [{ name: 'land_unit', is_reference: ['land_units', 'key'] }] }],
    relationships: subjects.map(s => ({ from: `main:${s.sourceMainKey}`, field: 'land_unit', to: s.sourceLandKey, targetField: 'key', value: s.sourceLandKey })),
    coverage: [{ query: { table: 'land_units_to_extra_engines_tables' }, tableFiles: 1, matchedRows: 0 }], issues: [] };
  const manifest = c.buildCandidateManifest(index, evidence), subject = subjects[0];
  const metadata = { sessionId: 'session1', gameVersion: snapshot.gameVersion, staticSnapshotId: snapshotId, unitSize: 'MEDIUM', contextId: null };
  const unitFields = { 'UnitRecordContext.Key': V(subject.sourceMainKey), 'UnitRecordContext.UnitLandRecordContext.Key': V(subject.sourceLandKey), UniqueUiId: V(123),
    NumEntities: V(1), NumEntitiesInitial: V(1), HealthValue: V(5000), HealthMax: V(5000), IsPlayerUnit: V(true), IsFiringMissiles: V(true), 'ActiveProjectileContext.Key': V('projectile1'), PrimaryAmmoPercent: V(1), SecondaryAmmoPercent: V(1) };
  let seq = 0;
  const event = (kind, data, runId = 'snapshot-1') => ({ format: 'warhammer-vault-cco-probe-v1', sessionId: metadata.sessionId, runId, sequence: ++seq, kind, timestamp: V(0), metadata, data });
  const frame = (sample, fields = unitFields, run = 'snapshot-1', mode = 'SNAPSHOT') => [event(`${mode}_UNIT`, { sample, fields }, run), ...['ManList', 'MountList', 'EngineList', 'EntityList'].flatMap(list => [
    event('COMPONENT_LIST', { mode, sample, list, size: V(1), complete: true }, run), event('ENTITY', { mode, sample, list, index: 0, fields: { Key: V('crew'), 'EntityRecordContext.Key': V('crew'), 'UnitContext.UniqueUiId': V(123), IsMan: V(true), IsEngine: V(false), IsAlive: V(true), IsReloading: V(true), ReloadPercent: V(0.25) } }, run)]), event('SAMPLE_END', { mode, sample }, run)];
  const events = () => [event('SNAPSHOT_START', {}), ...frame(0), event('SNAPSHOT_END', {})];
  const parse = events => i.parseProbeLogs([{ name: 'synthetic.log', text: events.map(e => `log prefix WH3_RUNTIME_PROBE|${JSON.stringify(e)}`).join('\n') }]);
  return { c, i, contract, jobs, validator, snapshot, index, evidence, manifest, subject, metadata, unitFields, event, frame, events, parse };
}
test('candidate graph preserves exact main/land, repeated entity paths, weapon paths and raw flags', async () => {
  const f = await fixture(); assert.equal(f.manifest.units.length, 4);
  assert.equal(f.manifest.units[0].views.AllMissileSources.length, 2);
  assert.equal(f.manifest.units[0].subject.entity.paths.length, 2);
  assert.notEqual(f.manifest.units[0].subject.entity.paths[0].pathId, f.manifest.units[0].subject.entity.paths[1].pathId);
  assert.equal(f.manifest.units[0].views.AllMissileSources[1].UseSecondaryAmmoPool.value, true);
  assert.equal(f.manifest.units[0].views.PrimaryAmmo.value, 10); assert.equal(f.manifest.productionEligible, false);
});
test('candidate construction refuses unconnected land, source snapshot drift and changed manifest', async () => {
  const f = await fixture(), e = structuredClone(f.evidence); e.relationships = [];
  assert.throws(() => f.c.buildCandidateManifest(f.index, e), /identity drift/);
  e.provenance.gameVersion = 'wrong'; assert.throws(() => f.c.buildCandidateManifest(f.index, e), /snapshot drift/);
  f.manifest.units[0].sourceMainKey = 'other'; assert.throws(() => f.c.verifyCandidates(f.manifest), /Invalid/);
});
test('extra engines retain each junction, entity, weapon and projectile edge; broken targets stay incomplete', async () => {
  const f = await fixture(), e = structuredClone(f.evidence), land = f.subject.sourceLandKey;
  const row = (table, id, raw) => ({ table, id, tableVersion: 1, row: raw, key: { key: raw.key }, sourcePack: 'db.pack', path: `db/${table}/fixture` });
  const engine = row('battlefield_engines_tables', 'engine-row', { key: 'engine', battle_entity: 'extra_entity', missile_weapon: 'extra_gun' });
  const entity = row('battle_entities_tables', 'entity-row', { key: 'extra_entity' });
  const weapon = row('missile_weapons_tables', 'weapon-row', { key: 'extra_gun', default_projectile: 'extra_projectile', precursor: true, use_secondary_ammo_pool: true });
  const projectile = row('projectiles_tables', 'projectile-row', { key: 'extra_projectile' });
  const extras = [0, 1].map(n => row('land_units_to_extra_engines_tables', `extra-${n}`, { key: `extra-${n}`, land_unit: land, battle_engine: 'engine', attach_articulation: n }));
  e.rows.push(engine, entity, weapon, projectile, ...extras);
  e.schemas.push({ table: extras[0].table, version: 1, fields: [{ name: 'land_unit', is_reference: ['land_units', 'key'] }, { name: 'battle_engine', is_reference: ['battlefield_engines', 'key'] }, { name: 'attach_articulation' }] },
    { table: engine.table, version: 1, fields: [{ name: 'battle_entity', is_reference: ['battle_entities', 'key'] }, { name: 'missile_weapon', is_reference: ['missile_weapons', 'key'] }] },
    { table: weapon.table, version: 1, fields: [{ name: 'default_projectile', is_reference: ['projectiles', 'key'] }, { name: 'precursor' }, { name: 'use_secondary_ammo_pool' }] });
  const edge = (from, field, to, value) => ({ from, field, to, targetField: 'key', value });
  e.relationships.push(...extras.flatMap(r => [edge(r.id, 'land_unit', land, land), edge(r.id, 'battle_engine', engine.id, 'engine')]),
    edge(engine.id, 'battle_entity', entity.id, 'extra_entity'), edge(engine.id, 'missile_weapon', weapon.id, 'extra_gun'), edge(weapon.id, 'default_projectile', projectile.id, 'extra_projectile'));
  const m = f.c.buildCandidateManifest(f.index, e), u = m.units[0]; assert.equal(u.views.ExtraEnginesList.length, 2);
  assert.equal(u.views.AllEntitySources.filter(p => p.role === 'EXTRA_ENGINE').length, 2);
  const extraWeapons = u.views.AllMissileSources.filter(p => p.role === 'EXTRA_ENGINE'); assert.equal(extraWeapons.length, 2); assert.notEqual(extraWeapons[0].pathId, extraWeapons[1].pathId);
  assert.equal(extraWeapons[0].ProjectileContextList[0].key, 'extra_projectile'); assert.equal(extraWeapons[0].UseSecondaryAmmoPool.value, true);
  e.relationships = e.relationships.filter(x => x.field !== 'default_projectile');
  assert.equal(f.c.buildCandidateManifest(f.index, e).units[0].status, 'INCOMPLETE_DB_CHAIN');
});
test('missing schema edge never recovers an extra engine from matching raw strings', async () => {
  const f = await fixture(), e = structuredClone(f.evidence);
  e.rows.push({ id: 'unbound-extra', table: 'land_units_to_extra_engines_tables', tableVersion: 1, row: { land_unit: f.subject.sourceLandKey, battle_engine: 'looks_like_engine' } });
  assert.equal(f.c.buildCandidateManifest(f.index, e).units[0].views.ExtraEnginesList.length, 0);
});
test('snapshot values stay runtime counts/health, no card count or HP formula; static data untouched', async () => {
  const f = await fixture(), before = JSON.stringify(f.index), report = f.i.compareRuns(f.parse(f.events()), f.manifest), r = f.i.toRuntimeEvidence(report, f.index);
  assert.equal(report.reports[0].entities.length, 2); assert(report.reports[0].entities.every(e => e.status === 'OBSERVED_RUNTIME'));
  assert.equal(r.validation.status, 'VALIDATED'); assert(r.evidence.observations.some(o => o.observationType === 'CCO_NUM_ENTITIES' && o.observation.value === 1));
  assert(!r.evidence.observations.some(o => o.observationType === 'CARD_MODEL_COUNT' || o.observationType === 'CARD_HEALTH'));
  assert.equal(r.resolutions.proposals.length, 0); assert.equal(JSON.stringify(f.index), before); assert.equal(report.productionModified, false);
});
test('malformed/truncated/unsupported field logs retained; unsupported does not mean absent', async () => {
  const f = await fixture(), e = f.events(); e[1].data.fields.HealthMax = { status: 'UNSUPPORTED', error: 'no method' };
  const text = e.map(x => `WH3_RUNTIME_PROBE|${JSON.stringify(x)}`).join('\n') + '\nWH3_RUNTIME_PROBE|{"bad';
  const parsed = f.i.parseProbeLogs([{ name: 'fixture', text }]); assert.equal(parsed.problems.length, 1);
  const r = f.i.toRuntimeEvidence(f.i.compareRuns(parsed, f.manifest), f.index);
  assert(!r.evidence.observations.some(o => o.observationType === 'CCO_HEALTH_MAX')); assert.equal(r.validation.status, 'VALIDATED');
  const partial = f.events().slice(0, 4), report = f.i.compareRuns(f.parse(partial), f.manifest);
  assert.equal(report.reports[0].complete, false); assert(report.reports[0].problems.includes('MISSING_RUN_END'));
});
test('repeated log ingestion is idempotent; conflicting same event is retained and blocks admission', async () => {
  const f = await fixture(), events = f.events(), duplicated = f.parse([...events, ...events]);
  assert.equal(duplicated.events.length, events.length); assert.equal(duplicated.repeats, events.length);
  const conflict = structuredClone(events[1]); conflict.data.fields.HealthMax = V(999);
  const parsed = f.parse([...events, conflict]); assert.equal(parsed.conflictKeys.length, 1);
  const report = f.i.compareRuns(parsed, f.manifest); assert.equal(report.reports[0].status, 'CONFLICTING_RUNTIME_EVIDENCE');
  assert.equal(f.i.toRuntimeEvidence(report, f.index).evidence.observations.length, 0);
});
for (const [name, mutate] of [['main identity', m => { m.data.fields['UnitRecordContext.Key'] = V('unknown'); }],
  ['land identity', m => { m.data.fields['UnitRecordContext.UnitLandRecordContext.Key'] = V('other'); }],
  ['game version', m => { m.metadata.gameVersion = 'wrong'; }], ['context', m => { m.metadata.contextId = 'roster'; }],
  ['missing UnitRecord', m => { m.data.fields['UnitRecordContext.Key'] = { status: 'NULL' }; }]])
  test(`CCO comparison fails closed for ${name}`, async () => { const f = await fixture(), events = structuredClone(f.events()); mutate(events[1]); const r = f.i.compareRuns(f.parse(events), f.manifest); assert.equal(r.reports[0].status, 'IDENTITY_PENDING'); assert.equal(f.i.toRuntimeEvidence(r, f.index).evidence.observations.length, 0); });
test('trace records projectile changes and independent pool consumption; no simultaneous/weapon attribution claim', async () => {
  const f = await fixture(), run = 'trace-1', after = structuredClone(f.unitFields); after['ActiveProjectileContext.Key'] = V('projectile2'); after.SecondaryAmmoPercent = V(0.8);
  const events = [f.event('TRACE_START', {}, run), ...f.frame(0, f.unitFields, run, 'TRACE'), ...f.frame(1, after, run, 'TRACE'), f.event('TRACE_END', { reason: 'NOMINAL_5_SECONDS_COMPLETE' }, run)];
  const r = f.i.compareRuns(f.parse(events), f.manifest).reports[0]; assert.deepEqual(r.distinctObservedProjectileKeys, ['projectile1', 'projectile2']); assert.equal(r.projectileContextTransitions.length, 1);
  assert.equal(r.ammo[0].decreaseObserved, false); assert.equal(r.ammo[1].decreaseObserved, true);
  assert.equal(r.ammo[1].candidatePathIds.length, 1); assert.equal(r.ammo[1].causalWeaponAttribution, 'INCONCLUSIVE'); assert.equal(r.simultaneousSources, 'INCONCLUSIVE');
  assert(r.missileSources.every(x => x.weaponActivationStatus === 'INCONCLUSIVE')); assert(r.reloadingEntities.length > 0);
});
test('partial trace and unsupported projectile do not become NOT_OBSERVED source conclusions', async () => {
  const f = await fixture(), fields = structuredClone(f.unitFields); fields['ActiveProjectileContext.Key'] = { status: 'NULL' };
  const report = f.i.compareRuns(f.parse([f.event('TRACE_START', {}, 'trace-1'), ...f.frame(0, fields, 'trace-1', 'TRACE')]), f.manifest);
  assert(report.reports[0].missileSources.every(x => x.projectileContextStatus === 'INCONCLUSIVE')); assert.equal(report.reports[0].complete, false);
});
test('sequence gaps and orphan compressed samples cannot establish negative coverage', async () => {
  const f = await fixture(), events = f.events(); events.splice(3, 1);
  const r = f.i.compareRuns(f.parse(events), f.manifest).reports[0]; assert.equal(r.complete, false); assert(r.problems.includes('SEQUENCE_GAP'));
  const e = [f.event('TRACE_START', {}, 'trace-2'), f.event('TRACE_UNIT', { sample: 0, unchanged: true }, 'trace-2')];
  assert(f.i.compareRuns(f.parse(e), f.manifest).reports[0].problems.includes('REPEAT_WITHOUT_BASELINE'));
});
test('cross-unit cursor and entity owners are not attributed to the selected source', async () => {
  const f = await fixture(), events = f.events(); events.filter(e => e.kind === 'ENTITY').forEach(e => { e.data.fields['UnitContext.UniqueUiId'] = V(999); });
  events.push(f.event('CURSOR', { fields: { 'UnitContext.UniqueUiId': V(999), 'UnitContext.UnitRecordContext.Key': V(f.subject.sourceMainKey), 'UnitContext.UnitRecordContext.UnitLandRecordContext.Key': V(f.subject.sourceLandKey), 'EntityRecordContext.Key': V('crew') } }));
  const r = f.i.compareRuns(f.parse(events), f.manifest).reports[0]; assert(r.entities.every(e => e.status === 'INCONCLUSIVE')); assert.equal(r.cursors[0].status, 'IDENTITY_PENDING');
});
test('CCO evidence validator rejects card conversion, out-of-range pool and malformed type without throwing', async () => {
  const f = await fixture(), r = f.i.toRuntimeEvidence(f.i.compareRuns(f.parse(f.events()), f.manifest), f.index), o = structuredClone(r.evidence.observations[0]);
  o.observation.unit = 'models'; assert.equal(f.validator.validateRuntimeEvidence({ format: f.contract.FORMAT, observations: [o] }, f.index).status, 'REJECTED');
  o.observationType = ['not-a-type']; assert.equal(f.validator.validateRuntimeEvidence({ format: f.contract.FORMAT, observations: [o] }, f.index).status, 'REJECTED');
  o.observationType = 'CCO_AMMO_PERCENT_CHANGE'; o.observation = { result: 'CONCLUSIVE', before: 100, after: 90, poolLabel: 'PrimaryAmmoPercent' };
  assert.equal(f.validator.validateRuntimeEvidence({ format: f.contract.FORMAT, observations: [o] }, f.index).status, 'REJECTED');
});
test('unknown runtime projectile is held for static followup, not evidence of a known weapon', async () => {
  const f = await fixture(), events = f.events(); events[1].data.fields['ActiveProjectileContext.Key'] = V('not_in_manifest');
  const report = f.i.compareRuns(f.parse(events), f.manifest), r = f.i.toRuntimeEvidence(report, f.index);
  assert.deepEqual(report.reports[0].unexpectedProjectileKeys, ['not_in_manifest']); assert(r.held.some(x => x.reason === 'UNREVIEWED_PROJECTILE_KEY'));
});
test('Medium and Ultra sessions are separate observations, never a scaling formula', async () => {
  const f = await fixture(), a = f.events(), b = structuredClone(a); b.forEach(e => { e.sessionId = 'session2'; e.metadata.unitSize = 'ULTRA'; }); b[1].data.fields.NumEntities = V(2);
  const r = f.i.toRuntimeEvidence(f.i.compareRuns(f.parse([...a, ...b]), f.manifest), f.index);
  assert.equal(r.validation.status, 'VALIDATED'); assert.equal(r.validation.conflicts.length, 0); assert.equal(r.resolutions.proposals.length, 0);
  assert.deepEqual([...new Set(r.evidence.observations.map(o => o.unitSize))].sort(), ['MEDIUM', 'ULTRA']);
});
test('P0 jobs require no DB inference and phase 2 remains an ungenerated plan', async () => {
  const f = await fixture(), j = f.jobs.generateProbeJobs(f.manifest); assert.equal(j.jobs.length, 8); assert(j.jobs.every(x => x.status === 'PENDING'));
  assert(j.phase2.every(x => !x.packGenerated && x.policy.candidateChangesPerTest === 1 && !x.policy.sharedVanillaEdits));
});
test('Lua source executes with real interpreter: safe fields, cursor, trace changes, hot reload, single listener/timer', async () => {
  const f = await fixture(), code = await fs.readFile('tools/wh3-importer/runtime-evidence/cco-probe/exec_battle.lua', 'utf8');
  const mock = `
LOG = {}; NOW=0; CALLBACKS={}; LISTENERS={}; SHOTS=0
function out(line) LOG[#LOG+1]=line end
bm={}; function bm:time_elapsed_ms() return NOW end
function bm:remove_real_callback(name) CALLBACKS[name]=nil end
function bm:repeat_real_callback(fn, ms, name) assert(ms==100); CALLBACKS[name]=fn end
core={}; function core:remove_listener(name) LISTENERS[name]=nil end
function core:add_listener(name, event, cond, cb, persist) assert(event=='ShortcutTriggered'); LISTENERS[name]=cb end
local main=${JSON.stringify(f.subject.sourceMainKey)}; local land=${JSON.stringify(f.subject.sourceLandKey)}
local entity={}; function entity:Call(q)
 if q=='Position' then return 1,2,3,4 end
 local v={Key='crew',['EntityRecordContext.Key']='crew', IsMan=true,IsEngine=false,IsAlive=true,IsReloading=SHOTS>0,ReloadPercent=SHOTS/100,
 ['UnitContext.UniqueUiId']=123,['UnitContext.UnitRecordContext.Key']=main,['UnitContext.UnitRecordContext.UnitLandRecordContext.Key']=land}
 if v[q]==nil then error('unsupported:'..q) end; return v[q]
end
local unit={}; function unit:Call(q)
 if q:match('%.Size$') then return 2 end
 if q:match('%.At%(') then return entity end
 local v={IsPlayerUnit=true,UniqueUiId=123,NumEntities=1,NumEntitiesInitial=1,HealthValue=5000,HealthMax=5000,
 PrimaryAmmoPercent=1-SHOTS/100,SecondaryAmmoPercent=1,IsFiringMissiles=SHOTS>0,['ActiveProjectileContext.Key']=SHOTS>25 and 'projectile2' or 'projectile1',
 ReloadPercentMax=0.5,['UnitRecordContext.Key']=main,['UnitRecordContext.UnitLandRecordContext.Key']=land,IsInMelee=false}
 if v[q]==nil then error('unsupported:'..q) end; return v[q]
end
function cco(kind, id)
 if kind=='CcoBattleSelection' then return {Call=function(self,q) assert(q=='FirstUnitContext');return unit end} end
 if kind=='CcoBattleCursorContext' then return {Call=function(self,q) assert(q=='EntityContext');return entity end} end
 error('unknown context')
end
WV_CCO_CONFIG={sessionId='lua-test',gameVersion='test-v1',staticSnapshotId=${JSON.stringify(f.snapshotId ?? f.index.snapshotId)},unitSize='MEDIUM'}
`;
  const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
  function run(s) { const status = lauxlib.luaL_dostring(L, to_luastring(s)); assert.equal(status, lua.LUA_OK, status !== lua.LUA_OK ? to_jsstring(lua.lua_tostring(L, -1)) : ''); }
  run(mock); run(code); run(`WV_CCO_PROBE.trace(); for i=1,50 do NOW=NOW+100;SHOTS=i;local fn=CALLBACKS.wv_cco_trace; if fn then fn() end end;assert(CALLBACKS.wv_cco_trace==nil)`);
  run(code); run(`WV_CCO_PROBE.trace()`); run(code);
  run(`WV_CCO_PROBE=nil; NOW=0; SHOTS=0`); run(code);
  run(`local n=0;for k in pairs(LISTENERS) do n=n+1 end;assert(n==1);assert(CALLBACKS.wv_cco_trace==nil); OUTPUT=table.concat(LOG,'\\n')`);
  lua.lua_getglobal(L, to_luastring('OUTPUT')); const text = to_jsstring(lua.lua_tostring(L, -1));
  const parsed = f.i.parseProbeLogs([{ name: 'real-lua-mock.log', text }]); assert.equal(parsed.problems.length, 0);
  assert.equal(new Set(parsed.events.map(x => x.event.sessionId)).size, 2); assert.equal(parsed.conflictKeys.length, 0);
  const comparison = f.i.compareRuns(parsed, f.manifest), trace = comparison.reports.find(r => r.frames.length === 51);
  assert(trace); assert.equal(trace.ammo[0].decreaseObserved, true); assert.equal(trace.projectileContextTransitions.length, 1); assert(trace.reloadingEntities.length > 0);
  const cursor = comparison.reports[0].cursors[0]; assert.equal(cursor.status, 'OBSERVED_RUNTIME'); assert.equal(cursor.fields.ReloadRemainingTime.status, 'UNSUPPORTED');
  assert.equal(cursor.fields.Position.value.length, 4);
});
