'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WebScrapeProvider } from '@/lib/api';
import {
  useClearWebScrapeConfig,
  useSaveWebScrapeConfig,
  useWebScrapeConfig,
} from '@/lib/queries/web-scrape-queries';

export function WebScrapeSettings() {
  const providerSelectId = useId();
  const apiKeyInputId = useId();

  const { data: status, isLoading } = useWebScrapeConfig();
  const saveConfig = useSaveWebScrapeConfig();
  const clearConfig = useClearWebScrapeConfig();

  const [provider, setProvider] = useState<WebScrapeProvider>('firecrawl');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const saving = saveConfig.isPending || clearConfig.isPending;

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      await saveConfig.mutateAsync({ provider, apiKey: apiKey.trim() });
      setApiKey('');
      setSuccess('Website scrape provider saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scrape settings');
    }
  };

  const handleClear = async () => {
    setError(null);
    setSuccess(null);
    try {
      await clearConfig.mutateAsync();
      setSuccess('Website scrape provider removed. Imports will use raw HTML.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear scrape settings');
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading website scrape settings…</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Website import (page extraction)</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose one service to turn CV web pages into markdown before the AI agent imports them. If
          none is set, the agent receives raw HTML from the page instead. When Tavily is selected,
          the same key also powers optional web lookup during PDF and Markdown import.
        </p>
      </div>

      {status?.configured ? (
        <p className="text-sm">
          Active provider: <span className="font-medium capitalize">{status.provider}</span>
          {status.reconfigurationRequired ? (
            <span className="text-destructive">
              {' '}
              — re-enter API key after encryption key change
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          No scrape provider configured (HTML fallback).
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={providerSelectId}>Provider</Label>
          <select
            id={providerSelectId}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={provider}
            disabled={saving}
            onChange={(event) => setProvider(event.target.value as WebScrapeProvider)}
          >
            <option value="firecrawl">Firecrawl</option>
            <option value="tavily">Tavily</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={apiKeyInputId}>API key</Label>
          <Input
            id={apiKeyInputId}
            type="password"
            autoComplete="off"
            placeholder={status?.configured ? 'Enter new key to replace' : 'Paste API key'}
            value={apiKey}
            disabled={saving}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!apiKey.trim() || saving} onClick={() => void handleSave()}>
          Save provider
        </Button>
        {status?.configured ? (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void handleClear()}
          >
            Remove provider
          </Button>
        ) : null}
      </div>
    </div>
  );
}
