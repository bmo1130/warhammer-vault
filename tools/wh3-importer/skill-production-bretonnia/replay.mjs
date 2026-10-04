import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {verifySource,serialize} from './source.mjs';
import {scan,compactMembership} from './scan.mjs';
import {classify,coverage} from './classify.mjs';
import {admit} from './admit.mjs';
import {compactInventory,compactClassification,compactMemberProofs,serializeCompact} from './compact.mjs';
export function replay(bytes,unitsBytes,selectionBytes,reviewBytes,existing,manifest){
 assert.equal(manifest.format,'wh3-bretonnia-skill-production-manifest-v1');assert.equal(sha256(selectionBytes),manifest.selectionSha256);assert.equal(sha256(reviewBytes),manifest.reviewSha256);assert.equal(sha256(unitsBytes),pins.unitsSha256);
 const source=verifySource(bytes,manifest),selection=JSON.parse(selectionBytes);assert.equal(selection.cultureKey,source.cultureKey);assert.equal(selection.rankPolicy,'only complete single source rank [1]');
 const {inventory,memberships}=scan(source,JSON.parse(unitsBytes)),classification=classify(inventory,memberships),admission=admit(inventory,classification,JSON.parse(reviewBytes),existing);
 const report=coverage(inventory,classification,memberships,admission);
 const projection={format:'wh3-bretonnia-skill-calculator-projection-v1',sourceSha256:manifest.sourceSha256,registryPaths:['src/data/caSkillEffect.json','src/data/caSkillBatch01.json','src/data/caSkillBatch02.json'],skills:admission.skills.map(s=>({skillKey:s.skillKey,ownerKeys:s.ownerKeys,rank:s.rank,effectJunctionIds:s.effects.map(e=>e.junctionRowId),targets:s.targets,modifiers:s.modifiers})),application:'Existing registry is semantically equal to this exact full-source projection; no new admission'};
 const outputs={inventory:serializeCompact(compactInventory(inventory,manifest.sourceSha256)),classification:serializeCompact(compactClassification(classification,manifest.sourceSha256)),membership:serializeCompact(compactMemberProofs(compactMembership(memberships,manifest.sourceSha256))),admission:serialize(admission),projection:serialize(projection),coverage:serialize(report)};
 return {source,inventory,memberships,classification,admission,report,projection,outputs};
}
