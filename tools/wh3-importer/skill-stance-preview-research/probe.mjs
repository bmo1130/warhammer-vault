import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProbe as parentProbe} from '../skill-rank-runtime-parent-stats/probe.mjs';
export const REVISION='campaign-stance-preview-diagnostic-v1';
export const PREFIX='WH3_STANCE_PREVIEW_DIAGNOSTIC|';
export const FORMAT='wh3-stance-preview-diagnostic-v1';
export const STEPS=['UNSELECTED_MAP','SELECTED_MAP','STANCE_OPEN_DEFAULT_HOVER','STANCE_OPEN_ALTERNATIVE_HOVER_ONLY','STANCE_CLOSED_MAP'];
export function plan(unitsPanel=false){return unitsPanel?[...STEPS.slice(0,2),'UNITS_PANEL_OPEN','UNITS_PANEL_CLOSED',...STEPS.slice(2)]:[...STEPS];}
export function buildProbe(){
 let source=parentProbe();
 const replace=(a,b)=>{assert.equal(source.split(a).length,2,`Changed historical anchor: ${a}`);source=source.replace(a,b);};
 // This separate diagnostic pins a historical CQI even while unselected.
 // The normal rank collector/validator, including its false gate, are untouched.
 assert.equal(source.split('WV_SKILL_RANK_PROBE').length,4);
 source=source.replaceAll('WV_SKILL_RANK_PROBE','WV_STANCE_PREVIEW_PROBE');
 replace('local selected = {}','local selected = {}\n    local pinned = {}');
 replace('if a.value == true and b.value == true then selected[#selected + 1] = x end',
  'if a.value == true and b.value == true then selected[#selected + 1] = x end\n        local id = q(x, "CQI")\n        if id.status == "VALUE" and id.value == C.ownerCQI then pinned[#pinned + 1] = x end');
 replace('assert(f.selectionScan.status == "COMPLETE" and #selected == 1, "Select exactly one player Lord")',
  'f.selectionDiagnostic = {selectedPlayerCount = #selected, pinnedOwnerCount = #pinned}\n    assert(f.selectionScan.status == "COMPLETE" and #pinned == 1, "Exact pinned Lord unavailable/ambiguous")');
 replace('local owner = selected[1]','local owner = pinned[1]');
 replace('    f.armyRoster =',readFileSync(new URL('./stance-diagnostic.lua',import.meta.url),'utf8').replace(/\r\n/g,'\n')+'    f.armyRoster =');
 replace('format = "wh3-skill-rank-capture-v1"',`format = "${FORMAT}"`);
 replace('    synthetic = false,',`    stanceDiagnosticRevision = "${REVISION}", stepOrdinal = P.serial, declaredStep = C.steps[P.serial],\n    uiStateSource = "PLANNED_USER_ACTION_NOT_API_VERIFIED", rankTrialEligible = false, productionEligible = false,\n    synthetic = false,`);
 replace('f.status = "CAPTURED"','assert(C.steps[P.serial] ~= nil, "Bounded diagnostic complete; do not capture extra states")\n    f.status = "DIAGNOSTIC_CAPTURED"');
 replace('WH3_SKILL_RANK_PROBE|',PREFIX);
 return source;
}
