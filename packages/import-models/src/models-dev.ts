/** Subset of https://models.dev/api.json used to build the import catalog. */

export const MODELS_DEV_API_URL = 'https://models.dev/api.json';

export interface ModelsDevModel {
  id: string;
  name?: string;
  tool_call?: boolean;
  reasoning?: boolean;
  modalities?: {
    output?: string[];
  };
}

export interface ModelsDevProvider {
  id: string;
  name?: string;
  doc?: string;
  env?: string[];
  models?: Record<string, ModelsDevModel>;
}

export type ModelsDevRegistry = Record<string, ModelsDevProvider>;
