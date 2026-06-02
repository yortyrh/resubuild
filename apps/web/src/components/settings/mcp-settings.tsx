'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createMcpApiKey,
  getMcpSettings,
  type McpApiKeySummary,
  type McpSettingsResponse,
  patchMcpSettings,
  revokeMcpApiKey,
} from '@/lib/api';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface McpSettingsProps {
  backHref?: string;
  backLabel?: string;
}

export function McpSettings({ backHref, backLabel }: McpSettingsProps = {}) {
  const [settings, setSettings] = useState<McpSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<McpApiKeySummary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMcpSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mcpEndpoint = `${apiUrl.replace(/\/$/, '')}/mcp`;

  const clientConfigSnippet = `{
  "mcpServers": {
    "resumind": {
      "url": "${mcpEndpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}`;

  const toggleEnabled = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const data = await patchMcpSettings({ mcpEnabled: enabled });
      setSettings(data);
      setSuccess(enabled ? 'MCP access enabled.' : 'MCP access disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update MCP settings');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateKey = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createMcpApiKey({ label: newLabel.trim() || undefined });
      setCreatedSecret(result.secret);
      setSettings((prev) =>
        prev
          ? { ...prev, keys: [result.key, ...prev.keys] }
          : { mcpEnabled: false, keys: [result.key] },
      );
      setCreateOpen(false);
      setNewLabel('');
      setSuccess('API key created. Copy it now — it will not be shown again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    setError(null);
    try {
      const data = await revokeMcpApiKey(revokeTarget.id);
      setSettings(data);
      setRevokeTarget(null);
      setSuccess('API key revoked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading MCP settings…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="text-muted-foreground mb-2 inline-block text-sm hover:underline"
          >
            ← {backLabel ?? 'Back'}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold">MCP access</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Connect Cursor, Claude Desktop, or other MCP clients to manage CVs and job applications
          with long-lived API keys.
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Enable MCP</h2>
            <p className="text-muted-foreground text-sm">
              When disabled, valid API keys cannot call the MCP endpoint.
            </p>
          </div>
          <Button
            type="button"
            variant={settings?.mcpEnabled ? 'secondary' : 'default'}
            disabled={busy}
            onClick={() => void toggleEnabled(!settings?.mcpEnabled)}
          >
            {settings?.mcpEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">API keys</h2>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)} disabled={busy}>
            Create key
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">You can have up to two active keys.</p>
        {(settings?.keys ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {(settings?.keys ?? []).map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{key.label ?? 'Unlabeled key'}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {key.keyPrefix}… · {key.revoked ? 'revoked' : 'active'}
                  </p>
                </div>
                {!key.revoked ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setRevokeTarget(key)}
                    disabled={busy}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {createdSecret ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Copy your new API key</p>
          <code className="block break-all rounded bg-white/80 p-2 font-mono text-xs">
            {createdSecret}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(createdSecret)}
          >
            Copy to clipboard
          </Button>
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border p-4">
        <h2 className="font-medium">Client configuration</h2>
        <p className="text-muted-foreground text-sm">
          Add this to your MCP client config (replace the bearer token with a key you created
          above).
        </p>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{clientConfigSnippet}</pre>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create MCP API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mcp-key-label">Label (optional)</Label>
            <Input
              id="mcp-key-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Cursor laptop"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateKey()} disabled={busy}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget != null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Clients using this key will stop working immediately.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRevoke()}
              disabled={busy}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
