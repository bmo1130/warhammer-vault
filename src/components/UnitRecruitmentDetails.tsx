import type { Unit } from '../domain/unit';
import { recruitmentBuilding } from '../repositories/unitRecruitment';
import SectionTitle from './SectionTitle';

const labels: Record<string,string>={REGIMENT_OF_RENOWN:'유명연대',MERCENARY_POOL:'특수 모집 풀',MERCENARY_GROUP:'모집 그룹 (풀 미확인)',
  RECRUITMENT_SOURCE_OVERRIDE:'별도 모집 출처',UNIT_UPGRADE:'유닛 업그레이드',RITUAL_MERCENARY_SPAWN:'의례를 통한 풀 추가',CORE_MERCENARY_PERMISSION:'핵심 용병 허용'};
export default function UnitRecruitmentDetails({unit}:{unit:Unit}){
  const review=unit.campaign?.recruitmentReview,requirements=unit.campaign?.recruitmentRequirements??[],sources=unit.campaign?.recruitmentSources??[];
  const groups=new Map<string,typeof requirements>();
  for(const r of requirements){const key=JSON.stringify([r.buildingChainId,r.factionKey,r.rawConditions]);groups.set(key,[...(groups.get(key)??[]),r]);}
  const special=sources.filter(s=>s.type!=='BUILDING');
  return <section className="section recruitment-section">
    <SectionTitle title="모집 조건 · 출처"/>
    <p className="data-note">전체 모집 경로: <strong>{review?.status??'UNKNOWN'}</strong> · 실효 모집 가능 여부: 미확인</p>
    {review?.status==='UNKNOWN'||!review?<p className="data-note">모집 출처 미확인. 출처가 없다고 확인된 비모집 유닛(N/A)으로 판정하지 않습니다.</p>:<>
      <p className="data-note">확인된 건물·모집 풀 연결을 표시합니다. 캠페인에서 건설할 수 있는 지역과 최종 해금 조건은 추가 확인이 필요합니다.</p>
      <p>직접 건물 연결 {requirements.length}개 · 건물 체인/진영 조건 {groups.size}개 · 특수 출처 {special.length}개</p>
      {requirements.length>0&&<p className="data-note">건물 참조 경로: {review.directBuildingStatus} · 건물 단계는 CA의 0부터 시작하는 체인 단계입니다. Tier로 환산하지 않으며 명시된 상위 단계만 표시합니다.</p>}
      {[...groups.entries()].map(([key,rows])=>{
        const ordered=[...rows].sort((a,b)=>(a.buildingStage??0)-(b.buildingStage??0)),first=ordered[0],b=recruitmentBuilding(first.buildingId??'');
        const names=[...new Set(b?.variants.map(v=>v.name).filter(name=>name&&!name.includes('{{tr:'))??[])];
        const stages=[...new Set(ordered.map(r=>r.buildingStage))];
        return <details className="panel recruitment-path" key={key}>
          <summary>{names.join(' / ')||'건물 이름 미확인'} · 최소 CA 단계 {first.buildingStage}{first.factionKey?' · 진영 지정':''}</summary>
          <p>명시된 모집 단계: {stages.join(', ')} · 직접 출처 확인 · 실효 조건 일부 미확인</p>
          <ul>{ordered.map(r=>{const building=recruitmentBuilding(r.buildingId??'');return <li key={r.sourceKey}>
            CA 단계 {r.buildingStage} · 주건물 요구 단계 {r.requiredPrimaryBuildingLevel}
            {building?.onlyInCapital?' · 주도시 조건':''}{building?.factionUnique?' · 진영 고유 표시':''}
            {!!building?.requiredBuildings.length&&` · 선행 건물 ${building.requiredBuildings.length}개`}
            <details><summary>건물 식별자·제한 근거</summary><p>{r.buildingId} · {r.buildingChainId} · source {r.sourceKey}</p>
              {r.factionKey&&<p>지정 진영: {r.factionKey}</p>}
              <p>문화/진영 variant {building?.variants.length??0}개 · 건물 availability set {building?.availabilitySets.length??0}개</p>
              {building?.variants.map(v=><p key={v.reference.rowId}>{v.cultureKey||v.subcultureKey||v.factionKey||'기본 variant'} · {v.disables?'비활성 표식':'비활성 표식 없음'}{v.factionKey&&` · ${v.factionKey}`}</p>)}
              {building?.requiredBuildings.map(v=><p key={v.reference.rowId}>선행 건물: {v.key}</p>)}
              {building?.availabilitySets.map(v=><p key={v.reference.rowId}>Availability set: {v.key} · 명시 규칙 {v.rules.length}개 (암묵 규칙 미확인)</p>)}
            </details>
          </li>;})}</ul>
        </details>;
      })}
      {special.length>0&&<details className="panel recruitment-path"><summary>특수 모집 분류 · 조건 일부 확인</summary>
        <ul>{special.map((s,i)=><li key={s.reference.rowId+':'+i}>{labels[s.type]??s.type} · PARTIAL
          {s.requiredRank!==undefined&&` · 요구 rank ${s.requiredRank}`}{!!s.technologyKeys?.length&&` · 기술 참조 ${s.technologyKeys.length}개`}
          <details><summary>출처 식별자·조건</summary><p>{s.key}</p>{s.factionKey&&<p>진영: {s.factionKey}</p>}
            {s.subcultureKey&&<p>하위 문화: {s.subcultureKey}</p>}{s.technologyKeys?.map(k=><p key={k}>기술: {k}</p>)}
            {s.requiredBuildingKeys?.map(k=><p key={k}>건물: {k}</p>)}<p>{s.reference.table} · {s.reference.rowId}</p>
          </details>
        </li>)}</ul>
      </details>}
      {review.unitConditions&&(review.unitConditions.additionalBuildingKey||review.unitConditions.resourceKey||review.unitConditions.characterLevelConditions.length>0||review.unitConditions.capacityConditions.length>0)&&
        <details className="panel recruitment-path"><summary>추가 모집 조건 참조</summary>
          {review.unitConditions.additionalBuildingKey&&<p>추가 건물: {review.unitConditions.additionalBuildingKey}</p>}
          {review.unitConditions.resourceKey&&<p>요구 자원: {review.unitConditions.resourceKey}</p>}
          {review.unitConditions.characterLevelConditions.map(c=><p key={c.reference.rowId}>캐릭터 레벨 {c.level} · {c.factionKey||'기본 조건'} (진영 override 적용 순서 미확인)</p>)}
          {review.unitConditions.capacityConditions.map(c=><p key={c.reference.rowId}>의례 한도 변경: {c.payloadKey} · 원본 capacity {c.capacity} (별도 모집 출처로 합산하지 않음)</p>)}
        </details>}
      <p className="data-note">지역/전역 모집, 현재 연구·건물 소유·한도·풀 수량은 미확인입니다. 전체 모집 경로의 COMPLETE와 직접 건물 연결의 확인을 구분합니다.</p>
    </>}
  </section>;
}
