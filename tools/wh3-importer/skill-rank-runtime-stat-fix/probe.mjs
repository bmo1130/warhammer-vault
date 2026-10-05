import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STAT_KEYS} from '../skill-rank-runtime-resolution/experiment.mjs';
import * as historical from '../skill-rank-runtime-resolution/resolve.mjs';

export const REVISION = 'campaign-exact-stat-key-v1';
export const ORIGINAL_SHA256 = '0d012becf1feba6d7e08362e6447ba5ed30268050f73d83145925bc52f7a9b8a';
export const query = key => {
 assert(STAT_KEYS.includes(key));
 return `CcoCampaignUnit.UnitDetailsContext.PreBonusUnitDetailsContext.StatContextFromKey("${key}").Value`;
};
export function buildProbe() {
 const bytes = readFileSync(new URL('../skill-rank-runtime-resolution/exec.lua', import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'), ORIGINAL_SHA256, 'Historical collector changed; review patch before use');
 const source = bytes.toString('utf8').replace(/\r\n/g, '\n');
 const start = source.indexOf('        local details = context(x, "UnitDetailsContext.PreBonusUnitDetailsContext")');
 const end = source.indexOf('        u.purchasedEffects =', start);
 assert(start > 0 && end > start);
 const fragment = readFileSync(new URL('./stat-capture.lua', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
 const patched = source.slice(0, start) + fragment + source.slice(end);
 const finish = '    f.status = "CAPTURED"';
 assert.equal(patched.split(finish).length, 2);
 return patched.replace(finish, `    -- Validate after returning all Unit rows so failed access stays in the log.
    assert(f.units.status == "COMPLETE", "Unit list incomplete")
    for _, unit in ipairs(f.units.rows) do
        assert(unit.statStatus == "COMPLETE", "Exact stat lookup unavailable; inspect units.rows[].detailsAccess/stats")
    end
${finish}`).replace('local ok, err = pcall(function()', `f.probeRevision = "${REVISION}"\nlocal ok, err = pcall(function()`);
}
export function inspectFrame(entry, setup) {
 const checked = historical.inspectFrame(entry, setup);
 assert.equal(entry.frame.probeRevision, REVISION, 'Wrong stat probe revision');
 for (const unit of entry.frame.units.rows) {
  assert.equal(unit.detailsAccess?.status, 'CONTEXT', 'Unit details inaccessible');
  assert.equal(unit.detailsAccess.query, 'UnitDetailsContext.PreBonusUnitDetailsContext');
  assert.equal(unit.statStatus, 'COMPLETE');
  for (const key of STAT_KEYS) {
   const stat = unit.stats[key];
   assert.equal(stat.access?.status, 'CONTEXT', 'Stat context inaccessible');
   assert.equal(stat.access.query, `StatContextFromKey("${key}")`);
   assert.equal(stat.query, query(key), 'Wrong observed stat source');
  }
 }
 for (const observation of checked.observations) observation.provenance.query = query(observation.statKey);
 return checked;
}
export function resolve(parsed, setup) {
 const problems = [...parsed.problems];
 for (const entry of parsed.frames) {
  try { inspectFrame(entry, setup); }
  catch (error) { problems.push({reference: entry.reference, captureId: entry.frame.captureId, reason: error.message}); }
 }
 const result = historical.resolve({...parsed, problems}, setup);
 // Correct only provenance after validating the exact direct-access path.
 for (const observation of result.observations) observation.provenance.query = query(observation.statKey);
 for (const skill of result.skills) for (const series of skill.observed) for (const observation of series) observation.provenance.query = query(observation.statKey);
 return {...result, probeRevision: REVISION};
}
