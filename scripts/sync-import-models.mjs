#!/usr/bin/env node
/**
 * Optional sync helper for the pinned import model catalog.
 * v1 keeps a hand-curated catalog.json; this script validates structure only.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../packages/import-models/catalog.json');

async function main() {
  const raw = await readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(raw);

  if (!Array.isArray(catalog.providers) || catalog.providers.length === 0) {
    throw new Error('catalog.json must include at least one provider');
  }

  for (const provider of catalog.providers) {
    if (!provider.id || !provider.apiKeyLabel || !Array.isArray(provider.models)) {
      throw new Error(`Invalid provider entry: ${JSON.stringify(provider)}`);
    }
    for (const model of provider.models) {
      if (!model.id?.startsWith(`${provider.id}/`) && !model.id?.includes('/')) {
        throw new Error(`Model id must be Mastra form: ${model.id}`);
      }
    }
  }

  console.log(`Validated import model catalog (${catalog.providers.length} providers).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
