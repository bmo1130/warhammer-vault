import type { Unit, UnitRecruitmentRequirement, UnitRecruitmentSource } from '../domain/unit';
import { gameRepository } from './gameRepository';
import { recruitmentBuilding, unitRecruitmentAdmission, type RecruitmentBuilding } from './unitRecruitment';

// A reviewed UI scope, not a full Bretonnia building inventory. Exact keys keep
// future registry growth from silently expanding this first slice.
export const bretonniaBuildingScope = [
  {key:'wh_main_BRETONNIA_barracks',name:'병영',buildings:['wh_main_brt_barracks_1','wh_main_brt_barracks_2','wh_main_brt_barracks_3','wh_main_brt_barracks_4']},
  {key:'wh_main_BRETONNIA_carpenter',name:'목공소',buildings:['wh_main_brt_carpenter_1','wh_main_brt_carpenter_2']},
  {key:'wh_main_BRETONNIA_farm_basic',name:'농장',buildings:['wh_main_brt_farm_1','wh_main_brt_farm_2','wh_main_brt_farm_3']},
  {key:'wh_main_BRETONNIA_farm_extra',name:'제분소',buildings:['wh_main_brt_farm_extra_1','wh_main_brt_farm_extra_2']},
  {key:'wh_main_BRETONNIA_stables',name:'마구간',buildings:['wh_main_brt_stables_1','wh_main_brt_stables_2','wh_main_brt_stables_3','wh_main_brt_stables_4','wh_main_brt_stables_5']},
  {key:'wh_main_BRETONNIA_worship',name:'성배 예배당',buildings:['wh_main_brt_worship_2','wh_main_brt_worship_3']},
] as const;

export function buildingDisplayName(building: RecruitmentBuilding): string {
  const names = [...new Set(building.variants.map(v=>v.name).filter((name): name is string=>!!name && !name.includes('{{tr:')))];
  return names.join(' / ') || building.key;
}

export type BuildingUnitLink = {unit: Unit; requirement: UnitRecruitmentRequirement; source: UnitRecruitmentSource};
export type BuildingWikiEntry = {building: RecruitmentBuilding; name: string; chainName: string; links: BuildingUnitLink[]};

export function createBuildingWiki(units: readonly Unit[], lookup = recruitmentBuilding) {
  const entries = new Map<string,BuildingWikiEntry>();
  for (const chain of bretonniaBuildingScope) for (const key of chain.buildings) {
    const building = lookup(key);
    if (!building || building.key !== key || building.chainKey !== chain.key) throw new Error(`Building wiki registry drift: ${key}`);
    entries.set(key,{building,name:buildingDisplayName(building),chainName:chain.name,links:[]});
  }
  for (const unit of units) {
    // Use the exact existing admission guard; roster membership, names, military
    // groups, special pools and upgrade requirements never create direct links.
    if (unit.gameVersion === 'sample' || !unitRecruitmentAdmission(unit)) continue;
    for (const requirement of unit.campaign?.recruitmentRequirements ?? []) {
      const entry = entries.get(requirement.buildingId ?? '');
      if (!entry || requirement.sourceStatus !== 'VERIFIED_DIRECT_SOURCE' ||
        requirement.buildingChainId !== entry.building.chainKey || requirement.buildingStage !== entry.building.stage ||
        requirement.requiredPrimaryBuildingLevel !== entry.building.requiredPrimaryBuildingLevel) continue;
      const sources = unit.campaign?.recruitmentSources?.filter(source => source.type === 'BUILDING' &&
        source.key === entry.building.key && source.requirementKey === requirement.sourceKey &&
        source.status === 'VERIFIED_DIRECT_SOURCE' && source.effectiveStatus === 'PARTIAL_SOURCE' &&
        source.reference.table === 'building_units_allowed_tables') ?? [];
      if (sources.length === 1) entry.links.push({unit,requirement,source:sources[0]});
    }
  }
  for (const entry of entries.values()) entry.links.sort((a,b)=>a.unit.id.localeCompare(b.unit.id) || (a.requirement.sourceKey ?? '').localeCompare(b.requirement.sourceKey ?? ''));
  return {
    get: (key: string) => entries.get(key),
    list: (query = '') => {
      const term = query.trim().toLocaleLowerCase();
      return [...entries.values()].filter(entry => `브레토니아 Bretonnia ${entry.name} ${entry.chainName} ${entry.building.key} ${entry.building.chainKey}`.toLocaleLowerCase().includes(term));
    },
    chain: (key: string) => [...entries.values()].filter(entry=>entry.building.chainKey === key).sort((a,b)=>a.building.stage-b.building.stage || a.building.key.localeCompare(b.building.key)),
  };
}

export const buildingWikiRepository = createBuildingWiki(gameRepository.listUnits());
