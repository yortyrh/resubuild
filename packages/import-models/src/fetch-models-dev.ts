import { MODELS_DEV_API_URL, type ModelsDevRegistry } from './models-dev';

export type FetchFn = typeof fetch;

export async function fetchModelsDevRegistry(
  apiUrl: string = MODELS_DEV_API_URL,
  fetchImpl: FetchFn = fetch,
): Promise<ModelsDevRegistry> {
  const response = await fetchImpl(apiUrl);
  if (!response.ok) {
    throw new Error(`models.dev API failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ModelsDevRegistry>;
}
