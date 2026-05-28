'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  getImportLlmConfig,
  getImportLlmModels,
  getImportLlmProviders,
  type ImportLlmProvider,
  saveImportLlmConfig,
} from '@/lib/api';

export function ImportLlmSettingsForm() {
  const providerSelectId = useId();
  const modelSelectId = useId();
  const apiKeyInputId = useId();

  const [providers, setProviders] = useState<ImportLlmProvider[]>([]);
  const [models, setModels] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKeyLabel, setApiKeyLabel] = useState('API key');
  const [apiKey, setApiKey] = useState('');
  const [configuredModelId, setConfiguredModelId] = useState<string | null>(null);
  const [reconfigurationRequired, setReconfigurationRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [providerList, config] = await Promise.all([
          getImportLlmProviders(),
          getImportLlmConfig(),
        ]);
        setProviders(providerList);
        if (config.configured && config.modelId) {
          setConfiguredModelId(config.modelId);
          setSelectedModel(config.modelId);
          const providerId = config.modelId.split('/')[0];
          setSelectedProvider(providerId);
          const provider = providerList.find((entry) => entry.id === providerId);
          if (provider) {
            setApiKeyLabel(provider.apiKeyLabel);
          }
          const modelList = await getImportLlmModels(providerId);
          setModels(modelList);
        } else if (config.reconfigurationRequired && config.modelId) {
          setReconfigurationRequired(true);
          setSelectedModel(config.modelId);
          const providerId = config.modelId.split('/')[0];
          setSelectedProvider(providerId);
          const provider = providerList.find((entry) => entry.id === providerId);
          if (provider) {
            setApiKeyLabel(provider.apiKeyLabel);
          }
          const modelList = await getImportLlmModels(providerId);
          setModels(modelList);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load import settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleProviderChange = async (providerId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel('');
    setError(null);
    setSuccess(null);
    const provider = providers.find((entry) => entry.id === providerId);
    setApiKeyLabel(provider?.apiKeyLabel ?? 'API key');
    const modelList = await getImportLlmModels(providerId);
    setModels(modelList);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        modelId: selectedModel,
        ...(apiKey.trim()
          ? { apiKey: apiKey.trim() }
          : canKeepExistingKey
            ? { keepExistingApiKey: true }
            : {}),
      };
      const saved = await saveImportLlmConfig(payload);
      setConfiguredModelId(saved.modelId ?? null);
      setReconfigurationRequired(false);
      setSuccess('Import LLM settings saved.');
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const canKeepExistingKey = Boolean(configuredModelId) && !reconfigurationRequired;

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading import settings…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">PDF import LLM settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Choose a provider, model, and API key before importing PDF résumés.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        {reconfigurationRequired ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Your saved API key cannot be read after an encryption key change. Enter your API key
            again to re-enable PDF import.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={providerSelectId}>Provider</Label>
          <select
            id={providerSelectId}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={selectedProvider}
            onChange={(event) => void handleProviderChange(event.target.value)}
          >
            <option value="">Select a provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={modelSelectId}>Model</Label>
          <select
            id={modelSelectId}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={selectedModel}
            disabled={!selectedProvider}
            onChange={(event) => setSelectedModel(event.target.value)}
          >
            <option value="">Select a model</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={apiKeyInputId}>{apiKeyLabel}</Label>
          <input
            id={apiKeyInputId}
            type="password"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder={canKeepExistingKey ? 'Leave blank to keep existing key' : 'Enter API key'}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        <div className="flex gap-3">
          <Button
            type="button"
            disabled={!selectedModel || saving || (!apiKey.trim() && !canKeepExistingKey)}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/cv/new">Back to new CV</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
