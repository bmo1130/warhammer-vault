import { Link, useParams } from 'react-router-dom';
import { pathFor } from '../domain/entities';
import type { RecruitmentReference } from '../domain/unit';
import { buildingWikiRepository } from '../repositories/buildingWikiRepository';
import { recruitmentSnapshot } from '../repositories/unitRecruitment';
import { useRecordView } from '../hooks/useRecordView';
import BookmarkButton from '../components/BookmarkButton';
import ArticleEditor from '../components/ArticleEditor';
import SectionTitle from '../components/SectionTitle';
import NotFound from './NotFound';
import BuildingCoreDetails from '../components/BuildingCoreDetails';
import {buildingFacts,buildingFactsSource} from '../repositories/buildingFacts';

function Reference({value}:{value:RecruitmentReference}) {
  return <small className="data-note">{value.table} · {value.rowId}</small>;
}

export default function BuildingPage() {
  const {id = ''} = useParams();
  const entry = buildingWikiRepository.get(id);
  useRecordView(entry ? {entityType:'building',entityId:id} : null);
  if (!entry) return <NotFound/>;
  const {building:b,links} = entry;
  const facts=buildingFacts(b);
  const stages = buildingWikiRepository.chain(b.chainKey);
  return <div className="building-wiki">
    <div className="breadcrumbs"><Link to="/">탐색</Link><span> / </span><Link to="/buildings">브레토니아 건물</Link></div>
    <div className="detail-hero"><div><div className="eyebrow">BUILDING · {entry.chainName}</div><h1>{entry.name}</h1><p>공식 한국어 건물명 · 단계별 건물 정보</p></div>
      <div className="detail-actions"><a className="button button-secondary" href="#my-record">내 기록으로</a><BookmarkButton target={{entityType:'building',entityId:id}}/></div>
    </div>
    <BuildingCoreDetails facts={facts} recruitmentCount={new Set(links.map(link=>link.unit.id)).size}/>
    <section className="section"><SectionTitle title="체인의 확인된 단계"/>
      <nav className="building-stage-links" aria-label="건물 단계">{stages.map(stage=><Link key={stage.building.key} to={pathFor('building',stage.building.key)} aria-current={stage.building.key === id ? 'page' : undefined}>
        CA 단계 {stage.building.stage} · {stage.name}
      </Link>)}</nav>
      <p className="data-note">등록된 단계만 표시합니다. 빠진 단계와 단계 간 승급 경로를 추정하지 않습니다.</p>
    </section>
    <section className="section" id="building-recruitment"><SectionTitle title="확인된 모집 유닛 연결" count={new Set(links.map(link=>link.unit.id)).size}/>
      <p className="data-note">모집 연결은 기존 WH3 {buildingFactsSource.recruitmentGameVersion} 자료를 보존합니다. 실제 캠페인 건설·모집 가능 여부: 미확인</p>
      <p className="data-note">이 건물 단계의 exact 직접 모집 행만 표시합니다. 연결의 실효 상태는 PARTIAL_SOURCE입니다. 상위 단계 상속·모집 풀·유닛 업그레이드를 합산하지 않습니다. 유닛별 추가 조건은 유닛 상세에서 확인하세요.</p>
      {links.length ? <div className="list-card">{links.map(link=><div className="building-unit-link" key={`${link.unit.id}:${link.requirement.sourceKey}`}>
        <Link to={pathFor('unit',link.unit.id)}>{link.unit.name}</Link>
        <p className="data-note">직접 연결 확인 · 실효 모집 가능 여부: 미확인</p>
        <details><summary>모집 연결 근거·원본 조건</summary><p>{link.unit.id} · source {link.requirement.sourceKey}</p>
          <p>지정 진영: {link.requirement.factionKey || '미지정'} · 원본 조건: {link.requirement.rawConditions} · 원본 enabled: {String(link.requirement.rawEnabled)}</p>
          <p className="data-note">기본 행의 enabled=false는 전역 모집 차단으로 해석하지 않습니다. 진영별 제외·해금 조건과 모집 한도는 별도입니다.</p>
          <Reference value={link.source.reference}/>
        </details>
      </div>)}</div> : <p className="panel">현재 승인 자료에 직접 모집 연결이 없습니다. 비모집 건물로 확정한 것은 아닙니다.</p>}
    </section>
    <details className="building-evidence"><summary>원본 근거 · 상세 건설 조건</summary>
    <section className="section"><SectionTitle title="건물 조건 · 원본 참조"/>
      <div className="panel recruitment-path">
        <p>주도시 전용 표식: {b.onlyInCapital ? '있음' : '없음'} · 진영 고유 표식: {b.factionUnique ? '있음' : '없음'} · UI 표시 표식: {b.visibleInUi ? '있음' : '없음'}</p>
        <p className="data-note">표식이 없거나 조건 행이 비어 있어도 모든 지역·진영에서 건설 가능하다는 뜻은 아닙니다.</p>
        <p>CA 단계 {b.stage} · 주건물 요구 단계 {b.requiredPrimaryBuildingLevel}</p>
        <p className="data-note">CA 단계는 0부터 시작하는 체인 단계이며 Tier로 환산하지 않습니다. 주건물 요구 단계는 별도 원본 값입니다.</p>
        <p>선행 건물 참조 {b.requiredBuildings.length}개</p>
        <ul>{b.requiredBuildings.map(required=><li key={required.reference.rowId}>
          {buildingWikiRepository.get(required.key) ? <Link to={pathFor('building',required.key)}>{buildingWikiRepository.get(required.key)!.name}</Link> : required.key}
          <p>{required.key}</p><Reference value={required.reference}/>
        </li>)}</ul>
        <details><summary>문화·진영 variant {b.variants.length}개</summary>{b.variants.map(v=><div key={v.reference.rowId}>
          <p>{v.name && !v.name.includes('{{tr:') ? v.name : '이름 미확인'} · 비활성 표식: {v.disables ? '있음' : '없음'}</p>
          <p>문화: {v.cultureKey || '미지정'} · 하위 문화: {v.subcultureKey || '미지정'} · 진영: {v.factionKey || '미지정'}</p><Reference value={v.reference}/>
        </div>)}</details>
        <details><summary>건물 availability set {b.availabilitySets.length}개 · 명시 규칙</summary>{b.availabilitySets.map(set=><div key={set.reference.rowId}>
          <p>{set.key} · 규칙 {set.rules.length}개</p><Reference value={set.reference}/>
          {set.rules.map(rule=><div key={rule.reference.rowId}><p>문화: {rule.culture || '미지정'} · 하위 문화: {rule.sub_culture || '미지정'} · 진영: {rule.faction || '미지정'} · 캠페인: {rule.campaign || '미지정'}</p><Reference value={rule.reference}/></div>)}
        </div>)}<p className="data-note">암묵 규칙과 실제 캠페인 적용 순서는 미확인입니다.</p></details>
        <details><summary>추가 조건·출처 식별자</summary>
          <p>건물: {b.key}</p><p>체인: {b.chainKey}</p><p>Instance: {b.instanceKey || '미지정'}</p>
          <p>자원: {b.resourceKey || '참조 없음'} · 자원 비용: {b.resourceCostKey || '참조 없음'} · 지휘관: {b.requiredCommanderKey || '참조 없음'}</p>
          <p>정착지 유형 참조 {b.settlementTypes.length}개 · 콘텐츠 팩 참조 {b.contentPacks.length}개</p>
          {b.settlementTypes.map(v=><div key={v.reference.rowId}><p>{v.key} · 제외 표식: {v.exclude ? '있음' : '없음'}</p><Reference value={v.reference}/></div>)}
          {b.contentPacks.map(v=><div key={v.reference.rowId}><p>{JSON.stringify(v.raw)}</p><Reference value={v.reference}/></div>)}
          <Reference value={b.reference}/><p>WH3 {recruitmentSnapshot.gameVersion}</p>
          <p>건물 기본 정보: WH3 {buildingFactsSource.gameVersion} · 공식 한국어 Loc</p>
          <p>건물 Snapshot: {buildingFactsSource.snapshotId}</p><p>건물 Source hash: {buildingFactsSource.sourceHash}</p>
          <p>한국어 pack SHA256: {buildingFactsSource.koreanPackHash}</p>
          {facts?.koreanName.status==='VERIFIED'&&<Reference value={facts.koreanName.reference}/>}
          {facts?.constructionCost.status==='VERIFIED'&&<p>{facts.constructionCost.field} · {facts.constructionCost.reference.rowId}</p>}
          {facts?.constructionTurns.status==='VERIFIED'&&<p>{facts.constructionTurns.field} · {facts.constructionTurns.reference.rowId}</p>}
          {facts?.effects.items.map(effect=><div key={effect.reference.rowId}><p>{effect.key} · {effect.scopeKey}</p><Reference value={effect.reference}/>
            <p>정상 {effect.value} · 손상 {effect.valueDamaged} · 폐허 {effect.valueRuined} · {effect.unit}</p></div>)}
          <p>Snapshot: {recruitmentSnapshot.snapshotId}</p><p>Source hash: {recruitmentSnapshot.sourceHash}</p>
          <p>검토 자료: {recruitmentSnapshot.reportReference}</p>
        </details>
      </div>
    </section>
    </details>
    <ArticleEditor key={id} target={{entityType:'building',entityId:id}} label={entry.name}/>
  </div>;
}
