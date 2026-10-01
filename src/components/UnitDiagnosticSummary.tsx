import { unitDiagnosticRepository, type UnitDiagnostic } from '../repositories/unitDiagnosticRepository';

export default function UnitDiagnosticSummary({ evidence }: { evidence: UnitDiagnostic }) {
  // Counts describe coverage only, never entities, shots, confidence or admission.
  const statuses = new Set([
    ...evidence.entities.flatMap(path => path.statuses),
    ...evidence.missiles.flatMap(path => path.activationStatuses),
    ...evidence.cases.flatMap(item => [item.entityIndexContinuity, item.simultaneousSources]),
  ]);
  return <div className="diagnostic-overview">
    <dl className="diagnostic-summary" aria-label="관찰 자료 범위">
      <div><dt>정적 entity path</dt><dd>{evidence.entityReviewStatus === 'NOT_REVIEWED' ? '미검토' : `${evidence.entities.length}건`}</dd></div>
      <div><dt>Missile 후보 path</dt><dd>{evidence.missiles.length}건</dd></div>
      <div><dt>Runtime case</dt><dd>{evidence.cases.length}건</dd></div>
      <div><dt>게임 버전</dt><dd>{unitDiagnosticRepository.snapshot.gameVersion}</dd></div>
    </dl>
    <p className="data-note">자료의 연결·관찰 건수이며 실제 모델 수나 발사 수가 아닙니다.{statuses.has('UNVERIFIED') && ' UNVERIFIED 항목 있음.'}{statuses.has('INCONCLUSIVE') && ' INCONCLUSIVE 항목 있음.'}</p>
  </div>;
}
