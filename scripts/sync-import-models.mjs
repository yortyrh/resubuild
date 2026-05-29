#!/usr/bin/env node
/**
 * Optional: write packages/import-models/catalog.json from models.dev (offline fallback bundle).
 * Runtime catalog is loaded from models.dev by ImportModelsCatalogService on API startup.
 * @see https://models.dev/api.json
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertImportModelCatalog,
  buildImportModelCatalog,
  fetchModelsDevRegistry,
} from '../packages/import-models/dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../packages/import-models/catalog.json');

async function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has('--write') || args.size === 0;

  const registry = await fetchModelsDevRegistry();
  const catalog = buildImportModelCatalog(registry);
  assertImportModelCatalog(catalog);

  const modelCount = catalog.providers.reduce((n, provider) => n + provider.models.length, 0);
  console.log(
    `Built catalog: ${catalog.providers.length} providers, ${modelCount} chat-capable models.`,
  );

  if (write) {
    await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${catalogPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
