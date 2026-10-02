import type { UnitCatalogEntry } from '../repositories/unitCatalogRepository';
import EntityRow from './EntityRow';

export default function UnitCatalogRow({ entry }: { entry: UnitCatalogEntry }) {
  const badge = entry.kind === 'diagnostic-only' ? 'Diagnostic-only' : entry.isSample ? 'Sample · 일반 Unit' : entry.hasDiagnostic ? 'Production · Evidence' : 'Production';
  const production = entry.hasProduction ? (entry.isSample ? '구조 검증용 샘플 · 수치 미검증' : 'Production data 있음') : 'Production data 없음';
  return <EntityRow type="unit" id={entry.id} name={entry.name} badge={badge}
    subtitle={`${production} · Diagnostic evidence ${entry.hasDiagnostic ? '있음' : '없음'}`}/>;
}
