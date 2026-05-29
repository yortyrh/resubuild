import fallbackCatalog from '../catalog.json';
import type { ImportModelCatalog } from './index';

/** Offline fallback when models.dev is unreachable (tests, startup failure). */
export function loadFallbackImportModelCatalog(): ImportModelCatalog {
  return fallbackCatalog as ImportModelCatalog;
}
