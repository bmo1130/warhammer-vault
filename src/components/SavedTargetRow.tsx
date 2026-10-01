import type { ArticleTarget } from '../domain/types';
import { typeName } from '../domain/entities';
import { resolveSavedTargetName } from '../repositories/archivePresentation';
import { unitCatalogRepository } from '../repositories/unitCatalogRepository';
import EntityRow from './EntityRow';
import UnitCatalogRow from './UnitCatalogRow';

export default function SavedTargetRow({ target }: { target: ArticleTarget }) {
  const name = resolveSavedTargetName(target);
  if (!name) return <div className="entity-row stale-target">
    <span className="entity-glyph" aria-hidden="true">?</span>
    <span className="entity-text"><strong>현재 목록에 없는 항목</strong><small>{typeName(target.entityType)} · {target.entityId}</small><small>개인 기록은 보존되며 백업에 포함됩니다.</small></span>
  </div>;
  const unit = target.entityType === 'unit' ? unitCatalogRepository.get(target.entityId) : undefined;
  return unit ? <UnitCatalogRow entry={unit}/> : <EntityRow type={target.entityType} id={target.entityId} name={name}/>;
}
