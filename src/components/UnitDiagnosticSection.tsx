import type { DiagnosticCase, UnitDiagnostic } from '../repositories/unitDiagnosticRepository';
import { unitDiagnosticRepository } from '../repositories/unitDiagnosticRepository';

const roleLabels: Record<string, string> = {
  MAN: 'Man', MOUNT: 'Mount', ENGINE: 'Engine',
  ARTICULATED: 'Articulated · 연결체', PERSONALITY_ATTACHMENT: 'Attachment · 부착 구성',
  LAND_PRIMARY: '기본 무기', RIDER: '탑승자 무기', MAIN_SPECIFIC_JUNCTION: '조건부 무기',
};
const statusLabels: Record<string, string> = {
  OBSERVED_ONCE: '해당 관찰에서 확인', OBSERVED_RUNTIME: '런타임에서 record key 관찰',
  NOT_OBSERVED: '해당 관찰에서 미관찰', INCONCLUSIVE: '판정 불가', UNVERIFIED: '미검증',
  IDENTITY_PENDING: '정확한 식별 보류', NOT_REVIEWED: '정적 구성 미검토',
  CONFLICTING_RUNTIME_EVIDENCE: '상충하는 관찰', VALIDATED_SCOPED_OBSERVATION: '관찰 범위 내 검증',
};
const caseLabels: Record<string, string> = {
  'free-company-baseline': '기본 상태', 'free-company-blessed': 'Blessed Bullets만 적용',
  'free-company-exploding': 'Exploding Bullets만 적용', 'free-company-both': '두 modifier 모두 적용',
};
const interpretationLabels: Record<string, string> = {
  'black-coach': '사람이 탑승자, 말 2마리, 마차 본체와 연결체를 시각적으로 확인했습니다. 이 관찰에만 해당합니다.',
  'skeleton-chariots': '관찰된 전체 구성 비율은 본체 1 : 연결체 1 : 해골 2 : 말 2입니다. 개별 전차와 구성원의 부모 관계는 미검증입니다.',
  'dread-saurian': 'MountList와 EntityList는 같은 물리적 본체의 두 context view라는 사람의 확인이 있습니다. 탑승자 record 두 종류나 정적 연결 12건으로 역할·무기 짝을 확정할 수 없습니다.',
  'necrofex-colossus': 'MountList와 EntityList는 같은 본체라는 사람의 확인이 있습니다. 일부 승무원의 재장전 잔여 시간이 감소했지만, 세 snapshot의 두 탄약 값은 변하지 않았습니다.',
};

function Status({ value }: { value: string }) {
  const uncertain = ['UNVERIFIED', 'INCONCLUSIVE', 'IDENTITY_PENDING', 'CONFLICTING_RUNTIME_EVIDENCE'].includes(value);
  return <span className={`tag diagnostic-status${uncertain ? ' uncertain' : ''}`}>{value}{statusLabels[value] && ` · ${statusLabels[value]}`}</span>;
}
function Keys({ values }: { values: (string | null)[] }) {
  return <>{values.map((value, index) => <code className="diagnostic-key" key={`${value}:${index}`}>{value ?? 'key 미확인'}</code>)}</>;
}

// Group identical display rows, preserving path multiplicity. These counts are
// DB connections, never entity counts, shots, or a resolved weapon selection.
function groupRows<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, { row: T; paths: number }>();
  for (const row of rows) {
    const id = key(row), group = groups.get(id);
    if (group) group.paths += 1;
    else groups.set(id, { row, paths: 1 });
  }
  return [...groups.values()];
}

function RuntimeCase({ evidence }: { evidence: DiagnosticCase }) {
  return <div className="diagnostic-case">
    <h4>{caseLabels[evidence.id] ?? '확보된 관찰'} {evidence.confidenceStatuses.map(s => <Status key={s} value={s}/>)}</h4>
    <p className="data-note">RUNTIME_CCO · Unit Size {evidence.unitSizes.join(', ') || 'NOT_RECORDED'} (선언값) · {evidence.scopedCaptures} captures 중 {evidence.completeCaptures} complete · {evidence.heldCaptures} held</p>
    {evidence.modifiers && <p className="diagnostic-note">RUNTIME_MANUAL 설정 선언: Blessed Bullets {evidence.modifiers.blessed ? '적용' : '미적용'}, Exploding Bullets {evidence.modifiers.exploding ? '적용' : '미적용'}. 적용 여부는 CCO로 판정한 값이 아닙니다.</p>}
    <p className="diagnostic-note">첫 snapshot의 논리적 entity 수 (NumEntities): {evidence.fields.NumEntities.status === 'VALUE' ? evidence.fields.NumEntities.value : '미확인'} · CCO HP: {evidence.fields.HealthValue.status === 'VALUE' ? evidence.fields.HealthValue.value : '미확인'} / {evidence.fields.HealthMax.status === 'VALUE' ? evidence.fields.HealthMax.value : '미확인'}</p>
    <div className="diagnostic-rows">{evidence.views.filter(v => v.records.length).map(view => <div className="diagnostic-row" key={view.list}>
      <strong>{view.list} · {view.size ?? '미확인'} entries</strong>
      <div>{view.records.map(record => <div key={record.key}><Keys values={[record.key]}/><small>{record.entries} entries</small></div>)}</div>
    </div>)}</div>
    <p className="diagnostic-note">Context view는 겹칠 수 있습니다. 위 entry 수를 합산해 물리적 모델 수로 해석하지 않습니다.</p>
    <div className="diagnostic-projectiles"><strong>관찰된 ActiveProjectileContext</strong>
      {evidence.projectileKeys.length ? <><Keys values={evidence.projectileKeys}/><p className="diagnostic-note">Projectile context 관찰입니다. 특정 weapon source의 활성이나 동시 발사를 확정하지 않습니다.</p></> : <p className="diagnostic-note">이 관찰에서 projectile key를 확보하지 못했습니다. 발사 불가능을 뜻하지 않습니다.</p>}
    </div>
    {interpretationLabels[evidence.id] && <p className="diagnostic-note">RUNTIME_MANUAL · {interpretationLabels[evidence.id]}</p>}
    <div className="diagnostic-uncertainty"><span>Entity index 연속성 <Status value={evidence.entityIndexContinuity}/></span><span>무기 source 동시 활성 <Status value={evidence.simultaneousSources}/></span></div>
    {evidence.problems.length > 0 && <p className="diagnostic-note">일부 capture 보류·불완전: {evidence.problems.join(', ')}. 확보된 관찰의 범위만 표시합니다.</p>}
  </div>;
}

export default function UnitDiagnosticSection({ evidence }: { evidence?: UnitDiagnostic }) {
  if (!evidence) return null;
  const { snapshot } = unitDiagnosticRepository;
  const entities = groupRows(evidence.entities, p => JSON.stringify([p.role, p.entityKey, p.rawCount, p.statuses]));
  const missiles = groupRows(evidence.missiles, p => JSON.stringify([p.role, p.weaponKey, p.projectileKeys, p.placement, p.activationStatuses]));
  return <section className="section" aria-label="데이터 해석 근거">
    <details className="panel diagnostic-section" key={evidence.id}>
      <summary>데이터 해석 근거 <span>정적 구성과 실제 관찰 · {snapshot.gameVersion}</span></summary>
      <div className="diagnostic-content">
        <p className="diagnostic-note">확보된 diagnostic evidence입니다. 기본 스탯이나 production 값으로 승격되지 않았으며, 관찰된 설정과 snapshot 범위에만 해당합니다.</p>
        <h3>정적 entity 구성</h3>
        {entities.length ? <div className="diagnostic-rows">{entities.map(({ row, paths }, index) => <div className="diagnostic-row" key={index}>
          <strong>{roleLabels[row.role] ?? row.role}</strong><div><Keys values={[row.entityKey]}/>
            <small>정적 연결 {paths}건{row.rawCount !== null && ` · DB raw count ${row.rawCount} (RAW_COUNT_ONLY · 의미 UNRESOLVED)`}</small>
            <div className="diagnostic-badges"><span className="tag">static · DIRECT</span>{row.statuses.map(s => <Status key={s} value={s}/>)}</div>
          </div>
        </div>)}</div> : <p className="diagnostic-note"><Status value={evidence.entityReviewStatus}/> · 런타임 context view는 아래에서 확인할 수 있습니다.</p>}
        <p className="diagnostic-note">Man·Mount 등은 DB의 역할입니다. Record key의 관찰과 실제 배치·부모 관계·독립 타격·HP 기여는 별개입니다. 정적 연결 수는 모델 수가 아닙니다.</p>
        <h3>Missile / projectile 정적 후보</h3>
        {missiles.length ? <div className="diagnostic-rows">{missiles.map(({ row, paths }, index) => <div className="diagnostic-row" key={index}>
          <strong>{roleLabels[row.role] ?? row.role}</strong><div><Keys values={[row.weaponKey]}/><Keys values={row.projectileKeys}/>
            <small>정적 연결 {paths}건 · {row.placement === 'CONDITIONAL' ? '조건부 / override 후보' : row.placement}</small>
            <div className="diagnostic-badges"><span className="tag">static · DIRECT</span>{row.activationStatuses.map(s => <Status key={s} value={s}/>)}</div>
            <small>{evidence.cases.some(c => c.projectileKeys.some(key => row.projectileKeys.includes(key))) ? '해당 projectile context 관찰 있음 (아래 조건별 기록 참조)' : 'static only · 해당 projectile context 런타임 미관찰'}</small>
            <small>Weapon source activation 미확정</small>
          </div>
        </div>)}</div> : <p className="diagnostic-note">이 snapshot의 조사 범위에서 정적 missile 후보가 없습니다. 런타임 발사 불가능을 확정하는 정보는 아닙니다.</p>}
        <h3>실제 관찰과 조건</h3>
        {evidence.cases.map(c => <RuntimeCase key={c.id} evidence={c}/>)}
        {evidence.precedence && <div className="diagnostic-case"><h3>기록된 precedence 해석</h3><Status value={evidence.precedence.status}/><p>{evidence.precedence.subjectLabel}</p>
          <p className="diagnostic-note">{evidence.precedence.kind} · OVERRIDE_PRECEDENCE / {evidence.precedence.relationship}. Free Company Militia, {snapshot.gameVersion}, 사람이 선언한 두 modifier의 캠페인 설정에 한정된 기록입니다. 개별 weapon 활성은 INCONCLUSIVE이며 범용 override 규칙으로 적용하지 않습니다.</p>
        </div>}
        <details className="diagnostic-provenance"><summary>출처·버전·관찰 범위</summary>
          <dl><dt>자료</dt><dd>static / DIRECT · RUNTIME_CCO · RUNTIME_MANUAL{evidence.precedence && ' · 기록된 precedence 해석'}</dd>
            <dt>게임 / batch</dt><dd>{snapshot.gameVersion} / {snapshot.batchId}</dd>
            <dt>Static snapshot</dt><dd><Keys values={[snapshot.staticSnapshotId]}/></dd>
            <dt>Schema SHA256</dt><dd><Keys values={[snapshot.snapshot.schemaSha256]}/></dd>
            {snapshot.snapshot.packs.map(pack => <div key={pack.name}><dt>{pack.name}</dt><dd><Keys values={[pack.sha256]}/></dd></div>)}
            <dt>Main / land key</dt><dd><Keys values={[evidence.sourceMainKey, evidence.sourceLandKey]}/></dd>
            <dt>Context</dt><dd>{evidence.contextId ?? 'null · 보존된 diagnostic source (production roster context 아님)'}</dd>
          </dl>
          <p className="diagnostic-note">게임 버전은 installer의 실행 파일 기준, Unit Size는 선언값입니다. Rank·difficulty·mods 등 기록되지 않은 조건은 NOT_RECORDED로 남아 있으며 loaded pack을 런타임에서 증명한 것은 아닙니다.</p>
          {evidence.cases.map(c => <div key={c.id}><h4>{caseLabels[c.id] ?? c.id}</h4>{c.validationStatuses.map(s => <Status key={s} value={s}/>)}<p className="diagnostic-note">{c.interpretation.kind} · {c.interpretation.reference}</p><p className="diagnostic-note">{c.interpretation.text}</p>
            <p className="diagnostic-note">첫 frame 참조 {c.references.length}개: {c.references.slice(0, 3).join(', ') || '미확보'}{c.references.length > 3 && ' …'}</p><p className="diagnostic-note">관찰 지점 {c.samplePoints.length}개: {c.samplePoints[0] ?? '미확보'}{c.samplePoints.length > 1 && ` ~ ${c.samplePoints[c.samplePoints.length - 1]}`}</p>
            {c.projectileReferences.length > 0 && <p className="diagnostic-note">Projectile 참조 {c.projectileReferences.length}개: {c.projectileReferences.slice(0, 3).join(', ')}{c.projectileReferences.length > 3 && ' …'}</p>}
          </div>)}
          {evidence.precedence && <p className="diagnostic-note">Precedence: {evidence.precedence.validationStatus} · {evidence.precedence.scope} · {evidence.precedence.observation}</p>}
        </details>
      </div>
    </details>
  </section>;
}
