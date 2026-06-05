'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { WebScrapeSettings } from '@/components/settings/web-scrape-settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AiAgentAccount } from '@/lib/api';
import {
  useAiAgentAccounts,
  useAiAgentModels,
  useAiAgentProviders,
  useCreateAiAgentAccount,
  useDeleteAiAgentAccount,
  useSetAiAgentActive,
  useUpdateAiAgentAccount,
} from '@/lib/queries/ai-agent-queries';

type DialogMode = 'create' | 'edit' | null;

export interface AiAgentSettingsProps {
  backHref?: string;
  backLabel?: string;
}

export function AiAgentSettings({ backHref, backLabel }: AiAgentSettingsProps = {}) {
  const labelInputId = useId();
  const providerSelectId = useId();
  const modelSelectId = useId();
  const apiKeyInputId = useId();

  const {
    data: providers = [],
    isLoading: providersLoading,
    error: providersError,
  } = useAiAgentProviders();
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
  } = useAiAgentAccounts();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingAccount, setEditingAccount] = useState<AiAgentAccount | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [label, setLabel] = useState('');
  const [apiKeyLabel, setApiKeyLabel] = useState('API key');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiAgentAccount | null>(null);

  const { data: models = [] } = useAiAgentModels(selectedProvider, {
    enabled: Boolean(selectedProvider),
  });

  const createAccount = useCreateAiAgentAccount();
  const updateAccount = useUpdateAiAgentAccount();
  const deleteAccount = useDeleteAiAgentAccount();
  const setActiveAccount = useSetAiAgentActive();

  const loading = providersLoading || accountsLoading;
  const loadError = providersError ?? accountsError;

  useEffect(() => {
    if (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load AI agent settings');
    }
  }, [loadError]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingAccount(null);
    setSelectedProvider('');
    setSelectedModel('');
    setLabel('');
    setApiKey('');
    setError(null);
    setSuccess(null);
  };

  const openEditDialog = (account: AiAgentAccount) => {
    setDialogMode('edit');
    setEditingAccount(account);
    setSelectedProvider(account.providerId);
    setSelectedModel(account.modelId);
    setLabel(account.label ?? '');
    setApiKey('');
    setError(null);
    setSuccess(null);
    const provider = providers.find((entry) => entry.id === account.providerId);
    setApiKeyLabel(provider?.apiKeyLabel ?? 'API key');
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel('');
    const provider = providers.find((entry) => entry.id === providerId);
    setApiKeyLabel(provider?.apiKeyLabel ?? 'API key');
  };

  const handleSaveDialog = async () => {
    setError(null);
    setSuccess(null);
    try {
      if (dialogMode === 'create') {
        await createAccount.mutateAsync({
          label: label.trim() || undefined,
          modelId: selectedModel,
          apiKey: apiKey.trim(),
        });
        setSuccess('AI agent account created.');
      } else if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          payload: {
            label: label.trim() || undefined,
            modelId: selectedModel || undefined,
            ...(apiKey.trim()
              ? { apiKey: apiKey.trim() }
              : editingAccount.reconfigurationRequired
                ? {}
                : { keepExistingApiKey: true }),
          },
        });
        setSuccess('AI agent account updated.');
      }
      setDialogMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    }
  };

  const handleSetActive = async (accountId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await setActiveAccount.mutateAsync(accountId);
      setSuccess('Active account updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active account');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    try {
      await deleteAccount.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess('Account deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const saving =
    createAccount.isPending ||
    updateAccount.isPending ||
    deleteAccount.isPending ||
    setActiveAccount.isPending;

  const canKeepExistingKey =
    dialogMode === 'edit' && editingAccount && !editingAccount.reconfigurationRequired;

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading AI agent settings…</p>;
  }

  const hasReconfigurationRequired = accounts.some((account) => account.reconfigurationRequired);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI agent settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Bring your own API keys from providers you subscribe to (Anthropic, OpenAI, Google,
          OpenRouter). Cursor or ChatGPT subscriptions do not expose API keys — use a provider key
          instead.
        </p>
      </div>

      {hasReconfigurationRequired ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          A saved API key cannot be read after an encryption key change. Edit the account and enter
          your API key again.
        </p>
      ) : null}

      <section className="surface-soft text-card-foreground space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Accounts</h2>
          <Button type="button" size="sm" onClick={openCreateDialog}>
            Add account
          </Button>
        </div>

        {accounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No accounts yet. Add one to enable AI features.
          </p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="surface-soft text-card-foreground flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {account.label || account.providerId}
                    {account.isActive ? (
                      <span className="bg-primary/10 text-primary ml-2 rounded px-2 py-0.5 text-xs">
                        Active
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {account.providerId} · {account.modelId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!account.isActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSetActive(account.id)}
                    >
                      Set active
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(account)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(account)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      {backHref ? (
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>{backLabel ?? 'Back'}</Link>
        </Button>
      ) : null}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Add AI agent account' : 'Edit AI agent account'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Connect a provider and model for AI-assisted CV and application workflows.'
                : 'Update the label, provider, model, or API key for this account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={labelInputId}>Label (optional)</Label>
              <Input
                id={labelInputId}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Work Anthropic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={providerSelectId}>Provider</Label>
              <select
                id={providerSelectId}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={selectedProvider}
                onChange={(event) => handleProviderChange(event.target.value)}
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
              <Input
                id={apiKeyInputId}
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  canKeepExistingKey ? 'Leave blank to keep existing key' : 'Enter API key'
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !selectedModel ||
                saving ||
                (dialogMode === 'create' && !apiKey.trim()) ||
                (dialogMode === 'edit' && !apiKey.trim() && !canKeepExistingKey)
              }
              onClick={() => void handleSaveDialog()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WebScrapeSettings />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This removes the saved credentials for{' '}
              {deleteTarget?.label || deleteTarget?.providerId}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
