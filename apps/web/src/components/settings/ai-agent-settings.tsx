'use client';

import { Check, KeyRound, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { ProviderIcon } from '@/components/ai/provider-icon';
import { IncludedAiCard } from '@/components/settings/included-ai-card';
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
import {
  defaultAccountName,
  describeModelOptions,
  pruneModelOptions,
  visibleOptionFields,
} from '@/lib/ai-model-display';
import type { AiAgentAccount, AiModelOptionField, AiModelOptions } from '@/lib/api';
import {
  useAiAgentAccounts,
  useAiAgentActive,
  useAiAgentIncluded,
  useAiAgentModels,
  useAiAgentProviders,
  useCreateAiAgentAccount,
  useDeleteAiAgentAccount,
  useSetAiAgentActive,
  useUpdateAiAgentAccount,
} from '@/lib/queries/ai-agent-queries';

type DialogMode = 'create' | 'edit' | null;

/** Keeps browsers and password managers from filling the label and API key fields. */
const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const;

const DUPLICATE_LABEL_HINT =
  'You already have an account for this model without a label. Add a label to tell them apart.';

export interface AiAgentSettingsProps {
  backHref?: string;
  backLabel?: string;
}

export function AiAgentSettings({ backHref, backLabel }: AiAgentSettingsProps = {}) {
  const labelInputId = useId();
  const providerSelectId = useId();
  const modelSelectId = useId();
  const apiKeyInputId = useId();
  const labelHintId = useId();
  const apiKeyHintId = useId();
  const optionIdPrefix = useId();

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

  const { data: included } = useAiAgentIncluded();
  const { data: active } = useAiAgentActive();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingAccount, setEditingAccount] = useState<AiAgentAccount | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [label, setLabel] = useState('');
  const [apiKeyLabel, setApiKeyLabel] = useState('API key');
  const [apiKey, setApiKey] = useState('');
  const [modelOptions, setModelOptions] = useState<AiModelOptions>({});
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

  const provider = providers.find((entry) => entry.id === selectedProvider);
  const model = models.find((entry) => entry.id === selectedModel);
  const optionFields: AiModelOptionField[] = provider?.modelOptions ?? [];
  const reasoning = model?.reasoning ?? false;
  const shownOptionFields = visibleOptionFields(optionFields, reasoning, modelOptions);

  const defaultName =
    provider && model ? defaultAccountName(provider.displayName, model.displayName) : null;
  const otherAccounts = useMemo(
    () => accounts.filter((account) => account.id !== editingAccount?.id),
    [accounts, editingAccount],
  );
  const needsLabel =
    Boolean(selectedModel) &&
    !label.trim() &&
    otherAccounts.some((account) => account.modelId === selectedModel && !account.label?.trim());

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
    setApiKeyLabel('API key');
    setModelOptions({});
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
    setModelOptions(account.modelOptions ?? {});
    setError(null);
    setSuccess(null);
    const accountProvider = providers.find((entry) => entry.id === account.providerId);
    setApiKeyLabel(accountProvider?.apiKeyLabel ?? 'API key');
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel('');
    // Options are provider-specific.
    setModelOptions({});
    const nextProvider = providers.find((entry) => entry.id === providerId);
    setApiKeyLabel(nextProvider?.apiKeyLabel ?? 'API key');
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const nextModel = models.find((entry) => entry.id === modelId);
    setModelOptions((current) =>
      pruneModelOptions(optionFields, nextModel?.reasoning ?? false, current),
    );
  };

  const setOption = (field: AiModelOptionField, raw: string) => {
    setModelOptions((current) => {
      const next = { ...current };
      if (raw === '') {
        delete next[field.key];
      } else {
        next[field.key] = field.kind === 'integer' ? Number(raw) : raw;
      }
      return pruneModelOptions(optionFields, reasoning, next);
    });
  };

  // Until the model list loads we cannot tell reasoning models apart: send as is.
  const optionsToSave = () =>
    model ? pruneModelOptions(optionFields, reasoning, modelOptions) : modelOptions;

  const handleSaveDialog = async () => {
    setError(null);
    setSuccess(null);
    try {
      if (dialogMode === 'create') {
        await createAccount.mutateAsync({
          label: label.trim() || undefined,
          modelId: selectedModel,
          apiKey: apiKey.trim(),
          modelOptions: optionsToSave(),
        });
        setSuccess('AI agent account created.');
      } else if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          payload: {
            label: label.trim(),
            modelId: selectedModel || undefined,
            modelOptions: optionsToSave(),
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

  const handleSetActive = async (selection: string | 'included') => {
    setError(null);
    setSuccess(null);
    try {
      await setActiveAccount.mutateAsync(selection);
      setSuccess(selection === 'included' ? 'Now using included AI.' : 'Active account updated.');
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="display text-[2rem] sm:text-[2.5rem]">AI agent settings</h1>
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

      {included?.enabled ? (
        <IncludedAiCard
          status={included}
          isActive={active?.source === 'included'}
          busy={saving}
          onSelect={() => void handleSetActive('included')}
        />
      ) : null}

      <section className="surface-soft text-card-foreground space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{included?.enabled ? 'Your API keys' : 'Accounts'}</h2>
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
                <div className="flex min-w-0 items-start gap-3">
                  <ProviderIcon
                    providerId={account.providerId}
                    title={account.providerDisplayName}
                    className="mt-0.5 size-5"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {account.displayName}
                      {account.isActive ? (
                        <span className="bg-primary/10 text-primary ml-2 rounded px-2 py-0.5 text-xs">
                          Active
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {account.label
                        ? `${account.providerDisplayName} · ${account.modelDisplayName}`
                        : account.modelId}
                    </p>
                    <AccountOptionChips
                      fields={
                        providers.find((entry) => entry.id === account.providerId)?.modelOptions
                      }
                      options={account.modelOptions}
                    />
                  </div>
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
                name="ai-account-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={defaultName ?? 'e.g. Work or Personal'}
                aria-describedby={labelHintId}
                aria-invalid={needsLabel || undefined}
                {...NO_AUTOFILL}
              />
              <div id={labelHintId} className="text-muted-foreground space-y-1 text-xs">
                <p>
                  {defaultName ? (
                    <>
                      Without a label this account is shown as{' '}
                      <span className="text-foreground font-medium">“{defaultName}”</span>.
                    </>
                  ) : (
                    'Without a label the account is shown by provider and model, e.g. “Anthropic · Claude Opus 4.5”.'
                  )}{' '}
                  Add one only to tell apart accounts that use the same model.
                </p>
                {otherAccounts.length > 0 ? (
                  <p>
                    Your accounts: {otherAccounts.map((account) => account.displayName).join(', ')}
                  </p>
                ) : null}
                {needsLabel ? <p className="text-destructive">{DUPLICATE_LABEL_HINT}</p> : null}
              </div>
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
                onChange={(event) => handleModelChange(event.target.value)}
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName}
                    {model.reasoning ? ' — reasoning' : ''}
                  </option>
                ))}
              </select>
            </div>

            {shownOptionFields.length > 0 ? (
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">
                  {reasoning ? 'Reasoning and model options' : 'Model options'}
                </legend>
                <p className="text-muted-foreground text-xs">
                  Leave an option on “Provider default” to use what the provider chooses.
                </p>
                {shownOptionFields.map((field) => (
                  <ModelOptionInput
                    key={field.key}
                    id={`${optionIdPrefix}-${field.key}`}
                    field={field}
                    value={modelOptions[field.key]}
                    onChange={(raw) => setOption(field, raw)}
                  />
                ))}
              </fieldset>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={apiKeyInputId}>{apiKeyLabel}</Label>
              {dialogMode === 'edit' && editingAccount ? (
                canKeepExistingKey ? (
                  <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Check className="size-3.5" aria-hidden />
                        API key saved
                      </span>{' '}
                      — stored encrypted and never shown. Leave the field empty to keep it, or paste
                      a new key to replace it.
                    </span>
                  </p>
                ) : (
                  <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    The saved key can no longer be read. Enter your API key again.
                  </p>
                )
              ) : null}
              <Input
                id={apiKeyInputId}
                name="ai-provider-secret"
                // Not type="password": Chrome's password manager offers saved logins on
                // every password field and ignores autocomplete hints. A text field masked
                // with CSS is never treated as a credential.
                type="text"
                className="[-webkit-text-security:disc]"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  canKeepExistingKey ? 'Saved key (hidden) — type to replace' : 'Paste your API key'
                }
                aria-describedby={apiKeyHintId}
                {...NO_AUTOFILL}
              />
              <p id={apiKeyHintId} className="sr-only">
                {canKeepExistingKey
                  ? 'An API key is already saved for this account.'
                  : 'No API key is saved for this account yet.'}
              </p>
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
                needsLabel ||
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

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This removes the saved credentials for {deleteTarget?.displayName}. This cannot be
              undone.
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

function AccountOptionChips({
  fields,
  options,
}: {
  fields?: AiModelOptionField[];
  options?: AiModelOptions;
}) {
  const chips = describeModelOptions(fields ?? [], options);
  if (chips.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1" aria-label="Model options">
      {chips.map((chip) => (
        <li key={chip} className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
          {chip}
        </li>
      ))}
    </ul>
  );
}

function ModelOptionInput({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: AiModelOptionField;
  value: string | number | undefined;
  onChange: (raw: string) => void;
}) {
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{field.label}</Label>
      {field.kind === 'enum' ? (
        <select
          id={id}
          className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={value === undefined ? '' : String(value)}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hintId}
        >
          <option value="">Provider default</option>
          {field.values.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          step={1}
          value={value === undefined ? '' : String(value)}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Provider default"
          aria-describedby={hintId}
          {...NO_AUTOFILL}
        />
      )}
      <p id={hintId} className="text-muted-foreground text-xs">
        {field.description}
      </p>
    </div>
  );
}
