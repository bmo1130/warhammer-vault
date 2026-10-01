import { materializeCatalogRequest } from '../../tools/wh3-importer/catalog-identity/materialize.mjs';
import type { CatalogRawSource, CatalogRequest, MaterializationResult } from '../../tools/wh3-importer/catalog-identity/materialize.mjs';
import type { CatalogIdentityReview } from '../../tools/wh3-importer/catalog-identity/policy.mjs';
import { validateUnits } from '../../src/domain/unitValidation';

// Compile-time consumer only; never part of the app's runtime catalog.
export function materialize(source: CatalogRawSource, review: CatalogIdentityReview, request: CatalogRequest): Promise<MaterializationResult> {
  return materializeCatalogRequest(source, review, request, validateUnits);
}
