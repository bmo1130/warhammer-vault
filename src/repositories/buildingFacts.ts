import data from '../data/buildingWikiAdmissions.json';
import type {BuildingFacts} from '../domain/building';
import {recruitmentSnapshot,type RecruitmentBuilding} from './unitRecruitment';

// Building facts were explicitly refreshed to 9.0.4.0; the 9.0.2.0 recruitment
// snapshot stays independent and unchanged. Never call it a whole-app refresh.
if(data.gameVersion!=='9.0.4.0'||data.recruitmentSnapshotId!==recruitmentSnapshot.snapshotId)
  throw new Error('Building facts snapshot drift');
const byKey=new Map((data.admissions as BuildingFacts[]).map(a=>[a.key,a]));
export function buildingFacts(building:RecruitmentBuilding):BuildingFacts|undefined {
  const facts=byKey.get(building.key);
  if(facts&&(facts.chainKey!==building.chainKey||facts.stage!==building.stage))throw new Error('Building facts identity drift: '+building.key);
  return facts;
}
export const buildingFactsCoverage=data.coverage;
export const buildingFactsSource={gameVersion:data.gameVersion,snapshotId:data.snapshotId,sourceHash:data.sourceHash,koreanPackHash:data.koreanPackHash,
  recruitmentGameVersion:data.recruitmentGameVersion};
